/**
 * @deprecated ADR-040 (FE-DEUDA-01, #292): el contrato canónico del frontend
 * es `lib/dataSource.ts` con el selector único `VITE_MOCK_API` ('1' = demo
 * sintética explícita). Este árbol `demo/` (ADR-029) queda como fixtures de
 * las suites `dataSource.contract.test.ts` y `apiDataSource.mapping.test.ts`:
 * no se monta en la app ni admite importadores nuevos fuera de `demo/`.
 */
/**
 * Implementación API del contrato DataSource (DEMO-3 #18 → CORE-003 R3, #83).
 *
 * Consume los endpoints reales del backend a través del proxy de Vite
 * (1:1, sin rewrite — riesgo #53). Con las rutas del vocabulario CORE-002
 * el mapeo es completo: territorios (nodos) con población/foco/centro
 * reales, capas, categorías, features y reportes — fin de los
 * "declarado vacío" de #18.
 *
 * Proyección de presentación (ADR-030): la DB guarda lat/lng reales; el demo
 * pinta en coordenadas relativas x/y (0–100). El mapeo proyecta linealmente
 * sobre una envolvente de ±0.05° alrededor del centro del nodo — es
 * presentación, no dato de dominio. Lo que sigue sin backend se declara
 * vacío con comentario explícito (R15): getEventos (events_raw aún no tiene
 * vínculo con nodos) y producedBy de capas (no modelado en el schema).
 *
 * R5-UI (#109): getActivos mapea GET /api/activos?nodo= (R5b) y la inversa
 * `desproyecta` traduce el punto elegido en el mini-mapa del formulario al
 * lat/lng real del alta — misma envolvente en ambos sentidos.
 */
import type { DataSource } from "./dataSource";
import type {
  ActivoTerritorial,
  Capa,
  CategoriaReporte,
  Evidencia,
  EventoTerritorial,
  FeatureTerritorial,
  ReporteTerritorial,
  Territorio,
} from "./types";

/** Envelope estándar de las rutas de lista (apps/api). */
interface ApiEnvelope<T> {
  success: boolean;
  data: T[];
  count: number;
  error?: string;
}

/** Envelope de la ruta de un solo nodo. */
interface NodoEnvelope {
  success: boolean;
  data: NodoApi;
  error?: string;
}

/** Envelope de la ruta de evidencias (apps/api). */
interface EvidenciasEnvelope {
  count: number;
  evidencias: { id: string; code: string; title: string; status?: string }[];
}

/** Nodo tal como lo sirve GET /api/nodos (vocabulario CORE-002). */
interface NodoApi {
  id: string;
  key: string;
  nombre: string;
  subtitle: string;
  foco: string;
  centro_lat: number;
  centro_lng: number;
  poblacion: number;
  activo: boolean;
}

interface CapaApi {
  id: string;
  key: string;
  nombre: string;
  dominio: string;
  geometria: string;
  default_on: boolean;
}

interface CategoriaApi {
  id: string;
  code: string;
  label: string;
  layer: string;
}

interface FeatureApi {
  id: string;
  layer: string;
  domain: string;
  titulo: string;
  tipo: string;
  estado: string;
  fuente_label: string;
  observado_at: string;
  lat: number;
  lng: number;
  is_synthetic: boolean;
}

interface ReporteApi {
  id: string;
  nodo_id: string;
  categoria: string;
  descripcion: string | null;
  estado: string;
  lat: number;
  lng: number;
  is_synthetic: boolean;
  hash: string;
  created_at: string;
  updated_at: string;
}

/** Activo tal como lo sirve GET /api/activos (dominio `activos`, R5b). */
interface ActivoApi {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  nodo_key: string;
  lat: number;
  lng: number;
  created_by_hash: string;
  created_at: string;
}

/**
 * Paleta de presentación por key de nodo (los colores del demo v5.1).
 * No es dato de dominio: no viaja por la API, se resuelve en la UI.
 */
const PALETA_NODOS: Record<string, string> = {
  capital: "#C2410C",
  caucete: "#2F7D5B",
  iglesia: "#1D4E89",
};

export class ApiDataSource implements DataSource {
  /** Envelope de presentación: ±0.05° del centro del nodo (ADR-030). */
  static readonly SPAN_GRADOS = 0.1;

  private centros = new Map<string, { lat: number; lng: number }>();

  async getTerritorios(): Promise<Territorio[]> {
    const env = await this.getJson<ApiEnvelope<NodoApi>>("/api/nodos");
    return env.data.map((n) => ({
      id: n.id,
      key: n.key,
      name: n.nombre,
      subtitle: n.subtitle,
      population: n.poblacion,
      // foco real del nodo; el texto largo no existe en el schema → no se
      // inventa (R15): se reusa el foco real en lugar de rellenar con ficción.
      focus: n.foco,
      focusLong: n.foco,
      narrative: n.foco,
      center: { lat: n.centro_lat, lng: n.centro_lng },
      color: PALETA_NODOS[n.key],
    }));
  }

  async getCapas(territorioKey: string): Promise<Capa[]> {
    const env = await this.getJson<ApiEnvelope<CapaApi>>(
      "/api/nodos/" + territorioKey + "/capas",
    );
    return env.data.map((c) => ({
      key: c.key,
      name: c.nombre,
      domain: c.dominio,
      geometry: c.geometria,
      defaultOn: c.default_on,
      // Productores no modelados en el schema CORE-002: vacío honesto (R15).
      producedBy: [],
    }));
  }

  async getCategoriasReporte(territorioKey: string): Promise<CategoriaReporte[]> {
    const env = await this.getJson<ApiEnvelope<CategoriaApi>>(
      "/api/nodos/" + territorioKey + "/categorias",
    );
    return env.data.map((c) => ({ code: c.code, label: c.label, layer: c.layer }));
  }

  async getFeatures(territorioKey: string): Promise<FeatureTerritorial[]> {
    const [centro, env] = await Promise.all([
      this.centroDe(territorioKey),
      this.getJson<ApiEnvelope<FeatureApi>>("/api/nodos/" + territorioKey + "/features"),
    ]);
    return env.data.map((f) => {
      const { x, y } = this.proyecta(f.lat, f.lng, centro);
      return {
        id: f.id,
        nodeKey: territorioKey,
        layer: f.layer,
        x,
        y,
        title: f.titulo,
        status: f.estado,
        observedAt: f.observado_at,
        sourceLabel: f.fuente_label,
        isSynthetic: f.is_synthetic,
        domain: f.domain,
        // Guard explícito: el contrato solo admite asset | problem.
        type: f.tipo === "asset" ? "asset" : "problem",
        // Props de presentación no modelados en el schema → vacío (R15).
        props: {},
      };
    });
  }

  async getReportes(territorioKey: string): Promise<ReporteTerritorial[]> {
    const [centro, env] = await Promise.all([
      this.centroDe(territorioKey),
      this.getJson<ApiEnvelope<ReporteApi>>("/api/nodos/" + territorioKey + "/reportes"),
    ]);
    return env.data.map((r) => {
      const { x, y } = this.proyecta(r.lat, r.lng, centro);
      return {
        id: r.id,
        eventId: r.hash,
        nodeKey: territorioKey,
        category: r.categoria,
        description: r.descripcion ?? "",
        status: r.estado,
        createdAt: r.created_at,
        isSynthetic: r.is_synthetic,
        picked: { x, y },
        // Sin tabla de historial por estado: una única entrada honesta (R15).
        history: [{ status: r.estado, at: r.updated_at }],
      };
    });
  }

  // R5-UI (#109): lectura pública y anónima del dominio `activos` (R5b) —
  // el mapa de activos se sirve sin sesión, filtrado por nodo.
  async getActivos(territorioKey: string): Promise<ActivoTerritorial[]> {
    const [centro, env] = await Promise.all([
      this.centroDe(territorioKey),
      this.getJson<ApiEnvelope<ActivoApi>>("/api/activos?nodo=" + territorioKey),
    ]);
    return env.data.map((a) => {
      const { x, y } = this.proyecta(a.lat, a.lng, centro);
      return {
        id: a.id,
        nodeKey: territorioKey,
        tipo: a.tipo,
        titulo: a.titulo,
        descripcion: a.descripcion ?? "",
        estado: a.estado,
        lat: a.lat,
        lng: a.lng,
        x,
        y,
        createdByHash: a.created_by_hash,
        createdAt: a.created_at,
        // Datos reales del backend (no ilustrativos): honestidad de origen.
        isSynthetic: false,
      };
    });
  }

  // events_raw aún no tiene vínculo con nodos (no existe nodo_id): la lectura
  // honesta es vacía hasta que exista la relación (deuda declarada, ADR-030).
  async getEventos(_territorioId: string): Promise<EventoTerritorial[]> {
    return [];
  }

  async getEvidencias(): Promise<Evidencia[]> {
    const env = await this.getJson<EvidenciasEnvelope>("/api/evidencias");
    return env.evidencias.map((e) => ({
      code: e.code,
      title: e.title,
      status: String(e.status ?? ""),
    }));
  }

  esSintetico(): boolean {
    return false;
  }

  /** Centro del nodo (memoizado) — base de la proyección de presentación. */
  private async centroDe(key: string): Promise<{ lat: number; lng: number }> {
    let centro = this.centros.get(key);
    if (!centro) {
      const env = await this.getJson<NodoEnvelope>("/api/nodos/" + key);
      centro = { lat: env.data.centro_lat, lng: env.data.centro_lng };
      this.centros.set(key, centro);
    }
    return centro;
  }

  /**
   * Proyección lineal de presentación lat/lng → x/y (0–100) sobre la
   * envolvente SPAN_GRADOS del centro del nodo (ADR-030). Presentación, no
   * dato de dominio: las features del seed caen dentro de la envolvente.
   */
  private proyecta(
    lat: number,
    lng: number,
    centro: { lat: number; lng: number },
  ): { x: number; y: number } {
    const half = ApiDataSource.SPAN_GRADOS / 2;
    const x = ((lng - (centro.lng - half)) / ApiDataSource.SPAN_GRADOS) * 100;
    const y = (((centro.lat + half) - lat) / ApiDataSource.SPAN_GRADOS) * 100;
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    return { x: clamp(x), y: clamp(y) };
  }

  /** GET JSON con manejo honesto de errores HTTP y de envelope. */
  private async getJson<T>(path: string): Promise<T> {
    const res = await fetch(path, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error("API " + path + " → HTTP " + res.status);
    }
    const body = (await res.json()) as T & { success?: boolean; error?: string };
    if (body && typeof body.success === "boolean" && !body.success) {
      throw new Error("API " + path + " → " + (body.error ?? "error desconocido"));
    }
    return body;
  }
}

/**
 * Inversa de la proyección de presentación (ADR-030): x/y (0–100) sobre la
 * envolvente del centro → lat/lng real. La usa el formulario de activos
 * (R5-UI, #109) para traducir el punto elegido en el mini-mapa al alta del
 * backend — así el formulario y el mapa pintan en el mismo sistema.
 */
export function desproyecta(
  x: number,
  y: number,
  centro: { lat: number; lng: number },
): { lat: number; lng: number } {
  const half = ApiDataSource.SPAN_GRADOS / 2;
  const lat = centro.lat + half - (y / 100) * ApiDataSource.SPAN_GRADOS;
  const lng = centro.lng - half + (x / 100) * ApiDataSource.SPAN_GRADOS;
  return { lat, lng };
}

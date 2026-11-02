/**
 * @deprecated ADR-040 (FE-DEUDA-01, #292): el contrato canónico del frontend
 * es `lib/dataSource.ts` con el selector único `VITE_MOCK_API` ('1' = demo
 * sintética explícita). Este árbol `demo/` (ADR-029) queda como fixtures de
 * las suites `dataSource.contract.test.ts` y `apiDataSource.mapping.test.ts`:
 * no se monta en la app ni admite importadores nuevos fuera de `demo/`.
 */
/**
 * Implementación sintética del contrato DataSource (DEMO-2, #17).
 *
 * Envuelve los literales de `syntheticData.js` (extraídos 1:1 del demo v5.1)
 * y devuelve copias defensivas, de modo que el estado de React nunca mute
 * los datos fuente. Los reportes y eventos de la sesión del demo siguen
 * siendo estado runtime del componente: por eso estos métodos devuelven
 * listas vacías (en DEMO-3, #18, ApiDataSource sí traerá históricos).
 *
 * R5-UI (#109): los activos sintéticos viven acá (no en syntheticData.js,
 * que queda 1:1 con el demo v5.1). Se definen en coordenadas de
 * presentación x/y (0–100) y su lat/lng se deriva del centro del nodo con
 * la misma envolvente de presentación que ApiDataSource (ADR-030) — así el
 * formulario y el mapa coinciden siempre.
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
// Literales sin tipos (archivo .js con allowJs + checkJs=false): doble cast.
import * as raw from "./syntheticData.js";

const rawAny = raw as unknown as {
  NODES: Territorio[];
  LAYERS: Record<string, Capa[]>;
  CATEGORIES: Record<string, CategoriaReporte[]>;
  FEATURES: FeatureTerritorial[];
};

/** Evidencias ilustrativas del propio demo (no datos del repo real). */
const EVIDENCIAS_SINTETICAS: Evidencia[] = [
  { code: "EV-DEMO-001", title: "Aislamiento del demo sintético (DEMO-1)", status: "verified" },
  { code: "EV-DEMO-002", title: "Contrato de datos del demo (DEMO-2)", status: "verified" },
];

/** Envolvente de presentación (ADR-030): ±0.05° del centro del nodo. */
const SPAN_GRADOS = 0.1;

/**
 * Activos sintéticos (R5-UI, #109): ilustran el flujo ciudadano
 * 'propuesto → moderación' sin datos reales. El pseudónimo se declara
 * no-real (isSynthetic: true llega al contrato): ningún registro proviene
 * de un relevamiento real (R5).
 */
const ACTIVOS_SINTETICOS: Array<Omit<ActivoTerritorial, "lat" | "lng">> = [
  {
    id: "act-sint-capital-1",
    nodeKey: "capital",
    tipo: "patrimonio",
    titulo: "Ex estación de ferrocarril (demo)",
    descripcion: "Ejemplo ilustrativo: activo patrimonial propuesto por un vecino del corredor.",
    estado: "propuesto",
    x: 62,
    y: 41,
    createdByHash: "sintetico-demo",
    createdAt: "2026-10-07T12:00:00.000Z",
    isSynthetic: true,
  },
  {
    id: "act-sint-capital-2",
    nodeKey: "capital",
    tipo: "servicio",
    titulo: "Punto digital barrial (demo)",
    descripcion: "Ejemplo ilustrativo: servicio comunitario en estado propuesto.",
    estado: "propuesto",
    x: 35,
    y: 58,
    createdByHash: "sintetico-demo",
    createdAt: "2026-10-07T13:00:00.000Z",
    isSynthetic: true,
  },
  {
    id: "act-sint-caucete-1",
    nodeKey: "caucete",
    tipo: "infraestructura",
    titulo: "Cisterna comunitaria (demo)",
    descripcion: "Ejemplo ilustrativo: infraestructura de riego propuesta por el club de productores.",
    estado: "propuesto",
    x: 55,
    y: 62,
    createdByHash: "sintetico-demo",
    createdAt: "2026-10-07T14:00:00.000Z",
    isSynthetic: true,
  },
  {
    id: "act-sint-iglesia-1",
    nodeKey: "iglesia",
    tipo: "patrimonio",
    titulo: "Antiga bodega familiar (demo)",
    descripcion: "Ejemplo ilustrativo: activo patrimonial del circuito productivo.",
    estado: "propuesto",
    x: 44,
    y: 37,
    createdByHash: "sintetico-demo",
    createdAt: "2026-10-07T15:00:00.000Z",
    isSynthetic: true,
  },
];

export class SyntheticDataSource implements DataSource {
  async getTerritorios(): Promise<Territorio[]> {
    return rawAny.NODES.map((t) => ({ ...t }));
  }

  async getCapas(territorioKey: string): Promise<Capa[]> {
    return (rawAny.LAYERS[territorioKey] ?? []).map((c) => ({
      ...c,
      producedBy: [...c.producedBy],
    }));
  }

  async getCategoriasReporte(territorioKey: string): Promise<CategoriaReporte[]> {
    return (rawAny.CATEGORIES[territorioKey] ?? []).map((c) => ({ ...c }));
  }

  async getFeatures(territorioKey: string): Promise<FeatureTerritorial[]> {
    return rawAny.FEATURES.filter((f) => f.nodeKey === territorioKey).map((f) => ({ ...f }));
  }

  async getReportes(_territorioKey: string): Promise<ReporteTerritorial[]> {
    return []; // los reportes del demo son de sesión (runtime), no persistentes
  }

  async getActivos(territorioKey: string): Promise<ActivoTerritorial[]> {
    const nodo = rawAny.NODES.find((n) => n.key === territorioKey);
    if (!nodo) return [];
    // Inversa de la proyección de presentación (ADR-030): x/y (0–100) sobre
    // la envolvente del centro → lat/lng coherentes con el nodo sintético.
    const half = SPAN_GRADOS / 2;
    return ACTIVOS_SINTETICOS.filter((a) => a.nodeKey === territorioKey).map((a) => {
      const lat = nodo.center.lat + half - (a.y / 100) * SPAN_GRADOS;
      const lng = nodo.center.lng - half + (a.x / 100) * SPAN_GRADOS;
      return { ...a, lat, lng };
    });
  }

  async getEventos(_territorioId: string): Promise<EventoTerritorial[]> {
    return []; // ídem: la trazabilidad de la sesión vive en el componente
  }

  async getEvidencias(): Promise<Evidencia[]> {
    return EVIDENCIAS_SINTETICAS.map((e) => ({ ...e }));
  }

  esSintetico(): boolean {
    return true;
  }
}

/**
 * Implementación API del contrato DataSource (DEMO-3, #18).
 *
 * Consume los endpoints reales del backend a través del proxy de Vite
 * (1:1, sin rewrite — riesgo #53). Principio R15: no simular datos reales —
 * lo que el backend aún no expone (capas, categorías, features, reportes,
 * eventos por nodo: rutas pendientes del schema CORE-002) se declara vacío
 * con comentario explícito, en lugar de rellenarlo con literales sintéticos.
 */
import type { DataSource } from "./dataSource";
import type {
  Capa,
  CategoriaReporte,
  Evidencia,
  EventoTerritorial,
  FeatureTerritorial,
  ReporteTerritorial,
  Territorio,
} from "./types";

/** Envelope estándar de las rutas de territorios (apps/api). */
interface ApiEnvelope<T> {
  success: boolean;
  data: T[];
  count: number;
  error?: string;
}

/** Territorio tal como lo sirve el backend (modelo CORE-001). */
interface TerritorioApi {
  id: string;
  nombre: string;
  provincia: string;
  activo: boolean;
}

/** Envelope de la ruta de evidencias (apps/api). */
interface EvidenciasEnvelope {
  count: number;
  evidencias: { id: string; code: string; title: string; status?: string }[];
}

export class ApiDataSource implements DataSource {
  async getTerritorios(): Promise<Territorio[]> {
    const env = await this.getJson<ApiEnvelope<TerritorioApi>>("/api/territorios");
    return env.data.map((t) => ({
      id: t.id,
      key: t.id,
      name: t.nombre,
      subtitle: t.provincia,
      // El backend aún no expone población ni narrativa (deuda documentada
      // en #18): se mapean vacíos en lugar de inventar valores reales (R15).
      population: 0,
      focus: "",
      focusLong:
        "Territorio real servido por la API. Narrativa, capas y features: pendientes de las rutas del schema CORE-002.",
      narrative: "",
      center: { lat: 0, lng: 0 },
    }));
  }

  async getEvidencias(): Promise<Evidencia[]> {
    const env = await this.getJson<EvidenciasEnvelope>("/api/evidencias");
    return env.evidencias.map((e) => ({
      code: e.code,
      title: e.title,
      status: String(e.status ?? ""),
    }));
  }

  // Lecturas aún sin ruta en el backend (schema CORE-002 sin endpoints):
  // declarar vacío es la respuesta honesta — no rellenar con sintéticos (R15).
  async getCapas(_territorioKey: string): Promise<Capa[]> {
    return [];
  }

  async getCategoriasReporte(_territorioKey: string): Promise<CategoriaReporte[]> {
    return [];
  }

  async getFeatures(_territorioKey: string): Promise<FeatureTerritorial[]> {
    return [];
  }

  async getReportes(_territorioKey: string): Promise<ReporteTerritorial[]> {
    return [];
  }

  async getEventos(_territorioId: string): Promise<EventoTerritorial[]> {
    return [];
  }

  esSintetico(): boolean {
    return false;
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

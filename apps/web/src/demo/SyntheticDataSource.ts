/**
 * Implementación sintética del contrato DataSource (DEMO-2, #17).
 *
 * Envuelve los literales de `syntheticData.js` (extraídos 1:1 del demo v5.1)
 * y devuelve copias defensivas, de modo que el estado de React nunca mute
 * los datos fuente. Los reportes y eventos de la sesión del demo siguen
 * siendo estado runtime del componente: por eso estos métodos devuelven
 * listas vacías (en DEMO-3, #18, ApiDataSource sí traerá históricos).
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

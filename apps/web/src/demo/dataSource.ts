/**
 * Contrato de datos del demo territorial (DEMO-2, #17).
 *
 * Único punto de acoplamiento entre la UI del demo y el origen de datos.
 * Los métodos están alineados con los endpoints `/api/*` del backend
 * (DEMO-3, #18) para que ApiDataSource sea una implementación más de esta
 * interfaz, sin cambios en el componente.
 */
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

export interface DataSource {
  /** Territorios federados disponibles. */
  getTerritorios(): Promise<Territorio[]>;

  /** Capas temáticas de un territorio (por `territorio.key`). */
  getCapas(territorioKey: string): Promise<Capa[]>;

  /** Categorías de reporte vecinal habilitadas en un territorio. */
  getCategoriasReporte(territorioKey: string): Promise<CategoriaReporte[]>;

  /** Features (activos y problemáticas) de un territorio. */
  getFeatures(territorioKey: string): Promise<FeatureTerritorial[]>;

  /** Reportes registrados en un territorio (vacío en modo sintético puro). */
  getReportes(territorioKey: string): Promise<ReporteTerritorial[]>;

  /** Activos ciudadanos del dominio `activos` (CORE-004 R5b/R5-UI, #109). */
  getActivos(territorioKey: string): Promise<ActivoTerritorial[]>;

  /** Eventos de trazabilidad de un territorio (por `territorio.id`). */
  getEventos(territorioId: string): Promise<EventoTerritorial[]>;

  /** Evidencias de gobernanza del proyecto. */
  getEvidencias(): Promise<Evidencia[]>;

  /** `true` si los datos son 100 % sintéticos (banner de honestidad). */
  esSintetico(): boolean;
}

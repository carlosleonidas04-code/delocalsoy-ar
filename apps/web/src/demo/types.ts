/**
 * @deprecated ADR-040 (FE-DEUDA-01, #292): el contrato canónico del frontend
 * es `lib/dataSource.ts` con el selector único `VITE_MOCK_API` ('1' = demo
 * sintética explícita). Este árbol `demo/` (ADR-029) queda como fixtures de
 * las suites `dataSource.contract.test.ts` y `apiDataSource.mapping.test.ts`:
 * no se monta en la app ni admite importadores nuevos fuera de `demo/`.
 */
/**
 * Tipos del dominio territorial del demo (DEMO-2, #17).
 *
 * Contrato de datos de la UI: el demo consume exclusivamente estas formas a
 * través de la interfaz `DataSource` (dataSource.ts). La implementación
 * sintética (SyntheticDataSource) y la implementación API (DEMO-3, #18)
 * mapean al mismo contrato, de modo que la UI no conoce el origen.
 */

/** Territorio federado (nodo). */
export interface Territorio {
  id: string;
  key: string;
  name: string;
  subtitle: string;
  population: number;
  focus: string;
  focusLong: string;
  narrative: string;
  center: { lat: number; lng: number };
  /** Color de identificación del territorio (paleta del demo). */
  color?: string;
}

/** Capa temática de un territorio. */
export interface Capa {
  key: string;
  name: string;
  domain: string;
  geometry: string;
  defaultOn: boolean;
  producedBy: string[];
}

/** Categoría de reporte vecinal disponible en un territorio. */
export interface CategoriaReporte {
  code: string;
  label: string;
  layer: string;
}

/** Feature territorial (activo o problemática) representado en el mapa. */
export interface FeatureTerritorial {
  id: string;
  nodeKey: string;
  layer: string;
  x: number;
  y: number;
  title: string;
  status: string;
  observedAt: string;
  sourceLabel: string;
  isSynthetic: boolean;
  domain: string;
  type: "asset" | "problem";
  props: Record<string, unknown>;
}

/** Reporte vecinal (de sesión en el demo; histórico vía API en DEMO-3). */
export interface ReporteTerritorial {
  id: string;
  eventId: string;
  nodeKey: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  isSynthetic: boolean;
  picked: { x: number; y: number };
  history: { status: string; at: string }[];
}

/**
 * Activo territorial propuesto por la ciudadanía (CORE-004 R5-UI, #109).
 * Espejo de presentación del dominio `activos` del backend (R5b): nace en
 * estado 'propuesto' y solo la moderación (moderador|admin) lo cambia. El
 * autor nunca queda identificado: `createdByHash` es el pseudónimo sha256
 * del usuario (Ley 25.326, ADR-027) — sin PII en la UI.
 */
export interface ActivoTerritorial {
  id: string;
  nodeKey: string;
  /** tipo de activo: inmueble | infraestructura | servicio | patrimonio | otro. */
  tipo: string;
  titulo: string;
  descripcion: string;
  /** estado del flujo de moderación: propuesto | aprobado | rechazado. */
  estado: string;
  lat: number;
  lng: number;
  /** Posición de presentación 0–100 sobre la envolvente del nodo (ADR-030). */
  x: number;
  y: number;
  createdByHash: string;
  createdAt: string;
  isSynthetic: boolean;
}

/** Evento de trazabilidad del nodo. */
export interface EventoTerritorial {
  eventId: string;
  type: string;
  nodeId: string;
  occurredAt: string;
}

/** Evidencia de gobernanza asociada al proyecto (trazabilidad). */
export interface Evidencia {
  code: string;
  title: string;
  status: string;
}

/** Métrica de resumen (tarjetas del panel lateral). */
export interface Metrica {
  label: string;
  value: number;
}

import { createDataSource, type DataSource } from './dataSource';
import type {
  AccreditedCustodianRecord,
  EvidenciaRecord,
  FederalSovereigntyRecord,
  InterNodeSyncPack,
  LineageChainStep,
  MultiScaleSynthesisItem,
  OfflineFieldQueueItem,
  RawEventRecord,
  SpatialGeometryRecord,
  SpatialIntersectionResult,
  TelemetryWebhookRecord,
  TemporalQuarterSnapshot,
  TerritorialReport,
  TerritorioCategory,
  TerritorioFeature,
  TerritorioLayer,
} from '../data/federatedModel';

/**
 * Tipos y helpers puros del dominio Territorios — extraídos 1:1 desde App.tsx
 * (FE-DEUDA-02 #293, corte 23): código verbatim, cero cambios semánticos.
 * App re-exporta la API pública (Territorio, HealthState, TerritoriosState,
 * FiltroActivo, fetchTerritorios) para no alterar los imports existentes de
 * los componentes ('../App').
 */
export interface Territorio {
  id: string;
  key: string;
  nombre: string;
  subtitulo?: string;
  provincia: string;
  foco?: string;
  focusLong?: string;
  poblacion?: number;
  color?: string;
  activo: boolean;
}

interface ModeloFederadoPayload {
  territorios: Territorio[];
  layers: Record<string, TerritorioLayer[]>;
  categories: Record<string, TerritorioCategory[]>;
  features: TerritorioFeature[];
  reports: TerritorialReport[];
  eventsRaw: RawEventRecord[];
  evidencias: EvidenciaRecord[];
  spatialGeometries?: SpatialGeometryRecord[];
  syncPacks?: InterNodeSyncPack[];
  temporalSnapshots?: TemporalQuarterSnapshot[];
  multiScaleSyntheses?: MultiScaleSynthesisItem[];
  lineageChain?: LineageChainStep[];
  federalSovereignty?: FederalSovereigntyRecord[];
  spatialIntersections?: SpatialIntersectionResult[];
  offlineFieldQueue?: OfflineFieldQueueItem[];
  accreditedCustodians?: AccreditedCustodianRecord[];
  telemetryWebhooks?: TelemetryWebhookRecord[];
}

export type HealthState =
  | { status: 'checking' }
  | { status: 'ok'; body: string }
  | { status: 'error'; message: string };

export type TerritoriosState =
  | { status: 'loading' }
  | { status: 'ok'; items: Territorio[] }
  | { status: 'error'; message: string };

export type FiltroActivo = 'todos' | 'activos' | 'inactivos';

function normalizeTerritorio(
  raw: Partial<Territorio> & { id: string; nombre: string; provincia: string; activo: boolean },
): Territorio {
  const fallbackKey = raw.nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
  return {
    id: raw.id,
    key: raw.key || fallbackKey,
    nombre: raw.nombre,
    subtitulo: raw.subtitulo ?? 'Nodo Federado',
    provincia: raw.provincia,
    foco: raw.foco ?? 'Relevamiento comunitario y activos locales',
    focusLong:
      raw.focusLong ??
      `Nodo federado en ${raw.provincia} integrado al núcleo común de DELocalSoy.AR.`,
    poblacion: raw.poblacion ?? 15000,
    color: raw.color ?? '#2e9e5b',
    activo: raw.activo,
  };
}

const defaultDataSource: DataSource = createDataSource();

/**
 * Obtiene la lista de territorios a través del contrato `DataSource` (`ApiDataSource` | `SyntheticDataSource`).
 * Cumple Paso 5 y Paso 7: no transforma errores HTTP (503, 401, 404, 422, 500) en `[]`.
 */
export async function fetchTerritorios(
  filtro: FiltroActivo = 'todos',
  dataSource: DataSource = defaultDataSource,
): Promise<Territorio[]> {
  const activoParam =
    filtro === 'activos' ? true : filtro === 'inactivos' ? false : undefined;
  const rows = await dataSource.listTerritories({ activo: activoParam });
  return rows.map((r) => normalizeTerritorio(r));
}

import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminSovereigntyDashboard } from './components/AdminSovereigntyDashboard';
import { ArtefactosRoot } from './components/artefactos/ArtefactosRoot';
import { BaseConsolidadaPrototype } from './components/BaseConsolidadaPrototype';
import { CognitiveLensSelector, type DesignLensKey } from './components/CognitiveLensSelector';
import { ComerciosPanel } from './components/ComerciosPanel';
import { DemoDataSourceAuditSection } from './components/DemoDataSourceAuditSection';
import { EthicalAiCopilotPanel } from './components/EthicalAiCopilotPanel';
import { FederatedCompareView } from './components/FederatedCompareView';
import { FederatedNodeDetailModal } from './components/FederatedNodeDetailModal';
import { FederatedNodeExplorer } from './components/FederatedNodeExplorer';
import { HeroBannerSection } from './components/HeroBannerSection';
import { HeuristicsAwardMatrix } from './components/HeuristicsAwardMatrix';
import { HorizonOneArchitecturePanel } from './components/HorizonOneArchitecturePanel';
import { HorizonThreeObservatoryPanel } from './components/HorizonThreeObservatoryPanel';
import { HorizonTwoSpatialFederationPanel } from './components/HorizonTwoSpatialFederationPanel';
import { HorizonFourFieldAndTelemetryPanel } from './components/HorizonFourFieldAndTelemetryPanel';
import { LensOneAtlasWorkbench, type CockpitMacroView } from './components/LensOneAtlasWorkbench';
import { LensTwoVerticalFlowWorkbench } from './components/LensTwoVerticalFlowWorkbench';
import { LensThreeSovereigntyWorkbench } from './components/LensThreeSovereigntyWorkbench';
import { LensFourEpistemicContractsWorkbench } from './components/LensFourEpistemicContractsWorkbench';
import { OperationalOriginStrip } from './components/OperationalOriginStrip';
import { QuarterlyTrendsSection } from './components/QuarterlyTrendsSection';
import { RecursiveProspectiveContractPanel } from './components/RecursiveProspectiveContractPanel';
import { ShowcaseRecorridoPanel } from './components/ShowcaseRecorridoPanel';
import { ServicioInformativoPanel } from './components/ServicioInformativoPanel';
import { Station01TokenWorkbench } from './components/Station01TokenWorkbench';
import { Station02CockpitWorkbench } from './components/Station02CockpitWorkbench';
import { Station03VerticalFlowWorkbench } from './components/Station03VerticalFlowWorkbench';
import { Station04SovereigntyWorkbench } from './components/Station04SovereigntyWorkbench';
import { Station05EpistemicContractsWorkbench } from './components/Station05EpistemicContractsWorkbench';
import { SyntheticModeWarningBanner } from './components/SyntheticModeWarningBanner';
import { TerritoriosMap } from './components/TerritoriosMap';
import { TerritorialPlatformHub } from './components/TerritorialPlatformHub';
import { TokenEvolutionStrip } from './components/TokenEvolutionStrip';
import { TopBarHeader } from './components/TopBarHeader';
import { TraceabilityAndEvidenciasPanel } from './components/TraceabilityAndEvidenciasPanel';
import { VibeAgentExportHandoffCenter } from './components/VibeAgentExportHandoffCenter';
import { WorkspacePanel } from './components/WorkspacePanel';
import {
  ApiDataSource,
  createDataSource,
  DataSourceHttpError,
  resolveOperationalOriginLabel,
  resolveUiOperationalState,
  SyntheticDataSource,
  type DataSource,
  type DataSourceMode,
  type UiOperationalState,
} from './lib/dataSource';
import {
  recordCustodianSovereigntyAlertInFirestore,
  type CustodianSovereigntyAlertRecord,
} from './lib/firestoreEthicalStore';
import type {
  AccreditedCustodianRecord,
  DomainKey,
  EvidenciaRecord,
  FederalSovereigntyRecord,
  InterNodeSyncPack,
  LineageChainStep,
  MultiScaleSynthesisItem,
  OfflineFieldQueueItem,
  PostgisGeometryType,
  RawEventRecord,
  SpatialGeometryRecord,
  SpatialIntersectionResult,
  TelemetryWebhookRecord,
  TemporalQuarterSnapshot,
  TerritorialReport,
  TerritorioCategory,
  TerritorioFeature,
  TerritorioLayer,
} from './data/federatedModel';

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

type HealthState =
  | { status: 'checking' }
  | { status: 'ok'; body: string }
  | { status: 'error'; message: string };

type TerritoriosState =
  | { status: 'loading' }
  | { status: 'ok'; items: Territorio[] }
  | { status: 'error'; message: string };

type FiltroActivo = 'todos' | 'activos' | 'inactivos';

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

/**
 * Plataforma DELocalSoy.AR — Horizontes 1, 2 y 3 Consolidados + Ciclo Post-CORE-002 (main @ e3616b5).
 */
export function App() {
  const [isDemoNamespace, setIsDemoNamespace] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname === '/demo' ||
      window.location.pathname.startsWith('/demo/') ||
      window.location.hash === '#demo'
    );
  });
  const [useSyntheticInDemo, setUseSyntheticInDemo] = useState<boolean>(() => {
    const envMock =
      typeof import.meta !== 'undefined' && (import.meta as any).env
        ? String((import.meta as any).env.VITE_MOCK_API ?? '') === '1'
        : false;
    return envMock;
  });
  const [runtimeMode, setRuntimeMode] = useState<DataSourceMode>(() =>
    defaultDataSource.mode,
  );
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('dark');
  const [showFullPageCockpit, setShowFullPageCockpit] = useState<boolean>(false);
  const [activeDesignLens, setActiveDesignLens] =
    useState<DesignLensKey>('lens_epistemic_contracts');
  const [selectedRecursiveLinkIdx, setSelectedRecursiveLinkIdx] =
    useState<number>(4);
  const [activeInspectionStation, setActiveInspectionStation] =
    useState<number>(4);
  const [externalCockpitMacroView, setExternalCockpitMacroView] =
    useState<CockpitMacroView>('federated_matrix');
  const [externalCustodianFilter, setExternalCustodianFilter] = useState<
    'all' | 'community' | 'institutions' | 'businesses'
  >('all');
  const [externalPlatformSection, setExternalPlatformSection] = useState<
    | 'flujo-vertical'
    | 'directorio-red'
    | 'marketplace'
    | 'participacion'
    | 'espacio-ambiente-eventos'
    | 'inteligencia-y-modulos'
  >('flujo-vertical');
  const [externalPlatformTerritoryFilter, setExternalPlatformTerritoryFilter] =
    useState<'all' | 'gran-san-juan-capital' | 'caucete' | 'iglesia'>('all');
  const [externalSovereigntyFilter, setExternalSovereigntyFilter] = useState<
    'all' | 'delegacion_revocable_activa' | 'custodia_local_estricta'
  >('all');
  const [externalNodeAuditFilter, setExternalNodeAuditFilter] =
    useState<string>('all');
  const [station04LastFcmAlert, setStation04LastFcmAlert] =
    useState<CustodianSovereigntyAlertRecord | null>(null);
  const [station04LineageResult, setStation04LineageResult] =
    useState<string | null>(null);
  const [externalRecursiveTab, setExternalRecursiveTab] = useState<
    'recursivo' | 'sinergia-ia' | 'propuesta-valor' | 'integracion' | 'prospectivo'
  >('integracion');
  const [station05PrismaFilter, setStation05PrismaFilter] =
    useState<string>('all');
  const [externalCopilotTab, setExternalCopilotTab] = useState<
    'chat' | 'search_grounding' | 'maps_grounding' | 'seci_voice'
  >('chat');
  const [externalCopilotRole, setExternalCopilotRole] = useState<
    'hidro-cuenca' | 'mediador-seci' | 'auditor-hitub'
  >('hidro-cuenca');
  const [station05C1C5Result, setStation05C1C5Result] = useState<string | null>(
    null,
  );
  const [prismaIntegrityPreC5, setPrismaIntegrityPreC5] = useState<{
    validationHash: string;
    schemaSha256: string;
    modelsVerified: number;
    referentialEdgesVerified: number;
    orphanRecordsCount: number;
    c5GateUnlocked: boolean;
    referentialEdges: Array<{
      edge: string;
      policy: string;
      status: string;
    }>;
    message: string;
  } | null>(null);
  const [station05TripartiteResult, setStation05TripartiteResult] = useState<{
    nodeKey: string;
    modelUsed: string;
    sha256Hash: string;
    datoEmpirico: string;
    interpretacionContextual: string;
    sugerenciaAccionable: string;
  } | null>(null);
  const [inspectionCertificateSignedHash, setInspectionCertificateSignedHash] =
    useState<string | null>(null);
  const [stationVerdicts, setStationVerdicts] = useState<
    Record<number, 'aprobada' | 'ajustar_token' | 'iterar_layout'>
  >({
    0: 'aprobada',
    1: 'aprobada',
    2: 'aprobada',
    3: 'aprobada',
    4: 'aprobada',
  });
  const [inspectionCopiedFeedback, setInspectionCopiedFeedback] =
    useState<boolean>(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (themeMode === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);
  const [modeSourceLabel, setModeSourceLabel] = useState<string>('events_raw');
  const [lastDataSourceError, setLastDataSourceError] = useState<Error | DataSourceHttpError | null>(null);
  const [idempotencyProbeResult, setIdempotencyProbeResult] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });
  const [territorios, setTerritorios] = useState<TerritoriosState>({ status: 'loading' });
  const [filtro, setFiltro] = useState<FiltroActivo>('todos');
  const [nombre, setNombre] = useState('');
  const [provincia, setProvincia] = useState('');
  const [focoNuevo, setFocoNuevo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusedTerritorioId, setFocusedTerritorioId] = useState<string | null>(null);
  const [focusedGeometry, setFocusedGeometry] = useState<SpatialGeometryRecord | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // Estado del Modelo Territorial Federado (Horizontes 1, 2 y 3)
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>('capital');
  const [inspectedNodeKey, setInspectedNodeKey] = useState<string | null>(null);
  const [layersByNode, setLayersByNode] = useState<Record<string, TerritorioLayer[]>>({});
  const [categoriesByNode, setCategoriesByNode] = useState<Record<string, TerritorioCategory[]>>({});
  const [features, setFeatures] = useState<TerritorioFeature[]>([]);
  const [reports, setReports] = useState<TerritorialReport[]>([]);
  const [eventsRaw, setEventsRaw] = useState<RawEventRecord[]>([]);
  const [evidencias, setEvidencias] = useState<EvidenciaRecord[]>([]);
  const [spatialGeometries, setSpatialGeometries] = useState<SpatialGeometryRecord[]>([]);
  const [syncPacks, setSyncPacks] = useState<InterNodeSyncPack[]>([]);
  const [temporalSnapshots, setTemporalSnapshots] = useState<TemporalQuarterSnapshot[]>([]);
  const [multiScaleSyntheses, setMultiScaleSyntheses] = useState<MultiScaleSynthesisItem[]>([]);
  const [lineageChain, setLineageChain] = useState<LineageChainStep[]>([]);
  const [federalSovereignty, setFederalSovereignty] = useState<FederalSovereigntyRecord[]>([]);
  const [spatialIntersections, setSpatialIntersections] = useState<SpatialIntersectionResult[]>([]);
  const [offlineFieldQueue, setOfflineFieldQueue] = useState<OfflineFieldQueueItem[]>([]);
  const [accreditedCustodians, setAccreditedCustodians] = useState<AccreditedCustodianRecord[]>([]);
  const [telemetryWebhooks, setTelemetryWebhooks] = useState<TelemetryWebhookRecord[]>([]);

  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const cargarModeloFederado = useCallback(async () => {
    try {
      const res = await fetch('/api/modelo-federado');
      if (!res.ok) return;
      const json = (await res.json()) as { success: boolean; data?: ModeloFederadoPayload };
      if (json.success && json.data) {
        setLayersByNode(json.data.layers ?? {});
        setCategoriesByNode(json.data.categories ?? {});
        setFeatures(json.data.features ?? []);
        setReports(json.data.reports ?? []);
        setEventsRaw(json.data.eventsRaw ?? []);
        setEvidencias(json.data.evidencias ?? []);
        setSpatialGeometries(json.data.spatialGeometries ?? []);
        setSyncPacks(json.data.syncPacks ?? []);
        setTemporalSnapshots(json.data.temporalSnapshots ?? []);
        setMultiScaleSyntheses(json.data.multiScaleSyntheses ?? []);
        setLineageChain(json.data.lineageChain ?? []);
        setFederalSovereignty(json.data.federalSovereignty ?? []);
        setSpatialIntersections(json.data.spatialIntersections ?? []);
        setOfflineFieldQueue(json.data.offlineFieldQueue ?? []);
        setAccreditedCustodians(json.data.accreditedCustodians ?? []);
        setTelemetryWebhooks(json.data.telemetryWebhooks ?? []);
      }
    } catch {
      // Mantiene el estado local si el endpoint opcional no responde
    }
  }, []);

  const activeDataSource: DataSource = useSyntheticInDemo
    ? new SyntheticDataSource()
    : defaultDataSource;

  const cargarTerritorios = useCallback(
    async (filtroActual: FiltroActivo) => {
      setTerritorios({ status: 'loading' });
      setLastDataSourceError(null);
      try {
        const items = await fetchTerritorios(filtroActual, activeDataSource);
        setTerritorios({ status: 'ok', items });
      } catch (err) {
        const normalizedErr =
          err instanceof Error ? err : new Error(String(err));
        setLastDataSourceError(normalizedErr);
        setTerritorios({
          status: 'error',
          message: normalizedErr.message,
        });
      }
    },
    [activeDataSource],
  );

  const sincronizarTodo = useCallback(async () => {
    await Promise.all([cargarTerritorios(filtro), cargarModeloFederado()]);
  }, [cargarTerritorios, cargarModeloFederado, filtro]);

  useEffect(() => {
    activeDataSource
      .health()
      .then((h) => {
        setRuntimeMode(h.mode);
        setModeSourceLabel(h.modeSource ?? 'events_raw');
        if (h.status === 'degraded') {
          setHealth({
            status: 'error',
            message: 'Modo degradado reportado por /api/health (Regla R5)',
          });
        } else {
          setHealth({ status: 'ok', body: JSON.stringify(h) });
        }
      })
      .catch((err: Error) => {
        setRuntimeMode('degraded');
        setLastDataSourceError(err);
        setHealth({ status: 'error', message: err.message });
      });
  }, [activeDataSource]);

  useEffect(() => {
    void cargarTerritorios(filtro);
  }, [cargarTerritorios, filtro]);

  useEffect(() => {
    void cargarModeloFederado();
  }, [cargarModeloFederado]);

  const handleCrearTerritorio = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nombre.trim() || !provincia.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/territorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          provincia: provincia.trim(),
          foco: focoNuevo.trim() || 'Relevamiento comunitario y activos locales',
          activo: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNombre('');
      setProvincia('');
      setFocoNuevo('');
      await Promise.all([cargarTerritorios(filtro), cargarModeloFederado()]);
    } catch (err) {
      setTerritorios({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActivo = async (territorio: Territorio) => {
    try {
      const res = await fetch(`/api/territorios/${territorio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !territorio.activo }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await Promise.all([cargarTerritorios(filtro), cargarModeloFederado()]);
    } catch (err) {
      setTerritorios({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleCreateReport = async (payload: {
    nodeKey: string;
    category: string;
    description: string;
    picked: { x: number; y: number };
  }) => {
    const res = await fetch('/api/reportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleAdvanceReport = async (reportId: string) => {
    const res = await fetch(`/api/reportes/${reportId}/advance`, {
      method: 'PATCH',
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleRecordHumanReview = async (nodeKey: string, reviewerNote: string) => {
    const res = await fetch('/api/ethical-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeKey, reviewerNote }),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleCreateGeometry = async (payload: {
    nodeKey: string;
    geometryType: PostgisGeometryType;
    title: string;
    domain: DomainKey;
  }) => {
    const res = await fetch('/api/geometrias-postgis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleCreateSyncPack = async (payload: {
    sourceNodeKey: string;
    targetNodeKey: string;
    domain: DomainKey;
    title: string;
    sharedSummary: string;
    sourceCustodian: string;
  }) => {
    const res = await fetch('/api/federacion/sync-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleAckSyncPack = async (packId: string, targetCustodianAck: string) => {
    const res = await fetch(`/api/federacion/sync-packs/${encodeURIComponent(packId)}/ack`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCustodianAck }),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleCreateSynthesis = async (payload: {
    title: string;
    involvedNodes: string[];
    involvedDomains: DomainKey[];
    sugerenciaAccion: string;
  }) => {
    const res = await fetch('/api/horizonte3/sintesis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleRatifySynthesis = async (
    synthesisId: string,
    ratifiedBy: string,
    ratifiedNote: string,
  ) => {
    const res = await fetch(
      `/api/horizonte3/sintesis/${encodeURIComponent(synthesisId)}/ratificar`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratifiedBy, ratifiedNote }),
      },
    );
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleAuditLineage = async (): Promise<string> => {
    const res = await fetch('/api/horizonte3/auditar-linaje', {
      method: 'POST',
    });
    const body = (await res.json()) as {
      message?: string;
      auditHash?: string;
      tipHash?: string;
    };
    await cargarModeloFederado();
    return `[HTTP ${res.status}] ${body.message ?? 'Auditoría completada'} · AuditHash: ${body.auditHash ?? ''} · TipHash: ${body.tipHash ?? ''}`;
  };

  const handleToggleNodeSovereignty = async (nodeKey: string) => {
    const currentSov = federalSovereignty.find((s) => s.nodeKey === nodeKey);
    const prevMode = currentSov?.sovereigntyMode ?? 'delegacion_revocable_activa';
    const nextMode =
      prevMode === 'delegacion_revocable_activa'
        ? 'custodia_local_estricta'
        : 'delegacion_revocable_activa';

    const res = await fetch(`/api/horizonte3/soberania/${encodeURIComponent(nodeKey)}`, {
      method: 'PATCH',
    });
    if (res.ok) {
      await cargarModeloFederado();
    }

    const fcmResult = await recordCustodianSovereigntyAlertInFirestore({
      nodeKey: (nodeKey === 'caucete' || nodeKey === 'iglesia' ? nodeKey : 'capital'),
      nodeName: currentSov?.nodeName ?? nodeKey.toUpperCase(),
      previousMode: prevMode,
      nextMode,
      severity: nextMode === 'custodia_local_estricta' ? 'critical' : 'resolved',
      custodianTarget: 'Mesa Tripartita de Custodios (Comunidad · Instituciones · Comercios)',
      summary: `Cambio de régimen en ${currentSov?.nodeName ?? nodeKey}: ${prevMode} → ${nextMode}.`,
    });
    setStation04LastFcmAlert(fcmResult.record);
  };

  // ==========================================================================
  // Manejadores del Horizonte 4 (EV-015, EV-016, EV-017, EV-018)
  // ==========================================================================
  const handleExecuteSpatialIntersection = async (payload: {
    geometryId: string;
    bufferMeters: number;
  }) => {
    const res = await fetch('/api/horizonte4/postgis-interseccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleEnqueueOfflineFieldItem = async (payload: {
    nodeKey: string;
    brigadeName: string;
    title: string;
    notes: string;
  }) => {
    const res = await fetch('/api/horizonte4/offline-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleExecuteBatchSync = async (): Promise<string> => {
    const res = await fetch('/api/horizonte4/batch-sync', {
      method: 'POST',
    });
    const body = (await res.json()) as {
      message?: string;
      batchHash?: string;
    };
    await cargarModeloFederado();
    return `[HTTP ${res.status}] ${body.message ?? 'Batch sync completado'} · BatchHash: ${body.batchHash ?? ''}`;
  };

  const handleIssueEd25519Signature = async (payload: {
    custodianId: string;
    targetEntity: string;
  }): Promise<string> => {
    const res = await fetch('/api/horizonte4/firmar-ed25519', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as {
      signatureHex?: string;
      data?: AccreditedCustodianRecord;
    };
    await cargarModeloFederado();
    return `[HTTP ${res.status}] Firma Ed25519 emitida por ${body.data?.displayName ?? payload.custodianId} · Firma: ${body.signatureHex ?? ''} (EV-017 ok)`;
  };

  const handleIngestTelemetryWebhook = async (payload: {
    stationId: string;
    value: number;
  }) => {
    const res = await fetch('/api/horizonte4/webhooks/telemetria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleVisualValidateAsset = async (
    featureId: string,
    visualState: 'optimal_verified' | 'maintenance_required',
  ) => {
    const res = await fetch(
      `/api/features/${encodeURIComponent(featureId)}/visual-check`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualState }),
      },
    );
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleTestDuplicateHashIdempotency = async (): Promise<string> => {
    const sampleEvent = eventsRaw[0];
    const targetHash = sampleEvent?.hash ?? 'demo-hash-ev005';
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: sampleEvent?.type ?? 'TerritorialReportCreated',
        nodeId: sampleEvent?.nodeId ?? 'ter-sjn-cap',
        hash: targetHash,
        payload: sampleEvent?.payload ?? { test: 'idempotency' },
      }),
    });
    const body = (await res.json()) as {
      error?: string;
      evidencia_actualizada?: string;
    };
    await cargarModeloFederado();
    return `[HTTP ${res.status}] ${body.error ?? 'Verificado'} (${body.evidencia_actualizada ?? 'EV-005 verificada'})`;
  };

  const handleVerifyEvidencia = async (code: string) => {
    const res = await fetch(`/api/evidencias/${encodeURIComponent(code)}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: {
          verified_by: 'Ciclo interactivo HITUB Horizontes 1, 2 y 3',
          timestamp: new Date().toISOString(),
        },
      }),
    });
    if (res.ok) {
      await cargarModeloFederado();
    }
  };

  const handleWorkspaceExportVerified = async (exportMeta: {
    channel: 'google-docs' | 'google-drive' | 'local-download';
    template: string;
    title: string;
    fileId?: string;
    webViewLink?: string;
  }) => {
    await fetch('/api/evidencias/EV-014/verify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: {
          channel: exportMeta.channel,
          template: exportMeta.template,
          title: exportMeta.title,
          fileId: exportMeta.fileId ?? null,
          exported_at: new Date().toISOString(),
        },
      }),
    });
    await cargarModeloFederado();
  };

  const handleFocusOnGoogleMap = (territorioId: string) => {
    setFocusedGeometry(null);
    setFocusedTerritorioId(territorioId);
    const mapEl = document.getElementById('cartografia-workspace');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleFocusGeometryOnGoogleMap = (geom: SpatialGeometryRecord) => {
    setFocusedTerritorioId(null);
    setFocusedGeometry(geom);
    const mapEl = document.getElementById('cartografia-workspace');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const territoriosItems = territorios.status === 'ok' ? territorios.items : [];
  const evidenciasOkCount = evidencias.filter((e) => e.status === 'ok').length;

  const uiOperationalState: UiOperationalState = resolveUiOperationalState({
    loading: territorios.status === 'loading' || health.status === 'checking',
    error: lastDataSourceError,
    mode: runtimeMode,
    itemCount: territoriosItems.length,
  });

  const operationalOriginLabel = resolveOperationalOriginLabel({
    isDemoNamespace,
    mode: runtimeMode,
  });

  const handleToggleDemoNamespace = () => {
    const next = !isDemoNamespace;
    setIsDemoNamespace(next);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', next ? '/demo' : '/');
    }
  };

  const handleRunIdempotencyAndErrorProbe = async () => {
    const syn = new SyntheticDataSource();
    const first = await syn.emitEvent({
      type: 'demo.probe_ev005',
      nodeId: 'capital',
      payload: { check: 'idempotencia-ev005', cycle: 'post-core-002' },
    });
    const second = await syn.emitEvent({
      type: 'demo.probe_ev005',
      nodeId: 'capital',
      payload: { check: 'idempotencia-ev005', cycle: 'post-core-002' },
    });
    const degradedApi = new ApiDataSource({
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: '503 Base de datos desconectada' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    let propagated503 = false;
    try {
      await degradedApi.listTerritories();
    } catch (e) {
      propagated503 = e instanceof DataSourceHttpError && e.status === 503;
    }
    setIdempotencyProbeResult(
      `1er insert: ${first.status} (${first.id}) · 2do insert: ${second.status} (mismo id=${first.id === second.id}, hash=${first.hash.slice(0, 12)}…) · 503 propagado sin []: ${propagated503 ? 'SÍ (R5 OK)' : 'NO'}`,
    );
  };

  return (
    <>
      {gmpQuotaExceeded && (
        <div className="quota-banner">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Banner obligatorio Paso 6 cuando opera la fuente sintética (VITE_MOCK_API=1 o modo synthetic) — extraída 1:1 a SyntheticModeWarningBanner (FE-DEUDA-02 #293, corte 3) */}
      {(runtimeMode === 'synthetic' || useSyntheticInDemo) && (
        <SyntheticModeWarningBanner activeDataSourceName={activeDataSource.name} />
      )}

      {/* Barra de transparencia operativa R5 (#16, #17, #18): distingue sin ambigüedad los 4 orígenes y los 6 estados — extraída 1:1 a OperationalOriginStrip (FE-DEUDA-02 #293, corte 2) */}
      <OperationalOriginStrip
        operationalOriginLabel={operationalOriginLabel}
        runtimeMode={runtimeMode}
        modeSourceLabel={modeSourceLabel}
        uiOperationalState={uiOperationalState}
        isDemoNamespace={isDemoNamespace}
        onToggleDemoNamespace={handleToggleDemoNamespace}
      />

      {/* Barra de Evolución Visual ADR-034 (tokens.css · Issue #109 / #114): Identidad Mineral San Juan + Estados R5-UI + Selector de Tema — extraída 1:1 a TokenEvolutionStrip (FE-DEUDA-02 #293, corte 4) */}
      <TokenEvolutionStrip
        themeMode={themeMode}
        onSelectThemeMode={setThemeMode}
      />

      {/* Top Bar Contract: 3 zonas (Brand | 5 Nav links | 1 Primary Action) — extraída 1:1 a TopBarHeader (FE-DEUDA-02 #293, corte 6) */}
      <TopBarHeader onSyncCore={sincronizarTodo} />

      {/* PROTOTIPO BASE CONSOLIDADA (3 de septiembre 2026) MONTADO SOBRE EL PROTOTIPO DE LA PÁGINA */}
      <BaseConsolidadaPrototype
        selectedNodeKey={selectedNodeKey}
        onSelectCanonicalNodeKey={(canonicalKey) => {
          setSelectedNodeKey(canonicalKey);
          setExternalPlatformTerritoryFilter(
            canonicalKey === 'capital'
              ? 'gran-san-juan-capital'
              : canonicalKey === 'caucete'
                ? 'caucete'
                : 'iglesia',
          );
        }}
        showFullPageCockpit={showFullPageCockpit}
        onToggleFullPageCockpit={() => setShowFullPageCockpit((prev) => !prev)}
        onJumpToSection={(sectionId) => {
          if (!showFullPageCockpit) {
            setShowFullPageCockpit(true);
            setTimeout(() => {
              document
                .getElementById(sectionId)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
          } else {
            document
              .getElementById(sectionId)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      <main
        id="top"
        className="container"
        style={{ display: showFullPageCockpit ? 'block' : 'none' }}
      >
        {/* Hero / Síntesis Ejecutiva de Horizontes 1, 2, 3 y 4 en la Provincia de San Juan — extraída 1:1 a HeroBannerSection (FE-DEUDA-02 #293, corte 5) */}
        <HeroBannerSection
          territoriosCount={territoriosItems.length}
          spatialGeometriesCount={spatialGeometries.length}
          lineageChainCount={lineageChain.length}
          evidenciasOkCount={evidenciasOkCount}
        />

        {/* ESTUDIO DE DISEÑO HEURÍSTICO Y RECURSIVO FRONTEND (Nivel Premiación Internacional · ADR-034 + Modelos Base) */}
        <section
          id="estudio-diseno-heuristico-frontend"
          className="card"
          data-state="ok"
        >
          <div className="section-header">
            <div>
              <span className="kicker-text">
                Arquitectura Visual &amp; Heurística Internacional · Proceso Recursivo Modelo Base → Píxel (ADR-034 · v7.7)
              </span>
              <h2>
                Estudio Formal de Diseño Frontend y Lentes Cognitivas del Ecosistema
              </h2>
              <p className="section-caption">
                Cada decisión estética y de interacción responde recursivamente a los{' '}
                <strong>19 modelos Prisma</strong>, los{' '}
                <strong>13 módulos de dominio</strong>, los contratos{' '}
                <code>@delocalsoy/contracts</code> y la identidad de los{' '}
                <strong>3 departamentos de San Juan</strong>. Usá las{' '}
                <strong>Lentes Cognitivas</strong> para enfocar el área de trabajo o mantener la vista integral.
              </p>
            </div>
          </div>

          {/* 1. Selector Ejecutivo de Lentes Cognitivas (H-TER-03: Reducción de fatiga lineal) — extraída 1:1 a CognitiveLensSelector (FE-DEUDA-02 #293, corte 7) */}
          <CognitiveLensSelector
            activeDesignLens={activeDesignLens}
            onSelectLens={setActiveDesignLens}
          />

          {/* MESA OPERATIVA EN VIVO — LENTE I: ATLAS & COCKPIT «COCO-BABA» (DEMO BASE + CARTOGRAFÍA SRID=4326) — extraída 1:1 a LensOneAtlasWorkbench (FE-DEUDA-02 #293, corte 8) */}
          {activeDesignLens === 'lens_atlas_coco_baba' && (
            <LensOneAtlasWorkbench
              selectedNodeKey={selectedNodeKey}
              externalCockpitMacroView={externalCockpitMacroView}
              onSelectNodeKey={setSelectedNodeKey}
              onInspectNode={setInspectedNodeKey}
              onSelectCockpitMacroView={setExternalCockpitMacroView}
              onFilterPlatformTerritory={setExternalPlatformTerritoryFilter}
              onFocusInspectionStation={setActiveInspectionStation}
              onSelectRecursiveLink={setSelectedRecursiveLinkIdx}
              onSelectDesignLens={setActiveDesignLens}
            />
          )}

          {/* MESA OPERATIVA EN VIVO — LENTE II: FLUJO VERTICAL (13 MÓDULOS + 11 ESLABONES) Y ESTADOS R5-UI — extraída 1:1 a LensTwoVerticalFlowWorkbench (FE-DEUDA-02 #293, corte 9) */}
          {activeDesignLens === 'lens_vertical_r5ui' && (
            <LensTwoVerticalFlowWorkbench
              externalPlatformTerritoryFilter={externalPlatformTerritoryFilter}
              externalPlatformSection={externalPlatformSection}
              operationalOriginLabel={operationalOriginLabel}
              onFilterPlatformTerritory={setExternalPlatformTerritoryFilter}
              onSelectNodeKey={setSelectedNodeKey}
              onSelectPlatformSection={setExternalPlatformSection}
              onFocusInspectionStation={setActiveInspectionStation}
              onSelectRecursiveLink={setSelectedRecursiveLinkIdx}
              onSelectDesignLens={setActiveDesignLens}
            />
          )}

          {/* MESA OPERATIVA EN VIVO — LENTE III: SOBERANÍA DE NODOS, POSTGIS H2–H4 & ALERTAS PUSH FCM / FIRESTORE — extraída 1:1 a LensThreeSovereigntyWorkbench (FE-DEUDA-02 #293, corte 10) */}
          {activeDesignLens === 'lens_sovereignty_fcm' && (
            <LensThreeSovereigntyWorkbench
              federalSovereignty={federalSovereignty}
              accreditedCustodians={accreditedCustodians}
              spatialGeometries={spatialGeometries}
              spatialIntersections={spatialIntersections}
              syncPacks={syncPacks}
              multiScaleSyntheses={multiScaleSyntheses}
              offlineFieldQueue={offlineFieldQueue}
              lineageChainCount={lineageChain.length}
              telemetryWebhooksCount={telemetryWebhooks.length}
              selectedNodeKey={selectedNodeKey}
              externalNodeAuditFilter={externalNodeAuditFilter}
              station04LineageResult={station04LineageResult}
              station04LastFcmAlert={station04LastFcmAlert}
              onToggleNodeSovereignty={handleToggleNodeSovereignty}
              onAuditLineage={handleAuditLineage}
              onExecuteSpatialIntersection={handleExecuteSpatialIntersection}
              onExecuteBatchSync={handleExecuteBatchSync}
              onSelectNodeKey={setSelectedNodeKey}
              onFilterPlatformTerritory={setExternalPlatformTerritoryFilter}
              onSelectNodeAuditFilter={setExternalNodeAuditFilter}
              onFocusInspectionStation={setActiveInspectionStation}
              onSelectRecursiveLink={setSelectedRecursiveLinkIdx}
              onSelectDesignLens={setActiveDesignLens}
              onSetStation04LineageResult={setStation04LineageResult}
            />
          )}

          {/* MESA OPERATIVA EN VIVO — LENTE IV: CONTRATOS EPISTÉMICOS (C1–C5 · 19 MODELOS PRISMA), COPILOTO IA ÉTICO TRIPARTITO Y EV-001..EV-018 — extraída 1:1 a LensFourEpistemicContractsWorkbench (FE-DEUDA-02 #293, corte 11) */}
          {activeDesignLens === 'lens_epistemic_contracts' && (
            <LensFourEpistemicContractsWorkbench
              selectedNodeKey={selectedNodeKey}
              externalRecursiveTab={externalRecursiveTab}
              externalCopilotTab={externalCopilotTab}
              externalCopilotRole={externalCopilotRole}
              prismaIntegrityPreC5={prismaIntegrityPreC5}
              station05C1C5Result={station05C1C5Result}
              station05TripartiteResult={station05TripartiteResult}
              evidencias={evidencias}
              lineageChainCount={lineageChain.length}
              eventsRawCount={eventsRaw.length}
              onSelectDesignLens={setActiveDesignLens}
              onFocusInspectionStation={setActiveInspectionStation}
              onSelectRecursiveLink={setSelectedRecursiveLinkIdx}
              onSelectNodeKey={setSelectedNodeKey}
              onSelectRecursiveTab={setExternalRecursiveTab}
              onSelectCopilotTab={setExternalCopilotTab}
              onSetPrismaIntegrityPreC5={setPrismaIntegrityPreC5}
              onSetStation05C1C5Result={setStation05C1C5Result}
              onSetStation05TripartiteResult={setStation05TripartiteResult}
              onRunIdempotencyAndErrorProbe={handleRunIdempotencyAndErrorProbe}
              onReloadFederatedModel={cargarModeloFederado}
              onSyncAll={sincronizarTodo}
            />
          )}

          {/* CENTRO DE EXPORTACIÓN Y HANDOFF HACIA [agent: vibe] (ADR-034 · R12 · R15) — extraído 1:1 a VibeAgentExportHandoffCenter (FE-DEUDA-02 #293, corte 12) */}
          <VibeAgentExportHandoffCenter onReloadFederatedModel={cargarModeloFederado} />

          {/* 2. Cadena Recursiva de 5 Eslabones: Del Modelo Base del Monorepo al Píxel (Interactiva) */}
          <div className="coco-baba-triage-box" style={{ marginBottom: 0 }}>
            <div className="pane-header">
              <div>
                <span className="tiny-label">
                  Proceso Recursivo Previo al Diseño · Alineación 1:1 con el Monorepo Actual
                </span>
                <strong>
                  5 Eslabones de Coherencia: Modelo Base → Contrato → Máquina R5-UI → Token CSS → Componente
                </strong>
              </div>
              <div className="filter-group" role="tablist" aria-label="Eslabones recursivos del diseño">
                {[
                  '01. Ontología San Juan',
                  '02. Contratos & R5',
                  '03. Estados R5-UI',
                  '04. Soberanía & FCM',
                  '05. Tríada Ética IA',
                ].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={selectedRecursiveLinkIdx === idx}
                    className={
                      selectedRecursiveLinkIdx === idx
                        ? 'btn-filter active'
                        : 'btn-filter'
                    }
                    onClick={() => setSelectedRecursiveLinkIdx(idx)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const RECURSIVE_DESIGN_CHAIN = [
                {
                  step: 'Eslabón 01 · Ontología Territorial Base (ADR-021 / ADR-027 R-Scope)',
                  baseModel:
                    'packages/db/prisma/schema.prisma (territorios, capas_territoriales, features_territoriales) · 3 nodos: Capital (Centro/Desamparados), Caucete e Iglesia.',
                  heuristicRule:
                    'H-TER-01 (Materialidad Geológica 60-30-10): prohibido uniformar el vocabulario local; cada departamento tiene su firma cromática mineral y sus celdas de Soberanía Semántica.',
                  uiMaterialization:
                    'Tokens --node-capital-* (#C2410C Terracota), --node-caucete-* (#15803D Verde Oasis), --node-iglesia-* (#1D4ED8 Azul Andino) + Matriz 7×3 en FederatedNodeExplorer.tsx.',
                },
                {
                  step: 'Eslabón 02 · Contratos Simétricos e IDataSource Honesto (Regla R5 / C1–C5)',
                  baseModel:
                    'packages/contracts (Zod + OpenAPI 3.1.0) + apps/web/src/lib/ApiDataSource.ts y SyntheticDataSource.ts.',
                  heuristicRule:
                    'H-TER-05 (Honestidad Epistémica Visible): cero fallbacks silenciosos a [] ante errores HTTP 503/401/404/422/500; separación explícita de los 4 orígenes operativos.',
                  uiMaterialization:
                    'Franja operational-origin-strip, banner obligatorio de modo sintético y panel interactivo de prueba de idempotencia EV-005 y error 503.',
                },
                {
                  step: 'Eslabón 03 · Máquina de Estados Editorial R5-UI (Issue #109 / ADR-034)',
                  baseModel:
                    'packages/domain (13 módulos) + apps/worker (11 eslabones Fase 0) + rutas /api/plataforma/activos.',
                  heuristicRule:
                    'H-TER-02 & H-TER-05: todo activo o reporte territorial exhibe su etapa de validación sin ambigüedad cromática ni barras laterales decorativas.',
                  uiMaterialization:
                    'Badges semánticos --state-pendiente, --state-en-revision, --state-verificado, --state-publicado y --state-rechazado en TerritorialPlatformHub y Cockpit «Coco-Baba».',
                },
                {
                  step: 'Eslabón 04 · Soberanía Criptográfica y Custodia Tripartita (ADR-020 + Push FCM)',
                  baseModel:
                    'events_raw (@unique hash), custodios_acreditados_ed25519 (EV-017) y firestore.rules (territorial_nodes_sovereignty).',
                  heuristicRule:
                    'H-TER-06 (Soberanía Accionable en 1 Clic): cuando cambia el régimen de un nodo o ingresa un reporte crítico, el custodio recibe alerta trazable con hash SHA-256.',
                  uiMaterialization:
                    'Centro de Alertas de Soberanía en AdminSovereigntyDashboard.tsx y despacho Push FCM / Firestore en FederatedNodeExplorer.tsx.',
                },
                {
                  step: 'Eslabón 05 · Gobernanza Algorítmica y Dualidad Cartográfica (ADR-004 + PostGIS)',
                  baseModel:
                    '/api/ask (4 ramas deterministas + Anti-PII Ley 25.326 EV-023) + PostGIS SRID=4326 con índice GiST idx_territorios_geom_gist.',
                  heuristicRule:
                    'H-TER-04 & Tríada Ética: articulación directa entre lienzo esquemático (x, y) y Google Maps SRID=4326; separación visual Dato → Interpretación → Sugerencia (requiresHumanReview: true).',
                  uiMaterialization:
                    'EthicalAiCopilotPanel.tsx, TerritoriosMap.tsx y sub-vista de Panel del Nodo con firma de acta humana colegiada.',
                },
              ];
              const currentLink =
                RECURSIVE_DESIGN_CHAIN[selectedRecursiveLinkIdx] ??
                RECURSIVE_DESIGN_CHAIN[0];

              return (
                <div className="coco-baba-triage-grid">
                  <div className="coco-baba-triage-card">
                    <span className="tiny-label">1. Modelo Base y Contrato en Monorepo</span>
                    <strong style={{ display: 'block', marginTop: '0.25rem' }}>
                      {currentLink.step}
                    </strong>
                    <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                      {currentLink.baseModel}
                    </p>
                  </div>
                  <div className="coco-baba-triage-card">
                    <span className="tiny-label">2. Heurística de Diseño Internacional</span>
                    <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                      {currentLink.heuristicRule}
                    </p>
                  </div>
                  <div className="coco-baba-triage-card">
                    <span className="tiny-label">3. Materialización en tokens.css y UI React</span>
                    <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                      {currentLink.uiMaterialization}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 3. Matriz de las 6 Heurísticas de Premiación Internacional en Innovación Territorial (H-TER-01 a H-TER-06) — extraída 1:1 a HeuristicsAwardMatrix (FE-DEUDA-02 #293, corte 13) */}
            <HeuristicsAwardMatrix onSelectDesignLens={setActiveDesignLens} />

            {/* 4. Mesa de Inspección Interactiva Guiada en 5 Estaciones (Carlos Leonidas ↔ [agent: google]) */}
            {(() => {
              const INSPECTION_STATIONS = [
                {
                  index: 0,
                  code: 'ESTACIÓN 01',
                  title: 'Contrato Visual tokens.css & Paridad 60-30-10 (ADR-034 · #109 / #114)',
                  lens: 'all' as const,
                  anchor: 'estudio-diseno-heuristico-frontend',
                  whatToInspect:
                    'Comprobá la transición instantánea entre Piedra Caliza (#F7F5F0) y Pizarra Andina (#0B111E), la jerarquía tipográfica 2+1 (Fraunces + Plus Jakarta Sans + JetBrains Mono tabular-nums), la identidad mineral de los 3 departamentos de San Juan y los 5 estados R5-UI con contraste WCAG AA/AAA.',
                  baseModelLink:
                    'apps/web/src/design/tokens.css (Modo A de ADR-034 · mergeable directo en main sin tocar contratos ni backend).',
                },
                {
                  index: 1,
                  code: 'ESTACIÓN 02',
                  title: 'Cockpit Integrado «Coco-Baba» (Demo Base + Ecosistema General)',
                  lens: 'lens_atlas_coco_baba' as const,
                  anchor: 'nodos-federados',
                  whatToInspect:
                    'Explorá las 4 macro-pestañas rescatadas del Demo Base en FederatedNodeExplorer: (1) Matriz 7×3 con Soberanía Semántica, (2) Explorar Nodo con filtro por custodio (Comunidad, Instituciones, Comercios) y lienzo esquemático (x, y) ↔ PostGIS SRID=4326, (3) Comparar Nodos con barra de proporción Activos vs Problemáticas, y (4) Flujo de 5 Pasos + Contrato JSON delocalsoy.node.v2.',
                  baseModelLink:
                    'FederatedNodeExplorer.tsx + FederatedCompareView.tsx acoplados a /api/modelo-federado y @delocalsoy/contracts.',
                },
                {
                  index: 2,
                  code: 'ESTACIÓN 03',
                  title: 'Flujo Vertical E2E (13 Módulos + 11 Eslabones) y Honestidad IDataSource (R5)',
                  lens: 'lens_vertical_r5ui' as const,
                  anchor: 'plataforma-territorial-real',
                  whatToInspect:
                    'Verificá el catálogo de activos reales de Capital, Caucete e Iglesia, la cadena ejecutable de 11 eslabones de Fase 0 (#87), la separación de los 4 orígenes operativos (API real, API degradada, API sintética, Demo local) y la prueba en vivo de no-[] ante HTTP 503.',
                  baseModelLink:
                    'packages/domain (13 módulos) + apps/worker (11 eslabones) + ApiDataSource.ts / SyntheticDataSource.ts.',
                },
                {
                  index: 3,
                  code: 'ESTACIÓN 04',
                  title: 'Soberanía de Nodos, Sparklines y Alertas Push FCM / Firestore (EV-014)',
                  lens: 'lens_sovereignty_fcm' as const,
                  anchor: 'consola-admin-soberania',
                  whatToInspect:
                    'Inspeccioná la Consola Administrativa con Sparklines vectoriales de 6 ventanas (Q1..Q4 → Terreno H4 → Sesión Viva), las geometrías PostGIS ST_Intersects (H2/H4) y el disparo de alertas Push FCM / Firestore (/custodian_sovereignty_alerts) al cambiar el régimen de soberanía de un nodo.',
                  baseModelLink:
                    'AdminSovereigntyDashboard.tsx + firestore.rules (ADR-020 T2) + firestoreEthicalStore.ts.',
                },
                {
                  index: 4,
                  code: 'ESTACIÓN 05',
                  title: 'Epistemología R15, Contratos C1–C5 y Copiloto IA Ético Tripartito (ADR-004)',
                  lens: 'lens_epistemic_contracts' as const,
                  anchor: 'copiloto-ia-etico',
                  whatToInspect:
                    'Auditá la separación visual obligatoria 1. Dato Empírico → 2. Interpretación Contextual → 3. Sugerencia Accionable (requiresHumanReview: true), la paridad de los 19 modelos Prisma en RecursiveProspectiveContractPanel y el ledger append-only events_raw (EV-001..EV-036).',
                  baseModelLink:
                    'EthicalAiCopilotPanel.tsx + TraceabilityAndEvidenciasPanel.tsx + packages/contracts (OpenAPI 3.1.0).',
                },
              ];

              const currentStation =
                INSPECTION_STATIONS[activeInspectionStation] ??
                INSPECTION_STATIONS[0];
              const currentVerdict =
                stationVerdicts[currentStation.index] ?? 'aprobada';

              const selectAndFocusStation = (idx: number, shouldScroll: boolean) => {
                const target = INSPECTION_STATIONS[idx] ?? INSPECTION_STATIONS[0];
                setActiveInspectionStation(target.index);
                setSelectedRecursiveLinkIdx(target.index);
                setActiveDesignLens(target.lens);
                if (shouldScroll) {
                  setTimeout(() => {
                    document
                      .getElementById(target.anchor)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }
              };

              return (
                <div
                  data-testid="interactive-inspection-console"
                  className="coco-baba-triage-card"
                  style={{
                    marginTop: '0.95rem',
                    borderColor: 'var(--color-border-accent)',
                  }}
                >
                  <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                    <div>
                      <span className="tiny-label">
                        Recorrido Guiado en Vivo · Dirección Humana (Carlos Leonidas) ↔ [agent: google]
                      </span>
                      <strong style={{ display: 'block', fontSize: '1.02rem' }}>
                        Mesa de Inspección Interactiva en 5 Estaciones (Modo A tokens.css + Modo B Cockpit Staging)
                      </strong>
                    </div>
                    <div className="filter-group" role="group" aria-label="Controles de recorrido de estaciones">
                      <button
                        type="button"
                        className="btn-filter"
                        onClick={() =>
                          selectAndFocusStation(
                            (currentStation.index + INSPECTION_STATIONS.length - 1) %
                              INSPECTION_STATIONS.length,
                            false,
                          )
                        }
                      >
                        ← Anterior
                      </button>
                      <button
                        type="button"
                        className="btn-filter"
                        onClick={() =>
                          selectAndFocusStation(
                            (currentStation.index + 1) % INSPECTION_STATIONS.length,
                            false,
                          )
                        }
                      >
                        Siguiente →
                      </button>
                      <button
                        type="button"
                        className="btn-confirm"
                        onClick={() => selectAndFocusStation(currentStation.index, true)}
                      >
                        Ir a {currentStation.code} en pantalla ↓
                      </button>
                    </div>
                  </div>

                  {/* Barra de las 5 estaciones con estado de dictamen */}
                  <div
                    className="filter-group"
                    role="tablist"
                    aria-label="Estaciones de inspección interactiva"
                    style={{ marginBottom: '0.75rem', flexWrap: 'wrap' }}
                  >
                    {INSPECTION_STATIONS.map((st) => {
                      const v = stationVerdicts[st.index] ?? 'aprobada';
                      const vIcon =
                        v === 'aprobada'
                          ? '✓'
                          : v === 'ajustar_token'
                            ? '◐'
                            : '✎';
                      return (
                        <button
                          key={st.code}
                          type="button"
                          role="tab"
                          aria-selected={activeInspectionStation === st.index}
                          className={
                            activeInspectionStation === st.index
                              ? 'btn-filter active'
                              : 'btn-filter'
                          }
                          onClick={() => selectAndFocusStation(st.index, false)}
                        >
                          {vIcon} {st.code}
                        </button>
                      );
                    })}
                  </div>

                  {/* Detalle de la estación activa + Muestrario y Acciones en Vivo */}
                  <div className="coco-baba-triage-grid">
                    <div className="coco-baba-triage-card">
                      <span className="tiny-label">{currentStation.code} · Qué Inspeccionar Ahora</span>
                      <strong style={{ display: 'block', marginTop: '0.25rem' }}>
                        {currentStation.title}
                      </strong>
                      <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                        {currentStation.whatToInspect}
                      </p>
                      <p
                        className="territory-meta"
                        style={{
                          marginTop: '0.45rem',
                          marginBottom: 0,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.76rem',
                        }}
                      >
                        Anclaje monorepo: {currentStation.baseModelLink}
                      </p>
                    </div>

                    <div className="coco-baba-triage-card">
                      <span className="tiny-label">
                        Prueba Interactiva Directa en {currentStation.code}
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          marginTop: '0.35rem',
                        }}
                      >
                        {currentStation.index === 0 && (
                          <>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              <span className="token-node-tag-capital">
                                Capital #C2410C
                              </span>
                              <span className="token-node-tag-caucete">
                                Caucete #1F6E50
                              </span>
                              <span className="token-node-tag-iglesia">
                                Iglesia #1D4E89
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              <span className="r5-state-badge r5-state-pendiente">pendiente</span>
                              <span className="r5-state-badge r5-state-en_revision">en_revision</span>
                              <span className="r5-state-badge r5-state-verificado">verificado</span>
                              <span className="r5-state-badge r5-state-publicado">publicado</span>
                              <span className="r5-state-badge r5-state-rechazado">rechazado</span>
                            </div>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() =>
                                setThemeMode((prev) =>
                                  prev === 'dark' ? 'light' : 'dark',
                                )
                              }
                            >
                              Alternar Tema en Vivo (Actual:{' '}
                              {themeMode === 'dark'
                                ? 'Pizarra Andina · Oscuro'
                                : 'Piedra Caliza · Claro'}
                              )
                            </button>
                          </>
                        )}

                        {currentStation.index === 1 && (
                          <>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {(['capital', 'caucete', 'iglesia'] as const).map((nk) => (
                                <button
                                  key={nk}
                                  type="button"
                                  className={
                                    selectedNodeKey === nk
                                      ? 'btn-filter active'
                                      : 'btn-filter'
                                  }
                                  onClick={() => {
                                    setSelectedNodeKey(nk);
                                    selectAndFocusStation(1, true);
                                  }}
                                >
                                  Foco: {nk.toUpperCase()}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => setInspectedNodeKey(selectedNodeKey)}
                            >
                              Abrir Ficha Modal Integral ({selectedNodeKey.toUpperCase()})
                            </button>
                          </>
                        )}

                        {currentStation.index === 2 && (
                          <>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => void handleRunIdempotencyAndErrorProbe()}
                            >
                              Ejecutar Probe EV-005 Idempotencia + Error 503 (R5)
                            </button>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => setUseSyntheticInDemo((prev) => !prev)}
                            >
                              {useSyntheticInDemo
                                ? 'Volver a ApiDataSource Real (/api/*)'
                                : 'Simular Modo Sintético (VITE_MOCK_API=1)'}
                            </button>
                          </>
                        )}

                        {currentStation.index === 3 && (
                          <>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => {
                                void handleToggleNodeSovereignty(selectedNodeKey);
                                selectAndFocusStation(3, true);
                              }}
                            >
                              Conmutar Soberanía + Emitir Alerta Push FCM ({selectedNodeKey.toUpperCase()})
                            </button>
                          </>
                        )}

                        {currentStation.index === 4 && (
                          <>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => {
                                setActiveDesignLens('lens_epistemic_contracts');
                                setTimeout(() => {
                                  document
                                    .getElementById('trazabilidad-evidencias')
                                    ?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'start',
                                    });
                                }, 50);
                              }}
                            >
                              Auditar Ledger events_raw y Matriz EV-001..EV-036 ↓
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="coco-baba-triage-card">
                      <span className="tiny-label">
                        Dictamen de Dirección Humana (R9 · {currentStation.code})
                      </span>
                      <div
                        className="filter-group"
                        role="group"
                        aria-label="Dictamen de estación"
                        style={{ marginTop: '0.35rem', flexWrap: 'wrap' }}
                      >
                        {(
                          [
                            { key: 'aprobada', label: '✓ Aprobada' },
                            { key: 'ajustar_token', label: '◐ Ajustar tokens.css' },
                            { key: 'iterar_layout', label: '✎ Iterar Componente' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            className={
                              currentVerdict === opt.key
                                ? 'btn-filter active'
                                : 'btn-filter'
                            }
                            onClick={() =>
                              setStationVerdicts((prev) => ({
                                ...prev,
                                [currentStation.index]: opt.key,
                              }))
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ marginTop: '0.55rem' }}>
                        <button
                          type="button"
                          className="btn-toggle"
                          style={{ width: '100%' }}
                          onClick={() => {
                            const reportText = [
                              `# Acta de Inspección Interactiva Frontend (ADR-034 · v7.7)`,
                              ...INSPECTION_STATIONS.map(
                                (s) =>
                                  `- ${s.code} (${s.title}): ${stationVerdicts[s.index] ?? 'aprobada'}`,
                              ),
                              ``,
                              `Co-authored-by: Carlos Leonidas <carlosleonidas04@gmail.com>`,
                            ].join('\n');
                            if (
                              typeof navigator !== 'undefined' &&
                              navigator.clipboard
                            ) {
                              void navigator.clipboard.writeText(reportText);
                            }
                            setInspectionCopiedFeedback(true);
                            setTimeout(() => setInspectionCopiedFeedback(false), 2500);
                          }}
                        >
                          {inspectionCopiedFeedback
                            ? '✓ Acta de Inspección copiada al portapapeles'
                            : 'Copiar Acta de Inspección de las 5 Estaciones (R1/R9)'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Laboratorio Detallado en Vivo de la Estación 01 (tokens.css · ADR-034 §4.5) — extraído 1:1 a Station01TokenWorkbench (FE-DEUDA-02 #293, corte 14) */}
                  {currentStation.index === 0 && (
                    <Station01TokenWorkbench
                      themeMode={themeMode}
                      selectedNodeKey={selectedNodeKey}
                      onSelectNodeKey={setSelectedNodeKey}
                    />
                  )}

                  {/* Laboratorio Detallado en Vivo de la Estación 02 (Cockpit Integrado «Coco-Baba» · Demo Base + Ecosistema General) — extraído 1:1 a Station02CockpitWorkbench (FE-DEUDA-02 #293, corte 15) */}
                  {currentStation.index === 1 && (
                    <Station02CockpitWorkbench
                      selectedNodeKey={selectedNodeKey}
                      onSelectNodeKey={setSelectedNodeKey}
                      externalCockpitMacroView={externalCockpitMacroView}
                      onSelectCockpitMacroView={setExternalCockpitMacroView}
                      externalCustodianFilter={externalCustodianFilter}
                      onSelectCustodianFilter={setExternalCustodianFilter}
                      territoriosItems={territoriosItems}
                      spatialGeometries={spatialGeometries}
                      layersByNode={layersByNode}
                      features={features}
                      reports={reports}
                      onFocusOnGoogleMap={handleFocusOnGoogleMap}
                    />
                  )}

                  {/* Laboratorio Detallado en Vivo de la Estación 03 (Flujo Vertical 13 Módulos / 11 Eslabones + Honestidad IDataSource R5) — extraído 1:1 a Station03VerticalFlowWorkbench (FE-DEUDA-02 #293, corte 16) */}
                  {currentStation.index === 2 && (
                    <Station03VerticalFlowWorkbench
                      activeDataSource={activeDataSource}
                      runtimeMode={runtimeMode}
                      uiOperationalState={uiOperationalState}
                      operationalOriginLabel={operationalOriginLabel}
                      useSyntheticInDemo={useSyntheticInDemo}
                      onToggleSyntheticInDemo={() => setUseSyntheticInDemo((prev) => !prev)}
                      onRunIdempotencyAndErrorProbe={handleRunIdempotencyAndErrorProbe}
                      idempotencyProbeResult={idempotencyProbeResult}
                      reports={reports}
                      features={features}
                      evidenciasOkCount={evidenciasOkCount}
                      externalPlatformSection={externalPlatformSection}
                      onSelectPlatformSection={setExternalPlatformSection}
                      externalPlatformTerritoryFilter={externalPlatformTerritoryFilter}
                      onSelectPlatformTerritoryFilter={setExternalPlatformTerritoryFilter}
                      onSelectNodeKey={setSelectedNodeKey}
                    />
                  )}

                  {/* Laboratorio Detallado en Vivo de la Estación 04 (Soberanía de Nodos, Sparklines y Alertas Push FCM / Firestore · EV-014) — extraído 1:1 a Station04SovereigntyWorkbench (FE-DEUDA-02 #293, corte 17) */}
                  {currentStation.index === 3 && (
                    <Station04SovereigntyWorkbench
                      selectedNodeKey={selectedNodeKey}
                      onSelectNodeKey={setSelectedNodeKey}
                      onToggleNodeSovereignty={handleToggleNodeSovereignty}
                      externalSovereigntyFilter={externalSovereigntyFilter}
                      onSelectSovereigntyFilter={setExternalSovereigntyFilter}
                      externalNodeAuditFilter={externalNodeAuditFilter}
                      onSelectNodeAuditFilter={setExternalNodeAuditFilter}
                      station04LastFcmAlert={station04LastFcmAlert}
                      station04LineageResult={station04LineageResult}
                      onStation04LineageResult={setStation04LineageResult}
                      onAuditLineage={handleAuditLineage}
                      onExecuteBatchSync={handleExecuteBatchSync}
                      federalSovereignty={federalSovereignty}
                      lineageChain={lineageChain}
                      accreditedCustodians={accreditedCustodians}
                      spatialGeometries={spatialGeometries}
                      spatialIntersections={spatialIntersections}
                      offlineFieldQueue={offlineFieldQueue}
                      telemetryWebhooks={telemetryWebhooks}
                      syncPacks={syncPacks}
                    />
                  )}

                  {/* Laboratorio Detallado en Vivo de la Estación 05 (Epistemología R15, Contratos C1–C5, 19 Modelos Prisma, Copiloto IA Ético Tripartito y Cierre de las 5 Estaciones) — extraído 1:1 a Station05EpistemicContractsWorkbench (FE-DEUDA-02 #293, corte 18) */}
                  {currentStation.index === 4 && (
                    <Station05EpistemicContractsWorkbench
                      selectedNodeKey={selectedNodeKey}
                      eventsRaw={eventsRaw}
                      evidencias={evidencias}
                      features={features}
                      reports={reports}
                      territoriosItems={territoriosItems}
                      layersByNode={layersByNode}
                      multiScaleSyntheses={multiScaleSyntheses}
                      temporalSnapshots={temporalSnapshots}
                      accreditedCustodians={accreditedCustodians}
                      federalSovereignty={federalSovereignty}
                      lineageChain={lineageChain}
                      offlineFieldQueue={offlineFieldQueue}
                      spatialGeometries={spatialGeometries}
                      syncPacks={syncPacks}
                      telemetryWebhooks={telemetryWebhooks}
                      externalCopilotTab={externalCopilotTab}
                      onSelectCopilotTab={setExternalCopilotTab}
                      externalCopilotRole={externalCopilotRole}
                      onSelectCopilotRole={setExternalCopilotRole}
                      externalRecursiveTab={externalRecursiveTab}
                      onSelectRecursiveTab={setExternalRecursiveTab}
                      station05C1C5Result={station05C1C5Result}
                      onSetStation05C1C5Result={setStation05C1C5Result}
                      prismaIntegrityPreC5={prismaIntegrityPreC5}
                      onSetPrismaIntegrityPreC5={setPrismaIntegrityPreC5}
                      station05TripartiteResult={station05TripartiteResult}
                      onSetStation05TripartiteResult={setStation05TripartiteResult}
                      station05PrismaFilter={station05PrismaFilter}
                      onSelectStation05PrismaFilter={setStation05PrismaFilter}
                      stationVerdicts={stationVerdicts}
                      onSetStationVerdicts={setStationVerdicts}
                      inspectionCertificateSignedHash={inspectionCertificateSignedHash}
                      onSetInspectionCertificateSignedHash={setInspectionCertificateSignedHash}
                      inspectionCopiedFeedback={inspectionCopiedFeedback}
                      onSetInspectionCopiedFeedback={setInspectionCopiedFeedback}
                      inspectionStations={INSPECTION_STATIONS}
                      onSelectDesignLens={setActiveDesignLens}
                      onRunIdempotencyAndErrorProbe={handleRunIdempotencyAndErrorProbe}
                      onReloadFederatedModel={cargarModeloFederado}
                      onSincronizarTodo={sincronizarTodo}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        </section>

        {/* PLATAFORMA TERRITORIAL REAL DELOCALSOY.AR: 13 MÓDULOS DE DOMINIO Y PRIMER FLUJO VERTICAL (ACTIVO VERIFICADO E2E) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_vertical_r5ui') && (
          <TerritorialPlatformHub
            onFocusTerritoryOnMap={(territoryId) => {
              handleFocusOnGoogleMap(territoryId);
            }}
            onRefreshCoreEvents={async () => {
              await cargarModeloFederado();
            }}
            externalActiveSection={externalPlatformSection}
            externalTerritoryFilter={externalPlatformTerritoryFilter}
          />
        )}

        {/* SECCIÓN AISLADA /demo (#16, #17, #18), CONTRATO DataSource Y AUDITORÍA EV-007 A EV-018 — extraída 1:1 a DemoDataSourceAuditSection (FE-DEUDA-02 #293, primer corte) */}
        {(activeDesignLens === 'all' ||
          activeDesignLens === 'lens_vertical_r5ui' ||
          activeDesignLens === 'lens_epistemic_contracts') && (
          <DemoDataSourceAuditSection
            useSyntheticInDemo={useSyntheticInDemo}
            onToggleSyntheticInDemo={() => setUseSyntheticInDemo((prev) => !prev)}
            onRunIdempotencyAndErrorProbe={handleRunIdempotencyAndErrorProbe}
            idempotencyProbeResult={idempotencyProbeResult}
            operationalOriginLabel={operationalOriginLabel}
          />
        )}

        {/* 0. Consola Administrativa Consolidada: Salud de Nodos, Soberanía Federal y Actividad de Auditoría */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_sovereignty_fcm') &&
          federalSovereignty.length > 0 && (
            <AdminSovereigntyDashboard
              federalSovereignty={federalSovereignty}
              territorios={territoriosItems}
              eventsRaw={eventsRaw}
              lineageChain={lineageChain}
              evidencias={evidencias}
              accreditedCustodians={accreditedCustodians}
              telemetryWebhooks={telemetryWebhooks}
              offlineFieldQueue={offlineFieldQueue}
              temporalSnapshots={temporalSnapshots}
              apiHealthStatus={health.status}
              apiHealthSummary={
                health.status === 'ok'
                  ? 'Conectada'
                  : health.status === 'checking'
                    ? 'Verificando…'
                    : 'Degradada'
              }
              onToggleNodeSovereignty={handleToggleNodeSovereignty}
              onToggleTerritorioActivo={handleToggleActivo}
              onAuditLineage={handleAuditLineage}
              onExecuteBatchSync={handleExecuteBatchSync}
              onInspectNode={(nodeKey) => {
                setSelectedNodeKey(nodeKey);
                setInspectedNodeKey(nodeKey);
              }}
              onFocusOnGoogleMap={handleFocusOnGoogleMap}
              externalSovereigntyFilter={externalSovereigntyFilter}
              externalNodeAuditFilter={externalNodeAuditFilter}
            />
          )}

        {/* Tendencia Trimestral Recharts (2026-Q1 a 2026-Q4): Registros Territoriales y Verificación de Evidencias */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_vertical_r5ui') && (
          <div id="tendencias-trimestrales">
            <QuarterlyTrendsSection
              territorios={territoriosItems}
              temporalSnapshots={temporalSnapshots}
              features={features}
              reports={reports}
              spatialGeometries={spatialGeometries}
              evidencias={evidencias}
            />
          </div>
        )}

        {/* 1. Matriz del Modelo Territorial (Iterativo, Recursivo y Proyectivo) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_epistemic_contracts') && (
          <HorizonOneArchitecturePanel />
        )}

        {/* 1B. Análisis Recursivo (H1–H3), Paridad Backend ↔ Frontend ↔ Prisma y Hoja de Ruta Prospectiva (Horizonte 4) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_epistemic_contracts') && (
          <RecursiveProspectiveContractPanel
            onParityVerified={async () => {
              await cargarModeloFederado();
            }}
            externalActiveTab={externalRecursiveTab}
          />
        )}

        {/* 1C. Copiloto IA Ético Tripartito (ADR-004), Search & Maps Grounding, Voz en Campo y Tablero SECI en Firestore */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_epistemic_contracts') && (
          <EthicalAiCopilotPanel
            territorios={territoriosItems}
            selectedNodeKey={selectedNodeKey}
            onSelectNodeKey={setSelectedNodeKey}
            onFocusOnGoogleMap={handleFocusOnGoogleMap}
            onRefreshCore={sincronizarTodo}
            externalActiveTab={externalCopilotTab}
            externalRolePersona={externalCopilotRole}
          />
        )}

        {/* 2. Horizonte 1: Explorador Exhaustivo de Nodos Federados (Cockpit Integrado Demo Base + Ecosistema General) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_atlas_coco_baba') &&
          territoriosItems.length > 0 && (
            <FederatedNodeExplorer
              territorios={territoriosItems}
              selectedNodeKey={selectedNodeKey}
              onSelectNodeKey={setSelectedNodeKey}
              layersByNode={layersByNode}
              categoriesByNode={categoriesByNode}
              features={features}
              reports={reports}
              eventsRaw={eventsRaw}
              spatialGeometries={spatialGeometries}
              federalSovereignty={federalSovereignty}
              evidencias={evidencias}
              runtimeMode={runtimeMode}
              onCreateReport={handleCreateReport}
              onAdvanceReport={handleAdvanceReport}
              onRecordHumanReview={handleRecordHumanReview}
              onToggleNodeSovereignty={handleToggleNodeSovereignty}
              onFocusOnGoogleMap={handleFocusOnGoogleMap}
              onOpenNodeDetailModal={(nodeKey) => setInspectedNodeKey(nodeKey)}
              onVisualValidateAsset={handleVisualValidateAsset}
              onExportVerified={handleWorkspaceExportVerified}
              externalCockpitMacroView={externalCockpitMacroView}
              externalCustodianFilter={externalCustodianFilter}
            />
          )}

        {/* 3. Horizonte 2: Geometrías PostGIS, Custodia Cruzada Inter-Nodos y Serie Multitemporal */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_sovereignty_fcm') &&
          territoriosItems.length > 0 && (
            <HorizonTwoSpatialFederationPanel
              territorios={territoriosItems}
              spatialGeometries={spatialGeometries}
              syncPacks={syncPacks}
              temporalSnapshots={temporalSnapshots}
              onCreateGeometry={handleCreateGeometry}
              onCreateSyncPack={handleCreateSyncPack}
              onAckSyncPack={handleAckSyncPack}
              onFocusGeometryOnGoogleMap={handleFocusGeometryOnGoogleMap}
            />
          )}

        {/* 4. Horizonte 3: Síntesis Multi-Escala Bajo Contrato Ético, Linaje Criptográfico y Observatorio Federal */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_sovereignty_fcm') &&
          territoriosItems.length > 0 && (
            <HorizonThreeObservatoryPanel
              territorios={territoriosItems}
              multiScaleSyntheses={multiScaleSyntheses}
              lineageChain={lineageChain}
              federalSovereignty={federalSovereignty}
              onCreateSynthesis={handleCreateSynthesis}
              onRatifySynthesis={handleRatifySynthesis}
              onAuditLineage={handleAuditLineage}
              onToggleNodeSovereignty={handleToggleNodeSovereignty}
            />
          )}

        {/* 5. Horizonte 4: Consultas Espaciales PostGIS ST_Intersects, Cola Offline-First, Firmas Ed25519 y Webhooks Hídricos */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_sovereignty_fcm') &&
          territoriosItems.length > 0 && (
            <HorizonFourFieldAndTelemetryPanel
              territorios={territoriosItems}
              spatialGeometries={spatialGeometries}
              syncPacks={syncPacks}
              multiScaleSyntheses={multiScaleSyntheses}
              spatialIntersections={spatialIntersections}
              offlineFieldQueue={offlineFieldQueue}
              accreditedCustodians={accreditedCustodians}
              telemetryWebhooks={telemetryWebhooks}
              onExecuteSpatialIntersection={handleExecuteSpatialIntersection}
              onEnqueueOfflineFieldItem={handleEnqueueOfflineFieldItem}
              onExecuteBatchSync={handleExecuteBatchSync}
              onIssueEd25519Signature={handleIssueEd25519Signature}
              onIngestTelemetryWebhook={handleIngestTelemetryWebhook}
              onFocusGeometryOnGoogleMap={handleFocusGeometryOnGoogleMap}
            />
          )}

        {/* 5. Comparación Transversal Federada sin Homogeneización */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_atlas_coco_baba') &&
          territoriosItems.length >= 2 && (
            <FederatedCompareView
              territorios={territoriosItems}
              layersByNode={layersByNode}
              features={features}
              spatialGeometries={spatialGeometries}
              onInspectNode={(nodeKey) => {
                setSelectedNodeKey(nodeKey);
                setInspectedNodeKey(nodeKey);
              }}
            />
          )}

        {/* 6. Trazabilidad Append-Only (events_raw) y Evidencias Ejecutables (EV-001 a EV-014) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_epistemic_contracts') && (
          <TraceabilityAndEvidenciasPanel
            eventsRaw={eventsRaw}
            evidencias={evidencias}
            onTestDuplicateHashIdempotency={handleTestDuplicateHashIdempotency}
            onVerifyEvidencia={handleVerifyEvidencia}
          />
        )}

        {/* 6b. Recorrido del Showcase (VIG-007 — Demo final): Caucete → Capital → Valle de Iglesia con estado real (R15) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_atlas_coco_baba') && (
          <ShowcaseRecorridoPanel />
        )}

        {/* 6c. Servicio informativo ciudadano del nodo Caucete (NC-R5 #142, NODO-CAU): capas v6,
            fuentes ADR-035 y ingestas publicadas (NC-EV-09) — acople por contrato DataSource (ADR-029) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_atlas_coco_baba') && (
          <ServicioInformativoPanel dataSource={defaultDataSource} />
        )}

        {/* 6d. Mercado de Proximidad (MARKET-CAP MK-1 #243, sub-épica #152): directorio de
            comercios federado con estados epistémicos honestos — acople por contrato
            DataSource (ADR-029), multinodo desde día 1 (decisión DH) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_atlas_coco_baba') && (
          <ComerciosPanel dataSource={defaultDataSource} />
        )}

        {/* 7. Estado de Integración API y Registro Maestro de Nodos Territoriales */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_atlas_coco_baba') && (
          <section
            id="registro-maestro-nodos"
            className="card"
            data-state={
              territorios.status === 'ok'
                ? 'ok'
                : territorios.status === 'error'
                  ? 'error'
                  : 'checking'
            }
          >
          <div className="section-header">
            <div>
              <span className="kicker-text">04. Registro Maestro y Estado de API</span>
              <h2>Nodos Territoriales Registrados (/api/territorios)</h2>
              <p className="section-caption">
                Estado de salud del servicio:{' '}
                {health.status === 'ok' ? (
                  <span className="ok">API conectada ({health.body})</span>
                ) : health.status === 'checking' ? (
                  <span>Consultando /api/health…</span>
                ) : (
                  <span className="error">Sin conexión ({health.message})</span>
                )}
              </p>
            </div>
            <div className="filter-group" role="group" aria-label="Filtrar territorios">
              <button
                type="button"
                className={filtro === 'todos' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setFiltro('todos')}
              >
                Todos
              </button>
              <button
                type="button"
                className={filtro === 'activos' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setFiltro('activos')}
              >
                Activos
              </button>
              <button
                type="button"
                className={filtro === 'inactivos' ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setFiltro('inactivos')}
              >
                En vinculación / Inactivos
              </button>
              <button
                type="button"
                className="btn-filter"
                onClick={() => void sincronizarTodo()}
                title="Recargar territorios"
              >
                Recargar
              </button>
            </div>
          </div>

          {territorios.status === 'loading' && (
            <p>Consultando <code>/api/territorios</code>…</p>
          )}

          {territorios.status === 'error' && (
            <>
              <p className="error">Error al cargar territorios</p>
              <pre>{territorios.message}</pre>
            </>
          )}

          {territorios.status === 'ok' && (
            <>
              {territorios.items.length === 0 ? (
                <p className="empty-state">No hay territorios para el filtro seleccionado.</p>
              ) : (
                <ul className="territory-list">
                  {territorios.items.map((t) => (
                    <li key={t.id} className="territory-item">
                      <div className="territory-info">
                        <span className="territory-name">
                          {t.nombre}{' '}
                          <span className="node-subtitle">· {t.subtitulo || t.provincia}</span>
                        </span>
                        <span className="territory-meta tabular-nums">
                          Provincia: <strong>{t.provincia}</strong> · Foco:{' '}
                          <strong>{t.foco || 'General'}</strong> · Estado:{' '}
                          <strong className={t.activo ? 'r5-status-aprobado' : 'r5-status-pendiente'}>
                            {t.activo ? 'Activo' : 'Inactivo / En vinculación'}
                          </strong>{' '}
                          · ID: <code>{t.id}</code>
                        </span>
                      </div>
                      <div className="territory-actions">
                        <button
                          type="button"
                          className="btn-toggle"
                          onClick={() => {
                            setSelectedNodeKey(t.key);
                            setInspectedNodeKey(t.key);
                          }}
                        >
                          Explorar nodo
                        </button>
                        <button
                          type="button"
                          className="btn-toggle"
                          onClick={() => handleFocusOnGoogleMap(t.id)}
                        >
                          Ver en mapa
                        </button>
                        <button
                          type="button"
                          className="btn-toggle"
                          onClick={() => void handleToggleActivo(t)}
                        >
                          {t.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form className="territory-form" onSubmit={(e) => void handleCrearTerritorio(e)}>
                <input
                  type="text"
                  placeholder="Nombre del nodo (ej. Jáchal)"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Provincia (ej. San Juan)"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Foco vocacional (ej. Agua y agricultura familiar)"
                  value={focoNuevo}
                  onChange={(e) => setFocoNuevo(e.target.value)}
                />
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Incorporando…' : '+ Federar nuevo nodo'}
                </button>
              </form>
            </>
          )}
          </section>
        )}

        {/* 8. Cartografía Real en Google Maps Platform y Exportación a Google Docs / Google Drive */}
        {(activeDesignLens === 'all' ||
          activeDesignLens === 'lens_atlas_coco_baba' ||
          activeDesignLens === 'lens_sovereignty_fcm') && (
          <div id="cartografia-workspace">
            <TerritoriosMap
              territorios={territoriosItems}
              focusedTerritorioId={focusedTerritorioId}
              spatialGeometries={spatialGeometries}
              focusedGeometry={focusedGeometry}
            />

            <WorkspacePanel
              territorios={territoriosItems}
              features={features}
              reports={reports}
              spatialGeometries={spatialGeometries}
              syncPacks={syncPacks}
              temporalSnapshots={temporalSnapshots}
              multiScaleSyntheses={multiScaleSyntheses}
              lineageChain={lineageChain}
              evidencias={evidencias}
              onExportVerified={handleWorkspaceExportVerified}
            />
          </div>
        )}

        {/* 9. Artefactos A1–A4 (épica #268): sesión + paneles por rol — montaje único vía ArtefactosRoot (ART-R5 #274, regla M0) */}
        <ArtefactosRoot />
        <footer>
          <p>
            DELocalSoy.AR · Horizontes 1, 2, 3 y 4 Consolidados · Monorepo Track A v7.2 (Vite + React + Express + PostGIS ST_Intersects + Ed25519 + Offline-First + HITUB)
          </p>
        </footer>

        <FederatedNodeDetailModal
          territorio={
            inspectedNodeKey
              ? (territoriosItems.find((t) => t.key === inspectedNodeKey) ?? null)
              : null
          }
          onClose={() => setInspectedNodeKey(null)}
          layers={inspectedNodeKey ? (layersByNode[inspectedNodeKey] ?? []) : []}
          categories={
            inspectedNodeKey ? (categoriesByNode[inspectedNodeKey] ?? []) : []
          }
          features={features}
          reports={reports}
          spatialGeometries={spatialGeometries}
          sovereigntyRecord={
            inspectedNodeKey
              ? (federalSovereignty.find((s) => s.nodeKey === inspectedNodeKey) ??
                  null)
              : null
          }
          onAdvanceReport={handleAdvanceReport}
          onToggleNodeSovereignty={handleToggleNodeSovereignty}
          onNavigateToExplorer={(nodeKey) => {
            setSelectedNodeKey(nodeKey);
            const el = document.getElementById('nodos-federados');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onFocusOnGoogleMap={handleFocusOnGoogleMap}
          onVisualValidateAsset={handleVisualValidateAsset}
          onExportVerified={handleWorkspaceExportVerified}
        />
      </main>
    </>
  );
}

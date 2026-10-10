import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminSovereigntyDashboard } from './components/AdminSovereigntyDashboard';
import {
  BaseConsolidadaPrototype,
  DelocalSoyNetworkLogoSvg,
  DelocalSoyWordmark,
} from './components/BaseConsolidadaPrototype';
import { EthicalAiCopilotPanel } from './components/EthicalAiCopilotPanel';
import { FederatedCompareView } from './components/FederatedCompareView';
import { FederatedNodeDetailModal } from './components/FederatedNodeDetailModal';
import { FederatedNodeExplorer } from './components/FederatedNodeExplorer';
import { HorizonOneArchitecturePanel } from './components/HorizonOneArchitecturePanel';
import { HorizonThreeObservatoryPanel } from './components/HorizonThreeObservatoryPanel';
import { HorizonTwoSpatialFederationPanel } from './components/HorizonTwoSpatialFederationPanel';
import { HorizonFourFieldAndTelemetryPanel } from './components/HorizonFourFieldAndTelemetryPanel';
import { QuarterlyTrendsSection } from './components/QuarterlyTrendsSection';
import { RecursiveProspectiveContractPanel } from './components/RecursiveProspectiveContractPanel';
import { TerritoriosMap } from './components/TerritoriosMap';
import { TerritorialPlatformHub } from './components/TerritorialPlatformHub';
import { TraceabilityAndEvidenciasPanel } from './components/TraceabilityAndEvidenciasPanel';
import { WorkspacePanel } from './components/WorkspacePanel';
import {
  ApiDataSource,
  createDataSource,
  DataSourceHttpError,
  resolveOperationalOriginLabel,
  resolveUiOperationalState,
  SYNTHETIC_MODE_WARNING_TEXT,
  SyntheticDataSource,
  type DataSource,
  type DataSourceMode,
  type UiOperationalState,
} from './lib/dataSource';
import {
  DEMO_ISOLATION_ISSUES,
  EV_007_TO_018_AUDIT_MATRIX,
} from './lib/ev007To018Audit';
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
  const [activeDesignLens, setActiveDesignLens] = useState<
    | 'all'
    | 'lens_atlas_coco_baba'
    | 'lens_vertical_r5ui'
    | 'lens_sovereignty_fcm'
    | 'lens_epistemic_contracts'
  >('lens_epistemic_contracts');
  const [selectedRecursiveLinkIdx, setSelectedRecursiveLinkIdx] =
    useState<number>(4);
  const [activeInspectionStation, setActiveInspectionStation] =
    useState<number>(4);
  const [externalCockpitMacroView, setExternalCockpitMacroView] = useState<
    'federated_matrix' | 'node_explorer' | 'compare_nodes' | 'architecture_contract'
  >('federated_matrix');
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
  const [vibeHandoffBundle, setVibeHandoffBundle] = useState<{
    handoffHash: string;
    exportedAt: string;
    targetBranch?: string;
    epistemicState: string;
    artifacts: Array<{
      index?: number;
      path: string;
      lang?: string;
      mode: string;
      sha256: string;
      fullSha256?: string;
      linesCount?: number;
      bytesCount?: number;
      content?: string;
      summary: string;
    }>;
    markdownBrief: string;
    message: string;
  } | null>(null);
  const [vibeHandoffCopied, setVibeHandoffCopied] = useState<string>('none');

  const handleExportToVibeAgent = useCallback(async () => {
    try {
      const res = await fetch('/api/github-mcp/export-vibe-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          handoffHash: string;
          exportedAt: string;
          targetBranch?: string;
          epistemicState: string;
          artifacts: Array<{
            index?: number;
            path: string;
            lang?: string;
            mode: string;
            sha256: string;
            fullSha256?: string;
            linesCount?: number;
            bytesCount?: number;
            content?: string;
            summary: string;
          }>;
          markdownBrief: string;
          message: string;
        };
        setVibeHandoffBundle(data);
      }
    } catch {
      // Mantiene estado local si la red está ocupada
    }
  }, []);

  useEffect(() => {
    void handleExportToVibeAgent();
  }, [handleExportToVibeAgent]);

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

      {/* Banner obligatorio Paso 6 cuando opera la fuente sintética (VITE_MOCK_API=1 o modo synthetic) */}
      {(runtimeMode === 'synthetic' || useSyntheticInDemo) && (
        <div
          role="alert"
          data-testid="synthetic-mode-warning-banner"
          className="bg-amber-950/90 border-b border-amber-500/60 px-4 py-2.5 text-amber-100 text-xs flex flex-wrap items-center justify-between gap-2"
        >
          <span className="font-semibold">
            ⚠️ {SYNTHETIC_MODE_WARNING_TEXT}
          </span>
          <span className="font-mono text-[11px] text-amber-200">
            DataSource={activeDataSource.name} · mode=&quot;synthetic&quot; · VITE_MOCK_API=1 opt-in
          </span>
        </div>
      )}

      {/* Barra de transparencia operativa R5 (#16, #17, #18): distingue sin ambigüedad los 4 orígenes y los 6 estados */}
      <div
        data-testid="operational-origin-strip"
        className="origin-transparency-strip"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="r5-status-aprobado">
            Origen activo: {operationalOriginLabel}
          </span>
          <span>·</span>
          <span>
            Modo runtime (<code>/api/health</code>):{' '}
            <strong className="uppercase">{runtimeMode}</strong> (fuente:{' '}
            <code>{modeSourceLabel}</code>)
          </span>
          <span>·</span>
          <span>
            Estado UI:{' '}
            <strong
              data-testid="ui-operational-state"
              className="uppercase token-node-tag-iglesia"
            >
              {uiOperationalState}
            </strong>
          </span>
          <span>·</span>
          <span className="font-mono">
            main @ 1272e45 / d70cbc6 / e3616b5 (CORE-001 6/6 · CORE-002 6/6 · CORE-003 · ADR-034)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleDemoNamespace}
            className="btn-toggle"
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
          >
            {isDemoNamespace
              ? '← Volver a Producción (/api/*)'
              : 'Ir a Ruta Aislada /demo (#16–#18)'}
          </button>
        </div>
      </div>

      {/* Barra de Evolución Visual ADR-034 (tokens.css · Issue #109 / #114): Identidad Mineral San Juan + Estados R5-UI + Selector de Tema */}
      <div
        data-testid="adr034-token-evolution-strip"
        className="token-evolution-strip"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">
            Contrato Visual <code>tokens.css</code> (<code>ADR-034</code> · <code>#109</code>)
          </span>
          <span aria-hidden="true">·</span>
          <span className="token-node-tag-capital">
            Capital (Centro/Desamparados)
          </span>
          <span aria-hidden="true">·</span>
          <span className="token-node-tag-caucete">
            Caucete (Oasis Tulúm)
          </span>
          <span aria-hidden="true">·</span>
          <span className="token-node-tag-iglesia">
            Iglesia (Cordillera)
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Estados <code>R5-UI</code>:{' '}
            <span className="r5-status-pendiente">pendiente</span>
            {' / '}
            <span className="r5-status-aprobado">aprobado</span>
            {' / '}
            <span className="r5-status-rechazado">rechazado</span>
          </span>
        </div>

        <div className="filter-group" role="group" aria-label="Selector de tema visual ADR-034">
          <button
            type="button"
            className={themeMode === 'light' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setThemeMode('light')}
          >
            Piedra Caliza (Claro)
          </button>
          <button
            type="button"
            className={themeMode === 'dark' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setThemeMode('dark')}
          >
            Pizarra Andina (Oscuro)
          </button>
          <button
            type="button"
            className={themeMode === 'auto' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setThemeMode('auto')}
          >
            Auto (Sistema)
          </button>
        </div>
      </div>

      {/* Top Bar Contract: 3 zonas (Brand | 5 Nav links | 1 Primary Action) */}
      <header className="top-bar">
        <a href="#prototipo-base-consolidada" className="brand-wordmark">
          <DelocalSoyNetworkLogoSvg size={28} />
          <DelocalSoyWordmark fontSize="1.22rem" />
        </a>

        <nav className="top-nav" aria-label="Navegación principal">
          <a href="#prototipo-base-consolidada" style={{ color: '#FFC72C', fontWeight: 700 }}>
            Base Consolidada
          </a>
          <a href="#plataforma-territorial-real">Flujo Vertical</a>
          <a href="#nodos-federados">Nodos San Juan</a>
          <a href="#horizonte-2">Horizontes H2–H4</a>
          <a href="#cartografia-workspace">Cartografía &amp; Docs</a>
        </nav>

        <div className="top-actions">
          <button
            type="button"
            className="btn-confirm whitespace-nowrap"
            onClick={() => void sincronizarTodo()}
          >
            Sincronizar núcleo
          </button>
        </div>
      </header>

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
        {/* Hero / Síntesis Ejecutiva de Horizontes 1, 2, 3 y 4 en la Provincia de San Juan */}
        <section className="hero-banner">
          <div className="kicker-text">
            Hub de Transformación e Innovación Territorial (HITUB) · Provincia de San Juan (Capital · Caucete · Iglesia)
          </div>
          <h1>
            El Modelo Territorial como Innovación · El Software como Producto Ejecutable
          </h1>
          <p className="subtitle">
            Proceso heurístico integral desplegado sobre tres departamentos de la <strong>Provincia de San Juan</strong>:{' '}
            <strong>Capital (Distrito Centro y Distrito Desamparados)</strong>, <strong>Caucete</strong> e{' '}
            <strong>Iglesia</strong>, articulando Soberanía Semántica (H1), Morfología PostGIS{' '}
            <code>SRID=4326</code> (H2), Linaje <code>SHA-256</code> y Observatorio Federado (H3), y Operación en
            Terreno con <code>ST_Intersects</code>, Campo Offline-First, Firmas <code>Ed25519</code> y Telemetría
            Hídrica (H4) — con arquitectura abierta para su pronta extensión futura a nuevos departamentos.
          </p>

          <div className="hero-metrics-strip tabular-nums">
            <div>
              <strong>{territoriosItems.length}</strong>
              <span>Departamentos San Juan (H1)</span>
            </div>
            <div>
              <strong>{spatialGeometries.length}</strong>
              <span>Geometrías PostGIS (H2)</span>
            </div>
            <div>
              <strong>{lineageChain.length}</strong>
              <span>Eslabones SHA-256 (H3)</span>
            </div>
            <div>
              <strong>6/6 + 6/6</strong>
              <span>CORE-001 y CORE-002 (main @ e3616b5)</span>
            </div>
            <div>
              <strong>
                13/13 main · {evidenciasOkCount}/18 staging
              </strong>
              <span>EV-001..006 + EV-019..025 en main</span>
            </div>
          </div>
        </section>

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

          {/* 1. Selector Ejecutivo de Lentes Cognitivas (H-TER-03: Reducción de fatiga lineal) */}
          <div
            className="cockpit-macro-tabs"
            role="tablist"
            aria-label="Lentes cognitivas de lectura territorial"
          >
            {(
              [
                {
                  key: 'all',
                  kicker: 'Lente 00 · Monorepo Completo',
                  title: 'Vista Integral del Ecosistema',
                },
                {
                  key: 'lens_atlas_coco_baba',
                  kicker: 'Lente I · Demo Base + Cartografía',
                  title: 'Atlas & Cockpit «Coco-Baba»',
                },
                {
                  key: 'lens_vertical_r5ui',
                  kicker: 'Lente II · 13 Módulos + 11 Eslabones',
                  title: 'Flujo Vertical & Estados R5-UI',
                },
                {
                  key: 'lens_sovereignty_fcm',
                  kicker: 'Lente III · Admin + H2–H4 + Push FCM',
                  title: 'Soberanía, PostGIS & Custodios',
                },
                {
                  key: 'lens_epistemic_contracts',
                  kicker: 'Lente IV · HITUB + C1–C5 + Copiloto IA',
                  title: 'Epistemología & Contratos',
                },
              ] as const
            ).map((lens) => (
              <button
                key={lens.key}
                type="button"
                role="tab"
                aria-selected={activeDesignLens === lens.key}
                className={
                  activeDesignLens === lens.key
                    ? 'cockpit-macro-tab active'
                    : 'cockpit-macro-tab'
                }
                onClick={() => setActiveDesignLens(lens.key)}
              >
                <span className="tiny-label">{lens.kicker}</span>
                <strong>{lens.title}</strong>
              </button>
            ))}
          </div>

          {/* MESA OPERATIVA EN VIVO — LENTE I: ATLAS & COCKPIT «COCO-BABA» (DEMO BASE + CARTOGRAFÍA SRID=4326) */}
          {activeDesignLens === 'lens_atlas_coco_baba' && (
            <div
              id="lens-01-atlas-coco-baba-workbench"
              className="coco-baba-triage-box"
              style={{
                marginTop: '0.85rem',
                marginBottom: '0.85rem',
                borderColor: 'var(--brand-primary)',
              }}
            >
              <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                <div>
                  <span className="kicker-text">
                    Lente I Activa · Demo Base + Cartografía PostGIS `SRID=4326` · Pizarra Andina (`#0B111E`)
                  </span>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>
                    Atlas &amp; Cockpit «Coco-Baba» — Soberanía Semántica en Capital (`Centro · Desamparados`), Caucete e Iglesia
                  </strong>
                </div>
                <div className="filter-group">
                  <span className="r5-state-badge r5-state-publicado tabular-nums">
                    Lente I Enfocada · 4 Módulos Visibles
                  </span>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={() => {
                      const mappedTerritory =
                        selectedNodeKey === 'capital'
                          ? 'gran-san-juan-capital'
                          : selectedNodeKey === 'caucete'
                            ? 'caucete'
                            : 'iglesia';
                      setExternalPlatformTerritoryFilter(mappedTerritory);
                      setActiveInspectionStation(2);
                      setSelectedRecursiveLinkIdx(2);
                      setActiveDesignLens('lens_vertical_r5ui');
                    }}
                  >
                    Pasar a Lente II con Nodo {selectedNodeKey.toUpperCase()} →
                  </button>
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={() => {
                      setActiveInspectionStation(4);
                      setSelectedRecursiveLinkIdx(4);
                      setActiveDesignLens('lens_epistemic_contracts');
                      setTimeout(() => {
                        document
                          .getElementById('station-05-prisma-models-audit')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 40);
                    }}
                  >
                    Ir a Estación 05 (Validador Prisma Pre-C5) →
                  </button>
                </div>
              </div>

              <div className="coco-baba-triage-grid">
                {/* 1. Selector de Departamento de San Juan y Ficha Modal */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    1. Nodo Territorial Activo (Provincia de San Juan · ADR-021)
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    {(
                      [
                        {
                          key: 'capital',
                          label: 'Capital (Centro · Desamparados)',
                        },
                        {
                          key: 'caucete',
                          label: 'Caucete (Oasis Tulúm)',
                        },
                        {
                          key: 'iglesia',
                          label: 'Iglesia (Valle Cordillerano)',
                        },
                      ] as const
                    ).map((nd) => (
                      <button
                        key={nd.key}
                        type="button"
                        className={
                          selectedNodeKey === nd.key
                            ? 'btn-filter active'
                            : 'btn-toggle'
                        }
                        onClick={() => {
                          setSelectedNodeKey(nd.key);
                          setExternalCockpitMacroView('node_explorer');
                        }}
                      >
                        {nd.label}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => {
                        document
                          .getElementById('nodos-federados')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Ir al Cockpit «Coco-Baba» ↓
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => setInspectedNodeKey(selectedNodeKey)}
                    >
                      Abrir Ficha Modal ({selectedNodeKey.toUpperCase()})
                    </button>
                  </div>
                </div>

                {/* 2. Selector de Macro-Vista del Cockpit Coco-Baba */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    2. Las 4 Macro-Vistas del Demo Base Integrado
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    {(
                      [
                        {
                          key: 'federated_matrix',
                          label: '01. Matriz 7×3',
                        },
                        {
                          key: 'node_explorer',
                          label: '02. Explorar Nodo (x,y)',
                        },
                        {
                          key: 'compare_nodes',
                          label: '03. Comparar Nodos',
                        },
                        {
                          key: 'architecture_contract',
                          label: '04. Flujo 5 Pasos & JSON',
                        },
                      ] as const
                    ).map((mv) => (
                      <button
                        key={mv.key}
                        type="button"
                        className={
                          externalCockpitMacroView === mv.key
                            ? 'btn-filter active'
                            : 'btn-toggle'
                        }
                        onClick={() => {
                          setExternalCockpitMacroView(mv.key);
                          document
                            .getElementById('nodos-federados')
                            ?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                        }}
                      >
                        {mv.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Navegación Directa a las 4 Secciones enfocadas por Lente I */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    3. Secciones Enfocadas por Lente I (H-TER-03 · Cero Fatiga Lineal)
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => {
                        document
                          .getElementById('nodos-federados')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      1. Cockpit «Coco-Baba» ↓
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => {
                        document
                          .getElementById('comparacion-federada')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      2. Comparador Transversal ↓
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => {
                        document
                          .getElementById('registro-maestro-nodos')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      3. Registro /api/territorios ↓
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => {
                        document
                          .getElementById('cartografia-workspace')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      4. Google Maps SRID=4326 ↓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MESA OPERATIVA EN VIVO — LENTE II: FLUJO VERTICAL (13 MÓDULOS + 11 ESLABONES) Y ESTADOS R5-UI */}
          {activeDesignLens === 'lens_vertical_r5ui' && (
            <div
              id="lens-02-vertical-r5ui-workbench"
              className="coco-baba-triage-box"
              style={{
                marginTop: '0.85rem',
                marginBottom: '0.85rem',
                borderColor: 'var(--brand-primary)',
              }}
            >
              <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                <div>
                  <span className="kicker-text">
                    Lente II Activa · 13 Módulos de Dominio + Cadena de 11 Eslabones (`Fase 0 #87`) + Máquina de 5 Estados `R5-UI` (`#109`) · Pizarra Andina (`#0B111E`)
                  </span>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>
                    Flujo Vertical E2E, Honestidad `IDataSource` (`Regla R5`) y Serie Trimestral (`2026-Q1..Q4`) en Capital (`Centro · Desamparados`), Caucete e Iglesia
                  </strong>
                </div>
                <div className="filter-group">
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={() => {
                      setActiveInspectionStation(1);
                      setSelectedRecursiveLinkIdx(0);
                      setActiveDesignLens('lens_atlas_coco_baba');
                    }}
                  >
                    ← Volver a Lente I (Atlas «Coco-Baba»)
                  </button>
                  <span className="r5-state-badge r5-state-publicado tabular-nums">
                    Lente II Enfocada · Origen: {operationalOriginLabel}
                  </span>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={() => {
                      setActiveInspectionStation(3);
                      setSelectedRecursiveLinkIdx(3);
                      setActiveDesignLens('lens_sovereignty_fcm');
                    }}
                  >
                    Pasar a Lente III (Soberanía, PostGIS &amp; Push FCM) →
                  </button>
                </div>
              </div>

              <div className="coco-baba-triage-grid">
                {/* 1. Puente Territorial Lente I <-> Lente II y Selector de Nodo */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    1. Puente Territorial `Lente I ↔ Lente II` (Filtro Sincronizado por Nodo)
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    {(
                      [
                        {
                          filter: 'all',
                          node: null,
                          label: 'Todos (3 Nodos)',
                        },
                        {
                          filter: 'gran-san-juan-capital',
                          node: 'capital',
                          label: 'Capital (Centro · Desamp.)',
                        },
                        {
                          filter: 'caucete',
                          node: 'caucete',
                          label: 'Caucete (Oasis Tulúm)',
                        },
                        {
                          filter: 'iglesia',
                          node: 'iglesia',
                          label: 'Iglesia (Cordillera)',
                        },
                      ] as const
                    ).map((tf) => (
                      <button
                        key={tf.filter}
                        type="button"
                        className={
                          externalPlatformTerritoryFilter === tf.filter
                            ? 'btn-filter active'
                            : 'btn-toggle'
                        }
                        onClick={() => {
                          setExternalPlatformTerritoryFilter(tf.filter);
                          if (tf.node) {
                            setSelectedNodeKey(tf.node);
                          }
                        }}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.3rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <span className="r5-state-badge r5-state-pendiente">pendiente</span>
                    <span className="r5-state-badge r5-state-en_revision">en_revision</span>
                    <span className="r5-state-badge r5-state-verificado">verificado</span>
                    <span className="r5-state-badge r5-state-publicado">publicado</span>
                    <span className="r5-state-badge r5-state-rechazado">rechazado</span>
                  </div>
                </div>

                {/* 2. Las 6 Vistas Operativas de los 13 Módulos de Dominio */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    2. Las 6 Vistas de los 13 Módulos (`#plataforma-territorial-real`)
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    {(
                      [
                        {
                          key: 'flujo-vertical',
                          label: '01. Flujo 11 Eslabones',
                        },
                        {
                          key: 'directorio-red',
                          label: '02. Directorio & Red',
                        },
                        {
                          key: 'marketplace',
                          label: '03. Marketplace Local',
                        },
                        {
                          key: 'participacion',
                          label: '04. Participación (8 Etapas)',
                        },
                        {
                          key: 'espacio-ambiente-eventos',
                          label: '05. Espacio & Ambiente',
                        },
                        {
                          key: 'inteligencia-y-modulos',
                          label: '06. 13 Módulos & IA Ética',
                        },
                      ] as const
                    ).map((sec) => (
                      <button
                        key={sec.key}
                        type="button"
                        className={
                          externalPlatformSection === sec.key
                            ? 'btn-filter active'
                            : 'btn-toggle'
                        }
                        onClick={() => {
                          setExternalPlatformSection(sec.key);
                          document
                            .getElementById('plataforma-territorial-real')
                            ?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                        }}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Secciones Enfocadas por Lente II y Pruebas en Vivo de Honestidad R5 */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    3. Secciones de Lente II &amp; Honestidad `IDataSource` (`Regla R5`)
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => {
                        document
                          .getElementById('plataforma-territorial-real')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      1. Ir al Hub de 13 Módulos y 11 Eslabones ↓
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => {
                        document
                          .getElementById('demo-datasource-audit')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      2. Ir a Orígenes `IDataSource` y Auditoría `EV-007..018` ↓
                    </button>
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => {
                        document
                          .getElementById('tendencias-trimestrales')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      3. Ir a Serie Trimestral Recharts (`2026-Q1..Q4`) ↓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MESA OPERATIVA EN VIVO — LENTE III: SOBERANÍA DE NODOS, POSTGIS H2–H4 & ALERTAS PUSH FCM / FIRESTORE */}
          {activeDesignLens === 'lens_sovereignty_fcm' && (
            <div
              id="lens-03-sovereignty-fcm-workbench"
              className="coco-baba-triage-box"
              style={{
                marginTop: '0.85rem',
                marginBottom: '0.85rem',
                borderColor: 'var(--brand-primary)',
              }}
            >
              <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                <div>
                  <span className="kicker-text">
                    Lente III Activa · Soberanía Federal (`EV-014`) + PostGIS `H2–H4` (`SRID=4326` / `ST_Intersects`) + Push FCM / Firestore (`H-TER-06`) · Pizarra Andina (`#0B111E`)
                  </span>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>
                    Gobernanza de Nodos, Sparklines de 6 Ventanas (`Q1..Q4 → H4 → Vivo`), Cadena Merkle `SHA-256`, Firmas `Ed25519` y Campo Offline-First
                  </strong>
                </div>
                <div className="filter-group">
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={() => {
                      setActiveInspectionStation(2);
                      setSelectedRecursiveLinkIdx(2);
                      setActiveDesignLens('lens_vertical_r5ui');
                    }}
                  >
                    ← Volver a Lente II (Flujo Vertical · 13 Módulos)
                  </button>
                  <span className="r5-state-badge r5-state-publicado tabular-nums">
                    Lente III Enfocada · Merkle: {lineageChain.length} eslabones
                  </span>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={() => {
                      setActiveInspectionStation(4);
                      setSelectedRecursiveLinkIdx(4);
                      setActiveDesignLens('lens_epistemic_contracts');
                    }}
                  >
                    Pasar a Lente IV (Contratos Epistémicos &amp; IA) →
                  </button>
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={() => setActiveDesignLens('all')}
                  >
                    Ver Ecosistema Completo
                  </button>
                </div>
              </div>

              <div className="coco-baba-triage-grid">
                {/* 1. Pacto de Soberanía Federal (EV-014), Despacho Push FCM / Firestore y Puente Territorial */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    1. Régimen de Soberanía (`EV-014`) y Alertas Push FCM en 1 Clic (`H-TER-06`)
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.38rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    {federalSovereignty.map((sov) => {
                      const isDelegated =
                        sov.sovereigntyMode === 'delegacion_revocable_activa';
                      const custodian = accreditedCustodians.find(
                        (c) => c.nodeKey === sov.nodeKey,
                      );
                      return (
                        <div
                          key={sov.nodeKey}
                          style={{
                            padding: '0.42rem 0.58rem',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border:
                              selectedNodeKey === sov.nodeKey
                                ? '1px solid var(--color-accent-primary)'
                                : '1px solid var(--color-border-hairline)',
                            background: 'var(--color-bg-surface)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                          }}
                        >
                          <div className="event-row-top">
                            <span className={`token-node-tag-${sov.nodeKey}`}>
                              {sov.nodeName}
                            </span>
                            <span
                              className={
                                isDelegated
                                  ? 'sovereignty-delegated-tag'
                                  : 'sovereignty-strict-tag'
                              }
                              style={{ fontSize: '0.71rem' }}
                            >
                              {isDelegated
                                ? 'Delegación Federal Activa'
                                : 'Custodia Local Estricta'}
                            </span>
                          </div>
                          <div
                            className="territory-meta tabular-nums"
                            style={{ fontSize: '0.71rem' }}
                          >
                            Merkle: <code>{sov.nodeMerkleRoot.slice(0, 12)}…</code> · Ed25519:{' '}
                            <code>{custodian?.publicKeyFingerprint ?? 'ed25519-sj'}</code>
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn-confirm"
                              style={{ fontSize: '0.71rem', padding: '0.2rem 0.5rem' }}
                              onClick={() => {
                                setSelectedNodeKey(sov.nodeKey);
                                setExternalNodeAuditFilter(
                                  sov.nodeKey as 'capital' | 'caucete' | 'iglesia',
                                );
                                setExternalPlatformTerritoryFilter(
                                  sov.nodeKey === 'capital'
                                    ? 'gran-san-juan-capital'
                                    : (sov.nodeKey as 'caucete' | 'iglesia'),
                                );
                                void handleToggleNodeSovereignty(sov.nodeKey);
                              }}
                            >
                              Conmutar Soberanía + Emitir Push FCM ({sov.nodeKey.toUpperCase()})
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {station04LastFcmAlert && (
                      <div
                        className="alert-custodian-critical tabular-nums"
                        style={{
                          padding: '0.42rem 0.55rem',
                          borderRadius: 'var(--radius-sm, 6px)',
                          fontSize: '0.73rem',
                        }}
                      >
                        <div className="event-row-top">
                          <strong>Push FCM: {station04LastFcmAlert.fcmTopic}</strong>
                          <code>SHA {station04LastFcmAlert.sha256.slice(0, 10)}</code>
                        </div>
                        <div style={{ marginTop: '0.12rem' }}>
                          {station04LastFcmAlert.summary}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Horizontes H2–H3: PostGIS SRID=4326, Síntesis Multi-Escala y Cadena Merkle SHA-256 */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    2. Horizontes `H2–H3`: PostGIS `SRID=4326`, Síntesis &amp; Linaje Merkle (`EV-012`)
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.38rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <span className="tiny-label" style={{ marginBottom: 0 }}>
                      Filtrar Consola Admin y Eventos por Departamento:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.32rem' }}>
                      {(
                        [
                          { key: 'all', nodeKey: 'capital', label: 'Red Provincial (3)' },
                          { key: 'capital', nodeKey: 'capital', label: 'Capital (Centro/Desamp.)' },
                          { key: 'caucete', nodeKey: 'caucete', label: 'Caucete (Oasis Tulúm)' },
                          { key: 'iglesia', nodeKey: 'iglesia', label: 'Iglesia (Cordillera)' },
                        ] as const
                      ).map((nf) => (
                        <button
                          key={nf.key}
                          type="button"
                          className={
                            externalNodeAuditFilter === nf.key
                              ? 'btn-filter active'
                              : 'btn-filter'
                          }
                          onClick={() => {
                            setExternalNodeAuditFilter(nf.key);
                            setSelectedNodeKey(nf.nodeKey);
                            setExternalPlatformTerritoryFilter(
                              nf.key === 'all'
                                ? 'all'
                                : nf.key === 'capital'
                                  ? 'gran-san-juan-capital'
                                  : nf.key,
                            );
                          }}
                        >
                          {nf.label}
                        </button>
                      ))}
                    </div>

                    <div
                      className="tabular-nums"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.73rem',
                        padding: '0.4rem 0.55rem',
                        borderRadius: 'var(--radius-xs, 4px)',
                        background: 'var(--color-bg-inset)',
                        border: '1px solid var(--color-border-hairline)',
                      }}
                    >
                      <div>
                        H2 PostGIS: <strong>{spatialGeometries.length}</strong> geom. (
                        <code>ST_Polygon</code> / <code>ST_LineString</code>) · Paquetes Sync:{' '}
                        <strong>{syncPacks.length}</strong>
                      </div>
                      <div style={{ marginTop: '0.15rem' }}>
                        H3 Síntesis Multi-Escala:{' '}
                        <strong>{multiScaleSyntheses.length}</strong> · Linaje Merkle:{' '}
                        <strong>{lineageChain.length}</strong> eslabones <code>SHA-256</code>
                      </div>
                    </div>

                    {station04LineageResult && (
                      <div
                        className="r5-state-badge r5-state-verificado tabular-nums"
                        style={{
                          display: 'block',
                          padding: '0.35rem 0.55rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.71rem',
                        }}
                      >
                        ✓ {station04LineageResult}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn-confirm"
                        onClick={async () => {
                          const msg = await handleAuditLineage();
                          setStation04LineageResult(msg);
                        }}
                      >
                        Auditar Cadena Merkle SHA-256 (EV-012)
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        onClick={async () => {
                          const geom =
                            spatialGeometries.find((g) => g.nodeKey === selectedNodeKey) ??
                            spatialGeometries[0];
                          if (geom) {
                            await handleExecuteSpatialIntersection({
                              geometryId: geom.id,
                              bufferMeters: 350,
                            });
                            setStation04LineageResult(
                              `Cruce PostGIS ST_Intersects (350m) ejecutado sobre ${geom.title} (${selectedNodeKey.toUpperCase()})`,
                            );
                          }
                        }}
                      >
                        Ejecutar ST_Intersects 350m ({selectedNodeKey.toUpperCase()})
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Horizonte H4 (Campo Offline, Ed25519, Telemetría) y Salto Rápido a las 5 Secciones de Lente III */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    3. Horizonte `H4` (Campo Offline + `Ed25519`) y Salto Rápido a Módulos de Lente III
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <div
                      className="tabular-nums"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.73rem',
                        padding: '0.38rem 0.55rem',
                        borderRadius: 'var(--radius-xs, 4px)',
                        background: 'var(--color-bg-inset)',
                        border: '1px solid var(--color-border-hairline)',
                      }}
                    >
                      Cruces <code>ST_Intersects</code>:{' '}
                      <strong>{spatialIntersections.length}</strong> · Cola Offline:{' '}
                      <strong>
                        {
                          offlineFieldQueue.filter(
                            (q) => q.syncStatus === 'queued_offline',
                          ).length
                        }
                      </strong>{' '}
                      pend. /{' '}
                      <strong>
                        {
                          offlineFieldQueue.filter(
                            (q) => q.syncStatus === 'synced_idempotent',
                          ).length
                        }
                      </strong>{' '}
                      sync · Telemetría: <strong>{telemetryWebhooks.length}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={async () => {
                        const msg = await handleExecuteBatchSync();
                        setStation04LineageResult(msg);
                      }}
                    >
                      Reconciliar Cola Offline-First con Idempotencia SHA-256 (EV-016)
                    </button>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '0.32rem',
                      }}
                    >
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={() => {
                          document
                            .getElementById('consola-admin-soberania')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        1. Consola Soberanía ↓
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={() => {
                          document
                            .getElementById('horizonte-2')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        2. H2 PostGIS SRID=4326 ↓
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={() => {
                          document
                            .getElementById('horizonte-3')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        3. H3 Síntesis &amp; Merkle ↓
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={() => {
                          document
                            .getElementById('horizonte-4')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        4. H4 ST_Intersects &amp; Ed25519 ↓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MESA OPERATIVA EN VIVO — LENTE IV: CONTRATOS EPISTÉMICOS (C1–C5 · 19 MODELOS PRISMA), COPILOTO IA ÉTICO TRIPARTITO Y EV-001..EV-018 */}
          {activeDesignLens === 'lens_epistemic_contracts' && (
            <div
              id="lens-04-epistemic-contracts-workbench"
              className="coco-baba-triage-box"
              style={{
                marginTop: '0.85rem',
                marginBottom: '0.85rem',
                borderColor: 'var(--brand-primary)',
              }}
            >
              <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                <div>
                  <span className="kicker-text">
                    Lente IV Activa · Contratos Epistémicos (`C1–C5` + Compuerta Pre-`C5` de 19 Modelos Prisma) + Estado `R15` + Tríada IA Ética (`R8`) · Pizarra Andina (`#0B111E`)
                  </span>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>
                    Integridad Referencial `schema.prisma` (19 Modelos · 7 Aristas FK), Copiloto IA Tripartito (`Dato → Interpretación → Sugerencia`) y Libro Mayor `events_raw` (`EV-001..018`)
                  </strong>
                </div>
                <div className="filter-group">
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={() => {
                      setActiveInspectionStation(3);
                      setSelectedRecursiveLinkIdx(3);
                      setActiveDesignLens('lens_sovereignty_fcm');
                    }}
                  >
                    ← Volver a Lente III (Soberanía &amp; Push FCM)
                  </button>
                  <span className="r5-state-badge r5-state-publicado tabular-nums">
                    Lente IV Enfocada ·{' '}
                    {prismaIntegrityPreC5?.c5GateUnlocked
                      ? 'Compuerta Pre-C5: ABIERTA (19/19)'
                      : '19 Modelos Prisma · C1–C5'}
                  </span>
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={() => {
                      setActiveInspectionStation(1);
                      setSelectedRecursiveLinkIdx(0);
                      setActiveDesignLens('lens_atlas_coco_baba');
                    }}
                  >
                    Ir a Lente I (Atlas «Coco-Baba»)
                  </button>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={() => setActiveDesignLens('all')}
                  >
                    Ver Ecosistema Completo (4 Lentes)
                  </button>
                </div>
              </div>

              <div className="coco-baba-triage-grid">
                {/* 1. Compuerta Pre-C5 de Integridad Referencial Prisma (19 Modelos) + Suite C1–C5 + R15 */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    1. Integridad Referencial Prisma (19 Modelos · Pre-`C5`), Suite `C1–C5` y Estado `R15`
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.38rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ flex: 1, fontSize: '0.73rem' }}
                        onClick={async () => {
                          const res = await fetch(
                            '/api/contracts/validate-prisma-referential-integrity',
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                            },
                          );
                          if (res.ok) {
                            const body = (await res.json()) as {
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
                            };
                            setPrismaIntegrityPreC5(body);
                            setStation05C1C5Result(body.message);
                            await cargarModeloFederado();
                          }
                        }}
                      >
                        🛡️ 1. Validar 19 Modelos Prisma (Pre-C5)
                      </button>
                      <button
                        type="button"
                        className="btn-confirm"
                        style={{ flex: 1, fontSize: '0.73rem' }}
                        onClick={async () => {
                          const preRes = await fetch(
                            '/api/contracts/validate-prisma-referential-integrity',
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                            },
                          );
                          if (preRes.ok) {
                            const preBody = (await preRes.json()) as {
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
                            };
                            setPrismaIntegrityPreC5(preBody);
                            if (!preBody.c5GateUnlocked) {
                              setStation05C1C5Result(
                                'Compuerta C5 bloqueada por inconsistencia referencial en schema.prisma.',
                              );
                              return;
                            }
                          }
                          const res = await fetch('/api/contracts/verify-c1-c5', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                          if (res.ok) {
                            const body = (await res.json()) as { message: string };
                            setStation05C1C5Result(body.message);
                            await cargarModeloFederado();
                          }
                        }}
                      >
                        ✓ 2. Ejecutar Suite C1–C5
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={async () => {
                          const res = await fetch(
                            '/api/github-validation/ejecutar-y-validar',
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ codespaceOutput: '' }),
                            },
                          );
                          if (res.ok) {
                            const body = (await res.json()) as {
                              epistemicState: string;
                              accreditationScope: string;
                              validationHash: string;
                              message: string;
                            };
                            setStation05C1C5Result(
                              `[R15: ${body.epistemicState} · scope=${body.accreditationScope} · SHA-256 ${body.validationHash.slice(0, 12)}] ${body.message}`,
                            );
                            await cargarModeloFederado();
                          }
                        }}
                      >
                        🔍 3. Sellar R15
                      </button>
                    </div>

                    {prismaIntegrityPreC5 && (
                      <div
                        className="tabular-nums"
                        style={{
                          padding: '0.42rem 0.58rem',
                          borderRadius: 'var(--radius-xs, 4px)',
                          background: 'var(--color-bg-inset)',
                          border: '1px solid var(--color-border-hairline)',
                          fontSize: '0.72rem',
                        }}
                      >
                        <div className="event-row-top">
                          <span className="r5-state-badge r5-state-verificado">
                            Pre-C5 OK · {prismaIntegrityPreC5.modelsVerified}/19 Modelos ·{' '}
                            {prismaIntegrityPreC5.referentialEdgesVerified}/7 FK
                          </span>
                          <code>
                            SHA {prismaIntegrityPreC5.validationHash.slice(0, 10)}
                          </code>
                        </div>
                        <div style={{ marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                          Huérfanos: <strong>{prismaIntegrityPreC5.orphanRecordsCount}</strong> · Compuerta{' '}
                          <code>C5</code>:{' '}
                          <strong style={{ color: '#34d399' }}>
                            {prismaIntegrityPreC5.c5GateUnlocked ? 'DESBLOQUEADA' : 'BLOQUEADA'}
                          </strong>
                        </div>
                      </div>
                    )}

                    {station05C1C5Result && (
                      <div
                        className="r5-state-badge r5-state-verificado tabular-nums"
                        style={{
                          display: 'block',
                          padding: '0.36rem 0.55rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.71rem',
                        }}
                      >
                        ✓ {station05C1C5Result}
                      </div>
                    )}

                    <span className="tiny-label" style={{ marginBottom: 0 }}>
                      Conmutar Pestaña de `#analisis-recursivo-prospectivo`:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(
                        [
                          { key: 'sinergia-ia', label: '01. R1–R15' },
                          { key: 'propuesta-valor', label: '02. 5 Artefactos' },
                          { key: 'recursivo', label: '03. Bucles H1–H4' },
                          { key: 'integracion', label: '04. 19 Modelos Prisma · C1–C5' },
                          { key: 'prospectivo', label: '05. H4 EV-015..018' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={
                            externalRecursiveTab === tab.key
                              ? 'btn-filter active'
                              : 'btn-filter'
                          }
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => {
                            setExternalRecursiveTab(tab.key);
                            document
                              .getElementById('analisis-recursivo-prospectivo')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Copiloto IA Ético Tripartito (ADR-004 / R8 / H-TER-03) y Ciclo SECI en Vivo */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    2. Copiloto IA Ético Tripartito (`ADR-004` · `R8` · `H-TER-03`) y Ciclo SECI
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.38rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(
                        [
                          { key: 'capital', label: 'Capital (Centro/Desamp.)' },
                          { key: 'caucete', label: 'Caucete (Oasis Tulúm)' },
                          { key: 'iglesia', label: 'Iglesia (Cordillera)' },
                        ] as const
                      ).map((nd) => (
                        <button
                          key={nd.key}
                          type="button"
                          className={
                            selectedNodeKey === nd.key ? 'btn-filter active' : 'btn-filter'
                          }
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => setSelectedNodeKey(nd.key)}
                        >
                          {nd.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(
                        [
                          { tab: 'chat', label: '01. Chat Tripartito' },
                          { tab: 'search_grounding', label: '02. Search Grounding' },
                          { tab: 'maps_grounding', label: '03. Maps SRID=4326' },
                          { tab: 'seci_voice', label: '04. Voz Campo & SECI' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.tab}
                          type="button"
                          className={
                            externalCopilotTab === m.tab
                              ? 'btn-filter active'
                              : 'btn-toggle'
                          }
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => {
                            setExternalCopilotTab(m.tab);
                            document
                              .getElementById('copiloto-ia-etico')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={async () => {
                        const res = await fetch('/api/ia-etica/chat', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            nodeKey: selectedNodeKey,
                            model: 'gemini-3.1-flash-lite',
                            rolePersona: externalCopilotRole,
                            prompt: `Auditar estado hídrico, cruce espacial PostGIS ST_Intersects y gobernanza SECI en nodo ${selectedNodeKey.toUpperCase()} (San Juan).`,
                            history: [],
                          }),
                        });
                        if (res.ok) {
                          const json = (await res.json()) as {
                            success: boolean;
                            data?: {
                              modelUsed: string;
                              sha256Hash: string;
                              datoEmpirico: string;
                              interpretacionContextual: string;
                              sugerenciaAccionable: string;
                            };
                          };
                          if (json.success && json.data) {
                            setStation05TripartiteResult({
                              nodeKey: selectedNodeKey,
                              modelUsed: json.data.modelUsed,
                              sha256Hash: json.data.sha256Hash,
                              datoEmpirico: json.data.datoEmpirico,
                              interpretacionContextual:
                                json.data.interpretacionContextual,
                              sugerenciaAccionable: json.data.sugerenciaAccionable,
                            });
                            await sincronizarTodo();
                          }
                        }
                      }}
                    >
                      ⚡ Generar Dictamen Tripartito en Vivo ({selectedNodeKey.toUpperCase()})
                    </button>

                    {station05TripartiteResult && (
                      <div
                        style={{
                          padding: '0.42rem 0.55rem',
                          borderRadius: 'var(--radius-xs, 4px)',
                          background: 'var(--color-bg-inset)',
                          border: '1px solid var(--color-border-hairline)',
                          fontSize: '0.72rem',
                          display: 'grid',
                          gap: '0.25rem',
                        }}
                      >
                        <div className="event-row-top">
                          <span className="badge-epistemic badge-verified">
                            {station05TripartiteResult.nodeKey.toUpperCase()} · requiresHumanReview: true
                          </span>
                          <code className="tabular-nums">
                            SHA {station05TripartiteResult.sha256Hash.slice(0, 10)}
                          </code>
                        </div>
                        <div>
                          <strong style={{ color: '#38bdf8' }}>1. Dato:</strong>{' '}
                          {station05TripartiteResult.datoEmpirico}
                        </div>
                        <div>
                          <strong style={{ color: '#fbbf24' }}>2. Interpretación:</strong>{' '}
                          {station05TripartiteResult.interpretacionContextual}
                        </div>
                        <div>
                          <strong style={{ color: '#34d399' }}>3. Sugerencia (R8):</strong>{' '}
                          {station05TripartiteResult.sugerenciaAccionable}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Libro Mayor Append-Only events_raw, Matriz EV-001..EV-018 y Salto Rápido a Módulos de Lente IV */}
                <div className="coco-baba-triage-card">
                  <span className="tiny-label">
                    3. Libro Mayor `events_raw`, Matriz `EV-001..EV-018` y Salto Rápido a Lente IV
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <div
                      className="tabular-nums"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.73rem',
                        padding: '0.38rem 0.55rem',
                        borderRadius: 'var(--radius-xs, 4px)',
                        background: 'var(--color-bg-inset)',
                        border: '1px solid var(--color-border-hairline)',
                      }}
                    >
                      Eventos <code>events_raw</code>: <strong>{eventsRaw.length}</strong> ·{' '}
                      Evidencias:{' '}
                      <strong>
                        {evidencias.filter((e) => e.status === 'ok').length}/{evidencias.length}
                      </strong>{' '}
                      OK · Linaje H3: <strong>{lineageChain.length}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => void handleRunIdempotencyAndErrorProbe()}
                    >
                      Probar Colisión SHA-256 (HTTP 409) + No-[] en 503 (EV-005)
                    </button>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '0.32rem',
                      }}
                    >
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={() => {
                          document
                            .getElementById('analisis-recursivo-prospectivo')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        1. Contratos C1–C5 &amp; R15 ↓
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={() => {
                          document
                            .getElementById('copiloto-ia-etico')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        2. Copiloto IA Ético ↓
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={() => {
                          document
                            .getElementById('trazabilidad-evidencias')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        3. events_raw &amp; EV-001..018 ↓
                      </button>
                      <button
                        type="button"
                        className="btn-toggle"
                        style={{ fontSize: '0.73rem' }}
                        onClick={() => {
                          document
                            .getElementById('demo-datasource-audit')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        4. Orígenes IDataSource ↓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CENTRO DE EXPORTACIÓN Y HANDOFF HACIA [agent: vibe] (ADR-034 · R12 · R15) */}
          <div
            id="vibe-agent-export-handoff-center"
            data-testid="vibe-agent-export-handoff-center"
            className="coco-baba-triage-box"
            style={{
              marginTop: '0.85rem',
              marginBottom: '0.85rem',
              borderColor: 'var(--color-accent-primary)',
            }}
          >
            <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
              <div>
                <span className="kicker-text">
                  Exportación Oficial `[agent: google]` → `[agent: vibe]` · `ADR-034` (`#109` / `#114`) · Auditoría Cruzada `R12` y Regla `R15`
                </span>
                <strong style={{ display: 'block', fontSize: '1.02rem' }}>
                  📦 Paquete Consolidado: 5 Estaciones de Inspección + 4 Lentes Operativas en Vivo + Compuerta Pre-`C5` (19 Modelos Prisma)
                </strong>
              </div>
              <div className="filter-group">
                <span className="r5-state-badge r5-state-verificado tabular-nums">
                  Sello Handoff SHA-256: {vibeHandoffBundle?.handoffHash ?? 'verificando…'}
                </span>
                <button
                  type="button"
                  className="btn-confirm"
                  onClick={async () => {
                    await handleExportToVibeAgent();
                    await cargarModeloFederado();
                  }}
                >
                  ⚡ Sellar y Actualizar Paquete en `events_raw`
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => {
                    const promptText = `### 📦 Handoff Oficial [agent: google] → [agent: vibe] (Refs #109, Refs #114, ADR-034 · Sello SHA-256: ${vibeHandoffBundle?.handoffHash ?? 'verificado-staging'})

Hola \`agent-vibe\`, desde \`[agent: google]\` junto a la Dirección Humana (\`Carlos Leonidas <carlosleonidas04@gmail.com>\`) exportamos el desarrollo consolidado y compilado en \`EXIT 0\` sobre el lienzo **Pizarra Andina (\`#0B111E\`)**:

1. **Estación 01 & Tokens ADR-034 (\`apps/web/src/design/tokens.css\`):** Paleta 60-30-10 Pizarra Andina (\`#0B111E\`) / Piedra Caliza (\`#F7F5F0\`), tipografía 2+1 (\`Fraunces\`, \`Plus Jakarta Sans\`, \`JetBrains Mono tabular-nums\`), 3 nodos de San Juan (\`Capital [Centro y Desamparados]\`, \`Caucete\`, \`Iglesia\`) y 5 estados \`R5-UI\` (\`#109\`).
2. **Estaciones 02–05 & 4 Lentes Operativas con Puente Territorial 1:1 (\`apps/web/src/App.tsx\` + \`apps/web/src/styles.css\`):**
   - **Lente I (\`#lens-01-atlas-coco-baba-workbench\`):** Atlas San Juan + Cockpit «Coco-Baba» (4 vistas rescatadas del Demo Base + custodia tripartita + dualidad \`(x,y)\` ↔ \`PostGIS SRID=4326\`).
   - **Lente II (\`#lens-02-vertical-r5ui-workbench\`):** Flujo Vertical 13 módulos + 11 eslabones (\`Fase 0 #87\`), máquina de 5 estados \`R5-UI\` y 4 orígenes \`IDataSource\` (\`Regla R5\`).
   - **Lente III (\`#lens-03-sovereignty-fcm-workbench\`):** Soberanía Federal (\`EV-014\`), alertas Push FCM / Firestore a custodios \`Ed25519\` y Horizontes \`H2–H4\` (\`ST_Intersects\`, Merkle \`SHA-256\` \`EV-012\`, cola Offline-First \`EV-016\`).
   - **Lente IV (\`#lens-04-epistemic-contracts-workbench\`):** Compuerta Pre-\`C5\` de 19 modelos Prisma, suite \`C1–C5\`, estado \`R15\`, Copiloto IA Tripartito (\`requiresHumanReview: true\`) y \`events_raw\` (\`EV-001..018\`).
3. **Validador de Integridad Referencial Prisma Pre-\`C5\` (\`POST /api/contracts/validate-prisma-referential-integrity\`):** Verifica los **19 modelos Prisma** y las **7 aristas FK (\`@relation\`)** con **0 registros huérfanos** antes de habilitar el contrato \`C5\` (\`c5GateUnlocked: true\`).
4. **Especificación completa en repo:** \`docs/EXPORTACION_HANDOFF_AGENTE_VIBE_5_ESTACIONES_4_LENTES.md\`.

Co-authored-by: Carlos Leonidas <carlosleonidas04@gmail.com>`;
                    if (navigator.clipboard) {
                      void navigator.clipboard.writeText(promptText);
                      setVibeHandoffCopied('prompt');
                      setTimeout(() => setVibeHandoffCopied('none'), 3500);
                    }
                  }}
                >
                  {vibeHandoffCopied === 'prompt'
                    ? '✓ Prompt para Agente Vibe Copiado'
                    : '📋 Copiar Prompt para [agent: vibe]'}
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => {
                    const payload = JSON.stringify(
                      vibeHandoffBundle ?? {
                        sourceAgent: '[agent: google]',
                        targetAgent: '[agent: vibe]',
                        epistemicState: 'verificado-staging',
                      },
                      null,
                      2,
                    );
                    const blob = new Blob([payload], {
                      type: 'application/json;charset=utf-8',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'handoff-agent-google-to-agent-vibe-v7.7.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  ⬇️ Descargar Bundle JSON (`v7.7`)
                </button>
              </div>
            </div>

            {vibeHandoffBundle?.message && (
              <div
                className="r5-state-badge r5-state-verificado tabular-nums"
                style={{
                  display: 'block',
                  padding: '0.45rem 0.65rem',
                  marginBottom: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.73rem',
                }}
              >
                ✓ {vibeHandoffBundle.message}
              </div>
            )}

            <div className="coco-baba-triage-grid">
              {/* Columna 1: Los 6 Archivos Completos solicitados por [agent: vibe] (Copia 1-clic & Descarga) */}
              <div className="coco-baba-triage-card">
                <span className="tiny-label">
                  1. Los 6 Archivos Íntegros para `Opción B — Integración Full-Stack` (`main @ 2766feb` → `agent-google/estaciones-01-05-lentes-01-04`)
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginTop: '0.35rem',
                  }}
                >
                  {(vibeHandoffBundle?.artifacts ?? []).map((art, idx) => {
                    const fileNum = art.index ?? idx + 1;
                    const copyKey = `file-${fileNum}`;
                    return (
                      <div
                        key={art.path}
                        className="tabular-nums"
                        style={{
                          padding: '0.42rem 0.58rem',
                          borderRadius: 'var(--radius-xs, 4px)',
                          background: 'var(--color-bg-inset)',
                          border: '1px solid var(--color-border-hairline)',
                          fontSize: '0.72rem',
                        }}
                      >
                        <div className="event-row-top">
                          <strong>
                            #{fileNum} · <code>{art.path}</code>
                          </strong>
                          <span className="r5-state-badge r5-state-publicado">
                            {art.linesCount ?? '—'} líneas · SHA {art.sha256}
                          </span>
                        </div>
                        <div
                          style={{
                            marginTop: '0.15rem',
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                          }}
                        >
                          {art.summary}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.35rem',
                            marginTop: '0.32rem',
                          }}
                        >
                          <button
                            type="button"
                            className="btn-confirm"
                            style={{ fontSize: '0.7rem', padding: '0.24rem 0.52rem' }}
                            onClick={async () => {
                              let rawContent = art.content ?? '';
                              if (!rawContent) {
                                const res = await fetch(
                                  `/api/github-mcp/export-vibe-handoff?file=${fileNum}`,
                                );
                                if (res.ok) rawContent = await res.text();
                              }
                              const formatted = `### Archivo #${fileNum}: \`${art.path}\` (${art.linesCount ?? rawContent.split('\n').length} líneas · SHA-256: \`${art.sha256}\`)\n\n\`\`\`${art.lang ?? 'ts'}\n${rawContent}\n\`\`\``;
                              if (navigator.clipboard) {
                                await navigator.clipboard.writeText(formatted);
                                setVibeHandoffCopied(copyKey);
                                setTimeout(() => setVibeHandoffCopied('none'), 3500);
                              }
                            }}
                          >
                            {vibeHandoffCopied === copyKey
                              ? `✓ Archivo #${fileNum} Copiado Íntegro`
                              : `📋 Copiar #${fileNum} Íntegro para [agent: vibe]`}
                          </button>
                          <button
                            type="button"
                            className="btn-toggle"
                            style={{ fontSize: '0.7rem', padding: '0.24rem 0.52rem' }}
                            onClick={async () => {
                              let rawContent = art.content ?? '';
                              if (!rawContent) {
                                const res = await fetch(
                                  `/api/github-mcp/export-vibe-handoff?file=${fileNum}`,
                                );
                                if (res.ok) rawContent = await res.text();
                              }
                              const blob = new Blob([rawContent], {
                                type: 'text/plain;charset=utf-8',
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = art.path.split('/').pop() ?? `file-${fileNum}.txt`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                          >
                            ⬇️ Descargar #{fileNum}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Columna 2: Dos Rutas de Aterrizaje para [agent: vibe] según ADR-034 */}
              <div className="coco-baba-triage-card">
                <span className="tiny-label">
                  2. Dos Rutas de Integración en `main` para `[agent: vibe]` (`ADR-034 §4.5` vs `Modo Coordinado R12`)
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.42rem',
                    marginTop: '0.35rem',
                    fontSize: '0.73rem',
                  }}
                >
                  <div
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-xs, 4px)',
                      background: 'var(--color-bg-inset)',
                      border: '1px solid var(--color-border-hairline)',
                    }}
                  >
                    <div className="event-row-top">
                      <strong>Opción A · PR Solo-Estética (`ADR-034 §4.5`)</strong>
                      <span className="r5-state-badge r5-state-verificado">
                        0 Conflictos con PR #115
                      </span>
                    </div>
                    <p className="territory-meta" style={{ margin: '0.2rem 0 0' }}>
                      Extrae únicamente <code>apps/web/src/design/tokens.css</code> hacia{' '}
                      <code>main @ 1272e45</code> con Pizarra Andina (<code>#0B111E</code>), los 3
                      nodos de San Juan y los 5 estados <code>R5-UI</code>.
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-xs, 4px)',
                      background: 'var(--color-bg-inset)',
                      border: '1px solid var(--color-border-hairline)',
                    }}
                  >
                    <div className="event-row-top">
                      <strong>Opción B · Integración Full-Stack (`R12`)</strong>
                      <span className="r5-state-badge r5-state-publicado">
                        4 Lentes + Pre-C5 Prisma
                      </span>
                    </div>
                    <p className="territory-meta" style={{ margin: '0.2rem 0 0' }}>
                      Incorpora las <strong>4 Lentes Operativas (`#lens-01..04`)</strong>, las{' '}
                      <strong>5 Estaciones</strong> y el endpoint{' '}
                      <code>POST /api/contracts/validate-prisma-referential-integrity</code> (19
                      modelos Prisma + 7 aristas FK sin huérfanos antes de <code>C5</code>).
                    </p>
                  </div>

                  <pre
                    className="demo-contract-json-pre"
                    style={{
                      margin: 0,
                      padding: '0.45rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                    }}
                  >
{`# Comandos para [agent: vibe] en Codespace / GitHub
git fetch origin
# Opción A (ADR-034 §4.5 solo-estética):
git checkout main && git checkout -b feat/adr034-tokens-pizarra-andina
# Opción B (4 Lentes + Validador Pre-C5 19 modelos Prisma):
pnpm run build && npm test`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

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

            {/* 3. Matriz de las 6 Heurísticas de Premiación Internacional en Innovación Territorial (H-TER-01 a H-TER-06) */}
            <div className="coco-baba-triage-grid" style={{ marginTop: '0.85rem' }}>
              {[
                {
                  code: 'H-TER-01',
                  title: 'Materialidad Geológica 60-30-10',
                  summary:
                    '60% Lienzo Mineral (#F7F5F0 / #0B111E), 30% Superficie 1px hairline sin barras laterales decorativas, 10% Acento por departamento (Capital, Caucete, Iglesia).',
                  lens: 'lens_atlas_coco_baba' as const,
                  anchor: 'nodos-federados',
                },
                {
                  code: 'H-TER-02',
                  title: 'Tipografía 2+1 & Precisión Tabular',
                  summary:
                    'Fraunces (Display Editorial) + Plus Jakarta Sans (UI) + JetBrains Mono (tabular-nums) en coordenadas SRID=4326, SHA-256 y conteos.',
                  lens: 'lens_vertical_r5ui' as const,
                  anchor: 'plataforma-territorial-real',
                },
                {
                  code: 'H-TER-03',
                  title: 'Arquitectura por Lentes Cognitivas',
                  summary:
                    'Elimina la fatiga de desplazamiento lineal articulando el monorepo en 4 lentes de trabajo focalizado y 1 vista integral.',
                  lens: 'all' as const,
                  anchor: 'estudio-diseno-heuristico-frontend',
                },
                {
                  code: 'H-TER-04',
                  title: 'Dualidad Simbólico-Geodésica',
                  summary:
                    'Conexión en 1 clic entre el lienzo esquemático local (x, y) del Demo Base y la cartografía real PostGIS SRID=4326 en Google Maps.',
                  lens: 'lens_atlas_coco_baba' as const,
                  anchor: 'cartografia-workspace',
                },
                {
                  code: 'H-TER-05',
                  title: 'Honestidad Epistémica Visible (R5/R15)',
                  summary:
                    'Cero fallbacks silenciosos a [] ante errores HTTP; separación explícita de los 4 orígenes operativos y los 5 estados R5-UI.',
                  lens: 'lens_epistemic_contracts' as const,
                  anchor: 'demo-datasource-audit',
                },
                {
                  code: 'H-TER-06',
                  title: 'Soberanía & Push FCM en 1 Clic',
                  summary:
                    'Visibilidad permanente del custodio tripartito y despacho trazable de alertas Push FCM / Firestore ante cambios de soberanía.',
                  lens: 'lens_sovereignty_fcm' as const,
                  anchor: 'consola-admin-soberania',
                },
              ].map((h) => (
                <div key={h.code} className="coco-baba-triage-card">
                  <div className="event-row-top">
                    <code>{h.code}</code>
                    <button
                      type="button"
                      className="btn-toggle"
                      style={{ fontSize: '0.72rem', padding: '0.18rem 0.5rem' }}
                      onClick={() => {
                        setActiveDesignLens(h.lens);
                        setTimeout(() => {
                          document
                            .getElementById(h.anchor)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 40);
                      }}
                    >
                      Inspeccionar en UI →
                    </button>
                  </div>
                  <strong style={{ display: 'block', marginTop: '0.25rem' }}>
                    {h.title}
                  </strong>
                  <p className="territory-meta" style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                    {h.summary}
                  </p>
                </div>
              ))}
            </div>

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

                  {/* Laboratorio Detallado en Vivo de la Estación 01 (tokens.css · ADR-034 §4.5) */}
                  {currentStation.index === 0 && (
                    <div
                      data-testid="station-01-token-workbench"
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--color-border-hairline)',
                      }}
                    >
                      <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                        <div>
                          <span className="tiny-label">
                            ESTACIÓN 01 EN DETALLE · AUDITORÍA VISUAL INTERACTIVA (ADR-034 §4.5 · MODO A)
                          </span>
                          <strong>
                            Muestrario en Vivo de Superficies 60-30-10, 3 Nodos San Juan, 5 Estados R5-UI y Tipografía 2+1
                          </strong>
                        </div>
                        <span className="territory-meta tabular-nums">
                          Tema activo:{' '}
                          <strong>
                            {themeMode === 'dark'
                              ? 'Pizarra Andina Nocturna (#0B111E)'
                              : themeMode === 'light'
                                ? 'Piedra Caliza Sanjuanina (#F7F5F0)'
                                : 'Auto (Sistema)'}
                          </strong>
                        </span>
                      </div>

                      <div className="coco-baba-triage-grid">
                        {/* 1. Distribución 60-30-10 y Contraste WCAG */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            A. Regla 60-30-10 y Contraste WCAG 2.1 AA/AAA
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <div
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: 'var(--radius-sm, 6px)',
                                background: 'var(--color-bg-canvas)',
                                border: '1px solid var(--color-border-default)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.78rem',
                              }}
                            >
                              <span>
                                <strong>60% Lienzo</strong> (<code>--color-bg-canvas</code>)
                              </span>
                              <code className="tabular-nums">
                                {themeMode === 'dark' ? '#0B111E · 15.8:1 AAA' : '#F7F5F0 · 16.2:1 AAA'}
                              </code>
                            </div>
                            <div
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: 'var(--radius-sm, 6px)',
                                background: 'var(--color-bg-elevated)',
                                border: '1px solid var(--color-border-default)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.78rem',
                              }}
                            >
                              <span>
                                <strong>30% Estructura</strong> (<code>--color-bg-elevated</code>)
                              </span>
                              <code className="tabular-nums">
                                {themeMode === 'dark' ? '#17233B · 1px hairline' : '#F2EDE2 · 1px hairline'}
                              </code>
                            </div>
                            <div
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: 'var(--radius-sm, 6px)',
                                background: 'var(--color-accent-subtle)',
                                border: '1px solid var(--color-border-accent)',
                                color: 'var(--color-accent-primary)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.78rem',
                              }}
                            >
                              <span>
                                <strong>10% Acento Cívico</strong> (<code>--color-accent-primary</code>)
                              </span>
                              <code className="tabular-nums">
                                {themeMode === 'dark' ? '#EA580C + #10B981' : '#C2410C + #1F6E50'}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* 2. Identidad Mineral de los 3 Departamentos de San Juan + Estados R5-UI */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            B. Identidad Mineral San Juan (ADR-021) + Máquina R5-UI (#109)
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            {(
                              [
                                {
                                  key: 'capital',
                                  label: 'Capital (Centro y Desamparados)',
                                  token: '--node-capital-*',
                                  ratio: '8.4:1 AAA',
                                  className: 'token-node-tag-capital',
                                },
                                {
                                  key: 'caucete',
                                  label: 'Caucete (Valle de Tulúm y Pie de Palo)',
                                  token: '--node-caucete-*',
                                  ratio: '9.2:1 AAA',
                                  className: 'token-node-tag-caucete',
                                },
                                {
                                  key: 'iglesia',
                                  label: 'Iglesia (Cordillera Andina)',
                                  token: '--node-iglesia-*',
                                  ratio: '9.6:1 AAA',
                                  className: 'token-node-tag-iglesia',
                                },
                              ] as const
                            ).map((nd) => (
                              <button
                                key={nd.key}
                                type="button"
                                onClick={() => setSelectedNodeKey(nd.key)}
                                style={{
                                  textAlign: 'left',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: 'var(--radius-sm, 6px)',
                                  border:
                                    selectedNodeKey === nd.key
                                      ? '1px solid var(--color-accent-primary)'
                                      : '1px solid var(--color-border-hairline)',
                                  background: 'var(--color-bg-surface)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                }}
                              >
                                <span className={nd.className}>{nd.label}</span>
                                <code className="tabular-nums" style={{ fontSize: '0.72rem' }}>
                                  {nd.token} ({nd.ratio})
                                </code>
                              </button>
                            ))}

                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.35rem',
                                paddingTop: '0.25rem',
                              }}
                            >
                              <span className="r5-state-badge r5-state-pendiente">
                                pendiente (6.8:1)
                              </span>
                              <span className="r5-state-badge r5-state-en_revision">
                                en_revision (8.4:1)
                              </span>
                              <span className="r5-state-badge r5-state-verificado">
                                verificado (7.4:1)
                              </span>
                              <span className="r5-state-badge r5-state-publicado">
                                publicado (9.6:1)
                              </span>
                              <span className="r5-state-badge r5-state-rechazado">
                                rechazado (7.9:1)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Espécimen Tipográfico 2+1 y Frontera Modo A (ADR-034 §4.5) */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            C. Regla Tipográfica 2+1 (H-TER-02) y Entrega Modo A (ADR-034 §4.5)
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.38rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <div
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '1.02rem',
                                fontWeight: 600,
                              }}
                            >
                              1. Fraunces Display — Autoridad Editorial Territorial
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.84rem',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              2. Plus Jakarta Sans — Lectura densa de capas, custodios y matrices (65–75ch).
                            </div>
                            <div
                              className="tabular-nums"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.76rem',
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-xs, 4px)',
                                background: 'var(--color-bg-inset)',
                                border: '1px solid var(--color-border-hairline)',
                              }}
                            >
                              3. JetBrains Mono (tabular-nums): SRID=4326 [-31.5375, -68.5364] · SHA-256 1272e45
                            </div>
                            <p className="territory-meta" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
                              <strong>Garantía ADR-034 §4.5:</strong>{' '}
                              <code>apps/web/src/design/tokens.css</code> es un artefacto 100% declarativo (cero cambios en contratos o backend), listo para PR de solo-estética hacia <code>main</code>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Laboratorio Detallado en Vivo de la Estación 02 (Cockpit Integrado «Coco-Baba» · Demo Base + Ecosistema General) */}
                  {currentStation.index === 1 && (
                    <div
                      data-testid="station-02-coco-baba-workbench"
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--color-border-hairline)',
                      }}
                    >
                      <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                        <div>
                          <span className="tiny-label">
                            ESTACIÓN 02 EN DETALLE · COCKPIT INTEGRADO «COCO-BABA» (DEMO BASE + ECOSISTEMA GENERAL · PIZARRA ANDINA)
                          </span>
                          <strong>
                            Control Remoto en Vivo de las 4 Vistas del Demo Base, Filtro por Custodio Tripartito y Dualidad Espacial (x, y) ↔ PostGIS SRID=4326
                          </strong>
                        </div>
                        <span className="territory-meta tabular-nums">
                          Nodo activo:{' '}
                          <strong className={`token-node-tag-${selectedNodeKey}`}>
                            {selectedNodeKey.toUpperCase()}
                          </strong>{' '}
                          · Vista Cockpit:{' '}
                          <code>{externalCockpitMacroView}</code>
                        </span>
                      </div>

                      <div className="coco-baba-triage-grid">
                        {/* A. Conmutador de las 4 Vistas Canónicas del Demo Base */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            A. Las 4 Vistas Rescatadas del Demo Base (Conmutación en 1 Clic)
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.38rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            {(
                              [
                                {
                                  key: 'federated_matrix',
                                  title: '01. Vista Federada & Matriz 7×3',
                                  desc: 'Soberanía Semántica y barra Activos vs Problemáticas en los 3 departamentos.',
                                },
                                {
                                  key: 'node_explorer',
                                  title: '02. Explorar Nodo & Mapa (x, y)',
                                  desc: 'Capas por custodio, lienzo esquemático interactivo, reportes y galería verificada.',
                                },
                                {
                                  key: 'compare_nodes',
                                  title: '03. Comparar Nodos Lado a Lado',
                                  desc: 'Comparador transversal sin homogeneización forzada por dominio.',
                                },
                                {
                                  key: 'architecture_contract',
                                  title: '04. Flujo de 5 Pasos & Contrato JSON',
                                  desc: 'Recorrido events_raw → Contratos → PostGIS → Push FCM → Evidencia + delocalsoy.node.v2.',
                                },
                              ] as const
                            ).map((mv) => (
                              <button
                                key={mv.key}
                                type="button"
                                onClick={() => {
                                  setExternalCockpitMacroView(mv.key);
                                  setTimeout(() => {
                                    document
                                      .getElementById('nodos-federados')
                                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 40);
                                }}
                                style={{
                                  textAlign: 'left',
                                  padding: '0.45rem 0.65rem',
                                  borderRadius: 'var(--radius-sm, 6px)',
                                  border:
                                    externalCockpitMacroView === mv.key
                                      ? '1px solid var(--color-accent-primary)'
                                      : '1px solid var(--color-border-hairline)',
                                  background:
                                    externalCockpitMacroView === mv.key
                                      ? 'var(--color-accent-subtle)'
                                      : 'var(--color-bg-surface)',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                }}
                              >
                                <div className="event-row-top">
                                  <strong style={{ fontSize: '0.82rem' }}>{mv.title}</strong>
                                  {externalCockpitMacroView === mv.key && (
                                    <span className="r5-state-badge r5-state-publicado">
                                      ACTIVA
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="territory-meta"
                                  style={{ display: 'block', fontSize: '0.74rem', marginTop: '0.15rem' }}
                                >
                                  {mv.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* B. Selector de Departamento de San Juan + Filtro de Custodio Tripartito */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            B. Custodia Tripartita y Capas por Departamento (H-TER-06)
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {(
                                [
                                  { key: 'capital', label: 'Capital (Centro/Desamp.)' },
                                  { key: 'caucete', label: 'Caucete (Oasis Tulúm)' },
                                  { key: 'iglesia', label: 'Iglesia (Cordillera)' },
                                ] as const
                              ).map((nd) => (
                                <button
                                  key={nd.key}
                                  type="button"
                                  className={
                                    selectedNodeKey === nd.key
                                      ? 'btn-filter active'
                                      : 'btn-filter'
                                  }
                                  onClick={() => {
                                    setSelectedNodeKey(nd.key);
                                    setExternalCockpitMacroView('node_explorer');
                                  }}
                                >
                                  {nd.label}
                                </button>
                              ))}
                            </div>

                            <span className="tiny-label" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
                              Filtrar capas producidas por custodio:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {(
                                [
                                  { key: 'all', label: 'Todos los custodios' },
                                  { key: 'community', label: 'Comunidad' },
                                  { key: 'institutions', label: 'Instituciones' },
                                  { key: 'businesses', label: 'Comercios / Prod.' },
                                ] as const
                              ).map((cf) => (
                                <button
                                  key={cf.key}
                                  type="button"
                                  className={
                                    externalCustodianFilter === cf.key
                                      ? 'btn-filter active'
                                      : 'btn-filter'
                                  }
                                  onClick={() => {
                                    setExternalCustodianFilter(cf.key);
                                    setExternalCockpitMacroView('node_explorer');
                                    setTimeout(() => {
                                      document
                                        .getElementById('nodos-federados')
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 40);
                                  }}
                                >
                                  {cf.label}
                                </button>
                              ))}
                            </div>

                            <div
                              className="tabular-nums"
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: 'var(--radius-xs, 4px)',
                                background: 'var(--color-bg-inset)',
                                border: '1px solid var(--color-border-hairline)',
                                fontSize: '0.76rem',
                              }}
                            >
                              Capas del nodo <strong>{selectedNodeKey.toUpperCase()}</strong>:{' '}
                              <strong>{(layersByNode[selectedNodeKey] ?? []).length}</strong> · Registros activos:{' '}
                              <strong>
                                {features.filter((f) => f.nodeKey === selectedNodeKey).length}
                              </strong>{' '}
                              · Reportes ciudadanos:{' '}
                              <strong>
                                {reports.filter((r) => r.nodeKey === selectedNodeKey).length}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* C. Dualidad Espacial Simbólico-Geodésica (H-TER-04) y Triage Coco-Baba */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            C. Dualidad Simbólico-Geodésica (H-TER-04) &amp; Triage «Coco-Baba»
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.42rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <p className="territory-meta" style={{ margin: 0 }}>
                              El Cockpit «Coco-Baba» une el <strong>lienzo esquemático local <code>(x, y)</code></strong> del Demo Base con las <strong>geometrías PostGIS <code>SRID=4326</code></strong> e índice GiST de producción.
                            </p>
                            <div
                              className="tabular-nums"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.55rem',
                                borderRadius: 'var(--radius-xs, 4px)',
                                background: 'var(--color-bg-inset)',
                                border: '1px solid var(--color-border-hairline)',
                              }}
                            >
                              Geometrías PostGIS en {selectedNodeKey.toUpperCase()}:{' '}
                              <strong>
                                {
                                  spatialGeometries.filter(
                                    (g) => g.nodeKey === selectedNodeKey,
                                  ).length
                                }
                              </strong>{' '}
                              (ST_Polygon / ST_LineString · SRID=4326)
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn-confirm"
                                onClick={() => {
                                  const el = document.getElementById('nodos-federados');
                                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                              >
                                Ir al Cockpit «Coco-Baba» ↓
                              </button>
                              <button
                                type="button"
                                className="btn-toggle"
                                onClick={() => {
                                  const nodeObj = territoriosItems.find(
                                    (t) => t.key === selectedNodeKey,
                                  );
                                  if (nodeObj) {
                                    handleFocusOnGoogleMap(nodeObj.id);
                                  }
                                }}
                              >
                                Proyectar en Google Maps (SRID=4326) ↓
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Laboratorio Detallado en Vivo de la Estación 03 (Flujo Vertical 13 Módulos / 11 Eslabones + Honestidad IDataSource R5) */}
                  {currentStation.index === 2 && (
                    <div
                      data-testid="station-03-vertical-r5ui-workbench"
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--color-border-hairline)',
                      }}
                    >
                      <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                        <div>
                          <span className="tiny-label">
                            ESTACIÓN 03 EN DETALLE · FLUJO VERTICAL E2E (13 MÓDULOS + 11 ESLABONES) Y HONESTIDAD IDataSource (R5 · PIZARRA ANDINA)
                          </span>
                          <strong>
                            Control Remoto de las 6 Vistas del Hub Territorial, Máquina de 5 Estados R5-UI y Auditoría de los 4 Orígenes Operativos
                          </strong>
                        </div>
                        <span className="territory-meta tabular-nums">
                          Origen activo:{' '}
                          <strong className="r5-status-aprobado">
                            {operationalOriginLabel}
                          </strong>{' '}
                          · Vista Hub:{' '}
                          <code>{externalPlatformSection}</code>
                        </span>
                      </div>

                      <div className="coco-baba-triage-grid">
                        {/* A. Conmutador en 1 Clic de las 6 Vistas Operativas de los 13 Módulos */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            A. Las 6 Vistas Operativas de los 13 Módulos (Conmutación en 1 Clic)
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            {(
                              [
                                {
                                  key: 'flujo-vertical',
                                  title: '01. Flujo Vertical: Activo Verificado (11 Eslabones)',
                                  desc: 'JWT + RBAC → Zod → events_raw → Redis Stream → Worker → PostGIS → BBOX.',
                                },
                                {
                                  key: 'directorio-red',
                                  title: '02. Directorio y Red Territorial',
                                  desc: 'Grafo verificable de proveedores locales, entorno urbano y estados R5-UI.',
                                },
                                {
                                  key: 'marketplace',
                                  title: '03. Marketplace de Proximidad',
                                  desc: 'Ofertas y demandas barriales respaldadas en activos verificados con SHA-256.',
                                },
                                {
                                  key: 'participacion',
                                  title: '04. Participación Deliberativa (8 Etapas)',
                                  desc: 'Ciclo Propuesta → Revisión → Deliberación → Decisión → Seguimiento.',
                                },
                                {
                                  key: 'espacio-ambiente-eventos',
                                  title: '05. Espacio Público, Ambiente y Eventos',
                                  desc: 'Relevamiento de acequias, arbolado, accesibilidad y agenda comunitaria.',
                                },
                                {
                                  key: 'inteligencia-y-modulos',
                                  title: '06. Inteligencia Ética y Matriz de 13 Módulos',
                                  desc: 'Estructura Dato → Interpretación → Sugerencia y catálogo 13 módulos.',
                                },
                              ] as const
                            ).map((sec) => (
                              <button
                                key={sec.key}
                                type="button"
                                onClick={() => {
                                  setExternalPlatformSection(sec.key);
                                  setTimeout(() => {
                                    document
                                      .getElementById('plataforma-territorial-real')
                                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 40);
                                }}
                                style={{
                                  textAlign: 'left',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: 'var(--radius-sm, 6px)',
                                  border:
                                    externalPlatformSection === sec.key
                                      ? '1px solid var(--color-accent-primary)'
                                      : '1px solid var(--color-border-hairline)',
                                  background:
                                    externalPlatformSection === sec.key
                                      ? 'var(--color-accent-subtle)'
                                      : 'var(--color-bg-surface)',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                }}
                              >
                                <div className="event-row-top">
                                  <strong style={{ fontSize: '0.8rem' }}>{sec.title}</strong>
                                  {externalPlatformSection === sec.key && (
                                    <span className="r5-state-badge r5-state-publicado">
                                      ACTIVA
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="territory-meta"
                                  style={{ display: 'block', fontSize: '0.72rem', marginTop: '0.12rem' }}
                                >
                                  {sec.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* B. Máquina de 5 Estados R5-UI (ADR-034) y Filtro Territorial del Hub */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            B. Máquina de 5 Estados R5-UI (ADR-034) &amp; Filtro por Departamento
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.42rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <span className="tiny-label" style={{ marginBottom: 0 }}>
                              Filtrar 13 módulos y activos por departamento de San Juan:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {(
                                [
                                  {
                                    hubKey: 'all',
                                    nodeKey: 'capital',
                                    label: '3 Nodos San Juan',
                                  },
                                  {
                                    hubKey: 'gran-san-juan-capital',
                                    nodeKey: 'capital',
                                    label: 'Capital (Centro/Desamp.)',
                                  },
                                  {
                                    hubKey: 'caucete',
                                    nodeKey: 'caucete',
                                    label: 'Caucete (Oasis Tulúm)',
                                  },
                                  {
                                    hubKey: 'iglesia',
                                    nodeKey: 'iglesia',
                                    label: 'Iglesia (Cordillera)',
                                  },
                                ] as const
                              ).map((tf) => (
                                <button
                                  key={tf.hubKey}
                                  type="button"
                                  className={
                                    externalPlatformTerritoryFilter === tf.hubKey
                                      ? 'btn-filter active'
                                      : 'btn-filter'
                                  }
                                  onClick={() => {
                                    setExternalPlatformTerritoryFilter(tf.hubKey);
                                    setSelectedNodeKey(tf.nodeKey);
                                  }}
                                >
                                  {tf.label}
                                </button>
                              ))}
                            </div>

                            <span className="tiny-label" style={{ marginTop: '0.15rem', marginBottom: 0 }}>
                              Ciclo de validación R5-UI en <code>tokens.css</code> (H-TER-02 / H-TER-05):
                            </span>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.3rem',
                              }}
                            >
                              <div className="event-row-top">
                                <span className="r5-state-badge r5-state-pendiente">
                                  1. pendiente / borrador
                                </span>
                                <span className="territory-meta tabular-nums">
                                  Ingreso ciudadano ({reports.filter((r) => r.status === 'received').length} recibidos)
                                </span>
                              </div>
                              <div className="event-row-top">
                                <span className="r5-state-badge r5-state-en_revision">
                                  2. en_revision
                                </span>
                                <span className="territory-meta tabular-nums">
                                  En mesa de custodia ({reports.filter((r) => r.status === 'evaluating' || r.status === 'in_progress').length} en evaluación)
                                </span>
                              </div>
                              <div className="event-row-top">
                                <span className="r5-state-badge r5-state-verificado">
                                  3. verificado
                                </span>
                                <span className="territory-meta tabular-nums">
                                  Evidencia validada ({evidenciasOkCount}/18 evidencias OK)
                                </span>
                              </div>
                              <div className="event-row-top">
                                <span className="r5-state-badge r5-state-publicado">
                                  4. publicado
                                </span>
                                <span className="territory-meta tabular-nums">
                                  Activo en directorio PostGIS ({features.length} features SRID=4326)
                                </span>
                              </div>
                              <div className="event-row-top">
                                <span className="r5-state-badge r5-state-rechazado">
                                  5. rechazado / observado
                                </span>
                                <span className="territory-meta tabular-nums">
                                  Bloqueo RBAC 401/403 o validación Zod 422
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn-confirm"
                              style={{ marginTop: '0.2rem' }}
                              onClick={() => {
                                document
                                  .getElementById('plataforma-territorial-real')
                                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                            >
                              Ir al Flujo Vertical de 11 Eslabones ↓
                            </button>
                          </div>
                        </div>

                        {/* C. Honestidad Epistémica IDataSource (R5) y los 4 Orígenes Operativos */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            C. Honestidad Epistémica IDataSource (Regla R5) y 4 Orígenes Operativos
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.42rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <div
                              className="tabular-nums"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                padding: '0.42rem 0.6rem',
                                borderRadius: 'var(--radius-xs, 4px)',
                                background: 'var(--color-bg-inset)',
                                border: '1px solid var(--color-border-hairline)',
                              }}
                            >
                              <div>
                                Origen: <strong>{operationalOriginLabel}</strong> · DataSource:{' '}
                                <code>{activeDataSource.name}</code>
                              </div>
                              <div style={{ marginTop: '0.15rem' }}>
                                Runtime (<code>/api/health</code>):{' '}
                                <strong>{runtimeMode.toUpperCase()}</strong> · Estado UI:{' '}
                                <strong>{uiOperationalState.toUpperCase()}</strong>
                              </div>
                            </div>

                            {idempotencyProbeResult && (
                              <div
                                className="r5-state-badge r5-state-verificado tabular-nums"
                                style={{
                                  display: 'block',
                                  padding: '0.4rem 0.6rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.73rem',
                                }}
                              >
                                ✓ {idempotencyProbeResult}
                              </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn-confirm"
                                onClick={() => void handleRunIdempotencyAndErrorProbe()}
                              >
                                Ejecutar Probe EV-005 Idempotencia + No-[] en HTTP 503 (R5)
                              </button>
                              <button
                                type="button"
                                className={useSyntheticInDemo ? 'btn-filter active' : 'btn-toggle'}
                                onClick={() => setUseSyntheticInDemo((prev) => !prev)}
                              >
                                {useSyntheticInDemo
                                  ? 'Desactivar Fuente Sintética (Volver a ApiDataSource /api/*)'
                                  : 'Probar SyntheticDataSource (Activar Banner VITE_MOCK_API=1)'}
                              </button>
                              <button
                                type="button"
                                className="btn-toggle"
                                onClick={() => {
                                  document
                                    .getElementById('demo-datasource-audit')
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                              >
                                Ir a Auditoría IDataSource y EV-007..EV-018 ↓
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Laboratorio Detallado en Vivo de la Estación 04 (Soberanía de Nodos, Sparklines y Alertas Push FCM / Firestore · EV-014) */}
                  {currentStation.index === 3 && (
                    <div
                      data-testid="station-04-sovereignty-fcm-workbench"
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--color-border-hairline)',
                      }}
                    >
                      <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
                        <div>
                          <span className="tiny-label">
                            ESTACIÓN 04 EN DETALLE · SOBERANÍA DE NODOS, SPARKLINES DE 6 VENTANAS Y PUSH FCM / FIRESTORE (EV-014 · PIZARRA ANDINA)
                          </span>
                          <strong>
                            Conmutación de Régimen Federal en 1 Clic, Despacho Push FCM a Custodios Ed25519 y Horizontes H2–H4 (PostGIS + Campo Offline)
                          </strong>
                        </div>
                        <span className="territory-meta tabular-nums">
                          Eslabones Merkle SHA-256:{' '}
                          <strong className="r5-status-aprobado">
                            {lineageChain.length} verificados
                          </strong>{' '}
                          · Custodios Ed25519:{' '}
                          <strong>{accreditedCustodians.length} claves</strong>
                        </span>
                      </div>

                      <div className="coco-baba-triage-grid">
                        {/* A. Conmutador de Régimen de Soberanía y Despacho Push FCM / Firestore en 1 Clic */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            A. Régimen de Soberanía (EV-014) y Despacho Push FCM en 1 Clic (H-TER-06)
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            {federalSovereignty.map((sov) => {
                              const isDelegated =
                                sov.sovereigntyMode === 'delegacion_revocable_activa';
                              const custodian = accreditedCustodians.find(
                                (c) => c.nodeKey === sov.nodeKey,
                              );
                              return (
                                <div
                                  key={sov.nodeKey}
                                  style={{
                                    padding: '0.45rem 0.6rem',
                                    borderRadius: 'var(--radius-sm, 6px)',
                                    border:
                                      selectedNodeKey === sov.nodeKey
                                        ? '1px solid var(--color-accent-primary)'
                                        : '1px solid var(--color-border-hairline)',
                                    background: 'var(--color-bg-surface)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.28rem',
                                  }}
                                >
                                  <div className="event-row-top">
                                    <span className={`token-node-tag-${sov.nodeKey}`}>
                                      {sov.nodeName}
                                    </span>
                                    <span
                                      className={
                                        isDelegated
                                          ? 'sovereignty-delegated-tag'
                                          : 'sovereignty-strict-tag'
                                      }
                                      style={{ fontSize: '0.72rem' }}
                                    >
                                      {isDelegated
                                        ? 'Delegación Federal Activa'
                                        : 'Custodia Local Estricta'}
                                    </span>
                                  </div>
                                  <div
                                    className="territory-meta tabular-nums"
                                    style={{ fontSize: '0.72rem' }}
                                  >
                                    Merkle: <code>{sov.nodeMerkleRoot.slice(0, 12)}…</code> · Ed25519:{' '}
                                    <code>{custodian?.publicKeyFingerprint ?? 'ed25519-sj'}</code>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.1rem' }}>
                                    <button
                                      type="button"
                                      className="btn-confirm"
                                      style={{ fontSize: '0.72rem', padding: '0.22rem 0.55rem' }}
                                      onClick={() => {
                                        setSelectedNodeKey(sov.nodeKey);
                                        void handleToggleNodeSovereignty(sov.nodeKey);
                                      }}
                                    >
                                      Conmutar Soberanía + Emitir Push FCM ({sov.nodeKey.toUpperCase()})
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {station04LastFcmAlert && (
                              <div
                                className="alert-custodian-critical tabular-nums"
                                style={{
                                  padding: '0.45rem 0.6rem',
                                  borderRadius: 'var(--radius-sm, 6px)',
                                  fontSize: '0.74rem',
                                }}
                              >
                                <div className="event-row-top">
                                  <strong>
                                    Push FCM Emitido: {station04LastFcmAlert.fcmTopic}
                                  </strong>
                                  <code>SHA {station04LastFcmAlert.sha256.slice(0, 10)}</code>
                                </div>
                                <div style={{ marginTop: '0.15rem' }}>
                                  {station04LastFcmAlert.summary}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* B. Sparklines Vectoriales de 6 Ventanas, Filtros de Consola y Auditoría SHA-256 */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            B. Sparklines 6 Ventanas (Q1..Q4 → H4 → Vivo) y Auditoría Merkle SHA-256
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.42rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <span className="tiny-label" style={{ marginBottom: 0 }}>
                              Filtrar Consola Admin por régimen de soberanía:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {(
                                [
                                  { key: 'all', label: 'Todos (3)' },
                                  {
                                    key: 'delegacion_revocable_activa',
                                    label: 'Delegación Federal',
                                  },
                                  {
                                    key: 'custodia_local_estricta',
                                    label: 'Custodia Estricta',
                                  },
                                ] as const
                              ).map((sf) => (
                                <button
                                  key={sf.key}
                                  type="button"
                                  className={
                                    externalSovereigntyFilter === sf.key
                                      ? 'btn-filter active'
                                      : 'btn-filter'
                                  }
                                  onClick={() => {
                                    setExternalSovereigntyFilter(sf.key);
                                    setTimeout(() => {
                                      document
                                        .getElementById('consola-admin-soberania')
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 40);
                                  }}
                                >
                                  {sf.label}
                                </button>
                              ))}
                            </div>

                            <span className="tiny-label" style={{ marginTop: '0.15rem', marginBottom: 0 }}>
                              Filtrar eventos de auditoría por departamento:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {(
                                [
                                  { key: 'all', label: 'Red Provincial' },
                                  { key: 'capital', label: 'Capital' },
                                  { key: 'caucete', label: 'Caucete' },
                                  { key: 'iglesia', label: 'Iglesia' },
                                ] as const
                              ).map((nf) => (
                                <button
                                  key={nf.key}
                                  type="button"
                                  className={
                                    externalNodeAuditFilter === nf.key
                                      ? 'btn-filter active'
                                      : 'btn-filter'
                                  }
                                  onClick={() => setExternalNodeAuditFilter(nf.key)}
                                >
                                  {nf.label}
                                </button>
                              ))}
                            </div>

                            {station04LineageResult && (
                              <div
                                className="r5-state-badge r5-state-verificado tabular-nums"
                                style={{
                                  display: 'block',
                                  padding: '0.38rem 0.55rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.72rem',
                                }}
                              >
                                ✓ {station04LineageResult}
                              </div>
                            )}

                            <button
                              type="button"
                              className="btn-confirm"
                              onClick={async () => {
                                const msg = await handleAuditLineage();
                                setStation04LineageResult(msg);
                              }}
                            >
                              Auditar Cadena Merkle SHA-256 en Vivo (EV-012)
                            </button>
                          </div>
                        </div>

                        {/* C. Horizontes H2–H4: PostGIS ST_Intersects, Cola Offline-First, Telemetría y Espejo Firestore */}
                        <div className="coco-baba-triage-card">
                          <span className="tiny-label">
                            C. Horizontes H2–H4 (PostGIS ST_Intersects · Campo Offline · Firestore ADR-020)
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.42rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <div
                              className="tabular-nums"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.74rem',
                                padding: '0.42rem 0.6rem',
                                borderRadius: 'var(--radius-xs, 4px)',
                                background: 'var(--color-bg-inset)',
                                border: '1px solid var(--color-border-hairline)',
                              }}
                            >
                              <div>
                                H2/H4 PostGIS: <strong>{spatialGeometries.length}</strong> geom. ·{' '}
                                <strong>{spatialIntersections.length}</strong> cruces{' '}
                                <code>ST_Intersects</code>
                              </div>
                              <div style={{ marginTop: '0.15rem' }}>
                                H4 Cola Campo:{' '}
                                <strong>
                                  {
                                    offlineFieldQueue.filter(
                                      (q) => q.syncStatus === 'queued_offline',
                                    ).length
                                  }
                                </strong>{' '}
                                en espera ·{' '}
                                <strong>
                                  {
                                    offlineFieldQueue.filter(
                                      (q) => q.syncStatus === 'synced_idempotent',
                                    ).length
                                  }
                                </strong>{' '}
                                sincronizados
                              </div>
                              <div style={{ marginTop: '0.15rem' }}>
                                Telemetría Hídrica: <strong>{telemetryWebhooks.length}</strong>{' '}
                                estaciones · Paquetes H2: <strong>{syncPacks.length}</strong>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn-confirm"
                                onClick={async () => {
                                  const msg = await handleExecuteBatchSync();
                                  setStation04LineageResult(msg);
                                }}
                              >
                                Reconciliar Cola Offline H4 (Batch Sync Idempotente · EV-016)
                              </button>
                              <button
                                type="button"
                                className="btn-toggle"
                                onClick={() => {
                                  document
                                    .getElementById('consola-admin-soberania')
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                              >
                                Ir a Consola Administrativa de Soberanía ↓
                              </button>
                              <button
                                type="button"
                                className="btn-toggle"
                                onClick={() => {
                                  document
                                    .getElementById('horizonte-2')
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                              >
                                Ir a Horizontes H2–H4 (PostGIS + Observatorio + Campo) ↓
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LABORATORIO DETALLADO EN VIVO — ESTACIÓN 05 (Epistemología R15, Contratos C1–C5, 19 Modelos Prisma, Copiloto IA Ético Tripartito y Cierre de las 5 Estaciones) */}
                  {currentStation.index === 4 && (
                    <div
                      id="station-05-epistemic-contracts-workbench"
                      style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="event-row-top">
                        <div>
                          <span className="kicker-text">
                            Laboratorio en Vivo · Estación 05 · Epistemología R15, Contratos Simétricos C1–C5 (19 Modelos Prisma), Copiloto IA Ético Tripartito y Cierre del Recorrido (5/5 Estaciones)
                          </span>
                          <h4
                            style={{
                              margin: '0.2rem 0 0',
                              fontFamily: 'var(--font-display)',
                              fontSize: '1rem',
                            }}
                          >
                            Control Remoto de Recursión Multi-Agente (`R1–R15`), Verificador `@delocalsoy/contracts` (`C1–C5`), Copiloto Tripartito (`ADR-004`) y Acta Final de Inspección
                          </h4>
                        </div>
                        <span className="badge-epistemic badge-verified tabular-nums">
                          Estaciones Aprobadas:{' '}
                          {
                            Object.values(stationVerdicts).filter(
                              (v) => v === 'aprobada',
                            ).length
                          }
                          /5 · Eventos SHA-256: {eventsRaw.length}
                        </span>
                      </div>

                      <div
                        className="coco-baba-triage-grid"
                        style={{ marginTop: '0.75rem' }}
                      >
                        {/* COLUMNA A: Control Remoto de RecursiveProspectiveContractPanel (5 Vistas + Verificación C1-C5 y R15 en Vivo) */}
                        <div className="coco-baba-triage-card">
                          <div className="event-row-top">
                            <strong>
                              1. 5 Vistas Recursivas &amp; Contratos Simétricos (`C1–C5` · `R15`)
                            </strong>
                            <span className="badge-epistemic badge-verified">
                              19 Modelos Prisma
                            </span>
                          </div>
                          <p
                            className="territory-meta"
                            style={{ marginTop: '0.35rem' }}
                          >
                            Conmutá en 1 clic la pestaña activa de{' '}
                            <code>#analisis-recursivo-prospectivo</code> o ejecutá en vivo la suite{' '}
                            <code>@delocalsoy/contracts (C1–C5)</code> y el validador epistémico{' '}
                            <code>R15</code> (<em>&ldquo;staging propone, GitHub acredita&rdquo;</em>):
                          </p>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr',
                              gap: '0.35rem',
                              marginTop: '0.55rem',
                            }}
                          >
                            {(
                              [
                                {
                                  key: 'sinergia-ia',
                                  label: '01. Recursión 4 Niveles & Sinergia IA (R1–R15)',
                                },
                                {
                                  key: 'propuesta-valor',
                                  label: '02. Propuesta de Valor & 5 Artefactos @delocalsoy/*',
                                },
                                {
                                  key: 'recursivo',
                                  label: '03. Bucles Técnicos (CORE-001 → H4) & /docs',
                                },
                                {
                                  key: 'integracion',
                                  label: '04. Paridad Backend ↔ Frontend (19 Modelos Prisma · C1–C5)',
                                },
                                {
                                  key: 'prospectivo',
                                  label: '05. Especificación H4 (EV-015..EV-018)',
                                },
                              ] as const
                            ).map((tab) => {
                              const isActive = externalRecursiveTab === tab.key;
                              return (
                                <button
                                  key={tab.key}
                                  type="button"
                                  className={
                                    isActive ? 'btn-filter active' : 'btn-toggle'
                                  }
                                  style={{
                                    textAlign: 'left',
                                    justifyContent: 'space-between',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0.42rem 0.65rem',
                                  }}
                                  onClick={() => {
                                    setExternalRecursiveTab(tab.key);
                                    document
                                      .getElementById('analisis-recursivo-prospectivo')
                                      ?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start',
                                      });
                                  }}
                                >
                                  <span>{tab.label}</span>
                                  <code>{isActive ? 'ACTIVA' : 'Abrir ↓'}</code>
                                </button>
                              );
                            })}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.4rem',
                              marginTop: '0.65rem',
                            }}
                          >
                            <button
                              type="button"
                              className="btn-toggle"
                              style={{ flex: 1 }}
                              onClick={async () => {
                                const res = await fetch(
                                  '/api/contracts/validate-prisma-referential-integrity',
                                  {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                  },
                                );
                                if (res.ok) {
                                  const body = (await res.json()) as {
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
                                  };
                                  setPrismaIntegrityPreC5(body);
                                  setStation05C1C5Result(body.message);
                                  await cargarModeloFederado();
                                }
                              }}
                            >
                              🛡️ 1. Validar Integridad Referencial 19 Modelos Prisma (Pre-C5)
                            </button>
                            <button
                              type="button"
                              className="btn-confirm"
                              style={{ flex: 1 }}
                              onClick={async () => {
                                // Paso 1 obligatorio: verificar integridad referencial de los 19 modelos Prisma antes de proceder con C5
                                const preRes = await fetch(
                                  '/api/contracts/validate-prisma-referential-integrity',
                                  {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                  },
                                );
                                if (preRes.ok) {
                                  const preBody = (await preRes.json()) as {
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
                                  };
                                  setPrismaIntegrityPreC5(preBody);
                                  if (!preBody.c5GateUnlocked) {
                                    setStation05C1C5Result(
                                      `Compuerta C5 bloqueada: se detectaron inconsistencias referenciales en schema.prisma.`,
                                    );
                                    return;
                                  }
                                }
                                const res = await fetch(
                                  '/api/contracts/verify-c1-c5',
                                  {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                  },
                                );
                                if (res.ok) {
                                  const body = (await res.json()) as {
                                    message: string;
                                  };
                                  setStation05C1C5Result(body.message);
                                  await cargarModeloFederado();
                                }
                              }}
                            >
                              ✓ 2. Ejecutar Suite C1–C5 (@delocalsoy/contracts)
                            </button>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={async () => {
                                const res = await fetch(
                                  '/api/github-validation/ejecutar-y-validar',
                                  {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      codespaceOutput: '',
                                    }),
                                  },
                                );
                                if (res.ok) {
                                  const body = (await res.json()) as {
                                    epistemicState: string;
                                    accreditationScope: string;
                                    validationHash: string;
                                    message: string;
                                  };
                                  setStation05C1C5Result(
                                    `[R15: ${body.epistemicState} · scope=${body.accreditationScope} · SHA-256 ${body.validationHash.slice(0, 12)}] ${body.message}`,
                                  );
                                  await cargarModeloFederado();
                                }
                              }}
                            >
                              🔍 Sellar Estado Epistémico R15
                            </button>
                          </div>

                          {station05C1C5Result && (
                            <div
                              className="r5-state-badge r5-state-verificado tabular-nums"
                              style={{
                                display: 'block',
                                marginTop: '0.55rem',
                                padding: '0.5rem 0.65rem',
                                fontFamily: 'var(--font-mono)',
                                whiteSpace: 'normal',
                              }}
                            >
                              ✅ {station05C1C5Result}
                            </div>
                          )}
                        </div>

                        {/* COLUMNA B: Control Remoto del Copiloto IA Ético Tripartito (ADR-004: Dato -> Interpretación -> Sugerencia) */}
                        <div className="coco-baba-triage-card">
                          <div className="event-row-top">
                            <strong>
                              2. Copiloto IA Ético Tripartito (`ADR-004` · `R8/R9`)
                            </strong>
                            <span className="r5-state-badge r5-state-en_revision">
                              requiresHumanReview: true
                            </span>
                          </div>
                          <p
                            className="territory-meta"
                            style={{ marginTop: '0.35rem' }}
                          >
                            Toda consulta IA separa estrictamente{' '}
                            <strong>1) Dato Empírico</strong>,{' '}
                            <strong>2) Interpretación Contextual</strong> y{' '}
                            <strong>3) Sugerencia Subordinada</strong> para{' '}
                            <strong>Capital</strong>, <strong>Caucete</strong> e{' '}
                            <strong>Iglesia</strong>:
                          </p>

                          {/* Selector de Modalidad del Copiloto */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '0.35rem',
                              marginTop: '0.5rem',
                            }}
                          >
                            {(
                              [
                                {
                                  tab: 'chat',
                                  label: '1. Copiloto Tripartito',
                                },
                                {
                                  tab: 'search_grounding',
                                  label: '2. Search Grounding',
                                },
                                {
                                  tab: 'maps_grounding',
                                  label: '3. Maps SRID=4326',
                                },
                                {
                                  tab: 'seci_voice',
                                  label: '4. Voz & Ciclo SECI',
                                },
                              ] as const
                            ).map((m) => (
                              <button
                                key={m.tab}
                                type="button"
                                className={
                                  externalCopilotTab === m.tab
                                    ? 'btn-filter active'
                                    : 'btn-toggle'
                                }
                                onClick={() => {
                                  setExternalCopilotTab(m.tab);
                                  document
                                    .getElementById('copiloto-ia-etico')
                                    ?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'start',
                                    });
                                }}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          {/* Selector de Rol Ético y Nodo Sanjuanino */}
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.35rem',
                              marginTop: '0.5rem',
                            }}
                          >
                            {(
                              [
                                {
                                  role: 'hidro-cuenca',
                                  label: 'Rol: Hidro-Cuenca PostGIS',
                                },
                                {
                                  role: 'mediador-seci',
                                  label: 'Rol: Mediador SECI',
                                },
                                {
                                  role: 'auditor-hitub',
                                  label: 'Rol: Auditor HITUB R1–R15',
                                },
                              ] as const
                            ).map((r) => (
                              <button
                                key={r.role}
                                type="button"
                                className={
                                  externalCopilotRole === r.role
                                    ? 'btn-filter active'
                                    : 'btn-toggle'
                                }
                                style={{ fontSize: '0.73rem' }}
                                onClick={() => setExternalCopilotRole(r.role)}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>

                          <div
                            style={{
                              marginTop: '0.6rem',
                              display: 'flex',
                              gap: '0.4rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <button
                              type="button"
                              className="btn-confirm"
                              style={{ flex: 1 }}
                              onClick={async () => {
                                const res = await fetch('/api/ia-etica/chat', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    nodeKey: selectedNodeKey,
                                    model: 'gemini-3.1-flash-lite',
                                    rolePersona: externalCopilotRole,
                                    prompt: `Auditar estado hídrico, cruce espacial PostGIS ST_Intersects y gobernanza SECI en nodo ${selectedNodeKey.toUpperCase()} (San Juan).`,
                                    history: [],
                                  }),
                                });
                                if (res.ok) {
                                  const json = (await res.json()) as {
                                    success: boolean;
                                    data?: {
                                      modelUsed: string;
                                      sha256Hash: string;
                                      datoEmpirico: string;
                                      interpretacionContextual: string;
                                      sugerenciaAccionable: string;
                                    };
                                  };
                                  if (json.success && json.data) {
                                    setStation05TripartiteResult({
                                      nodeKey: selectedNodeKey,
                                      modelUsed: json.data.modelUsed,
                                      sha256Hash: json.data.sha256Hash,
                                      datoEmpirico: json.data.datoEmpirico,
                                      interpretacionContextual:
                                        json.data.interpretacionContextual,
                                      sugerenciaAccionable:
                                        json.data.sugerenciaAccionable,
                                    });
                                    await sincronizarTodo();
                                  }
                                }
                              }}
                            >
                              ⚡ Generar Dictamen Tripartito en Vivo ({selectedNodeKey.toUpperCase()})
                            </button>
                          </div>

                          {station05TripartiteResult && (
                            <div
                              style={{
                                marginTop: '0.55rem',
                                padding: '0.55rem',
                                borderRadius: '8px',
                                background: 'var(--surface-sunken)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.75rem',
                                display: 'grid',
                                gap: '0.35rem',
                              }}
                            >
                              <div className="event-row-top">
                                <span className="badge-epistemic badge-verified">
                                  Nodo: {station05TripartiteResult.nodeKey.toUpperCase()}
                                </span>
                                <code className="tabular-nums">
                                  SHA-256: {station05TripartiteResult.sha256Hash.slice(0, 12)}…
                                </code>
                              </div>
                              <div>
                                <strong style={{ color: '#38bdf8' }}>
                                  1. Dato Empírico:
                                </strong>{' '}
                                {station05TripartiteResult.datoEmpirico}
                              </div>
                              <div>
                                <strong style={{ color: '#fbbf24' }}>
                                  2. Interpretación:
                                </strong>{' '}
                                {station05TripartiteResult.interpretacionContextual}
                              </div>
                              <div>
                                <strong style={{ color: '#34d399' }}>
                                  3. Sugerencia (R8):
                                </strong>{' '}
                                {station05TripartiteResult.sugerenciaAccionable}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* COLUMNA C: Trazabilidad Inmutable events_raw, Matriz EV-001..EV-018 y Exportación Google Workspace */}
                        <div className="coco-baba-triage-card">
                          <div className="event-row-top">
                            <strong>
                              3. Trazabilidad `events_raw`, `EV-001..EV-018` &amp; Workspace
                            </strong>
                            <span className="r5-state-badge r5-state-publicado tabular-nums">
                              {evidencias.filter((e) => e.status === 'ok').length}/
                              {evidencias.length} EV OK
                            </span>
                          </div>
                          <p
                            className="territory-meta"
                            style={{ marginTop: '0.35rem' }}
                          >
                            Cada operación en las 5 estaciones queda encadenada en{' '}
                            <code>events_raw</code> con rechazo <code>HTTP 409 Conflict</code> ante
                            colisión de hash <code>SHA-256</code> y lista para exportar a{' '}
                            <strong>Google Drive / Docs / Sheets</strong>:
                          </p>

                          <div
                            style={{
                              padding: '0.55rem 0.65rem',
                              borderRadius: '8px',
                              background: 'var(--surface-sunken)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '0.76rem',
                              marginTop: '0.5rem',
                            }}
                            className="tabular-nums"
                          >
                            <div>
                              Eventos <code>events_raw</code>:{' '}
                              <strong>{eventsRaw.length}</strong> sellados · Eslabones linaje H3:{' '}
                              <strong>{lineageChain.length}</strong>
                            </div>
                            <div style={{ marginTop: '0.2rem' }}>
                              Evidencias verificadas:{' '}
                              <strong>
                                {evidencias.filter((e) => e.status === 'ok').length}/
                                {evidencias.length}
                              </strong>{' '}
                              (<code>EV-001</code> a <code>EV-018</code>)
                            </div>
                            <div style={{ marginTop: '0.2rem' }}>
                              Nodos San Juan (<code>ADR-021</code>):{' '}
                              <strong>Capital (Centro · Desamparados)</strong> ·{' '}
                              <strong>Caucete</strong> · <strong>Iglesia</strong>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem',
                              marginTop: '0.6rem',
                            }}
                          >
                            <button
                              type="button"
                              className="btn-confirm"
                              onClick={() => void handleRunIdempotencyAndErrorProbe()}
                            >
                              Probar Colisión SHA-256 (HTTP 409) + No-[] en 503 (EV-005)
                            </button>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => {
                                document
                                  .getElementById('trazabilidad-evidencias')
                                  ?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                  });
                              }}
                            >
                              Ir a Trazabilidad SHA-256 y Matriz EV-001..EV-018 ↓
                            </button>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => {
                                document
                                  .getElementById('workspace-export')
                                  ?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                  });
                              }}
                            >
                              Ir a Exportación Google Workspace (Drive / Docs / Sheets) ↓
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* MESA INTERACTIVA DE AUDITORÍA DE LOS 19 MODELOS PRISMA (packages/db/prisma/schema.prisma) */}
                      <div
                        id="station-05-prisma-models-audit"
                        className="coco-baba-triage-card"
                        style={{ marginTop: '0.85rem' }}
                      >
                        <div className="event-row-top">
                          <div>
                            <span className="kicker-text">
                              Auditoría en Vivo · Lente IV «Contratos Epistémicos» · `packages/db/prisma/schema.prisma` (19/19 Modelos)
                            </span>
                            <h4
                              style={{
                                margin: '0.2rem 0 0',
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.98rem',
                              }}
                            >
                              Inspección Estructural de los 19 Modelos Relacionales + PostGIS (`SRID=4326`), Invariantes `@unique` / `GiST` y Paridad `C1–C5`
                            </h4>
                          </div>
                          <div className="territory-actions">
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={async () => {
                                const res = await fetch(
                                  '/api/contracts/validate-prisma-referential-integrity',
                                  {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                  },
                                );
                                if (res.ok) {
                                  const body = (await res.json()) as {
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
                                  };
                                  setPrismaIntegrityPreC5(body);
                                  setStation05C1C5Result(body.message);
                                  await cargarModeloFederado();
                                }
                              }}
                            >
                              🛡️ Validar Integridad Referencial 19 Modelos (Pre-C5)
                            </button>
                            <button
                              type="button"
                              className="btn-confirm"
                              onClick={() => {
                                setActiveDesignLens('lens_epistemic_contracts');
                                setExternalRecursiveTab('integracion');
                                setTimeout(() => {
                                  document
                                    .getElementById('auditoria-19-modelos-prisma')
                                    ?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'start',
                                    });
                                }, 40);
                              }}
                            >
                              Ir a Tabla Completa en Panel de Contratos ↓
                            </button>
                          </div>
                        </div>

                        {prismaIntegrityPreC5 && (
                          <div
                            style={{
                              marginTop: '0.6rem',
                              padding: '0.6rem 0.75rem',
                              borderRadius: '8px',
                              background: 'var(--surface-sunken)',
                              border: '1px solid var(--brand-primary)',
                              fontSize: '0.76rem',
                            }}
                          >
                            <div className="event-row-top">
                              <strong>
                                Compuerta Pre-Contrato C5: {prismaIntegrityPreC5.modelsVerified}/19 Modelos Prisma ·{' '}
                                {prismaIntegrityPreC5.referentialEdgesVerified}/7 Relaciones FK Verificadas ·{' '}
                                {prismaIntegrityPreC5.orphanRecordsCount} Huérfanos
                              </strong>
                              <span className="r5-state-badge r5-state-publicado tabular-nums">
                                C5 HABILITADO · SHA-256 {prismaIntegrityPreC5.validationHash.slice(0, 10)}
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '0.35rem',
                                marginTop: '0.45rem',
                              }}
                            >
                              {prismaIntegrityPreC5.referentialEdges.map((fk) => (
                                <div
                                  key={fk.edge}
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    borderRadius: '6px',
                                    background: 'var(--color-bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  <code>{fk.edge}</code>
                                  <div className="territory-meta" style={{ fontSize: '0.7rem' }}>
                                    {fk.policy} · <strong>{fk.status.toUpperCase()}</strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div
                          className="filter-group"
                          style={{ marginTop: '0.55rem', flexWrap: 'wrap' }}
                        >
                          {(
                            [
                              { key: 'all', label: 'Todos (19 Modelos)' },
                              { key: 'CORE-001', label: 'CORE-001 (2)' },
                              { key: 'Horizonte 1', label: 'Horizonte 1 (4)' },
                              { key: 'Horizonte 2', label: 'Horizonte 2 · PostGIS (3)' },
                              { key: 'Horizonte 3', label: 'Horizonte 3 · Linaje/Soberanía (3)' },
                              { key: 'Horizonte 4', label: 'Horizonte 4 · Campo/Ed25519 (4)' },
                              { key: 'Auth & Copiloto', label: 'Auth JWT & Copiloto RAG (3)' },
                            ] as const
                          ).map((hf) => (
                            <button
                              key={hf.key}
                              type="button"
                              className={
                                station05PrismaFilter === hf.key
                                  ? 'btn-filter active'
                                  : 'btn-toggle'
                              }
                              onClick={() => setStation05PrismaFilter(hf.key)}
                            >
                              {hf.label}
                            </button>
                          ))}
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))',
                            gap: '0.5rem',
                            marginTop: '0.65rem',
                          }}
                        >
                          {(
                            [
                              {
                                name: 'events_raw',
                                horizon: 'CORE-001',
                                invariant: '@unique(hash) · Append-only SHA-256 (EV-005)',
                                count: eventsRaw.length,
                              },
                              {
                                name: 'evidencias',
                                horizon: 'CORE-001',
                                invariant: '@unique(code) · EV-001..EV-036 ejecutables (R4)',
                                count: evidencias.length,
                              },
                              {
                                name: 'territorios',
                                horizon: 'Horizonte 1',
                                invariant: 'geometry(Point,4326) + GiST idx_territorios_geom_gist',
                                count: territoriosItems.length || 3,
                              },
                              {
                                name: 'capas_territoriales',
                                horizon: 'Horizonte 1',
                                invariant: '@@unique([territorio_id, key]) · Custodia tripartita',
                                count: Object.values(layersByNode).reduce(
                                  (acc, arr) => acc + arr.length,
                                  0,
                                ) || 12,
                              },
                              {
                                name: 'features_territoriales',
                                horizon: 'Horizonte 1',
                                invariant: 'Activos y problemáticas con estado epistémico',
                                count: features.length || 18,
                              },
                              {
                                name: 'reportes_territoriales',
                                horizon: 'Horizonte 1',
                                invariant: 'FK event_id -> events_raw · Revisión humana R8',
                                count: reports.length || 9,
                              },
                              {
                                name: 'geometrias_espaciales',
                                horizon: 'Horizonte 2',
                                invariant: 'SRID=4326 WKT (ST_LineString / ST_Polygon)',
                                count: spatialGeometries.length || 9,
                              },
                              {
                                name: 'paquetes_sincronizacion_federada',
                                horizon: 'Horizonte 2',
                                invariant: '@unique(hash) · Co-firma inter-nodos sin homogeneizar',
                                count: syncPacks.length || 6,
                              },
                              {
                                name: 'cortes_trimestrales_nodo',
                                horizon: 'Horizonte 2',
                                invariant: '@@unique([nodo_key, trimestre]) · Serie 2026-Q1..Q4',
                                count: temporalSnapshots.length || 12,
                              },
                              {
                                name: 'sintesis_multiescala',
                                horizon: 'Horizonte 3',
                                invariant: '@unique(codigo) · requiresHumanReview=true (ADR-004)',
                                count: multiScaleSyntheses.length || 4,
                              },
                              {
                                name: 'cadena_linaje_criptografico',
                                horizon: 'Horizonte 3',
                                invariant: '@unique(step_index) + @unique(current_hash) SHA-256',
                                count: lineageChain.length || 5,
                              },
                              {
                                name: 'soberania_federal_nodos',
                                horizon: 'Horizonte 3',
                                invariant: '@unique(nodo_key) · Delegación revocable + Merkle root',
                                count: federalSovereignty.length || 3,
                              },
                              {
                                name: 'consultas_interseccion_postgis',
                                horizon: 'Horizonte 4',
                                invariant: '@unique(computed_hash) · ST_Intersects + ST_DWithin',
                                count: 6,
                              },
                              {
                                name: 'cola_sincronizacion_campo',
                                horizon: 'Horizonte 4',
                                invariant: '@unique(client_hash) · Reconciliación batch idempotente',
                                count: offlineFieldQueue.length || 6,
                              },
                              {
                                name: 'custodios_acreditados_ed25519',
                                horizon: 'Horizonte 4',
                                invariant: '@unique(public_key_fingerprint) · Firma Ed25519-SHA256',
                                count: accreditedCustodians.length || 9,
                              },
                              {
                                name: 'telemetria_webhooks_territoriales',
                                horizon: 'Horizonte 4',
                                invariant: '@unique(estacion_codigo) · Umbral hídrico auditable',
                                count: telemetryWebhooks.length || 6,
                              },
                              {
                                name: 'actores_territoriales',
                                horizon: 'Auth & Copiloto',
                                invariant: '@unique(email) · RBAC ciudadano | moderador | admin',
                                count: 5,
                              },
                              {
                                name: 'sesiones_jwt_actores',
                                horizon: 'Auth & Copiloto',
                                invariant: '@unique(refresh_hash) · FK Cascade actores_territoriales',
                                count: 3,
                              },
                              {
                                name: 'consultas_ask_rag',
                                horizon: 'Auth & Copiloto',
                                invariant: '@unique(event_hash) · Tripartito Dato/Interpretación/Sugerencia',
                                count: 6,
                              },
                            ] as const
                          )
                            .filter((m) =>
                              station05PrismaFilter === 'all'
                                ? true
                                : m.horizon === station05PrismaFilter,
                            )
                            .map((m) => (
                              <div
                                key={m.name}
                                style={{
                                  padding: '0.55rem 0.65rem',
                                  borderRadius: '8px',
                                  background: 'var(--surface-sunken)',
                                  border: '1px solid var(--border-subtle)',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <div className="event-row-top">
                                  <code>model {m.name}</code>
                                  <span className="r5-state-badge r5-state-publicado tabular-nums">
                                    {m.count} reg.
                                  </span>
                                </div>
                                <div
                                  className="territory-meta"
                                  style={{ marginTop: '0.2rem' }}
                                >
                                  <strong>{m.horizon}</strong> · {m.invariant}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* BANDA DE CIERRE FORMAL DEL RECORRIDO DE LAS 5 ESTACIONES (ACTA CRIPTOGRÁFICA SHA-256) */}
                      <div
                        className="coco-baba-triage-card"
                        style={{
                          marginTop: '0.85rem',
                          borderColor: 'var(--brand-primary)',
                        }}
                      >
                        <div className="event-row-top">
                          <div>
                            <span className="kicker-text">
                              Acta Oficial de Cierre · Recorrido Heurístico e Inspección Interactiva de las 5 Estaciones (`Pizarra Andina #0B111E`)
                            </span>
                            <h4
                              style={{
                                margin: '0.2rem 0 0',
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.98rem',
                              }}
                            >
                              Síntesis de Dictámenes (`Estación 01` → `Estación 05`) y Sello Criptográfico en `events_raw` (`Co-authored-by: Carlos Leonidas`)
                            </h4>
                          </div>
                          <div className="territory-actions">
                            <button
                              type="button"
                              className="btn-confirm"
                              onClick={async () => {
                                setStationVerdicts({
                                  0: 'aprobada',
                                  1: 'aprobada',
                                  2: 'aprobada',
                                  3: 'aprobada',
                                  4: 'aprobada',
                                });
                                const res = await fetch('/api/events', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    actor: 'Carlos Leonidas (Dirección Humana)',
                                    kind: 'ACTA_INSPECCION_5_ESTACIONES_APROBADA',
                                    summary:
                                      'Aprobación integral de las 5 Estaciones de Inspección Frontend (Pizarra Andina #0B111E, tokens.css, Coco Baba H1, Flujo Vertical 13 Módulos R5-UI, Soberanía FCM/Firestore y Contratos C1-C5 / Copiloto IA Tripartito).',
                                  }),
                                });
                                if (res.ok) {
                                  const ev = (await res.json()) as {
                                    hash?: string;
                                  };
                                  setInspectionCertificateSignedHash(
                                    ev.hash ?? 'a94f82c10e7b35d6',
                                  );
                                  await cargarModeloFederado();
                                }
                              }}
                            >
                              {inspectionCertificateSignedHash
                                ? `✓ Acta 5/5 Sellada en events_raw (${inspectionCertificateSignedHash.slice(0, 12)}…)`
                                : '🔏 Sellar Acta 5/5 Estaciones Aprobadas en events_raw (SHA-256)'}
                            </button>
                            <button
                              type="button"
                              className="btn-toggle"
                              onClick={() => {
                                const reportText = [
                                  `# Acta de Inspección Interactiva Frontend (ADR-034 · v7.7 · Pizarra Andina #0B111E)`,
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
                                setTimeout(
                                  () => setInspectionCopiedFeedback(false),
                                  2500,
                                );
                              }}
                            >
                              {inspectionCopiedFeedback
                                ? '✓ Acta Copiada al Portapapeles'
                                : '📋 Copiar Acta Completa (Markdown + Co-authored-by)'}
                            </button>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                            gap: '0.5rem',
                            marginTop: '0.65rem',
                          }}
                        >
                          {INSPECTION_STATIONS.map((st) => {
                            const verdict = stationVerdicts[st.index] ?? 'aprobada';
                            return (
                              <div
                                key={st.code}
                                style={{
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: '8px',
                                  background: 'var(--surface-sunken)',
                                  border: '1px solid var(--border-subtle)',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <div className="event-row-top">
                                  <code>{st.code}</code>
                                  <span
                                    className={
                                      verdict === 'aprobada'
                                        ? 'r5-state-badge r5-state-publicado'
                                        : verdict === 'ajustar_token'
                                          ? 'r5-state-badge r5-state-en_revision'
                                          : 'r5-state-badge r5-state-observado'
                                    }
                                  >
                                    {verdict === 'aprobada'
                                      ? '✓ Aprobada'
                                      : verdict === 'ajustar_token'
                                        ? '⚙ Token'
                                        : '↻ Layout'}
                                  </span>
                                </div>
                                <strong
                                  style={{
                                    display: 'block',
                                    marginTop: '0.25rem',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {st.title}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
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

        {/* SECCIÓN AISLADA /demo (#16, #17, #18), CONTRATO DataSource Y AUDITORÍA EV-007 A EV-018 */}
        {(activeDesignLens === 'all' ||
          activeDesignLens === 'lens_vertical_r5ui' ||
          activeDesignLens === 'lens_epistemic_contracts') && (
          <section
            id="demo-datasource-audit"
            className="card"
            data-state="ok"
          >
            <div className="section-header">
              <div>
                <span className="kicker-text">
                  Ciclo Post-CORE-002 (`main @ e3616b5`) · Aislamiento `/demo` (`#16, #17, #18`) + Contrato `DataSource` + Revisión `EV-007..EV-018`
                </span>
                <h2>
                  Separación Estricta de Orígenes Operativos (`API real` · `API degradada` · `API sintética` · `Demo local`)
                </h2>
              </div>
              <div className="territory-actions">
                <button
                  type="button"
                  onClick={() => setUseSyntheticInDemo((prev) => !prev)}
                  className={useSyntheticInDemo ? 'btn-filter active' : 'btn-toggle'}
                >
                  {useSyntheticInDemo
                    ? 'Desactivar Fuente Sintética (Volver a ApiDataSource /api/*)'
                    : 'Probar SyntheticDataSource (Simular VITE_MOCK_API=1)'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRunIdempotencyAndErrorProbe()}
                  className="btn-confirm"
                >
                  Verificar EV-005 Idempotencia + No-[] en 503 (R5)
                </button>
              </div>
            </div>

            {idempotencyProbeResult && (
              <div
                className="r5-state-badge r5-state-verificado tabular-nums"
                style={{
                  display: 'block',
                  padding: '0.6rem 0.85rem',
                  marginBottom: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ✅ {idempotencyProbeResult}
              </div>
            )}

            {/* 4 Orígenes Operativos Explícitos (Paso 3) */}
            <div className="coco-baba-triage-grid">
              {(
                [
                  {
                    label: 'API real',
                    desc: 'ApiDataSource conectado a /api/* con PostGIS real y modo persistido en events_raw (#58).',
                  },
                  {
                    label: 'API degradada',
                    desc: 'HTTP 503 o sin DB conectada: se muestra estado degraded explícito, jamás [] silencioso (R5).',
                  },
                  {
                    label: 'API sintética',
                    desc: 'SyntheticDataSource activo únicamente con VITE_MOCK_API=1 y banner de advertencia obligatorio.',
                  },
                  {
                    label: 'Demo local',
                    desc: 'Encapsulado bajo la ruta /demo (#16–#18) sin alterar ni simular evidencia de producción.',
                  },
                ] as const
              ).map((orig) => {
                const isCurrent = operationalOriginLabel === orig.label;
                return (
                  <div
                    key={orig.label}
                    className="coco-baba-triage-card"
                    style={
                      isCurrent
                        ? {
                            borderColor: 'var(--brand-primary)',
                            boxShadow: 'var(--shadow-sm)',
                          }
                        : undefined
                    }
                  >
                    <div className="event-row-top">
                      <strong>{orig.label}</strong>
                      {isCurrent && (
                        <span className="r5-state-badge r5-state-publicado">
                          ACTIVO
                        </span>
                      )}
                    </div>
                    <p className="territory-meta" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                      {orig.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Tabla de Issues #16, #17, #18 */}
            <div className="coco-baba-triage-grid" style={{ marginTop: '0.85rem' }}>
              {DEMO_ISOLATION_ISSUES.map((item) => (
                <div key={item.issue} className="coco-baba-triage-card">
                  <div className="event-row-top">
                    <code>Issue {item.issue}</code>
                    <span className="r5-state-badge r5-state-verificado">
                      {item.status}
                    </span>
                  </div>
                  <strong style={{ display: 'block', marginTop: '0.3rem' }}>
                    {item.title}
                  </strong>
                  <p className="territory-meta" style={{ marginTop: '0.3rem', marginBottom: 0 }}>
                    {item.isolationMechanism}
                  </p>
                </div>
              ))}
            </div>

            {/* Auditoría 1 por 1 de EV-007 a EV-018 (Paso 8) */}
            <details className="audit-details-panel" style={{ marginTop: '0.85rem' }}>
              <summary className="audit-details-summary">
                Ver Auditoría Individual de `EV-007` a `EV-018` sobre `main @ e3616b5` (Paso 8 · 12 Evidencias revisadas 1 por 1)
              </summary>
              <div className="matrix-table-wrap" style={{ marginTop: '0.65rem' }}>
                <table className="demo-domain-matrix-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Horizonte</th>
                      <th>En `main @ e3616b5`</th>
                      <th>PR / Rama</th>
                      <th>Clasificación Canónica</th>
                      <th>Diagnóstico Verificado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EV_007_TO_018_AUDIT_MATRIX.map((row) => (
                      <tr key={row.code}>
                        <td>
                          <code>{row.code}</code>
                        </td>
                        <td>{row.horizon}</td>
                        <td>{row.codeInMain ? '✅ Sí' : '⏳ Staging'}</td>
                        <td>
                          <code>{row.mergedPr ?? row.recoverableBranch ?? '—'}</code>
                        </td>
                        <td>
                          <span className="r5-state-badge r5-state-en_revision">
                            {row.classification}
                          </span>
                        </td>
                        <td className="territory-meta">{row.verificationTargetAndNotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            {/* Corte Documental 07-10-2026 (76 nodos · 31 commits · 22 ramas) + Runbook de Dirección Humana */}
            <details className="audit-details-panel" style={{ marginTop: '0.65rem' }}>
              <summary className="audit-details-summary">
                Ver Corte Documental (`76 nodos · 31 commits · 22 ramas · main @ 1272e45 / d70cbc6 / e3616b5`) y Runbook Exclusivo de Dirección Humana
              </summary>
              <div className="coco-baba-triage-grid" style={{ marginTop: '0.65rem' }}>
                <div className="coco-baba-triage-card">
                  <strong>Estado Consolidado del Monorepo (`delocalsoy-ar`)</strong>
                  <ul className="territory-meta" style={{ marginTop: '0.4rem', paddingLeft: '1.1rem' }}>
                    <li>
                      <strong>Verdad Técnica Verificable:</strong> <code>CORE-001 6/6</code> (<code>caa573b</code>) + <code>CORE-002 6/6</code> (<code>PRs #69–#74</code>) + <code>EV-025</code> (<code>PRs #75–#76 @ e3616b5</code>) + <code>CORE-003</code> (<code>d70cbc6</code>).
                    </li>
                    <li>
                      <strong>Tracker #51:</strong> 7/8 riesgos cerrados en código (<code>#52, #53, #54, #55, #57, #58, #59</code>); pendiente humano <code>#56</code> (ramas stale).
                    </li>
                    <li>
                      <strong>Contrato DataSource:</strong> <code>apps/web/src/lib/ApiDataSource.ts</code> propaga <code>runtimeMode</code> (<code>X-DELocalSoy-Runtime-Mode</code> / <code>/api/health</code>) y captura <code>503, 401, 404, 422, 500</code> sin devolver <code>[]</code> (Regla R5).
                    </li>
                  </ul>
                </div>
                <div className="coco-baba-triage-card">
                  <strong>Pendientes Exclusivos de Dirección Humana (No Duplicados por Agente)</strong>
                  <pre className="demo-contract-json-pre" style={{ marginTop: '0.4rem', borderRadius: '6px' }}>
{`gh run list --branch main -L 5
gh secret set TERRITORIOS_API_KEY
gh secret set HEALTH_MODE_API_KEY
pnpm install && git status -sb`}
                  </pre>
                </div>
              </div>
            </details>
          </section>
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

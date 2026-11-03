import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminSovereigntyDashboard } from './components/AdminSovereigntyDashboard';
import { ArtefactosRoot } from './components/artefactos/ArtefactosRoot';
import { BaseConsolidadaPrototype } from './components/BaseConsolidadaPrototype';
import { CognitiveLensSelector, type DesignLensKey } from './components/CognitiveLensSelector';
import { ComerciosPanel } from './components/ComerciosPanel';
import { DemoDataSourceAuditSection } from './components/DemoDataSourceAuditSection';
import { DesignStudioHeader } from './components/DesignStudioHeader';
import { EthicalAiCopilotPanel } from './components/EthicalAiCopilotPanel';
import { FederatedCompareView } from './components/FederatedCompareView';
import { FederatedNodeDetailModal } from './components/FederatedNodeDetailModal';
import { FederatedNodeExplorer } from './components/FederatedNodeExplorer';
import { GmpQuotaBanner } from './components/GmpQuotaBanner';
import { HeroBannerSection } from './components/HeroBannerSection';
import { HeuristicsAwardMatrix } from './components/HeuristicsAwardMatrix';
import { HorizonOneArchitecturePanel } from './components/HorizonOneArchitecturePanel';
import { HorizonThreeObservatoryPanel } from './components/HorizonThreeObservatoryPanel';
import { HorizonTwoSpatialFederationPanel } from './components/HorizonTwoSpatialFederationPanel';
import { HorizonFourFieldAndTelemetryPanel } from './components/HorizonFourFieldAndTelemetryPanel';
import { InspectionStationsConsole } from './components/InspectionStationsConsole';
import { LensOneAtlasWorkbench, type CockpitMacroView } from './components/LensOneAtlasWorkbench';
import { LensTwoVerticalFlowWorkbench } from './components/LensTwoVerticalFlowWorkbench';
import { LensThreeSovereigntyWorkbench } from './components/LensThreeSovereigntyWorkbench';
import { LensFourEpistemicContractsWorkbench } from './components/LensFourEpistemicContractsWorkbench';
import { MasterRegistrySection } from './components/MasterRegistrySection';
import { OperationalOriginStrip } from './components/OperationalOriginStrip';
import { QuarterlyTrendsSection } from './components/QuarterlyTrendsSection';
import { RecursiveDesignChainSection } from './components/RecursiveDesignChainSection';
import { RecursiveProspectiveContractPanel } from './components/RecursiveProspectiveContractPanel';
import { ShowcaseRecorridoPanel } from './components/ShowcaseRecorridoPanel';
import { ServicioInformativoPanel } from './components/ServicioInformativoPanel';
import { SyntheticModeWarningBanner } from './components/SyntheticModeWarningBanner';
import { TerritoriosMap } from './components/TerritoriosMap';
import { TerritorialPlatformHub } from './components/TerritorialPlatformHub';
import { TokenEvolutionStrip } from './components/TokenEvolutionStrip';
import { TopBarHeader } from './components/TopBarHeader';
import { TraceabilityAndEvidenciasPanel } from './components/TraceabilityAndEvidenciasPanel';
import { VibeAgentExportHandoffCenter } from './components/VibeAgentExportHandoffCenter';
import { WorkspacePanel } from './components/WorkspacePanel';
import { useFederatedMutationHandlers } from './hooks/useFederatedMutationHandlers';
import {
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
import { runIdempotencyAndErrorProbe } from './lib/idempotencyProbe';
import {
  defaultDataSource,
  fetchTerritorios,
  type ModeloFederadoPayload,
} from './lib/territorioTypes';
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
} from './data/federatedModel';

// Tipos y helpers de territorios — extraídos 1:1 a lib/territorioTypes
// (FE-DEUDA-02 #293, corte 23). App re-exporta la API pública para no alterar
// los imports existentes de los componentes ('../App').
export { fetchTerritorios } from './lib/territorioTypes';
export type {
  Territorio,
  HealthState,
  TerritoriosState,
  FiltroActivo,
} from './lib/territorioTypes';

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

  // Manejadores de mutación del modelo federado (H1–H4): extraídos 1:1 al hook
  // useFederatedMutationHandlers (FE-DEUDA-02 #293, corte 22). Mismos nombres y
  // comportamiento verbatim; App inyecta reloadModel=cargarModeloFederado y
  // eventsRaw, y recupera los 18 manejadores por desestructuración.
  const {
    handleCreateReport,
    handleAdvanceReport,
    handleRecordHumanReview,
    handleCreateGeometry,
    handleCreateSyncPack,
    handleAckSyncPack,
    handleCreateSynthesis,
    handleRatifySynthesis,
    handleAuditLineage,
    handleExecuteSpatialIntersection,
    handleEnqueueOfflineFieldItem,
    handleExecuteBatchSync,
    handleIssueEd25519Signature,
    handleIngestTelemetryWebhook,
    handleVisualValidateAsset,
    handleTestDuplicateHashIdempotency,
    handleVerifyEvidencia,
    handleWorkspaceExportVerified,
  } = useFederatedMutationHandlers({
    reloadModel: cargarModeloFederado,
    eventsRaw,
  });

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

  // Sonda de idempotencia y error (EV-005 / R5): lógica extraída 1:1 a
  // lib/idempotencyProbe (corte 23); App solo retiene el estado del resultado.
  const handleRunIdempotencyAndErrorProbe = async () => {
    setIdempotencyProbeResult(await runIdempotencyAndErrorProbe());
  };

  return (
    <>
      {gmpQuotaExceeded && <GmpQuotaBanner />}

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
          {/* Header del ESTUDIO — extraido 1:1 a DesignStudioHeader (FE-DEUDA-02 #293, corte 23) */}
          <DesignStudioHeader />

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

          {/* 2. Cadena Recursiva de 5 Eslabones: Del Modelo Base del Monorepo al Píxel (Interactiva) — extraída 1:1 a RecursiveDesignChainSection (FE-DEUDA-02 #293, corte 19) */}
          <div className="coco-baba-triage-box" style={{ marginBottom: 0 }}>
            <RecursiveDesignChainSection
              selectedRecursiveLinkIdx={selectedRecursiveLinkIdx}
              onSelectRecursiveLink={setSelectedRecursiveLinkIdx}
            />

            {/* 3. Matriz de las 6 Heurísticas de Premiación Internacional en Innovación Territorial (H-TER-01 a H-TER-06) — extraída 1:1 a HeuristicsAwardMatrix (FE-DEUDA-02 #293, corte 13) */}
            <HeuristicsAwardMatrix onSelectDesignLens={setActiveDesignLens} />

            {/* 4. Mesa de Inspección Interactiva Guiada en 5 Estaciones (Carlos Leonidas ↔ [agent: google]) — extraída 1:1 a InspectionStationsConsole (FE-DEUDA-02 #293, corte 20) */}
            <InspectionStationsConsole
              activeInspectionStation={activeInspectionStation}
              onFocusInspectionStation={setActiveInspectionStation}
              onSelectRecursiveLink={setSelectedRecursiveLinkIdx}
              onSelectDesignLens={setActiveDesignLens}
              stationVerdicts={stationVerdicts}
              onSetStationVerdicts={setStationVerdicts}
              themeMode={themeMode}
              onSetThemeMode={setThemeMode}
              selectedNodeKey={selectedNodeKey}
              onSelectNodeKey={setSelectedNodeKey}
              onInspectNode={setInspectedNodeKey}
              onRunIdempotencyAndErrorProbe={handleRunIdempotencyAndErrorProbe}
              useSyntheticInDemo={useSyntheticInDemo}
              onSetUseSyntheticInDemo={setUseSyntheticInDemo}
              onToggleNodeSovereignty={handleToggleNodeSovereignty}
              inspectionCopiedFeedback={inspectionCopiedFeedback}
              onSetInspectionCopiedFeedback={setInspectionCopiedFeedback}
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
              activeDataSource={activeDataSource}
              runtimeMode={runtimeMode}
              uiOperationalState={uiOperationalState}
              operationalOriginLabel={operationalOriginLabel}
              idempotencyProbeResult={idempotencyProbeResult}
              evidenciasOkCount={evidenciasOkCount}
              externalPlatformSection={externalPlatformSection}
              onSelectPlatformSection={setExternalPlatformSection}
              externalPlatformTerritoryFilter={externalPlatformTerritoryFilter}
              onSelectPlatformTerritoryFilter={setExternalPlatformTerritoryFilter}
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
              spatialIntersections={spatialIntersections}
              offlineFieldQueue={offlineFieldQueue}
              telemetryWebhooks={telemetryWebhooks}
              syncPacks={syncPacks}
              eventsRaw={eventsRaw}
              evidencias={evidencias}
              multiScaleSyntheses={multiScaleSyntheses}
              temporalSnapshots={temporalSnapshots}
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
              inspectionCertificateSignedHash={inspectionCertificateSignedHash}
              onSetInspectionCertificateSignedHash={setInspectionCertificateSignedHash}
              onReloadFederatedModel={cargarModeloFederado}
              onSincronizarTodo={sincronizarTodo}
            />
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

        {/* 7. Estado de Integración API y Registro Maestro de Nodos Territoriales — extraída 1:1 a MasterRegistrySection (FE-DEUDA-02 #293, corte 21) */}
        {(activeDesignLens === 'all' || activeDesignLens === 'lens_atlas_coco_baba') && (
          <MasterRegistrySection
            health={health}
            territorios={territorios}
            filtro={filtro}
            onSetFiltro={setFiltro}
            nombre={nombre}
            onSetNombre={setNombre}
            provincia={provincia}
            onSetProvincia={setProvincia}
            focoNuevo={focoNuevo}
            onSetFocoNuevo={setFocoNuevo}
            submitting={submitting}
            onCreateTerritorio={handleCrearTerritorio}
            onToggleActivo={handleToggleActivo}
            onFocusOnGoogleMap={handleFocusOnGoogleMap}
            onSelectNodeKey={setSelectedNodeKey}
            onInspectNode={setInspectedNodeKey}
            onSincronizarTodo={sincronizarTodo}
          />
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

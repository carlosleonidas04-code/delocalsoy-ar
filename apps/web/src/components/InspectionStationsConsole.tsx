/**
 * DELocalSoy.AR — Mesa de Inspección Interactiva Guiada en 5 Estaciones del
 * Estudio de Diseño Heurístico (Dirección Humana Carlos Leonidas ↔ [agent: google])
 * — FE-DEUDA-02 #293 (corte 20 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): la
 * IIFE completa de la Mesa — INSPECTION_STATIONS (dato local), selectAndFocusStation,
 * barra de estaciones con dictámenes (R9), pruebas interactivas en vivo por estación,
 * acta de inspección copiable, y los montajes condicionales de los laboratorios
 * Station01–05 (JSX verbatim). Acoples por props: estado compartido de App
 * (activeInspectionStation, stationVerdicts, themeMode, selectedNodeKey,
 * useSyntheticInDemo, external*, station04*, station05*, prismaIntegrityPreC5,
 * inspectionCertificateSignedHash, territorios y counts de dominio) y handlers
 * prop-ificados (onFocusInspectionStation, onSelectRecursiveLink, onSelectDesignLens,
 * onSetStationVerdicts, onSetThemeMode, onSelectNodeKey, onInspectNode,
 * onRunIdempotencyAndErrorProbe, onSetUseSyntheticInDemo, onToggleNodeSovereignty,
 * onSetInspectionCopiedFeedback, onFocusOnGoogleMap, onAuditLineage,
 * onExecuteBatchSync, onReloadFederatedModel, onSincronizarTodo, …).
 */
import type { Dispatch, SetStateAction } from 'react';
import { Station01TokenWorkbench } from './Station01TokenWorkbench';
import { Station02CockpitWorkbench } from './Station02CockpitWorkbench';
import { Station03VerticalFlowWorkbench } from './Station03VerticalFlowWorkbench';
import { Station04SovereigntyWorkbench } from './Station04SovereigntyWorkbench';
import { Station05EpistemicContractsWorkbench } from './Station05EpistemicContractsWorkbench';
import type { DesignLensKey } from './CognitiveLensSelector';
import type { CockpitMacroView } from './LensOneAtlasWorkbench';
import type {
  PrismaIntegrityPreC5Value,
  Station05TripartiteValue,
} from './Station05EpistemicContractsWorkbench';
import type { Territorio } from '../App';
import type {
  CustodianSovereigntyAlertRecord,
} from '../lib/firestoreEthicalStore';
import type {
  DataSource,
  DataSourceMode,
  UiOperationalState,
} from '../lib/dataSource';
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
  TerritorioFeature,
  TerritorioLayer,
} from '../data/federatedModel';

type InspectionVerdict = 'aprobada' | 'ajustar_token' | 'iterar_layout';
type CustodianFilter = 'all' | 'community' | 'institutions' | 'businesses';
type PlatformSection =
  | 'flujo-vertical'
  | 'directorio-red'
  | 'marketplace'
  | 'participacion'
  | 'espacio-ambiente-eventos'
  | 'inteligencia-y-modulos';
type PlatformTerritoryFilter =
  | 'all'
  | 'gran-san-juan-capital'
  | 'caucete'
  | 'iglesia';
type SovereigntyFilter =
  | 'all'
  | 'delegacion_revocable_activa'
  | 'custodia_local_estricta';
type CopilotTabValue = 'chat' | 'search_grounding' | 'maps_grounding' | 'seci_voice';
type CopilotRoleValue = 'hidro-cuenca' | 'mediador-seci' | 'auditor-hitub';
type RecursiveTabValue =
  | 'recursivo'
  | 'sinergia-ia'
  | 'propuesta-valor'
  | 'integracion'
  | 'prospectivo';

export interface InspectionStationsConsoleProps {
  activeInspectionStation: number;
  onFocusInspectionStation: (idx: number) => void;
  onSelectRecursiveLink: (idx: number) => void;
  onSelectDesignLens: (lens: DesignLensKey) => void;
  stationVerdicts: Record<number, InspectionVerdict>;
  onSetStationVerdicts: Dispatch<SetStateAction<Record<number, InspectionVerdict>>>;
  themeMode: 'light' | 'dark' | 'auto';
  onSetThemeMode: Dispatch<SetStateAction<'light' | 'dark' | 'auto'>>;
  selectedNodeKey: string;
  onSelectNodeKey: (nodeKey: string) => void;
  onInspectNode: (nodeKey: string | null) => void;
  onRunIdempotencyAndErrorProbe: () => void | Promise<void>;
  useSyntheticInDemo: boolean;
  onSetUseSyntheticInDemo: Dispatch<SetStateAction<boolean>>;
  onToggleNodeSovereignty: (nodeKey: string) => void | Promise<void>;
  inspectionCopiedFeedback: boolean;
  onSetInspectionCopiedFeedback: (copied: boolean) => void;
  externalCockpitMacroView: CockpitMacroView;
  onSelectCockpitMacroView: (view: CockpitMacroView) => void;
  externalCustodianFilter: CustodianFilter;
  onSelectCustodianFilter: (filter: CustodianFilter) => void;
  territoriosItems: Territorio[];
  spatialGeometries: SpatialGeometryRecord[];
  layersByNode: Record<string, TerritorioLayer[]>;
  features: TerritorioFeature[];
  reports: TerritorialReport[];
  onFocusOnGoogleMap: (territorioId: string) => void;
  activeDataSource: DataSource;
  runtimeMode: DataSourceMode;
  uiOperationalState: UiOperationalState;
  operationalOriginLabel: string;
  idempotencyProbeResult: string | null;
  evidenciasOkCount: number;
  externalPlatformSection: PlatformSection;
  onSelectPlatformSection: (section: PlatformSection) => void;
  externalPlatformTerritoryFilter: PlatformTerritoryFilter;
  onSelectPlatformTerritoryFilter: (filter: PlatformTerritoryFilter) => void;
  externalSovereigntyFilter: SovereigntyFilter;
  onSelectSovereigntyFilter: (filter: SovereigntyFilter) => void;
  externalNodeAuditFilter: string;
  onSelectNodeAuditFilter: (filter: string) => void;
  station04LastFcmAlert: CustodianSovereigntyAlertRecord | null;
  station04LineageResult: string | null;
  onStation04LineageResult: (result: string | null) => void;
  onAuditLineage: () => Promise<string>;
  onExecuteBatchSync: () => Promise<string>;
  federalSovereignty: FederalSovereigntyRecord[];
  lineageChain: LineageChainStep[];
  accreditedCustodians: AccreditedCustodianRecord[];
  spatialIntersections: SpatialIntersectionResult[];
  offlineFieldQueue: OfflineFieldQueueItem[];
  telemetryWebhooks: TelemetryWebhookRecord[];
  syncPacks: InterNodeSyncPack[];
  eventsRaw: RawEventRecord[];
  evidencias: EvidenciaRecord[];
  multiScaleSyntheses: MultiScaleSynthesisItem[];
  temporalSnapshots: TemporalQuarterSnapshot[];
  externalCopilotTab: CopilotTabValue;
  onSelectCopilotTab: (tab: CopilotTabValue) => void;
  externalCopilotRole: CopilotRoleValue;
  onSelectCopilotRole: (role: CopilotRoleValue) => void;
  externalRecursiveTab: RecursiveTabValue;
  onSelectRecursiveTab: (tab: RecursiveTabValue) => void;
  station05C1C5Result: string | null;
  onSetStation05C1C5Result: (result: string | null) => void;
  prismaIntegrityPreC5: PrismaIntegrityPreC5Value | null;
  onSetPrismaIntegrityPreC5: (value: PrismaIntegrityPreC5Value | null) => void;
  station05TripartiteResult: Station05TripartiteValue | null;
  onSetStation05TripartiteResult: (value: Station05TripartiteValue | null) => void;
  station05PrismaFilter: string;
  onSelectStation05PrismaFilter: (filter: string) => void;
  inspectionCertificateSignedHash: string | null;
  onSetInspectionCertificateSignedHash: (hash: string | null) => void;
  onReloadFederatedModel: () => void | Promise<void>;
  onSincronizarTodo: () => void | Promise<void>;
}

export function InspectionStationsConsole({
  activeInspectionStation,
  onFocusInspectionStation,
  onSelectRecursiveLink,
  onSelectDesignLens,
  stationVerdicts,
  onSetStationVerdicts,
  themeMode,
  onSetThemeMode,
  selectedNodeKey,
  onSelectNodeKey,
  onInspectNode,
  onRunIdempotencyAndErrorProbe,
  useSyntheticInDemo,
  onSetUseSyntheticInDemo,
  onToggleNodeSovereignty,
  inspectionCopiedFeedback,
  onSetInspectionCopiedFeedback,
  externalCockpitMacroView,
  onSelectCockpitMacroView,
  externalCustodianFilter,
  onSelectCustodianFilter,
  territoriosItems,
  spatialGeometries,
  layersByNode,
  features,
  reports,
  onFocusOnGoogleMap,
  activeDataSource,
  runtimeMode,
  uiOperationalState,
  operationalOriginLabel,
  idempotencyProbeResult,
  evidenciasOkCount,
  externalPlatformSection,
  onSelectPlatformSection,
  externalPlatformTerritoryFilter,
  onSelectPlatformTerritoryFilter,
  externalSovereigntyFilter,
  onSelectSovereigntyFilter,
  externalNodeAuditFilter,
  onSelectNodeAuditFilter,
  station04LastFcmAlert,
  station04LineageResult,
  onStation04LineageResult,
  onAuditLineage,
  onExecuteBatchSync,
  federalSovereignty,
  lineageChain,
  accreditedCustodians,
  spatialIntersections,
  offlineFieldQueue,
  telemetryWebhooks,
  syncPacks,
  eventsRaw,
  evidencias,
  multiScaleSyntheses,
  temporalSnapshots,
  externalCopilotTab,
  onSelectCopilotTab,
  externalCopilotRole,
  onSelectCopilotRole,
  externalRecursiveTab,
  onSelectRecursiveTab,
  station05C1C5Result,
  onSetStation05C1C5Result,
  prismaIntegrityPreC5,
  onSetPrismaIntegrityPreC5,
  station05TripartiteResult,
  onSetStation05TripartiteResult,
  station05PrismaFilter,
  onSelectStation05PrismaFilter,
  inspectionCertificateSignedHash,
  onSetInspectionCertificateSignedHash,
  onReloadFederatedModel,
  onSincronizarTodo,
}: InspectionStationsConsoleProps) {
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
    onFocusInspectionStation(target.index);
    onSelectRecursiveLink(target.index);
    onSelectDesignLens(target.lens);
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
                    onSetThemeMode((prev) =>
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
                        onSelectNodeKey(nk);
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
                  onClick={() => onInspectNode(selectedNodeKey)}
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
                  onClick={() => void onRunIdempotencyAndErrorProbe()}
                >
                  Ejecutar Probe EV-005 Idempotencia + Error 503 (R5)
                </button>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => onSetUseSyntheticInDemo((prev) => !prev)}
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
                    void onToggleNodeSovereignty(selectedNodeKey);
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
                    onSelectDesignLens('lens_epistemic_contracts');
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
                  onSetStationVerdicts((prev) => ({
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
                onSetInspectionCopiedFeedback(true);
                setTimeout(() => onSetInspectionCopiedFeedback(false), 2500);
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
          onSelectNodeKey={onSelectNodeKey}
        />
      )}

      {/* Laboratorio Detallado en Vivo de la Estación 02 (Cockpit Integrado «Coco-Baba» · Demo Base + Ecosistema General) — extraído 1:1 a Station02CockpitWorkbench (FE-DEUDA-02 #293, corte 15) */}
      {currentStation.index === 1 && (
        <Station02CockpitWorkbench
          selectedNodeKey={selectedNodeKey}
          onSelectNodeKey={onSelectNodeKey}
          externalCockpitMacroView={externalCockpitMacroView}
          onSelectCockpitMacroView={onSelectCockpitMacroView}
          externalCustodianFilter={externalCustodianFilter}
          onSelectCustodianFilter={onSelectCustodianFilter}
          territoriosItems={territoriosItems}
          spatialGeometries={spatialGeometries}
          layersByNode={layersByNode}
          features={features}
          reports={reports}
          onFocusOnGoogleMap={onFocusOnGoogleMap}
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
          onToggleSyntheticInDemo={() => onSetUseSyntheticInDemo((prev) => !prev)}
          onRunIdempotencyAndErrorProbe={onRunIdempotencyAndErrorProbe}
          idempotencyProbeResult={idempotencyProbeResult}
          reports={reports}
          features={features}
          evidenciasOkCount={evidenciasOkCount}
          externalPlatformSection={externalPlatformSection}
          onSelectPlatformSection={onSelectPlatformSection}
          externalPlatformTerritoryFilter={externalPlatformTerritoryFilter}
          onSelectPlatformTerritoryFilter={onSelectPlatformTerritoryFilter}
          onSelectNodeKey={onSelectNodeKey}
        />
      )}

      {/* Laboratorio Detallado en Vivo de la Estación 04 (Soberanía de Nodos, Sparklines y Alertas Push FCM / Firestore · EV-014) — extraído 1:1 a Station04SovereigntyWorkbench (FE-DEUDA-02 #293, corte 17) */}
      {currentStation.index === 3 && (
        <Station04SovereigntyWorkbench
          selectedNodeKey={selectedNodeKey}
          onSelectNodeKey={onSelectNodeKey}
          onToggleNodeSovereignty={onToggleNodeSovereignty}
          externalSovereigntyFilter={externalSovereigntyFilter}
          onSelectSovereigntyFilter={onSelectSovereigntyFilter}
          externalNodeAuditFilter={externalNodeAuditFilter}
          onSelectNodeAuditFilter={onSelectNodeAuditFilter}
          station04LastFcmAlert={station04LastFcmAlert}
          station04LineageResult={station04LineageResult}
          onStation04LineageResult={onStation04LineageResult}
          onAuditLineage={onAuditLineage}
          onExecuteBatchSync={onExecuteBatchSync}
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
          onSelectCopilotTab={onSelectCopilotTab}
          externalCopilotRole={externalCopilotRole}
          onSelectCopilotRole={onSelectCopilotRole}
          externalRecursiveTab={externalRecursiveTab}
          onSelectRecursiveTab={onSelectRecursiveTab}
          station05C1C5Result={station05C1C5Result}
          onSetStation05C1C5Result={onSetStation05C1C5Result}
          prismaIntegrityPreC5={prismaIntegrityPreC5}
          onSetPrismaIntegrityPreC5={onSetPrismaIntegrityPreC5}
          station05TripartiteResult={station05TripartiteResult}
          onSetStation05TripartiteResult={onSetStation05TripartiteResult}
          station05PrismaFilter={station05PrismaFilter}
          onSelectStation05PrismaFilter={onSelectStation05PrismaFilter}
          stationVerdicts={stationVerdicts}
          onSetStationVerdicts={onSetStationVerdicts}
          inspectionCertificateSignedHash={inspectionCertificateSignedHash}
          onSetInspectionCertificateSignedHash={onSetInspectionCertificateSignedHash}
          inspectionCopiedFeedback={inspectionCopiedFeedback}
          onSetInspectionCopiedFeedback={onSetInspectionCopiedFeedback}
          inspectionStations={INSPECTION_STATIONS}
          onSelectDesignLens={onSelectDesignLens}
          onRunIdempotencyAndErrorProbe={onRunIdempotencyAndErrorProbe}
          onReloadFederatedModel={onReloadFederatedModel}
          onSincronizarTodo={onSincronizarTodo}
        />
      )}
    </div>
  );
}

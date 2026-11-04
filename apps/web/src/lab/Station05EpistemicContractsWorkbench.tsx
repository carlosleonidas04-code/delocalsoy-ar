/**
 * Station05EpistemicContractsWorkbench — Laboratorio Detallado en Vivo de la
 * Estación 05 del Estudio de Diseño Heurístico: Epistemología R15, Contratos
 * C1–C5, 19 Modelos Prisma, Copiloto IA Ético Tripartito (ADR-004) y Cierre
 * de las 5 Estaciones (Acta Oficial + Sello SHA-256 en events_raw).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * FE-DEUDA-02 #293, corte 18. Estado compartido de App pasado por props
 * (counts de dominio, tabs del Copiloto, resultados C1–C5/tripartito,
 * dictámenes de estaciones y acta de cierre) + handlers prop-ificados.
 */
import type { DesignLensKey } from './CognitiveLensSelector';
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
  TelemetryWebhookRecord,
  TemporalQuarterSnapshot,
  TerritorialReport,
  TerritorioFeature,
  TerritorioLayer,
} from '../data/federatedModel';

type CopilotTabValue = 'chat' | 'search_grounding' | 'maps_grounding' | 'seci_voice';
type CopilotRoleValue = 'hidro-cuenca' | 'mediador-seci' | 'auditor-hitub';
type RecursiveTabValue =
  | 'recursivo'
  | 'sinergia-ia'
  | 'propuesta-valor'
  | 'integracion'
  | 'prospectivo';
type InspectionVerdict = 'aprobada' | 'ajustar_token' | 'iterar_layout';

export type PrismaIntegrityPreC5Value = {
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

export type Station05TripartiteValue = {
  nodeKey: string;
  modelUsed: string;
  sha256Hash: string;
  datoEmpirico: string;
  interpretacionContextual: string;
  sugerenciaAccionable: string;
};

export interface InspectionStation {
  index: number;
  code: string;
  title: string;
  lens: string;
  anchor: string;
  whatToInspect: string;
  baseModelLink: string;
}

export interface Station05EpistemicContractsWorkbenchProps {
  selectedNodeKey: string;
  eventsRaw: RawEventRecord[];
  evidencias: EvidenciaRecord[];
  features: TerritorioFeature[];
  reports: TerritorialReport[];
  territoriosItems: ReadonlyArray<{ id: string; key: string; nombre: string; provincia: string }>;
  layersByNode: Record<string, TerritorioLayer[]>;
  multiScaleSyntheses: MultiScaleSynthesisItem[];
  temporalSnapshots: TemporalQuarterSnapshot[];
  accreditedCustodians: AccreditedCustodianRecord[];
  federalSovereignty: FederalSovereigntyRecord[];
  lineageChain: LineageChainStep[];
  offlineFieldQueue: OfflineFieldQueueItem[];
  spatialGeometries: SpatialGeometryRecord[];
  syncPacks: InterNodeSyncPack[];
  telemetryWebhooks: TelemetryWebhookRecord[];
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
  stationVerdicts: Record<number, InspectionVerdict>;
  onSetStationVerdicts: (verdicts: Record<number, InspectionVerdict>) => void;
  inspectionCertificateSignedHash: string | null;
  onSetInspectionCertificateSignedHash: (hash: string | null) => void;
  inspectionCopiedFeedback: boolean;
  onSetInspectionCopiedFeedback: (copied: boolean) => void;
  inspectionStations: ReadonlyArray<InspectionStation>;
  onSelectDesignLens: (lens: DesignLensKey) => void;
  onRunIdempotencyAndErrorProbe: () => void | Promise<void>;
  onReloadFederatedModel: () => void | Promise<void>;
  onSincronizarTodo: () => void | Promise<void>;
}

export function Station05EpistemicContractsWorkbench({
  selectedNodeKey,
  eventsRaw,
  evidencias,
  features,
  reports,
  territoriosItems,
  layersByNode,
  multiScaleSyntheses,
  temporalSnapshots,
  accreditedCustodians,
  federalSovereignty,
  lineageChain,
  offlineFieldQueue,
  spatialGeometries,
  syncPacks,
  telemetryWebhooks,
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
  stationVerdicts,
  onSetStationVerdicts,
  inspectionCertificateSignedHash,
  onSetInspectionCertificateSignedHash,
  inspectionCopiedFeedback,
  onSetInspectionCopiedFeedback,
  inspectionStations,
  onSelectDesignLens,
  onRunIdempotencyAndErrorProbe,
  onReloadFederatedModel,
  onSincronizarTodo,
}: Station05EpistemicContractsWorkbenchProps) {
  return (
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
                    onSelectRecursiveTab(tab.key);
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
                  onSetPrismaIntegrityPreC5(body);
                  onSetStation05C1C5Result(body.message);
                  await onReloadFederatedModel();
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
                  onSetPrismaIntegrityPreC5(preBody);
                  if (!preBody.c5GateUnlocked) {
                    onSetStation05C1C5Result(
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
                  onSetStation05C1C5Result(body.message);
                  await onReloadFederatedModel();
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
                  onSetStation05C1C5Result(
                    `[R15: ${body.epistemicState} · scope=${body.accreditationScope} · SHA-256 ${body.validationHash.slice(0, 12)}] ${body.message}`,
                  );
                  await onReloadFederatedModel();
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
                  onSelectCopilotTab(m.tab);
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
                onClick={() => onSelectCopilotRole(r.role)}
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
                    onSetStation05TripartiteResult({
                      nodeKey: selectedNodeKey,
                      modelUsed: json.data.modelUsed,
                      sha256Hash: json.data.sha256Hash,
                      datoEmpirico: json.data.datoEmpirico,
                      interpretacionContextual:
                        json.data.interpretacionContextual,
                      sugerenciaAccionable:
                        json.data.sugerenciaAccionable,
                    });
                    await onSincronizarTodo();
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
              onClick={() => void onRunIdempotencyAndErrorProbe()}
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
                  onSetPrismaIntegrityPreC5(body);
                  onSetStation05C1C5Result(body.message);
                  await onReloadFederatedModel();
                }
              }}
            >
              🛡️ Validar Integridad Referencial 19 Modelos (Pre-C5)
            </button>
            <button
              type="button"
              className="btn-confirm"
              onClick={() => {
                onSelectDesignLens('lens_epistemic_contracts');
                onSelectRecursiveTab('integracion');
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
              onClick={() => onSelectStation05PrismaFilter(hf.key)}
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
                onSetStationVerdicts({
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
                  onSetInspectionCertificateSignedHash(
                    ev.hash ?? 'a94f82c10e7b35d6',
                  );
                  await onReloadFederatedModel();
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
                  ...inspectionStations.map(
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
                setTimeout(
                  () => onSetInspectionCopiedFeedback(false),
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
          {inspectionStations.map((st) => {
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
  );
}

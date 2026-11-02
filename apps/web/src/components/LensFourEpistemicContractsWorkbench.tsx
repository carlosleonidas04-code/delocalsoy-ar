/**
 * DELocalSoy.AR — Mesa Operativa Lente IV: Contratos Epistémicos (C1–C5 · 19
 * modelos Prisma), Copiloto IA Ético Tripartito y EV-001..EV-018 —
 * FE-DEUDA-02 #293 (corte 11 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * compuerta Pre-C5 de integridad referencial Prisma, suite C1–C5 + sellado R15,
 * conmutadores de pestañas recursivas y del Copiloto IA Tripartito, y libro
 * mayor events_raw. El estado compartido y los handlers viven en App y se
 * acoplan por props; las llamadas fetch a /api/contracts,
 * /api/github-validation y /api/ia-etica son parte del JSX verbatim.
 */
import type { DesignLensKey } from './CognitiveLensSelector';
import type { EvidenciaRecord } from '../data/federatedModel';

export type RecursiveTabKey =
  | 'recursivo'
  | 'sinergia-ia'
  | 'propuesta-valor'
  | 'integracion'
  | 'prospectivo';

export type CopilotTabKey =
  | 'chat'
  | 'search_grounding'
  | 'maps_grounding'
  | 'seci_voice';

export type CopilotRoleKey =
  | 'hidro-cuenca'
  | 'mediador-seci'
  | 'auditor-hitub';

export interface PrismaIntegrityPreC5 {
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
}

export interface Station05TripartiteResult {
  nodeKey: string;
  modelUsed: string;
  sha256Hash: string;
  datoEmpirico: string;
  interpretacionContextual: string;
  sugerenciaAccionable: string;
}

export interface LensFourEpistemicContractsWorkbenchProps {
  selectedNodeKey: string;
  externalRecursiveTab: RecursiveTabKey;
  externalCopilotTab: CopilotTabKey;
  externalCopilotRole: CopilotRoleKey;
  prismaIntegrityPreC5: PrismaIntegrityPreC5 | null;
  station05C1C5Result: string | null;
  station05TripartiteResult: Station05TripartiteResult | null;
  evidencias: EvidenciaRecord[];
  lineageChainCount: number;
  eventsRawCount: number;
  onSelectDesignLens: (lens: DesignLensKey) => void;
  onFocusInspectionStation: (station: number) => void;
  onSelectRecursiveLink: (linkIdx: number) => void;
  onSelectNodeKey: (nodeKey: string) => void;
  onSelectRecursiveTab: (tab: RecursiveTabKey) => void;
  onSelectCopilotTab: (tab: CopilotTabKey) => void;
  onSetPrismaIntegrityPreC5: (value: PrismaIntegrityPreC5) => void;
  onSetStation05C1C5Result: (value: string) => void;
  onSetStation05TripartiteResult: (value: Station05TripartiteResult) => void;
  onRunIdempotencyAndErrorProbe: () => void | Promise<void>;
  onReloadFederatedModel: () => Promise<void>;
  onSyncAll: () => Promise<void>;
}

export function LensFourEpistemicContractsWorkbench({
  selectedNodeKey,
  externalRecursiveTab,
  externalCopilotTab,
  externalCopilotRole,
  prismaIntegrityPreC5,
  station05C1C5Result,
  station05TripartiteResult,
  evidencias,
  lineageChainCount,
  eventsRawCount,
  onSelectDesignLens,
  onFocusInspectionStation,
  onSelectRecursiveLink,
  onSelectNodeKey,
  onSelectRecursiveTab,
  onSelectCopilotTab,
  onSetPrismaIntegrityPreC5,
  onSetStation05C1C5Result,
  onSetStation05TripartiteResult,
  onRunIdempotencyAndErrorProbe,
  onReloadFederatedModel,
  onSyncAll,
}: LensFourEpistemicContractsWorkbenchProps) {
  return (
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
              onFocusInspectionStation(3);
              onSelectRecursiveLink(3);
              onSelectDesignLens('lens_sovereignty_fcm');
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
              onFocusInspectionStation(1);
              onSelectRecursiveLink(0);
              onSelectDesignLens('lens_atlas_coco_baba');
            }}
          >
            Ir a Lente I (Atlas «Coco-Baba»)
          </button>
          <button
            type="button"
            className="btn-confirm"
            onClick={() => onSelectDesignLens('all')}
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
                    onSetPrismaIntegrityPreC5(body);
                    onSetStation05C1C5Result(body.message);
                    await onReloadFederatedModel();
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
                    onSetPrismaIntegrityPreC5(preBody);
                    if (!preBody.c5GateUnlocked) {
                      onSetStation05C1C5Result(
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
                    onSetStation05C1C5Result(body.message);
                    await onReloadFederatedModel();
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
                    onSetStation05C1C5Result(
                      `[R15: ${body.epistemicState} · scope=${body.accreditationScope} · SHA-256 ${body.validationHash.slice(0, 12)}] ${body.message}`,
                    );
                    await onReloadFederatedModel();
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
                    onSelectRecursiveTab(tab.key);
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
                  onClick={() => onSelectNodeKey(nd.key)}
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
                    onSelectCopilotTab(m.tab);
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
                    onSetStation05TripartiteResult({
                      nodeKey: selectedNodeKey,
                      modelUsed: json.data.modelUsed,
                      sha256Hash: json.data.sha256Hash,
                      datoEmpirico: json.data.datoEmpirico,
                      interpretacionContextual:
                        json.data.interpretacionContextual,
                      sugerenciaAccionable: json.data.sugerenciaAccionable,
                    });
                    await onSyncAll();
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
              Eventos <code>events_raw</code>: <strong>{eventsRawCount}</strong> ·{' '}
              Evidencias:{' '}
              <strong>
                {evidencias.filter((e) => e.status === 'ok').length}/{evidencias.length}
              </strong>{' '}
              OK · Linaje H3: <strong>{lineageChainCount}</strong>
            </div>

            <button
              type="button"
              className="btn-confirm"
              onClick={() => void onRunIdempotencyAndErrorProbe()}
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
  );
}

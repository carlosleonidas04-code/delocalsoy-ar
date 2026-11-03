/**
 * DELocalSoy.AR — Laboratorio Detallado en Vivo de la Estación 04 del Estudio
 * de Diseño Heurístico: Soberanía de Nodos, Sparklines y Alertas Push
 * FCM / Firestore (EV-014) — FE-DEUDA-02 #293 (corte 17 de desmonolitización
 * de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * espejo de soberanía por nodo (delegación revocable activa vs custodia local
 * estricta) con alerta Push FCM trazable, filtros de auditoría, linaje
 * Merkle/Ed25519 y métricas de sincronización H2/H4. Acoples por props:
 * estado compartido de App (station04*, federalSovereignty, lineageChain,
 * accreditedCustodians, colas H2/H4, spatial*) y handlers.
 */
import type {
  AccreditedCustodianRecord,
  CustodianSovereigntyAlertRecord,
  FederalSovereigntyRecord,
  InterNodeSyncPack,
  LineageChainStep,
  OfflineFieldQueueItem,
  SpatialGeometryRecord,
  SpatialIntersectionResult,
  TelemetryWebhookRecord,
} from '../data/federatedModel';

type SovereigntyFilter =
  | 'all'
  | 'delegacion_revocable_activa'
  | 'custodia_local_estricta';

export interface Station04SovereigntyWorkbenchProps {
  selectedNodeKey: string;
  onSelectNodeKey: (nodeKey: string) => void;
  onToggleNodeSovereignty: (nodeKey: string) => void | Promise<void>;
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
  spatialGeometries: SpatialGeometryRecord[];
  spatialIntersections: SpatialIntersectionResult[];
  offlineFieldQueue: OfflineFieldQueueItem[];
  telemetryWebhooks: TelemetryWebhookRecord[];
  syncPacks: InterNodeSyncPack[];
}

export function Station04SovereigntyWorkbench({
  selectedNodeKey,
  onSelectNodeKey,
  onToggleNodeSovereignty,
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
  spatialGeometries,
  spatialIntersections,
  offlineFieldQueue,
  telemetryWebhooks,
  syncPacks,
}: Station04SovereigntyWorkbenchProps) {
  return (
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
                        onSelectNodeKey(sov.nodeKey);
                        void onToggleNodeSovereignty(sov.nodeKey);
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
                    onSelectSovereigntyFilter(sf.key);
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
                  onClick={() => onSelectNodeAuditFilter(nf.key)}
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
                const msg = await onAuditLineage();
                onStation04LineageResult(msg);
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
                  const msg = await onExecuteBatchSync();
                  onStation04LineageResult(msg);
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
  );
}

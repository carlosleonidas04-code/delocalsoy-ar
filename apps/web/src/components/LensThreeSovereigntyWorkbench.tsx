/**
 * DELocalSoy.AR — Mesa Operativa en Vivo · Lente III: Soberanía de Nodos,
 * PostGIS H2–H4 y Alertas Push FCM / Firestore (EV-014) del Estudio de Diseño
 * Heurístico y Recursivo (ADR-034) — FE-DEUDA-02 #293 (corte 10 de
 * desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): mismo
 * pacto de soberanía federal con despacho push FCM / Firestore, mismos
 * horizontes H2–H4 (PostGIS SRID=4326, cadena Merkle SHA-256, campo offline
 * Ed25519) y mismos saltos hacia las demás lentes y estaciones. El estado
 * compartido permanece en App y sus handlers/setters se acoplan por props.
 */
import { type DesignLensKey } from './CognitiveLensSelector';
import { type CustodianSovereigntyAlertRecord } from '../lib/firestoreEthicalStore';
import type {
  AccreditedCustodianRecord,
  FederalSovereigntyRecord,
  OfflineFieldQueueItem,
  SpatialGeometryRecord,
} from '../data/federatedModel';

type PlatformTerritoryFilter =
  | 'all'
  | 'gran-san-juan-capital'
  | 'caucete'
  | 'iglesia';

export interface LensThreeSovereigntyWorkbenchProps {
  federalSovereignty: FederalSovereigntyRecord[];
  accreditedCustodians: AccreditedCustodianRecord[];
  spatialGeometries: SpatialGeometryRecord[];
  offlineFieldQueue: OfflineFieldQueueItem[];
  lineageChainCount: number;
  telemetryWebhooksCount: number;
  selectedNodeKey: string;
  externalNodeAuditFilter: string;
  station04LineageResult: string | null;
  station04LastFcmAlert: CustodianSovereigntyAlertRecord | null;
  onToggleNodeSovereignty: (nodeKey: string) => Promise<void>;
  onAuditLineage: () => Promise<string>;
  onExecuteSpatialIntersection: (payload: {
    geometryId: string;
    bufferMeters: number;
  }) => Promise<void>;
  onExecuteBatchSync: () => Promise<string>;
  onSelectNodeKey: (key: string) => void;
  onFilterPlatformTerritory: (territory: PlatformTerritoryFilter) => void;
  onSelectNodeAuditFilter: (filter: string) => void;
  onFocusInspectionStation: (station: number) => void;
  onSelectRecursiveLink: (idx: number) => void;
  onSelectDesignLens: (lens: DesignLensKey) => void;
  onSetStation04LineageResult: (result: string | null) => void;
}

export function LensThreeSovereigntyWorkbench({
  federalSovereignty,
  accreditedCustodians,
  spatialGeometries,
  offlineFieldQueue,
  lineageChainCount,
  telemetryWebhooksCount,
  selectedNodeKey,
  externalNodeAuditFilter,
  station04LineageResult,
  station04LastFcmAlert,
  onToggleNodeSovereignty,
  onAuditLineage,
  onExecuteSpatialIntersection,
  onExecuteBatchSync,
  onSelectNodeKey,
  onFilterPlatformTerritory,
  onSelectNodeAuditFilter,
  onFocusInspectionStation,
  onSelectRecursiveLink,
  onSelectDesignLens,
  onSetStation04LineageResult,
}: LensThreeSovereigntyWorkbenchProps) {
  return (
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
              onFocusInspectionStation(2);
              onSelectRecursiveLink(2);
              onSelectDesignLens('lens_vertical_r5ui');
            }}
          >
            ← Volver a Lente II (Flujo Vertical · 13 Módulos)
          </button>
          <span className="r5-state-badge r5-state-publicado tabular-nums">
            Lente III Enfocada · Merkle: {lineageChainCount} eslabones
          </span>
          <button
            type="button"
            className="btn-confirm"
            onClick={() => {
              onFocusInspectionStation(4);
              onSelectRecursiveLink(4);
              onSelectDesignLens('lens_epistemic_contracts');
            }}
          >
            Pasar a Lente IV (Contratos Epistémicos &amp; IA) →
          </button>
          <button
            type="button"
            className="btn-toggle"
            onClick={() => onSelectDesignLens('all')}
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
                        onSelectNodeKey(sov.nodeKey);
                        onSelectNodeAuditFilter(
                          sov.nodeKey as 'capital' | 'caucete' | 'iglesia',
                        );
                        onFilterPlatformTerritory(
                          sov.nodeKey === 'capital'
                            ? 'gran-san-juan-capital'
                            : (sov.nodeKey as 'caucete' | 'iglesia'),
                        );
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
                    onSelectNodeAuditFilter(nf.key);
                    onSelectNodeKey(nf.nodeKey);
                    onFilterPlatformTerritory(
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
                <strong>{lineageChainCount}</strong> eslabones <code>SHA-256</code>
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
                  const msg = await onAuditLineage();
                  onSetStation04LineageResult(msg);
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
                    await onExecuteSpatialIntersection({
                      geometryId: geom.id,
                      bufferMeters: 350,
                    });
                    onSetStation04LineageResult(
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
              sync · Telemetría: <strong>{telemetryWebhooksCount}</strong>
            </div>

            <button
              type="button"
              className="btn-confirm"
              onClick={async () => {
                const msg = await onExecuteBatchSync();
                onSetStation04LineageResult(msg);
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
  );
}

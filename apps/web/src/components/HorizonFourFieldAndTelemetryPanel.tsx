import { type FormEvent, useState } from 'react';
import type { Territorio } from '../App';
import type {
  AccreditedCustodianRecord,
  InterNodeSyncPack,
  MultiScaleSynthesisItem,
  OfflineFieldQueueItem,
  SpatialGeometryRecord,
  SpatialIntersectionResult,
  TelemetryWebhookRecord,
} from '../data/federatedModel';

interface HorizonFourFieldAndTelemetryPanelProps {
  territorios: Territorio[];
  spatialGeometries: SpatialGeometryRecord[];
  syncPacks: InterNodeSyncPack[];
  multiScaleSyntheses: MultiScaleSynthesisItem[];
  spatialIntersections: SpatialIntersectionResult[];
  offlineFieldQueue: OfflineFieldQueueItem[];
  accreditedCustodians: AccreditedCustodianRecord[];
  telemetryWebhooks: TelemetryWebhookRecord[];
  onExecuteSpatialIntersection: (payload: {
    geometryId: string;
    bufferMeters: number;
  }) => Promise<void>;
  onEnqueueOfflineFieldItem: (payload: {
    nodeKey: string;
    brigadeName: string;
    title: string;
    notes: string;
  }) => Promise<void>;
  onExecuteBatchSync: () => Promise<string>;
  onIssueEd25519Signature: (payload: {
    custodianId: string;
    targetEntity: string;
  }) => Promise<string>;
  onIngestTelemetryWebhook: (payload: {
    stationId: string;
    value: number;
  }) => Promise<void>;
  onFocusGeometryOnGoogleMap: (geom: SpatialGeometryRecord) => void;
}

const ROLE_LABELS: Record<AccreditedCustodianRecord['role'], string> = {
  community: 'Comunidad Vecinal / Originaria',
  institutions: 'Institución Pública / Sanitaria / Riego',
  businesses: 'Productores / Cooperativa Local',
};

const BUFFER_OPTIONS = [100, 250, 350, 500, 1000, 2500];

export function HorizonFourFieldAndTelemetryPanel({
  territorios,
  spatialGeometries,
  syncPacks,
  multiScaleSyntheses,
  spatialIntersections,
  offlineFieldQueue,
  accreditedCustodians,
  telemetryWebhooks,
  onExecuteSpatialIntersection,
  onEnqueueOfflineFieldItem,
  onExecuteBatchSync,
  onIssueEd25519Signature,
  onIngestTelemetryWebhook,
  onFocusGeometryOnGoogleMap,
}: HorizonFourFieldAndTelemetryPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'postgis' | 'offline' | 'ed25519' | 'telemetria'
  >('postgis');

  // H4-01 state
  const [selectedGeomId, setSelectedGeomId] = useState<string>(
    spatialGeometries[0]?.id ?? 'geom-cap-line-01',
  );
  const [bufferMeters, setBufferMeters] = useState<number>(500);
  const [runningIntersection, setRunningIntersection] = useState(false);

  // H4-02 state
  const [offlineNodeKey, setOfflineNodeKey] = useState<string>('iglesia');
  const [brigadeName, setBrigadeName] = useState<string>(
    'Brigada Alta Montaña · Junta de Riego Las Flores',
  );
  const [offlineTitle, setOfflineTitle] = useState<string>('');
  const [offlineNotes, setOfflineNotes] = useState<string>('');
  const [enqueuingOffline, setEnqueuingOffline] = useState(false);
  const [syncingBatch, setSyncingBatch] = useState(false);
  const [batchSyncBanner, setBatchSyncBanner] = useState<string | null>(null);

  // H4-03 state
  const [selectedCustodianId, setSelectedCustodianId] = useState<string>(
    accreditedCustodians[0]?.id ?? 'cust-ed25519-01',
  );
  const [targetEntity, setTargetEntity] = useState<string>(
    'SYN-CUYO-001 · Síntesis Hidrológica Cuenca Andino-Cuyana (H3/H4)',
  );
  const [signingEd25519, setSigningEd25519] = useState(false);
  const [signatureBanner, setSignatureBanner] = useState<string | null>(null);

  // H4-04 state
  const [selectedStationId, setSelectedStationId] = useState<string>(
    telemetryWebhooks[0]?.id ?? 'tel-st-01',
  );
  const [telemetryValueInput, setTelemetryValueInput] = useState<string>('1.28');
  const [sendingWebhook, setSendingWebhook] = useState(false);

  const pendingOfflineCount = offlineFieldQueue.filter(
    (item) => item.syncStatus === 'queued_offline',
  ).length;
  const syncedOfflineCount = offlineFieldQueue.filter(
    (item) => item.syncStatus === 'synced_idempotent',
  ).length;

  const handleRunIntersection = async (e: FormEvent) => {
    e.preventDefault();
    setRunningIntersection(true);
    try {
      await onExecuteSpatialIntersection({
        geometryId: selectedGeomId || spatialGeometries[0]?.id || 'geom-cap-line-01',
        bufferMeters,
      });
    } finally {
      setRunningIntersection(false);
    }
  };

  const handleAddOfflineCapture = async (e: FormEvent) => {
    e.preventDefault();
    if (!offlineTitle.trim()) return;
    setEnqueuingOffline(true);
    try {
      await onEnqueueOfflineFieldItem({
        nodeKey: offlineNodeKey,
        brigadeName: brigadeName.trim() || `Brigada ${offlineNodeKey}`,
        title: offlineTitle.trim(),
        notes:
          offlineNotes.trim() ||
          'Capturado en terreno sin cobertura móvil; almacenado en cola local con clientHash.',
      });
      setOfflineTitle('');
      setOfflineNotes('');
    } finally {
      setEnqueuingOffline(false);
    }
  };

  const handleBatchSyncClick = async () => {
    setSyncingBatch(true);
    try {
      const msg = await onExecuteBatchSync();
      setBatchSyncBanner(msg);
    } finally {
      setSyncingBatch(false);
    }
  };

  const handleSignEd25519 = async (e: FormEvent) => {
    e.preventDefault();
    setSigningEd25519(true);
    try {
      const msg = await onIssueEd25519Signature({
        custodianId: selectedCustodianId,
        targetEntity,
      });
      setSignatureBanner(msg);
    } finally {
      setSigningEd25519(false);
    }
  };

  const handleWebhookSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsedVal = Number(telemetryValueInput);
    if (Number.isNaN(parsedVal)) return;
    setSendingWebhook(true);
    try {
      await onIngestTelemetryWebhook({
        stationId: selectedStationId,
        value: parsedVal,
      });
    } finally {
      setSendingWebhook(false);
    }
  };

  const signableTargets = [
    ...multiScaleSyntheses.map(
      (s) => `${s.code} · ${s.title} (${s.involvedNodes.join(' ↔ ')})`,
    ),
    ...syncPacks.map(
      (p) => `${p.id} · ${p.title} (${p.sourceNodeKey} ↔ ${p.targetNodeKey})`,
    ),
    'ACTA-HITUB-H4-2026 · Padrón Operativo de Brigadas y Telemetría Cuyo',
  ];

  return (
    <section id="horizonte-4" className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            05. Horizonte 4 Consolidado · Operación en Terreno, Criptografía Ed25519 y Telemetría (EV-015 a EV-018)
          </span>
          <h2>
            Consultas Espaciales PostGIS (ST_Intersects), Sincronización Offline-First, Firmas Ed25519 y Webhooks Hídricos
          </h2>
          <p className="section-caption">
            Despliegue operativo del cuarto horizonte: motor de intersección espacial en{' '}
            <code>SRID=4326</code> con radio de amortiguación, cola offline-first para brigadas sin cobertura móvil,
            identidad criptográfica <code>Ed25519-SHA256</code> por custodio tripartito e ingesta de telemetría bajo Contrato Ético.
          </p>
        </div>

        <div
          className="filter-group"
          role="tablist"
          aria-label="Módulos del Horizonte 4"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'postgis'}
            className={activeTab === 'postgis' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('postgis')}
          >
            01. Intersección PostGIS ({spatialIntersections.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'offline'}
            className={activeTab === 'offline' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('offline')}
          >
            02. Campo Offline-First ({pendingOfflineCount} en cola)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ed25519'}
            className={activeTab === 'ed25519' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('ed25519')}
          >
            03. Custodios Ed25519 ({accreditedCustodians.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'telemetria'}
            className={activeTab === 'telemetria' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('telemetria')}
          >
            04. Webhooks Telemetría ({telemetryWebhooks.length})
          </button>
        </div>
      </div>

      {/* =====================================================================
          MÓDULO H4-01: MOTOR ESPACIAL POSTGIS ST_Intersects + ST_DWithin
          ===================================================================== */}
      {activeTab === 'postgis' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '0.75rem' }}>
            <div>
              <span className="tiny-label">
                H4-01 · Motor Espacial Nativo PostGIS (model consultas_interseccion_postgis · EV-015)
              </span>
              <strong>
                Cruce ST_Intersects + ST_DWithin(SRID=4326) entre Morfologías H2 y Activos/Reportes H1
              </strong>
            </div>
            <span className="territory-meta tabular-nums">
              Consultas auditadas: <strong>{spatialIntersections.length}</strong> · SRID:{' '}
              <code>4326</code>
            </span>
          </div>

          <form
            className="territory-form"
            style={{ marginTop: '0.75rem' }}
            onSubmit={(e) => void handleRunIntersection(e)}
          >
            <select
              value={selectedGeomId}
              onChange={(e) => setSelectedGeomId(e.target.value)}
              aria-label="Seleccionar geometría PostGIS de referencia"
            >
              {spatialGeometries.map((g) => (
                <option key={g.id} value={g.id}>
                  [{g.nodeKey.toUpperCase()}] {g.title} ({g.geometryType} · {g.metricLabel})
                </option>
              ))}
            </select>

            <select
              value={bufferMeters}
              onChange={(e) => setBufferMeters(Number(e.target.value))}
              aria-label="Radio de amortiguación ST_Buffer en metros"
            >
              {BUFFER_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  Radio Buffer: {m} metros (ST_DWithin)
                </option>
              ))}
            </select>

            <button type="submit" disabled={runningIntersection}>
              {runningIntersection
                ? 'Ejecutando ST_Intersects…'
                : '⚡ Ejecutar Intersección PostGIS (EV-015)'}
            </button>
          </form>

          <div className="recursive-matrix-list" style={{ marginTop: '0.9rem' }}>
            {spatialIntersections.map((isect) => {
              const matchedGeom = spatialGeometries.find(
                (g) => g.id === isect.geometryId,
              );
              return (
                <div key={isect.id} className="node-modal-section">
                  <div className="event-row-top">
                    <div>
                      <span className="kicker-text">
                        {isect.nodeKey.toUpperCase()} · {isect.geometryType} · Buffer{' '}
                        {isect.bufferMeters} m
                      </span>
                      <h3 style={{ margin: '0.15rem 0 0', fontSize: '0.98rem' }}>
                        {isect.geometryTitle}
                      </h3>
                    </div>
                    <div className="territory-actions">
                      <span className="territory-meta tabular-nums">
                        Operador: <code>{isect.spatialOperator}</code> · Hash:{' '}
                        <code>{isect.computedHash}</code>
                      </span>
                      {matchedGeom && (
                        <button
                          type="button"
                          className="btn-toggle"
                          onClick={() => onFocusGeometryOnGoogleMap(matchedGeom)}
                        >
                          Enfocar en Google Maps
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="territory-meta tabular-nums" style={{ marginTop: '0.45rem' }}>
                    Activos y problemáticas dentro del área de influencia ({isect.impactedFeatureIds.length}):{' '}
                    <strong>{isect.impactedFeatureTitles.join(' · ')}</strong>
                  </div>

                  <div className="territory-meta tabular-nums" style={{ marginTop: '0.25rem' }}>
                    IDs en <code>features_territoriales</code>:{' '}
                    <code>{isect.impactedFeatureIds.join(', ')}</code> · Reportes ciudadanos en buffer:{' '}
                    <code>
                      {isect.impactedReportIds.length > 0
                        ? isect.impactedReportIds.join(', ')
                        : 'Ninguno activo en este radio'}
                    </code>{' '}
                    · Ejecutado: {new Date(isect.executedAt).toLocaleTimeString('es-AR')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MÓDULO H4-02: COLA DE CAMPO OFFLINE-FIRST Y RECONCILIACIÓN BATCH
          ===================================================================== */}
      {activeTab === 'offline' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '0.75rem' }}>
            <div>
              <span className="tiny-label">
                H4-02 · Operación en Zonas sin Cobertura Móvil (model cola_sincronizacion_campo · EV-016)
              </span>
              <strong>
                Cola Local de Brigadas Territoriales: Preservación de occurred_at vs ingested_at e Idempotencia por clientHash
              </strong>
            </div>
            <div className="territory-actions">
              <span className="territory-meta tabular-nums">
                En cola offline: <strong>{pendingOfflineCount}</strong> · Sincronizados:{' '}
                <strong>{syncedOfflineCount}</strong>
              </span>
              <button
                type="button"
                className="btn-confirm"
                onClick={() => void handleBatchSyncClick()}
                disabled={syncingBatch}
              >
                {syncingBatch
                  ? 'Reconciliando lote…'
                  : `⚡ Sincronizar Lote Offline con events_raw (${pendingOfflineCount} pendientes · EV-016)`}
              </button>
            </div>
          </div>

          {batchSyncBanner && (
            <div className="workspace-feedback-bar" style={{ marginTop: '0.75rem' }}>
              <span className="ok">{batchSyncBanner}</span>
            </div>
          )}

          <form
            className="territory-form"
            style={{ marginTop: '0.75rem' }}
            onSubmit={(e) => void handleAddOfflineCapture(e)}
          >
            <select
              value={offlineNodeKey}
              onChange={(e) => setOfflineNodeKey(e.target.value)}
              aria-label="Nodo del relevamiento offline"
            >
              {territorios.map((t) => (
                <option key={t.key} value={t.key}>
                  Nodo: {t.nombre} ({t.provincia})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Brigada o custodio en campo"
              value={brigadeName}
              onChange={(e) => setBrigadeName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Título del relevamiento capturado sin señal (ej. Toma Pismanta)"
              value={offlineTitle}
              onChange={(e) => setOfflineTitle(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Notas técnicas u observación en terreno"
              value={offlineNotes}
              onChange={(e) => setOfflineNotes(e.target.value)}
            />
            <button type="submit" disabled={enqueuingOffline}>
              {enqueuingOffline ? 'Guardando en cola…' : '+ Encolar captura offline'}
            </button>
          </form>

          <ul className="territory-list" style={{ marginTop: '0.9rem' }}>
            {offlineFieldQueue.map((item) => {
              const isSynced = item.syncStatus === 'synced_idempotent';
              return (
                <li key={item.id} className="territory-item">
                  <div className="territory-info">
                    <span className="territory-name">
                      [{item.nodeKey.toUpperCase()}] {item.title}{' '}
                      <span className="node-subtitle">· {item.brigadeName}</span>
                    </span>
                    <span className="territory-meta">
                      {item.notes}
                    </span>
                    <span className="territory-meta tabular-nums">
                      Coords: <code>{item.coords.lat}, {item.coords.lng}</code> · Captura en campo (
                      <code>occurred_at</code>):{' '}
                      <strong>{new Date(item.occurredAt).toLocaleTimeString('es-AR')}</strong> ·
                      Ingesta servidor (<code>ingested_at</code>):{' '}
                      <strong>
                        {item.ingestedAt
                          ? new Date(item.ingestedAt).toLocaleTimeString('es-AR')
                          : 'Pendiente de señal'}
                      </strong>{' '}
                      · ClientHash: <code>{item.clientHash}</code>
                    </span>
                  </div>
                  <div className="territory-meta tabular-nums">
                    <strong style={{ color: isSynced ? '#2e9e5b' : '#d99b26' }}>
                      {isSynced
                        ? '✓ Sincronizado en events_raw'
                        : '⏳ En cola offline (IndexedDB)'}
                    </strong>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* =====================================================================
          MÓDULO H4-03: IDENTIDAD CRIPTOGRÁFICA ED25519 POR CUSTODIO
          ===================================================================== */}
      {activeTab === 'ed25519' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '0.75rem' }}>
            <div>
              <span className="tiny-label">
                H4-03 · Gobernanza Tripartita Criptográfica (model custodios_acreditados_ed25519 · EV-017)
              </span>
              <strong>
                Padrón de Claves Públicas Ed25519-SHA256 para Comunidad, Instituciones y Productores
              </strong>
            </div>
          </div>

          {signatureBanner && (
            <div className="workspace-feedback-bar" style={{ marginTop: '0.75rem' }}>
              <span className="ok">{signatureBanner}</span>
            </div>
          )}

          <form
            className="territory-form"
            style={{ marginTop: '0.75rem' }}
            onSubmit={(e) => void handleSignEd25519(e)}
          >
            <select
              value={selectedCustodianId}
              onChange={(e) => setSelectedCustodianId(e.target.value)}
              aria-label="Seleccionar custodio acreditado con clave Ed25519"
            >
              {accreditedCustodians.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.nodeKey.toUpperCase()}] {c.displayName} ({c.publicKeyFingerprint})
                </option>
              ))}
            </select>

            <select
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              aria-label="Seleccionar paquete o síntesis a firmar criptográficamente"
            >
              {signableTargets.map((target) => (
                <option key={target} value={target}>
                  Objeto a firmar: {target}
                </option>
              ))}
            </select>

            <button type="submit" disabled={signingEd25519}>
              {signingEd25519
                ? 'Firmando con Ed25519…'
                : '✒ Emitir Firma Criptográfica Ed25519 y Anclar en Linaje (EV-017)'}
            </button>
          </form>

          <div className="node-modal-layers-grid" style={{ marginTop: '0.9rem' }}>
            {accreditedCustodians.map((cust) => (
              <div key={cust.id} className="node-modal-layer-card">
                <div className="event-row-top">
                  <span className="kicker-text">
                    {cust.nodeKey.toUpperCase()} · {ROLE_LABELS[cust.role]}
                  </span>
                  <span className="territory-meta tabular-nums">
                    Firmas emitidas: <strong>{cust.signaturesIssuedCount}</strong>
                  </span>
                </div>
                <strong style={{ display: 'block', marginTop: '0.2rem' }}>
                  {cust.displayName}
                </strong>
                <div className="territory-meta" style={{ marginTop: '0.2rem' }}>
                  Organización: {cust.organization}
                </div>
                <div className="territory-meta tabular-nums" style={{ marginTop: '0.35rem' }}>
                  Huella pública ({cust.algorithm}):{' '}
                  <code>{cust.publicKeyFingerprint}</code>
                </div>
                {cust.lastSignatureHex && (
                  <div className="territory-meta tabular-nums" style={{ marginTop: '0.25rem' }}>
                    Último objeto firmado: <strong>{cust.lastSignedTarget}</strong> · Firma:{' '}
                    <code>{cust.lastSignatureHex}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MÓDULO H4-04: WEBHOOKS DE TELEMETRÍA HÍDRICA Y CLIMÁTICA
          ===================================================================== */}
      {activeTab === 'telemetria' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '0.75rem' }}>
            <div>
              <span className="tiny-label">
                H4-04 · Conectores Externos y Sensores de Cuenca (model telemetria_webhooks_territoriales · EV-018)
              </span>
              <strong>
                Ingesta de Telemetría Hídrica y Climática con Bloqueo Ético (requiresHumanReview: true)
              </strong>
            </div>
          </div>

          <form
            className="territory-form"
            style={{ marginTop: '0.75rem' }}
            onSubmit={(e) => void handleWebhookSubmit(e)}
          >
            <select
              value={selectedStationId}
              onChange={(e) => {
                const stId = e.target.value;
                setSelectedStationId(stId);
                const found = telemetryWebhooks.find((s) => s.id === stId);
                if (found) {
                  setTelemetryValueInput(String(found.lastValue));
                }
              }}
              aria-label="Seleccionar estación de telemetría territorial"
            >
              {telemetryWebhooks.map((st) => (
                <option key={st.id} value={st.id}>
                  [{st.stationCode}] {st.stationName} (Umbral: {st.thresholdWarning} {st.unit})
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.05"
              placeholder="Valor medido por el sensor"
              value={telemetryValueInput}
              onChange={(e) => setTelemetryValueInput(e.target.value)}
              required
            />

            <button type="submit" disabled={sendingWebhook}>
              {sendingWebhook
                ? 'Ingiriendo webhook…'
                : '📡 Simular Ingesta de Webhook de Telemetría (EV-018)'}
            </button>
          </form>

          <div className="node-modal-layers-grid" style={{ marginTop: '0.9rem' }}>
            {telemetryWebhooks.map((st) => {
              const isAlert = st.status === 'alerta_umbral_revision_humana';
              return (
                <div key={st.id} className="node-modal-layer-card">
                  <div className="event-row-top">
                    <code>{st.stationCode}</code>
                    <span
                      className="territory-meta tabular-nums"
                      style={{ color: isAlert ? '#d99b26' : '#2e9e5b', fontWeight: 600 }}
                    >
                      {isAlert
                        ? '⚠ Alerta de Umbral (Revisión Humana Requerida)'
                        : '✓ Operación Nominal'}
                    </span>
                  </div>
                  <strong style={{ display: 'block', marginTop: '0.25rem' }}>
                    {st.stationName}
                  </strong>
                  <div className="territory-meta tabular-nums" style={{ marginTop: '0.3rem' }}>
                    Parámetro: {st.parameter} · Última lectura:{' '}
                    <strong>
                      {st.lastValue} {st.unit}
                    </strong>{' '}
                    · Umbral crítico:{' '}
                    <strong>
                      {st.thresholdWarning} {st.unit}
                    </strong>
                  </div>
                  <div className="territory-meta tabular-nums" style={{ marginTop: '0.25rem' }}>
                    Invariante Ético: <code>requiresHumanReview: true</code> · Evento SHA-256:{' '}
                    <code>{st.lastEventHash}</code> ·{' '}
                    {new Date(st.lastReceivedAt).toLocaleTimeString('es-AR')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

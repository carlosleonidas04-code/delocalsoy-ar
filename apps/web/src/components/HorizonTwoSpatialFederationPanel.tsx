import { type FormEvent, useMemo, useState } from 'react';
import type { Territorio } from '../App';
import {
  DOMAINS,
  QUARTERS,
  STATUS_META,
  SYNC_PACK_STATUS_META,
  type DomainKey,
  type InterNodeSyncPack,
  type PostgisGeometryType,
  type SpatialGeometryRecord,
  type TemporalQuarterSnapshot,
} from '../data/federatedModel';

interface HorizonTwoSpatialFederationPanelProps {
  territorios: Territorio[];
  spatialGeometries: SpatialGeometryRecord[];
  syncPacks: InterNodeSyncPack[];
  temporalSnapshots: TemporalQuarterSnapshot[];
  onCreateGeometry: (payload: {
    nodeKey: string;
    geometryType: PostgisGeometryType;
    title: string;
    domain: DomainKey;
  }) => Promise<void>;
  onCreateSyncPack: (payload: {
    sourceNodeKey: string;
    targetNodeKey: string;
    domain: DomainKey;
    title: string;
    sharedSummary: string;
    sourceCustodian: string;
  }) => Promise<void>;
  onAckSyncPack: (packId: string, targetCustodianAck: string) => Promise<void>;
  onFocusGeometryOnGoogleMap: (geom: SpatialGeometryRecord) => void;
}

const CUSTODIAN_NAMES: Record<string, string> = {
  community: 'Comunidad',
  institutions: 'Instituciones',
  businesses: 'Comercios / Productores',
};

export function HorizonTwoSpatialFederationPanel({
  territorios,
  spatialGeometries,
  syncPacks,
  temporalSnapshots,
  onCreateGeometry,
  onCreateSyncPack,
  onAckSyncPack,
  onFocusGeometryOnGoogleMap,
}: HorizonTwoSpatialFederationPanelProps) {
  const [activeTab, setActiveTab] = useState<'postgis' | 'federacion' | 'temporal'>('postgis');

  // Filtros PostGIS
  const [nodeFilter, setNodeFilter] = useState<string>('todos');
  const [geomTypeFilter, setGeomTypeFilter] = useState<'all' | 'Polygon' | 'LineString'>('all');
  const [selectedGeomId, setSelectedGeomId] = useState<string | null>(
    spatialGeometries[0]?.id ?? null,
  );

  // Formulario nueva geometría PostGIS
  const [newGeomNodeKey, setNewGeomNodeKey] = useState<string>('capital');
  const [newGeomType, setNewGeomType] = useState<PostgisGeometryType>('Polygon');
  const [newGeomDomain, setNewGeomDomain] = useState<DomainKey>('assets');
  const [newGeomTitle, setNewGeomTitle] = useState<string>('');
  const [submittingGeom, setSubmittingGeom] = useState<boolean>(false);

  // Formulario nuevo paquete de sincronización inter-nodos
  const [sourceNodeKey, setSourceNodeKey] = useState<string>('iglesia');
  const [targetNodeKey, setTargetNodeKey] = useState<string>('caucete');
  const [syncDomain, setSyncDomain] = useState<DomainKey>('production');
  const [syncTitle, setSyncTitle] = useState<string>('');
  const [syncSummary, setSyncSummary] = useState<string>('');
  const [sourceCustodian, setSourceCustodian] = useState<string>('');
  const [submittingPack, setSubmittingPack] = useState<boolean>(false);
  const [custodianAckInputs, setCustodianAckInputs] = useState<Record<string, string>>({});

  // Trimestre activo para Serie Multitemporal
  const [selectedQuarter, setSelectedQuarter] = useState<
    '2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4'
  >('2026-Q4');

  const filteredGeometries = useMemo(() => {
    return spatialGeometries.filter((g) => {
      if (nodeFilter !== 'todos' && g.nodeKey !== nodeFilter) return false;
      if (geomTypeFilter !== 'all' && g.geometryType !== geomTypeFilter) return false;
      return true;
    });
  }, [spatialGeometries, nodeFilter, geomTypeFilter]);

  const selectedGeometry = useMemo(() => {
    return (
      filteredGeometries.find((g) => g.id === selectedGeomId) ??
      filteredGeometries[0] ??
      null
    );
  }, [filteredGeometries, selectedGeomId]);

  const quarterSnapshots = useMemo(() => {
    return temporalSnapshots.filter((s) => s.quarter === selectedQuarter);
  }, [temporalSnapshots, selectedQuarter]);

  const handleCreateGeometrySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newGeomTitle.trim()) return;
    setSubmittingGeom(true);
    try {
      await onCreateGeometry({
        nodeKey: newGeomNodeKey,
        geometryType: newGeomType,
        title: newGeomTitle.trim(),
        domain: newGeomDomain,
      });
      setNewGeomTitle('');
    } finally {
      setSubmittingGeom(false);
    }
  };

  const handleCreateSyncPackSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!syncTitle.trim() || sourceNodeKey === targetNodeKey) return;
    setSubmittingPack(true);
    try {
      await onCreateSyncPack({
        sourceNodeKey,
        targetNodeKey,
        domain: syncDomain,
        title: syncTitle.trim(),
        sharedSummary:
          syncSummary.trim() ||
          'Sincronización inter-nodos con preservación de vocabulario local y custodia compartida.',
        sourceCustodian:
          sourceCustodian.trim() || `Mesa de Custodia Territorial (${sourceNodeKey})`,
      });
      setSyncTitle('');
      setSyncSummary('');
      setSourceCustodian('');
    } finally {
      setSubmittingPack(false);
    }
  };

  const getNodeName = (key: string) =>
    territorios.find((t) => t.key === key)?.nombre ?? key;

  return (
    <section id="horizonte-2" className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            02. Horizonte 2 · Morfología Espacial PostGIS, Custodia Cruzada Inter-Nodos y Evolución Multitemporal
          </span>
          <h2>
            Geometrías PostGIS (SRID=4326), Sincronización Inter-Nodos y Series Trimestrales
          </h2>
          <p className="section-caption">
            El territorio pasa de puntos aislados a corredores (<code>ST_LineString</code>),
            cuencas y zonas de resiliencia (<code>ST_Polygon</code>), vinculados por paquetes federados con custodia cruzada.
          </p>
        </div>

        <div className="filter-group" role="tablist" aria-label="Dimensiones del Horizonte 2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'postgis'}
            className={activeTab === 'postgis' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('postgis')}
          >
            01. Geometrías PostGIS ({spatialGeometries.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'federacion'}
            className={activeTab === 'federacion' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('federacion')}
          >
            02. Custodia Inter-Nodos ({syncPacks.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'temporal'}
            className={activeTab === 'temporal' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('temporal')}
          >
            03. Serie Trimestral (2026-Q1..Q4)
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-VISTA 1: GEOMETRÍAS POSTGIS (ST_LineString & ST_Polygon)
          ===================================================================== */}
      {activeTab === 'postgis' && (
        <div className="h2-workspace">
          <div className="domain-pills-bar">
            <span className="tiny-label">Filtrar por nodo:</span>
            <button
              type="button"
              className={nodeFilter === 'todos' ? 'btn-filter active' : 'btn-filter'}
              onClick={() => setNodeFilter('todos')}
            >
              Todos los nodos
            </button>
            {territorios.map((t) => (
              <button
                key={t.id}
                type="button"
                className={nodeFilter === t.key ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setNodeFilter(t.key)}
              >
                {t.nombre}
              </button>
            ))}

            <span className="tiny-label" style={{ marginLeft: '0.75rem' }}>
              Tipo PostGIS:
            </span>
            {(['all', 'Polygon', 'LineString'] as const).map((gt) => (
              <button
                key={gt}
                type="button"
                className={geomTypeFilter === gt ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setGeomTypeFilter(gt)}
              >
                {gt === 'all' ? 'Todos' : gt === 'Polygon' ? 'ST_Polygon' : 'ST_LineString'}
              </button>
            ))}
          </div>

          <div className="federated-workspace">
            {/* Columna izquierda: Catálogo de geometrías y alta WKT */}
            <div className="federated-sidebar">
              <div className="tiny-label tabular-nums">
                Catálogo espacial SRID=4326 ({filteredGeometries.length} geometrías)
              </div>
              <div className="layers-list">
                {filteredGeometries.map((g) => {
                  const isSel = selectedGeometry?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      className={isSel ? 'layer-btn active' : 'layer-btn'}
                      style={{
                        borderColor: isSel ? g.color : undefined,
                      }}
                      onClick={() => setSelectedGeomId(g.id)}
                    >
                      <div className="layer-btn-main">
                        <span
                          className="layer-check"
                          style={{ background: g.color }}
                        />
                        <span className="layer-name">{g.title}</span>
                      </div>
                      <div className="layer-meta-row tabular-nums">
                        <span>Nodo: {getNodeName(g.nodeKey)}</span>
                        <span aria-hidden="true">·</span>
                        <span>ST_{g.geometryType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{g.metricLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <form className="territory-form" onSubmit={(e) => void handleCreateGeometrySubmit(e)}>
                <div className="tiny-label" style={{ width: '100%' }}>
                  Registrar nueva geometría PostGIS (emite SpatialGeometryCommitted · EV-007)
                </div>
                <select
                  value={newGeomNodeKey}
                  onChange={(e) => setNewGeomNodeKey(e.target.value)}
                  className="compare-select"
                >
                  {territorios.map((t) => (
                    <option key={t.id} value={t.key}>
                      Nodo: {t.nombre}
                    </option>
                  ))}
                </select>
                <select
                  value={newGeomType}
                  onChange={(e) => setNewGeomType(e.target.value as PostgisGeometryType)}
                  className="compare-select"
                >
                  <option value="Polygon">ST_Polygon (Cuenca / Polígono)</option>
                  <option value="LineString">ST_LineString (Corredor / Red)</option>
                </select>
                <select
                  value={newGeomDomain}
                  onChange={(e) => setNewGeomDomain(e.target.value as DomainKey)}
                  className="compare-select"
                >
                  {DOMAINS.map((d) => (
                    <option key={d.key} value={d.key}>
                      Dominio: {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Título (ej. Polígono de Riego Sector Norte)"
                  value={newGeomTitle}
                  onChange={(e) => setNewGeomTitle(e.target.value)}
                  required
                />
                <button type="submit" disabled={submittingGeom}>
                  {submittingGeom ? 'Calculando WKT…' : '+ Trazar geometría SRID=4326'}
                </button>
              </form>
            </div>

            {/* Columna derecha: Visor Topológico Vectorial + Ficha WKT PostGIS */}
            <div className="federated-main">
              <div className="schematic-map-box">
                <div className="schematic-header">
                  <span className="tabular-nums">
                    Visor Topológico PostGIS (SRID=4326) ·{' '}
                    <strong>{filteredGeometries.length}</strong> geometría(s) activas
                  </span>
                  <div className="schematic-legend">
                    <span>Polígono (ST_Polygon)</span>
                    <span aria-hidden="true">·</span>
                    <span>Corredor lineal (ST_LineString)</span>
                  </div>
                </div>

                <svg viewBox="0 0 100 62" className="schematic-svg">
                  {[20, 40, 60, 80].map((g) => (
                    <g key={g} stroke="rgba(148,163,184,0.16)" strokeWidth="0.2">
                      <line x1={g} y1="0" x2={g} y2="62" />
                      <line x1="0" y1={g * 0.62} x2="100" y2={g * 0.62} />
                    </g>
                  ))}

                  {filteredGeometries.map((g) => {
                    const isSel = selectedGeometry?.id === g.id;
                    const pts = g.schematicPath
                      .map((p) => `${p.x},${p.y}`)
                      .join(' ');
                    if (g.geometryType === 'Polygon') {
                      return (
                        <g
                          key={g.id}
                          onClick={() => setSelectedGeomId(g.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <polygon
                            points={pts}
                            fill={g.color}
                            fillOpacity={isSel ? 0.32 : 0.14}
                            stroke={isSel ? '#f5c842' : g.color}
                            strokeWidth={isSel ? '0.8' : '0.45'}
                            strokeDasharray={isSel ? undefined : '1.5 1'}
                          />
                        </g>
                      );
                    }
                    return (
                      <g
                        key={g.id}
                        onClick={() => setSelectedGeomId(g.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <polyline
                          points={pts}
                          fill="none"
                          stroke={isSel ? '#f5c842' : g.color}
                          strokeWidth={isSel ? '1.1' : '0.7'}
                        />
                        {g.schematicPath.map((pt, idx) => (
                          <circle
                            key={`${g.id}-pt-${idx}`}
                            cx={pt.x}
                            cy={pt.y}
                            r={isSel ? 1.5 : 1.0}
                            fill={isSel ? '#f5c842' : g.color}
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {selectedGeometry && (
                <div className="feature-detail-card">
                  <div className="pane-header">
                    <div>
                      <span className="tiny-label">
                        Especificación PostGIS · SRID={selectedGeometry.srid} · Trimestre{' '}
                        {selectedGeometry.quarter}
                      </span>
                      <strong>{selectedGeometry.title}</strong>
                    </div>
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => onFocusGeometryOnGoogleMap(selectedGeometry)}
                    >
                      Proyectar geometría en Google Maps
                    </button>
                  </div>

                  <div className="feature-detail-grid tabular-nums">
                    <div>
                      <span>Nodo custodio:</span>{' '}
                      <strong>{getNodeName(selectedGeometry.nodeKey)}</strong>
                    </div>
                    <div>
                      <span>Tipo espacial:</span>{' '}
                      <code>ST_{selectedGeometry.geometryType}</code>
                    </div>
                    <div>
                      <span>Métrica espacial:</span>{' '}
                      <strong>{selectedGeometry.metricLabel}</strong>
                    </div>
                    <div>
                      <span>Estado epistémico:</span>{' '}
                      <strong
                        style={{
                          color: STATUS_META[selectedGeometry.status]?.color,
                        }}
                      >
                        {STATUS_META[selectedGeometry.status]?.label}
                      </strong>
                    </div>
                    <div>
                      <span>Custodia:</span>{' '}
                      <strong>
                        {selectedGeometry.custodians
                          .map((c) => CUSTODIAN_NAMES[c] ?? c)
                          .join(', ')}
                      </strong>
                    </div>
                    <div>
                      <span>Capa local:</span> <code>{selectedGeometry.layerKey}</code>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <span className="tiny-label">
                      Representación EWKT canónica (PostGIS SRID=4326):
                    </span>
                    <pre>{selectedGeometry.wkt}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VISTA 2: PROTOCOLO DE CUSTODIA CRUZADA E INTERCAMBIO INTER-NODOS
          ===================================================================== */}
      {activeTab === 'federacion' && (
        <div className="h2-workspace">
          <div className="federated-workspace">
            <div className="federated-sidebar">
              <div className="tiny-label">
                Topología de Custodia Cruzada en la Provincia de San Juan (Extensible a Nuevos Departamentos)
              </div>
              <svg viewBox="0 0 100 68" className="schematic-svg">
                {/* Enlaces entre los 3 departamentos de San Juan */}
                <line x1="25" y1="20" x2="75" y2="24" stroke="#2e9e5b" strokeWidth="0.6" />
                <line x1="48" y1="48" x2="75" y2="24" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="1.5 1" />
                <line x1="25" y1="20" x2="48" y2="48" stroke="#38bdf8" strokeWidth="0.6" />

                {/* Nodos Departamentales San Juan */}
                {[
                  { key: 'iglesia', label: 'Iglesia (Cuenca Alta)', x: 25, y: 20, color: '#1D4E89' },
                  { key: 'caucete', label: 'Caucete (Tulum Este)', x: 75, y: 24, color: '#2F7D5B' },
                  { key: 'capital', label: 'Capital (Centro · Desamparados)', x: 48, y: 48, color: '#C2410C' },
                ].map((n) => (
                  <g key={n.key}>
                    <circle cx={n.x} cy={n.y} r="4.2" fill={n.color} />
                    <text
                      x={n.x}
                      y={n.y + 7.5}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="3.2"
                      fontWeight="600"
                    >
                      {n.label}
                    </text>
                  </g>
                ))}
              </svg>

              <form className="territory-form" onSubmit={(e) => void handleCreateSyncPackSubmit(e)}>
                <div className="tiny-label" style={{ width: '100%' }}>
                  Proponer nuevo paquete de sincronización inter-nodos
                </div>
                <select
                  value={sourceNodeKey}
                  onChange={(e) => setSourceNodeKey(e.target.value)}
                  className="compare-select"
                >
                  {territorios.map((t) => (
                    <option key={t.id} value={t.key}>
                      Emisor: {t.nombre}
                    </option>
                  ))}
                </select>
                <select
                  value={targetNodeKey}
                  onChange={(e) => setTargetNodeKey(e.target.value)}
                  className="compare-select"
                >
                  {territorios
                    .filter((t) => t.key !== sourceNodeKey)
                    .map((t) => (
                      <option key={t.id} value={t.key}>
                        Receptor: {t.nombre}
                      </option>
                    ))}
                </select>
                <select
                  value={syncDomain}
                  onChange={(e) => setSyncDomain(e.target.value as DomainKey)}
                  className="compare-select"
                >
                  {DOMAINS.map((d) => (
                    <option key={d.key} value={d.key}>
                      Dominio: {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Título del protocolo inter-nodos…"
                  value={syncTitle}
                  onChange={(e) => setSyncTitle(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Custodio emisor (ej. Junta de Riego Iglesia)"
                  value={sourceCustodian}
                  onChange={(e) => setSourceCustodian(e.target.value)}
                />
                <button type="submit" disabled={submittingPack}>
                  {submittingPack ? 'Emitiendo…' : '+ Emitir paquete federado'}
                </button>
              </form>
            </div>

            <div className="federated-main">
              <div className="tiny-label tabular-nums">
                Paquetes de sincronización federada inter-nodos ({syncPacks.length}) · Verifica EV-008
              </div>

              <div className="reports-list">
                {syncPacks.map((pack) => {
                  const stMeta = SYNC_PACK_STATUS_META[pack.status];
                  return (
                    <div key={pack.id} className="report-card">
                      <div className="report-card-top">
                        <strong>{pack.title}</strong>
                        <span className="status-inline" style={{ color: stMeta.color }}>
                          {stMeta.label}
                        </span>
                      </div>
                      <p className="report-desc">{pack.sharedSummary}</p>

                      <div className="feature-detail-grid tabular-nums" style={{ marginTop: '0.5rem' }}>
                        <div>
                          <span>Nodos vinculados:</span>{' '}
                          <strong>
                            {getNodeName(pack.sourceNodeKey)} ↔ {getNodeName(pack.targetNodeKey)}
                          </strong>
                        </div>
                        <div>
                          <span>Vocabulario nodo emisor:</span>{' '}
                          <code>{pack.sourceVocabularyTerm}</code>
                        </div>
                        <div>
                          <span>Equivalencia nodo receptor:</span>{' '}
                          <code>{pack.targetVocabularyMapping}</code>
                        </div>
                        <div>
                          <span>Hash de integridad:</span> <code>{pack.hash}</code>
                        </div>
                        <div>
                          <span>Custodio emisor:</span> <strong>{pack.sourceCustodian}</strong>
                        </div>
                        <div>
                          <span>Custodio receptor:</span>{' '}
                          <strong>
                            {pack.targetCustodianAck ?? 'Pendiente de firma cruzada'}
                          </strong>
                        </div>
                      </div>

                      {pack.status !== 'federated_active' && (
                        <div className="territory-form" style={{ marginTop: '0.65rem', paddingTop: '0.65rem' }}>
                          <input
                            type="text"
                            placeholder={`Firma custodio receptor (${getNodeName(pack.targetNodeKey)})…`}
                            value={custodianAckInputs[pack.id] ?? ''}
                            onChange={(e) =>
                              setCustodianAckInputs((prev) => ({
                                ...prev,
                                [pack.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void onAckSyncPack(
                                pack.id,
                                custodianAckInputs[pack.id] ||
                                  `Mesa de Custodia de ${getNodeName(pack.targetNodeKey)}`,
                              )
                            }
                          >
                            {pack.status === 'proposed'
                              ? 'Firmar custodia cruzada (EV-008)'
                              : 'Activar sincronización federada'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VISTA 3: SERIE MULTITEMPORAL POR TRIMESTRE (2026-Q1 a 2026-Q4)
          ===================================================================== */}
      {activeTab === 'temporal' && (
        <div className="h2-workspace">
          <div className="domain-pills-bar" role="group" aria-label="Seleccionar trimestre">
            <span className="tiny-label">Corte trimestral de evolución (EV-009):</span>
            {QUARTERS.map((q) => (
              <button
                key={q}
                type="button"
                className={selectedQuarter === q ? 'btn-filter active' : 'btn-filter'}
                onClick={() => setSelectedQuarter(q)}
              >
                {q}
              </button>
            ))}
          </div>

          <ul className="territory-list" style={{ marginTop: '1rem' }}>
            {quarterSnapshots.map((snap) => (
              <li key={`${snap.nodeKey}-${snap.quarter}`} className="territory-item">
                <div className="territory-info">
                  <span className="territory-name">
                    {getNodeName(snap.nodeKey)} ·{' '}
                    <span className="node-subtitle">
                      {snap.quarter} ({snap.label})
                    </span>
                  </span>
                  <span className="territory-meta">{snap.highlight}</span>
                </div>
                <div className="territory-meta tabular-nums">
                  <span>
                    Activos: <strong>{snap.activeAssets}</strong>
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    Problemáticas abiertas: <strong>{snap.openProblems}</strong>
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    Resueltas: <strong style={{ color: '#2e9e5b' }}>{snap.resolvedProblems}</strong>
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    Geometrías PostGIS: <strong>{snap.postgisGeometries}</strong>
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    Paquetes inter-nodos: <strong>{snap.interNodePacksActive}</strong>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

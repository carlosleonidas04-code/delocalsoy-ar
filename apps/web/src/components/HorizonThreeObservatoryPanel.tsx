import { type FormEvent, useState } from 'react';
import type { Territorio } from '../App';
import {
  DOMAINS,
  SYNTHESIS_STATUS_META,
  type DomainKey,
  type FederalSovereigntyRecord,
  type LineageChainStep,
  type MultiScaleSynthesisItem,
} from '../data/federatedModel';

interface HorizonThreeObservatoryPanelProps {
  territorios: Territorio[];
  multiScaleSyntheses: MultiScaleSynthesisItem[];
  lineageChain: LineageChainStep[];
  federalSovereignty: FederalSovereigntyRecord[];
  onCreateSynthesis: (payload: {
    title: string;
    involvedNodes: string[];
    involvedDomains: DomainKey[];
    sugerenciaAccion: string;
  }) => Promise<void>;
  onRatifySynthesis: (
    synthesisId: string,
    ratifiedBy: string,
    ratifiedNote: string,
  ) => Promise<void>;
  onAuditLineage: () => Promise<string>;
  onToggleNodeSovereignty: (nodeKey: string) => Promise<void>;
}

const CUSTODIAN_LABELS: Record<string, string> = {
  community: 'Comunidad',
  institutions: 'Instituciones',
  businesses: 'Comercios / Productores',
};

export function HorizonThreeObservatoryPanel({
  territorios,
  multiScaleSyntheses,
  lineageChain,
  federalSovereignty,
  onCreateSynthesis,
  onRatifySynthesis,
  onAuditLineage,
  onToggleNodeSovereignty,
}: HorizonThreeObservatoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'sintesis' | 'linaje' | 'observatorio'>(
    'sintesis',
  );

  // Estado formulario nueva síntesis multi-escala
  const [synTitle, setSynTitle] = useState('');
  const [synSugerencia, setSynSugerencia] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([
    'capital',
    'caucete',
    'iglesia',
  ]);
  const [selectedDomains, setSelectedDomains] = useState<DomainKey[]>([
    'production',
    'community',
  ]);
  const [submittingSyn, setSubmittingSyn] = useState(false);

  // Estado firma colegiada por síntesis
  const [ratifiedByMap, setRatifiedByMap] = useState<Record<string, string>>({});
  const [ratifiedNoteMap, setRatifiedNoteMap] = useState<Record<string, string>>({});

  // Estado auditoría de linaje
  const [auditResultLog, setAuditResultLog] = useState<string | null>(null);
  const [auditing, setAuditing] = useState(false);

  const toggleNodeSelection = (key: string) => {
    setSelectedNodes((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key],
    );
  };

  const toggleDomainSelection = (key: DomainKey) => {
    setSelectedDomains((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key],
    );
  };

  const handleCreateSynthesisSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!synTitle.trim()) return;
    setSubmittingSyn(true);
    try {
      await onCreateSynthesis({
        title: synTitle.trim(),
        involvedNodes: selectedNodes,
        involvedDomains: selectedDomains,
        sugerenciaAccion:
          synSugerencia.trim() ||
          'Convocar mesa inter-custodios de los nodos involucrados para contrastar evidencias antes de ejecutar acciones.',
      });
      setSynTitle('');
      setSynSugerencia('');
    } finally {
      setSubmittingSyn(false);
    }
  };

  const handleRunAudit = async () => {
    setAuditing(true);
    try {
      const msg = await onAuditLineage();
      setAuditResultLog(msg);
    } finally {
      setAuditing(false);
    }
  };

  const getNodeName = (key: string) =>
    territorios.find((t) => t.key === key)?.nombre ?? key;

  return (
    <section id="horizonte-3" className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            03. Horizonte 3 · Síntesis Multi-Escala Bajo Contrato Ético, Linaje Criptográfico y Observatorio Federal
          </span>
          <h2>
            Inteligencia Territorial Determinista, Cadena de Linaje SHA-256 y Soberanía Departamental en San Juan
          </h2>
          <p className="section-caption">
            Cruce multi-escala de observaciones (H1) y morfologías PostGIS (H2) subordinado al Contrato Ético Tripartito (<code>requiresHumanReview: true</code>), con auditoría criptográfica de extremo a extremo.
          </p>
        </div>

        <div className="filter-group" role="tablist" aria-label="Dimensiones del Horizonte 3">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sintesis'}
            className={activeTab === 'sintesis' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('sintesis')}
          >
            01. Síntesis Multi-Escala ({multiScaleSyntheses.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'linaje'}
            className={activeTab === 'linaje' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('linaje')}
          >
            02. Linaje Criptográfico ({lineageChain.length} eslabones)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'observatorio'}
            className={activeTab === 'observatorio' ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setActiveTab('observatorio')}
          >
            03. Observatorio Federal ({federalSovereignty.length} nodos)
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-VISTA 1: SÍNTESIS MULTI-ESCALA BAJO CONTRATO ÉTICO (EV-011 y EV-013)
          ===================================================================== */}
      {activeTab === 'sintesis' && (
        <div className="h2-workspace">
          <div className="federated-workspace">
            {/* Columna izquierda: Generador determinista de Síntesis Multi-Escala */}
            <div className="federated-sidebar">
              <div className="tiny-label">
                Generador de Síntesis Multi-Escala (Plantilla Auditable H1 + H2 → H3)
              </div>
              <p className="hint" style={{ margin: 0 }}>
                Seleccioná los nodos y dominios a cruzar. El motor ensambla las evidencias de H1 y H2 y genera un borrador bloqueado con <code>requiresHumanReview: true</code>.
              </p>

              <form onSubmit={(e) => void handleCreateSynthesisSubmit(e)}>
                <div className="form-field">
                  <label className="tiny-label">Nodos federados a articular:</label>
                  <div className="filter-group">
                    {territorios.map((t) => {
                      const active = selectedNodes.includes(t.key);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={active ? 'btn-filter active' : 'btn-filter'}
                          onClick={() => toggleNodeSelection(t.key)}
                        >
                          {t.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-field">
                  <label className="tiny-label">Dominios transversales:</label>
                  <div className="filter-group">
                    {DOMAINS.map((d) => {
                      const active = selectedDomains.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          className={active ? 'btn-filter active' : 'btn-filter'}
                          onClick={() => toggleDomainSelection(d.key)}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="territory-form">
                  <input
                    type="text"
                    placeholder="Título de la síntesis multi-escala…"
                    value={synTitle}
                    onChange={(e) => setSynTitle(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Sugerencia sujeta a revisión humana colegiada…"
                    value={synSugerencia}
                    onChange={(e) => setSynSugerencia(e.target.value)}
                  />
                  <button type="submit" disabled={submittingSyn}>
                    {submittingSyn ? 'Sintetizando…' : '+ Generar síntesis bajo Contrato Ético'}
                  </button>
                </div>
              </form>
            </div>

            {/* Columna derecha: Matrices de Síntesis Multi-Escala y Ratificación Colegiada */}
            <div className="federated-main">
              <div className="tiny-label tabular-nums">
                Matrices de síntesis multi-nodo activas ({multiScaleSyntheses.length}) · Verifica EV-011 y EV-013
              </div>

              <div className="reports-list">
                {multiScaleSyntheses.map((syn) => {
                  const stMeta = SYNTHESIS_STATUS_META[syn.status];
                  return (
                    <div key={syn.id} className="report-card">
                      <div className="report-card-top">
                        <div>
                          <code>{syn.code}</code> · <strong>{syn.title}</strong>
                        </div>
                        <span className="status-inline" style={{ color: stMeta.color }}>
                          {stMeta.label}
                        </span>
                      </div>

                      <div className="territory-meta tabular-nums" style={{ marginTop: '0.3rem' }}>
                        Nodos: <strong>{syn.involvedNodes.map(getNodeName).join(' ↔ ')}</strong> ·
                        Dominios: <code>{syn.involvedDomains.join(', ')}</code> · Raíz SHA-256:{' '}
                        <code>{syn.lineageRootHash}</code>
                      </div>

                      <div className="ethical-steps" style={{ marginTop: '0.75rem' }}>
                        <div className="ethical-step">
                          <div className="ethical-tag tag-dato">
                            01. Dato Multi-Nodo (Evidencia H1 + H2)
                          </div>
                          <p className="tabular-nums">{syn.datoSummary}</p>
                          <div className="territory-meta">
                            Features: <code>{syn.datoImmutableRefs.featureIds.join(', ')}</code> ·
                            PostGIS:{' '}
                            <code>
                              {syn.datoImmutableRefs.geometryIds.join(', ') || 'ninguna'}
                            </code>{' '}
                            · SyncPacks:{' '}
                            <code>
                              {syn.datoImmutableRefs.syncPackIds.join(', ') || 'ninguno'}
                            </code>
                          </div>
                        </div>

                        <div className="ethical-step">
                          <div className="ethical-tag tag-interpretacion">
                            02. Interpretación Multi-Escala (Provisional)
                          </div>
                          <p>{syn.interpretacionProvisional}</p>
                          <div className="territory-meta">{syn.interpretacionRule}</div>
                        </div>

                        <div className="ethical-step">
                          <div className="ethical-tag tag-sugerencia">
                            03. Sugerencia Sujeta a Revisión Humana Colegiada
                          </div>
                          <p>{syn.sugerenciaAccion}</p>
                          <div className="territory-meta">
                            Invariante: <code>requiresHumanReview: true</code>
                            {syn.ratifiedBy && (
                              <>
                                {' '}
                                · Ratificado por: <strong>{syn.ratifiedBy}</strong> (
                                {syn.ratifiedNote})
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {syn.status !== 'sealed_in_observatory' && (
                        <div
                          className="territory-form"
                          style={{ marginTop: '0.75rem', paddingTop: '0.75rem' }}
                        >
                          <input
                            type="text"
                            placeholder="Órgano / Mesa humana firmante (ej. Mesa Colegiada San Juan · Capital-Caucete-Iglesia)…"
                            value={ratifiedByMap[syn.id] ?? ''}
                            onChange={(e) =>
                              setRatifiedByMap((prev) => ({
                                ...prev,
                                [syn.id]: e.target.value,
                              }))
                            }
                          />
                          <input
                            type="text"
                            placeholder="Dictamen / nota de revisión humana colegiada…"
                            value={ratifiedNoteMap[syn.id] ?? ''}
                            onChange={(e) =>
                              setRatifiedNoteMap((prev) => ({
                                ...prev,
                                [syn.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void onRatifySynthesis(
                                syn.id,
                                ratifiedByMap[syn.id] ||
                                  `Mesa Colegiada (${syn.involvedNodes.map(getNodeName).join(' - ')})`,
                                ratifiedNoteMap[syn.id] ||
                                  'Contraste humano completado conforme al Contrato Ético Tripartito.',
                              )
                            }
                          >
                            {syn.status === 'draft_requires_human'
                              ? 'Ratificar síntesis humana (EV-011)'
                              : 'Sellar acta en Observatorio Federal'}
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
          SUB-VISTA 2: AUDITORÍA CRIPTOGRÁFICA DE LINAJE COMPLETO (EV-012)
          ===================================================================== */}
      {activeTab === 'linaje' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '1rem' }}>
            <div>
              <span className="tiny-label tabular-nums">
                Cadena Criptográfica de Linaje SHA-256 ({lineageChain.length} eslabones encadenados: H1 → H2 → H3)
              </span>
              <p className="hint" style={{ margin: 0 }}>
                Cada eslabón incluye el <code>parentHash</code> del eslabón previo, garantizando que ningún documento o sugerencia del Horizonte 3 exista desconectado de su evidencia en <code>events_raw</code>.
              </p>
            </div>
            <button
              type="button"
              className="btn-confirm"
              onClick={() => void handleRunAudit()}
              disabled={auditing}
            >
              {auditing
                ? 'Auditando hashes…'
                : 'Ejecutar auditoría criptográfica de linaje (EV-012)'}
            </button>
          </div>

          {auditResultLog && <pre className="idempotency-log">{auditResultLog}</pre>}

          <ul className="territory-list" style={{ marginTop: '1rem' }}>
            {lineageChain.map((step) => (
              <li key={`${step.stepIndex}-${step.currentHash}`} className="territory-item">
                <div className="territory-info">
                  <span className="territory-name tabular-nums">
                    <code>{step.horizon}</code> · {step.stageLabel}
                  </span>
                  <span className="territory-meta">{step.summary}</span>
                  <span className="territory-meta tabular-nums">
                    Evento: <code>{step.eventType}</code> · Entidad:{' '}
                    <code>{step.entityId}</code> · Ámbito: <strong>{step.nodeKey}</strong>
                  </span>
                </div>
                <div className="territory-info tabular-nums" style={{ textAlign: 'right' }}>
                  <span className="territory-meta">
                    parentHash: <code>{step.parentHash}</code>
                  </span>
                  <span className="territory-meta">
                    currentHash: <code>{step.currentHash}</code>
                  </span>
                  <span
                    className="territory-meta"
                    style={{ color: step.verified ? '#2e9e5b' : '#d99b26', fontWeight: 600 }}
                  >
                    {step.verified ? 'Eslabón SHA-256 íntegro' : 'Pendiente de verificación'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* =====================================================================
          SUB-VISTA 3: OBSERVATORIO FEDERAL Y PACTO DE SOBERANÍA DE DATOS (EV-014)
          ===================================================================== */}
      {activeTab === 'observatorio' && (
        <div className="h2-workspace">
          <div className="pane-header" style={{ marginTop: '1rem' }}>
            <div>
              <span className="tiny-label">
                Pacto de Soberanía de Datos del Observatorio Provincial San Juan · Extensible a Nuevos Nodos (EV-014)
              </span>
              <p className="hint" style={{ margin: 0 }}>
                Cada nodo conserva la titularidad de su vocabulario y sus capas explícitas: puede alternar en cualquier momento entre delegación federal revocable y custodia local estricta.
              </p>
            </div>
          </div>

          <ul className="territory-list" style={{ marginTop: '1rem' }}>
            {federalSovereignty.map((node) => {
              const isDelegated =
                node.sovereigntyMode === 'delegacion_revocable_activa';
              return (
                <li key={node.nodeKey} className="territory-item">
                  <div className="territory-info">
                    <span className="territory-name">
                      {node.nodeName}{' '}
                      <span className="node-subtitle">· Provincia de {node.provincia}</span>
                    </span>
                    <span className="territory-meta tabular-nums">
                      Custodios activos:{' '}
                      <strong>
                        {node.custodiansActive
                          .map((c) => CUSTODIAN_LABELS[c] ?? c)
                          .join(', ')}
                      </strong>{' '}
                      · Capas federadas: <strong>{node.sharedLayersCount}</strong> · Geometrías
                      PostGIS: <strong>{node.postgisCount}</strong> · Paquetes inter-nodos:{' '}
                      <strong>{node.syncPacksCount}</strong>
                    </span>
                    <span className="territory-meta tabular-nums">
                      Merkle Root del Nodo: <code>{node.nodeMerkleRoot}</code> · Régimen:{' '}
                      <strong style={{ color: isDelegated ? '#2e9e5b' : '#38bdf8' }}>
                        {isDelegated
                          ? 'Delegación Federal Revocable Activa'
                          : 'Custodia Local Estricta (Solo Metadatos)'}
                      </strong>
                    </span>
                  </div>
                  <div className="territory-actions">
                    <button
                      type="button"
                      className="btn-toggle"
                      onClick={() => void onToggleNodeSovereignty(node.nodeKey)}
                    >
                      {isDelegated
                        ? 'Pasar a Custodia Local Estricta'
                        : 'Activar Delegación Federal'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

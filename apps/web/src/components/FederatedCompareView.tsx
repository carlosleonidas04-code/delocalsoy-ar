import { useState } from 'react';
import {
  DOMAINS,
  STATUS_META,
  type DomainKey,
  type SpatialGeometryRecord,
  type TerritorioFeature,
  type TerritorioLayer,
} from '../data/federatedModel';
import type { Territorio } from '../App';

interface FederatedCompareViewProps {
  territorios: Territorio[];
  layersByNode: Record<string, TerritorioLayer[]>;
  features: TerritorioFeature[];
  spatialGeometries?: SpatialGeometryRecord[];
  onInspectNode?: (nodeKey: string) => void;
}

const CUSTODIAN_LABELS: Record<string, string> = {
  community: 'Comunidad',
  institutions: 'Instituciones',
  businesses: 'Comercios / Productores',
};

export function FederatedCompareView({
  territorios,
  layersByNode,
  features,
  spatialGeometries = [],
  onInspectNode,
}: FederatedCompareViewProps) {
  const [nodeKeyA, setNodeKeyA] = useState<string>(territorios[0]?.key ?? 'capital');
  const [nodeKeyB, setNodeKeyB] = useState<string>(territorios[1]?.key ?? 'caucete');
  const [domain, setDomain] = useState<DomainKey>('problems');

  const nodeA = territorios.find((t) => t.key === nodeKeyA) ?? territorios[0];
  const nodeB = territorios.find((t) => t.key === nodeKeyB) ?? territorios[1] ?? territorios[0];

  const domainLabel = DOMAINS.find((d) => d.key === domain)?.label ?? domain;

  return (
    <section id="comparacion-federada" className="card" data-state="ok">
      <div className="section-header">
        <div>
          <span className="kicker-text">
            02. Comparabilidad sin Homogeneización · Demo Base + PostGIS + R5-UI
          </span>
          <h2>Comparación Federada — Misma lectura, dos departamentos de San Juan</h2>
          <p className="section-caption">
            Los 7 dominios transversales permiten comparar <strong>Capital</strong>,{' '}
            <strong>Caucete</strong> e <strong>Iglesia</strong> sin uniformar ni forzar el
            vocabulario local de cada nodo.
          </p>
        </div>
      </div>

      <div className="domain-pills-bar" role="group" aria-label="Seleccionar dominio transversal">
        <span className="tiny-label">Dominio transversal:</span>
        {DOMAINS.map((d) => (
          <button
            key={d.key}
            type="button"
            className={domain === d.key ? 'btn-filter active' : 'btn-filter'}
            onClick={() => setDomain(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="compare-grid">
        {[
          { node: nodeA, side: 'A', onChange: setNodeKeyA, otherKey: nodeB?.key },
          { node: nodeB, side: 'B', onChange: setNodeKeyB, otherKey: nodeA?.key },
        ].map(({ node, side, onChange, otherKey }) => {
          if (!node) return null;
          const layersInDomain = (layersByNode[node.key] ?? []).filter(
            (l) => l.domain === domain,
          );
          const featuresInDomain = features.filter(
            (f) => f.nodeKey === node.key && f.domain === domain,
          );
          const geomsInDomain = spatialGeometries.filter(
            (g) => g.nodeKey === node.key && g.domain === domain,
          );
          const assetsInDomain = featuresInDomain.filter(
            (f) => f.type === 'asset',
          ).length;
          const problemsInDomain = featuresInDomain.filter(
            (f) => f.type === 'problem',
          ).length;
          const assetsPct =
            featuresInDomain.length > 0
              ? Math.round((assetsInDomain / featuresInDomain.length) * 100)
              : 50;

          return (
            <div key={side} className="compare-column">
              <div className="compare-col-header">
                <div className="node-card-header">
                  <span
                    className="node-dot"
                    style={{ background: node.color || 'var(--brand-primary)' }}
                  />
                  <strong>{node.nombre}</strong>
                  <span className="node-subtitle">· {node.foco}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <select
                    value={node.key}
                    onChange={(e) => onChange(e.target.value)}
                    className="compare-select"
                  >
                    {territorios
                      .filter((t) => t.key !== otherKey)
                      .map((t) => (
                        <option key={t.id} value={t.key}>
                          {t.nombre} ({t.provincia})
                        </option>
                      ))}
                  </select>
                  {onInspectNode && (
                    <button
                      type="button"
                      className="btn-toggle"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                      onClick={() => onInspectNode(node.key)}
                    >
                      Ficha
                    </button>
                  )}
                </div>
              </div>

              <div className="compare-col-body">
                <div className="compare-summary-row tabular-nums">
                  <span>
                    Capas del dominio <strong>{domainLabel}</strong>:
                  </span>
                  <strong>
                    {layersInDomain.length} capa(s) · {featuresInDomain.length} registro(s) ·{' '}
                    {geomsInDomain.length} WKT
                  </strong>
                </div>

                {/* Barra de proporción Activos vs Problemáticas en este dominio */}
                {featuresInDomain.length > 0 && (
                  <div className="demo-ratio-block tabular-nums">
                    <div className="demo-ratio-labels">
                      <span>Activos en dominio ({assetsInDomain})</span>
                      <span>Problemáticas en dominio ({problemsInDomain})</span>
                    </div>
                    <div className="demo-ratio-bar">
                      <div
                        className="demo-ratio-fill-assets"
                        style={{ width: `${assetsPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {layersInDomain.length === 0 ? (
                  <div className="sovereignty-notice">
                    Este nodo no activa el dominio <strong>“{domainLabel}”</strong>. La
                    federación respeta el vocabulario local: no se fuerza la capa.
                  </div>
                ) : (
                  <div className="territory-meta">
                    Capas declaradas:{' '}
                    {layersInDomain.map((l, idx) => (
                      <span key={l.key}>
                        {idx > 0 ? ' · ' : ''}
                        <strong>{l.name}</strong> (<code>{l.geometry}</code> · Custodia:{' '}
                        {l.producedBy.map((p) => CUSTODIAN_LABELS[p] ?? p).join(', ')})
                      </span>
                    ))}
                  </div>
                )}

                {featuresInDomain.length > 0 && (
                  <ul className="territory-list" style={{ marginTop: '0.75rem' }}>
                    {featuresInDomain.map((f) => {
                      const st = STATUS_META[f.status] ?? STATUS_META.pending;
                      return (
                        <li key={f.id} className="territory-item">
                          <div className="territory-info">
                            <span className="territory-name">{f.title}</span>
                            <span className="territory-meta">
                              {f.sourceLabel} · <code>{f.layer}</code> ·{' '}
                              <span style={{ color: st.color }}>{st.label}</span>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

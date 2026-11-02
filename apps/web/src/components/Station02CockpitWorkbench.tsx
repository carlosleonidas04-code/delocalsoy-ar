/**
 * DELocalSoy.AR — Laboratorio Detallado en Vivo de la Estación 02 del Estudio
 * de Diseño Heurístico: Cockpit Integrado «Coco-Baba» (Demo Base + Ecosistema
 * General) — FE-DEUDA-02 #293 (corte 15 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * las 4 macro-pestañas rescatadas del Demo Base (Matriz federada 7×3 con
 * Soberanía Semántica, Explorar Nodo con lienzo esquemático (x, y) ↔ PostGIS
 * SRID=4326, Comparar Nodos y Flujo de 5 Pasos + Contrato delocalsoy.node.v2).
 * Acoples por props: estado de App compartido con LensOneAtlasWorkbench y la
 * Estación 05 (externalCockpitMacroView/externalCustodianFilter/selectedNodeKey)
 * más territoriosItems, spatialGeometries y onFocusOnGoogleMap.
 */
import type { Territorio } from '../App';
import type { SpatialGeometryRecord } from '../data/federatedModel';
import type { CockpitMacroView } from './LensOneAtlasWorkbench';

type CustodianFilter = 'all' | 'community' | 'institutions' | 'businesses';

export interface Station02CockpitWorkbenchProps {
  selectedNodeKey: string;
  onSelectNodeKey: (nodeKey: string) => void;
  externalCockpitMacroView: CockpitMacroView;
  onSelectCockpitMacroView: (view: CockpitMacroView) => void;
  externalCustodianFilter: CustodianFilter;
  onSelectCustodianFilter: (filter: CustodianFilter) => void;
  territoriosItems: Territorio[];
  spatialGeometries: SpatialGeometryRecord[];
  onFocusOnGoogleMap: (territorioId: string) => void;
}

export function Station02CockpitWorkbench({
  selectedNodeKey,
  onSelectNodeKey,
  externalCockpitMacroView,
  onSelectCockpitMacroView,
  externalCustodianFilter,
  onSelectCustodianFilter,
  territoriosItems,
  spatialGeometries,
  onFocusOnGoogleMap,
}: Station02CockpitWorkbenchProps) {
  return (
    <div
      data-testid="station-02-coco-baba-workbench"
      style={{
        marginTop: '0.85rem',
        paddingTop: '0.85rem',
        borderTop: '1px solid var(--color-border-hairline)',
      }}
    >
      <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
        <div>
          <span className="tiny-label">
            ESTACIÓN 02 EN DETALLE · COCKPIT INTEGRADO «COCO-BABA» (DEMO BASE + ECOSISTEMA GENERAL · PIZARRA ANDINA)
          </span>
          <strong>
            Control Remoto en Vivo de las 4 Vistas del Demo Base, Filtro por Custodio Tripartito y Dualidad Espacial (x, y) ↔ PostGIS SRID=4326
          </strong>
        </div>
        <span className="territory-meta tabular-nums">
          Nodo activo:{' '}
          <strong className={`token-node-tag-${selectedNodeKey}`}>
            {selectedNodeKey.toUpperCase()}
          </strong>{' '}
          · Vista Cockpit:{' '}
          <code>{externalCockpitMacroView}</code>
        </span>
      </div>

      <div className="coco-baba-triage-grid">
        {/* A. Conmutador de las 4 Vistas Canónicas del Demo Base */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            A. Las 4 Vistas Rescatadas del Demo Base (Conmutación en 1 Clic)
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.38rem',
              marginTop: '0.35rem',
            }}
          >
            {(
              [
                {
                  key: 'federated_matrix',
                  title: '01. Vista Federada & Matriz 7×3',
                  desc: 'Soberanía Semántica y barra Activos vs Problemáticas en los 3 departamentos.',
                },
                {
                  key: 'node_explorer',
                  title: '02. Explorar Nodo & Mapa (x, y)',
                  desc: 'Capas por custodio, lienzo esquemático interactivo, reportes y galería verificada.',
                },
                {
                  key: 'compare_nodes',
                  title: '03. Comparar Nodos Lado a Lado',
                  desc: 'Comparador transversal sin homogeneización forzada por dominio.',
                },
                {
                  key: 'architecture_contract',
                  title: '04. Flujo de 5 Pasos & Contrato JSON',
                  desc: 'Recorrido events_raw → Contratos → PostGIS → Push FCM → Evidencia + delocalsoy.node.v2.',
                },
              ] as const
            ).map((mv) => (
              <button
                key={mv.key}
                type="button"
                onClick={() => {
                  onSelectCockpitMacroView(mv.key);
                  setTimeout(() => {
                    document
                      .getElementById('nodos-federados')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 40);
                }}
                style={{
                  textAlign: 'left',
                  padding: '0.45rem 0.65rem',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border:
                    externalCockpitMacroView === mv.key
                      ? '1px solid var(--color-accent-primary)'
                      : '1px solid var(--color-border-hairline)',
                  background:
                    externalCockpitMacroView === mv.key
                      ? 'var(--color-accent-subtle)'
                      : 'var(--color-bg-surface)',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <div className="event-row-top">
                  <strong style={{ fontSize: '0.82rem' }}>{mv.title}</strong>
                  {externalCockpitMacroView === mv.key && (
                    <span className="r5-state-badge r5-state-publicado">
                      ACTIVA
                    </span>
                  )}
                </div>
                <span
                  className="territory-meta"
                  style={{ display: 'block', fontSize: '0.74rem', marginTop: '0.15rem' }}
                >
                  {mv.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* B. Selector de Departamento de San Juan + Filtro de Custodio Tripartito */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            B. Custodia Tripartita y Capas por Departamento (H-TER-06)
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              marginTop: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
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
                    selectedNodeKey === nd.key
                      ? 'btn-filter active'
                      : 'btn-filter'
                  }
                  onClick={() => {
                    onSelectNodeKey(nd.key);
                    onSelectCockpitMacroView('node_explorer');
                  }}
                >
                  {nd.label}
                </button>
              ))}
            </div>

            <span className="tiny-label" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
              Filtrar capas producidas por custodio:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {(
                [
                  { key: 'all', label: 'Todos los custodios' },
                  { key: 'community', label: 'Comunidad' },
                  { key: 'institutions', label: 'Instituciones' },
                  { key: 'businesses', label: 'Comercios / Prod.' },
                ] as const
              ).map((cf) => (
                <button
                  key={cf.key}
                  type="button"
                  className={
                    externalCustodianFilter === cf.key
                      ? 'btn-filter active'
                      : 'btn-filter'
                  }
                  onClick={() => {
                    onSelectCustodianFilter(cf.key);
                    onSelectCockpitMacroView('node_explorer');
                    setTimeout(() => {
                      document
                        .getElementById('nodos-federados')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 40);
                  }}
                >
                  {cf.label}
                </button>
              ))}
            </div>

            <div
              className="tabular-nums"
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-xs, 4px)',
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--color-border-hairline)',
                fontSize: '0.76rem',
              }}
            >
              Capas del nodo <strong>{selectedNodeKey.toUpperCase()}</strong>:{' '}
              <strong>{(layersByNode[selectedNodeKey] ?? []).length}</strong> · Registros activos:{' '}
              <strong>
                {features.filter((f) => f.nodeKey === selectedNodeKey).length}
              </strong>{' '}
              · Reportes ciudadanos:{' '}
              <strong>
                {reports.filter((r) => r.nodeKey === selectedNodeKey).length}
              </strong>
            </div>
          </div>
        </div>

        {/* C. Dualidad Espacial Simbólico-Geodésica (H-TER-04) y Triage Coco-Baba */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            C. Dualidad Simbólico-Geodésica (H-TER-04) &amp; Triage «Coco-Baba»
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.42rem',
              marginTop: '0.35rem',
            }}
          >
            <p className="territory-meta" style={{ margin: 0 }}>
              El Cockpit «Coco-Baba» une el <strong>lienzo esquemático local <code>(x, y)</code></strong> del Demo Base con las <strong>geometrías PostGIS <code>SRID=4326</code></strong> e índice GiST de producción.
            </p>
            <div
              className="tabular-nums"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '0.4rem 0.55rem',
                borderRadius: 'var(--radius-xs, 4px)',
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--color-border-hairline)',
              }}
            >
              Geometrías PostGIS en {selectedNodeKey.toUpperCase()}:{' '}
              <strong>
                {
                  spatialGeometries.filter(
                    (g) => g.nodeKey === selectedNodeKey,
                  ).length
                }
              </strong>{' '}
              (ST_Polygon / ST_LineString · SRID=4326)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              <button
                type="button"
                className="btn-confirm"
                onClick={() => {
                  const el = document.getElementById('nodos-federados');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Ir al Cockpit «Coco-Baba» ↓
              </button>
              <button
                type="button"
                className="btn-toggle"
                onClick={() => {
                  const nodeObj = territoriosItems.find(
                    (t) => t.key === selectedNodeKey,
                  );
                  if (nodeObj) {
                    handleFocusOnGoogleMap(nodeObj.id);
                  }
                }}
              >
                Proyectar en Google Maps (SRID=4326) ↓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

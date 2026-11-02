/**
 * DELocalSoy.AR — Mesa Operativa en Vivo · Lente I: Atlas & Cockpit «Coco-Baba»
 * (Demo Base + Cartografía SRID=4326) del Estudio de Diseño Heurístico y
 * Recursivo (ADR-034) — FE-DEUDA-02 #293 (corte 8 de desmonolitización de
 * App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): mismas
 * 3 tarjetas del triage (nodo territorial activo + ficha modal, 4 macro-vistas
 * del Demo Base, navegación directa a las 4 secciones enfocadas) y mismos
 * saltos hacia Lente II / Estación 05. El estado compartido permanece en App y
 * sus setters se acoplan por props.
 */
import { type DesignLensKey } from './CognitiveLensSelector';

export type CockpitMacroView =
  | 'federated_matrix'
  | 'node_explorer'
  | 'compare_nodes'
  | 'architecture_contract';

type PlatformTerritoryFilter =
  | 'all'
  | 'gran-san-juan-capital'
  | 'caucete'
  | 'iglesia';

export interface LensOneAtlasWorkbenchProps {
  selectedNodeKey: string;
  externalCockpitMacroView: CockpitMacroView;
  onSelectNodeKey: (key: string) => void;
  onInspectNode: (key: string) => void;
  onSelectCockpitMacroView: (view: CockpitMacroView) => void;
  onFilterPlatformTerritory: (territory: PlatformTerritoryFilter) => void;
  onFocusInspectionStation: (station: number) => void;
  onSelectRecursiveLink: (idx: number) => void;
  onSelectDesignLens: (lens: DesignLensKey) => void;
}

export function LensOneAtlasWorkbench({
  selectedNodeKey,
  externalCockpitMacroView,
  onSelectNodeKey,
  onInspectNode,
  onSelectCockpitMacroView,
  onFilterPlatformTerritory,
  onFocusInspectionStation,
  onSelectRecursiveLink,
  onSelectDesignLens,
}: LensOneAtlasWorkbenchProps) {
  return (
    <div
      id="lens-01-atlas-coco-baba-workbench"
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
            Lente I Activa · Demo Base + Cartografía PostGIS `SRID=4326` · Pizarra Andina (`#0B111E`)
          </span>
          <strong style={{ display: 'block', fontSize: '1rem' }}>
            Atlas &amp; Cockpit «Coco-Baba» — Soberanía Semántica en Capital (`Centro · Desamparados`), Caucete e Iglesia
          </strong>
        </div>
        <div className="filter-group">
          <span className="r5-state-badge r5-state-publicado tabular-nums">
            Lente I Enfocada · 4 Módulos Visibles
          </span>
          <button
            type="button"
            className="btn-confirm"
            onClick={() => {
              const mappedTerritory =
                selectedNodeKey === 'capital'
                  ? 'gran-san-juan-capital'
                  : selectedNodeKey === 'caucete'
                    ? 'caucete'
                    : 'iglesia';
              onFilterPlatformTerritory(mappedTerritory);
              onFocusInspectionStation(2);
              onSelectRecursiveLink(2);
              onSelectDesignLens('lens_vertical_r5ui');
            }}
          >
            Pasar a Lente II con Nodo {selectedNodeKey.toUpperCase()} →
          </button>
          <button
            type="button"
            className="btn-toggle"
            onClick={() => {
              onFocusInspectionStation(4);
              onSelectRecursiveLink(4);
              onSelectDesignLens('lens_epistemic_contracts');
              setTimeout(() => {
                document
                  .getElementById('station-05-prisma-models-audit')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 40);
            }}
          >
            Ir a Estación 05 (Validador Prisma Pre-C5) →
          </button>
        </div>
      </div>

      <div className="coco-baba-triage-grid">
        {/* 1. Selector de Departamento de San Juan y Ficha Modal */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            1. Nodo Territorial Activo (Provincia de San Juan · ADR-021)
          </span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.35rem',
              marginTop: '0.35rem',
            }}
          >
            {(
              [
                {
                  key: 'capital',
                  label: 'Capital (Centro · Desamparados)',
                },
                {
                  key: 'caucete',
                  label: 'Caucete (Oasis Tulúm)',
                },
                {
                  key: 'iglesia',
                  label: 'Iglesia (Valle Cordillerano)',
                },
              ] as const
            ).map((nd) => (
              <button
                key={nd.key}
                type="button"
                className={
                  selectedNodeKey === nd.key
                    ? 'btn-filter active'
                    : 'btn-toggle'
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
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.35rem',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              className="btn-confirm"
              onClick={() => {
                document
                  .getElementById('nodos-federados')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Ir al Cockpit «Coco-Baba» ↓
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => onInspectNode(selectedNodeKey)}
            >
              Abrir Ficha Modal ({selectedNodeKey.toUpperCase()})
            </button>
          </div>
        </div>

        {/* 2. Selector de Macro-Vista del Cockpit Coco-Baba */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            2. Las 4 Macro-Vistas del Demo Base Integrado
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.35rem',
              marginTop: '0.35rem',
            }}
          >
            {(
              [
                {
                  key: 'federated_matrix',
                  label: '01. Matriz 7×3',
                },
                {
                  key: 'node_explorer',
                  label: '02. Explorar Nodo (x,y)',
                },
                {
                  key: 'compare_nodes',
                  label: '03. Comparar Nodos',
                },
                {
                  key: 'architecture_contract',
                  label: '04. Flujo 5 Pasos & JSON',
                },
              ] as const
            ).map((mv) => (
              <button
                key={mv.key}
                type="button"
                className={
                  externalCockpitMacroView === mv.key
                    ? 'btn-filter active'
                    : 'btn-toggle'
                }
                onClick={() => {
                  onSelectCockpitMacroView(mv.key);
                  document
                    .getElementById('nodos-federados')
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                }}
              >
                {mv.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Navegación Directa a las 4 Secciones enfocadas por Lente I */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            3. Secciones Enfocadas por Lente I (H-TER-03 · Cero Fatiga Lineal)
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.35rem',
              marginTop: '0.35rem',
            }}
          >
            <button
              type="button"
              className="btn-toggle"
              onClick={() => {
                document
                  .getElementById('nodos-federados')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              1. Cockpit «Coco-Baba» ↓
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => {
                document
                  .getElementById('comparacion-federada')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              2. Comparador Transversal ↓
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => {
                document
                  .getElementById('registro-maestro-nodos')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              3. Registro /api/territorios ↓
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => {
                document
                  .getElementById('cartografia-workspace')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              4. Google Maps SRID=4326 ↓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

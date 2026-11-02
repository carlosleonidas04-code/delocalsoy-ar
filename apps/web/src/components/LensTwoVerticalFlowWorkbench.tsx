/**
 * DELocalSoy.AR — Mesa Operativa en Vivo · Lente II: Flujo Vertical (13 Módulos
 * + 11 Eslabones) y Estados R5-UI del Estudio de Diseño Heurístico y Recursivo
 * (ADR-034) — FE-DEUDA-02 #293 (corte 9 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): mismo
 * puente territorial Lente I <-> Lente II, mismas 6 vistas operativas de los 13
 * módulos y mismas pruebas en vivo de honestidad R5. El estado compartido
 * permanece en App y sus setters se acoplan por props.
 */
import { type DesignLensKey } from './CognitiveLensSelector';

type PlatformTerritoryFilter =
  | 'all'
  | 'gran-san-juan-capital'
  | 'caucete'
  | 'iglesia';

type PlatformSection =
  | 'flujo-vertical'
  | 'directorio-red'
  | 'marketplace'
  | 'participacion'
  | 'espacio-ambiente-eventos'
  | 'inteligencia-y-modulos';

export interface LensTwoVerticalFlowWorkbenchProps {
  externalPlatformTerritoryFilter: PlatformTerritoryFilter;
  externalPlatformSection: PlatformSection;
  operationalOriginLabel: string;
  onFilterPlatformTerritory: (territory: PlatformTerritoryFilter) => void;
  onSelectNodeKey: (key: string) => void;
  onSelectPlatformSection: (section: PlatformSection) => void;
  onFocusInspectionStation: (station: number) => void;
  onSelectRecursiveLink: (idx: number) => void;
  onSelectDesignLens: (lens: DesignLensKey) => void;
}

export function LensTwoVerticalFlowWorkbench({
  externalPlatformTerritoryFilter,
  externalPlatformSection,
  operationalOriginLabel,
  onFilterPlatformTerritory,
  onSelectNodeKey,
  onSelectPlatformSection,
  onFocusInspectionStation,
  onSelectRecursiveLink,
  onSelectDesignLens,
}: LensTwoVerticalFlowWorkbenchProps) {
  return (
    <div
      id="lens-02-vertical-r5ui-workbench"
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
            Lente II Activa · 13 Módulos de Dominio + Cadena de 11 Eslabones (`Fase 0 #87`) + Máquina de 5 Estados `R5-UI` (`#109`) · Pizarra Andina (`#0B111E`)
          </span>
          <strong style={{ display: 'block', fontSize: '1rem' }}>
            Flujo Vertical E2E, Honestidad `IDataSource` (`Regla R5`) y Serie Trimestral (`2026-Q1..Q4`) en Capital (`Centro · Desamparados`), Caucete e Iglesia
          </strong>
        </div>
        <div className="filter-group">
          <button
            type="button"
            className="btn-toggle"
            onClick={() => {
              onFocusInspectionStation(1);
              onSelectRecursiveLink(0);
              onSelectDesignLens('lens_atlas_coco_baba');
            }}
          >
            ← Volver a Lente I (Atlas «Coco-Baba»)
          </button>
          <span className="r5-state-badge r5-state-publicado tabular-nums">
            Lente II Enfocada · Origen: {operationalOriginLabel}
          </span>
          <button
            type="button"
            className="btn-confirm"
            onClick={() => {
              onFocusInspectionStation(3);
              onSelectRecursiveLink(3);
              onSelectDesignLens('lens_sovereignty_fcm');
            }}
          >
            Pasar a Lente III (Soberanía, PostGIS &amp; Push FCM) →
          </button>
        </div>
      </div>

      <div className="coco-baba-triage-grid">
        {/* 1. Puente Territorial Lente I <-> Lente II y Selector de Nodo */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            1. Puente Territorial `Lente I ↔ Lente II` (Filtro Sincronizado por Nodo)
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
                  filter: 'all',
                  node: null,
                  label: 'Todos (3 Nodos)',
                },
                {
                  filter: 'gran-san-juan-capital',
                  node: 'capital',
                  label: 'Capital (Centro · Desamp.)',
                },
                {
                  filter: 'caucete',
                  node: 'caucete',
                  label: 'Caucete (Oasis Tulúm)',
                },
                {
                  filter: 'iglesia',
                  node: 'iglesia',
                  label: 'Iglesia (Cordillera)',
                },
              ] as const
            ).map((tf) => (
              <button
                key={tf.filter}
                type="button"
                className={
                  externalPlatformTerritoryFilter === tf.filter
                    ? 'btn-filter active'
                    : 'btn-toggle'
                }
                onClick={() => {
                  onFilterPlatformTerritory(tf.filter);
                  if (tf.node) {
                    onSelectNodeKey(tf.node);
                  }
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.3rem',
              marginTop: '0.5rem',
            }}
          >
            <span className="r5-state-badge r5-state-pendiente">pendiente</span>
            <span className="r5-state-badge r5-state-en_revision">en_revision</span>
            <span className="r5-state-badge r5-state-verificado">verificado</span>
            <span className="r5-state-badge r5-state-publicado">publicado</span>
            <span className="r5-state-badge r5-state-rechazado">rechazado</span>
          </div>
        </div>

        {/* 2. Las 6 Vistas Operativas de los 13 Módulos de Dominio */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            2. Las 6 Vistas de los 13 Módulos (`#plataforma-territorial-real`)
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
                  key: 'flujo-vertical',
                  label: '01. Flujo 11 Eslabones',
                },
                {
                  key: 'directorio-red',
                  label: '02. Directorio & Red',
                },
                {
                  key: 'marketplace',
                  label: '03. Marketplace Local',
                },
                {
                  key: 'participacion',
                  label: '04. Participación (8 Etapas)',
                },
                {
                  key: 'espacio-ambiente-eventos',
                  label: '05. Espacio & Ambiente',
                },
                {
                  key: 'inteligencia-y-modulos',
                  label: '06. 13 Módulos & IA Ética',
                },
              ] as const
            ).map((sec) => (
              <button
                key={sec.key}
                type="button"
                className={
                  externalPlatformSection === sec.key
                    ? 'btn-filter active'
                    : 'btn-toggle'
                }
                onClick={() => {
                  onSelectPlatformSection(sec.key);
                  document
                    .getElementById('plataforma-territorial-real')
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                }}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Secciones Enfocadas por Lente II y Pruebas en Vivo de Honestidad R5 */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            3. Secciones de Lente II &amp; Honestidad `IDataSource` (`Regla R5`)
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '0.35rem',
              marginTop: '0.35rem',
            }}
          >
            <button
              type="button"
              className="btn-confirm"
              onClick={() => {
                document
                  .getElementById('plataforma-territorial-real')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              1. Ir al Hub de 13 Módulos y 11 Eslabones ↓
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => {
                document
                  .getElementById('demo-datasource-audit')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              2. Ir a Orígenes `IDataSource` y Auditoría `EV-007..018` ↓
            </button>
            <button
              type="button"
              className="btn-toggle"
              onClick={() => {
                document
                  .getElementById('tendencias-trimestrales')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              3. Ir a Serie Trimestral Recharts (`2026-Q1..Q4`) ↓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

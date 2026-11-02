/**
 * DELocalSoy.AR — Laboratorio Detallado en Vivo de la Estación 03 del Estudio
 * de Diseño Heurístico: Flujo Vertical E2E (13 Módulos / 11 Eslabones) y
 * Honestidad IDataSource R5 — FE-DEUDA-02 #293 (corte 16 de desmonolitización
 * de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * grafo del flujo vertical, secciones de la plataforma territorial (Ingreso
 * ciudadano / Mesa de custodia / Evidencia validada), filtro por hub, y la
 * sonda de Idempotencia + Error HTTP del contrato DataSource (R5). Acoples por
 * props: estado de App compartido (externalPlatformSection,
 * externalPlatformTerritoryFilter, useSyntheticInDemo, idempotencyProbeResult,
 * reports, evidenciasOkCount, activeDataSource, runtimeMode,
 * uiOperationalState, operationalOriginLabel) y handlers.
 */
import type {
  DataSource,
  DataSourceMode,
  UiOperationalState,
} from '../lib/dataSource';
import type { TerritorialReport } from '../data/federatedModel';

type PlatformSection =
  | 'flujo-vertical'
  | 'directorio-red'
  | 'marketplace'
  | 'participacion'
  | 'espacio-ambiente-eventos'
  | 'inteligencia-y-modulos';

type PlatformTerritoryFilter =
  | 'all'
  | 'gran-san-juan-capital'
  | 'caucete'
  | 'iglesia';

export interface Station03VerticalFlowWorkbenchProps {
  activeDataSource: DataSource;
  runtimeMode: DataSourceMode;
  uiOperationalState: UiOperationalState;
  operationalOriginLabel: string;
  useSyntheticInDemo: boolean;
  onToggleSyntheticInDemo: () => void;
  onRunIdempotencyAndErrorProbe: () => void | Promise<void>;
  idempotencyProbeResult: string | null;
  reports: TerritorialReport[];
  evidenciasOkCount: number;
  externalPlatformSection: PlatformSection;
  onSelectPlatformSection: (section: PlatformSection) => void;
  externalPlatformTerritoryFilter: PlatformTerritoryFilter;
  onSelectPlatformTerritoryFilter: (filter: PlatformTerritoryFilter) => void;
}

export function Station03VerticalFlowWorkbench({
  activeDataSource,
  runtimeMode,
  uiOperationalState,
  operationalOriginLabel,
  useSyntheticInDemo,
  onToggleSyntheticInDemo,
  onRunIdempotencyAndErrorProbe,
  idempotencyProbeResult,
  reports,
  evidenciasOkCount,
  externalPlatformSection,
  onSelectPlatformSection,
  externalPlatformTerritoryFilter,
  onSelectPlatformTerritoryFilter,
}: Station03VerticalFlowWorkbenchProps) {
  return (
    <div
      data-testid="station-03-vertical-r5ui-workbench"
      style={{
        marginTop: '0.85rem',
        paddingTop: '0.85rem',
        borderTop: '1px solid var(--color-border-hairline)',
      }}
    >
      <div className="pane-header" style={{ marginBottom: '0.65rem' }}>
        <div>
          <span className="tiny-label">
            ESTACIÓN 03 EN DETALLE · FLUJO VERTICAL E2E (13 MÓDULOS + 11 ESLABONES) Y HONESTIDAD IDataSource (R5 · PIZARRA ANDINA)
          </span>
          <strong>
            Control Remoto de las 6 Vistas del Hub Territorial, Máquina de 5 Estados R5-UI y Auditoría de los 4 Orígenes Operativos
          </strong>
        </div>
        <span className="territory-meta tabular-nums">
          Origen activo:{' '}
          <strong className="r5-status-aprobado">
            {operationalOriginLabel}
          </strong>{' '}
          · Vista Hub:{' '}
          <code>{externalPlatformSection}</code>
        </span>
      </div>

      <div className="coco-baba-triage-grid">
        {/* A. Conmutador en 1 Clic de las 6 Vistas Operativas de los 13 Módulos */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            A. Las 6 Vistas Operativas de los 13 Módulos (Conmutación en 1 Clic)
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              marginTop: '0.35rem',
            }}
          >
            {(
              [
                {
                  key: 'flujo-vertical',
                  title: '01. Flujo Vertical: Activo Verificado (11 Eslabones)',
                  desc: 'JWT + RBAC → Zod → events_raw → Redis Stream → Worker → PostGIS → BBOX.',
                },
                {
                  key: 'directorio-red',
                  title: '02. Directorio y Red Territorial',
                  desc: 'Grafo verificable de proveedores locales, entorno urbano y estados R5-UI.',
                },
                {
                  key: 'marketplace',
                  title: '03. Marketplace de Proximidad',
                  desc: 'Ofertas y demandas barriales respaldadas en activos verificados con SHA-256.',
                },
                {
                  key: 'participacion',
                  title: '04. Participación Deliberativa (8 Etapas)',
                  desc: 'Ciclo Propuesta → Revisión → Deliberación → Decisión → Seguimiento.',
                },
                {
                  key: 'espacio-ambiente-eventos',
                  title: '05. Espacio Público, Ambiente y Eventos',
                  desc: 'Relevamiento de acequias, arbolado, accesibilidad y agenda comunitaria.',
                },
                {
                  key: 'inteligencia-y-modulos',
                  title: '06. Inteligencia Ética y Matriz de 13 Módulos',
                  desc: 'Estructura Dato → Interpretación → Sugerencia y catálogo 13 módulos.',
                },
              ] as const
            ).map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => {
                  onSelectPlatformSection(sec.key);
                  setTimeout(() => {
                    document
                      .getElementById('plataforma-territorial-real')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 40);
                }}
                style={{
                  textAlign: 'left',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border:
                    externalPlatformSection === sec.key
                      ? '1px solid var(--color-accent-primary)'
                      : '1px solid var(--color-border-hairline)',
                  background:
                    externalPlatformSection === sec.key
                      ? 'var(--color-accent-subtle)'
                      : 'var(--color-bg-surface)',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <div className="event-row-top">
                  <strong style={{ fontSize: '0.8rem' }}>{sec.title}</strong>
                  {externalPlatformSection === sec.key && (
                    <span className="r5-state-badge r5-state-publicado">
                      ACTIVA
                    </span>
                  )}
                </div>
                <span
                  className="territory-meta"
                  style={{ display: 'block', fontSize: '0.72rem', marginTop: '0.12rem' }}
                >
                  {sec.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* B. Máquina de 5 Estados R5-UI (ADR-034) y Filtro Territorial del Hub */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            B. Máquina de 5 Estados R5-UI (ADR-034) &amp; Filtro por Departamento
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
              Filtrar 13 módulos y activos por departamento de San Juan:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {(
                [
                  {
                    hubKey: 'all',
                    nodeKey: 'capital',
                    label: '3 Nodos San Juan',
                  },
                  {
                    hubKey: 'gran-san-juan-capital',
                    nodeKey: 'capital',
                    label: 'Capital (Centro/Desamp.)',
                  },
                  {
                    hubKey: 'caucete',
                    nodeKey: 'caucete',
                    label: 'Caucete (Oasis Tulúm)',
                  },
                  {
                    hubKey: 'iglesia',
                    nodeKey: 'iglesia',
                    label: 'Iglesia (Cordillera)',
                  },
                ] as const
              ).map((tf) => (
                <button
                  key={tf.hubKey}
                  type="button"
                  className={
                    externalPlatformTerritoryFilter === tf.hubKey
                      ? 'btn-filter active'
                      : 'btn-filter'
                  }
                  onClick={() => {
                    onSelectPlatformTerritoryFilter(tf.hubKey);
                    setSelectedNodeKey(tf.nodeKey);
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <span className="tiny-label" style={{ marginTop: '0.15rem', marginBottom: 0 }}>
              Ciclo de validación R5-UI en <code>tokens.css</code> (H-TER-02 / H-TER-05):
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
              }}
            >
              <div className="event-row-top">
                <span className="r5-state-badge r5-state-pendiente">
                  1. pendiente / borrador
                </span>
                <span className="territory-meta tabular-nums">
                  Ingreso ciudadano ({reports.filter((r) => r.status === 'received').length} recibidos)
                </span>
              </div>
              <div className="event-row-top">
                <span className="r5-state-badge r5-state-en_revision">
                  2. en_revision
                </span>
                <span className="territory-meta tabular-nums">
                  En mesa de custodia ({reports.filter((r) => r.status === 'evaluating' || r.status === 'in_progress').length} en evaluación)
                </span>
              </div>
              <div className="event-row-top">
                <span className="r5-state-badge r5-state-verificado">
                  3. verificado
                </span>
                <span className="territory-meta tabular-nums">
                  Evidencia validada ({evidenciasOkCount}/18 evidencias OK)
                </span>
              </div>
              <div className="event-row-top">
                <span className="r5-state-badge r5-state-publicado">
                  4. publicado
                </span>
                <span className="territory-meta tabular-nums">
                  Activo en directorio PostGIS ({features.length} features SRID=4326)
                </span>
              </div>
              <div className="event-row-top">
                <span className="r5-state-badge r5-state-rechazado">
                  5. rechazado / observado
                </span>
                <span className="territory-meta tabular-nums">
                  Bloqueo RBAC 401/403 o validación Zod 422
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-confirm"
              style={{ marginTop: '0.2rem' }}
              onClick={() => {
                document
                  .getElementById('plataforma-territorial-real')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Ir al Flujo Vertical de 11 Eslabones ↓
            </button>
          </div>
        </div>

        {/* C. Honestidad Epistémica IDataSource (R5) y los 4 Orígenes Operativos */}
        <div className="coco-baba-triage-card">
          <span className="tiny-label">
            C. Honestidad Epistémica IDataSource (Regla R5) y 4 Orígenes Operativos
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
                fontSize: '0.75rem',
                padding: '0.42rem 0.6rem',
                borderRadius: 'var(--radius-xs, 4px)',
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--color-border-hairline)',
              }}
            >
              <div>
                Origen: <strong>{operationalOriginLabel}</strong> · DataSource:{' '}
                <code>{activeDataSource.name}</code>
              </div>
              <div style={{ marginTop: '0.15rem' }}>
                Runtime (<code>/api/health</code>):{' '}
                <strong>{runtimeMode.toUpperCase()}</strong> · Estado UI:{' '}
                <strong>{uiOperationalState.toUpperCase()}</strong>
              </div>
            </div>

            {idempotencyProbeResult && (
              <div
                className="r5-state-badge r5-state-verificado tabular-nums"
                style={{
                  display: 'block',
                  padding: '0.4rem 0.6rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.73rem',
                }}
              >
                ✓ {idempotencyProbeResult}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <button
                type="button"
                className="btn-confirm"
                onClick={() => void onRunIdempotencyAndErrorProbe()}
              >
                Ejecutar Probe EV-005 Idempotencia + No-[] en HTTP 503 (R5)
              </button>
              <button
                type="button"
                className={useSyntheticInDemo ? 'btn-filter active' : 'btn-toggle'}
                onClick={() => onToggleSyntheticInDemo()}
              >
                {useSyntheticInDemo
                  ? 'Desactivar Fuente Sintética (Volver a ApiDataSource /api/*)'
                  : 'Probar SyntheticDataSource (Activar Banner VITE_MOCK_API=1)'}
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
                Ir a Auditoría IDataSource y EV-007..EV-018 ↓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

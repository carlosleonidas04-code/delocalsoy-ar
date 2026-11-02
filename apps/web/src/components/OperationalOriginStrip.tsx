/**
 * DELocalSoy.AR — Barra de transparencia operativa R5 (#16, #17, #18) —
 * FE-DEUDA-02 #293 (corte 2 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): mismos
 * 4 orígenes operativos, mismos 6 estados R5-UI y mismo botón de ruta aislada
 * /demo. El estado compartido y los handlers viven en App y se acoplan por props.
 */
import type { DataSourceMode, UiOperationalState } from '../lib/dataSource';

export interface OperationalOriginStripProps {
  operationalOriginLabel: string;
  runtimeMode: DataSourceMode;
  modeSourceLabel: string;
  uiOperationalState: UiOperationalState;
  isDemoNamespace: boolean;
  onToggleDemoNamespace: () => void;
}

export function OperationalOriginStrip({
  operationalOriginLabel,
  runtimeMode,
  modeSourceLabel,
  uiOperationalState,
  isDemoNamespace,
  onToggleDemoNamespace,
}: OperationalOriginStripProps) {
  return (
    <div
      data-testid="operational-origin-strip"
      className="origin-transparency-strip"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="r5-status-aprobado">
          Origen activo: {operationalOriginLabel}
        </span>
        <span>·</span>
        <span>
          Modo runtime (<code>/api/health</code>):{' '}
          <strong className="uppercase">{runtimeMode}</strong> (fuente:{' '}
          <code>{modeSourceLabel}</code>)
        </span>
        <span>·</span>
        <span>
          Estado UI:{' '}
          <strong
            data-testid="ui-operational-state"
            className="uppercase token-node-tag-iglesia"
          >
            {uiOperationalState}
          </strong>
        </span>
        <span>·</span>
        <span className="font-mono">
          main @ 1272e45 / d70cbc6 / e3616b5 (CORE-001 6/6 · CORE-002 6/6 · CORE-003 · ADR-034)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleDemoNamespace}
          className="btn-toggle"
          style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
        >
          {isDemoNamespace
            ? '← Volver a Producción (/api/*)'
            : 'Ir a Ruta Aislada /demo (#16–#18)'}
        </button>
      </div>
    </div>
  );
}

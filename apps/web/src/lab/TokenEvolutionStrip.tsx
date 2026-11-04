/**
 * DELocalSoy.AR — Barra de Evolución Visual ADR-034 (tokens.css · Issue #109 /
 * #114): Identidad Mineral San Juan + Estados R5-UI + Selector de Tema —
 * FE-DEUDA-02 #293 (corte 4 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): mismos
 * tags de nodos (Capital/Caucete/Iglesia), mismos estados R5-UI y mismo selector
 * de tema. El estado `themeMode` vive en App y se acopla por props junto con su
 * setter.
 */
export interface TokenEvolutionStripProps {
  themeMode: 'light' | 'dark' | 'auto';
  onSelectThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
}

export function TokenEvolutionStrip({
  themeMode,
  onSelectThemeMode,
}: TokenEvolutionStripProps) {
  return (
    <div
      data-testid="adr034-token-evolution-strip"
      className="token-evolution-strip"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          Contrato Visual <code>tokens.css</code> (<code>ADR-034</code> · <code>#109</code>)
        </span>
        <span aria-hidden="true">·</span>
        <span className="token-node-tag-capital">
          Capital (Centro/Desamparados)
        </span>
        <span aria-hidden="true">·</span>
        <span className="token-node-tag-caucete">
          Caucete (Oasis Tulúm)
        </span>
        <span aria-hidden="true">·</span>
        <span className="token-node-tag-iglesia">
          Iglesia (Cordillera)
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Estados <code>R5-UI</code>:{' '}
          <span className="r5-status-pendiente">pendiente</span>
          {' / '}
          <span className="r5-status-aprobado">aprobado</span>
          {' / '}
          <span className="r5-status-rechazado">rechazado</span>
        </span>
      </div>

      <div className="filter-group" role="group" aria-label="Selector de tema visual ADR-034">
        <button
          type="button"
          className={themeMode === 'light' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => onSelectThemeMode('light')}
        >
          Piedra Caliza (Claro)
        </button>
        <button
          type="button"
          className={themeMode === 'dark' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => onSelectThemeMode('dark')}
        >
          Pizarra Andina (Oscuro)
        </button>
        <button
          type="button"
          className={themeMode === 'auto' ? 'btn-filter active' : 'btn-filter'}
          onClick={() => onSelectThemeMode('auto')}
        >
          Auto (Sistema)
        </button>
      </div>
    </div>
  );
}

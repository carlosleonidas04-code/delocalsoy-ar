// REF-R5 (#638, épica REF #633): Galería de estados honestos — los 4
// estados con marcador textual + texto (demo y reuso en REF-R6..R11).

import {
  ESTADOS_HONESTOS,
  descripcionEstadoHonesto,
  etiquetaEstadoHonesto,
} from '../../lib/estadosHonestos';

export function GaleriaEstados() {
  return (
    <ul className="galeria-estados">
      {ESTADOS_HONESTOS.map((e) => (
        <li key={e} data-estado={e}>
          <span className={'galeria-estados__marcador galeria-estados__marcador--' + e} aria-hidden="true">
            ◆
          </span>
          <span>
            <strong>{etiquetaEstadoHonesto(e)}</strong> — {descripcionEstadoHonesto(e)}
          </span>
        </li>
      ))}
    </ul>
  );
}

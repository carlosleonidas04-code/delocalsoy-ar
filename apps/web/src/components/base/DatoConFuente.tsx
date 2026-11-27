// REF-R5 (#638, épica REF #633): DatoConFuente — valor + cobertura + fecha
// de corte + fuente, con estado honesto declarado en texto (el color nunca
// es la única señal, WCAG 1.4.1). Componente de presentación: sin fetch,
// sin estado (ADR-040/ADR-084 intactos). R15: valor null → «sin dato aún
// (no es un cero)», jamás un 0.

import {
  estadoDesdeConteo,
  etiquetaEstadoHonesto,
  type EstadoHonesto,
} from '../../lib/estadosHonestos';
import { PieDeFuente } from './PieDeFuente';

export interface DatoConFuenteProps {
  etiqueta: string;
  valor: number | string | null;
  unidad?: string;
  fuenteLabel?: string | null;
  fechaCorte?: string | null;
  cobertura?: { con: number; total: number } | null;
  /** Texto del pie; si se omite se arma con fuenteLabel/fechaCorte/cobertura. */
  pie?: string | null;
}

export function DatoConFuente({ etiqueta, valor, unidad, fuenteLabel, fechaCorte, cobertura, pie }: DatoConFuenteProps) {
  const esNumerico = typeof valor === 'number';
  const estado: EstadoHonesto =
    valor === null ? 'sin_dato' : esNumerico ? estadoDesdeConteo(valor as number, cobertura?.total ?? null) : 'completo';
  const textoValor = valor === null ? 'sin dato aún (no es un cero)' : `${valor}${unidad ? ' ' + unidad : ''}`;
  const partesPie = [
    fuenteLabel ?? null,
    fechaCorte ? 'corte: ' + fechaCorte : null,
    cobertura ? `cobertura: ${cobertura.con} de ${cobertura.total}` : null,
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);
  const textoPie = pie !== undefined && pie !== null ? pie : partesPie.join(' · ');

  return (
    <div className="dato-con-fuente" data-estado={estado}>
      <p className="dato-con-fuente__etiqueta">{etiqueta}</p>
      <p className="dato-con-fuente__valor">
        <strong>{textoValor}</strong>{' '}
        <span className={'dato-con-fuente__estado dato-con-fuente__estado--' + estado}>
          {etiquetaEstadoHonesto(estado)}
        </span>
      </p>
      {textoPie.length > 0 && <PieDeFuente texto={textoPie} />}
    </div>
  );
}

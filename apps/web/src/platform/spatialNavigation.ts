/**
 * UX-002 (#223): seleccion espacial pura para navegacion por D-pad
 * (TV 10-foot y pantalla vehicular glanceable).
 *
 * Funcion pura: la geometria se INYECTA (rects), sin DOM ni globals, para que
 * la suite de accesibilidad corra en entorno node sin jsdom (R5: contrato
 * verificable). Algoritmo inspirado en la navegacion espacial del W3C: en
 * cada direccion se prefiere el candidato con menor distancia en el eje
 * principal, penalizando la falta de solapamiento en el eje secundario.
 */

export type SpatialDir = 'up' | 'down' | 'left' | 'right';

export interface SpatialRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SpatialItem<T> {
  el: T;
  rect: SpatialRect;
}

/** Tolerancia geometrica para considerar un candidato en la direccion pedida. */
const EPSILON = 0.5;
/** Penalizacion del eje secundario cuando NO hay solapamiento (prefiere filas/columnas). */
const GAP_PENALTY = 2;

export function pickSpatialCandidate<T>(
  current: SpatialRect | null,
  candidates: SpatialItem<T>[],
  dir: SpatialDir,
): SpatialItem<T> | null {
  if (candidates.length === 0) {
    return null;
  }
  if (current === null) {
    const first = candidates[0];
    if (first === undefined) {
      return null;
    }
    return first;
  }
  const horizontal = dir === 'left' || dir === 'right';
  let best: SpatialItem<T> | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const cand of candidates) {
    const r = cand.rect;
    const primaryDist = horizontal
      ? dir === 'left'
        ? current.left - r.right
        : r.left - current.right
      : dir === 'up'
        ? current.top - r.bottom
        : r.top - current.bottom;
    if (primaryDist < -EPSILON) {
      // Detras del actual o superpuesto: no aplica para esta direccion.
      continue;
    }
    const overlap = horizontal
      ? Math.min(current.bottom, r.bottom) - Math.max(current.top, r.top)
      : Math.min(current.right, r.right) - Math.max(current.left, r.left);
    const penalty = overlap > 0 ? 0 : -overlap * GAP_PENALTY;
    const score = Math.max(primaryDist, 0) + penalty;
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best;
}

/**
 * UX-002 (#223): suite de navegacion espacial (geometria inyectada, sin DOM).
 */
import { describe, expect, it } from 'vitest';
import { pickSpatialCandidate, type SpatialItem } from './spatialNavigation';

const item = (el: string, left: number, top: number, w: number, h: number): SpatialItem<string> => ({
  el,
  rect: { left, top, right: left + w, bottom: top + h },
});

describe('pickSpatialCandidate (UX-002)', () => {
  const a = item('A', 0, 0, 100, 50);
  const b = item('B', 120, 0, 100, 50);
  const fila2 = item('C', 0, 80, 100, 50);
  const diagonal = item('D', 300, 80, 100, 50);
  const candidates = [a, b, fila2, diagonal];

  it('derecha: de A pasa a B (misma fila, adyacente)', () => {
    expect(pickSpatialCandidate(a.rect, candidates, 'right')?.el).toBe('B');
  });

  it('izquierda: de B vuelve a A', () => {
    expect(pickSpatialCandidate(b.rect, candidates, 'left')?.el).toBe('A');
  });

  it('abajo: de A baja a C (solapamiento preferido sobre el D lejano)', () => {
    expect(pickSpatialCandidate(a.rect, candidates, 'down')?.el).toBe('C');
  });

  it('arriba: desde C sube a A; desde A (fila superior) no hay candidato', () => {
    expect(pickSpatialCandidate(fila2.rect, candidates, 'up')?.el).toBe('A');
    expect(pickSpatialCandidate(a.rect, candidates, 'up')).toBeNull();
  });

  it('sin foco actual: devuelve el primero en orden de documento', () => {
    expect(pickSpatialCandidate(null, candidates, 'down')?.el).toBe('A');
  });

  it('conjunto vacio: null honesto', () => {
    expect(pickSpatialCandidate(a.rect, [], 'right')).toBeNull();
  });
});

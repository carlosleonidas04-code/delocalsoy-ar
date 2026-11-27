// REF-R6 (#639, épica REF #633): test de InicioNodoPanel — estados honestos
// (null ≠ 0, R15), cobertura solo cuando la fuente la declara, y etiquetas
// humanas sin códigos (REF-R4). Mismo patrón que los tests de componentes base.

import { describe, expect, it } from 'vitest';
import { coberturaDeDetalles } from './InicioNodoPanel';

describe('InicioNodoPanel — honestidad de datos (R15)', () => {
  it('solo arma cobertura cuando la fuente declara con y total', () => {
    expect(coberturaDeDetalles({ con: 5, total: 12 })).toEqual({ con: 5, total: 12 });
    expect(coberturaDeDetalles({})).toBeNull();
    expect(coberturaDeDetalles({ con: 5 })).toBeNull();
    expect(coberturaDeDetalles({ total: 12 })).toBeNull();
  });

  it('rechaza coberturas no finitas (sin inventar, R15)', () => {
    expect(coberturaDeDetalles({ con: Number.NaN, total: 12 })).toBeNull();
    expect(coberturaDeDetalles({ con: 5, total: Number.POSITIVE_INFINITY })).toBeNull();
  });
});

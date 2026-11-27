import { describe, expect, it } from 'vitest';

// REF-R5 (#638, épica REF #633): estados honestos — clasificación pura.
// R15: «sin dato» jamás se muestra como 0.

import {
  ESTADOS_HONESTOS,
  descripcionEstadoHonesto,
  estadoDesdeConteo,
  etiquetaEstadoHonesto,
} from './estadosHonestos';

describe('REF-R5 (#638, épica #633) — estados honestos', () => {
  it('null/undefined/NaN → sin_dato (ausencia declarada, no es un cero)', () => {
    expect(estadoDesdeConteo(null)).toBe('sin_dato');
    expect(estadoDesdeConteo(undefined)).toBe('sin_dato');
    expect(estadoDesdeConteo(Number.NaN)).toBe('sin_dato');
  });

  it('0 → cero_confirmado (dato real que dice «no hay»)', () => {
    expect(estadoDesdeConteo(0)).toBe('cero_confirmado');
    expect(estadoDesdeConteo(0, 12)).toBe('cero_confirmado');
  });

  it('0 < n < total → parcial; n === total → completo', () => {
    expect(estadoDesdeConteo(5, 12)).toBe('parcial');
    expect(estadoDesdeConteo(12, 12)).toBe('completo');
    expect(estadoDesdeConteo(5)).toBe('completo');
  });

  it('total inválido no fabrica parcialidad', () => {
    expect(estadoDesdeConteo(5, 0)).toBe('completo');
    expect(estadoDesdeConteo(5, null)).toBe('completo');
    expect(estadoDesdeConteo(5, Number.NaN)).toBe('completo');
  });

  it('los 4 estados tienen etiqueta y descripción humanas (REF-R4)', () => {
    for (const e of ESTADOS_HONESTOS) {
      expect(etiquetaEstadoHonesto(e).length).toBeGreaterThan(0);
      expect(descripcionEstadoHonesto(e).length).toBeGreaterThan(0);
    }
    expect(etiquetaEstadoHonesto('sin_dato')).toBe('Sin dato aún (no es un cero)');
  });
});

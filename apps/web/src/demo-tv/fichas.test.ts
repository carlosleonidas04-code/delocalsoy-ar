import { describe, expect, it } from 'vitest';
import { FICHAS_DEMO, ETIQUETA_ESTADO } from './fichas';

describe('fichas del demo TV (UX-004, #228)', () => {
  it('declara todo el dato como sintetico (R15: sin dato real simulado)', () => {
    for (const f of FICHAS_DEMO) {
      expect(f.isSynthetic).toBe(true);
    }
  });

  it('usa solo estados honestos del vocabulario del repositorio', () => {
    const validos = Object.keys(ETIQUETA_ESTADO);
    for (const f of FICHAS_DEMO) {
      expect(validos).toContain(f.estado);
    }
  });

  it('cubre los tres nodos con titulos y detalles no vacios', () => {
    const nodos = new Set(FICHAS_DEMO.map((f) => f.nodo));
    expect(nodos).toEqual(new Set(['capital', 'caucete', 'iglesia']));
    for (const f of FICHAS_DEMO) {
      expect(f.titulo.length).toBeGreaterThan(3);
      expect(f.detalle.length).toBeGreaterThan(3);
    }
  });

  it('no contiene PII (ADR-027): sin emails ni numeros de contacto', () => {
    for (const f of FICHAS_DEMO) {
      expect(f.titulo).not.toMatch(/@/);
      expect(f.detalle).not.toMatch(/@/);
      expect(f.titulo + ' ' + f.detalle).not.toMatch(/\d{6,}/);
    }
  });

  it('declara fuente ilustrativa en cada ficha', () => {
    for (const f of FICHAS_DEMO) {
      expect(f.fuente).toContain('Ilustrativa');
    }
  });

  it('ids unicos para el aria-label y el detalle', () => {
    const ids = FICHAS_DEMO.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

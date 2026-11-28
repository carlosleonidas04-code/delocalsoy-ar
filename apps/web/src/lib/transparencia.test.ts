// REF-R11 (#644, épica REF #633): test de la Capa Transparencia — registro
// sin huecos y en orden (anti-ranking), referencias verificadas a issues y
// PRs reales, reglas del método y contrato abierto declarado (R15).

import { describe, expect, it } from 'vitest';
import {
  DATOS_CONTRATO,
  DECISIONES_TRANSPARENCIA,
  NOTA_REGISTRO_EV,
  REGLAS_TRANSPARENCIA,
  REGISTRO_EV,
} from './transparencia';

describe('Transparencia — registro de aterrizajes (REF-R11 #644, épica REF #633)', () => {
  it('cubre EV-114 a EV-144 sin huecos y en orden cronológico fijo (anti-ranking)', () => {
    const evs = REGISTRO_EV.map((e) => e.ev);
    for (let i = 1; i < evs.length; i++) {
      expect(evs[i]).toBe(evs[i - 1] + 1);
    }
    expect(evs[0]).toBe(114);
    expect(evs[evs.length - 1]).toBe(144);
  });

  it('cada entrada referencia issue y PR numéricos válidos con título humano', () => {
    for (const entrada de REGISTRO_EV) {
      expect(Number.isInteger(entrada.issue)).toBe(true);
      expect(Number.isInteger(entrada.pr)).toBe(true);
      expect(entrada.titulo.length).toBeGreaterThan(3);
    }
  });

  it('la última entrada ancla al PR #662 (EV-144, REF-R9) y declara dónde vive la acreditación', () => {
    const ultima = REGISTRO_EV[REGISTRO_EV.length - 1];
    expect(ultima.pr).toBe(662);
    expect(ultima.issue).toBe(642);
    expect(NOTA_REGISTRO_EV).toContain('docs/EVIDENCIA.md');
  });
});

describe('Transparencia — reglas, decisiones y contrato abierto (R15)', () => {
  it('nombra las 4 reglas del método en orden fijo', () => {
    expect(REGLAS_TRANSPARENCIA.map((r) => r.clave)).toEqual(['R4', 'R5', 'R9', 'R15']);
    expect(REGLAS_TRANSPARENCIA.find((r) => r.clave === 'R15')?.texto).toContain('null ≠ 0');
  });

  it('declara el contrato abierto vigente sin inventar números', () => {
    expect(DATOS_CONTRATO.openapiVersion).toBe('7.54.0');
    expect(DATOS_CONTRATO.paths).toBe(83);
    expect(DATOS_CONTRATO.matrizSellos).toBe(46);
  });

  it('anti-ranking estructural: el registro no puntúa, no ordena por mérito ni compara (R5/ADR-036)', () => {
    for (const entrada of REGISTRO_EV) {
      expect(entrada.titulo).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/i);
    }
    expect(NOTA_REGISTRO_EV).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/i);
  });

  it('las decisiones registradas citan ADRs con texto humano', () => {
    expect(DECISIONES_TRANSPARENCIA.length).toBeGreaterThanOrEqual(6);
    for (const decision of DECISIONES_TRANSPARENCIA) {
      expect(decision.ref).toMatch(/^ADR-/);
      expect(decision.texto.length).toBeGreaterThan(20);
    }
  });
});

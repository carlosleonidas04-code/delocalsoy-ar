import { describe, expect, it } from 'vitest';
import {
  DECLARACION,
  ESTADO_ACTO,
  FASES_SIGUIENTES,
  FUNDAMENTO_EPICAS,
  REGLAS_INNEGOCIABLES,
  VACIOS_HONESTOS,
  resumenInstitucion,
} from './institucion';

describe('INSTITUCION-1 (#628): contenido declarado del panel de institución', () => {
  it('declara el acto con fecha 2026-12-01 y la declaración de institución', () => {
    expect(ESTADO_ACTO).toContain('1 de diciembre de 2026');
    expect(ESTADO_ACTO).toContain('R15');
    expect(DECLARACION).toContain('desarrollo territorial íntegro');
  });

  it('fundamento: 6 épicas acreditadas con enlaces GitHub reales y registros EV', () => {
    expect(FUNDAMENTO_EPICAS).toHaveLength(6);
    for (const e of FUNDAMENTO_EPICAS) {
      expect(e.enlace).toBe('https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/' + e.epica);
      expect(e.titulo.length).toBeGreaterThan(10);
      expect(e.registro.length).toBeGreaterThan(5);
    }
    const eps = FUNDAMENTO_EPICAS.map((e) => e.epica).sort((a, b) => a - b);
    expect(eps).toEqual([399, 448, 459, 531, 543, 607]);
  });

  it('vacíos honestos: 3 declarados, estados permitidos, sin promesas de resolución', () => {
    expect(VACIOS_HONESTOS).toHaveLength(3);
    for (const v of VACIOS_HONESTOS) {
      expect(['sin_fuente_ingestada', 'en_compuerta', 'pendiente_verificacion']).toContain(v.estado);
      expect(v.detalle).not.toMatch(/resuelto|implementado/);
    }
    expect(VACIOS_HONESTOS.some((v) => v.detalle.includes('0 honesto'))).toBe(true);
  });

  it('reglas innegociables: anti-ranking, R15 y Ley 25.326 presentes', () => {
    expect(REGLAS_INNEGOCIABLES.length).toBeGreaterThanOrEqual(5);
    const texto = REGLAS_INNEGOCIABLES.join(' ').toLowerCase();
    expect(texto).toContain('anti-ranking');
    expect(texto).toContain('r15');
    expect(texto).toContain('25.326');
    expect(texto).toContain('sirena');
  });

  it('resumenInstitucion refleja los arreglos (fuente única de verdad, lección EV-126)', () => {
    const r = resumenInstitucion();
    expect(r).toEqual({
      epicas: FUNDAMENTO_EPICAS.length,
      vacios: VACIOS_HONESTOS.length,
      reglas: REGLAS_INNEGOCIABLES.length,
      fases: FASES_SIGUIENTES.length,
    });
  });
});

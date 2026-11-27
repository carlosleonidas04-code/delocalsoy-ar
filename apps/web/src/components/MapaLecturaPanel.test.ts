// REF-R7 (#640, épica REF #633): test de MapaLecturaPanel — fila textual sin
// ranking (orden del dataset), cobertura honesta (null ≠ 0, R15) y lenguaje
// humano sin códigos (REF-R4).

import { describe, expect, it } from 'vitest';
import { coberturaCapa, textoFilaTerritorio } from './MapaLecturaPanel';
import type { ConteoPorCapa } from './conteosTerritoriales';
import type { Territorio } from '../App';

const t = { key: 'capital', nombre: 'Capital', provincia: 'San Juan' } as unknown as Territorio;

describe('MapaLecturaPanel — lectura textual y cobertura honesta (R15)', () => {
  it('fila textual con capas en orden fijo y «sin dato» cuando el nodo no tiene conteo', () => {
    const fila = textoFilaTerritorio(t, null);
    expect(fila).toContain('Capital (San Juan)');
    expect(fila).toContain('sin dato');
    expect(fila).not.toMatch(/ranking|puntaje|mejor|peor/i);
  });

  it('cobertura con total 0 declara ausencia (null ≠ 0, R15)', () => {
    const c: ConteoPorCapa = { capa: 'assets', total: 0, porEstado: {}, estadoOtroCrudo: [], ultimoQuarter: null };
    expect(coberturaCapa(c)).toContain('ausencia declarada');
  });

  it('cobertura con datos declara estados y corte, sin categorías inventadas', () => {
    const c: ConteoPorCapa = {
      capa: 'corredores',
      total: 2,
      porEstado: { verified: 1, otro: 1 },
      estadoOtroCrudo: ['estado_raro'],
      ultimoQuarter: '2026-Q2',
    };
    const s = coberturaCapa(c);
    expect(s).toContain('estado crudo sin categoría: estado_raro');
    expect(s).toContain('2026-Q2');
  });
});

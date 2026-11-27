// REF-R8 (#641, épica REF #633): test de ReportarDestino — pre-chequeo
// local de duplicados (PIZ-R6/EV-120, radio 100 m, tope 5, solo abiertos
// no sintéticos con punto) y los 3 estados honestos de
// duplicados_verificados (R15: fail-open jamás se lee como «sin duplicados»).

import { describe, expect, it } from 'vitest';
import { estadoDuplicadosTexto, sugeridosDeBandeja } from './ReportarDestino';
import type { ReportePublico } from '../../lib/artefactoA1';

function fila(parcial: Partial<ReportePublico>): ReportePublico {
  return {
    id: 'r-1',
    categoria: 'vereda',
    tipo: 'reporte',
    titulo: '',
    descripcion: '',
    estado: 'received',
    nodo_key: 'capital',
    subnodo_key: null,
    lat: -31.5375,
    lng: -68.5364,
    is_synthetic: false,
    created_at: '2026-11-27T00:00:00Z',
    ...parcial,
  } as ReportePublico;
}

describe('ReportarDestino — pre-chequeo de duplicados (PIZ-R6/EV-120)', () => {
  const punto = { lat: -31.5375, lng: -68.5364 };

  it('sugeridos: solo abiertos, no sintéticos y con punto, a menos de 100 m', () => {
    const bandeja = [
      fila({}),
      fila({ id: 'r-2', estado: 'resolved' }),
      fila({ id: 'r-3', is_synthetic: true }),
      fila({ id: 'r-4', lat: null, lng: null }),
      fila({ id: 'r-5', lat: -31.5376, lng: -68.5365 }),
    ];
    const s = sugeridosDeBandeja(bandeja, punto.lat, punto.lng);
    expect(s.map((x) => x.id)).toEqual(['r-1', 'r-5']);
    expect(s[0].distancia_m).toBeLessThanOrEqual(100);
  });

  it('orden por distancia y tope 5 (ayuda para decidir, no autoridad)', () => {
    const bandeja = [
      fila({ id: 'a', lat: -31.5399, lng: -68.5399 }),
      fila({ id: 'b', lat: -31.5376, lng: -68.5365 }),
    ];
    const s = sugeridosDeBandeja(bandeja, punto.lat, punto.lng);
    expect(s.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('bandeja null declara vacío sin inventar (R15)', () => {
    expect(sugeridosDeBandeja(null, punto.lat, punto.lng)).toEqual([]);
  });
});

describe('ReportarDestino — 3 estados honestos de duplicados_verificados (R15)', () => {
  it('true con 0 no es un cero con cobertura: declara la búsqueda sin hallazgos', () => {
    expect(estadoDuplicadosTexto(true, 0)).toContain('no encontró ninguno');
  });

  it('true con hallazgos menciona la cantidad', () => {
    expect(estadoDuplicadosTexto(true, 2)).toContain('2');
  });

  it('false (fail-open del servidor) jamás se lee como «sin duplicados»', () => {
    const s = estadoDuplicadosTexto(false, 0);
    expect(s).toContain('no pudo correr');
    expect(s).not.toMatch(/sin duplicados/i);
  });

  it('null = sin dato ≠ 0 (R15)', () => {
    expect(estadoDuplicadosTexto(null, 0)).toContain('sin dato');
  });

  it('anti-ranking: ningún texto puntúa ni compara', () => {
    for (const s of [estadoDuplicadosTexto(true, 1), estadoDuplicadosTexto(false, 0), estadoDuplicadosTexto(null, 0)]) {
      expect(s).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/i);
    }
  });
});

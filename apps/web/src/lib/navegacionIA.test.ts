import { describe, expect, it } from 'vitest';

// REF-R3 (#636, épica REF #633): navegación IA de 5 destinos + 3 capas —
// parseo estricto del hash (patrón IT-R5 #nodo/:key). Un hash no reconocido
// NUNCA cambia el destino (R15); anti-ranking: destinos equivalentes, orden
// fijo, títulos humanos sin códigos (insumo REF-R4).

import { DESTINOS_IA, destinoDesdeHash, hashDeDestino } from './navegacionIA';

describe('REF-R3 (#636, épica #633) — navegación IA: parseo estricto del hash', () => {
  it('los 5 destinos + Transparencia resuelven desde su hash; sin hash abre Inicio', () => {
    expect(destinoDesdeHash('')).toBe('inicio');
    expect(destinoDesdeHash('#')).toBe('inicio');
    expect(destinoDesdeHash('#inicio')).toBe('inicio');
    expect(destinoDesdeHash('#mapa')).toBe('mapa');
    expect(destinoDesdeHash('#reportar')).toBe('reportar');
    expect(destinoDesdeHash('#preguntar')).toBe('preguntar');
    expect(destinoDesdeHash('#mas')).toBe('mas');
    expect(destinoDesdeHash('#lab')).toBe('lab');
  });

  it('itinerario de nodo: #nodo/:key resuelve al destino Mapa (IT-R5, épica #607)', () => {
    expect(destinoDesdeHash('#nodo/capital')).toBe('mapa');
    expect(destinoDesdeHash('#nodo/sj_capital_centro')).toBe('mapa');
    expect(destinoDesdeHash('#nodo/Capital')).toBeNull();
    expect(destinoDesdeHash('#nodo/')).toBeNull();
    expect(destinoDesdeHash('#nodo/capital/extra')).toBeNull();
  });

  it('hash desconocido → null: el destino NO cambia (R15: jamás asume)', () => {
    expect(destinoDesdeHash('#demo')).toBeNull();
    expect(destinoDesdeHash('#plataforma-territorial-real')).toBeNull();
    expect(destinoDesdeHash('#nodos-federados')).toBeNull();
    expect(destinoDesdeHash('#NODO/capital')).toBeNull();
    expect(destinoDesdeHash('mapa')).toBeNull();
  });

  it('round-trip hashDeDestino ∘ destinoDesdeHash para los 5 destinos', () => {
    for (const d of DESTINOS_IA) {
      expect(destinoDesdeHash(d.hash)).toBe(d.id);
      expect(hashDeDestino(d.id)).toBe(d.hash);
    }
    expect(hashDeDestino('inicio')).toBe('#inicio');
    expect(destinoDesdeHash(hashDeDestino('lab'))).toBe('lab');
  });

  it('anti-ranking estructural: 5 destinos equivalentes, orden fijo, títulos humanos sin códigos', () => {
    expect(DESTINOS_IA).toHaveLength(5);
    expect(DESTINOS_IA.map((d) => d.id)).toEqual(['inicio', 'mapa', 'reportar', 'preguntar', 'mas']);
    for (const d of DESTINOS_IA) {
      expect(d.titulo.length).toBeGreaterThanOrEqual(3);
      expect(/^(PIZ|REF|EV|ADR|PR|IT-|NCAP|VIG|MK)/.test(d.titulo)).toBe(false);
      expect(d.descripcion.length).toBeGreaterThanOrEqual(10);
    }
    const serializado = JSON.stringify(DESTINOS_IA).toLowerCase();
    expect(serializado).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/);
  });
});

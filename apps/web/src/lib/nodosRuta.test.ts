import { describe, expect, it } from 'vitest';

// IT-R5 (#614, épica #607): ruta de nodo «#nodo/:key» — parseo estricto y
// declarativo (navegación, no comparación: R5/ADR-036). El módulo jamás
// asume el vocabulario: la existencia del nodo la valida el directorio vivo.

import { nodoKeyDesdeRuta, rutaDeNodo, PREFIJO_RUTA_NODO } from './nodosRuta';

describe('IT-R5 (#614, épica #607) — ruta de nodo #nodo/:key', () => {
  it('parsea claves válidas y hace round-trip con rutaDeNodo', () => {
    expect(nodoKeyDesdeRuta('#nodo/capital')).toBe('capital');
    expect(nodoKeyDesdeRuta('#nodo/sj_capital_centro')).toBe('sj_capital_centro');
    expect(nodoKeyDesdeRuta(rutaDeNodo('caucete'))).toBe('caucete');
    expect(rutaDeNodo('iglesia')).toBe('#nodo/iglesia');
  });

  it('rechaza otros hashes y entradas malformadas: #lab, vacío, mayúsculas, inyección', () => {
    expect(nodoKeyDesdeRuta('#lab')).toBeNull();
    expect(nodoKeyDesdeRuta('#demo')).toBeNull();
    expect(nodoKeyDesdeRuta('')).toBeNull();
    expect(nodoKeyDesdeRuta(null)).toBeNull();
    expect(nodoKeyDesdeRuta(undefined)).toBeNull();
    expect(nodoKeyDesdeRuta('#nodo')).toBeNull();
    expect(nodoKeyDesdeRuta('#nodo/')).toBeNull();
    expect(nodoKeyDesdeRuta('#nodo/Capital')).toBeNull();
    expect(nodoKeyDesdeRuta('#nodo/capital/extra')).toBeNull();
    expect(nodoKeyDesdeRuta('#nodo/capi%20tal')).toBeNull();
  });

  it('PREFIJO_RUTA_NODO es la fuente única del prefijo (sin literales duplicados)', () => {
    expect(PREFIJO_RUTA_NODO).toBe('#nodo/');
    expect(rutaDeNodo('capital').startsWith(PREFIJO_RUTA_NODO)).toBe(true);
  });

  it('anti-ranking estructural: los exports no producen puntaje ni comparación', () => {
    const serializado = JSON.stringify([PREFIJO_RUTA_NODO, rutaDeNodo('capital'), nodoKeyDesdeRuta('#nodo/capital')]).toLowerCase();
    expect(serializado).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/);
  });
});

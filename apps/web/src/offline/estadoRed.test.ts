import { describe, expect, it } from 'vitest';
import { crearEstadoRed } from './estadoRed';
import type { DependenciasRed } from './estadoRed';

function depsFake(inicial: boolean): {
  deps: DependenciasRed;
  emitir(v: boolean): void;
} {
  let valor = inicial;
  const oyentes = new Set<(v: boolean) => void>();
  return {
    deps: {
      enLinea: () => valor,
      escuchar(cb) {
        oyentes.add(cb);
        return () => {
          oyentes.delete(cb);
        };
      },
    },
    emitir(v: boolean) {
      valor = v;
      for (const cb of Array.from(oyentes)) cb(v);
    },
  };
}

describe('estadoRed (UX-003, #226)', () => {
  it('refleja el estado inicial de las dependencias', () => {
    const { deps } = depsFake(true);
    const red = crearEstadoRed(deps);
    expect(red.enLinea()).toBe(true);
    red.destruir();
  });

  it('notifica a los suscriptores cuando cambia la red', () => {
    const { deps, emitir } = depsFake(true);
    const red = crearEstadoRed(deps);
    const recibidos: boolean[] = [];
    const desuscribir = red.suscribir((v) => recibidos.push(v));
    emitir(false);
    emitir(true);
    expect(recibidos).toEqual([false, true]);
    desuscribir();
    emitir(false);
    expect(recibidos).toEqual([false, true]); // ya no recibe
    red.destruir();
  });

  it('destruir corta los eventos de la fuente', () => {
    const { deps, emitir } = depsFake(true);
    const red = crearEstadoRed(deps);
    const recibidos: boolean[] = [];
    red.suscribir((v) => recibidos.push(v));
    red.destruir();
    emitir(false);
    expect(recibidos).toEqual([]);
  });
});

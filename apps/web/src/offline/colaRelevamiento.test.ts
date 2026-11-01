import { describe, expect, it } from 'vitest';
import { crearColaRelevamiento, esErrorDeValidacion } from './colaRelevamiento';
import type { AdaptadorAlmacen } from './colaRelevamiento';
import type { ActivoAltaInput } from '../activosApi';

type Item = { id: string };

class AlmacenFake implements AdaptadorAlmacen {
  valor: string | null = null;
  escrituras = 0;
  leer(): string | null {
    return this.valor;
  }
  escribir(v: string): void {
    this.valor = v;
    this.escrituras += 1;
  }
}

const payload: ActivoAltaInput = {
  tipo: 'comercio',
  titulo: 'Almacen de barrio',
  nodo_key: 'valle-de-iglesia',
  lat: -30.5,
  lng: -69.2,
};

function errorDeValidacion(mensaje: string): Error {
  const err = new Error(mensaje);
  err.name = 'ErrorDeValidacion';
  return err;
}

describe('colaRelevamiento (UX-003, #226)', () => {
  it('encola y persiste en cada mutacion', () => {
    const almacen = new AlmacenFake();
    const cola = crearColaRelevamiento(almacen, async () => undefined, {
      generarId: () => 'id-1',
      ahora: () => '2026-10-16T00:00:00.000Z',
    });
    const item = cola.encolar(payload);
    expect(item.id).toBe('id-1');
    expect(item.intentos).toBe(0);
    expect(item.ultimoError).toBeNull();
    expect(cola.estado().total).toBe(1);
    expect(almacen.escrituras).toBe(1);
    const persistido = JSON.parse(almacen.valor ?? '') as Item[];
    expect(persistido).toHaveLength(1);
  });

  it('sincroniza con exito y vacia la cola', async () => {
    const almacen = new AlmacenFake();
    let n = 0;
    const cola = crearColaRelevamiento(almacen, async () => {
      n += 1;
    }, { generarId: () => 'id-' + n });
    cola.encolar(payload);
    cola.encolar(payload);
    const r = await cola.sincronizar();
    expect(r.sincronizados).toBe(2);
    expect(r.fallados).toBe(0);
    expect(r.descartados).toBe(0);
    expect(cola.estado().total).toBe(0);
    expect(JSON.parse(almacen.valor ?? '[]')).toHaveLength(0);
  });

  it('descarta en forma definitiva los items con ErrorDeValidacion', async () => {
    const almacen = new AlmacenFake();
    const cola = crearColaRelevamiento(almacen, async () => {
      throw errorDeValidacion('titulo requerido');
    });
    cola.encolar(payload);
    const r = await cola.sincronizar();
    expect(r.descartados).toBe(1);
    expect(r.sincronizados).toBe(0);
    expect(cola.estado().total).toBe(0); // fuera de la cola: nunca se reenvia
  });

  it('conserva los items con error de red/sesion y registra intentos', async () => {
    const almacen = new AlmacenFake();
    const cola = crearColaRelevamiento(almacen, async () => {
      throw new Error('sin conexion');
    });
    cola.encolar(payload);
    const r1 = await cola.sincronizar();
    expect(r1.fallados).toBe(1);
    const estado1 = cola.estado();
    expect(estado1.total).toBe(1);
    expect(estado1.items[0]?.intentos).toBe(1);
    expect(estado1.items[0]?.ultimoError).toBe('sin conexion');
    const r2 = await cola.sincronizar();
    expect(r2.fallados).toBe(1);
    expect(cola.estado().items[0]?.intentos).toBe(2);
  });

  it('reconoce la cola persistida desde otra instancia', () => {
    const almacen = new AlmacenFake();
    const cola1 = crearColaRelevamiento(almacen, async () => undefined, {
      generarId: () => 'id-fijo',
    });
    cola1.encolar(payload);
    const cola2 = crearColaRelevamiento(almacen, async () => undefined);
    expect(cola2.estado().total).toBe(1);
    expect(cola2.estado().items[0]?.id).toBe('id-fijo');
  });

  it('expone JSON corrupto como estado honesto', () => {
    const almacen = new AlmacenFake();
    almacen.valor = '{"roto": ';
    const cola = crearColaRelevamiento(almacen, async () => undefined);
    const estado = cola.estado();
    expect(estado.corrupto).toBe(true);
    expect(estado.total).toBe(0);
  });

  it('detecta ErrorDeValidacion por duck-typing (name)', () => {
    const err = new Error('datos invalidos');
    err.name = 'ErrorDeValidacion';
    expect(esErrorDeValidacion(err)).toBe(true);
    expect(esErrorDeValidacion(new Error('otro'))).toBe(false);
    expect(esErrorDeValidacion(null)).toBe(false);
    expect(esErrorDeValidacion('string')).toBe(false);
  });
});

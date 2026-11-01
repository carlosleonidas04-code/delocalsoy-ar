// MARKET-CAP MK-2 (#254, sub-épica #152) — web: historial público F-3.
// Suite node (sin jsdom, vitest): normalización del historial (lista blanca
// espejo de contracts #254), paridad sintética SIEMPRE etiquetada [SINTÉTICO]
// (R15) y ApiDataSource.getComercioHistorial sin fallbacks silenciosos (R5:
// error es error — JAMÁS [] como máscara). Ejecución real al volver CI
// (R15, task 4fb0a626).

import { describe, expect, it } from 'vitest';
import { ApiDataSource, DataSourceHttpError, SyntheticDataSource } from './dataSource';
import { normalizarComercioHistorial, normalizarComercios } from './comercios';

const ENTRADAS_7 = [
  { type: 'comercio.ingestado', occurred_at: '2026-10-01T10:00:00.000Z' },
  {
    type: 'comercio.estado_cambiado',
    estado_anterior: 'propuesto',
    estado_nuevo: 'aprobado',
    justificacion: 'Verificación presencial del local.',
    moderador_hash: 'mod-abc123',
    occurred_at: '2026-10-02T10:00:00.000Z',
  },
  { type: 'comercio.titularidad_reclamada', metodo: 'documento_verificable', occurred_at: '2026-10-03T10:00:00.000Z' },
  {
    type: 'comercio.titularidad_verificada',
    metodo: 'documento_verificable',
    verificado_por_hash: 'mod-def456',
    occurred_at: '2026-10-04T10:00:00.000Z',
  },
  { type: 'comercio.titularidad_desistida', metodo: null, occurred_at: '2026-10-05T10:00:00.000Z' },
  {
    type: 'comercio.habilitacion_actualizada',
    estado_anterior: 'sin_dato',
    estado_nuevo: 'verificada',
    fuente_key: 'fuente_siic_web',
    justificacion: 'Certificado web SIIC presentado por el titular.',
    actualizado_por_hash: 'tit-ghi789',
    occurred_at: '2026-10-06T10:00:00.000Z',
  },
  { type: 'comercio.atributos_editados', titular_hash: 'tit-ghi789', occurred_at: '2026-10-07T10:00:00.000Z' },
];

describe('normalizarComercioHistorial (MK-2 #254 — lista blanca espejo)', () => {
  it('proyecta las 7 variantes de sello con origen real declarado', () => {
    const entradas = normalizarComercioHistorial({ success: true, data: ENTRADAS_7 });
    expect(entradas).toHaveLength(7);
    expect(entradas.map((e) => e.type)).toEqual([
      'comercio.ingestado',
      'comercio.estado_cambiado',
      'comercio.titularidad_reclamada',
      'comercio.titularidad_verificada',
      'comercio.titularidad_desistida',
      'comercio.habilitacion_actualizada',
      'comercio.atributos_editados',
    ]);
    expect(entradas.every((e) => e.sintetico === false)).toBe(true);
  });

  it('JAMÁS expone PII del reclamante (Ley 25.326, DH §7.2, H1)', () => {
    const json = JSON.stringify(normalizarComercioHistorial({ data: ENTRADAS_7 }));
    expect(json.includes('identificador_hash')).toBe(false);
    expect(json.includes('reclamado_por_hash')).toBe(false);
    expect(json.includes('desistido_por_hash')).toBe(false);
  });

  it('descarta sellos futuros y entradas malformadas (R15: no expuestos por omisión)', () => {
    const entradas = normalizarComercioHistorial({
      data: [
        ENTRADAS_7[0],
        { type: 'comercio.sello_futuro', occurred_at: '2026-10-08T10:00:00.000Z' },
        { type: 'comercio.ingestado' },
        'no-objeto',
      ],
    });
    expect(entradas).toHaveLength(1);
    expect(entradas[0].type).toBe('comercio.ingestado');
  });

  it('acepta envelope { data } y arreglo directo', () => {
    expect(normalizarComercioHistorial(ENTRADAS_7)).toHaveLength(7);
    expect(normalizarComercioHistorial({ data: ENTRADAS_7 })).toHaveLength(7);
  });

  it('H1: la ficha pública proyecta SOLO titularidad { estado } — sin hash del reclamante en el ítem', () => {
    const items = normalizarComercios({
      data: [
        {
          id: 'c-1',
          titulo: 'Comercio real',
          nodo_key: 'capital',
          rubro: { id: 'food_drink', rama: 'comercios', label: 'Alimentación y bebidas' },
          estado: 'aprobado',
          habilitacion: { estado: 'sin_dato' },
          titularidad: { estado: 'reclamada', reclamado_por_hash: 'hash-que-no-debe-viajar' },
          estado_epistemico: 'community_validated',
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].titularidad_estado).toBe('reclamada');
    expect(JSON.stringify(items[0]).includes('reclamado_por_hash')).toBe(false);
  });
});

describe('SyntheticDataSource.getComercioHistorial (paridad MK-2, R15)', () => {
  it('devuelve el ciclo demo completo SIEMPRE etiquetado sintético, en orden asc', async () => {
    const ds = new SyntheticDataSource();
    const entradas = await ds.getComercioHistorial('syn-com-capital-01');
    expect(entradas).toHaveLength(4);
    expect(entradas.every((e) => e.sintetico === true)).toBe(true);
    expect(entradas.map((e) => e.type)).toEqual([
      'comercio.ingestado',
      'comercio.titularidad_reclamada',
      'comercio.titularidad_verificada',
      'comercio.habilitacion_actualizada',
    ]);
    const habilitacion = entradas[3];
    if (habilitacion.type !== 'comercio.habilitacion_actualizada') {
      throw new Error('la 4ta entrada debe ser comercio.habilitacion_actualizada');
    }
    expect(habilitacion.fuente_key).toBe('fuente_siic_web');
    expect(habilitacion.justificacion.length).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < entradas.length; i += 1) {
      expect(entradas[i].occurred_at >= entradas[i - 1].occurred_at).toBe(true);
    }
  });

  it('H6: toda ficha sintética viva tiene al menos 1 entrada (comercio.ingestado)', async () => {
    const ds = new SyntheticDataSource();
    const entradas = await ds.getComercioHistorial('syn-com-capital-02');
    expect(entradas).toHaveLength(1);
    expect(entradas[0].type).toBe('comercio.ingestado');
  });

  it('404 explícito para ficha inexistente — JAMÁS [] como máscara (R5)', async () => {
    const ds = new SyntheticDataSource();
    let error: unknown = null;
    try {
      await ds.getComercioHistorial('no-existe');
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(DataSourceHttpError);
    expect((error as DataSourceHttpError).status).toBe(404);
    expect((error as DataSourceHttpError).endpoint).toBe('/api/comercios/no-existe/historial');
  });
});

describe('ApiDataSource.getComercioHistorial (R5: jamás [])', () => {
  const respuesta = (ok: boolean, status: number, body: unknown) => ({
    ok,
    status,
    headers: { get: () => null },
    json: async () => body,
  });

  it('HTTP 500 → DataSourceHttpError, JAMÁS un arreglo vacío', async () => {
    const ds = new ApiDataSource({
      fetchImpl: (async () => respuesta(false, 500, { error: 'fallo interno' })) as unknown as typeof fetch,
    });
    let error: unknown = null;
    try {
      await ds.getComercioHistorial('c-1');
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(DataSourceHttpError);
    expect((error as DataSourceHttpError).status).toBe(500);
  });

  it('respuesta malformada → DataSourceHttpError 500 con detalles', async () => {
    const ds = new ApiDataSource({
      fetchImpl: (async () => respuesta(true, 200, { success: true, data: { no: 'arreglo' } })) as unknown as typeof fetch,
    });
    let error: unknown = null;
    try {
      await ds.getComercioHistorial('c-1');
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(DataSourceHttpError);
    expect((error as DataSourceHttpError).status).toBe(500);
  });

  it('historial real → normalizado con sintetico: false', async () => {
    const ds = new ApiDataSource({
      fetchImpl: (async () => respuesta(true, 200, { success: true, data: ENTRADAS_7.slice(0, 2) })) as unknown as typeof fetch,
    });
    const entradas = await ds.getComercioHistorial('c-1');
    expect(entradas).toHaveLength(2);
    expect(entradas.every((e) => e.sintetico === false)).toBe(true);
  });
});

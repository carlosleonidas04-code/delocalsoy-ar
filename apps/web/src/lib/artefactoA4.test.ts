import { describe, expect, it } from 'vitest';
import { ErrorA4, MATRIZ_SELLOS_V0_2, coberturaSellos, crearClienteA4 } from './artefactoA4';

// Suite A4 (AR4 #403 — la primera del artefacto): transporte programado,
// nada de red. Se verifica la matriz v0.2, la cobertura, el query exacto de
// los métodos del libro contable y los errores R5 (visibles, jamás []).

interface RespuestaFake {
  status: number;
  json: () => Promise<unknown>;
  headers?: { get: (n: string) => string | null };
}

function clienteCon(respuesta: (ruta: string) => RespuestaFake, rutasVistas: string[] = []) {
  return crearClienteA4({
    transporte: (async (ruta: string) => {
      rutasVistas.push(ruta);
      return respuesta(ruta) as never;
    }) as never,
  });
}

describe('ARTEFACTOS-ROLES AR4 — matriz de sellos v0.2 (#403)', () => {
  it('el espejo MATRIZ_SELLOS_V0_2 tiene 44 filas — 33 de docs v0.2 + cluster.creado (AR4) + 4 de deuda saldadas por C5 (#412) + producto.atributos_editados (MK-3b #426) + comercio.relay_recibido (MK-4a #427) + practica.acreditada (LIC-R3 #452) + patrimonio.consentido (LIC-R7 #450) + salud.agregado_ingestado (LIC-R6 #449) + comunicacion.aviso_publicado (LIC-R8 #451) + convenio.declarado (LIC-R9 #456)', () => {
    expect(MATRIZ_SELLOS_V0_2).toHaveLength(45);
  });

  it('incluye la fila saldada cluster.creado (VIG-011 #378) y los sellos AR1 residencia.declarada/visitante.registrado', () => {
    const sellos = MATRIZ_SELLOS_V0_2.map((f) => f.sello);
    expect(sellos).toContain('cluster.creado');
    expect(sellos).toContain('residencia.declarada');
    expect(sellos).toContain('visitante.registrado');
    const fila = MATRIZ_SELLOS_V0_2.find((f) => f.sello === 'cluster.creado');
    expect(fila?.origen).toContain('VIG-011');
  });
});

describe('ARTEFACTOS-ROLES AR4 — cobertura de la matriz (#403)', () => {
  it('documenta los sellos con eventos y expone los sin eventos y los sin fila (honesto, R15)', () => {
    const cobertura = coberturaSellos([
      { type: 'reporte.recibido', count: 5 },
      { type: 'residencia.declarada', count: 2 },
      { type: 'subnodo.creado', count: 0 },
      { type: 'system.mode_change', count: 3 },
    ]);
    expect(cobertura.documentados).toHaveLength(2);
    expect(cobertura.documentados.find((d) => d.sello === 'reporte.recibido')?.count).toBe(5);
    // cluster.creado sin eventos → sinEventosAun (la fila existe desde AR4)
    expect(cobertura.sinEventosAun.map((f) => f.sello)).toContain('cluster.creado');
    expect(cobertura.sinEventosAun.map((f) => f.sello)).toContain('subnodo.creado');
    // system.* SIN fila en la matriz: hallazgo honesto expuesto, jamás escondido
    expect(cobertura.sinFilaEnMatriz).toEqual([{ type: 'system.mode_change', count: 3 }]);
  });

  it('la cobertura es exhaustiva: documentados + sinEventosAun = 44 filas de la matriz', () => {
    const cobertura = coberturaSellos(MATRIZ_SELLOS_V0_2.map((f, i) => ({ type: f.sello, count: i + 1 })));
    expect(cobertura.documentados).toHaveLength(45);
    expect(cobertura.sinEventosAun).toHaveLength(0);
    expect(cobertura.sinFilaEnMatriz).toHaveLength(0);
  });
});

describe('ARTEFACTOS-ROLES AR4 — cliente del libro contable (#403)', () => {
  it('sellos() arma el query exacto y parsea el envelope con total del body', async () => {
    const rutas: string[] = [];
    const cliente = clienteCon(
      () => ({
        status: 200,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'evt-1',
              type: 'reporte.recibido',
              hash: 'a'.repeat(64),
              occurred_at: '2026-11-07T01:00:00.000Z',
              payload: { nodo_key: 'iglesia' },
            },
          ],
          count: 1,
          total: 7,
          limit: 50,
          offset: 0,
        }),
      }),
      rutas
    );
    const r = await cliente.sellos({ nodo: 'iglesia', type: 'reporte.recibido', limit: 50, offset: 0 });
    expect(r.total).toBe(7);
    expect(r.sellos).toHaveLength(1);
    expect(r.sellos[0].id).toBe('evt-1');
    expect(r.sellos[0].type).toBe('reporte.recibido');
    expect(r.sellos[0].hash).toBe('a'.repeat(64));
    expect(r.sellos[0].occurred_at).toBe('2026-11-07T01:00:00.000Z');
    expect(r.sellos[0].payload.nodo_key).toBe('iglesia');
    // query exacto: filtros + paginación serializados
    expect(rutas[0]).toBe('/api/sellos?nodo=iglesia&type=reporte.recibido&limit=50&offset=0');
  });

  it('sellos() sin params usa la ruta limpia y lee el total del header cuando el body no lo trae', async () => {
    const rutas: string[] = [];
    const cliente = clienteCon(
      () => ({
        status: 200,
        headers: { get: (n: string) => (n === 'x-delocalsoy-total-count' ? '42' : null) },
        json: async () => ({ success: true, data: [], count: 0, limit: 50, offset: 0 }),
      }),
      rutas
    );
    const r = await cliente.sellos();
    expect(rutas[0]).toBe('/api/sellos');
    expect(r.total).toBe(42);
    expect(r.sellos).toEqual([]);
  });

  it('sellosTipos() parsea el conteo por type', async () => {
    const cliente = clienteCon(() => ({
      status: 200,
      json: async () => ({ success: true, data: [{ type: 'reporte.recibido', count: 5 }], count: 1, total: 5 }),
    }));
    const tipos = await cliente.sellosTipos();
    expect(tipos).toEqual([{ type: 'reporte.recibido', count: 5 }]);
  });
});

describe('ARTEFACTOS-ROLES AR4 — errores R5 del libro contable (#403)', () => {
  it('400 → ErrorA4 datos; 404 → no_encontrado; red caída → no_disponible', async () => {
    const c400 = clienteCon(() => ({ status: 400, json: async () => ({ success: false, error: 'datos inválidos' }) }));
    await expect(c400.sellos()).rejects.toMatchObject({ codigo: 'datos' });
    const c404 = clienteCon(() => ({ status: 404, json: async () => ({ success: false, error: 'no encontrado' }) }));
    await expect(c404.sellos()).rejects.toMatchObject({ codigo: 'no_encontrado' });
    const cCaida = crearClienteA4({
      transporte: (async () => {
        throw new Error('red caída');
      }) as never,
    });
    await expect(cCaida.sellos()).rejects.toMatchObject({ codigo: 'no_disponible' });
  });

  it('respuesta malformada es error visible, JAMÁS una lista vacía silenciosa', async () => {
    const cMal = clienteCon(() => ({ status: 200, json: async () => ({ success: true }) }));
    await expect(cMal.sellos()).rejects.toBeInstanceOf(ErrorA4);
    const cNoLista = clienteCon(() => ({ status: 200, json: async () => ({ success: true, data: { x: 1 } }) }));
    await expect(cNoLista.sellosTipos()).rejects.toBeInstanceOf(ErrorA4);
  });
});


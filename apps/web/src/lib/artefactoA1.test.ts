import { describe, it, expect } from 'vitest';
import {
  COMPONENTES_A1,
  MATRIZ_PERMISOS_A1,
  capacidadesA1,
  permisoVisible,
  crearClienteA1,
  ErrorA1,
  type CategoriaNodo,
  type TransporteSesion,
} from './artefactoA1';
import type { EstadoSesion } from './sesion';
import { RATE_LIMIT_VISITANTE } from './sesion';

/**
 * ART-R1 (#270, épica #268): suite node SIN jsdom, transporte programado
 * (patrón sesion.test.ts / activosApi.test.ts). R15 declarado: CI en
 * pausa (pre-activación #262) — la suite corre al volver Actions.
 */

interface Programada {
  status: number;
  cuerpo: unknown;
}

function crearTransporte() {
  const llamadas: Array<{ ruta: string; init?: Record<string, unknown> }> = [];
  let cola: Programada[] = [];
  const transporte: TransporteSesion = async (ruta, init) => {
    llamadas.push({ ruta, init: init as Record<string, unknown> });
    const sig = cola.length > 0 ? cola.shift() : { status: 500, cuerpo: { success: false } };
    return {
      ok: sig.status >= 200 && sig.status < 300,
      status: sig.status,
      json: async () => sig.cuerpo,
    };
  };
  const programar = (respuestas: Programada[]) => {
    cola = respuestas.slice();
  };
  return { llamadas, transporte, programar };
}

const sesionCiudadano: EstadoSesion = {
  tipo: 'sesion',
  usuario: { id: 'usr-1', email: 'v@t.test', rol: 'ciudadano', display_name: null },
};
const sesionModerador: EstadoSesion = {
  tipo: 'sesion',
  usuario: { id: 'usr-2', email: 'm@t.test', rol: 'moderador', display_name: null },
};

describe('ART-R1 — componentes y matriz v0.1', () => {
  it('los 9 componentes de la spec existen con estado honesto', () => {
    expect(COMPONENTES_A1.length).toBe(9);
    const ids = COMPONENTES_A1.map((c) => c.id);
    expect(new Set(ids).size).toBe(9);
    expect(MATRIZ_PERMISOS_A1.reporte_ciudadano).toEqual({
      visitante: 'leer',
      ciudadano: 'escribir',
      vecino: 'escribir',
    });
  });

  it('la matriz cubre exactamente los 9 componentes', () => {
    expect(Object.keys(MATRIZ_PERMISOS_A1).sort()).toEqual(
      COMPONENTES_A1.map((c) => c.id).sort()
    );
  });

  it('permisoVisible: visitante lee, ciudadano escribe, rol de plataforma usa columna vecino', () => {
    const visitante = capacidadesA1({ tipo: 'sin_sesion' });
    const ciudadano = capacidadesA1(sesionCiudadano);
    const moderador = capacidadesA1(sesionModerador);
    expect(permisoVisible('reporte_ciudadano', visitante)).toBe('leer');
    expect(permisoVisible('reporte_ciudadano', ciudadano)).toBe('escribir');
    expect(permisoVisible('reporte_ciudadano', moderador)).toBe('escribir');
    // Oportunidades (postular) en spec: visitante NUNCA escribe.
    expect(permisoVisible('banco_potencialidades', visitante)).toBe('leer');
  });
});

describe('ART-R1 — capacidades por estado de sesión', () => {
  it('sin sesión: visitante, lectura, techo 10', () => {
    const caps = capacidadesA1({ tipo: 'sin_sesion' });
    expect(caps.esVisitante).toBe(true);
    expect(caps.esDemo).toBe(false);
    expect(caps.puedeEscribir).toBe(false);
    expect(caps.puedeVerMios).toBe(false);
    expect(caps.techoReqsMin).toBe(RATE_LIMIT_VISITANTE);
    expect(RATE_LIMIT_VISITANTE).toBe(10);
  });

  it('synthetic: demo SINTÉTICO — las escrituras NO se acreditan (R15)', () => {
    const caps = capacidadesA1({ tipo: 'demo_sintetico', etiqueta: 'SINTETICO' });
    expect(caps.esDemo).toBe(true);
    expect(caps.puedeEscribir).toBe(false);
    expect(caps.puedeVerMios).toBe(false);
  });

  it('sesión ciudadano: escribe, ve propios, techo real 10 req/min', () => {
    const caps = capacidadesA1(sesionCiudadano);
    expect(caps.puedeEscribir).toBe(true);
    expect(caps.puedeVerMios).toBe(true);
    expect(caps.rol).toBe('ciudadano');
    expect(caps.techoReqsMin).toBe(10);
  });

  it('sesión moderador: techo real 100 req/min (tabla RBAC)', () => {
    const caps = capacidadesA1(sesionModerador);
    expect(caps.techoReqsMin).toBe(100);
  });
});

describe('ART-R1 — lectura pública (visitante sin token)', () => {
  it('categorias y reportesPublicos llaman a /api/nodos/:key SIN Authorization', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 200, cuerpo: { success: true, data: [{ id: 'c1', code: 'arbolado', label: 'Arbolado', layer: 'urbanismo' }], count: 1 } },
      { status: 200, cuerpo: { success: true, data: [{ id: 'r1', categoria: 'arbolado', descripcion: 'rama caída', estado: 'received', lat: -31.5, lng: -68.5, created_at: '2026-10-30T12:00:00.000Z', is_synthetic: false }], count: 1 } },
    ]);
    const cats: CategoriaNodo[] = await cliente.categorias('capital');
    const reportes = await cliente.reportesPublicos('capital');
    expect(cats[0].code).toBe('arbolado');
    expect(reportes[0].estado).toBe('received');
    expect(t.llamadas[0].ruta).toBe('/api/nodos/capital/categorias');
    expect(t.llamadas[1].ruta).toBe('/api/nodos/capital/reportes');
    for (const l of t.llamadas) {
      const headers = ((l.init ?? {}) as { headers?: Record<string, string> }).headers;
      expect(headers?.Authorization).toBeUndefined();
    }
  });

  it('404 de nodo → ErrorA1 nodo, nunca [] (R5)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'Nodo no encontrado' } }]);
    await expect(cliente.reportesPublicos('noexiste')).rejects.toMatchObject({ codigo: 'nodo' });
  });

  it('500 → ErrorA1 no_disponible (sin fallback silencioso)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([{ status: 500, cuerpo: { success: false, error: 'fallo' } }]);
    await expect(cliente.reportesPublicos('capital')).rejects.toBeInstanceOf(ErrorA1);
  });
});

describe('ART-R1 — escritura ciudadana (POST /api/reportes)', () => {
  it('201 con Bearer: el reporte nace received, nunca resuelto', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 201, cuerpo: { success: true, data: { id: 'r1', categoria: 'arbolado', descripcion: 'rama caída', estado: 'received', lat: -31.5, lng: -68.5, created_at: '2026-10-30T12:00:00.000Z', is_synthetic: false } } },
    ]);
    const { reporte, idempotente } = await cliente.crearReporte({
      nodo_key: 'capital',
      categoria: 'arbolado',
      descripcion: 'rama caída sobre vereda',
      lat: -31.5,
      lng: -68.5,
    });
    expect(reporte.estado).toBe('received');
    expect(idempotente).toBe(false);
    const init = t.llamadas[0].init as { method: string; headers: Record<string, string>; body: string };
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    expect(JSON.parse(init.body)).toEqual({
      nodo_key: 'capital',
      categoria: 'arbolado',
      descripcion: 'rama caída sobre vereda',
      lat: -31.5,
      lng: -68.5,
    });
  });

  it('200 idempotente: reintento del mismo ciudadano no duplica', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 200, cuerpo: { success: true, data: { id: 'r1', estado: 'received' }, idempotente: true } },
    ]);
    const { idempotente } = await cliente.crearReporte({
      nodo_key: 'capital', categoria: 'arbolado', descripcion: 'duplicado', lat: null, lng: null,
    });
    expect(idempotente).toBe(true);
  });

  it('400 categoría inexistente → codigo categoria', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 400, cuerpo: { success: false, error: 'categoría inexistente en el vocabulario del nodo' } },
    ]);
    await expect(cliente.crearReporte({ nodo_key: 'capital', categoria: 'zzz', descripcion: 'x'.repeat(20), lat: null, lng: null }))
      .rejects.toMatchObject({ codigo: 'categoria' });
  });

  it('400 anti-PII (sin campo success en la respuesta real) → codigo pii', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 400, cuerpo: { error: 'payload rechazado: contiene datos personales identificables (DNI) — ADR-020 cond. 1, Ley 25.326' } },
    ]);
    await expect(cliente.crearReporte({ nodo_key: 'capital', categoria: 'arbolado', descripcion: 'mi DNI 30123456', lat: null, lng: null }))
      .rejects.toMatchObject({ codigo: 'pii' });
  });

  it('401 → credenciales; sin token local → credenciales ANTES de llamar', async () => {
    const t = crearTransporte();
    const sinToken = crearClienteA1({ transporte: t.transporte, token: () => null });
    await expect(sinToken.crearReporte({ nodo_key: 'capital', categoria: 'a', descripcion: 'b', lat: null, lng: null }))
      .rejects.toMatchObject({ codigo: 'credenciales' });
    expect(t.llamadas.length).toBe(0);

    t.programar([{ status: 401, cuerpo: { success: false, error: 'sesión inválida' } }]);
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-vencido' });
    await expect(cliente.crearReporte({ nodo_key: 'capital', categoria: 'a', descripcion: 'b', lat: null, lng: null }))
      .rejects.toMatchObject({ codigo: 'credenciales' });
  });
});

describe('ART-R1 — mis reportes e historial', () => {
  it('mios con Bearer: transiciones selladas con justificación pública', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          count: 1,
          data: [
            {
              id: 'r1',
              nodo_key: 'capital',
              categoria: 'arbolado',
              descripcion: 'rama caída',
              estado: 'resolved',
              lat: -31.5,
              lng: -68.5,
              created_at: '2026-10-30T12:00:00.000Z',
              transiciones: [
                {
                  estado_anterior: 'received',
                  estado_nuevo: 'resolved',
                  justificacion: 'intervención verificada por la cuadrilla municipal',
                  moderador_hash: 'abc123',
                  occurred_at: '2026-10-30T15:00:00.000Z',
                },
              ],
            },
          ],
        },
      },
    ]);
    const mios = await cliente.mios();
    expect(mios.length).toBe(1);
    expect(mios[0].nodo_key).toBe('capital');
    expect(mios[0].transiciones[0].justificacion).toContain('verificada');
    const init = t.llamadas[0].init as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    expect(t.llamadas[0].ruta).toBe('/api/reportes/mios');
  });

  it('mios sin token → credenciales (nunca llama)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    await expect(cliente.mios()).rejects.toMatchObject({ codigo: 'credenciales' });
    expect(t.llamadas.length).toBe(0);
  });

  it('historial público sin token: transiciones del ciclo', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: {
            reporte_id: 'r1',
            transiciones: [
              { estado_anterior: 'received', estado_nuevo: 'in_review', justificacion: 'en revisión', moderador_hash: 'abc', occurred_at: '2026-10-30T14:00:00.000Z' },
            ],
          },
        },
      },
    ]);
    const transiciones = await cliente.historial('r1');
    expect(transiciones.length).toBe(1);
    expect(transiciones[0].estado_nuevo).toBe('in_review');
    expect(t.llamadas[0].ruta).toBe('/api/reportes/r1/historial');
    const init = (t.llamadas[0].init ?? {}) as { headers?: Record<string, string> };
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('historial 404 (descartado nunca publicable) → no_encontrado', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'reporte no encontrado' } }]);
    await expect(cliente.historial('r-descartado')).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });

  it('fallo de red → ErrorA1 no_disponible', async () => {
    const roto: TransporteSesion = async () => {
      throw new Error('red caída');
    };
    const cliente = crearClienteA1({ transporte: roto, token: () => 'jwt-1' });
    await expect(cliente.mios()).rejects.toBeInstanceOf(ErrorA1);
  });
});

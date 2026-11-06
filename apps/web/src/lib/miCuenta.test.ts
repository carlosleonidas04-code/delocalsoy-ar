import { describe, it, expect } from 'vitest';
import {
  crearClienteMiCuenta,
  ErrorMiCuenta,
  perfilDeCuenta,
  PERFILES_CUENTA,
  NODOS,
  type TransporteMiCuenta,
} from './miCuenta';
import type { UsuarioSesion } from './sesion';

/**
 * ARTEFACTOS-ROLES AR1 (#400, épica #399): suite node SIN jsdom con
 * dependencias inyectadas (patrón sesion.test.ts / activosApi.test.ts
 * del repo). R15: el cliente consume las superficies REALES de la API
 * (main @ 512c3686) — nada se simula del lado de los shapes.
 */

interface Programada {
  status: number;
  cuerpo: unknown;
}

function crearEntorno() {
  const llamadas: Array<{ ruta: string; init?: Record<string, unknown> }> = [];
  let cola: Programada[] = [];
  let tokenFijo: string | null = null;
  const transporte: TransporteMiCuenta = async (ruta, init) => {
    llamadas.push({ ruta, init: init as Record<string, unknown> });
    const sig = cola.shift() ?? { status: 500, cuerpo: { success: false } };
    return {
      ok: sig.status >= 200 && sig.status < 300,
      status: sig.status,
      json: async () => sig.cuerpo,
    };
  };
  const programar = (respuestas: Programada[]) => {
    cola = respuestas.slice();
  };
  const token = () => tokenFijo;
  return { llamadas, transporte, programar, setToken: (t: string | null) => (tokenFijo = t), token };
}

function usuario(over: Partial<UsuarioSesion> = {}): UsuarioSesion {
  return { id: 'usr-1', email: 'a@b.test', rol: 'ciudadano', display_name: null, ...over };
}

describe('miCuenta AR1 — perfilDeCuenta (atributo, NO rol)', () => {
  it('ciudadano sin residencia declarada → perfil ciudadano', () => {
    expect(perfilDeCuenta(usuario())).toBe('ciudadano');
  });

  it('ciudadano CON residencia declarada → perfil vecino (atributo derivado, decisión DH)', () => {
    expect(perfilDeCuenta(usuario({ residencia_subnodo_key: 'sj_iglesia_barreal' }))).toBe('vecino');
  });

  it('rol visitante → perfil visitante (solo lectura v0.2), aun con tránsito declarado', () => {
    expect(perfilDeCuenta(usuario({ rol: 'visitante', transito_subnodo_key: 'sj_iglesia_barreal' }))).toBe('visitante');
  });
});

describe('miCuenta AR1 — PERFILES_CUENTA y NODOS como microcopy', () => {
  it('los 3 perfiles están documentados sin solaparse', () => {
    const perfiles = PERFILES_CUENTA.map((p) => p.perfil);
    expect(perfiles.sort()).toEqual(['ciudadano', 'vecino', 'visitante']);
    for (const p of PERFILES_CUENTA) {
      expect(p.etiqueta.length).toBeGreaterThan(0);
      expect(p.detalle.length).toBeGreaterThan(0);
    }
  });

  it('NODOS espeja el vocabulario real del repo', () => {
    expect(NODOS).toEqual(['capital', 'caucete', 'iglesia']);
  });
});

describe('miCuenta AR1 — declararResidencia (PUT /api/me/residencia)', () => {
  it('envía Bearer token y el subnodo declarado; 200 devuelve el atributo', async () => {
    const e = crearEntorno();
    e.setToken('jwt-123');
    const cliente = crearClienteMiCuenta({ transporte: e.transporte, token: e.token });
    e.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: { residencia_subnodo_key: 'sj_iglesia_barreal', residencia_declarada_en: '2026-11-06T14:00:00.000Z' },
        },
      },
    ]);
    const r = await cliente.declararResidencia('sj_iglesia_barreal');
    expect(r.residencia_subnodo_key).toBe('sj_iglesia_barreal');
    expect(e.llamadas[0].ruta).toBe('/api/me/residencia');
    const init = e.llamadas[0].init as { method: string; body: string; headers: Record<string, string> };
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBe('Bearer jwt-123');
    expect(JSON.parse(init.body)).toEqual({ subnodo_key: 'sj_iglesia_barreal' });
  });

  it('sin token → ErrorMiCuenta credenciales ANTES de llamar a la API', async () => {
    const e = crearEntorno();
    e.setToken(null);
    const cliente = crearClienteMiCuenta({ transporte: e.transporte, token: e.token });
    await expect(cliente.declararResidencia('sj_iglesia_barreal')).rejects.toMatchObject({
      codigo: 'credenciales',
    });
    expect(e.llamadas.length).toBe(0);
  });

  it('400 (subnodo inexistente) → ErrorMiCuenta datos con el mensaje de la API', async () => {
    const e = crearEntorno();
    e.setToken('jwt-123');
    const cliente = crearClienteMiCuenta({ transporte: e.transporte, token: e.token });
    e.programar([
      { status: 400, cuerpo: { success: false, error: 'el subnodo declarado no existe en el vocabulario del nodo' } },
    ]);
    await expect(cliente.declararResidencia('no_existe')).rejects.toMatchObject({ codigo: 'datos' });
  });

  it('403 (visitante) → ErrorMiCuenta rol — la API es la compuerta', async () => {
    const e = crearEntorno();
    e.setToken('jwt-visita');
    const cliente = crearClienteMiCuenta({ transporte: e.transporte, token: e.token });
    e.programar([{ status: 403, cuerpo: { success: false, error: 'requiere rol: ciudadano|moderador|admin' } }]);
    await expect(cliente.declararResidencia('sj_iglesia_barreal')).rejects.toMatchObject({ codigo: 'rol' });
  });

  it('fallo de red → ErrorMiCuenta no_disponible', async () => {
    const roto: TransporteMiCuenta = async () => {
      throw new Error('red caida');
    };
    const e = crearEntorno();
    e.setToken('jwt-123');
    const cliente = crearClienteMiCuenta({ transporte: roto, token: e.token });
    await expect(cliente.declararResidencia('sj_iglesia_barreal')).rejects.toBeInstanceOf(ErrorMiCuenta);
  });
});

describe('miCuenta AR1 — lectura del vocabulario y tablero', () => {
  it('subnodos: GET público del nodo y mapping key/label/type', async () => {
    const e = crearEntorno();
    const cliente = crearClienteMiCuenta({ transporte: e.transporte, token: e.token });
    e.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          count: 2,
          data: [
            { key: 'sj_iglesia_barreal', label: 'Barreal', type: 'district' },
            { key: 'sj_iglesia_p_albardón', label: 'Albardón', type: 'paraje' },
          ],
        },
      },
    ]);
    const subs = await cliente.subnodos('iglesia');
    expect(e.llamadas[0].ruta).toBe('/api/nodos/iglesia/subnodos');
    expect(subs).toEqual([
      { key: 'sj_iglesia_barreal', label: 'Barreal', type: 'district' },
      { key: 'sj_iglesia_p_albardón', label: 'Albardón', type: 'paraje' },
    ]);
  });

  it('subnodos 404 (nodo inexistente) → ErrorMiCuenta no_disponible', async () => {
    const e = crearEntorno();
    const cliente = crearClienteMiCuenta({ transporte: e.transporte, token: e.token });
    e.programar([{ status: 404, cuerpo: { success: false, error: 'Nodo no encontrado' } }]);
    await expect(cliente.subnodos('caucete')).rejects.toMatchObject({ codigo: 'no_disponible' });
  });

  it('tableroPedidos: GET público ?nodo= y shape del tablero DPV (VIG-012)', async () => {
    const e = crearEntorno();
    const cliente = crearClienteMiCuenta({ transporte: e.transporte, token: e.token });
    e.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          count: 0,
          data: {
            esperados_documento: 15,
            presentados: 0,
            respondidos: 0,
            respondidos_en_plazo: 0,
            respondidos_tardio: 0,
            sin_respuesta: 0,
            en_espera: 0,
            fecha_corte: '2026-11-06',
            cobertura: '0 de 15 presentados · 0 respondidos (corte 2026-11-06)',
            fuente: 'documento vecinal interno (procedencia declarada, sin firmantes — ADR-027)',
            pedidos: [],
          },
        },
      },
    ]);
    const tablero = await cliente.tableroPedidos('iglesia');
    expect(e.llamadas[0].ruta).toBe('/api/pedidos?nodo=iglesia');
    expect(tablero.esperados_documento).toBe(15);
    expect(tablero.cobertura).toContain('0 de 15');
    expect(tablero.fecha_corte).toBe('2026-11-06');
  });
});

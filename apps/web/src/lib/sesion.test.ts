import { describe, it, expect } from 'vitest';
import {
  crearSesion,
  SesionError,
  CLAVE_TOKEN_SESION,
  RATE_LIMIT_POR_ROL,
  puedeEscribir,
  puedeModerar,
  puedePublicarIngestas,
  type TransporteSesion,
  type AlmacenSesion,
} from './sesion';

/**
 * ART-R0 (#269, epica #268): suite node SIN jsdom, dependencias inyectadas
 * (patron activosApi.test.ts del repo). R15 declarado: CI en pausa — la
 * suite corre al volver Actions (pre-activacion #262).
 */

interface Programada {
  status: number;
  cuerpo: unknown;
}

function crearEntorno() {
  const almacenMap = new Map<string, string>();
  const almacen: AlmacenSesion = {
    getItem: (clave: string) => almacenMap.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      almacenMap.set(clave, valor);
    },
    removeItem: (clave: string) => {
      almacenMap.delete(clave);
    },
  };
  const llamadas: Array<{ ruta: string; init?: Record<string, unknown> }> = [];
  let cola: Programada[] = [];
  const transporte: TransporteSesion = async (ruta, init) => {
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
  return { almacen, almacenMap, llamadas, transporte, programar };
}

const usuarioDemo = {
  id: 'usr-1',
  email: 'vecina@ejemplo.test',
  rol: 'ciudadano',
  display_name: 'Vecina',
};

describe('sesion ART-R0 — registro', () => {
  it('regresa el usuario ciudadano en 201 y no persiste nada', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen });
    e.programar([{ status: 201, cuerpo: { success: true, data: usuarioDemo } }]);
    const u = await sesion.registrar('vecina@ejemplo.test', 'clave-segura');
    expect(u.rol).toBe('ciudadano');
    expect(u.email).toBe('vecina@ejemplo.test');
    expect(e.almacenMap.size).toBe(0);
    expect(e.llamadas[0].ruta).toBe('/api/auth/register');
  });

  it('omite display_name vacio (el Zod del API rechaza null explicito)', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen });
    e.programar([{ status: 201, cuerpo: { success: true, data: usuarioDemo } }]);
    await sesion.registrar('vecina@ejemplo.test', 'clave-segura', '');
    const init = e.llamadas[0].init as { body: string };
    expect(JSON.parse(init.body).display_name).toBeUndefined();
  });

  it('409 -> SesionError email_existente', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen });
    e.programar([{ status: 409, cuerpo: { success: false, error: 'el email ya esta registrado' } }]);
    await expect(sesion.registrar('x@y.test', 'clave')).rejects.toMatchObject({
      codigo: 'email_existente',
    });
  });
});

describe('sesion ART-R0 — login', () => {
  it('persiste SOLO el token (anti-PII: el email jamas al almacen)', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen });
    e.programar([
      {
        status: 200,
        cuerpo: { success: true, data: { token: 'jwt-123', usuario: usuarioDemo } },
      },
    ]);
    const u = await sesion.iniciar('vecina@ejemplo.test', 'clave-segura');
    expect(u.rol).toBe('ciudadano');
    expect(e.almacenMap.get(CLAVE_TOKEN_SESION)).toBe('jwt-123');
    expect(e.almacenMap.size).toBe(1);
    expect(Array.from(e.almacenMap.keys()).every((k) => k.includes('email'))).toBe(false);
  });

  it('401 -> credenciales genericas (AUD-04: no delata registros) y sin token', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen });
    e.programar([{ status: 401, cuerpo: { success: false, error: 'credenciales invalidas' } }]);
    await expect(sesion.iniciar('x@y.test', 'mal')).rejects.toMatchObject({
      codigo: 'credenciales',
    });
    expect(e.almacenMap.size).toBe(0);
  });

  it('fallo de red -> SesionError no_disponible', async () => {
    const roto: TransporteSesion = async () => {
      throw new Error('red caida');
    };
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: roto, almacen: e.almacen });
    await expect(sesion.iniciar('x@y.test', 'mal')).rejects.toBeInstanceOf(SesionError);
  });
});

describe('sesion ART-R0 — identidad y logout', () => {
  it('quienSoy envia Bearer y devuelve sesion con usuario', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen });
    e.almacenMap.set(CLAVE_TOKEN_SESION, 'jwt-123');
    e.programar([{ status: 200, cuerpo: { success: true, data: usuarioDemo } }]);
    const estado = await sesion.quienSoy();
    expect(estado.tipo).toBe('sesion');
    const init = e.llamadas[0].init as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer jwt-123');
  });

  it('401 en /me limpia el token vencido y queda sin_sesion', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen });
    e.almacenMap.set(CLAVE_TOKEN_SESION, 'jwt-vencido');
    e.programar([{ status: 401, cuerpo: { success: false, error: 'sesion invalida' } }]);
    const estado = await sesion.quienSoy();
    expect(estado.tipo).toBe('sin_sesion');
    expect(e.almacenMap.has(CLAVE_TOKEN_SESION)).toBe(false);
  });

  it('cerrarSesion borra el token', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen });
    e.almacenMap.set(CLAVE_TOKEN_SESION, 'jwt-123');
    sesion.cerrarSesion();
    expect(e.almacenMap.size).toBe(0);
  });
});

describe('sesion ART-R0 — degradacion honesta a synthetic', () => {
  it('modo synthetic: estado demo_sintetico, sin transporte y sin token', async () => {
    const e = crearEntorno();
    const sesion = crearSesion({ transporte: e.transporte, almacen: e.almacen, modo: 'synthetic' });
    const estado = await sesion.quienSoy();
    expect(estado).toEqual({ tipo: 'demo_sintetico', etiqueta: 'SINTETICO' });
    expect(e.llamadas.length).toBe(0);
    expect(sesion.tokenActual()).toBeNull();
  });
});

describe('sesion ART-R0 — gates de competencias (docs/artefactos/ v0.1)', () => {
  it('puedeEscribir exige sesion real; synthetic es demo', () => {
    expect(puedeEscribir({ tipo: 'sesion', usuario: { id: '1', email: 'a@b.test', rol: 'ciudadano', display_name: null } })).toBe(true);
    expect(puedeEscribir({ tipo: 'sin_sesion' })).toBe(false);
    expect(puedeEscribir({ tipo: 'demo_sintetico', etiqueta: 'SINTETICO' })).toBe(false);
  });

  it('puedeModerar y puedePublicarIngestas siguen la matriz A3', () => {
    expect(puedeModerar('moderador')).toBe(true);
    expect(puedeModerar('admin_nodo')).toBe(true);
    expect(puedeModerar('ciudadano')).toBe(false);
    expect(puedePublicarIngestas('admin_nodo')).toBe(true);
    expect(puedePublicarIngestas('moderador')).toBe(false);
  });

  it('tabla RBAC real como microcopy (10/100/500)', () => {
    expect(RATE_LIMIT_POR_ROL.ciudadano).toBe(10);
    expect(RATE_LIMIT_POR_ROL.moderador).toBe(100);
    expect(RATE_LIMIT_POR_ROL.auditor).toBe(500);
  });
});

import { describe, it, expect } from 'vitest';
import {
  COMPONENTES_A2,
  MATRIZ_PERMISOS_A2,
  capacidadesA2,
  permisoVisibleA2,
  crearClienteA2,
  validarAltaComercio,
  validarAtributosComercio,
  validarHabilitacionComercio,
  validarJustificacion,
  validarReclamoTitularidad,
  validarBusquedaComercio,
  ErrorA2,
  NODOS_COMERCIO,
  type NuevaAltaComercio,
} from './artefactoA2';
import type { EstadoSesion, TransporteSesion } from './sesion';
import { RATE_LIMIT_VISITANTE } from './sesion';

/**
 * ART-R4 — Artefacto A2 comerciante y titular verificado (#273, épica #268):
 * suite node SIN jsdom, transporte programado (patrón sesion.test.ts /
 * artefactoA1.test.ts / artefactoA3.test.ts). Superficie contrastada contra
 * main @ 1da44723 (routes/comercios.ts + contracts/comercios.ts).
 *
 * ARTEFACTOS-ROLES AR2 (#401, épica #399 — 2026-11-07): suite de la vista
 * comerciante — pre-check de la búsqueda por facetas reales del directorio
 * y query exacto de las tres facetas en una sola llamada.
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
  return { transporte, llamadas, programar };
}

function sesion(rol: string): EstadoSesion {
  return {
    tipo: 'sesion',
    usuario: { id: 'u1', email: 'titular@ejemplo.ar', rol: rol as never, display_name: null },
  };
}

const SIN_SESION: EstadoSesion = { tipo: 'sin_sesion' };
const DEMO: EstadoSesion = { tipo: 'demo_sintetico', etiqueta: 'SINTETICO' };

const ALTA_EJEMPLO: NuevaAltaComercio = {
  nodo_key: 'capital',
  titulo: 'Almacén de barrio Doña Rosa',
  rubro_id: 'food_drink',
  tipo: 'local',
  descripcion: 'almacén de proximidad con venta directa',
  atributos: { venta_directa: true, delivery: false, pagos: ['efectivo'], accesibilidad: 'declarada' },
  habilitacion: { estado: 'sin_dato' },
};

const FICHA_PUBLICA = {
  id: 'c1',
  titulo: 'Almacén de barrio Doña Rosa',
  descripcion: 'almacén de proximidad con venta directa',
  nodo_key: 'capital',
  subnodo_key: null,
  lat: -31.5375,
  lng: -68.5374,
  rubro: { id: 'food_drink', rama: 'comercios', label: 'Comida y bebida' },
  estado: 'aprobado',
  habilitacion: { estado: 'verificada', tipo: 'municipal', numero: 'HAB-2026-001', fuente_key: 'fuente_siic_web', url: 'https://siic.example.gob.ar/HAB-2026-001', fecha_verificacion: '2026-10-20' },
  titularidad: { estado: 'verificada' },
  estado_epistemico: 'verified',
};

describe('ART-R4 — matriz de componentes A2 (serie docs v0.1)', () => {
  it('10 componentes con estado honesto contrastado', () => {
    expect(COMPONENTES_A2.length).toBe(10);
    expect(new Set(COMPONENTES_A2.map((c) => c.id)).size).toBe(10);
    // 9 en main (MK-1/MK-2 + VIG-005 ya mergeados); marketplace ◇ fase 2 por diseño.
    expect(COMPONENTES_A2.filter((c) => c.estado === 'en_main').length).toBe(9);
    const mk = COMPONENTES_A2.find((c) => c.id === 'marketplace');
    expect(mk?.estado).toBe('propuesto');
    expect(mk?.resumen).toContain('sin pagos');
  });

  it('la matriz declarada cubre los 10 componentes × 4 columnas', () => {
    expect(Object.keys(MATRIZ_PERMISOS_A2).length).toBe(10);
    for (const fila of Object.values(MATRIZ_PERMISOS_A2)) {
      expect(Object.keys(fila).length).toBe(4);
    }
    // Spec §3: el visitante SOLO lee (directorio, ficha, ofertas aprobadas, historial).
    expect(MATRIZ_PERMISOS_A2.alta_comercio.visitante).toBeNull();
    expect(MATRIZ_PERMISOS_A2.directorio_publico.visitante).toBe('leer');
    // La verificación de titularidad es SOLO moderación.
    expect(MATRIZ_PERMISOS_A2.titularidad_verificacion.ciudadano).toBeNull();
    expect(MATRIZ_PERMISOS_A2.titularidad_verificacion.moderacion).toBe('moderar');
  });

  it('hallazgo 2: la columna «titular verificado» es estado de ficha, no rol de sesión', () => {
    // La matriz la DECLARA (spec §3), pero ninguna sesión la deriva: la API
    // es la compuerta (403 real). El reclamo es del ciudadano con sesión.
    expect(MATRIZ_PERMISOS_A2.titularidad_reclamo.titular_verificado).toBeNull();
    expect(MATRIZ_PERMISOS_A2.edicion_atributos.titular_verificado).toBe('escribir');
  });
});

describe('ART-R4 — capacidades por sesión (gates efectivos)', () => {
  it('visitante: lectura pública, techo 10 req/min, sin escritura', () => {
    const caps = capacidadesA2(SIN_SESION);
    expect(caps.esVisitante).toBe(true);
    expect(caps.esDemo).toBe(false);
    expect(caps.techoReqsMin).toBe(RATE_LIMIT_VISITANTE);
    expect(caps.puedeEscribir).toBe(false);
    expect(caps.puedeModerar).toBe(false);
  });

  it('ciudadano con JWT: escribe (alta, reclamo), NO verifica titularidad', () => {
    const caps = capacidadesA2(sesion('ciudadano'));
    expect(caps.puedeEscribir).toBe(true);
    expect(caps.puedeModerar).toBe(false);
    expect(caps.techoReqsMin).toBe(10);
  });

  it("hallazgo (mismo A3): rol API 'admin' NO está en RolPlataforma — se normaliza a moderación plena", () => {
    const caps = capacidadesA2(sesion('admin'));
    expect(caps.puedeModerar).toBe(true);
    expect(caps.techoReqsMin).toBe(500);
  });

  it('moderador: verifica titularidad y cambia habilitación, techo 100', () => {
    const caps = capacidadesA2(sesion('moderador'));
    expect(caps.puedeModerar).toBe(true);
    expect(caps.techoReqsMin).toBe(100);
  });

  it('synthetic: demo SINTÉTICO declarada — sin escritura acreditada (R15)', () => {
    const caps = capacidadesA2(DEMO);
    expect(caps.esDemo).toBe(true);
    expect(caps.puedeEscribir).toBe(false);
    expect(caps.puedeModerar).toBe(false);
  });

  it('permisoVisibleA2: moderador ve su columna; ciudadano cae a la suya; visitante a la pública', () => {
    const mod = capacidadesA2(sesion('moderador'));
    const ciu = capacidadesA2(sesion('ciudadano'));
    const vis = capacidadesA2(SIN_SESION);
    expect(permisoVisibleA2('titularidad_verificacion', mod)).toBe('moderar');
    expect(permisoVisibleA2('titularidad_verificacion', ciu)).toBeNull();
    expect(permisoVisibleA2('alta_comercio', ciu)).toBe('escribir');
    expect(permisoVisibleA2('alta_comercio', vis)).toBeNull();
    expect(permisoVisibleA2('historial_confianza', vis)).toBe('leer');
  });
});

describe('ART-R4 — validadores de pre-check (la API es la compuerta real)', () => {
  it('alta válida pasa; título corto, rubro y nodo inválidos NO', () => {
    expect(validarAltaComercio(ALTA_EJEMPLO)).toBeNull();
    expect(validarAltaComercio({ ...ALTA_EJEMPLO, titulo: 'al' })).toContain('título');
    expect(validarAltaComercio({ ...ALTA_EJEMPLO, rubro_id: 'Rubro Inválido' })).toContain('rubro_id');
    expect(validarAltaComercio({ ...ALTA_EJEMPLO, nodo_key: 'mendoza' as never })).toContain('nodo');
    expect(NODOS_COMERCIO).toEqual(['capital', 'caucete', 'iglesia']);
  });

  it('lat/lng números en rango (lección R1: el schema real exige números)', () => {
    expect(validarAltaComercio({ ...ALTA_EJEMPLO, lat: -120 })).toContain('lat');
    expect(validarAltaComercio({ ...ALTA_EJEMPLO, lng: 200 })).toContain('lng');
    expect(validarAltaComercio({ ...ALTA_EJEMPLO, lat: -31.5, lng: -68.5 })).toBeNull();
  });

  it('ADR-035: verificada exige evidencia primaria completa; silencio positivo exige fecha', () => {
    expect(
      validarHabilitacionComercio({ estado: 'verificada', tipo: 'municipal', numero: 'H-1', fuente_key: 'fuente_siic_web' })
    ).toContain('url');
    expect(validarHabilitacionComercio({ estado: 'verificada' })).toContain('ADR-035');
    expect(validarHabilitacionComercio({ estado: 'silencio_positivo' })).toContain('fecha_presentacion');
    expect(validarHabilitacionComercio({ estado: 'silencio_positivo', fecha_presentacion: '2026-10-01' })).toBeNull();
    expect(validarHabilitacionComercio({ estado: 'sin_dato' })).toBeNull();
  });

  it('atributos: pagos y accesibilidad dentro del enum (schema .strict())', () => {
    expect(
      validarAtributosComercio({ venta_directa: true, delivery: false, pagos: ['cripto' as never], accesibilidad: 'unknown' })
    ).toContain('medio de pago');
    expect(
      validarAtributosComercio({ venta_directa: false, delivery: false, pagos: [], accesibilidad: 'rapida' as never })
    ).toContain('accesibilidad');
    expect(validarAtributosComercio({ venta_directa: false, delivery: true, pagos: ['qr'], accesibilidad: 'declarada' })).toBeNull();
  });

  it('ADR-038: justificación pública >=10 obligatoria', () => {
    expect(validarJustificacion('corta')).toContain('ADR-038');
    expect(validarJustificacion('actualización con evidencia SIIC del expediente')).toBeNull();
  });

  it('reclamo: identificador 4–60 y consentimiento EXPLÍCITO (nunca pre-marcado, ADR-027)', () => {
    expect(validarReclamoTitularidad('cuit', '20-12345678-9', true)).toBeNull();
    expect(validarReclamoTitularidad('cuit', '20', true)).toContain('identificador');
    expect(validarReclamoTitularidad('cuit', '20-12345678-9', false)).toContain('consentimiento');
    expect(validarReclamoTitularidad('dni' as never, 'x', true)).toContain('método');
  });
});

describe('AR2 (#401, épica #399) — búsqueda del directorio: buscar → ver → reclamar', () => {
  it('pre-check de búsqueda válido pasa; sin filtros también (directorio completo)', () => {
    expect(
      validarBusquedaComercio({ nodo: 'capital', rubro: 'food_drink', habilitacion: 'verificada' })
    ).toBeNull();
    expect(validarBusquedaComercio({})).toBeNull();
  });

  it('pre-check espejo de los guards de GET /api/comercios (el 400 se evita, no se reemplaza)', () => {
    expect(validarBusquedaComercio({ nodo: 'mendoza' })).toContain('nodo');
    expect(validarBusquedaComercio({ rubro: 'Comida y Bebida' })).toContain('rubro');
    expect(validarBusquedaComercio({ rubro: 'cat-alimentos' })).toBeNull(); // legado válido
    expect(validarBusquedaComercio({ habilitacion: 'rapida' })).toContain('habilitación');
  });

  it('las tres facetas viajan en UNA llamada con query exacto', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: [FICHA_PUBLICA] } }]);
    const comercios = await cliente.directorio({
      nodo: 'caucete',
      rubro: 'food_drink',
      habilitacion: 'verificada',
    });
    expect(comercios.length).toBe(1);
    expect(t.llamadas[0].ruta).toBe(
      '/api/comercios?nodo=caucete&rubro=food_drink&habilitacion=verificada'
    );
  });
});

describe('ART-R4 — directorio público (solo aprobado+public, ADR-036)', () => {
  it('lectura con facetas: query exacto, sin Authorization', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: [FICHA_PUBLICA] } }]);
    const comercios = await cliente.directorio({ rubro: 'food_drink', nodo: 'capital' });
    expect(comercios.length).toBe(1);
    expect(comercios[0].estado_epistemico).toBe('verified');
    expect(comercios[0].habilitacion_estado).toBe('verificada');
    expect(comercios[0].titularidad_estado).toBe('verificada');
    expect(t.llamadas[0].ruta).toBe('/api/comercios?rubro=food_drink&nodo=capital');
    const init0 = (t.llamadas[0].init ?? {}) as Record<string, unknown>;
    expect(init0.headers).toBeUndefined(); // lectura anónima
  });

  it('count 0 honesto (seed 0 comercios, decisión DH, patrón VIG-005)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: [] } }]);
    expect(await cliente.directorio()).toEqual([]);
  });
});

describe('ART-R4 — ficha e historial (F-3, 404 sin eco)', () => {
  it('ficha: rubro por código, productos aprobados y count', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => null });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: {
            ...FICHA_PUBLICA,
            operativa: null,
            productos: [{ id: 'p1', nombre: 'queso de cabra', estado: 'aprobado' }],
            count_productos: 1,
          },
        },
      },
    ]);
    const detalle = await cliente.ficha('c1');
    expect(detalle.ficha.id).toBe('c1');
    expect(detalle.ficha.rubro.id).toBe('food_drink');
    expect(detalle.productos.length).toBe(1);
    expect(detalle.count_productos).toBe(1);
    expect(detalle.operativa).toBeNull(); // null ≠ 0: sin ficha operativa
    expect(t.llamadas[0].ruta).toBe('/api/comercios/c1');
  });

  it('404 sin eco (ADR-036): restricted, rechazado y archivado NO se distinguen', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'comercio no encontrado' } }]);
    await expect(cliente.ficha('secreto')).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });

  it('historial: sellos comercio.* 1:1 SIN identificador_hash (DH §7.2)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => null });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: [
            { type: 'comercio.ingestado', occurred_at: '2026-10-20T12:00:00.000Z' },
            {
              type: 'comercio.titularidad_reclamada',
              metodo: 'cuit',
              occurred_at: '2026-10-21T12:00:00.000Z',
            },
            {
              type: 'comercio.titularidad_verificada',
              metodo: 'cuit',
              verificado_por_hash: 'abc123',
              occurred_at: '2026-10-22T12:00:00.000Z',
            },
          ],
        },
      },
    ]);
    const entradas = await cliente.historial('c1');
    expect(entradas.length).toBe(3);
    expect(entradas[1].type).toBe('comercio.titularidad_reclamada');
    const plana = JSON.stringify(entradas);
    expect(plana).not.toContain('identificador_hash'); // JAMÁS en la salida pública
    expect(plana).not.toContain('reclamado_por_hash');
    expect(t.llamadas[0].ruta).toBe('/api/comercios/c1/historial');
  });
});

describe('ART-R4 — alta ciudadana (nace propuesto, idempotente)', () => {
  it('201: body exacto sin claves vacías, con Authorization', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-ciudadano' });
    t.programar([{ status: 201, cuerpo: { success: true, data: { activo: { id: 'a1' }, ficha: FICHA_PUBLICA } } }]);
    const { ficha, idempotente } = await cliente.alta(ALTA_EJEMPLO);
    expect(idempotente).toBe(false);
    expect(ficha.estado_epistemico).toBe('verified');
    expect(t.llamadas[0].ruta).toBe('/api/comercios');
    const init = t.llamadas[0].init as Record<string, unknown>;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-ciudadano');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.nodo_key).toBe('capital');
    expect(body.titulo).toBe('Almacén de barrio Doña Rosa');
    expect(body.rubro_id).toBe('food_drink');
    expect(body.tipo).toBe('local');
    expect(body.atributos).toEqual(ALTA_EJEMPLO.atributos);
    expect(body.habilitacion).toEqual({ estado: 'sin_dato' });
    expect('subnodo_key' in body).toBe(false); // sin valor = clave omitida (Zod rechaza null)
  });

  it('200 idempotente: el reintento NO crea un duplicado silencioso (P2002)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-ciudadano' });
    t.programar([{ status: 200, cuerpo: { success: true, idempotente: true, data: { activo: { id: 'a1' }, ficha: FICHA_PUBLICA } } }]);
    const { ficha, idempotente } = await cliente.alta(ALTA_EJEMPLO);
    expect(idempotente).toBe(true);
    expect(ficha.id).toBe('c1');
  });

  it('404 nodo inexistente ANTES del parse (reconciliación MK-0 §2.5)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-ciudadano' });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'nodo no encontrado' } }]);
    await expect(cliente.alta({ ...ALTA_EJEMPLO, nodo_key: 'mendoza' as never })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });

  it('hallazgo 4: rechazo anti-PII responde SIN success — se tipa pii (ADR-020 cond. 1)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-ciudadano' });
    t.programar([
      {
        status: 400,
        cuerpo: { error: 'payload rechazado: contiene datos personales identificables (email) — ADR-020 cond. 1, Ley 25.326' },
      },
    ]);
    await expect(
      cliente.alta({ ...ALTA_EJEMPLO, descripcion: 'escribime a juan@ejemplo.ar' })
    ).rejects.toMatchObject({ codigo: 'pii' });
  });

  it('400 zod → datos; 401 sin token → credenciales', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-ciudadano' });
    t.programar([{ status: 400, cuerpo: { success: false, error: 'datos inválidos', details: [] } }]);
    await expect(cliente.alta({ ...ALTA_EJEMPLO, titulo: 'al' })).rejects.toMatchObject({ codigo: 'datos' });
    const sinToken = crearClienteA2({ transporte: t.transporte, token: () => null });
    await expect(sinToken.alta(ALTA_EJEMPLO)).rejects.toMatchObject({ codigo: 'credenciales' });
    expect(t.llamadas.length).toBe(1); // el token faltó ANTES de gastar la llamada
  });
});

describe('ART-R4 — puerta de titularidad (reclamo / desistir / verificar)', () => {
  it('reclamo: 201 con declaracion_consentimiento explícita; identificador SOLO hash (Ley 25.326)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-ciudadano' });
    t.programar([
      {
        status: 201,
        cuerpo: {
          success: true,
          data: { activo_id: 'c1', titularidad: { estado: 'reclamada', metodo: 'cuit', reclamado_por_hash: 'h1' } },
        },
      },
    ]);
    const r = await cliente.reclamar('c1', { metodo: 'cuit', identificador: '20-12345678-9', declaracion_consentimiento: true });
    expect(r.estado).toBe('reclamada');
    expect(r.activo_id).toBe('c1');
    expect(r.metodo).toBe('cuit');
    const init = t.llamadas[0].init as Record<string, unknown>;
    expect(init.method).toBe('POST');
    expect(t.llamadas[0].ruta).toBe('/api/comercios/c1/titular');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.declaracion_consentimiento).toBe(true);
    expect(body.identificador).toBe('20-12345678-9');
  });

  it('reclamo: 409 si ya está reclamada o verificada → ya_estado', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-ciudadano' });
    t.programar([{ status: 409, cuerpo: { success: false, error: 'la titularidad ya está reclamada o verificada' } }]);
    await expect(
      cliente.reclamar('c1', { metodo: 'cuit', identificador: '20-12345678-9', declaracion_consentimiento: true })
    ).rejects.toMatchObject({ codigo: 'ya_estado' });
  });

  it('desistir: 200 con respuesta SANEADA {estado: desistida} — sin hashes', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-ciudadano' });
    t.programar([
      {
        status: 200,
        cuerpo: { success: true, data: { activo_id: 'c1', titularidad: { estado: 'desistida' } } },
      },
    ]);
    const r = await cliente.desistir('c1');
    expect(r.estado).toBe('desistida');
    const init = t.llamadas[0].init as Record<string, unknown>;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.accion).toBe('desistir');
    expect(body.declaracion_consentimiento).toBe(true);
  });

  it('desistir: 403 si NO es el reclamante → permiso (solo quien reclamó)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-otro' });
    t.programar([{ status: 403, cuerpo: { success: false, error: 'solo quién reclamó la titularidad puede desistir' } }]);
    await expect(cliente.desistir('c1')).rejects.toMatchObject({ codigo: 'permiso' });
  });

  it('verificarTitularidad: 200 de moderación (reclamada → verificada)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: { activo_id: 'c1', titularidad: { estado: 'verificada', metodo: 'cuit', verificado_at: '2026-10-22' } },
        },
      },
    ]);
    const r = await cliente.verificarTitularidad('c1');
    expect(r.estado).toBe('verificada');
    expect(t.llamadas[0].ruta).toBe('/api/comercios/c1/titular');
  });

  it('verificarTitularidad: 409 si la titularidad NO está reclamada', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 409, cuerpo: { success: false, error: 'la titularidad no está reclamada' } }]);
    await expect(cliente.verificarTitularidad('c1')).rejects.toMatchObject({ codigo: 'ya_estado' });
  });
});

describe('ART-R4 — edición de atributos (solo titular verificado)', () => {
  it('PATCH con body exacto {atributos}; 200 devuelve los atributos', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-titular' });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: {
            activo_id: 'c1',
            atributos: { venta_directa: true, delivery: true, pagos: ['efectivo', 'qr'], accesibilidad: 'declarada' },
          },
        },
      },
    ]);
    const atributos = await cliente.editarAtributos('c1', {
      venta_directa: true,
      delivery: true,
      pagos: ['efectivo', 'qr'],
      accesibilidad: 'declarada',
    });
    expect(atributos.delivery).toBe(true);
    expect(atributos.pagos).toEqual(['efectivo', 'qr']);
    const init = t.llamadas[0].init as Record<string, unknown>;
    expect(init.method).toBe('PATCH');
    expect(t.llamadas[0].ruta).toBe('/api/comercios/c1');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect((body.atributos as Record<string, unknown>).accesibilidad).toBe('declarada');
  });

  it('403 sin eco para quien NO es el titular verificado (la API es la compuerta)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-curioso' });
    t.programar([{ status: 403, cuerpo: { success: false, error: 'solo el titular verificado puede editar la ficha' } }]);
    await expect(
      cliente.editarAtributos('c1', { venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' })
    ).rejects.toMatchObject({ codigo: 'permiso' });
  });
});

describe('ART-R4 — habilitación SIIC (ADR-035 + ADR-038)', () => {
  const HAB_VERIFICADA = {
    estado: 'verificada' as const,
    tipo: 'municipal' as const,
    numero: 'HAB-2026-001',
    fuente_key: 'fuente_siic_web',
    url: 'https://siic.example.gob.ar/HAB-2026-001',
    fecha_verificacion: '2026-10-20',
  };

  it('PATCH con justificación pública y evidencia primaria; 200 espeja la habilitación', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-titular' });
    t.programar([
      { status: 200, cuerpo: { success: true, data: { activo_id: 'c1', habilitacion: HAB_VERIFICADA } } },
    ]);
    const h = await cliente.cambiarHabilitacion('c1', HAB_VERIFICADA, 'verificación con expediente SIIC presentado');
    expect(h.estado).toBe('verificada');
    expect(h.fuente_key).toBe('fuente_siic_web');
    const init = t.llamadas[0].init as Record<string, unknown>;
    expect(t.llamadas[0].ruta).toBe('/api/comercios/c1/habilitacion');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.justificacion).toBe('verificación con expediente SIIC presentado');
    expect((body.habilitacion as Record<string, unknown>).numero).toBe('HAB-2026-001');
  });

  it('409 si la habilitación ya está en ese estado → ya_estado', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-titular' });
    t.programar([{ status: 409, cuerpo: { success: false, error: 'la habilitación ya está en estado verificada' } }]);
    await expect(
      cliente.cambiarHabilitacion('c1', HAB_VERIFICADA, 'reintento del mismo estado')
    ).rejects.toMatchObject({ codigo: 'ya_estado' });
  });

  it('403 para quien no es titular ni moderación; PII en la justificación → pii', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA2({ transporte: t.transporte, token: () => 'jwt-curioso' });
    t.programar([{ status: 403, cuerpo: { success: false, error: 'solo el titular verificado o moderación puede cambiar la habilitación' } }]);
    await expect(
      cliente.cambiarHabilitacion('c1', { estado: 'sin_dato' }, 'cambio sin permiso')
    ).rejects.toMatchObject({ codigo: 'permiso' });
    t.programar([
      {
        status: 400,
        cuerpo: { error: 'payload rechazado: contiene datos personales identificables (cuit) — ADR-020 cond. 1, Ley 25.326' },
      },
    ]);
    await expect(
      cliente.cambiarHabilitacion('c1', { estado: 'sin_dato' }, 'llamó el titular CUIT 20-12345678-9')
    ).rejects.toMatchObject({ codigo: 'pii' });
  });
});

describe('ART-R4 — red caída (R5: jamás [])', () => {
  it('fallo de red → ErrorA2 no_disponible en cualquier superficie', async () => {
    const roto: TransporteSesion = async () => {
      throw new Error('red caída');
    };
    const cliente = crearClienteA2({ transporte: roto, token: () => 'jwt-ciudadano' });
    await expect(cliente.directorio()).rejects.toBeInstanceOf(ErrorA2);
    await expect(cliente.ficha('c1')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.historial('c1')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.alta(ALTA_EJEMPLO)).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(
      cliente.reclamar('c1', { metodo: 'cuit', identificador: '20-12345678-9', declaracion_consentimiento: true })
    ).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.desistir('c1')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.verificarTitularidad('c1')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(
      cliente.editarAtributos('c1', { venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' })
    ).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(
      cliente.cambiarHabilitacion('c1', { estado: 'sin_dato' }, 'cambio en red caída')
    ).rejects.toMatchObject({ codigo: 'no_disponible' });
  });
});

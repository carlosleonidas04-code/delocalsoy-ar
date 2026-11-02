import { describe, it, expect } from 'vitest';
import {
  crearSesion,
  CLAVE_TOKEN_SESION,
  type AlmacenSesion,
  type TransporteSesion,
} from './sesion';
import { crearClienteA1 } from './artefactoA1';
import {
  crearClienteA3,
  validarTransicionReporte,
  type EstadoReporte,
} from './artefactoA3';
import { crearClienteA4, canonizar, huellaSha256 } from './artefactoA4';

/**
 * ART-R5 — E2E del ciclo por rol (#274, épica #268): visitante lee →
 * ciudadano reporta → moderador modera con justificación (ADR-038) →
 * auditor ve el historial sellado. Suite node SIN jsdom.
 *
 * El transporte es una API falsa EN MEMORIA CON ESTADO (no una cola de
 * respuestas): reproduce el comportamiento contrastado en main @ 77500be —
 * matriz de transiciones de reporte, 403 real del PATCH para quien no es
 * moderador|admin, 404 sin eco para el descartado, register público que
 * solo crea 'ciudadano' (ADR-031) y la promoción como operación de sistema
 * (el moderador viene PRECARGADO: nunca nace del register, R15).
 *
 * Los tests son SECUENCIALES y comparten el servidor: el ciclo se acredita
 * de punta a punta, paso por rol.
 *
 * R15 declarado: la suite corre en el CI de cada PR.
 */

/* ------------------------------------------------------------------ */
/* API falsa en memoria con estado (espejo del contrastado en main)    */
/* ------------------------------------------------------------------ */

interface UsuarioSim {
  id: string;
  email: string;
  password: string;
  rol: string;
  display_name: string | null;
}

interface TransicionSim {
  estado_anterior: string;
  estado_nuevo: string;
  justificacion: string;
  moderador_hash: string;
  occurred_at: string;
}

interface ReporteSim {
  id: string;
  nodo_key: string;
  categoria: string;
  descripcion: string;
  estado: string;
  lat: number;
  lng: number;
  created_at: string;
  is_synthetic: boolean;
  created_by_hash: string;
  transiciones: TransicionSim[];
}

/** REPORTE_TRANSICIONES (contracts, ADR-038): resolved/descartado terminales. */
const TRANSICIONES_VALIDAS: Record<string, readonly string[]> = {
  received: ['evaluating', 'descartado'],
  evaluating: ['in_progress', 'descartado'],
  in_progress: ['resolved', 'descartado'],
  resolved: [],
  descartado: [],
};

const SALUD = {
  status: 'ok',
  service: 'delocalsoy-ar-api',
  version: '0.4.0',
  mode: 'real',
  modeDeclared: 'real',
  modeDeclaredAt: '2026-10-28T12:00:00.000Z',
  modeSource: 'events_raw',
  dataSource: 'postgres',
  redis: 'ok',
  branchProtection: false,
  evidencias: 15,
  timestamp: '2026-10-30T12:00:00.000Z',
};

function crearServidorCiclo() {
  const usuarios = new Map<string, UsuarioSim>();
  const tokens = new Map<string, string>(); // token -> email
  const reportes = new Map<string, ReporteSim>();
  let seqUsuarios = 0;
  let seqReportes = 0;
  let seqTick = 0;

  const tick = (): string => {
    seqTick += 1;
    return '2026-10-30T12:' + String(10 + seqTick).padStart(2, '0') + ':00.000Z';
  };

  // Promoción = operación de sistema (guard R8): el moderador viene
  // precargado por el sistema — JAMÁS nace del register público (R15).
  usuarios.set('modera@ejemplo.ar', {
    id: 'u-moderador',
    email: 'modera@ejemplo.ar',
    password: 'secreto-mod',
    rol: 'moderador',
    display_name: 'Moderación',
  });

  const emailDe = (init: { headers?: Record<string, string> }): string | null => {
    const autorizacion = init.headers?.Authorization;
    if (typeof autorizacion !== 'string' || !autorizacion.startsWith('Bearer ')) {
      return null;
    }
    return tokens.get(autorizacion.slice('Bearer '.length)) ?? null;
  };

  const publico = (r: ReporteSim): Record<string, unknown> => ({
    id: r.id,
    categoria: r.categoria,
    descripcion: r.descripcion,
    estado: r.estado,
    lat: r.lat,
    lng: r.lng,
    created_at: r.created_at,
    is_synthetic: r.is_synthetic,
  });

  const responder = (
    ruta: string,
    init: { method?: string; headers?: Record<string, string>; body?: string }
  ): { status: number; cuerpo: unknown } => {
    const method = (init.method ?? 'GET').toUpperCase();
    const cuerpoBody: Record<string, unknown> =
      typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};

    if (method === 'POST' && ruta === '/api/auth/register') {
      const email = String(cuerpoBody.email ?? '');
      const password = String(cuerpoBody.password ?? '');
      if (!email.includes('@') || password.length < 8) {
        return { status: 400, cuerpo: { success: false, error: 'datos invalidos' } };
      }
      if (usuarios.has(email)) {
        return { status: 409, cuerpo: { success: false, error: 'el email ya esta registrado' } };
      }
      seqUsuarios += 1;
      const usuario: UsuarioSim = {
        id: 'u-' + seqUsuarios,
        email,
        password,
        // ADR-031: el alta pública SOLO crea 'ciudadano'.
        rol: 'ciudadano',
        display_name: typeof cuerpoBody.display_name === 'string' ? cuerpoBody.display_name : null,
      };
      usuarios.set(email, usuario);
      return {
        status: 201,
        cuerpo: {
          success: true,
          data: { id: usuario.id, email: usuario.email, rol: usuario.rol, display_name: usuario.display_name },
        },
      };
    }

    if (method === 'POST' && ruta === '/api/auth/login') {
      const email = String(cuerpoBody.email ?? '');
      const usuario = usuarios.get(email);
      if (usuario === undefined || usuario.password !== String(cuerpoBody.password ?? '')) {
        return { status: 401, cuerpo: { success: false, error: 'credenciales invalidas' } };
      }
      const token = 'tok-' + usuario.id + '-' + (++seqTick);
      tokens.set(token, usuario.email);
      return {
        status: 200,
        cuerpo: {
          success: true,
          data: {
            token,
            usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol, display_name: usuario.display_name },
          },
        },
      };
    }

    if (method === 'GET' && ruta === '/api/auth/me') {
      const email = emailDe(init);
      const usuario = email === null ? undefined : usuarios.get(email);
      if (usuario === undefined) {
        return { status: 401, cuerpo: { success: false, error: 'sesion no valida' } };
      }
      return {
        status: 200,
        cuerpo: { success: true, data: { id: usuario.id, email: usuario.email, rol: usuario.rol, display_name: usuario.display_name } },
      };
    }

    // SIN envelope (hallazgo A4-3): el cuerpo ES el dato.
    if (method === 'GET' && ruta === '/api/health') {
      return { status: 200, cuerpo: SALUD };
    }

    if (method === 'GET' && ruta === '/api/evidencias') {
      return { status: 200, cuerpo: { count: 15, evidencias: [] } };
    }

    const mBandeja = ruta.match(/^\/api\/nodos\/([\w-]+)\/reportes$/);
    if (method === 'GET' && mBandeja !== null) {
      const nodo = mBandeja[1];
      // El servidor excluye 'descartado' (ADR-038): lo público es lo público.
      const visibles = Array.from(reportes.values())
        .filter((r) => r.nodo_key === nodo && r.estado !== 'descartado')
        .map(publico);
      return { status: 200, cuerpo: { success: true, data: visibles } };
    }

    if (method === 'POST' && ruta === '/api/reportes') {
      const email = emailDe(init);
      if (email === null) {
        return { status: 401, cuerpo: { success: false, error: 'requiere sesion iniciada' } };
      }
      const descripcion = String(cuerpoBody.descripcion ?? '');
      if (descripcion.length < 10) {
        return { status: 400, cuerpo: { success: false, error: 'descripcion fuera de rango (10-2000)' } };
      }
      seqReportes += 1;
      const reporte: ReporteSim = {
        id: 'r-' + seqReportes,
        nodo_key: String(cuerpoBody.nodo_key ?? ''),
        categoria: String(cuerpoBody.categoria ?? ''),
        descripcion,
        // El reporte nace 'received' (ReporteEstadoSchema).
        estado: 'received',
        lat: Number(cuerpoBody.lat),
        lng: Number(cuerpoBody.lng),
        created_at: tick(),
        is_synthetic: false,
        // Pseudónimo: el autor es un hash, jamás una identidad (ADR-027).
        created_by_hash: 'hash-' + (usuarios.get(email)?.id ?? 'x'),
        transiciones: [],
      };
      reportes.set(reporte.id, reporte);
      return { status: 201, cuerpo: { success: true, data: publico(reporte) } };
    }

    if (method === 'GET' && ruta === '/api/reportes/mios') {
      const email = emailDe(init);
      const usuario = email === null ? undefined : usuarios.get(email);
      if (usuario === undefined) {
        return { status: 401, cuerpo: { success: false, error: 'requiere sesion iniciada' } };
      }
      const mios = Array.from(reportes.values())
        .filter((r) => r.created_by_hash === 'hash-' + usuario.id)
        .map((r) => ({ ...publico(r), nodo_key: r.nodo_key, transiciones: r.transiciones }));
      return { status: 200, cuerpo: { success: true, data: mios } };
    }

    const mHistorial = ruta.match(/^\/api\/reportes\/([\w-]+)\/historial$/);
    if (method === 'GET' && mHistorial !== null) {
      const reporte = reportes.get(mHistorial[1]);
      // El descartado NO es publicable: 404 honesto (ADR-038).
      if (reporte === undefined || reporte.estado === 'descartado') {
        return { status: 404, cuerpo: { success: false, error: 'reporte no encontrado o no publicable' } };
      }
      return {
        status: 200,
        cuerpo: { success: true, data: { reporte_id: reporte.id, transiciones: reporte.transiciones } },
      };
    }

    const mEstado = ruta.match(/^\/api\/reportes\/([\w-]+)\/estado$/);
    if (method === 'PATCH' && mEstado !== null) {
      const email = emailDe(init);
      const usuario = email === null ? undefined : usuarios.get(email);
      if (usuario === undefined) {
        return { status: 401, cuerpo: { success: false, error: 'requiere sesion iniciada' } };
      }
      // Guard R8: solo moderador|admin modera — 403 REAL, no simulado.
      if (usuario.rol !== 'moderador' && usuario.rol !== 'admin') {
        return { status: 403, cuerpo: { success: false, error: 'rol insuficiente' } };
      }
      const reporte = reportes.get(mEstado[1]);
      if (reporte === undefined) {
        return { status: 404, cuerpo: { success: false, error: 'reporte no encontrado' } };
      }
      const hacia = String(cuerpoBody.estado ?? '');
      const justificacion = String(cuerpoBody.justificacion ?? '');
      if (reporte.estado === hacia) {
        return { status: 409, cuerpo: { success: false, error: 'ya esta en ese estado' } };
      }
      if (!(TRANSICIONES_VALIDAS[reporte.estado] ?? []).includes(hacia)) {
        return {
          status: 400,
          cuerpo: { success: false, error: "transición inválida: '" + reporte.estado + "' -> '" + hacia + "'" },
        };
      }
      // ADR-038: justificación pública OBLIGATORIA (>=10).
      if (justificacion.trim().length < 10) {
        return {
          status: 400,
          cuerpo: { success: false, error: 'la justificación pública es obligatoria (mínimo 10 caracteres)' },
        };
      }
      reporte.transiciones.push({
        estado_anterior: reporte.estado,
        estado_nuevo: hacia,
        justificacion,
        moderador_hash: 'hash-' + usuario.id,
        occurred_at: tick(),
      });
      reporte.estado = hacia;
      return { status: 200, cuerpo: { success: true, data: publico(reporte) } };
    }

    return { status: 404, cuerpo: { success: false, error: 'ruta no encontrada: ' + ruta } };
  };

  const transporte: TransporteSesion = async (ruta, init) => {
    const { status, cuerpo } = responder(ruta, init ?? {});
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => cuerpo,
    };
  };

  return { transporte, reportes, usuarios };
}

/* ------------------------------------------------------------------ */
/* Almacenes en memoria (el email JAMÁS persiste — solo el token)       */
/* ------------------------------------------------------------------ */

function crearAlmacen(): { almacen: AlmacenSesion; claves: () => string[] } {
  const mapa = new Map<string, string>();
  return {
    almacen: {
      getItem: (clave: string) => mapa.get(clave) ?? null,
      setItem: (clave: string, valor: string) => {
        mapa.set(clave, valor);
      },
      removeItem: (clave: string) => {
        mapa.delete(clave);
      },
    },
    claves: () => Array.from(mapa.keys()),
  };
}

/* ------------------------------------------------------------------ */
/* El ciclo por rol — secuencial, un servidor compartido               */
/* ------------------------------------------------------------------ */

const servidor = crearServidorCiclo();
const almacenCiudadano = crearAlmacen();
const almacenModerador = crearAlmacen();

const clienteA4 = crearClienteA4({ transporte: servidor.transporte });
const clienteA1 = crearClienteA1({
  transporte: servidor.transporte,
  token: () => almacenCiudadano.almacen.getItem(CLAVE_TOKEN_SESION),
});
const clienteA3Moderador = crearClienteA3({
  transporte: servidor.transporte,
  token: () => almacenModerador.almacen.getItem(CLAVE_TOKEN_SESION),
});
const clienteA3Ciudadano = crearClienteA3({
  transporte: servidor.transporte,
  token: () => almacenCiudadano.almacen.getItem(CLAVE_TOKEN_SESION),
});

const sesionCiudadano = crearSesion({
  transporte: servidor.transporte,
  almacen: almacenCiudadano.almacen,
});
const sesionModerador = crearSesion({
  transporte: servidor.transporte,
  almacen: almacenModerador.almacen,
});

describe('ART-R5 — ciclo por rol: visitante', () => {
  it('el visitante LEE sin token: salud honesta (modeSource R7) y bandeja pública vacía', async () => {
    const salud = await clienteA4.salud();
    expect(salud.status).toBe('ok');
    expect(salud.modeSource).toBe('events_raw'); // modo resuelto desde el sello
    expect(salud.branchProtection).toBe(false); // honesto (issue #25)
    const bandeja = await clienteA4.reportesDeNodo('capital');
    expect(bandeja).toEqual([]); // vacío HONESTO del ciclo aún sin reportes
  });

  it('el visitante NO escribe: crearReporte exige sesión (credenciales, R5)', async () => {
    const sinToken = crearClienteA1({ transporte: servidor.transporte, token: () => null });
    await expect(
      sinToken.crearReporte({
        nodo_key: 'capital',
        categoria: 'arbolado',
        descripcion: 'ramas caídas bloqueando la vereda',
        lat: -31.5376,
        lng: -68.5285,
      })
    ).rejects.toMatchObject({ codigo: 'credenciales' });
  });
});

describe('ART-R5 — ciclo por rol: ciudadano reporta', () => {
  it('el alta pública solo crea ciudadano (ADR-031) y el login persiste SOLO el token (anti-PII)', async () => {
    const creado = await sesionCiudadano.registrar('vecina@ejemplo.ar', 'clave-segura-2026', 'Vecina');
    expect(creado.rol).toBe('ciudadano');
    const usuario = await sesionCiudadano.iniciar('vecina@ejemplo.ar', 'clave-segura-2026');
    expect(usuario.rol).toBe('ciudadano');
    expect(almacenCiudadano.claves()).toEqual([CLAVE_TOKEN_SESION]);
    // Ley 25.326/ADR-027: el email JAMÁS viaja al almacen.
    expect(almacenCiudadano.claves().join('|')).not.toContain('vecina');
  });

  it('el ciudadano reporta: nace received (201) y /mios lo devuelve con transiciones vacías', async () => {
    const { reporte, idempotente } = await clienteA1.crearReporte({
      nodo_key: 'capital',
      categoria: 'arbolado',
      descripcion: 'ramas caídas bloqueando la vereda',
      lat: -31.5376,
      lng: -68.5285,
    });
    expect(reporte.id).toBe('r-1');
    expect(reporte.estado).toBe('received');
    expect(idempotente).toBe(false);
    const mios = await clienteA1.mios();
    expect(mios.length).toBe(1);
    expect(mios[0].id).toBe('r-1');
    expect(mios[0].estado).toBe('received');
    expect(mios[0].transiciones).toEqual([]);
    expect(mios[0].nodo_key).toBe('capital');
  });

  it('el historial público nace vacío: sin transiciones no hay sello que leer (libro contable honesto)', async () => {
    const transiciones = await clienteA4.historialReporte('r-1');
    expect(transiciones).toEqual([]);
  });
});

describe('ART-R5 — ciclo por rol: moderador modera (ADR-038)', () => {
  it('la promoción es operación de sistema: el moderador es PRECARGADO, no nace del register (R15)', async () => {
    const usuario = await sesionModerador.iniciar('modera@ejemplo.ar', 'secreto-mod');
    expect(usuario.rol).toBe('moderador');
  });

  it('received → evaluating con justificación pública: el sello lleva moderador_hash (pseudónimo)', async () => {
    const reporte = await clienteA3Moderador.moderarReporte(
      'r-1',
      'evaluating',
      'se inspeccionó el sitio con registro fotográfico'
    );
    expect(reporte.estado).toBe('evaluating');
    const transiciones = await clienteA4.historialReporte('r-1');
    expect(transiciones.length).toBe(1);
    expect(transiciones[0].estado_anterior).toBe('received');
    expect(transiciones[0].estado_nuevo).toBe('evaluating');
    expect(transiciones[0].justificacion.length).toBeGreaterThanOrEqual(10);
    expect(transiciones[0].moderador_hash).toBe('hash-u-moderador'); // hash, JAMÁS identidad
  });

  it('justificación corta: la API la rechaza (ADR-038) y el estado NO cambia', async () => {
    await expect(clienteA3Moderador.moderarReporte('r-1', 'in_progress', 'corta')).rejects.toMatchObject(
      { codigo: 'datos' }
    );
    const mios = await clienteA1.mios();
    expect(mios[0].estado).toBe('evaluating'); // sin cambio sin sello válido
    expect(mios[0].transiciones.length).toBe(1);
  });

  it('el ciudadano NO modera: 403 real del guard R8 → ErrorA3 permiso', async () => {
    await expect(
      clienteA3Ciudadano.moderarReporte('r-1', 'in_progress', 'justificación suficiente aquí')
    ).rejects.toMatchObject({ codigo: 'permiso' });
  });

  it('salto inválido: received → resolved NO está en la matriz — cliente y API coinciden', async () => {
    // El cliente valida contra su matriz espejo ANTES de llamar (UX honesta)…
    expect(validarTransicionReporte('received', 'resolved')).not.toBeNull();
    // …y la API rechaza igual: nadie salta el ciclo (ADR-038).
    const { reporte } = await clienteA1.crearReporte({
      nodo_key: 'capital',
      categoria: 'alumbrado',
      descripcion: 'lámpara apagada en la esquina del colegio',
      lat: -31.5379,
      lng: -68.529,
    });
    expect(reporte.id).toBe('r-2');
    await expect(
      clienteA3Moderador.moderarReporte('r-2', 'resolved', 'justificación suficiente aquí')
    ).rejects.toMatchObject({ codigo: 'transicion' });
  });

  it('evaluating → in_progress con justificación: el ciclo avanza sello a sello', async () => {
    const reporte = await clienteA3Moderador.moderarReporte(
      'r-1',
      'in_progress',
      'el equipo de parques tomó el reclamo'
    );
    expect(reporte.estado).toBe('in_progress');
    const transiciones = await clienteA4.historialReporte('r-1');
    expect(transiciones.length).toBe(2);
    expect(transiciones[1].estado_nuevo).toBe('in_progress');
  });
});

describe('ART-R5 — ciclo por rol: auditor ve (lectura pura, sin token)', () => {
  it('el auditor SIN sesión lee el historial completo con justificaciones y moderador_hash', async () => {
    const transiciones = await clienteA4.historialReporte('r-1');
    expect(transiciones.length).toBe(2);
    for (const t of transiciones) {
      expect(t.justificacion.length).toBeGreaterThanOrEqual(10);
      expect(t.moderador_hash).toMatch(/^hash-/); // pseudónimo, jamás identidad
    }
  });

  it('descartado JAMÁS público: 404 en historial, fuera de la bandeja, visible SOLO en /mios del reportero', async () => {
    const descartado = await clienteA3Moderador.moderarReporte(
      'r-2',
      'descartado',
      'duplicado del reclamo ya registrado en la esquina'
    );
    expect(descartado.estado).toBe('descartado');
    await expect(clienteA4.historialReporte('r-2')).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
    const bandeja = await clienteA4.reportesDeNodo('capital');
    expect(bandeja.map((r) => r.id)).not.toContain('r-2');
    // El reportero SÍ ve su descartado con justificación (ADR-038).
    const mios = await clienteA1.mios();
    expect(mios.map((r) => r.id)).toContain('r-2');
    expect(mios.find((r) => r.id === 'r-2')?.transiciones.length).toBe(1);
  });

  it('huella verificable: canonizar + SHA-256 del snapshot de salud → 64 hex determinista', async () => {
    const salud = await clienteA4.salud();
    const h1 = await huellaSha256(canonizar(salud));
    const h2 = await huellaSha256(canonizar({ ...salud }));
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2); // cualquier tercero puede reproducirla sobre los mismos datos
  });
});

describe('ART-R5 — cierre del ciclo', () => {
  it('cerrar sesión: el token sale del almacen y quienSoy vuelve a sin_sesion', async () => {
    expect(almacenCiudadano.claves()).toEqual([CLAVE_TOKEN_SESION]);
    sesionCiudadano.cerrarSesion();
    expect(almacenCiudadano.claves()).toEqual([]);
    const estado = await sesionCiudadano.quienSoy();
    expect(estado).toEqual({ tipo: 'sin_sesion' });
  });

  it('el ciclo NO muta la cadena de evidencias (EV-xxx): el auditor solo lee', async () => {
    const registro = await clienteA4.evidencias();
    expect(registro.count).toBe(15);
    // El historial sellado del reporte moderado quedó en el libro: la
    // auditoría posterior no lo altera.
    const transiciones = await clienteA4.historialReporte('r-1');
    expect(transiciones.length).toBe(2);
  });
});

/* Sanity del espejo local: la matriz del test coincide con la del cliente A3. */
describe('ART-R5 — coherencia de matrices (test ↔ cliente)', () => {
  it('REPORTE_TRANSICIONES espejo: los terminales no tienen salidas y received solo evalúa o descarta', () => {
    const terminales: EstadoReporte[] = ['resolved', 'descartado'];
    for (const t of terminales) {
      expect(validarTransicionReporte(t, 'received')).not.toBeNull();
      expect(validarTransicionReporte(t, 'evaluating')).not.toBeNull();
      expect(validarTransicionReporte(t, 'in_progress')).not.toBeNull();
      expect(validarTransicionReporte(t, 'descartado')).not.toBeNull();
      expect(validarTransicionReporte(t, 'resolved')).not.toBeNull();
    }
    expect(validarTransicionReporte('received', 'evaluating')).toBeNull();
    expect(validarTransicionReporte('received', 'descartado')).toBeNull();
    expect(validarTransicionReporte('evaluating', 'in_progress')).toBeNull();
    expect(validarTransicionReporte('in_progress', 'resolved')).toBeNull();
  });
});

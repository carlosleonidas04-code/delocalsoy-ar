/**
 * DELocalSoy.AR — Mi cuenta: cliente puro del dominio «mi cuenta»
 * (ARTEFACTOS-ROLES AR1, #400, épica #399).
 *
 * Superficie contrastada contra main @ 512c3686 (apps/api):
 *   GET  /api/nodos/:key/subnodos   (público)   -> {success, data, count} — filas del vocabulario
 *   PUT  /api/me/residencia         (Bearer)    -> 200 {data:{residencia_subnodo_key, residencia_declarada_en}}
 *   GET  /api/pedidos?nodo=          (público)   -> 200 {data:{esperados_documento, presentados, respondidos,
 *                                                    respondidos_en_plazo, respondidos_tardio, sin_respuesta,
 *                                                    en_espera, fecha_corte, cobertura, fuente, pedidos}}
 *
 * AR1 como código (decisión DH 2026-11-06): vecino = ATRIBUTO de residencia
 * sobre la cuenta ciudadana, NO un rol — perfilDeCuenta() lo DERIVA en el
 * cliente a partir de los campos reales de /api/auth/me (R15: nada se
 * simula). El visitante (rol real 'visitante') es SOLO LECTURA en v0.2: la
 * API es la compuerta (403 real en PUT /api/me/residencia).
 *
 * Anti-PII (Ley 25.326 / ADR-027): la residencia es la CLAVE del subnodo
 * declarado y su timestamp — sin domicilio jamás. Cliente node-puro con
 * transporte y token inyectados (patrón lib/sesion.ts, ART-R0 #269): la
 * suite corre sin jsdom.
 */

import type { UsuarioSesion } from './sesion';

/** Vocabulario real de nodos del repo (SanJuanNodeSlugSchema). */
export const NODOS = ['capital', 'caucete', 'iglesia'] as const;
export type NodoCuenta = (typeof NODOS)[number];

export type CodigoErrorMiCuenta = 'datos' | 'credenciales' | 'rol' | 'no_disponible';

export class ErrorMiCuenta extends Error {
  codigo: CodigoErrorMiCuenta;
  constructor(codigo: CodigoErrorMiCuenta, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorMiCuenta';
    this.codigo = codigo;
  }
}

export interface RespuestaTransporteMiCuenta {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type TransporteMiCuenta = (
  ruta: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<RespuestaTransporteMiCuenta>;

export interface OpcionesMiCuenta {
  transporte: TransporteMiCuenta;
  token: () => string | null;
}

/** Subnodo público del vocabulario (GET /api/nodos/:key/subnodos). */
export interface SubnodoPublico {
  key: string;
  label: string;
  type: string;
}

/** Atributo de residencia declarado (PUT /api/me/residencia → data). */
export interface ResidenciaDeclarada {
  residencia_subnodo_key: string;
  residencia_declarada_en: string;
}

/** Tablero público de pedidos DPV (GET /api/pedidos?nodo= → data). */
export interface TableroPedidos {
  esperados_documento: number;
  presentados: number;
  respondidos: number;
  respondidos_en_plazo: number;
  respondidos_tardio: number;
  sin_respuesta: number;
  en_espera: number;
  fecha_corte: string;
  cobertura: string;
  fuente: string;
}

/* ------------------------------------------------------------------ */
/* Perfiles derivados (AR1: atributo, no rol)                          */
/* ------------------------------------------------------------------ */

export type PerfilCuenta = 'vecino' | 'ciudadano' | 'visitante';

/**
 * Deriva el perfil de la cuenta desde los campos REALES de la sesión
 * (decisión DH 2026-11-06): visitante = rol 'visitante' (solo lectura);
 * vecino = residencia declarada (ATRIBUTO); ciudadano = lo demás.
 */
export function perfilDeCuenta(usuario: UsuarioSesion): PerfilCuenta {
  if (usuario.rol === 'visitante') return 'visitante';
  return usuario.residencia_subnodo_key != null ? 'vecino' : 'ciudadano';
}

export const PERFILES_CUENTA: Array<{ perfil: PerfilCuenta; etiqueta: string; detalle: string }> = [
  {
    perfil: 'vecino',
    etiqueta: 'Vecino',
    detalle:
      'cuenta ciudadana con residencia declarada en un subnodo real del vocabulario — atributo auto-declarado (R15: sin verificación), sin domicilio jamás (Ley 25.326 / ADR-027)',
  },
  {
    perfil: 'ciudadano',
    etiqueta: 'Ciudadano',
    detalle:
      'cuenta del alta pública (/api/auth/register, ADR-031) — sin residencia declarada aún; declararla activa el tablero vecino de pedidos del nodo',
  },
  {
    perfil: 'visitante',
    etiqueta: 'Visitante',
    detalle:
      'cuenta ligera de tránsito (POST /api/auth/register-visitante): alias público + subnodo de tránsito declarado + consentimiento granular — SOLO LECTURA en v0.2, la API es la compuerta (403 real)',
  },
];

/* ------------------------------------------------------------------ */
/* Cliente (transporte y token inyectados — patrón sesion.ts)          */
/* ------------------------------------------------------------------ */

export interface ClienteMiCuenta {
  subnodos(nodoKey: NodoCuenta): Promise<SubnodoPublico[]>;
  declararResidencia(subnodoKey: string): Promise<ResidenciaDeclarada>;
  tableroPedidos(nodoKey: NodoCuenta): Promise<TableroPedidos>;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function textoError(status: number, cuerpo: Envelope<unknown>): string {
  if (cuerpo && typeof cuerpo.error === 'string' && cuerpo.error.length > 0) {
    return cuerpo.error;
  }
  return 'HTTP ' + status;
}

export function crearClienteMiCuenta(opts: OpcionesMiCuenta): ClienteMiCuenta {
  const llamar = async (
    ruta: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ): Promise<RespuestaTransporteMiCuenta> => {
    try {
      return await opts.transporte(ruta, init);
    } catch {
      throw new ErrorMiCuenta('no_disponible', 'no se pudo contactar la plataforma');
    }
  };

  const leer = async (res: RespuestaTransporteMiCuenta): Promise<Envelope<unknown>> => {
    try {
      return (await res.json()) as Envelope<unknown>;
    } catch {
      return { success: false };
    }
  };

  const subnodos = async (nodoKey: NodoCuenta): Promise<SubnodoPublico[]> => {
    const res = await llamar('/api/nodos/' + nodoKey + '/subnodos');
    const cuerpo = await leer(res);
    if (res.status === 200 && cuerpo.success === true && Array.isArray(cuerpo.data)) {
      const filas = cuerpo.data as Array<Record<string, unknown>>;
      return filas.map((f) => ({
        key: String(f.key),
        label: String(f.label),
        type: String(f.type),
      }));
    }
    if (res.status === 404) {
      throw new ErrorMiCuenta('no_disponible', 'el nodo no existe en el vocabulario (R15)');
    }
    throw new ErrorMiCuenta('no_disponible', textoError(res.status, cuerpo));
  };

  const declararResidencia = async (subnodoKey: string): Promise<ResidenciaDeclarada> => {
    const token = opts.token();
    if (token === null) {
      throw new ErrorMiCuenta('credenciales', 'declarar residencia exige sesión iniciada');
    }
    const res = await llamar('/api/me/residencia', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ subnodo_key: subnodoKey }),
    });
    const cuerpo = await leer(res);
    if (res.status === 200 && cuerpo.success === true && cuerpo.data) {
      const data = cuerpo.data as Record<string, unknown>;
      return {
        residencia_subnodo_key: String(data.residencia_subnodo_key),
        residencia_declarada_en: String(data.residencia_declarada_en),
      };
    }
    if (res.status === 401) {
      throw new ErrorMiCuenta('credenciales', 'sesión inválida o vencida — iniciá sesión de nuevo');
    }
    if (res.status === 403) {
      throw new ErrorMiCuenta('rol', 'la residencia se declara desde una cuenta ciudadana — el visitante es solo lectura (v0.2)');
    }
    if (res.status === 400) {
      throw new ErrorMiCuenta('datos', textoError(res.status, cuerpo));
    }
    if (res.status === 429) {
      throw new ErrorMiCuenta('no_disponible', 'demasiados intentos; espera un momento');
    }
    throw new ErrorMiCuenta('no_disponible', textoError(res.status, cuerpo));
  };

  const tableroPedidos = async (nodoKey: NodoCuenta): Promise<TableroPedidos> => {
    const res = await llamar('/api/pedidos?nodo=' + nodoKey);
    const cuerpo = await leer(res);
    if (res.status === 200 && cuerpo.success === true && cuerpo.data) {
      return cuerpo.data as TableroPedidos;
    }
    throw new ErrorMiCuenta('no_disponible', textoError(res.status, cuerpo));
  };

  return { subnodos, declararResidencia, tableroPedidos };
}

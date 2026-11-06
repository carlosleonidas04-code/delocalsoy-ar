/**
 * DELocalSoy.AR — Sesion de plataforma para los artefactos A1–A4 (ART-R0, #269, epica #268).
 *
 * Login JWT real contra la API (CORE-004 R3 / ADR-031) + degradacion honesta
 * a modo synthetic (ADR-029; decision DH 2026-10-29). Anti-PII (Ley 25.326 /
 * ADR-027): en el almacen SOLO se persiste el token — el email jamas.
 *
 * Superficie contrastada contra main @ 77500be (apps/api/src/routes/auth.ts):
 *   POST /api/auth/register {email, password, display_name?} -> 201 {data:{id,email,rol,display_name}}
 *   POST /api/auth/login    {email, password}                -> 200 {data:{token, usuario}}
 *   GET  /api/auth/me       (Authorization: Bearer)          -> 200 {data:{id,email,rol,display_name}}
 *
 * ARTEFACTOS-ROLES AR1 (#400, épica #399, main @ 512c3686) agrega:
 *   POST /api/auth/register-visitante {email, password, alias, subnodo_transito_key,
 *                                      consentimiento:{contacto_email:true}} -> 201 {data:{...usuario}}
 *   GET /api/auth/me ahora devuelve residencia_subnodo_key / residencia_declarada_en /
 *   transito_subnodo_key — el perfil (vecino = ATRIBUTO de residencia, NO rol;
 *   decisión DH 2026-11-06) se DERIVA en el cliente desde esos campos reales.
 * El visitante es un rol REAL solo lectura v0.2: la API es la compuerta.
 *
 * El alta publica solo crea rol 'ciudadano' (ADR-031); la promocion a
 * moderador/admin es operacion de sistema (guard R8) — este modulo JAMAS
 * la simula (R15). En modo synthetic no hay sesion: las escrituras de los
 * paneles son demo declarada, nunca acreditada.
 */

export type RolPlataforma =
  | 'ciudadano'
  | 'visitante'
  | 'vecino'
  | 'operador_campo'
  | 'comerciante'
  | 'gestor'
  | 'custodio_territorial'
  | 'moderador'
  | 'auditor'
  | 'admin_nodo'
  | 'admin_hitub';

/**
 * Tabla RBAC real (fuente primaria: ROLE_RATE_LIMITS_PER_MINUTE del lote-2;
 * serie docs/artefactos/ v0.1 ratificada, PR #267): techo req/min por rol.
 */
export const RATE_LIMIT_POR_ROL: Record<RolPlataforma, number> = {
  ciudadano: 10,
  // ARTEFACTOS-ROLES AR1 (#400): la cuenta ligera visitante vive del techo
  // público de lectura (10 req/min, mismo criterio que RATE_LIMIT_VISITANTE).
  visitante: 10,
  vecino: 10,
  operador_campo: 50,
  comerciante: 50,
  gestor: 100,
  custodio_territorial: 100,
  moderador: 100,
  auditor: 500,
  admin_nodo: 500,
  admin_hitub: 500,
};

/** Techo del visitante (lectura publica, sin JWT). */
export const RATE_LIMIT_VISITANTE = 10;

export interface UsuarioSesion {
  id: string;
  email: string;
  rol: RolPlataforma;
  display_name: string | null;
  /**
   * ARTEFACTOS-ROLES AR1 (#400, épica #399) — opcionales para no romper los
   * literales existentes: la residencia es un ATRIBUTO auto-declarado (el
   * perfil 'vecino' se DERIVA de este campo, NO es un rol — decisión DH
   * 2026-11-06) y el tránsito es el subnodo DECLARADO del visitante.
   */
  residencia_subnodo_key?: string | null;
  transito_subnodo_key?: string | null;
}

export type EstadoSesion =
  | { tipo: 'sin_sesion' }
  | { tipo: 'sesion'; usuario: UsuarioSesion }
  | { tipo: 'demo_sintetico'; etiqueta: 'SINTETICO' };

export type ModoSesion = 'jwt' | 'synthetic';

export type CodigoErrorSesion = 'credenciales' | 'email_existente' | 'datos' | 'no_disponible';

export class SesionError extends Error {
  codigo: CodigoErrorSesion;
  constructor(codigo: CodigoErrorSesion, mensaje: string) {
    super(mensaje);
    this.name = 'SesionError';
    this.codigo = codigo;
  }
}

export interface RespuestaTransporte {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type TransporteSesion = (
  ruta: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<RespuestaTransporte>;

export interface AlmacenSesion {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export const CLAVE_TOKEN_SESION = 'delocalsoy.sesion.token';

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RespuestaAuth {
  id: string;
  email: string;
  rol: string;
  display_name?: string | null;
  // ARTEFACTOS-ROLES AR1 (#400): campos opcionales de /api/auth/me extendido.
  residencia_subnodo_key?: string | null;
  residencia_declarada_en?: string | null;
  transito_subnodo_key?: string | null;
}

interface RespuestaLogin {
  token: string;
  usuario: RespuestaAuth;
}

function parseUsuario(crudo: RespuestaAuth): UsuarioSesion {
  return {
    id: crudo.id,
    email: crudo.email,
    rol: crudo.rol as RolPlataforma,
    display_name: crudo.display_name ?? null,
    // ARTEFACTOS-ROLES AR1 (#400): atributos reales de la cuenta — el perfil
    // (vecino|ciudadano|visitante) se DERIVA de estos campos, jamás se
    // declara del lado del cliente (R15).
    residencia_subnodo_key: crudo.residencia_subnodo_key ?? null,
    transito_subnodo_key: crudo.transito_subnodo_key ?? null,
  };
}

function textoError(status: number, cuerpo: Envelope<unknown>): string {
  if (cuerpo && typeof cuerpo.error === 'string' && cuerpo.error.length > 0) {
    return cuerpo.error;
  }
  return 'HTTP ' + status;
}

export interface Sesion {
  modo: ModoSesion;
  tokenActual(): string | null;
  registrar(email: string, password: string, displayName?: string): Promise<UsuarioSesion>;
  /**
   * ARTEFACTOS-ROLES AR1 (#400, épica #399): alta de la cuenta ligera
   * visitante (POST /api/auth/register-visitante). El consentimiento de
   * contacto es GRANULAR y literal (ADR-027): sin él NO se llama a la API —
   * el rechazo es del lado del cliente, ANTES de persistir nada.
   */
  registrarVisitante(
    email: string,
    password: string,
    alias: string,
    subnodoTransitoKey: string,
    consentimientoContacto: boolean
  ): Promise<UsuarioSesion>;
  iniciar(email: string, password: string): Promise<UsuarioSesion>;
  quienSoy(): Promise<EstadoSesion>;
  cerrarSesion(): void;
}

export interface OpcionesSesion {
  transporte: TransporteSesion;
  almacen: AlmacenSesion;
  modo?: ModoSesion;
  base?: string;
}

export function crearSesion(opts: OpcionesSesion): Sesion {
  const base: string = opts.base ?? '/api/auth';
  const modo: ModoSesion = opts.modo ?? 'jwt';

  const llamar = async (
    ruta: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ): Promise<RespuestaTransporte> => {
    try {
      return await opts.transporte(base + ruta, init);
    } catch {
      throw new SesionError('no_disponible', 'no se pudo contactar la identidad de la plataforma');
    }
  };

  const leer = async (res: RespuestaTransporte): Promise<Envelope<unknown>> => {
    try {
      return (await res.json()) as Envelope<unknown>;
    } catch {
      return { success: false };
    }
  };

  const tokenActual = (): string | null =>
    modo === 'synthetic' ? null : opts.almacen.getItem(CLAVE_TOKEN_SESION);

  const registrar = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<UsuarioSesion> => {
    // display_name solo via incluido (el Zod del API rechaza null explicito
    // en campos opcionales); vacio = omitido.
    const cuerpoBody: Record<string, string> = { email, password };
    if (typeof displayName === 'string' && displayName.length > 0) {
      cuerpoBody.display_name = displayName;
    }
    const res = await llamar('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpoBody),
    });
    const cuerpo = await leer(res);
    if (res.status === 201 && cuerpo.success === true && cuerpo.data) {
      return parseUsuario(cuerpo.data as RespuestaAuth);
    }
    if (res.status === 409) {
      throw new SesionError('email_existente', 'el email ya esta registrado');
    }
    if (res.status === 400) {
      throw new SesionError('datos', 'datos invalidos');
    }
    if (res.status === 429) {
      throw new SesionError('no_disponible', 'demasiados intentos; espera un momento');
    }
    throw new SesionError('no_disponible', textoError(res.status, cuerpo));
  };

  // ARTEFACTOS-ROLES AR1 (#400, épica #399): cuenta ligera visitante. El
  // consentimiento se exige ANTES de llamar a la API (ADR-027: granular y
  // literal — el cliente jamás lo pre-marca ni lo sobrentiende).
  const registrarVisitante = async (
    email: string,
    password: string,
    alias: string,
    subnodoTransitoKey: string,
    consentimientoContacto: boolean
  ): Promise<UsuarioSesion> => {
    if (!consentimientoContacto) {
      throw new SesionError(
        'datos',
        'el consentimiento de contacto es obligatorio (ADR-027): sin él no hay cuenta visitante'
      );
    }
    const res = await llamar('/register-visitante', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        alias,
        subnodo_transito_key: subnodoTransitoKey,
        consentimiento: { contacto_email: true },
      }),
    });
    const cuerpo = await leer(res);
    if (res.status === 201 && cuerpo.success === true && cuerpo.data) {
      return parseUsuario(cuerpo.data as RespuestaAuth);
    }
    if (res.status === 409) {
      throw new SesionError('email_existente', 'el email ya esta registrado');
    }
    if (res.status === 400) {
      throw new SesionError('datos', 'datos invalidos');
    }
    if (res.status === 429) {
      throw new SesionError('no_disponible', 'demasiados intentos; espera un momento');
    }
    throw new SesionError('no_disponible', textoError(res.status, cuerpo));
  };

  const iniciar = async (email: string, password: string): Promise<UsuarioSesion> => {
    const res = await llamar('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const cuerpo = await leer(res);
    if (res.status === 200 && cuerpo.success === true && cuerpo.data) {
      const data = cuerpo.data as RespuestaLogin;
      if (!data.token || !data.usuario) {
        throw new SesionError('no_disponible', 'respuesta de login incompleta');
      }
      // Anti-PII: persistimos SOLO el token (Ley 25.326 / ADR-027).
      opts.almacen.setItem(CLAVE_TOKEN_SESION, data.token);
      return parseUsuario(data.usuario);
    }
    if (res.status === 401) {
      throw new SesionError('credenciales', 'credenciales invalidas');
    }
    if (res.status === 400) {
      throw new SesionError('datos', 'datos invalidos');
    }
    if (res.status === 429) {
      throw new SesionError('no_disponible', 'demasiados intentos; espera un momento');
    }
    throw new SesionError('no_disponible', textoError(res.status, cuerpo));
  };

  const cerrarSesion = (): void => {
    opts.almacen.removeItem(CLAVE_TOKEN_SESION);
  };

  const quienSoy = async (): Promise<EstadoSesion> => {
    if (modo === 'synthetic') {
      // Degradacion honesta (ADR-029 + decision DH 2026-10-29): en synthetic
      // no hay sesion JWT — el estado es demo SINTETICO declarado.
      return { tipo: 'demo_sintetico', etiqueta: 'SINTETICO' };
    }
    const token = opts.almacen.getItem(CLAVE_TOKEN_SESION);
    if (!token) {
      return { tipo: 'sin_sesion' };
    }
    const res = await llamar('/me', { headers: { Authorization: 'Bearer ' + token } });
    const cuerpo = await leer(res);
    if (res.status === 200 && cuerpo.success === true && cuerpo.data) {
      return { tipo: 'sesion', usuario: parseUsuario(cuerpo.data as RespuestaAuth) };
    }
    // Token vencido (JWT 15 min) o sesion revocada: salida honesta, sin token.
    cerrarSesion();
    return { tipo: 'sin_sesion' };
  };

  return { modo, tokenActual, registrar, registrarVisitante, iniciar, quienSoy, cerrarSesion };
}

/**
 * Gates de competencias por rol (serie docs/artefactos/ v0.1, PR #267 —
 * atribuciones del A3 y escritura ciudadana del A1).
 */

/** La escritura ciudadana exige sesion JWT real; en synthetic es demo (R15). */
export function puedeEscribir(estado: EstadoSesion): boolean {
  return estado.tipo === 'sesion';
}

/** Moderacion (reportes, productos, patrimonio, comercios): moderador|admin. */
export function puedeModerar(rol: RolPlataforma): boolean {
  return rol === 'moderador' || rol === 'admin_nodo' || rol === 'admin_hitub';
}

/** Publicacion de ingestas: SOLO admin (decision DH 2026-10-15, #200). */
export function puedePublicarIngestas(rol: RolPlataforma): boolean {
  return rol === 'admin_nodo' || rol === 'admin_hitub';
}

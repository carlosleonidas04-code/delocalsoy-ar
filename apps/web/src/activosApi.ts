/**
 * Cliente de sesión y alta de activos — CORE-004 R5-UI (#109).
 *
 * Puerta única de la UI hacia el flujo ciudadano de R5b: login/registro,
 * validación local con el MISMO schema del backend (@delocalsoy/contracts,
 * sin Zod duplicado en la UI) y POST /api/activos con Bearer.
 *
 * Honestidad (R15):
 * - El token JWT vive SOLO en memoria del módulo (nada en localStorage):
 *   una recarga de página cierra la sesión — costo aceptado por diseño.
 * - Los errores de sesión (ErrorDeSesion) y de validación (ErrorDeValidacion)
 *   se distinguen de los errores de red/servidor (Error genérico).
 * - El backend rechaza PII en título/descripción (ADR-020 cond. 1, Ley
 *   25.326): su mensaje llega tal cual — la UI no repite el valor rechazado.
 * - Anti-enumeración y rate limiting (R5a): 401 genérico "credenciales
 *   inválidas" y 429 con reintentos acotados — el cliente no reintenta solo.
 */
import { ActivoAltaSchema } from "@delocalsoy/contracts";

const BASE = "/api";

/** Sesión en memoria (se pierde al recargar — por diseño, ver header). */
let token: string | null = null;
let usuario: { email: string; rol: string } | null = null;

/** `true` si hay sesión activa en memoria (el formulario la exige). */
export function sesionActiva(): boolean {
  return token !== null;
}

/** Email de la sesión activa (para el saludo del formulario) o `null`. */
export function usuarioActivo(): { email: string; rol: string } | null {
  return usuario;
}

/** Cierra la sesión en memoria (logout explícito o 401 del backend). */
export function cerrarSesion(): void {
  token = null;
  usuario = null;
}

/** Error de sesión: credenciales, expiración, rate limit (429). */
export class ErrorDeSesion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeSesion";
  }
}

/** Error de validación: los datos no pasan el schema compartido (o anti-PII). */
export class ErrorDeValidacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeValidacion";
  }
}

/** Entrada del formulario de alta (cruda, antes de validar). */
export interface ActivoAltaInput {
  tipo: string;
  titulo: string;
  descripcion?: string;
  nodo_key: string;
  lat: number;
  lng: number;
}

/** Activo creado tal como lo devuelve POST /api/activos (R5b). */
export interface ActivoCreado {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  nodo_key: string;
  lat: number;
  lng: number;
  created_by_hash: string;
  created_at: string;
  [k: string]: unknown;
}

type ResultadoValidacion =
  | { ok: true; data: { tipo: string; titulo: string; descripcion?: string; nodo_key: string; lat: number; lng: number } }
  | { ok: false; errores: string[] };

/**
 * Valida el alta con el schema compartido del backend (misma regla en ambos
 * extremos — sin duplicación local). Devuelve mensajes por campo, nunca
 * lanza: el formulario los pinta inline.
 */
export function validarAltaActivo(input: ActivoAltaInput): ResultadoValidacion {
  const parseo = ActivoAltaSchema.safeParse({
    tipo: input.tipo,
    titulo: input.titulo,
    descripcion: input.descripcion,
    nodo_key: input.nodo_key,
    lat: input.lat,
    lng: input.lng,
  });
  if (!parseo.success) {
    return { ok: false, errores: parseo.error.errors.map((e) => e.message) };
  }
  return { ok: true, data: parseo.data };
}

/** Lee el cuerpo JSON sin romper cuando la respuesta no lo tiene. */
async function leerJson(res: Response): Promise<{ success?: boolean; error?: string; data?: unknown }> {
  try {
    return (await res.json()) as { success?: boolean; error?: string; data?: unknown };
  } catch {
    return {};
  }
}

/** POST /api/auth/login — credenciales + token (JWT HS256, 15 min, R5a). */
export async function iniciarSesion(email: string, password: string): Promise<void> {
  const res = await fetch(BASE + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await leerJson(res);
  if (res.status === 401) {
    // Genérico (R5a): no revela si el email existe.
    throw new ErrorDeSesion("credenciales inválidas");
  }
  if (res.status === 429) {
    throw new ErrorDeSesion("demasiados intentos — esperá unos minutos (429)");
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? "fallo al iniciar sesión");
  }
  const data = body.data as { token: string; usuario: { email: string; rol: string } };
  token = data.token;
  usuario = { email: data.usuario.email, rol: data.usuario.rol };
}

/**
 * POST /api/auth/register — alta de ciudadano (rol default, ADR-031) y
 * login inmediato (register + login = 2 intentos del presupuesto 429).
 */
export async function registrarCiudadano(email: string, password: string): Promise<void> {
  const res = await fetch(BASE + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await leerJson(res);
  if (res.status === 409) {
    throw new ErrorDeSesion("el email ya está registrado");
  }
  if (res.status === 429) {
    throw new ErrorDeSesion("demasiados intentos — esperá unos minutos (429)");
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? "fallo al registrar usuario");
  }
  await iniciarSesion(email, password);
}

/**
 * POST /api/activos (R5b) — propuesta ciudadana autenticada. Valida con el
 * schema compartido ANTES de salir a la red; el backend re-valida (nunca se
 * confía en el cliente). El activo nace 'propuesto' — la moderación decide.
 */
export async function crearActivo(input: ActivoAltaInput): Promise<ActivoCreado> {
  const validacion = validarAltaActivo(input);
  if (!validacion.ok) {
    throw new ErrorDeValidacion(validacion.errores.join(" · "));
  }
  if (token === null) {
    throw new ErrorDeSesion("necesitás iniciar sesión para proponer un activo");
  }
  const res = await fetch(BASE + "/activos", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(validacion.data),
  });
  const body = await leerJson(res);
  if (res.status === 400) {
    // Datos inválidos o anti-PII (ADR-020 cond. 1, Ley 25.326): el mensaje
    // del backend es genérico — la UI nunca repite el valor rechazado.
    throw new ErrorDeValidacion(body.error ?? "datos inválidos");
  }
  if (res.status === 401) {
    // Sesión vencida (JWT 15 min): se cierra en memoria y se pide de nuevo.
    cerrarSesion();
    throw new ErrorDeSesion("tu sesión expiró — iniciá sesión otra vez");
  }
  if (res.status === 429) {
    throw new ErrorDeSesion("demasiados intentos — esperá unos minutos (429)");
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? "fallo al crear el activo");
  }
  return body.data as ActivoCreado;
}

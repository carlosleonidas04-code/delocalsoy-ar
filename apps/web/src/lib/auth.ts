/**
 * Autenticación — DELocalSoy.AR
 *
 * Firebase Auth / Google Sign-In DESHABILITADOS por decisión de la Dirección
 * Humana (2026-11-03): la identidad real del producto es la sesión JWT del
 * backend propio (`lib/sesion.ts`). Este módulo conserva las firmas exportadas
 * para no romper consumidores, pero no inicializa Firebase ni autentica contra
 * Google: `auth.currentUser` es siempre `null` y `googleSignIn()` devuelve
 * `null`. Nada se simula (R15): los flujos que exigían sesión de Google
 * muestran su camino de «sin sesión» existente.
 */

import type { User } from 'firebase/auth';

/** @deprecated Deshabilitado (decisión DH 2026-11-03): sin scopes OAuth de Google. */
export const SCOPES: string[] = [];

/** @deprecated Deshabilitado: sin proyecto Firebase. */
export const firebaseProjectId = '';

/** @deprecated Deshabilitado: sin base Firestore. */
export const firebaseDatabaseId = '';

/** @deprecated Siempre `null`: la app de Firebase ya no se inicializa. */
export const app = null;

/** @deprecated Siempre `null`: Firestore ya no se inicializa. */
export const db = null;

/**
 * Estado de autenticación local (stub): `currentUser` es siempre `null`.
 * La sesión real del producto vive en `lib/sesion.ts` (JWT del backend propio).
 */
export const auth = {
  currentUser: null as User | null,
};

/**
 * @deprecated No-op: no hay observable de autenticación de Google. Invoca
 * `onAuthFailure` (si existe) de inmediato y devuelve una desuscripción sin
 * efecto.
 */
export const initAuth = (
  _onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  if (onAuthFailure) onAuthFailure();
  return () => {};
};

/** @deprecated Deshabilitado (decisión DH 2026-11-03). Devuelve siempre `null`. */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  return null;
};

/** @deprecated Deshabilitado. Devuelve siempre `null`. */
export const getAccessToken = async (): Promise<string | null> => {
  return null;
};

/** @deprecated No-op: no hay sesión de Google que cerrar. */
export const logout = async () => {};

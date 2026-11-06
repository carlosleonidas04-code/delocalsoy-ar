import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Identidad por etapas — CORE-004 R3 (ADR-031, #87).
 *
 * Cero dependencias nuevas (decisión de implementación, R3b): scrypt para
 * contraseñas y HS256 para JWT salen del node:crypto nativo — nada entra al
 * lockfile, nada nuevo que auditar por Dependabot.
 *
 * R8 aplicado a sesiones: fail-closed. Sin JWT_SECRET (>= 16 chars) la
 * identidad queda CERRADA, nunca abierta por defecto (mismo criterio que
 * TERRITORIOS_API_KEY / HEALTH_MODE_API_KEY).
 */

// ARTEFACTOS-ROLES AR1 (#400, épica #399): 'visitante' es un rol REAL de la
// API (cuenta ligera de tránsito, SOLO LECTURA en v0.2 — la API es la
// compuerta: PUT /api/me/residencia responde 403 real). El vecino NO es rol:
// residencia = atributo de la cuenta (decisión DH 2026-11-06).
const ROLES = ['ciudadano', 'visitante', 'moderador', 'admin'] as const;
export type Rol = (typeof ROLES)[number];

// scrypt: parámetros por defecto de Node (N=16384, r=8, p=1), 64 bytes de hash.
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return 'scrypt$' + salt + '$' + hash;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const calc = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return calc.length === expected.length && timingSafeEqual(calc, expected);
}

function jwtSecret(): string | null {
  const s = process.env.JWT_SECRET;
  return s && s.length >= 16 ? s : null;
}

// Access token 15 min (ADR-031). Refresh queda para una etapa posterior:
// no se especula infraestructura antes de que exista el producto (R15).
const TOKEN_TTL_SEG = 15 * 60;

export function signToken(user: { id: string; rol: Rol }): string {
  const s = jwtSecret();
  if (!s) throw new Error('JWT_SECRET no configurada (>= 16 chars)');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, rol: user.rol, iat: now, exp: now + TOKEN_TTL_SEG }),
  ).toString('base64url');
  const sig = createHmac('sha256', s).update(header + '.' + payload).digest('base64url');
  return header + '.' + payload + '.' + sig;
}

export type UsuarioJWT = { id: string; rol: Rol };

export function verifyToken(token: string): UsuarioJWT | null {
  const s = jwtSecret();
  if (!s) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHmac('sha256', s).update(header + '.' + payload).digest();
  const got = Buffer.from(sig, 'base64url');
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      rol?: Rol;
      exp?: number;
    };
    if (!claims.sub || !claims.rol || !(ROLES as readonly string[]).includes(claims.rol)) return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
    return { id: claims.sub, rol: claims.rol };
  } catch {
    return null;
  }
}

// Guard de sesión (R8): sin JWT_SECRET la identidad queda cerrada (503).
export function requireJwt(req: Request, res: Response, next: NextFunction): void {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    res.status(503).json({ success: false, error: 'identidad no disponible: falta JWT_SECRET (>= 16 chars)' });
    return;
  }
  const auth = req.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.status(401).json({ success: false, error: 'no autorizado: se requiere Bearer token válido' });
    return;
  }
  res.locals.usuario = user;
  next();
}

// Autorización por rol (ADR-031). R5/R6 la usan en las escrituras reales;
// EV-032 la verifica en una ruta de prueba — sin rutas especulativas en prod.
export function requireRole(...roles: Rol[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.usuario as UsuarioJWT | undefined;
    if (!user || !roles.includes(user.rol)) {
      res.status(403).json({ success: false, error: 'requiere rol: ' + roles.join('|') });
      return;
    }
    next();
  };
}

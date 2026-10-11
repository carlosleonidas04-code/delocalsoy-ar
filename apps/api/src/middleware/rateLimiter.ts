/**
 * DELocalSoy.AR — Rate Limiter de Instancia Única + Cuotas Diferenciadas por Rol (10 / 100 / 500 req/min · T2 CORE-004)
 * Archivo: apps/api/src/middleware/rateLimiter.ts
 *
 * Incluye:
 * 1. Almacén persistente a nivel de clausura del módulo (jamás instanciado por request).
 * 2. Limitador de autenticación por `IP + sha256(email)` (ventana de 300s).
 * 3. Limitador diferenciador por rol (`ROLE_RATE_LIMITS_PER_MINUTE`: ciudadano=10, gestor/custodio=100, auditor/admin=500 req/min)
 *    sincronizado 1:1 con el contrato anunciado en la interfaz Base Consolidada (Requerimiento #2 del Digest Packet v2).
 */

import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  scopeName: string;
}

interface BucketState {
  count: number;
  resetAt: number;
}

export const ROLE_RATE_LIMITS_PER_MINUTE: Record<string, number> = {
  visitante: 10,
  ciudadano: 10,
  vecino: 10,
  operador_campo: 50,
  comerciante: 50,
  gestor: 100,
  custodio_territorial: 100,
  moderador_territorial: 100,
  moderador: 100,
  auditor: 500,
  admin_nodo: 500,
  admin_hitub: 500,
};

export function resolveRoleQuotaPerMinute(role?: string | null): number {
  if (!role) return 10;
  const normalized = role.trim().toLowerCase();
  return ROLE_RATE_LIMITS_PER_MINUTE[normalized] ?? 10;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, BucketState>();

  return function rateLimiterMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const now = Date.now();
    const clientIp =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined) ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const emailRaw =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const emailHash = emailRaw
      ? crypto.createHash('sha256').update(emailRaw).digest('hex').slice(0, 12)
      : 'anon';

    const key =
      options.scopeName === 'auth'
        ? `${options.scopeName}:${clientIp}:${emailHash}`
        : `${options.scopeName}:${clientIp}`;

    if (buckets.size > 500) {
      for (const [k, v] of buckets.entries()) {
        if (v.resetAt <= now) {
          buckets.delete(k);
        }
      }
    }

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(options.maxRequests - 1));
      next();
      return;
    }

    current.count += 1;
    const remaining = Math.max(0, options.maxRequests - current.count);
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (current.count > options.maxRequests) {
      const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: `Límite de peticiones excedido en ${options.scopeName} (${options.maxRequests} req / ${Math.round(options.windowMs / 1000)}s)`,
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiter dinámico por rol (10 / 100 / 500 req/min) para `/api/ask` y escrituras autenticadas.
 */
export function createRoleAwareRateLimiter(scopeName: string, windowMs = 60_000) {
  const buckets = new Map<string, BucketState>();

  return function roleAwareRateLimiterMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const now = Date.now();
    const clientIp =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined) ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const resolvedRole =
      req.actor?.highestRole ||
      (typeof req.headers['x-delocalsoy-role'] === 'string'
        ? req.headers['x-delocalsoy-role']
        : undefined) ||
      (typeof req.body?.role === 'string' ? req.body.role : undefined) ||
      'ciudadano';

    const maxRequests = resolveRoleQuotaPerMinute(resolvedRole);
    const actorKey = req.actor?.sub || clientIp;
    const key = `${scopeName}:${resolvedRole}:${actorKey}`;

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      res.setHeader('X-RateLimit-Role', resolvedRole);
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1));
      next();
      return;
    }

    current.count += 1;
    const remaining = Math.max(0, maxRequests - current.count);
    res.setHeader('X-RateLimit-Role', resolvedRole);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (current.count > maxRequests) {
      const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: `Cuota por rol '${resolvedRole}' excedida en ${scopeName} (${maxRequests} req/min)`,
        role: resolvedRole,
        limitPerMinute: maxRequests,
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 300_000,
  maxRequests: 30,
  scopeName: 'auth',
});

export const askRateLimiter = createRoleAwareRateLimiter('ask-rag', 60_000);

export const apiWriteRateLimiter = createRoleAwareRateLimiter('api-write', 60_000);

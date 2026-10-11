/**
 * DELocalSoy.AR — Rutas de Autenticación JWT (Login, Refresh, Logout y Perfil)
 * Archivo: apps/api/src/routes/auth.routes.ts
 *
 * Incluye:
 * - Resolución determinista del rol de mayor privilegio (resolveHighestPrivilegeRole).
 * - Rate limiting compartido a nivel módulo (authRateLimiter).
 * - Guardia requireWriteAuth (Regla R8) en operaciones de sesión/escritura.
 */

import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { resolveHighestPrivilegeRole } from '../lib/roles.js';
import {
  signJwtToken,
  verifyJwtToken,
  requireWriteAuth,
} from '../middleware/jwtAuth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter: Router = Router();

const revokedRefreshTokens = new Set<string>();

const LoginSchema = z.object({
  email: z.string().email(),
  roles: z.array(z.string()).optional().default(['custodio_territorial', 'ciudadano']),
  nodeKey: z.enum(['capital', 'caucete', 'iglesia']).optional().default('iglesia'),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(16),
});

// POST /api/auth/login — Emite par accessToken + refreshToken con highestRole resuelto
authRouter.post('/login', authRateLimiter, requireWriteAuth, (req, res) => {
  const parsed = LoginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Datos de inicio de sesión inválidos',
      issues: parsed.error.issues,
    });
    return;
  }

  const { email, roles, nodeKey } = parsed.data;
  const actorId = `actor_${crypto.createHash('sha256').update(email).digest('hex').slice(0, 12)}`;
  const highestRole = resolveHighestPrivilegeRole(roles);

  const accessToken = signJwtToken(
    {
      sub: actorId,
      email,
      roles,
      nodeKey,
      tokenType: 'access',
    },
    3600,
  );

  const refreshToken = signJwtToken(
    {
      sub: actorId,
      email,
      roles,
      nodeKey,
      tokenType: 'refresh',
    },
    86400 * 7,
  );

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken,
    expiresInSeconds: 3600,
    actor: {
      id: actorId,
      email,
      roles,
      highestRole,
      nodeKey,
    },
  });
});

// POST /api/auth/refresh — Rota accessToken a partir de un refreshToken no revocado
authRouter.post('/refresh', authRateLimiter, requireWriteAuth, (req, res) => {
  const parsed = RefreshSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'refreshToken requerido',
      issues: parsed.error.issues,
    });
    return;
  }

  const { refreshToken } = parsed.data;
  if (revokedRefreshTokens.has(refreshToken)) {
    res.status(401).json({
      error: 'El refreshToken fue revocado por logout previo',
    });
    return;
  }

  const claims = verifyJwtToken(refreshToken);
  if (!claims || claims.tokenType !== 'refresh') {
    res.status(401).json({
      error: 'refreshToken inválido o expirado',
    });
    return;
  }

  const newAccessToken = signJwtToken(
    {
      sub: claims.sub,
      email: claims.email,
      roles: claims.roles,
      nodeKey: claims.nodeKey,
      tokenType: 'access',
    },
    3600,
  );

  res.status(200).json({
    success: true,
    accessToken: newAccessToken,
    expiresInSeconds: 3600,
    actor: {
      id: claims.sub,
      email: claims.email,
      roles: claims.roles,
      highestRole: resolveHighestPrivilegeRole(claims.roles),
      nodeKey: claims.nodeKey,
    },
  });
});

// POST /api/auth/logout — Revoca el refreshToken activo (protegido por requireWriteAuth R8)
authRouter.post('/logout', authRateLimiter, requireWriteAuth, (req, res) => {
  const refreshToken =
    typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.trim() : '';
  if (refreshToken) {
    revokedRefreshTokens.add(refreshToken);
  }
  res.status(200).json({
    success: true,
    revoked: Boolean(refreshToken),
    message: 'Sesión cerrada y token revocado correctamente.',
  });
});

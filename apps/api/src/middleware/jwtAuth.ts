/**
 * DELocalSoy.AR — Middleware de Autenticación JWT + Alcance por Nodo + requireWriteAuth (Reglas R8 y R10 · T2 CORE-004)
 * Archivo: apps/api/src/middleware/jwtAuth.ts
 *
 * Implementa:
 * - Firma y verificación HMAC-SHA256 de tokens JWT con `jti` único y alcance territorial (`nodeKey` y `allowedNodes`).
 * - Resolución determinista del rol de mayor privilegio (`resolveHighestPrivilegeRole`).
 * - Guardia `requireNodeScope` (Requerimiento #5 del Digest Packet v2): verifica pertenencia del token al nodo
 *   antes de permitir mutaciones sobre rutas sensibles de un departamento (`capital`, `caucete`, `iglesia`),
 *   excepto cuando el actor posee rol federal (`admin_hitub`).
 */

import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { resolveHighestPrivilegeRole, type ActorRole } from '../lib/roles.js';
import { requireWriteAuth as baseRequireWriteAuth } from '../lib/authGuard.js';

export type CanonicalNodeScopeKey = 'capital' | 'caucete' | 'iglesia';

export interface JwtActorClaims {
  jti: string;
  sub: string;
  email: string;
  roles: ActorRole[];
  highestRole: ActorRole;
  nodeKey: CanonicalNodeScopeKey;
  allowedNodes: CanonicalNodeScopeKey[];
  tokenType: 'access' | 'refresh';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      actor?: JwtActorClaims;
    }
  }
}

const DEFAULT_JWT_SECRET =
  process.env.DELOCALSOY_JWT_SECRET ||
  process.env.DELOCALSOY_WRITE_TOKEN ||
  'delocalsoy-hitub-r8-local-token';

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function normalizeCanonicalNodeKey(raw?: string | null): CanonicalNodeScopeKey | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (lower === 'capital' || lower === 'gran-san-juan-capital' || lower === 'ter-sjn-cap') {
    return 'capital';
  }
  if (lower === 'caucete' || lower === 'ter-sjn-cau') {
    return 'caucete';
  }
  if (lower === 'iglesia' || lower === 'ter-sjn-igl') {
    return 'iglesia';
  }
  return null;
}

export function signJwtToken(
  payload: {
    sub: string;
    email: string;
    roles: string[];
    nodeKey?: CanonicalNodeScopeKey;
    allowedNodes?: CanonicalNodeScopeKey[];
    tokenType?: 'access' | 'refresh';
  },
  expiresInSeconds = 900,
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const highestRole = resolveHighestPrivilegeRole(payload.roles);
  const normalizedRoles = payload.roles.length > 0 ? (payload.roles as ActorRole[]) : [highestRole];
  const validNodeKey: CanonicalNodeScopeKey =
    payload.nodeKey && ['capital', 'caucete', 'iglesia'].includes(payload.nodeKey)
      ? payload.nodeKey
      : 'iglesia';

  const defaultAllowedNodes: CanonicalNodeScopeKey[] =
    highestRole === 'admin_hitub'
      ? ['capital', 'caucete', 'iglesia']
      : payload.allowedNodes && payload.allowedNodes.length > 0
        ? payload.allowedNodes
        : [validNodeKey];

  const header = { alg: 'HS256', typ: 'JWT' };
  const claims: JwtActorClaims = {
    jti: `jti_${crypto.randomBytes(8).toString('hex')}`,
    sub: payload.sub,
    email: payload.email,
    roles: normalizedRoles,
    highestRole,
    nodeKey: validNodeKey,
    allowedNodes: defaultAllowedNodes,
    tokenType: payload.tokenType ?? 'access',
    iat: nowSec,
    exp: nowSec + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', DEFAULT_JWT_SECRET)
    .update(signingInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

export function verifyJwtToken(token: string): JwtActorClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', DEFAULT_JWT_SECRET).update(signingInput).digest(),
  );

  const a = Buffer.from(encodedSignature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as JwtActorClaims;
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp !== 'number' || parsed.exp < nowSec) {
      return null;
    }
    parsed.highestRole = resolveHighestPrivilegeRole(parsed.roles);
    if (!Array.isArray(parsed.allowedNodes) || parsed.allowedNodes.length === 0) {
      parsed.allowedNodes =
        parsed.highestRole === 'admin_hitub'
          ? ['capital', 'caucete', 'iglesia']
          : [parsed.nodeKey || 'iglesia'];
    }
    return parsed;
  } catch {
    return null;
  }
}

export function authenticateJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Token Bearer JWT requerido (Regla R8)',
      rule: 'R8',
    });
    return;
  }

  const rawToken = authHeader.slice('Bearer '.length).trim();
  const claims = verifyJwtToken(rawToken);
  if (!claims) {
    res.status(401).json({
      error: 'Token JWT inválido o expirado',
      rule: 'R8',
    });
    return;
  }

  req.actor = claims;
  next();
}

/**
 * Guardia de alcance territorial por nodo (Requerimiento #5 · Digest Packet v2 CORE-004):
 * Verifica que cuando se presenta un JWT con alcance de nodo (`claims.nodeKey` / `claims.allowedNodes`),
 * coincida con el nodo objetivo de la ruta sensible (`req.params.nodeKey`, `req.body.nodeKey` o `req.body.territoryId`),
 * salvo que el actor tenga rol federal `admin_hitub`.
 */
export function requireNodeScope(
  extractTargetNode?: (req: Request) => string | undefined,
) {
  return function nodeScopeMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const actor = req.actor;
    if (!actor) {
      next();
      return;
    }
    if (actor.highestRole === 'admin_hitub') {
      next();
      return;
    }

    const rawTarget =
      (extractTargetNode ? extractTargetNode(req) : undefined) ??
      (typeof req.params?.nodeKey === 'string' ? req.params.nodeKey : undefined) ??
      (typeof req.body?.nodeKey === 'string' ? req.body.nodeKey : undefined) ??
      (typeof req.body?.territoryId === 'string' ? req.body.territoryId : undefined) ??
      (typeof req.body?.nodeId === 'string' ? req.body.nodeId : undefined);

    const targetNode = normalizeCanonicalNodeKey(rawTarget);
    if (!targetNode) {
      next();
      return;
    }

    const allowed = actor.allowedNodes ?? [actor.nodeKey];
    if (!allowed.includes(targetNode)) {
      res.status(403).json({
        error: `Alcance territorial insuficiente: el token pertenece al nodo '${actor.nodeKey}' y no está autorizado para mutar el nodo '${targetNode}'.`,
        rule: 'R8-NODE-SCOPE',
        tokenNodeScope: allowed,
        requestedNode: targetNode,
      });
      return;
    }

    next();
  };
}

/**
 * Guardia unificada de escritura (Regla R8):
 * Acepta un JWT válido con privilegio de escritura (>= operador_campo) y valida alcance por nodo si aplica,
 * o delega al token soberano R8.
 */
export function requireWriteAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const jwtClaims = verifyJwtToken(token);
    if (jwtClaims) {
      req.actor = jwtClaims;
      requireNodeScope()(req, res, next);
      return;
    }
  }
  baseRequireWriteAuth(req, res, next);
}

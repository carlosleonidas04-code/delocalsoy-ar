import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { UsuarioLoginSchema, UsuarioRegistroSchema, VisitanteRegistroSchema } from '@delocalsoy/contracts';
import { hashPassword, requireJwt, signToken, verifyPassword, type Rol } from '../lib/auth.js';
import { rateLimitAuth } from '../lib/rate-limit.js';
import { detectaPII } from '../lib/anti-pii.js';
import { z } from 'zod';

/**
 * Identidad por etapas — CORE-004 R3 (ADR-031, #87).
 *
 * POST /api/auth/register           — alta de ciudadano (rol default; la promoción a
 *                                      moderador/admin es operación de sistema con API key R8, sin endpoint público).
 * POST /api/auth/register-visitante — ARTEFACTOS-ROLES AR1 (#400, épica #399): cuenta
 *                                      ligera visitante (rol real 'visitante', SOLO LECTURA v0.2).
 * POST /api/auth/login              — credenciales + access token JWT (HS256, 15 min).
 * GET  /api/auth/me                 — identidad de la sesión (guard requireJwt) con el
 *                                      atributo de residencia AR1 y el tránsito del visitante.
 *
 * Sellos en events_raw (fuente de verdad, append-only): system.user_registered
 * y system.user_session llevan SOLO {usuario_id, rol} — nunca el email
 * (Ley 25.326 / ADR-027). El guard H-01 (R3a) reserva system.* para estas
 * rutas internas: la ingesta pública no puede falsificarlos. El sello AR1
 * 'visitante.registrado' es NO-system.* (el worker core004 solo proyecta
 * system.*) y lleva SOLO {subnodo_transito_key, created_by_hash} — email y
 * alias jamás al evento.
 */
const router: Router = Router();

// AUD-04 (#99): hash señuelo — el login verifica scrypt con el MISMO costo
// aunque el email no exista; el tiempo de respuesta deja de delatar registros.
const HASH_SENALUELO = hashPassword('senaluelo-de-timing-core004-r5a');

type SealPayload = { usuario_id: string; rol: Rol };

function sealData(type: 'system.user_registered' | 'system.user_session', payload: SealPayload) {
  const occurredAt = new Date();
  const hash = createHash('sha256')
    .update(type + '|' + occurredAt.toISOString() + '|' + JSON.stringify(payload))
    .digest('hex');
  return { type, payload, hash, occurred_at: occurredAt };
}

// ARTEFACTOS-ROLES AR1 (#400, épica #399): sello del visitante — NO system.*
// (el worker core004 solo proyecta system.*: este sello queda como crédito
// de la cascada, no lo consume aún), SIN PII (Ley 25.326 / ADR-027): solo
// {subnodo_transito_key, created_by_hash} con pseudónimo sha256(usuario_id)
// truncado (patrón CORE-005 R2) — el email y el alias jamás al evento.
type VisitanteSealPayload = { subnodo_transito_key: string; created_by_hash: string };

function sealVisitanteRegistrado(payload: VisitanteSealPayload) {
  const type = 'visitante.registrado';
  const occurredAt = new Date();
  const hash = createHash('sha256')
    .update(type + '|' + occurredAt.toISOString() + '|' + JSON.stringify(payload))
    .digest('hex');
  return { type, payload, hash, occurred_at: occurredAt };
}

// Pseudónimo AR1 del titular de la cuenta (ADR-027, Ley 25.326).
function seudonimoAr1(usuarioId: string): string {
  return createHash('sha256').update(usuarioId).digest('hex').slice(0, 32);
}

router.post('/register', rateLimitAuth, async (req: Request, res: Response) => {
  try {
    const body = UsuarioRegistroSchema.parse(req.body ?? {});
    const existing = await prisma.usuarios.findUnique({ where: { email: body.email } });
    if (existing) {
      // Riesgo residual aceptado (AUD-04, #99): el 409 revela que el email
      // existe. Alternativa honesta = confirmación asincrónica por email,
      // infraestructura que aún no existe (R15: no se especula). El límite
      // de intentos (429) acota la enumeración masiva mientras tanto.
      res.status(409).json({ success: false, error: 'el email ya está registrado' });
      return;
    }
    const rol: Rol = 'ciudadano'; // ADR-031: el alta pública solo crea ciudadanos
    const usuario = await prisma.usuarios.create({
      data: {
        email: body.email,
        password_hash: hashPassword(body.password),
        rol,
        display_name: body.display_name ?? null,
      },
    });
    // Sello en events_raw: sin sello no hay usuario (R4/R5) — rollback honesto.
    try {
      await prisma.events_raw.create({ data: sealData('system.user_registered', { usuario_id: usuario.id, rol }) });
    } catch (err) {
      await prisma.usuarios.delete({ where: { id: usuario.id } });
      throw err;
    }
    res.status(201).json({
      success: true,
      data: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        display_name: usuario.display_name,
        created_at: usuario.created_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    // AUD-06 (#100): el detalle queda server-side; al cliente solo lo genérico.
    console.error('[auth] register:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'fallo al registrar usuario' });
  }
});

// ARTEFACTOS-ROLES AR1 (#400, épica #399): cuenta ligera visitante — rol
// real 'visitante', SOLO LECTURA en v0.2 (decisión DH 2026-11-06: la API es
// la compuerta — PUT /api/me/residencia responde 403 real, nada se simula).
// El subnodo de tránsito se valida contra el vocabulario real (R15) y es
// DECLARADO, jamás geolocalizado (Ley 25.326 / ADR-027). Anti-PII sobre el
// alias público (ADR-020 cond. 1, sin eco del valor). Rate limit de
// identidad compartido (R5a, #101). Sello 'visitante.registrado' con
// rollback: sin sello no hay cuenta acreditada (R4/R15).
router.post('/register-visitante', rateLimitAuth, async (req: Request, res: Response) => {
  try {
    const body = VisitanteRegistroSchema.parse(req.body ?? {});
    // Anti-PII antes de persistir: el alias es público — sin eco del valor.
    if (detectaPII(body.alias) !== null) {
      res.status(400).json({ success: false, error: 'payload rechazado: el alias contiene datos personales identificables' });
      return;
    }
    const existing = await prisma.usuarios.findUnique({ where: { email: body.email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'el email ya está registrado' });
      return;
    }
    const subnodo = await prisma.subnodos.findUnique({ where: { key: body.subnodo_transito_key } });
    if (!subnodo) {
      res.status(400).json({
        success: false,
        error: 'el subnodo de tránsito no existe en el vocabulario — el tránsito se ancla a un subnodo real (R15)',
      });
      return;
    }
    const rol: Rol = 'visitante';
    const usuario = await prisma.usuarios.create({
      data: {
        email: body.email,
        password_hash: hashPassword(body.password),
        rol,
        display_name: body.alias,
        transito_subnodo_key: body.subnodo_transito_key,
        consentimiento: { contacto_email: true },
      },
    });
    try {
      await prisma.events_raw.create({
        data: sealVisitanteRegistrado({
          subnodo_transito_key: body.subnodo_transito_key,
          created_by_hash: seudonimoAr1(usuario.id),
        }),
      });
    } catch (err) {
      // Rollback honesto: sin sello no hay visitante acreditado (R4/R15).
      await prisma.usuarios.delete({ where: { id: usuario.id } }).catch(() => undefined);
      throw err;
    }
    res.status(201).json({
      success: true,
      data: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        display_name: usuario.display_name,
        transito_subnodo_key: usuario.transito_subnodo_key,
        created_at: usuario.created_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    // AUD-06 (#100): el detalle queda server-side; al cliente solo lo genérico.
    console.error('[auth] register-visitante:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'fallo al registrar visitante' });
  }
});

router.post('/login', rateLimitAuth, async (req: Request, res: Response) => {
  try {
    const body = UsuarioLoginSchema.parse(req.body ?? {});
    const usuario = await prisma.usuarios.findUnique({ where: { email: body.email } });
    // AUD-04 (#99): mismo trabajo de scrypt exista o no el email — la
    // respuesta ya no delata registros por diferencia de tiempo.
    const passwordOk = verifyPassword(body.password, usuario?.password_hash ?? HASH_SENALUELO);
    if (!usuario || !passwordOk) {
      // Genérico (Ley 25.326): no revela si el email existe.
      res.status(401).json({ success: false, error: 'credenciales inválidas' });
      return;
    }
    const rol = usuario.rol as Rol;
    let token: string;
    try {
      token = signToken({ id: usuario.id, rol });
    } catch {
      res.status(503).json({ success: false, error: 'identidad no disponible: falta JWT_SECRET (>= 16 chars)' });
      return;
    }
    try {
      await prisma.events_raw.create({ data: sealData('system.user_session', { usuario_id: usuario.id, rol }) });
    } catch (err) {
      console.error('[auth] sello de sesión:', err instanceof Error ? err.message : String(err));
      res.status(503).json({ success: false, error: 'no se pudo sellar la sesión en events_raw' });
      return;
    }
    res.json({
      success: true,
      data: {
        token,
        usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol, display_name: usuario.display_name },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    console.error('[auth] login:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'fallo al iniciar sesión' });
  }
});

router.get('/me', requireJwt, async (req: Request, res: Response) => {
  const session = res.locals.usuario as { id: string; rol: Rol };
  // AUD-08 (#102): sin try/catch, un fallo de base dejaba la promesa sin
  // manejar (Express 4 no atrapa async) — colgaba el request.
  try {
    const usuario = await prisma.usuarios.findUnique({ where: { id: session.id } });
    if (!usuario) {
      res.status(401).json({ success: false, error: 'sesión inválida: el usuario no existe' });
      return;
    }
    res.json({
      success: true,
      data: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        display_name: usuario.display_name,
        created_at: usuario.created_at,
        // ARTEFACTOS-ROLES AR1 (#400, épica #399): el perfil se DERIVA en el
        // cliente desde estos campos reales (vecino = atributo de residencia,
        // NO rol — decisión DH 2026-11-06). Sin domicilio jamás: solo la
        // clave del subnodo y su timestamp (Ley 25.326 / ADR-027).
        residencia_subnodo_key: usuario.residencia_subnodo_key,
        residencia_declarada_en: usuario.residencia_declarada_en,
        transito_subnodo_key: usuario.transito_subnodo_key,
      },
    });
  } catch (error) {
    console.error('[auth] me:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'fallo al leer la identidad' });
  }
});

export default router;

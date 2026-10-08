import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { UsuarioLoginSchema, UsuarioRegistroSchema } from '@delocalsoy/contracts';
import { hashPassword, requireJwt, signToken, verifyPassword, type Rol } from '../lib/auth.js';
import { z } from 'zod';

/**
 * Identidad por etapas — CORE-004 R3 (ADR-031, #87).
 *
 * POST /api/auth/register — alta de ciudadano (rol default; la promoción a
 *   moderador/admin es operación de sistema con API key R8, sin endpoint público).
 * POST /api/auth/login    — credenciales + access token JWT (HS256, 15 min).
 * GET  /api/auth/me       — identidad de la sesión (guard requireJwt).
 *
 * Sellos en events_raw (fuente de verdad, append-only): system.user_registered
 * y system.user_session llevan SOLO {usuario_id, rol} — nunca el email
 * (Ley 25.326 / ADR-027). El guard H-01 (R3a) reserva system.* para estas
 * rutas internas: la ingesta pública no puede falsificarlos.
 */
const router: Router = Router();

type SealPayload = { usuario_id: string; rol: Rol };

function sealData(type: 'system.user_registered' | 'system.user_session', payload: SealPayload) {
  const occurredAt = new Date();
  const hash = createHash('sha256')
    .update(type + '|' + occurredAt.toISOString() + '|' + JSON.stringify(payload))
    .digest('hex');
  return { type, payload, hash, occurred_at: occurredAt };
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = UsuarioRegistroSchema.parse(req.body ?? {});
    const existing = await prisma.usuarios.findUnique({ where: { email: body.email } });
    if (existing) {
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
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'fallo al registrar usuario',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = UsuarioLoginSchema.parse(req.body ?? {});
    const usuario = await prisma.usuarios.findUnique({ where: { email: body.email } });
    if (!usuario || !verifyPassword(body.password, usuario.password_hash)) {
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
      res.status(503).json({
        success: false,
        error: 'no se pudo sellar la sesión en events_raw',
        details: err instanceof Error ? err.message : String(err),
      });
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
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'fallo al iniciar sesión',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get('/me', requireJwt, async (req: Request, res: Response) => {
  const session = res.locals.usuario as { id: string; rol: Rol };
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
    },
  });
});

export default router;

import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';

/**
 * Salud honesta del sistema — Aterrizaje PR 1 (issue #20).
 * R5: nunca responde 200 OK silencioso en modo sintético sin declararlo.
 */

export type SystemMode = 'real' | 'synthetic' | 'degraded';

const ModeSchema = z.enum(['real', 'synthetic', 'degraded']);

// Estado en memoria del modo declarado. Arranca en 'real' (o SYSTEM_MODE);
// si la base no responde, el modo EFECTIVO reportado es 'degraded'.
const state: { mode: SystemMode; declaredAt: string } = {
  mode: ModeSchema.parse(process.env.SYSTEM_MODE ?? 'real'),
  declaredAt: new Date().toISOString(),
};

async function dbConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

const router = Router();

// GET /api/health — estado honesto del sistema
router.get('/', async (_req: Request, res: Response) => {
  const db = await dbConnected();
  // Modo efectivo: 'real' declarado sin base disponible => 'degraded' (R5)
  const effectiveMode: SystemMode = state.mode === 'real' && !db ? 'degraded' : state.mode;

  let evidenciasCount: number | null = null;
  if (db) {
    try {
      evidenciasCount = await prisma.evidencias.count();
    } catch {
      evidenciasCount = null;
    }
  }

  res.json({
    status: effectiveMode === 'real' ? 'ok' : effectiveMode,
    service: 'delocalsoy-ar-api',
    version: '0.3.0',
    mode: effectiveMode, // real | synthetic | degraded (R5)
    modeDeclared: state.mode,
    modeDeclaredAt: state.declaredAt,
    dataSource: db ? 'postgres' : 'none',
    branchProtection: process.env.BRANCH_PROTECTION === 'true', // honesto: false hasta que exista la regla de rama (issue #25)
    evidencias: evidenciasCount,
    timestamp: new Date().toISOString(),
  });
});

// PATCH /api/health/mode — transición de modo sellada en events_raw (R8: guarda de autenticación)
router.patch('/mode', async (req: Request, res: Response) => {
  const apiKey = req.get('x-api-key');
  const expected = process.env.HEALTH_MODE_API_KEY;
  if (!expected || apiKey !== expected) {
    res.status(401).json({ error: 'no autorizado: se requiere cabecera x-api-key y variable HEALTH_MODE_API_KEY' });
    return;
  }

  const parsed = ModeSchema.safeParse((req.body ?? {}).mode);
  if (!parsed.success) {
    res.status(400).json({ error: "'mode' inválido: usar 'real' | 'synthetic' | 'degraded'" });
    return;
  }

  const from = state.mode;
  const to = parsed.data;
  const payload = { from, to, actor: 'health-mode-api', via: 'PATCH /api/health/mode' };
  const occurredAt = new Date();
  const hash = createHash('sha256')
    .update('system.mode_change' + '|' + occurredAt.toISOString() + '|' + JSON.stringify(payload))
    .digest('hex');

  // Sello auditable: la transición queda en events_raw (append-only, idempotente).
  // R4/R5: sin base no hay sello => la transición NO se aplica.
  try {
    await prisma.events_raw.create({
      data: { type: 'system.mode_change', payload, hash, occurred_at: occurredAt },
    });
  } catch (err) {
    res.status(503).json({
      error: 'no se pudo sellar la transición en events_raw',
      detail: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  state.mode = to;
  state.declaredAt = occurredAt.toISOString();
  res.json({ status: 'sellado', from, to, sealedAt: state.declaredAt });
});

export default router;

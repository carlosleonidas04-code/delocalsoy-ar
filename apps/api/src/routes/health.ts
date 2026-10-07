import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '@delocalsoy/db';
import { RuntimeHealthModeSchema } from '@delocalsoy/contracts';

/**
 * Salud honesta del sistema — Aterrizaje PR 1 (issue #20).
 * R5: nunca responde 200 OK silencioso en modo sintético sin declararlo.
 * R7 (riesgo #58): el modo declarado se resuelve desde el último
 * 'system.mode_change' sellado en events_raw; la memoria del proceso
 * es solo fallback cuando no hay base, no la fuente de verdad.
 */

export type SystemMode = 'real' | 'synthetic' | 'degraded';

const ModeSchema = RuntimeHealthModeSchema;

// Último estado conocido en memoria (fallback). Arranca en 'real' (o SYSTEM_MODE);
// si la base responde, el sello más reciente de events_raw manda.
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

// R7: el modo declarado vive en events_raw (append-only). Sin base o sin sello,
// cae al estado del proceso (env SYSTEM_MODE al arrancar).
async function resolvedMode(): Promise<{
  mode: SystemMode;
  declaredAt: string;
  source: 'events_raw' | 'process';
}> {
  try {
    const last = await prisma.events_raw.findFirst({
      where: { type: 'system.mode_change' },
      orderBy: { occurred_at: 'desc' },
    });
    if (last) {
      const parsed = ModeSchema.safeParse((last.payload as { to?: unknown } | null)?.to);
      if (parsed.success) {
        return { mode: parsed.data, declaredAt: last.occurred_at.toISOString(), source: 'events_raw' };
      }
    }
  } catch {
    // sin base: fallback al estado del proceso
  }
  return { mode: state.mode, declaredAt: state.declaredAt, source: 'process' };
}

const router: Router = Router();

// GET /api/health — estado honesto del sistema
router.get('/', async (_req: Request, res: Response) => {
  const db = await dbConnected();
  const declared = db
    ? await resolvedMode()
    : { mode: state.mode, declaredAt: state.declaredAt, source: 'process' as const };
  // Modo efectivo: 'real' declarado sin base disponible => 'degraded' (R5)
  const effectiveMode: SystemMode = declared.mode === 'real' && !db ? 'degraded' : declared.mode;

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
    version: '0.4.0',
    mode: effectiveMode, // real | synthetic | degraded (R5)
    modeDeclared: declared.mode,
    modeDeclaredAt: declared.declaredAt,
    modeSource: declared.source, // events_raw | process (R7)
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

  // R7: el 'from' también se lee del sello canónico, no de la memoria.
  const previous = await resolvedMode();
  const from = previous.mode;
  const to = parsed.data;
  const payload = { from, to, actor: 'health-mode-api', via: 'PATCH /api/health/mode' };
  const occurredAt = new Date();
  const hash = createHash('sha256')
    .update('system.mode_change' + '|' + occurredAt.toISOString() + '|' + JSON.stringify(payload))
    .digest('hex');

  // Sello auditable: la transición queda en events_raw (append-only, idempotente).
  // R4/R5: sin base no hay sello => la transición NO se aplica.
  // R7: el sello ES el estado; la memoria solo acelera el fallback.
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

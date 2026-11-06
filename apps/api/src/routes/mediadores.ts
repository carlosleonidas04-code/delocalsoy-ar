import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { MediadorAltaSchema } from '@delocalsoy/contracts';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio mediadores — NODO-VIG-3 VIG-011 (#378, épica #377): AMC —
 * boca única de reporte territorial del nodo Iglesia.
 *
 * Registro comunitario de mediadores: vecinos con aval (asamblea |
 * comision_vecinal — comunitario, no gubernamental, R15) que cargan las
 * planillas papel y los mensajes del número único de WhatsApp de la
 * asamblea (SIN bot — la ingesta es humana). El alias público es un
 * slug: NO hay nombre ni contacto en la tabla (ADR-027, Ley 25.326) —
 * la devolución al vecino va por el canal de origen con el mediador.
 *
 * Nace VACÍO (R15): la asamblea aún no ratificó mediadores — ninguna fila
 * se siembra; sin registro no hay canal papel|whatsapp (el contrato de
 * alta AMC valida mediador_ref contra esta tabla).
 *
 * Sello en events_raw (R4/R15): 'mediador.registrado' sin PII — si el
 * sello falla, el registro se revierte (nunca una fila sin evento).
 */
const router: Router = Router();

// Sello idempotente en events_raw + referencia al stream (patrón reportes).
async function sellarEvento(type: string, payload: Record<string, unknown>): Promise<void> {
  const occurredAt = new Date();
  const hash = createHash('sha256')
    .update(type + '|' + occurredAt.toISOString() + '|' + JSON.stringify(payload))
    .digest('hex');
  const event = await prisma.events_raw.create({
    data: { type, payload: payload as object, hash, occurred_at: occurredAt },
  });
  await xaddEventReference('events:raw', {
    event_id: event.id,
    type: event.type,
    hash: event.hash,
    occurred_at: event.occurred_at.toISOString(),
  });
}

// POST /api/mediadores — registro SOLO admin: la DH ratifica el aval; la
// carga operativa (planillas/WhatsApp del número único de la asamblea)
// queda asociada a este alias por mediador_ref en el alta AMC.
router.post('/', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof MediadorAltaSchema>;
  try {
    parsed = MediadorAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  try {
    let mediador;
    try {
      mediador = await prisma.mediadores.create({
        data: {
          nodo_key: parsed.nodo_key,
          key: parsed.key,
          label: parsed.label,
          aval: parsed.aval,
          aval_estado: 'vigente',
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // 409 honesto: el alias comunitario del mediador es único.
        res.status(409).json({ success: false, error: 'ya existe un mediador con ese alias comunitario' });
        return;
      }
      throw err;
    }

    try {
      await sellarEvento('mediador.registrado', {
        mediador_id: mediador.id,
        key: mediador.key,
        nodo_key: mediador.nodo_key,
        aval: mediador.aval,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay registro acreditado.
      await prisma.mediadores.delete({ where: { id: mediador.id } }).catch(() => undefined);
      console.error('[mediadores] sellar alta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el mediador' });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        key: mediador.key,
        label: mediador.label,
        aval: mediador.aval,
        aval_estado: mediador.aval_estado,
        nodo_key: mediador.nodo_key,
      },
    });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[mediadores] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al registrar el mediador' });
  }
});

// GET /api/mediadores?nodo=iglesia — lectura pública de vigentes, sin PII
// (alias + rol visible + aval; nunca nombre ni contacto).
router.get('/', async (_req: Request, res: Response) => {
  try {
    const nodo = typeof _req.query.nodo === 'string' ? _req.query.nodo : undefined;
    const rows = (await prisma.mediadores.findMany({
      where: { aval_estado: 'vigente', ...(nodo !== undefined ? { nodo_key: nodo } : {}) },
      orderBy: { key: 'asc' },
    })) as { key: string; label: string; aval: string; nodo_key: string }[];
    res.json({
      success: true,
      data: rows.map((m) => ({ key: m.key, label: m.label, aval: m.aval, nodo_key: m.nodo_key })),
      count: rows.length,
    });
  } catch (err) {
    console.error('[mediadores] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al listar los mediadores' });
  }
});

export default router;

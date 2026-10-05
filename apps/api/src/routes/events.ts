import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '@delocalsoy/db';

/**
 * Eventos crudos del sistema — fuente de verdad.
 * Append-only e idempotente: el hash único de events_raw evita duplicados.
 */
const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as {
    type?: unknown;
    payload?: unknown;
    occurred_at?: unknown;
    hash?: unknown;
  };

  if (typeof body.type !== 'string' || body.type.length === 0) {
    res.status(400).json({ error: "'type' es requerido (string no vacío)" });
    return;
  }

  const occurredAt = body.occurred_at == null ? new Date() : new Date(String(body.occurred_at));
  if (Number.isNaN(occurredAt.getTime())) {
    res.status(400).json({ error: "'occurred_at' inválido: usar ISO 8601 o omitirlo" });
    return;
  }

  // Hash idempotente: sha256(type | occurred_at | payload)
  const hash =
    typeof body.hash === 'string' && body.hash.length > 0
      ? body.hash
      : createHash('sha256')
          .update(body.type + '|' + occurredAt.toISOString() + '|' + JSON.stringify(body.payload ?? null))
          .digest('hex');

  try {
    const existing = await prisma.events_raw.findUnique({ where: { hash } });
    if (existing) {
      res.status(200).json({ status: 'duplicado', event: existing });
      return;
    }

    const event = await prisma.events_raw.create({
      data: {
        type: body.type,
        payload: (body.payload ?? {}) as object,
        hash,
        occurred_at: occurredAt,
      },
    });
    res.status(201).json({ status: 'creado', event });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error desconocido';
    res.status(500).json({ error: 'fallo al persistir el evento', detail: message });
  }
});

export default router;

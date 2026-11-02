import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { detectaPII } from '../lib/anti-pii.js';

/**
 * Eventos crudos del sistema — fuente de verdad.
 * Append-only e idempotente: el hash único de events_raw evita duplicados.
 *
 * ADR-020 cond. 1 / Ley 25.326 (CORE-002 T5, #67): la ingesta rechaza payloads
 * con datos personales identificables (DNI/CUIT/CUIL, email, teléfono AR).
 * El rechazo es ANTES de persistir y genérico: nunca repite el valor
 * sospechoso en la respuesta ni en stdout. Desde R5b los patrones viven en
 * lib/anti-pii.ts (módulo compartido con la escritura ciudadana de activos).
 *
 * H-01 (auditoría T2 Anthropic, 2026-10-07, corregido en CORE-004 R3): los
 * tipos 'system.*' son sellos del sistema — solo las rutas internas con guard
 * R8 (p. ej. PATCH /api/health/mode, auth de CORE-004 R3) los escriben.
 * La ingesta pública los rechaza: nadie puede falsificar el estado global
 * (mode, sesiones) por el endpoint público de eventos.
 *
 * ADR-032 (CORE-004 R4a): tras persistir en events_raw (única fuente de
 * verdad) se publica una REFERENCIA al stream events:raw — transporte para
 * el worker de R4b. Fail-open: sin Redis, el POST sigue 201; el stream no
 * es almacén de la verdad, solo avisa la proyección.
 */
const router: Router = Router();

// Prefijo reservado: sellos del sistema, no ingesta pública.
const SYSTEM_TYPE_PREFIX = 'system.';

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

  // H-01: tipo reservado del sistema — la ingesta pública no puede sellar
  // system.* (evita falsificar mode/sesiones saltándose los guards R8).
  if (body.type.startsWith(SYSTEM_TYPE_PREFIX)) {
    res.status(403).json({
      error: "tipo reservado del sistema: 'system.*' no se acepta por la ingesta pública",
    });
    return;
  }

  const occurredAt = body.occurred_at == null ? new Date() : new Date(String(body.occurred_at));
  if (Number.isNaN(occurredAt.getTime())) {
    res.status(400).json({ error: "'occurred_at' inválido: usar ISO 8601 o omitirlo" });
    return;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): rechazo ANTES de persistir y sin
  // eco del valor. Sin base igual se rechaza — la política es de la API, no de la DB.
  const contenido = JSON.stringify({ type: body.type, payload: body.payload ?? null, occurred_at: body.occurred_at ?? null });
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: `payload rechazado: contiene datos personales identificables (${pii}) — ADR-020 cond. 1, Ley 25.326`,
    });
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

    // ADR-032 (R4a) + AUD-08 (H2, #103): transporte — referencia al stream.
    // xaddEventReference es fail-open (devuelve null si no publicó; nunca
    // lanza): el 201 DECLARA si la referencia llegó — stream:false es el hueco
    // real que el reconciliador del worker repara en su próxima pasada.
    // events_raw es la verdad; el stream solo avanza la proyección (worker R4b).
    const published = await xaddEventReference('events:raw', {
      event_id: event.id,
      type: event.type,
      hash: event.hash,
      occurred_at: event.occurred_at.toISOString(),
    });
    res.status(201).json({ status: 'creado', event, stream: published !== null });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[events] persistir:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'fallo al persistir el evento' });
  }
});

export default router;

import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '@delocalsoy/db';

/**
 * Eventos crudos del sistema — fuente de verdad.
 * Append-only e idempotente: el hash único de events_raw evita duplicados.
 *
 * ADR-020 cond. 1 / Ley 25.326 (CORE-002 T5, #67): la ingesta rechaza payloads
 * con datos personales identificables (DNI/CUIT/CUIL, email, teléfono AR).
 * El rechazo es ANTES de persistir y genérico: nunca repite el valor
 * sospechoso en la respuesta ni en stdout.
 *
 * H-01 (auditoría T2 Anthropic, 2026-10-07, corregido en CORE-004 R3): los
 * tipos 'system.*' son sellos del sistema — solo las rutas internas con guard
 * R8 (p. ej. PATCH /api/health/mode, auth de CORE-004 R3) los escriben.
 * La ingesta pública los rechaza: nadie puede falsificar el estado global
 * (mode, sesiones) por el endpoint público de eventos.
 */
const router: Router = Router();

// Prefijo reservado: sellos del sistema, no ingesta pública.
const SYSTEM_TYPE_PREFIX = 'system.';

// Patrones de PII argentina (ADR-027). Se aplican sobre el contenido de
// autoría humana del evento (type/payload/occurred_at); el hash hexagonal
// exógeno queda fuera del escaneo — es un digest de idempotencia, no texto.
const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'CUIT/CUIL', regex: /\b\d{2}-\d{8}-\d\b/ },
  { name: 'DNI', regex: /\b\d{1,2}\.?\d{3}\.?\d{3}\b/ },
  { name: 'email', regex: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  { name: 'teléfono AR', regex: /\+54[\d\s().-]{8,}|\b011[\d\s().-]{8,}/ },
];

function detectaPII(serialized: string): string | null {
  for (const patron of PII_PATTERNS) {
    if (patron.regex.test(serialized)) return patron.name;
  }
  return null;
}

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
    res.status(201).json({ status: 'creado', event });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error desconocido';
    res.status(500).json({ error: 'fallo al persistir el evento', detail: message });
  }
});

export default router;

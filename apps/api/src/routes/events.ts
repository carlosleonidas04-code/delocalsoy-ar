import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import {
  requireWriteAuth,
  type AuthenticatedWriteRequest,
} from '../lib/authGuard.js';

const router: Router = Router();

function isPrismaUniqueConstraintError(err: unknown): err is { code: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

// Patrones de bloqueo determinista Anti-PII en Servidor (Ley 25.326 · ADR-020 #32 · Red-Team T2)
const SERVER_PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'DNI Argentino (7-8 dígitos)', regex: /\b(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})\b/ },
  { name: 'CUIL / CUIT Argentino', regex: /\b(?:20|23|24|27|30|33|34)-\d{8}-\d\b/ },
  { name: 'Correo electrónico personal', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
  { name: 'Teléfono personal', regex: /\b(?:\+?54\s?(?:9\s?)?)?(?:264|11|261)[\s-]?\d{3,4}[\s-]?\d{4}\b/ },
];

export function detectServerSidePii(payloadObj: Record<string, unknown>): string[] {
  const serialized = JSON.stringify(payloadObj);
  const hits: string[] = [];
  for (const p of SERVER_PII_PATTERNS) {
    if (p.regex.test(serialized)) {
      hits.push(p.name);
    }
  }
  return hits;
}

// Contrato Zod para ingesta append-only en events_raw (EV-005 · PR #19 + Cierre de gap R8 en Issue #30 + Flujo ADR-020)
export const EventIngestSchema = z.object({
  type: z
    .string()
    .trim()
    .min(2, 'El campo type del evento es obligatorio')
    .max(120),
  nodeId: z.string().trim().min(1).max(120).optional().default('nucleo-federado-ar'),
  payload: z.record(z.unknown()).default({}),
  hash: z
    .string()
    .trim()
    .min(8, 'El hash SHA-256 debe tener al menos 8 caracteres')
    .max(128)
    .optional(),
  occurred_at: z.string().datetime().optional(),
  syncLifecycleState: z
    .enum([
      'pendiente_outbox_local',
      'espejado_firestore_sin_verificar',
      'ingestado_events_raw_verificado',
    ])
    .optional()
    .default('ingestado_events_raw_verificado'),
});

// Cache en memoria para garantizar idempotencia determinista en entornos sin PostGIS activo (EV-005 · PR #61/62)
const inMemoryEventsByHash = new Map<
  string,
  { id: string; type: string; hash: string; occurred_at: string; payload: Record<string, unknown> }
>();

// POST /events y POST /api/events — Protegido con requireWriteAuth (Regla R8 · Issue #30),
// guardia Anti-PII en servidor (Ley 25.326 · EV-023 · ADR-027, sin eco del valor sensible)
// e idempotencia determinista SHA-256 (status: "creado" | "duplicado" conservando id y hash originales · EV-005).
router.post(
  '/',
  requireWriteAuth,
  async (req: AuthenticatedWriteRequest, res) => {
    const parsed = EventIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        rule: 'C2 & EV-005',
        error: 'Payload de evento inválido',
        details: parsed.error.errors,
      });
    }

    const { type, nodeId, payload, occurred_at } = parsed.data;

    // Guardia Anti-PII del lado servidor (EV-023 · ADR-027 · #67 · Ley 25.326 — jamás hace eco del valor sensible)
    const piiDetected = detectServerSidePii(payload);
    if (piiDetected.length > 0) {
      return res.status(422).json({
        success: false,
        rule: 'ADR-027 (#67) & ADR-020 (#32) · Ley 25.326 (Server-Side Anti-PII Gate)',
        error: `Ingesta bloqueada en servidor: se detectaron patrones de datos personales (${piiDetected.join(', ')}) en el payload.`,
        patternsBlocked: piiDetected,
      });
    }

    const occurredIso = occurred_at ?? new Date().toISOString();
    const computedHash =
      parsed.data.hash ??
      crypto
        .createHash('sha256')
        .update(JSON.stringify({ type, nodeId, payload }))
        .digest('hex');

    // Verificar primero colisión idempotente en memoria / DB
    const cachedExisting = inMemoryEventsByHash.get(computedHash);
    if (cachedExisting) {
      return res.status(200).json({
        success: true,
        status: 'duplicado',
        idempotentReplay: true,
        id: cachedExisting.id,
        hash: cachedExisting.hash,
        data: cachedExisting,
        rule: 'EV-005 (Idempotencia Append-Only)',
      });
    }

    try {
      const existingInDb = await prisma.events_raw.findUnique?.({
        where: { hash: computedHash },
      });
      if (existingInDb && existingInDb.id) {
        return res.status(200).json({
          success: true,
          status: 'duplicado',
          idempotentReplay: true,
          id: existingInDb.id,
          hash: computedHash,
          data: existingInDb,
          rule: 'EV-005 (Idempotencia Append-Only)',
        });
      }

      const created = await prisma.events_raw.create({
        data: {
          type,
          payload: {
            ...payload,
            nodeId,
            authenticatedActor: req.authenticatedActor?.actorId ?? 'verified-actor',
          },
          hash: computedHash,
          occurred_at: new Date(occurredIso),
        },
      });

      const recordId = created?.id || `evt-${computedHash.slice(0, 12)}`;
      const normalizedCreated = {
        id: recordId,
        type,
        hash: computedHash,
        occurred_at: occurredIso,
        payload: {
          ...payload,
          nodeId,
          authenticatedActor: req.authenticatedActor?.actorId ?? 'verified-actor',
        },
      };
      inMemoryEventsByHash.set(computedHash, normalizedCreated);

      return res.status(201).json({
        success: true,
        status: 'creado',
        idempotentReplay: false,
        id: recordId,
        hash: computedHash,
        data: { ...normalizedCreated, ...created, id: recordId, hash: computedHash },
        actor: req.authenticatedActor,
        ruleVerified: 'R8 & EV-005',
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        const fallbackId =
          inMemoryEventsByHash.get(computedHash)?.id ??
          `evt-${computedHash.slice(0, 12)}`;
        return res.status(200).json({
          success: true,
          status: 'duplicado',
          idempotentReplay: true,
          id: fallbackId,
          hash: computedHash,
          rule: 'EV-005 (Idempotencia Append-Only)',
          message: 'Colisión de hash SHA-256 rechazada idempotentemente conservando el registro original',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error al registrar evento en events_raw',
      });
    }
  },
);

export default router;

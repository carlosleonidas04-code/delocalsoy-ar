import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { PracticaAcreditacionSchema } from '@delocalsoy/contracts';
import { z } from 'zod';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio práctica territorial — LIC-DLUI LIC-R3 (#452, épica #448):
 * Práctica Territorial Acreditada (LIC-03, artefacto A5 de la licenciatura).
 *
 * Opción B ratificada por la DH: la acreditación es un ATRIBUTO sobre la
 * cuenta ciudadana (patrón AR1 #400), NO un rol RBAC ni ADR nuevo. El
 * practicante ES un ciudadano con sello; el mandato es la resolución de
 * la DH (patrón decision_dh — acto institucional, solo admin, como el alta
 * de pedidos VIG-012) y el referente comunitario valida, no decide (D4).
 * La contraparte institucional es la referencia externa nullable (la
 * UNSJ quedó fuera de la práctica, decisión DH).
 *
 * POST /api/practicas/acreditar (admin): atributos practica_* sobre el
 * usuario + sello 'practica.acreditada' en events_raw SIN PII (Ley
 * 25.326/ADR-027): el mandato NUNCA se persiste ni se responde — solo su
 * hash sha256 truncado; el nombre del referente jamás al evento; la
 * referencia externa solo como bandera de presencia. Rollback de los
 * atributos si el sello falla (R4/R15): sin sello no hay práctica
 * acreditada. La re-acreditación renueva el atributo y sella de nuevo
 * (patrón residencia AR1).
 *
 * El sello habilita (DL-7) el canal del practicante en POST /api/reportes:
 * el relevamiento de tramos con evidencia obligatoria bajo el protocolo
 * versionado LIC-R2. El panel docente A6 queda diferido a v2 (alcance
 * declarado en #452).
 */
const router: Router = Router();

// Pseudónimo del practicante (y del admin que acredita): sha256 truncado —
// irreversible, sin PII (mismo patrón que CORE-005 R2).
function seudonimo(usuarioId: string): string {
  return createHash('sha256').update(usuarioId).digest('hex').slice(0, 32);
}

// Sello idempotente en events_raw (fuente de verdad) + referencia al stream
// (transporte ADR-032, fail-open). El payload es NO-PII por construcción.
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

router.post('/acreditar', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof PracticaAcreditacionSchema>;
  try {
    parsed = PracticaAcreditacionSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre los campos que SÍ se
  // persisten (referencia_externa y el nombre del referente). El mandato
  // NO pasa la compuerta porque NUNCA se persiste ni se responde — solo su
  // hash sha256 truncado (la resolución de la DH puede nombrar personas: es
  // un acto administrativo, no un dato del sistema).
  const persistibles = JSON.stringify({
    referencia_externa: parsed.referencia_externa ?? null,
    referente_nombre: parsed.referente.nombre ?? null,
  });
  const pii = detectaPII(persistibles);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  try {
    const usuario = await prisma.usuarios.findUnique({ where: { id: parsed.usuario_id } });
    if (usuario === null) {
      res.status(404).json({ success: false, error: 'usuario no encontrado' });
      return;
    }
    // El practicante ES un ciudadano con sello (Opción B): visitante es
    // solo lectura y moderador|admin son roles de gestión — la práctica
    // acredita la cuenta ciudadana, jamás promueve el rol.
    if (usuario.rol !== 'ciudadano') {
      res.status(400).json({
        success: false,
        error: 'la acreditación de práctica requiere una cuenta ciudadana (el practicante es ciudadano con sello, no un rol)',
      });
      return;
    }

    const acreditadaEn = new Date();
    const mandatoHash = createHash('sha256').update(parsed.mandato).digest('hex').slice(0, 32);
    const practicanteHash = seudonimo(usuario.id);

    await prisma.usuarios.update({
      where: { id: usuario.id },
      data: {
        practica_acreditada: true,
        practica_acreditada_en: acreditadaEn,
        practica_mandato_hash: mandatoHash,
        practica_referencia_externa: parsed.referencia_externa ?? null,
      },
    });

    // Sello SIN PII: el mandato jamás al evento (solo su hash), el nombre
    // del referente jamás (solo su rol), la referencia externa solo como
    // bandera de presencia (patrón sello extendido AMC).
    try {
      await sellarEvento('practica.acreditada', {
        practicante_hash: practicanteHash,
        mandato_hash: mandatoHash,
        referente_rol: parsed.referente.rol,
        referencia_externa_presente: parsed.referencia_externa !== undefined,
        created_by_hash: seudonimo((res.locals.usuario as { id: string }).id),
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay práctica acreditada — los
      // atributos vuelven al estado previo (incluido null, primera vez).
      await prisma.usuarios
        .update({
          where: { id: usuario.id },
          data: {
            practica_acreditada: usuario.practica_acreditada,
            practica_acreditada_en: usuario.practica_acreditada_en,
            practica_mandato_hash: usuario.practica_mandato_hash,
            practica_referencia_externa: usuario.practica_referencia_externa,
          },
        })
        .catch(() => undefined);
      console.error('[practicas] sellar acreditación:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la acreditación' });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        usuario_id: usuario.id,
        practica_acreditada: true,
        practica_acreditada_en: acreditadaEn.toISOString(),
        referencia_externa_presente: parsed.referencia_externa !== undefined,
      },
    });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[practicas] acreditar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al acreditar la práctica' });
  }
});

export default router;

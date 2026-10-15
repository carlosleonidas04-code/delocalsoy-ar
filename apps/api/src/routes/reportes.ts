import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { ReporteAltaSchema } from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt } from '../lib/auth.js';

/**
 * Dominio reportes — CORE-005 R2 (#206): escritura ciudadana de reportes.
 *
 * Flujo: ciudadano autenticado reporta (POST, estado 'received' del
 * ReporteEstadoSchema de R1) → moderación transita con justificación
 * pública (R3, ADR-038) → historial derivado de los sellos (R4). La
 * lectura pública ya vive en GET /api/nodos/:key/reportes (CORE-003 R1).
 *
 * Pseudonimización (Ley 25.326, ADR-027): el autor nunca queda identificado —
 * created_by_hash = sha256(usuario_id) truncado. La descripción pasa el
 * anti-PII compartido ANTES de persistir (ADR-020 cond. 1, mismo criterio
 * que el resto de la escritura ciudadana).
 *
 * Sello en events_raw (R4/R15): toda escritura queda acreditada en la fuente
 * de verdad con un evento 'reporte.recibido' sin PII. Si el sello falla, la
 * escritura se revierte — nunca un reporte persistido sin su evento.
 *
 * Idempotencia por hash único (patrón activos/fichas): el mismo ciudadano
 * reintentando el mismo reporte (nodo + categoría + descripción + punto)
 * recibe 200 con el reporte ya existente — sin sello nuevo, sin duplicar.
 */
const router: Router = Router();

// Pseudónimo del autor: sha256(usuario_id) truncado — irreversible, sin PII.
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

// POST /api/reportes — alta ciudadana (requireJwt): todo usuario con sesión
// puede reportar; el reporte nace 'received', nunca un estado resuelto.
router.post('/', requireJwt, async (req: Request, res: Response) => {
  let parsed: z.infer<typeof ReporteAltaSchema>;
  try {
    parsed = ReporteAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre el contenido de autoría
  // humana ANTES de persistir; rechazo genérico, sin eco del valor.
  const contenido = JSON.stringify({
    categoria: parsed.categoria,
    descripcion: parsed.descripcion,
  });
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);

  // Idempotencia por hash único: mismo ciudadano + mismo reporte → una sola
  // fila (patrón activos/fichas). El hash nunca contiene PII (sha256).
  const hash = createHash('sha256')
    .update(
      usuario.id + '|' + parsed.nodo_key + '|' + parsed.categoria + '|' +
      parsed.descripcion + '|' + parsed.lat + '|' + parsed.lng
    )
    .digest('hex');

  try {
    // El nodo declarado debe existir (404) y la categoría pertenecer a su
    // vocabulario real (400) — el contexto territorial no se acepta por
    // confianza (tabla categorias del CORE-003, no un enum libre).
    const nodo = await prisma.nodos.findFirst({ where: { key: parsed.nodo_key } });
    if (nodo === null) {
      res.status(404).json({ success: false, error: 'Nodo no encontrado' });
      return;
    }
    const categoria = await prisma.categorias.findFirst({
      where: { code: parsed.categoria, nodo_id: nodo.id },
    });
    if (categoria === null) {
      res.status(400).json({ success: false, error: 'categoría inexistente en el vocabulario del nodo' });
      return;
    }

    const reporte = await prisma.reportes.create({
      data: {
        nodo_id: nodo.id,
        categoria: parsed.categoria,
        descripcion: parsed.descripcion,
        estado: 'received',
        lat: parsed.lat,
        lng: parsed.lng,
        is_synthetic: false, // el reporte ciudadano es registro comunitario real
        hash,
        created_by_hash: autor,
      },
    });

    // Sello del sistema: 'reporte.recibido' sin PII — el payload lleva ids y
    // estados; el texto del ciudadano vive solo en la tabla reportes.
    try {
      await sellarEvento('reporte.recibido', {
        reporte_id: reporte.id,
        nodo_key: parsed.nodo_key,
        categoria: parsed.categoria,
        estado: reporte.estado,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.reportes.delete({ where: { id: reporte.id } }).catch(() => undefined);
      console.error('[reportes] sellar alta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el reporte' });
      return;
    }

    res.status(201).json({ success: true, data: reporte });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Reintento idempotente del mismo ciudadano: 200 con el reporte ya
      // existente — sin sello nuevo (R4: una escritura, un evento).
      const existente = await prisma.reportes.findUnique({ where: { hash } });
      if (existente !== null) {
        res.status(200).json({ success: true, data: existente, idempotente: true });
        return;
      }
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[reportes] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el reporte' });
  }
});

export default router;

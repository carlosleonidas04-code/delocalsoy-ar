import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { PatrimonioCustodiaSchema, PatrimonioObservacionAltaSchema } from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio patrimonio protegido — NODO-VIG VIG-004 (NVIG-R6 #173, épica #167).
 *
 * "Patrimonio visible sin exposición": la ficha patrimonial pública (GET)
 * publica la declaratoria, el nivel de protección, el estado de conservación,
 * el punto público de acceso y las reglas — NUNCA el campo `sensible`
 * (geometría/datos internos de custodia, ADR-036): de él solo sale su estado
 * honesto `sensible_status` ('sin_relevamiento' = R15: no existe coordenada
 * precisa en nuestras fuentes).
 *
 * Decisión DH ratificada 2026-10-14 (traza #173 comment 6159546907): la ficha
 * pública se publica TAMBIÉN para activos `restricted` — la declaratoria es
 * registro público; lo restringido es la geometría interna. `restricted`
 * sigue excluido del mapa (GET /api/activos, ADR-036) y la ficha omite el
 * punto propio del activo cuando su visibilidad es restricted.
 *
 * Custodia (PATCH, moderador|admin): administra la ficha y la visibilidad del
 * activo. Sello 'patrimonio.custodiado' en events_raw con rollback si falla
 * (patrón activos): sin evento no hay custodia acreditada.
 */
const router: Router = Router();

// Pseudónimo del custodio: sha256(usuario_id) truncado — irreversible, sin PII.
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

// Campos custodiales de una ficha (sin ids ni timestamps) — para upsert y rollback.
function camposCustodia(f: {
  proteccion_nivel: string; proteccion_norma: string; conservacion_estado: string | null;
  acceso_lat: number | null; acceso_lng: number | null; reglas_acceso: object;
  sensible: object | null; sensible_status: string; sensible_nota: string | null;
}) {
  return {
    proteccion_nivel: f.proteccion_nivel,
    proteccion_norma: f.proteccion_norma,
    conservacion_estado: f.conservacion_estado,
    acceso_lat: f.acceso_lat,
    acceso_lng: f.acceso_lng,
    reglas_acceso: f.reglas_acceso,
    sensible: f.sensible,
    sensible_status: f.sensible_status,
    sensible_nota: f.sensible_nota,
  };
}

// GET /api/patrimonio/:activoId — ficha patrimonial pública (anónima).
router.get('/:activoId', async (req: Request, res: Response) => {
  try {
    const activo = await prisma.activos.findUnique({ where: { id: req.params.activoId } });
    if (activo === null) {
      res.status(404).json({ success: false, error: 'activo no encontrado' });
      return;
    }
    const ficha = await prisma.activos_patrimonio.findUnique({ where: { activo_id: activo.id } });
    if (ficha === null) {
      res.status(404).json({ success: false, error: 'el activo no tiene ficha patrimonial' });
      return;
    }
    // La respuesta pública NUNCA contiene `sensible` ni `sensible_nota`
    // (ADR-036: la nota de custodia es para gestores) ni el punto
    // propio del activo cuando su visibilidad es restricted.
    res.json({
      success: true,
      data: {
        activo_id: activo.id,
        titulo: activo.titulo,
        tipo: activo.tipo,
        estado: activo.estado,
        nodo_key: activo.nodo_key,
        subnodo_key: activo.subnodo_key,
        ...(activo.visibilidad !== 'restricted' ? { lat: activo.lat, lng: activo.lng } : {}),
        visibilidad: activo.visibilidad,
        proteccion_nivel: ficha.proteccion_nivel,
        proteccion_norma: ficha.proteccion_norma,
        conservacion_estado: ficha.conservacion_estado,
        acceso_lat: ficha.acceso_lat,
        acceso_lng: ficha.acceso_lng,
        reglas_acceso: ficha.reglas_acceso,
        sensible_status: ficha.sensible_status,
      },
    });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor.
    console.error('[patrimonio] ficha:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener la ficha patrimonial' });
  }
});

// PATCH /api/patrimonio/:activoId — custodia (moderador|admin).
router.patch('/:activoId', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const id = req.params.activoId;

  let parsed: z.infer<typeof PatrimonioCustodiaSchema>;
  try {
    parsed = PatrimonioCustodiaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre TODO texto de la custodia,
  // incluido el contenido de `sensible` — la custodia no es un refugio de PII.
  const contenido = JSON.stringify({
    proteccion_norma: parsed.proteccion_norma ?? null,
    conservacion_estado: parsed.conservacion_estado ?? null,
    sensible_nota: parsed.sensible_nota ?? null,
    reglas_acceso: parsed.reglas_acceso ?? null,
    sensible: parsed.sensible ?? null,
  });
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: `payload rechazado: contiene datos personales identificables (${pii}) — ADR-020 cond. 1, Ley 25.326`,
    });
    return;
  }

  try {
    const activo = await prisma.activos.findUnique({ where: { id } });
    if (activo === null) {
      res.status(404).json({ success: false, error: 'activo no encontrado' });
      return;
    }
    const previa = await prisma.activos_patrimonio.findUnique({ where: { activo_id: id } });

    const base = previa !== null
      ? camposCustodia(previa as never)
      : {
          proteccion_nivel: 'sin_declaratoria',
          proteccion_norma: '',
          conservacion_estado: null,
          acceso_lat: null,
          acceso_lng: null,
          reglas_acceso: [] as object[],
          sensible: null,
          sensible_status: 'sin_relevamiento',
          sensible_nota: null,
        };
    const datos = {
      proteccion_nivel: parsed.proteccion_nivel ?? base.proteccion_nivel,
      proteccion_norma: parsed.proteccion_norma ?? base.proteccion_norma,
      conservacion_estado: parsed.conservacion_estado ?? base.conservacion_estado,
      acceso_lat: parsed.acceso_lat ?? base.acceso_lat,
      acceso_lng: parsed.acceso_lng ?? base.acceso_lng,
      reglas_acceso: parsed.reglas_acceso ?? base.reglas_acceso,
      sensible: parsed.sensible ?? base.sensible,
      sensible_status: parsed.sensible_status ?? base.sensible_status,
      sensible_nota: parsed.sensible_nota ?? base.sensible_nota,
    };

    const ficha = await prisma.activos_patrimonio.upsert({
      where: { activo_id: id },
      create: { activo_id: id, ...datos },
      update: datos,
    });

    if (parsed.visibilidad !== undefined && parsed.visibilidad !== activo.visibilidad) {
      await prisma.activos.update({ where: { id }, data: { visibilidad: parsed.visibilidad } });
    }

    const custodioHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('patrimonio.custodiado', {
        activo_id: id,
        ficha_id: ficha.id,
        proteccion_nivel: ficha.proteccion_nivel,
        sensible_status: ficha.sensible_status,
        visibilidad: parsed.visibilidad ?? activo.visibilidad,
        custodio_hash: custodioHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay custodia acreditada.
      if (previa === null) {
        await prisma.activos_patrimonio.delete({ where: { activo_id: id } }).catch(() => undefined);
      } else {
        await prisma.activos_patrimonio
          .update({ where: { activo_id: id }, data: camposCustodia(previa as never) })
          .catch(() => undefined);
      }
      if (parsed.visibilidad !== undefined && parsed.visibilidad !== activo.visibilidad) {
        await prisma.activos.update({ where: { id }, data: { visibilidad: activo.visibilidad } }).catch(() => undefined);
      }
      console.error('[patrimonio] sellar custodia:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la custodia' });
      return;
    }

    res.json({
      success: true,
      data: { ficha_id: ficha.id, activo_id: id, visibilidad: parsed.visibilidad ?? activo.visibilidad },
    });
  } catch (err) {
    console.error('[patrimonio] custodia:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al aplicar la custodia' });
  }
});

// ─── VIG-009 R1 (#241, épica #239): observaciones de estado patrimonial ───

// POST /api/patrimonio/:activoId/observaciones — testimonio ciudadano append-only.
// La observación JAMÁS es un diagnóstico (R15): el estado de conservación global
// de la ficha no cambia por observaciones — solo un informe técnico oficial lo
// acredita. Sin sello no hay observación acreditada (patrón custodia): si el
// evento falla, la fila se revierte.
router.post('/:activoId/observaciones', requireJwt, async (req: Request, res: Response) => {
  const id = req.params.activoId;

  let parsed: z.infer<typeof PatrimonioObservacionAltaSchema>;
  try {
    parsed = PatrimonioObservacionAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre la nota y la descripción de la
  // evidencia — la observación es un testimonio del EDIFICIO, nunca de personas.
  const contenido = (parsed.nota ?? '') + ' ' + parsed.evidencia.descripcion;
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  try {
    const activo = await prisma.activos.findUnique({ where: { id } });
    if (activo === null) {
      res.status(404).json({ success: false, error: 'activo no encontrado' });
      return;
    }
    // R1: observaciones SOLO sobre activos con ficha patrimonial (VIG-004).
    const ficha = await prisma.activos_patrimonio.findUnique({ where: { activo_id: id } });
    if (ficha === null) {
      res.status(404).json({ success: false, error: 'el activo no tiene ficha patrimonial' });
      return;
    }

    const autor = seudonimo((res.locals.usuario as { id: string }).id);
    const hash = createHash('sha256')
      .update([autor, id, parsed.fecha_observacion, JSON.stringify(parsed.checklist), parsed.nota ?? ''].join('|'))
      .digest('hex');

    const existente = await prisma.patrimonio_observaciones.findUnique({ where: { hash } });
    if (existente !== null) {
      res.json({ success: true, data: { observacion_id: existente.id, activo_id: id, duplicada: true } });
      return;
    }

    const observacion = await prisma.patrimonio_observaciones.create({
      data: {
        activo_id: id,
        fecha_observacion: parsed.fecha_observacion,
        checklist: parsed.checklist,
        nota: parsed.nota ?? null,
        evidencia: parsed.evidencia,
        created_by_hash: autor,
        hash,
      },
    });

    try {
      await sellarEvento('patrimonio.observado', {
        activo_id: id,
        observacion_id: observacion.id,
        fecha_observacion: parsed.fecha_observacion,
        checklist: parsed.checklist,
        observador_hash: autor,
      });
    } catch (err) {
      // Sin sello no hay observación acreditada: rollback de la fila (patrón custodia).
      await prisma.patrimonio_observaciones.delete({ where: { id: observacion.id } }).catch(() => undefined);
      console.error('[patrimonio] sellar observacion:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la observación' });
      return;
    }

    res.status(201).json({
      success: true,
      data: { observacion_id: observacion.id, activo_id: id, duplicada: false },
    });
  } catch (err) {
    console.error('[patrimonio] observacion:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al registrar la observación' });
  }
});

// Filas tipadas de las lecturas: el cliente prisma se exporta `any` (patrón
// mock de pruebas en lib/prisma), así que la forma de la fila se declara
// explícita para que el callback de map quede contextualmente tipado
// (mismo patrón que reportes.ts/fuentes.ts — fix TS7006 del PR #151).
type ObservacionRow = {
  id: string;
  activo_id: string;
  fecha_observacion: Date;
  checklist: object;
  nota: string | null;
  evidencia: object;
  created_by_hash: string;
  created_at: Date;
};

// GET /api/patrimonio/:activoId/observaciones — bandeja pública append-only:
// qué se observó, cuándo y con qué evidencia. El estado global de conservación
// se declara SIEMPRE como no verificado aquí — sin informe técnico oficial no
// existe estado verificado (R15, VIG-009 R1).
router.get('/:activoId/observaciones', async (req: Request, res: Response) => {
  try {
    const activo = await prisma.activos.findUnique({ where: { id: req.params.activoId } });
    if (activo === null) {
      res.status(404).json({ success: false, error: 'activo no encontrado' });
      return;
    }
    const observaciones = (await prisma.patrimonio_observaciones.findMany({
      where: { activo_id: activo.id },
      orderBy: { created_at: 'asc' },
      take: 100,
    })) as ObservacionRow[];
    res.json({
      success: true,
      data: observaciones.map((o) => ({
        id: o.id,
        activo_id: o.activo_id,
        fecha_observacion: o.fecha_observacion,
        checklist: o.checklist,
        nota: o.nota,
        evidencia: o.evidencia,
        created_by_hash: o.created_by_hash,
        created_at: o.created_at,
      })),
      count: observaciones.length,
      estado_conservacion_global: null,
      estado_conservacion_nota: 'estado global no verificado: requiere informe técnico oficial (R15, VIG-009 R1)',
    });
  } catch (err) {
    console.error('[patrimonio] observaciones:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener las observaciones' });
  }
});

export default router;

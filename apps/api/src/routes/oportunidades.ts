import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  OportunidadAltaSchema,
  OportunidadEstadoCambioSchema,
  OportunidadEstadoPublicoFiltroSchema,
  OportunidadTipoSchema,
  SanJuanNodeSlugSchema,
} from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio oportunidades — NODO-CAPITAL NCAP-R6 (#158): Banco de Potencialidades
 * (Bloque 9 del documento de la DH). Capa de inteligencia territorial
 * participativa: la comunidad registra capacidades, recursos, demandas, vacíos
 * y vínculos; la moderación los recorre por el ciclo de vida. El Banco NO es
 * una lista de deseos ni un CRM — cada oportunidad exige evidencia y estado.
 *
 * Contexto territorial por nodo_key + subnodo_key opcional (provisional,
 * NCAP-R2 #154) — SIN geometría propia: la oportunidad se acredita por
 * territorio declarado, no por un punto inventado (criterio #149/#158).
 *
 * Ciclo de vida (matriz de transiciones): detected → under_review → validated
 * → prioritized → in_development → active → implemented, con paused/discarded/
 * archived laterales. 'discarded' nunca se publica.
 *
 * Pseudonimización (Ley 25.326, ADR-027) y anti-PII (ADR-020 cond. 1):
 * mismo criterio que activos/fichas. Sellos oportunidad.propuesta y
 * oportunidad.estado_cambiado en events_raw (R4/R15) con rollback —
 * nunca un estado persistido sin su evento.
 */
const router: Router = Router();

// Matriz de transiciones del ciclo de vida (Bloque 9): la moderación solo
// puede avanzar por el camino declarado — sin saltos ni regresiones libres.
const TRANSICIONES: Record<string, readonly string[]> = {
  detected: ['under_review', 'discarded'],
  under_review: ['validated', 'discarded'],
  validated: ['prioritized', 'paused', 'discarded'],
  prioritized: ['in_development', 'paused', 'discarded'],
  in_development: ['active', 'paused', 'discarded'],
  active: ['implemented', 'paused', 'discarded'],
  implemented: ['archived'],
  paused: ['prioritized', 'in_development', 'discarded'],
  discarded: ['archived'],
  archived: [],
};

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

// Filas tipadas: el cliente prisma se exporta `any` (patrón mock de pruebas
// en lib/prisma), así que la forma de las filas se declara explícita para que
// la lectura siga chequeada en tsc.
type OportunidadRow = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  estado: string;
  nodo_key: string;
  subnodo_key: string | null;
  evidencia: Record<string, unknown>;
  actores: Array<Record<string, unknown>>;
  tags: Array<string>;
  created_by_hash: string;
  hash: string;
  created_at: Date;
  updated_at: Date;
};

// POST /api/oportunidades — registro ciudadano autenticado (requireJwt):
// nace 'detected' con evidencia obligatoria (Bloque 9: sin evidencia no hay
// oportunidad, solo una señal).
router.post('/', requireJwt, async (req: Request, res: Response) => {
  let parsed: z.infer<typeof OportunidadAltaSchema>;
  try {
    parsed = OportunidadAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre TODO el texto de autoría
  // humana (título, descripción, evidencia, actores, tags) ANTES de persistir;
  // rechazo genérico, sin eco del valor.
  const pii = detectaPII(JSON.stringify({
    titulo: parsed.titulo,
    descripcion: parsed.descripcion,
    evidencia: parsed.evidencia,
    actores: parsed.actores,
    tags: parsed.tags,
  }));
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);
  // Idempotencia (R6): mismo ciudadano + tipo + título + descripción +
  // territorio = una sola oportunidad. El hash único es la compuerta.
  const hash = createHash('sha256')
    .update(usuario.id + '|' + parsed.tipo + '|' + parsed.titulo + '|' + parsed.descripcion + '|' + parsed.nodo_key + '|' + (parsed.subnodo_key ?? ''))
    .digest('hex');

  try {
    const existente = await prisma.oportunidades.findUnique({ where: { hash } });
    if (existente) {
      res.status(200).json({ success: true, data: existente, idempotente: true });
      return;
    }

    const oportunidad = await prisma.oportunidades.create({
      data: {
        tipo: parsed.tipo,
        titulo: parsed.titulo,
        descripcion: parsed.descripcion,
        estado: 'detected',
        nodo_key: parsed.nodo_key,
        subnodo_key: parsed.subnodo_key ?? null,
        evidencia: parsed.evidencia as object,
        actores: (parsed.actores ?? []) as object,
        tags: (parsed.tags ?? []) as object,
        created_by_hash: autor,
        hash,
      },
    });

    // Sello del sistema: 'oportunidad.propuesta' sin PII — el payload lleva
    // ids, tipo y estado; el texto del ciudadano vive solo en la oportunidad.
    try {
      await sellarEvento('oportunidad.propuesta', {
        oportunidad_id: oportunidad.id,
        tipo: oportunidad.tipo,
        nodo_key: oportunidad.nodo_key,
        subnodo_key: oportunidad.subnodo_key,
        estado: oportunidad.estado,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.oportunidades.delete({ where: { id: oportunidad.id } }).catch(() => undefined);
      console.error('[oportunidades] sellar propuesta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la oportunidad' });
      return;
    }

    res.status(201).json({ success: true, data: oportunidad });
  } catch (err) {
    // Carrera de idempotencia: otro request concurrente creó la misma
    // oportunidad entre el findUnique y el create (P2002) — responder idempotente.
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      const existente = await prisma.oportunidades.findUnique({ where: { hash } });
      if (existente) {
        res.status(200).json({ success: true, data: existente, idempotente: true });
        return;
      }
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[oportunidades] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear la oportunidad' });
  }
});

// GET /api/oportunidades — lectura pública y anónima. Filtros opcionales:
// ?estado= (nunca admite 'discarded' — nunca se publica), ?nodo=, ?tipo=,
// ?subnodo=. Sin recorte espacial: la oportunidad no tiene geometría propia.
router.get('/', async (req: Request, res: Response) => {
  try {
    const estadoCrudo = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const nodoCrudo = typeof req.query.nodo === 'string' ? req.query.nodo : undefined;
    const tipoCrudo = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;
    const subnodoCrudo = typeof req.query.subnodo === 'string' ? req.query.subnodo : undefined;

    let estado: z.infer<typeof OportunidadEstadoPublicoFiltroSchema> | undefined;
    if (estadoCrudo !== undefined) {
      const parsedEstado = OportunidadEstadoPublicoFiltroSchema.safeParse(estadoCrudo);
      if (!parsedEstado.success) {
        res.status(400).json({ success: false, error: 'estado inválido (discarded no es publicable)', details: parsedEstado.error.errors });
        return;
      }
      estado = parsedEstado.data;
    }

    let nodo: z.infer<typeof SanJuanNodeSlugSchema> | undefined;
    if (nodoCrudo !== undefined) {
      const parsedNodo = SanJuanNodeSlugSchema.safeParse(nodoCrudo);
      if (!parsedNodo.success) {
        res.status(400).json({ success: false, error: 'nodo inválido', details: parsedNodo.error.errors });
        return;
      }
      nodo = parsedNodo.data;
    }

    let tipo: z.infer<typeof OportunidadTipoSchema> | undefined;
    if (tipoCrudo !== undefined) {
      const parsedTipo = OportunidadTipoSchema.safeParse(tipoCrudo);
      if (!parsedTipo.success) {
        res.status(400).json({ success: false, error: 'tipo inválido', details: parsedTipo.error.errors });
        return;
      }
      tipo = parsedTipo.data;
    }

    if (subnodoCrudo !== undefined && subnodoCrudo.length > 60) {
      res.status(400).json({ success: false, error: 'subnodo inválido' });
      return;
    }

    const oportunidades = (await prisma.oportunidades.findMany({
      where: {
        estado: estado !== undefined ? estado : { not: 'discarded' },
        ...(nodo !== undefined ? { nodo_key: nodo } : {}),
        ...(tipo !== undefined ? { tipo } : {}),
        ...(subnodoCrudo !== undefined ? { subnodo_key: subnodoCrudo } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    })) as OportunidadRow[];

    res.json({ success: true, data: oportunidades, count: oportunidades.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[oportunidades] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener oportunidades' });
  }
});

// GET /api/oportunidades/:id — ficha pública anónima. 'discarded' no existe
// para la lectura pública (honesto, R15 — sin exponer lo descartado).
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const oportunidad = await prisma.oportunidades.findUnique({ where: { id: req.params.id } });
    if (!oportunidad || oportunidad.estado === 'discarded') {
      res.status(404).json({ success: false, error: 'oportunidad no encontrada' });
      return;
    }
    res.json({ success: true, data: oportunidad });
  } catch (err) {
    console.error('[oportunidades] detalle:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener la oportunidad' });
  }
});

// PATCH /api/oportunidades/:id/estado — moderación (R6): solo moderador|admin,
// respetando la matriz de transiciones del ciclo de vida (sin saltos).
router.patch('/:id/estado', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const id = req.params.id;

  let parsed: z.infer<typeof OportunidadEstadoCambioSchema>;
  try {
    parsed = OportunidadEstadoCambioSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII sobre el motivo (ADR-020 cond. 1): mismo criterio que la ingesta.
  if (parsed.motivo != null) {
    const pii = detectaPII(parsed.motivo);
    if (pii) {
      res.status(400).json({
        error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
      });
      return;
    }
  }

  try {
    const existente = await prisma.oportunidades.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ success: false, error: 'oportunidad no encontrada' });
      return;
    }
    if (existente.estado === parsed.estado) {
      res.status(409).json({ success: false, error: "la oportunidad ya está en estado '" + parsed.estado + "'" });
      return;
    }
    const permitidas = TRANSICIONES[existente.estado] ?? [];
    if (!permitidas.includes(parsed.estado)) {
      res.status(400).json({
        success: false,
        error: "transición inválida: '" + existente.estado + "' → '" + parsed.estado + "' (ciclo de vida Bloque 9)",
      });
      return;
    }

    const actualizada = await prisma.oportunidades.update({
      where: { id },
      data: { estado: parsed.estado },
    });

    const moderadorHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('oportunidad.estado_cambiado', {
        oportunidad_id: id,
        estado_anterior: existente.estado,
        estado: parsed.estado,
        motivo: parsed.motivo ?? null,
        moderador_hash: moderadorHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay transición acreditada.
      await prisma.oportunidades
        .update({ where: { id }, data: { estado: existente.estado } })
        .catch(() => undefined);
      console.error('[oportunidades] sellar cambio de estado:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el cambio de estado' });
      return;
    }

    res.json({ success: true, data: actualizada });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[oportunidades] cambiar estado:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al cambiar el estado' });
  }
});

export default router;

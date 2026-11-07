import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  OportunidadAltaSchema,
  OportunidadConexionSchema,
  OportunidadEvidenciaValidacionSchema,
  OportunidadEstadoCambioSchema,
  OportunidadEstadoPublicoFiltroSchema,
  OportunidadListadoQuerySchema,
  OportunidadScoringSchema,
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
 *
 * NCAP-R6-ext (#165): extensiones sobre la base canónica de #160 —
 * paginación con total en header, resumen /stats/resumen, gate de evidencia
 * (validated/active/implemented exigen evidencia corroborated|reviewed),
 * conexiones entre actores con consentimiento explícito (ADR-027), scoring
 * territorial con método (ADR-035) y territorial_context cor_* v0.1 (#156).
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
  scoring: Record<string, unknown> | null;
  territorial_context: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

// NCAP-R6-ext (#165): fila tipada del vínculo entre actores — mismo criterio
// de lectura chequeada que OportunidadRow (el cliente prisma se exporta any).
type ConexionRow = {
  id: string;
  oportunidad_id: string;
  actor_origen: Record<string, unknown>;
  actor_destino: Record<string, unknown>;
  tipo_vinculo: string;
  consentimiento_confirmado: boolean;
  created_by_hash: string;
  hash: string;
  created_at: Date;
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
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
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
        territorial_context: (parsed.territorial_context ?? null) as object | null,
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
        res.status(400).json({ success: false, error: 'estado inválido (discarded no es publicable)', details: parsedEstado.error.issues });
        return;
      }
      estado = parsedEstado.data;
    }

    let nodo: z.infer<typeof SanJuanNodeSlugSchema> | undefined;
    if (nodoCrudo !== undefined) {
      const parsedNodo = SanJuanNodeSlugSchema.safeParse(nodoCrudo);
      if (!parsedNodo.success) {
        res.status(400).json({ success: false, error: 'nodo inválido', details: parsedNodo.error.issues });
        return;
      }
      nodo = parsedNodo.data;
    }

    let tipo: z.infer<typeof OportunidadTipoSchema> | undefined;
    if (tipoCrudo !== undefined) {
      const parsedTipo = OportunidadTipoSchema.safeParse(tipoCrudo);
      if (!parsedTipo.success) {
        res.status(400).json({ success: false, error: 'tipo inválido', details: parsedTipo.error.issues });
        return;
      }
      tipo = parsedTipo.data;
    }

    if (subnodoCrudo !== undefined && subnodoCrudo.length > 60) {
      res.status(400).json({ success: false, error: 'subnodo inválido' });
      return;
    }

    // Paginación (NCAP-R6-ext #165): limit/offset — el body lista, el header
    // cuenta (X-DELocalSoy-Total-Count). Coerce manual (Number) para que un
    // ?limit=abc sea 400 por contrato, no un NaN silencioso.
    const paginacion = OportunidadListadoQuerySchema.safeParse({
      limit: typeof req.query.limit === 'string' && req.query.limit !== '' ? Number(req.query.limit) : undefined,
      offset: typeof req.query.offset === 'string' && req.query.offset !== '' ? Number(req.query.offset) : undefined,
    });
    if (!paginacion.success) {
      res.status(400).json({ success: false, error: 'paginación inválida (limit 1-100, offset ≥ 0)', details: paginacion.error.issues });
      return;
    }
    const { limit, offset } = paginacion.data;

    const where = {
      estado: estado !== undefined ? estado : { not: 'discarded' },
      ...(nodo !== undefined ? { nodo_key: nodo } : {}),
      ...(tipo !== undefined ? { tipo } : {}),
      ...(subnodoCrudo !== undefined ? { subnodo_key: subnodoCrudo } : {}),
    };

    const [oportunidades, total] = await Promise.all([
      prisma.oportunidades.findMany({ where, orderBy: { created_at: 'desc' }, take: limit, skip: offset }),
      prisma.oportunidades.count({ where }),
    ]);
    const filas = oportunidades as OportunidadRow[];

    // NCAP-R6-ext #165: total de la consulta en el header.
    res.setHeader('X-DELocalSoy-Total-Count', String(total));
    res.json({ success: true, data: filas, count: filas.length, total });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[oportunidades] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener oportunidades' });
  }
});

// GET /api/oportunidades/stats/resumen — métricas de resumen del Banco de
// Potencialidades (NCAP-R6-ext #165): totales por estado y por tipo sobre lo
// PUBLICADO ('discarded' nunca entra) + tasa de corroboración de evidencia.
// R5/ADR-035: la tasa es cobertura de registros corroborados sobre el total
// publicado — NUNCA un "estado del territorio".
// ORDEN: debe declararse ANTES de GET /:id o Express la captura como id.
router.get('/stats/resumen', async (req: Request, res: Response) => {
  try {
    const dondePublicado = { estado: { not: 'discarded' } };
    const [porEstadoRows, porTipoRows, total, corroboradas, revisadas] = await Promise.all([
      prisma.oportunidades.groupBy({ by: ['estado'], where: dondePublicado, _count: { _all: true } }),
      prisma.oportunidades.groupBy({ by: ['tipo'], where: dondePublicado, _count: { _all: true } }),
      prisma.oportunidades.count({ where: dondePublicado }),
      prisma.oportunidades.count({ where: { ...dondePublicado, evidencia: { path: ['validationStatus'], equals: 'corroborated' } } }),
      prisma.oportunidades.count({ where: { ...dondePublicado, evidencia: { path: ['validationStatus'], equals: 'reviewed' } } }),
    ]);
    const porEstado: Record<string, number> = {};
    for (const fila of porEstadoRows) porEstado[fila.estado] = fila._count._all;
    const porTipo: Record<string, number> = {};
    for (const fila of porTipoRows) porTipo[fila.tipo] = fila._count._all;
    res.json({
      success: true,
      data: {
        total_publicado: total,
        por_estado: porEstado,
        por_tipo: porTipo,
        evidencia: {
          corroboradas,
          revisadas,
          tasa_corroboracion: total > 0 ? (corroboradas + revisadas) / total : 0,
        },
      },
    });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[oportunidades] resumen:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener el resumen' });
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

// GET /api/oportunidades/:id/conexiones — vínculos públicos entre actores de
// una oportunidad publicada ('discarded' no existe para la lectura pública).
router.get('/:id/conexiones', async (req: Request, res: Response) => {
  try {
    const oportunidad = await prisma.oportunidades.findUnique({ where: { id: req.params.id } });
    if (!oportunidad || oportunidad.estado === 'discarded') {
      res.status(404).json({ success: false, error: 'oportunidad no encontrada' });
      return;
    }
    const conexiones = (await prisma.oportunidad_conexiones.findMany({
      where: { oportunidad_id: req.params.id },
      orderBy: { created_at: 'desc' },
    })) as ConexionRow[];
    res.json({ success: true, data: conexiones, count: conexiones.length });
  } catch (err) {
    console.error('[oportunidades] listar conexiones:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener las conexiones' });
  }
});

// POST /api/oportunidades/:id/conexiones — vínculo oferta/demanda entre
// actores de una oportunidad con consentimiento explícito obligatorio
// (NCAP-R6-ext #165; ADR-027, Ley 25.326: el refine del contrato hace
// imposible default(true) — sin consentimiento no hay vínculo). Sello
// oportunidad.conexion_creada con rollback; idempotencia por hash.
router.post('/:id/conexiones', requireJwt, async (req: Request, res: Response) => {
  const id = req.params.id;

  let parsed: z.infer<typeof OportunidadConexionSchema>;
  try {
    parsed = OportunidadConexionSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII sobre TODO el texto de autoría humana (ADR-020 cond. 1).
  const pii = detectaPII(JSON.stringify(parsed));
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);
  // Idempotencia (R6): mismo ciudadano + oportunidad + actores + tipo = un
  // solo vínculo. El hash único es la compuerta.
  const hash = createHash('sha256')
    .update(id + '|' + parsed.actor_origen.role + '|' + (parsed.actor_origen.name ?? '') + '|' + parsed.actor_destino.role + '|' + (parsed.actor_destino.name ?? '') + '|' + parsed.tipo_vinculo + '|' + usuario.id)
    .digest('hex');

  try {
    const oportunidad = await prisma.oportunidades.findUnique({ where: { id } });
    if (!oportunidad || oportunidad.estado === 'discarded') {
      res.status(404).json({ success: false, error: 'oportunidad no encontrada' });
      return;
    }

    const existente = await prisma.oportunidad_conexiones.findUnique({ where: { hash } });
    if (existente) {
      res.status(200).json({ success: true, data: existente, idempotente: true });
      return;
    }

    const conexion = await prisma.oportunidad_conexiones.create({
      data: {
        oportunidad_id: id,
        actor_origen: parsed.actor_origen as object,
        actor_destino: parsed.actor_destino as object,
        tipo_vinculo: parsed.tipo_vinculo,
        consentimiento_confirmado: true,
        created_by_hash: autor,
        hash,
      },
    });

    try {
      await sellarEvento('oportunidad.conexion_creada', {
        conexion_id: conexion.id,
        oportunidad_id: id,
        tipo_vinculo: parsed.tipo_vinculo,
        consentimiento_confirmado: true,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay vínculo acreditado.
      await prisma.oportunidad_conexiones.delete({ where: { id: conexion.id } }).catch(() => undefined);
      console.error('[oportunidades] sellar conexión:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la conexión' });
      return;
    }

    res.status(201).json({ success: true, data: conexion });
  } catch (err) {
    // Carrera de idempotencia (P2002): responder idempotente.
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      const existente = await prisma.oportunidad_conexiones.findUnique({ where: { hash } });
      if (existente) {
        res.status(200).json({ success: true, data: existente, idempotente: true });
        return;
      }
    }
    console.error('[oportunidades] crear conexión:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear la conexión' });
  }
});

// PATCH /api/oportunidades/:id/evidencia — veredicto de moderación sobre la
// evidencia (NCAP-R6-ext #165): corroborated|reviewed habilitan el gate de
// estados acreditados. 'pending' es el default honesto del alta — el autor
// nunca auto-corrobora (R15). Sello oportunidad.evidencia_validada con
// rollback: sin sello no hay veredicto acreditado.
router.patch('/:id/evidencia', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const id = req.params.id;

  let parsed: z.infer<typeof OportunidadEvidenciaValidacionSchema>;
  try {
    parsed = OportunidadEvidenciaValidacionSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII sobre el motivo (ADR-020 cond. 1): mismo criterio que el alta.
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
    if (!existente || existente.estado === 'discarded') {
      res.status(404).json({ success: false, error: 'oportunidad no encontrada' });
      return;
    }
    const evidenciaPrevia = (existente.evidencia ?? {}) as Record<string, unknown>;
    const evidenciaNueva = { ...evidenciaPrevia, validationStatus: parsed.validationStatus };

    const actualizada = await prisma.oportunidades.update({
      where: { id },
      data: { evidencia: evidenciaNueva },
    });

    const moderadorHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('oportunidad.evidencia_validada', {
        oportunidad_id: id,
        validation_status: parsed.validationStatus,
        motivo: parsed.motivo ?? null,
        moderador_hash: moderadorHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay veredicto acreditado.
      await prisma.oportunidades
        .update({ where: { id }, data: { evidencia: evidenciaPrevia as object } })
        .catch(() => undefined);
      console.error('[oportunidades] sellar validación de evidencia:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la validación de evidencia' });
      return;
    }

    res.json({ success: true, data: actualizada });
  } catch (err) {
    console.error('[oportunidades] validar evidencia:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al validar la evidencia' });
  }
});

// PATCH /api/oportunidades/:id/scoring — interpretación territorial declarada
// por moderación (NCAP-R6-ext #165, ADR-035): niveles cualitativos CON método
// y fuente — nunca un puntaje "del territorio". Sello
// oportunidad.scoring_declarado con rollback.
router.patch('/:id/scoring', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const id = req.params.id;

  let parsed: z.infer<typeof OportunidadScoringSchema>;
  try {
    parsed = OportunidadScoringSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII sobre TODO el payload (ADR-020 cond. 1).
  const pii = detectaPII(JSON.stringify(parsed));
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  try {
    const existente = await prisma.oportunidades.findUnique({ where: { id } });
    if (!existente || existente.estado === 'discarded') {
      res.status(404).json({ success: false, error: 'oportunidad no encontrada' });
      return;
    }
    const scoringPrevio = (existente.scoring ?? null) as Record<string, unknown> | null;

    const actualizada = await prisma.oportunidades.update({
      where: { id },
      data: { scoring: parsed as object },
    });

    const moderadorHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('oportunidad.scoring_declarado', {
        oportunidad_id: id,
        territorial_impact: parsed.territorial_impact,
        feasibility: parsed.feasibility,
        urgency: parsed.urgency,
        moderador_hash: moderadorHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay scoring acreditado.
      await prisma.oportunidades
        .update({ where: { id }, data: { scoring: scoringPrevio } })
        .catch(() => undefined);
      console.error('[oportunidades] sellar scoring:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el scoring' });
      return;
    }

    res.json({ success: true, data: actualizada });
  } catch (err) {
    console.error('[oportunidades] declarar scoring:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al declarar el scoring' });
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
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
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

    // Gate de evidencia (NCAP-R6-ext #165, refuerzo de R15 sobre la matriz):
    // avanzar a un estado acreditado exige evidencia corroborada o revisada
    // por moderación — sin veredicto, el avance es un salto epistémico.
    if (['validated', 'active', 'implemented'].includes(parsed.estado)) {
      const evidencia = (existente.evidencia ?? {}) as Record<string, unknown>;
      const validationStatus = typeof evidencia.validationStatus === 'string' ? evidencia.validationStatus : 'pending';
      if (validationStatus !== 'corroborated' && validationStatus !== 'reviewed') {
        res.status(400).json({
          success: false,
          error:
            "gate de evidencia (Bloque 9): avanzar a '" + parsed.estado +
            "' exige evidencia corroborated|reviewed — la evidencia está '" + validationStatus +
            "'. Validar con PATCH /api/oportunidades/" + id + "/evidencia.",
        });
        return;
      }
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

import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  ActivoAltaSchema,
  ActivoEstadoCambioSchema,
  ActivoEstadoSchema,
  BboxStringSchema,
  SanJuanNodeSlugSchema,
} from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio activos — CORE-004 R5b (#87): escritura ciudadana verificada.
 *
 * Flujo: ciudadano autenticado propone (POST, estado 'propuesto') →
 * moderación decide (PATCH /:id/estado, moderador|admin) → visible en el
 * mapa público (GET anónimo, con recorte espacial bbox sobre PostGIS).
 *
 * Pseudonimización (Ley 25.326, ADR-027): el autor nunca queda identificado —
 * created_by_hash = sha256(usuario_id) truncado. El título/descripción pasan
 * el anti-PII compartido ANTES de persistir (ADR-020 cond. 1, mismo criterio
 * que la ingesta de eventos).
 *
 * Sello en events_raw (R4/R15): toda escritura queda acreditada en la fuente
 * de verdad con un evento 'activo.*' sin PII. Si el sello falla, la escritura
 * se revierte — nunca un estado persistido sin su evento.
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

// POST /api/activos — propuesta ciudadana (requireJwt): todo usuario con
// sesión puede proponer; el activo nace 'propuesto', nunca 'aprobado'.
router.post('/', requireJwt, async (req: Request, res: Response) => {
  let parsed: z.infer<typeof ActivoAltaSchema>;
  try {
    parsed = ActivoAltaSchema.parse(req.body);
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
    tipo: parsed.tipo,
    titulo: parsed.titulo,
    descripcion: parsed.descripcion ?? null,
  });
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: `payload rechazado: contiene datos personales identificables (${pii}) — ADR-020 cond. 1, Ley 25.326`,
    });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);

  try {
    const activo = await prisma.activos.create({
      data: {
        tipo: parsed.tipo,
        titulo: parsed.titulo,
        descripcion: parsed.descripcion ?? undefined,
        estado: 'propuesto',
        nodo_key: parsed.nodo_key,
        lat: parsed.lat,
        lng: parsed.lng,
        created_by_hash: autor,
      },
    });

    // Sello del sistema: 'activo.propuesto' sin PII — el payload lleva ids y
    // estados; el texto del ciudadano vive solo en la tabla activos.
    try {
      await sellarEvento('activo.propuesto', {
        activo_id: activo.id,
        tipo: activo.tipo,
        nodo_key: activo.nodo_key,
        estado: activo.estado,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.activos.delete({ where: { id: activo.id } }).catch(() => undefined);
      console.error('[activos] sellar propuesta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la propuesta' });
      return;
    }

    res.status(201).json({ success: true, data: activo });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[activos] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el activo' });
  }
});

// GET /api/activos — lectura pública y anónima (el mapa se sirve sin sesión).
// Filtros opcionales ?estado= y ?nodo=; ?bbox= recorta con ST_Intersects
// sobre el índice GiST (mismo patrón que /api/territorios).
router.get('/', async (req: Request, res: Response) => {
  try {
    const estadoCrudo = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const nodoCrudo = typeof req.query.nodo === 'string' ? req.query.nodo : undefined;
    const bboxCrudo = typeof req.query.bbox === 'string' ? req.query.bbox : undefined;

    let estado: z.infer<typeof ActivoEstadoSchema> | undefined;
    if (estadoCrudo !== undefined) {
      const parsedEstado = ActivoEstadoSchema.safeParse(estadoCrudo);
      if (!parsedEstado.success) {
        res.status(400).json({ success: false, error: 'estado inválido', details: parsedEstado.error.errors });
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

    if (bboxCrudo !== undefined) {
      const parsedBbox = BboxStringSchema.safeParse(bboxCrudo);
      if (!parsedBbox.success) {
        res.status(400).json({ success: false, error: 'bbox inválido', details: parsedBbox.error.errors });
        return;
      }
      const [minLng, minLat, maxLng, maxLat] = parsedBbox.data.split(',').map(Number);
      const estadoFiltro = estado !== undefined ? Prisma.sql`AND a.estado = ${estado}` : Prisma.empty;
      const nodoFiltro = nodo !== undefined ? Prisma.sql`AND a.nodo_key = ${nodo}` : Prisma.empty;

      const data = await prisma.$queryRaw`
        SELECT a.id, a.tipo, a.titulo, a.descripcion, a.estado, a.nodo_key,
               a.lat, a.lng, a.created_by_hash, a.created_at, a.updated_at,
               ST_AsGeoJSON(a.geom)::json AS geometry
        FROM activos a
        WHERE ST_Intersects(a.geom, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
          ${estadoFiltro} ${nodoFiltro}
        ORDER BY a.created_at DESC
        LIMIT 100`;

      res.json({ success: true, data, count: (data as unknown[]).length });
      return;
    }

    const data = await prisma.activos.findMany({
      where: {
        ...(estado !== undefined ? { estado } : {}),
        ...(nodo !== undefined ? { nodo_key: nodo } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[activos] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener activos' });
  }
});

// PATCH /api/activos/:id/estado — moderación (R5b): solo moderador|admin.
// El ciudadano propone; la comunidad ratifica a través de sus moderadores.
router.patch('/:id/estado', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const id = req.params.id;

  let parsed: z.infer<typeof ActivoEstadoCambioSchema>;
  try {
    parsed = ActivoEstadoCambioSchema.parse(req.body);
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
        error: `payload rechazado: contiene datos personales identificables (${pii}) — ADR-020 cond. 1, Ley 25.326`,
      });
      return;
    }
  }

  try {
    const existente = await prisma.activos.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ success: false, error: 'activo no encontrado' });
      return;
    }
    if (existente.estado === parsed.estado) {
      res.status(409).json({ success: false, error: `el activo ya está en estado '${parsed.estado}'` });
      return;
    }

    const actualizado = await prisma.activos.update({
      where: { id },
      data: { estado: parsed.estado },
    });

    const moderadorHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('activo.estado_cambiado', {
        activo_id: id,
        estado: parsed.estado,
        motivo: parsed.motivo ?? null,
        moderador_hash: moderadorHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay transición acreditada.
      await prisma.activos.update({ where: { id }, data: { estado: existente.estado } }).catch(() => undefined);
      console.error('[activos] sellar cambio de estado:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el cambio de estado' });
      return;
    }

    res.json({ success: true, data: actualizado });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[activos] cambiar estado:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al cambiar el estado' });
  }
});

export default router;

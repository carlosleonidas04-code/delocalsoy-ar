import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  BboxStringSchema,
  FichaEstadoPublicoFiltroSchema,
  FichaValoracionAltaSchema,
  FichaValoracionEstadoCambioSchema,
  SanJuanNodeSlugSchema,
} from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio fichas de valoración — NODO-CAU R4 (#149): testimonio comunitario
 * revisable del espacio público (ADR-036).
 *
 * La ficha NO crea geometría propia: se ancla a un feature de la capa
 * public_space del nodo — el espacio ES el feature y su geom acredita la
 * ubicación. Las 7 dimensiones ratificadas describen observables de diseño
 * del ESPACIO, nunca personas ni organizaciones (decisión R9: sin nombres).
 *
 * Flujo: ciudadano autenticado valora (POST, estado 'testimonio') →
 * moderación corrobora o descarta (PATCH /:id/estado, moderador|admin) →
 * lectura pública anónima (GET, con recorte espacial bbox sobre la geometría
 * del espacio ancla). 'descartada' nunca se publica.
 *
 * Pseudonimización (Ley 25.326, ADR-027) y anti-PII (ADR-020 cond. 1):
 * mismo criterio que activos. Sello en events_raw (R4/R15) con rollback —
 * nunca un estado persistido sin su evento.
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

// Estado público derivado (lectura anónima): la ficha corroborada se publica
// como 'validado'; el resto vive como 'testimonio' honesto (ADR-036: el
// testimonio comunitario es dato, con su estado epistémico explícito).
function estadoPublico(estado: string): 'validado' | 'testimonio' {
  return estado === 'corroborada' ? 'validado' : 'testimonio';
}

// Filas tipadas de la lectura pública: el cliente prisma se exporta `any`
// (patrón mock de pruebas en lib/prisma), así que la forma de las filas se
// declara explícita para que la lectura siga chequeada en tsc.
type FichaValoracionRow = {
  id: string;
  nodo_key: string;
  feature_id: string;
  version: string;
  respuestas: Record<string, unknown>;
  estado: string;
  corroboracion: string | null;
  created_by_hash: string;
  hash: string;
  created_at: Date;
  updated_at: Date;
};

type EspacioRow = {
  id: string;
  titulo: string;
  lat: number;
  lng: number;
  is_synthetic: boolean;
  fuente_label: string;
};

// POST /api/fichas-valoracion — ficha de valoración ciudadana (requireJwt):
// nace 'testimonio', anclada a un feature de public_space del nodo declarado.
router.post('/', requireJwt, async (req: Request, res: Response) => {
  let parsed: z.infer<typeof FichaValoracionAltaSchema>;
  try {
    parsed = FichaValoracionAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre TODO el texto de autoría
  // humana ANTES de persistir; rechazo genérico, sin eco del valor.
  const pii = detectaPII(JSON.stringify(parsed.respuestas));
  if (pii) {
    res.status(400).json({
      error: `payload rechazado: contiene datos personales identificables (${pii}) — ADR-020 cond. 1, Ley 25.326`,
    });
    return;
  }

  // Anclaje (R4/#149): el espacio debe existir en la capa public_space del
  // nodo indicado — la ficha no inventa espacios ni geometrías.
  const feature = await prisma.features.findFirst({
    where: {
      id: parsed.feature_id,
      capa: { key: 'public_space', nodo: { key: parsed.nodo_key } },
    },
  });
  if (!feature) {
    res.status(404).json({ success: false, error: 'espacio público no encontrado en el nodo indicado' });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);
  // Idempotencia (R4): mismo ciudadano + espacio + versión + respuestas =
  // una sola ficha. El hash único de fichas_valoracion es la compuerta.
  const hash = createHash('sha256')
    .update(usuario.id + '|' + parsed.feature_id + '|' + parsed.version + '|' + JSON.stringify(parsed.respuestas))
    .digest('hex');

  try {
    const existente = await prisma.fichas_valoracion.findUnique({ where: { hash } });
    if (existente) {
      res.status(200).json({ success: true, data: existente, idempotente: true });
      return;
    }

    const ficha = await prisma.fichas_valoracion.create({
      data: {
        nodo_key: parsed.nodo_key,
        feature_id: parsed.feature_id,
        version: parsed.version,
        respuestas: parsed.respuestas as object,
        estado: 'testimonio',
        created_by_hash: autor,
        hash,
      },
    });

    // Sello del sistema: 'ficha_valoracion.propuesta' sin PII — el payload
    // lleva ids y estados; el texto del ciudadano vive solo en la ficha.
    try {
      await sellarEvento('ficha_valoracion.propuesta', {
        ficha_id: ficha.id,
        nodo_key: ficha.nodo_key,
        feature_id: ficha.feature_id,
        version: ficha.version,
        estado: ficha.estado,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.fichas_valoracion.delete({ where: { id: ficha.id } }).catch(() => undefined);
      console.error('[fichas-valoracion] sellar propuesta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la ficha' });
      return;
    }

    res.status(201).json({ success: true, data: ficha });
  } catch (err) {
    // Carrera de idempotencia: otro request concurrente creó la misma ficha
    // entre el findUnique y el create (P2002) — responder idempotente.
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      const existente = await prisma.fichas_valoracion.findUnique({ where: { hash } });
      if (existente) {
        res.status(200).json({ success: true, data: existente, idempotente: true });
        return;
      }
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[fichas-valoracion] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear la ficha' });
  }
});

// GET /api/fichas-valoracion — lectura pública y anónima: el mapa de fichas
// se sirve sin sesión. Filtros opcionales ?estado= (corroborada|testimonio;
// 'descartada' no es filtrable — nunca se publica), ?nodo=; ?bbox= recorta
// por la geometría del ESPACIO ancla (ST_Intersects sobre el índice GiST).
router.get('/', async (req: Request, res: Response) => {
  try {
    const estadoCrudo = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const nodoCrudo = typeof req.query.nodo === 'string' ? req.query.nodo : undefined;
    const bboxCrudo = typeof req.query.bbox === 'string' ? req.query.bbox : undefined;

    let estado: z.infer<typeof FichaEstadoPublicoFiltroSchema> | undefined;
    if (estadoCrudo !== undefined) {
      const parsedEstado = FichaEstadoPublicoFiltroSchema.safeParse(estadoCrudo);
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
      const estadoFiltro = estado !== undefined ? Prisma.sql`AND f.estado = ${estado}` : Prisma.empty;
      const nodoFiltro = nodo !== undefined ? Prisma.sql`AND f.nodo_key = ${nodo}` : Prisma.empty;

      const rows = await prisma.$queryRaw`
        SELECT f.id, f.nodo_key, f.feature_id, f.version, f.respuestas, f.estado,
               f.corroboracion, f.created_by_hash, f.created_at, f.updated_at,
               feat.titulo AS feature_titulo, feat.lat AS feature_lat,
               feat.lng AS feature_lng, feat.is_synthetic AS feature_is_synthetic,
               feat.fuente_label AS feature_fuente_label,
               ST_AsGeoJSON(feat.geom)::json AS geometry
        FROM fichas_valoracion f
        JOIN features feat ON feat.id = f.feature_id
        JOIN capas c ON c.id = feat.capa_id
        WHERE c.key = 'public_space'
          AND f.estado <> 'descartada'
          AND ST_Intersects(feat.geom, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
          ${estadoFiltro} ${nodoFiltro}
        ORDER BY f.created_at DESC
        LIMIT 100`;

      const data = (rows as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        estado_publico: estadoPublico(String(row.estado)),
      }));

      res.json({ success: true, data, count: data.length });
      return;
    }

    const fichas = (await prisma.fichas_valoracion.findMany({
      where: {
        estado: estado !== undefined ? estado : { not: 'descartada' },
        ...(nodo !== undefined ? { nodo_key: nodo } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    })) as FichaValoracionRow[];

    // Espacio ancla: sin bbox no hay recorte espacial, pero la lectura sigue
    // acreditando el feature (título/ubicación/fuente) — la ficha nunca se
    // publica sin su espacio.
    const featureIds = [...new Set(fichas.map((f) => f.feature_id))];
    const espacios = (
      featureIds.length > 0 ? await prisma.features.findMany({ where: { id: { in: featureIds } } }) : []
    ) as EspacioRow[];
    const espacioPorId = new Map<string, EspacioRow>();
    for (const espacio of espacios) {
      espacioPorId.set(espacio.id, espacio);
    }

    const data = fichas.map((f) => {
      const espacio = espacioPorId.get(f.feature_id);
      return {
        ...f,
        feature_titulo: espacio?.titulo ?? null,
        feature_lat: espacio?.lat ?? null,
        feature_lng: espacio?.lng ?? null,
        feature_is_synthetic: espacio?.is_synthetic ?? null,
        feature_fuente_label: espacio?.fuente_label ?? null,
        estado_publico: estadoPublico(f.estado),
      };
    });

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[fichas-valoracion] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener fichas' });
  }
});

// PATCH /api/fichas-valoracion/:id/estado — moderación (R4): solo moderador|admin.
// Corroborar exige declarar quién corrobora (individual | taller_comunitario):
// el taller comunitario es la instancia de validación colectiva ratificada (#149).
router.patch('/:id/estado', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const id = req.params.id;

  let parsed: z.infer<typeof FichaValoracionEstadoCambioSchema>;
  try {
    parsed = FichaValoracionEstadoCambioSchema.parse(req.body);
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
    const existente = await prisma.fichas_valoracion.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ success: false, error: 'ficha no encontrada' });
      return;
    }
    if (existente.estado === parsed.estado) {
      res.status(409).json({ success: false, error: `la ficha ya está en estado '${parsed.estado}'` });
      return;
    }

    const corroboracion = parsed.estado === 'corroborada' ? parsed.corroboracion : null;
    const actualizada = await prisma.fichas_valoracion.update({
      where: { id },
      data: { estado: parsed.estado, corroboracion },
    });

    const moderadorHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('ficha_valoracion.estado_cambiado', {
        ficha_id: id,
        estado: parsed.estado,
        corroboracion,
        motivo: parsed.motivo ?? null,
        moderador_hash: moderadorHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay transición acreditada.
      await prisma.fichas_valoracion
        .update({ where: { id }, data: { estado: existente.estado, corroboracion: existente.corroboracion } })
        .catch(() => undefined);
      console.error('[fichas-valoracion] sellar cambio de estado:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el cambio de estado' });
      return;
    }

    res.json({ success: true, data: actualizada });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[fichas-valoracion] cambiar estado:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al cambiar el estado' });
  }
});

export default router;

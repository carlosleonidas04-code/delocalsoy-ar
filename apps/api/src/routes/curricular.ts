import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  CursoAltaSchema,
  CursoVocabularioSchema,
  MatrizCurricularResponseSchema,
  RutasCurricularesResponseSchema,
} from '@delocalsoy/contracts';
import { requireJwt, requireRole } from '../lib/auth.js';
import { detectaPII } from '../lib/anti-pii.js';

/**
 * Dominio curricular — MVP-1 «Atlas Territorial» (RFC-020/021, #532, épica
 * OBJE-CAMPUS #531).
 *
 * ADR-082 (DH 2026-11-15): la matriz curricular es CATÁLOGO con procedencia
 * por ingesta (NC-EV-09 — el dato no viaja suelto), NO un sistema de gestión
 * académica: sin inscripción, sin notas, sin persona (Ley 25.326/ADR-027).
 * Única fuente autorizada v1: corpus DLUI-IT (ECO-5). ADR-083: trazabilidad
 * bidireccional curso↔competencia; tracks, perfiles y rutas son vistas
 * declaradas, jamás cálculos. Anti-ranking: cobertura «X de N» honesta
 * (DL-5), jamás ranking de cursos (R5/ADR-036).
 *
 * GET /api/curricular — matriz de trazabilidad curricular (lectura pública
 * anónima): cursos + competencias + vínculos con peso declarado (texto con
 * método, ADR-035) y cobertura «X de N» que nace «0 de 0» (R15 — la tabla
 * nace VACÍA). GET /api/curricular/rutas — tracks, perfiles y learning
 * paths declarados. POST /api/curricular/cursos — alta curada SOLO admin
 * (R15 estricta, patrón salud/convenios): la ingesta debe existir y su
 * fuente_key coincidir con la declarada (404/400), el track debe existir en
 * el catálogo (400 — el catálogo no crea cursos huérfanos), anti-PII sobre
 * el texto libre ANTES de persistir (ADR-020 cond. 1), idempotencia por
 * hash sha256(key|fuente|fecha_corte) → 409, sello
 * `curricular.curso_declarado` en events_raw con rollback (R4/R15).
 */

const router: Router = Router();

const DOMINIO = 'curricular_atlas';
const REGLA =
  'La matriz curricular es catálogo con procedencia por ingesta (ADR-082), no gestión académica: sin inscripción, sin notas, sin persona (Ley 25.326/ADR-027) — única fuente autorizada v1: corpus DLUI-IT (ECO-5); el catálogo nace vacío y lo vacío se declara (R15)';
const CAUTELA =
  'Cursos, competencias y rutas declarados con fuente + fecha de corte + ingesta del pipeline de procedencia (NC-EV-09); trazabilidad bidireccional declarada, jamás calculada (ADR-083); cobertura «X de N» — jamás ranking de cursos ni de personas (R5/ADR-036)';

// Pseudónimo del admin: sha256(usuario_id) truncado — irreversible, sin PII.
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

type CourseRow = {
  id: string;
  key: string;
  titulo: string;
  descripcion: string | null;
  track_key: string;
  estado: string;
  fuente_key: string;
  fecha_corte: string;
};

function aCursoPublico(c: CourseRow) {
  return {
    key: c.key,
    titulo: c.titulo,
    descripcion: c.descripcion,
    track_key: c.track_key,
    estado: c.estado,
    fuente_key: c.fuente_key,
    fecha_corte: c.fecha_corte,
  };
}

// GET /api/curricular — matriz de trazabilidad curricular (ADR-083): los
// tres lados de la relación + cobertura «X de N» honesta (DL-5). Lectura
// pública anónima — la matriz es catálogo de datos abiertos (patrón A4).
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [cursos, competencias, vinculos] = await Promise.all([
      prisma.courses.findMany({ orderBy: [{ key: 'asc' }] }),
      prisma.competencies.findMany({ orderBy: [{ key: 'asc' }] }),
      prisma.course_competencies.findMany({ orderBy: [{ course_key: 'asc' }, { competency_key: 'asc' }] }),
    ]);
    const conVinculos = new Set(vinculos.map((v: { course_key: string }) => v.course_key));
    const data = {
      dominio: DOMINIO,
      regla: REGLA,
      cautela: CAUTELA,
      cursos: cursos.map((c: CourseRow) => aCursoPublico(c)),
      competencias: competencias.map((c: { key: string; titulo: string; descripcion: string | null; tipo: string; fuente_key: string; fecha_corte: string }) => ({
        key: c.key,
        titulo: c.titulo,
        descripcion: c.descripcion,
        tipo: c.tipo,
        fuente_key: c.fuente_key,
        fecha_corte: c.fecha_corte,
      })),
      vinculos: vinculos.map((v: { course_key: string; competency_key: string; peso_declarado: string }) => ({
        course_key: v.course_key,
        competency_key: v.competency_key,
        peso_declarado: v.peso_declarado,
      })),
      cobertura: {
        cursos_con_competencias: cursos.filter((c: CourseRow) => conVinculos.has(c.key)).length,
        total_cursos: cursos.length,
      },
    };
    MatrizCurricularResponseSchema.parse(data);
    res.json({ success: true, data, count: data.cursos.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[curricular] matriz:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar la matriz curricular' });
  }
});

// GET /api/curricular/rutas — tracks, perfiles y learning paths declarados
// (ADR-083: vistas declaradas sobre la matriz, jamás cálculos). Lectura
// pública anónima; los pasos se leen ordenados por su orden declarado.
router.get('/rutas', async (_req: Request, res: Response) => {
  try {
    const [tracks, perfiles, rutas, pasos] = await Promise.all([
      prisma.tracks.findMany({ orderBy: [{ key: 'asc' }] }),
      prisma.perfiles.findMany({ orderBy: [{ key: 'asc' }] }),
      prisma.learning_paths.findMany({ orderBy: [{ key: 'asc' }] }),
      prisma.learning_path_steps.findMany({ orderBy: [{ path_key: 'asc' }, { orden: 'asc' }] }),
    ]);
    const pasosPorRuta = new Map<string, Array<{ course_key: string; orden: number; obligatoriedad: string }>>();
    for (const paso of pasos) {
      const lista = pasosPorRuta.get(paso.path_key) ?? [];
      lista.push({ course_key: paso.course_key, orden: paso.orden, obligatoriedad: paso.obligatoriedad });
      pasosPorRuta.set(paso.path_key, lista);
    }
    const data = {
      tracks: tracks.map((t: { key: string; titulo: string; descripcion: string | null; tipo: string; orden: number | null; fuente_key: string; fecha_corte: string }) => ({
        key: t.key,
        titulo: t.titulo,
        descripcion: t.descripcion,
        tipo: t.tipo,
        orden: t.orden,
        fuente_key: t.fuente_key,
        fecha_corte: t.fecha_corte,
      })),
      perfiles: perfiles.map((p: { key: string; titulo: string; descripcion: string | null; fuente_key: string; fecha_corte: string }) => ({
        key: p.key,
        titulo: p.titulo,
        descripcion: p.descripcion,
        fuente_key: p.fuente_key,
        fecha_corte: p.fecha_corte,
      })),
      rutas: rutas.map((r: { key: string; titulo: string; descripcion: string | null; perfil_key: string | null; criterio_de_avance: string; fuente_key: string; fecha_corte: string }) => ({
        key: r.key,
        titulo: r.titulo,
        descripcion: r.descripcion,
        perfil_key: r.perfil_key,
        criterio_de_avance: r.criterio_de_avance,
        fuente_key: r.fuente_key,
        fecha_corte: r.fecha_corte,
        pasos: pasosPorRuta.get(r.key) ?? [],
      })),
    };
    RutasCurricularesResponseSchema.parse(data);
    res.json({ success: true, data, count: data.rutas.length });
  } catch (err) {
    console.error('[curricular] rutas:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar las rutas curriculares' });
  }
});

// POST /api/curricular/cursos — alta curada SOLO admin (R15 estricta, patrón
// salud/convenios): procedencia por ingesta verificada, track existente,
// anti-PII antes de persistir, idempotencia por hash → 409, sello con
// rollback (R4/R15).
router.post('/cursos', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof CursoAltaSchema>;
  try {
    parsed = CursoAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII (Ley 25.326/ADR-027): el curso es contenido del catálogo, jamás
  // un expediente de persona — compuerta sobre TODO el texto libre ANTES de
  // persistir, sin eco del valor (ADR-020 cond. 1).
  const textoLibre = [parsed.titulo, parsed.descripcion ?? ''].join('|');
  const patronPII = detectaPII(textoLibre);
  if (patronPII) {
    res.status(400).json({ success: false, error: 'sin datos de personas en el catálogo curricular (Ley 25.326/ADR-027)' });
    return;
  }

  // Procedencia por ingesta (NC-EV-09): el curso no viaja suelto — la
  // ingesta debe existir y su fuente_key coincidir con la declarada (patrón
  // salud R15 estricta, decisión DH 2026-10-15).
  const ingesta = await prisma.ingestas.findUnique({ where: { id: parsed.ingesta_id }, select: { id: true, fuente_key: true } });
  if (!ingesta) {
    res.status(404).json({ success: false, error: 'ingesta de procedencia inexistente — sin ingesta no hay fila curricular (NC-EV-09)' });
    return;
  }
  if (ingesta.fuente_key !== parsed.fuente.fuente_key) {
    res.status(400).json({ success: false, error: 'la fuente declarada no coincide con la de la ingesta (integridad de procedencia — NC-EV-09)' });
    return;
  }

  // El track debe existir en el catálogo (400 — el catálogo no crea cursos
  // huérfanos; la integridad de la matriz es honesta, ADR-082/083).
  const track = await prisma.tracks.findUnique({ where: { key: parsed.track_key }, select: { key: true } });
  if (!track) {
    res.status(400).json({ success: false, error: 'track_key no existe en el catálogo curricular — sin track no hay curso (ADR-082)' });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);
  // Idempotencia: mismo curso (key+fuente+fecha de corte) = una sola fila.
  // El hash único es la compuerta → 409.
  const hash = createHash('sha256')
    .update(parsed.key + '|' + parsed.fuente.fuente_key + '|' + parsed.fuente.fecha_corte)
    .digest('hex');

  try {
    const existente = await prisma.courses.findUnique({ where: { hash } });
    if (existente) {
      res.status(409).json({ success: false, error: 'curso ya declarado con esa key y fuente (idempotencia por hash — ADR-082)' });
      return;
    }

    const curso = await prisma.courses.create({
      data: {
        key: parsed.key,
        titulo: parsed.titulo,
        descripcion: parsed.descripcion ?? null,
        track_key: parsed.track_key,
        estado: parsed.estado,
        fuente_key: parsed.fuente.fuente_key,
        fuente_url: parsed.fuente.fuente_url ?? null,
        fecha_corte: parsed.fuente.fecha_corte,
        ingesta_id: parsed.ingesta_id,
        created_by_hash: autor,
        hash,
      },
    });

    // Sello del sistema: 'curricular.curso_declarado' sin PII — el payload
    // lleva claves de procedencia; el detalle vive en courses.
    try {
      await sellarEvento('curricular.curso_declarado', {
        curso_id: curso.id,
        curso_key: curso.key,
        track_key: curso.track_key,
        estado: curso.estado,
        fuente_key: curso.fuente_key,
        fecha_corte: curso.fecha_corte,
        ingesta_id: curso.ingesta_id,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.courses.delete({ where: { id: curso.id } }).catch(() => undefined);
      console.error('[curricular] sellar:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el curso' });
      return;
    }

    const fila = aCursoPublico(curso as unknown as CourseRow);
    CursoVocabularioSchema.parse(fila);
    res.status(201).json({ success: true, data: fila });
  } catch (err) {
    // Carrera de idempotencia (P2002 en hash o key) → 409.
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      res.status(409).json({ success: false, error: 'curso ya declarado con esa key y fuente (idempotencia por hash — ADR-082)' });
      return;
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[curricular] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el curso' });
  }
});

export default router;

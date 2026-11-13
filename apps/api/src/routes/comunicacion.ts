import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  AvisoAltaSchema,
  AvisoSchema,
  CoberturaAvisosSchema,
  EstadoAvisoSchema,
  NodoKeyAvisoSchema,
  TipoAvisoSchema,
} from '@delocalsoy/contracts';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Comunicación pública honesta — LIC-DLUI LIC-R8 (LIC-08 #451, épica #448).
 *
 * DL-13 ratificado (canon DLUI-569 como ley interna): la comunicación JAMÁS
 * sustituye la evidencia.
 * 1. Sin fuente no hay aviso: el contrato exige fuente_key + fecha_corte +
 *    certeza — el alta sin fuente es inválida por construcción (un aviso sin
 *    fuente no se publica, no existe).
 * 2. La plataforma traduce, jamás alerta: el aviso cita y enlaza la fuente
 *    oficial (SMN, Hidráulica, Vialidad, municipio) — nunca reemplaza el
 *    sistema de alerta operativa (no sirena, R5/ADR-036).
 * 3. Caducidad honesta: el aviso de riesgo lleva caduca_en; el vencido se
 *    expone `caducado` COMPUTADO en lectura — jamás borrado (ADR-038).
 * 4. Anti-infodemia: certeza verificado|reportado|rumor_descartado — el
 *    desmentido se publica CON fuente (el vacío informativo también se
 *    comunica).
 * 5. Anti-PII (Ley 25.326/ADR-027): compuerta en la ruta — título y cuerpo
 *    sin datos de personas.
 * 6. Anti-ranking: la cobertura es «X de N», jamás comparativa entre nodos.
 *
 * GET /api/comunicacion/avisos — lectura pública anónima (default estado=
 * publicado; orden declarado creado_en desc; filtros validados, 400 si son
 * inválidos). GET /api/comunicacion/cobertura — «X de N» honesto que nace
 * «0 de N» (DL-5). POST /api/comunicacion/avisos — alta curada SOLO admin
 * (R15 estricta, patrón /api/salud/agregados): nodo validado contra la tabla
 * nodos, idempotencia por hash sha256(titulo|nodo|fuente|fecha_corte) → 409,
 * sello `comunicacion.aviso_publicado` en events_raw con rollback (R4/R15).
 */

const router: Router = Router();

const DOMINIO = 'comunicacion_publica';
const REGLA =
  'Sin fuente no hay aviso (DL-13.1) — la plataforma traduce, jamás alerta: cita y enlaza la fuente oficial; sin datos de personas (Ley 25.326/ADR-027)';
const CAUTELA =
  'El aviso cita la fuente oficial (SMN, Hidráulica, Vialidad, municipio) con fecha de corte y certeza declaradas; NUNCA reemplaza el sistema de alerta operativa (no sirena); el vencido se expone caducado, jamás borrado (ADR-038); el desmentido se publica con certeza rumor_descartado; cobertura «X de N» — jamás ranking entre nodos (R5/ADR-036)';

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

type AvisoRow = {
  id: string;
  nodo_key: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  estado: string;
  fuente_key: string;
  fuente_url: string | null;
  fecha_corte: string;
  certeza: string;
  caduca_en: string | null;
  created_by_hash: string;
  hash: string;
  creado_en: Date;
};

// Caducidad COMPUTADA en lectura (DL-13.3): caduca_en < hoy ⇒ caducado, sin
// escritura — honesto y sin cron. Fechas YYYY-MM-DD se comparan como strings
// ISO (se interpretan a T00:00:00Z — patrón de fechas del repo).
function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function estadoExpuesto(a: AvisoRow): string {
  if (a.estado !== 'publicado') return a.estado;
  if (a.caduca_en && a.caduca_en < hoyISO()) return 'caducado';
  return 'publicado';
}

function aFilaPublica(a: AvisoRow) {
  return {
    id: a.id,
    nodo_key: a.nodo_key,
    titulo: a.titulo,
    cuerpo: a.cuerpo,
    tipo: a.tipo,
    estado: estadoExpuesto(a),
    fuente: {
      fuente_key: a.fuente_key,
      fuente_url: a.fuente_url ?? undefined,
      fecha_corte: a.fecha_corte,
      certeza: a.certeza,
    },
    caduca_en: a.caduca_en ?? null,
    creado_en: a.creado_en.toISOString(),
  };
}

// Filtros de la lectura pública — validados (400 si son inválidos). El
// estado `borrador` no es visible en la superficie pública (queda para la
// UI de la DH, fuera de v1): la lectura base solo expone publicado/caducado.
const AvisosQuerySchema = z.object({
  nodo: NodoKeyAvisoSchema.optional(),
  tipo: TipoAvisoSchema.optional(),
  estado: EstadoAvisoSchema.optional(),
});

// GET /api/comunicacion/avisos?nodo=&tipo=&estado= — lectura pública anónima.
router.get('/avisos', async (req: Request, res: Response) => {
  let q: z.infer<typeof AvisosQuerySchema>;
  try {
    q = AvisosQuerySchema.parse(req.query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'filtros inválidos', details: error.issues });
      return;
    }
    throw error;
  }
  try {
    const where: Record<string, unknown> = { estado: 'publicado' };
    if (q.nodo) where.nodo_key = q.nodo;
    if (q.tipo) where.tipo = q.tipo;
    const rows = (await prisma.avisos.findMany({
      where,
      orderBy: [{ creado_en: 'desc' }],
    })) as AvisoRow[];
    const filas = rows
      .map(aFilaPublica)
      .filter((f) => (q.estado ? f.estado === q.estado : true))
      .map((f) => {
        AvisoSchema.parse(f);
        return f;
      });
    res.json({ success: true, data: filas, count: filas.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[comunicacion] avisos:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al listar los avisos' });
  }
});

// GET /api/comunicacion/cobertura — «X de N» honesto (DL-13.6): N = nodos del
// vocabulario; nace «0 de N» (DL-5). Conte CON cobertura, jamás ranking.
router.get('/cobertura', async (_req: Request, res: Response) => {
  try {
    const nodos = (await prisma.nodos.findMany({ select: { key: true } })) as Array<{ key: string }>;
    const claves = nodos.map((n) => n.key).sort((a, b) => a.localeCompare(b));
    const publicados = (await prisma.avisos.groupBy({
      by: ['nodo_key'],
      where: { estado: 'publicado' },
      _count: { _all: true },
    })) as Array<{ nodo_key: string; _count: { _all: number } }>;
    const porNodo = new Map<string, number>(publicados.map((p) => [p.nodo_key, p._count._all]));
    const detalle = claves.map((nodo_key) => ({ nodo_key, avisos_publicados: porNodo.get(nodo_key) ?? 0 }));
    const con = detalle.filter((d) => d.avisos_publicados > 0).length;
    const data = {
      dominio: DOMINIO,
      regla: REGLA,
      cautela: CAUTELA,
      nodos_con_avisos: con,
      nodos_totales: claves.length,
      detalle,
      cobertura: con + ' de ' + claves.length,
    };
    CoberturaAvisosSchema.parse(data);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[comunicacion] cobertura:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar la cobertura de avisos' });
  }
});

// POST /api/comunicacion/avisos — alta curada SOLO admin (R15 estricta,
// patrón /api/salud/agregados): sin fuente no hay aviso (DL-13.1 a nivel
// contrato), nodo validado contra el vocabulario, idempotencia por hash →
// 409, sello con rollback (R4/R15).
router.post('/avisos', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof AvisoAltaSchema>;
  try {
    parsed = AvisoAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII (DL-13.5, Ley 25.326/ADR-027): título y cuerpo sin datos de
  // personas — compuerta en la ruta ANTES de persistir.
  if (/@/.test(parsed.titulo) || /@/.test(parsed.cuerpo)) {
    res.status(400).json({ success: false, error: 'sin datos de personas en el aviso (Ley 25.326/ADR-027)' });
    return;
  }

  // El nodo de origen es una clave del vocabulario (patrón salud/amenazas).
  const nodo = await prisma.nodos.findUnique({ where: { key: parsed.nodo_key }, select: { key: true } });
  if (!nodo) {
    res.status(400).json({ success: false, error: 'nodo_key no existe en el vocabulario de nodos' });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);
  // Idempotencia: mismo aviso (título+nodo+fuente+fecha de corte) = una sola
  // fila. El hash único es la compuerta → 409 (no duplica, DL-13).
  const hash = createHash('sha256')
    .update(parsed.titulo + '|' + parsed.nodo_key + '|' + parsed.fuente_key + '|' + parsed.fecha_corte)
    .digest('hex');

  try {
    const existente = await prisma.avisos.findUnique({ where: { hash } });
    if (existente) {
      res.status(409).json({ success: false, error: 'aviso ya publicado con esa fuente y fecha de corte (idempotencia por hash — DL-13)' });
      return;
    }

    const aviso = await prisma.avisos.create({
      data: {
        nodo_key: parsed.nodo_key,
        titulo: parsed.titulo,
        cuerpo: parsed.cuerpo,
        tipo: parsed.tipo,
        estado: 'publicado',
        fuente_key: parsed.fuente_key,
        fuente_url: parsed.fuente_url ?? null,
        fecha_corte: parsed.fecha_corte,
        certeza: parsed.certeza,
        caduca_en: parsed.caduca_en ?? null,
        created_by_hash: autor,
        hash,
      },
    });

    // Sello del sistema: 'comunicacion.aviso_publicado' sin PII — el payload
    // lleva claves de procedencia; el detalle vive en avisos.
    try {
      await sellarEvento('comunicacion.aviso_publicado', {
        aviso_id: aviso.id,
        nodo_key: aviso.nodo_key,
        tipo: aviso.tipo,
        fuente_key: aviso.fuente_key,
        fecha_corte: aviso.fecha_corte,
        certeza: aviso.certeza,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.avisos.delete({ where: { id: aviso.id } }).catch(() => undefined);
      console.error('[comunicacion] sellar aviso:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el aviso' });
      return;
    }

    const fila = aFilaPublica(aviso as unknown as AvisoRow);
    AvisoSchema.parse(fila);
    res.status(201).json({ success: true, data: fila });
  } catch (err) {
    // Carrera de idempotencia (P2002 en hash) → 409.
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      res.status(409).json({ success: false, error: 'aviso ya publicado con esa fuente y fecha de corte (idempotencia por hash — DL-13)' });
      return;
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[comunicacion] crear aviso:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el aviso' });
  }
});

export default router;

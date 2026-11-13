import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  ConvenioAltaSchema,
  ConvenioSchema,
  CoberturaConveniosSchema,
  EstadoConvenioSchema,
  NodoKeyConvenioSchema,
} from '@delocalsoy/contracts';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Cooperación y convenios — LIC-DLUI LIC-R9 (LIC-09 #456, épica #448).
 *
 * DL-14 ratificado (issue #456): el convenio es acto institucional.
 * 1. Escritura SOLO admin (ADR-031): declarar un convenio es un acto del
 *    nodo, no una opinión ciudadana — la lectura es pública (datos
 *    abiertos, patrón A4).
 * 2. Contrapartes GENÉRICAS: organismos e instituciones, jamás personas
 *    (Ley 25.326/ADR-027) — compuerta anti-PII en la ruta.
 * 3. Estados honestos: propuesto | en_negociacion | vigente | vencido |
 *    sin_instrumento_encontrado — el vacío se declara, no se maquilla
 *    (R15, precedente not_found). UNSJ-fuera (decisión DH): el tipo
 *    universidad es genérico, sin contrapartes nombradas.
 * 4. Sin fuente no hay convenio declarado (patrón DL-13.1): fuente_key +
 *    fecha_corte obligatorias a nivel contrato.
 * 5. Anti-ranking: la cobertura es «X de N», jamás comparativa entre nodos
 *    (R5/ADR-036).
 *
 * GET /api/convenios — lectura pública anónima (filtros validados, 400 si
 * son inválidos; todos los estados son honestos y visibles, incluido
 * sin_instrumento_encontrado). GET /api/convenios/cobertura — «X de N»
 * honesto que nace «0 de N» (DL-5). POST /api/convenios — alta curada SOLO
 * admin (R15 estricta, patrón comunicacion/salud): nodo validado contra la
 * tabla nodos, idempotencia por hash sha256(contraparte|nodo|objeto|fuente|
 * fecha_corte) → 409, sello convenio.declarado en events_raw con rollback
 * (R4/R15).
 */

const router: Router = Router();

const DOMINIO = 'cooperacion_convenios';
const REGLA =
  'El convenio es acto institucional (DL-14): alta SOLO admin (ADR-031), contraparte genérica sin PII (Ley 25.326/ADR-027) — el vacío sin_instrumento_encontrado se declara, no se maquilla (R15)';
const CAUTELA =
  'El convenio declara contraparte institucional genérica con fuente y fecha de corte; el estado sin_instrumento_encontrado expone el vacío honesto de la búsqueda (jamás se inventa un instrumento); cobertura «X de N» — jamás ranking entre nodos (R5/ADR-036); UNSJ-fuera: sin contrapartes universitarias nombradas (decisión DH)';

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

type ConvenioRow = {
  id: string;
  nodo_key: string;
  contraparte: string;
  contraparte_tipo: string;
  objeto: string;
  estado: string;
  fuente_key: string;
  fuente_url: string | null;
  fecha_corte: string;
  hash: string;
  creado_en: Date;
};

function aFilaPublica(c: ConvenioRow) {
  return {
    id: c.id,
    nodo_key: c.nodo_key,
    contraparte: c.contraparte,
    contraparte_tipo: c.contraparte_tipo,
    objeto: c.objeto,
    estado: c.estado,
    fuente: {
      fuente_key: c.fuente_key,
      fuente_url: c.fuente_url ?? undefined,
      fecha_corte: c.fecha_corte,
    },
    creado_en: c.creado_en.toISOString(),
  };
}

// Filtros de la lectura pública — validados (400 si son inválidos). Todos
// los estados son honestos y visibles: sin_instrumento_encontrado se lee
// igual que vigente (R15 — el vacío no se esconde).
const ConveniosQuerySchema = z.object({
  nodo: NodoKeyConvenioSchema.optional(),
  estado: EstadoConvenioSchema.optional(),
});

// GET /api/convenios?nodo=&estado= — lectura pública anónima.
router.get('/', async (req: Request, res: Response) => {
  let q: z.infer<typeof ConveniosQuerySchema>;
  try {
    q = ConveniosQuerySchema.parse(req.query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'filtros inválidos', details: error.issues });
      return;
    }
    throw error;
  }
  try {
    const where: Record<string, unknown> = {};
    if (q.nodo) where.nodo_key = q.nodo;
    if (q.estado) where.estado = q.estado;
    const rows = (await prisma.convenios.findMany({
      where,
      orderBy: [{ creado_en: 'desc' }],
    })) as ConvenioRow[];
    const filas = rows.map(aFilaPublica).map((f) => {
      ConvenioSchema.parse(f);
      return f;
    });
    res.json({ success: true, data: filas, count: filas.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[convenios] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al listar los convenios' });
  }
});

// GET /api/convenios/cobertura — «X de N» honesto (DL-14): N = nodos del
// vocabulario; nace «0 de N» (DL-5). Conteo CON cobertura, jamás ranking.
router.get('/cobertura', async (_req: Request, res: Response) => {
  try {
    const nodos = (await prisma.nodos.findMany({ select: { key: true } })) as Array<{ key: string }>;
    const claves = nodos.map((n) => n.key).sort((a, b) => a.localeCompare(b));
    const declarados = (await prisma.convenios.groupBy({
      by: ['nodo_key'],
      _count: { _all: true },
    })) as Array<{ nodo_key: string; _count: { _all: number } }>;
    const porNodo = new Map<string, number>(declarados.map((p) => [p.nodo_key, p._count._all]));
    const detalle = claves.map((nodo_key) => ({ nodo_key, convenios_declarados: porNodo.get(nodo_key) ?? 0 }));
    const con = detalle.filter((d) => d.convenios_declarados > 0).length;
    const data = {
      dominio: DOMINIO,
      regla: REGLA,
      cautela: CAUTELA,
      nodos_con_convenios: con,
      nodos_totales: claves.length,
      detalle,
      cobertura: con + ' de ' + claves.length,
    };
    CoberturaConveniosSchema.parse(data);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[convenios] cobertura:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar la cobertura de convenios' });
  }
});

// POST /api/convenios — alta curada SOLO admin (R15 estricta, patrón
// comunicacion/salud): nodo validado contra el vocabulario, anti-PII,
// idempotencia por hash → 409, sello con rollback (R4/R15).
router.post('/', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof ConvenioAltaSchema>;
  try {
    parsed = ConvenioAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII (Ley 25.326/ADR-027): la contraparte es un organismo, jamás
  // una persona — compuerta en la ruta ANTES de persistir.
  if (/@/.test(parsed.contraparte) || /@/.test(parsed.objeto)) {
    res.status(400).json({ success: false, error: 'sin datos de personas en el convenio (Ley 25.326/ADR-027)' });
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
  // Idempotencia: mismo convenio (contraparte+nodo+objeto+fuente+fecha de
  // corte) = una sola fila. El hash único es la compuerta → 409.
  const hash = createHash('sha256')
    .update(parsed.contraparte + '|' + parsed.nodo_key + '|' + parsed.objeto + '|' + parsed.fuente_key + '|' + parsed.fecha_corte)
    .digest('hex');

  try {
    const existente = await prisma.convenios.findUnique({ where: { hash } });
    if (existente) {
      res.status(409).json({ success: false, error: 'convenio ya declarado con esa contraparte, objeto y fuente (idempotencia por hash — DL-14)' });
      return;
    }

    const convenio = await prisma.convenios.create({
      data: {
        nodo_key: parsed.nodo_key,
        contraparte: parsed.contraparte,
        contraparte_tipo: parsed.contraparte_tipo,
        objeto: parsed.objeto,
        estado: parsed.estado,
        fuente_key: parsed.fuente_key,
        fuente_url: parsed.fuente_url ?? null,
        fecha_corte: parsed.fecha_corte,
        created_by_hash: autor,
        hash,
      },
    });

    // Sello del sistema: 'convenio.declarado' sin PII — el payload lleva
    // claves de procedencia; el detalle vive en convenios.
    try {
      await sellarEvento('convenio.declarado', {
        convenio_id: convenio.id,
        nodo_key: convenio.nodo_key,
        contraparte_tipo: convenio.contraparte_tipo,
        estado: convenio.estado,
        fuente_key: convenio.fuente_key,
        fecha_corte: convenio.fecha_corte,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.convenios.delete({ where: { id: convenio.id } }).catch(() => undefined);
      console.error('[convenios] sellar:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el convenio' });
      return;
    }

    const fila = aFilaPublica(convenio as unknown as ConvenioRow);
    ConvenioSchema.parse(fila);
    res.status(201).json({ success: true, data: fila });
  } catch (err) {
    // Carrera de idempotencia (P2002 en hash) → 409.
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      res.status(409).json({ success: false, error: 'convenio ya declarado con esa contraparte, objeto y fuente (idempotencia por hash — DL-14)' });
      return;
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[convenios] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el convenio' });
  }
});

export default router;

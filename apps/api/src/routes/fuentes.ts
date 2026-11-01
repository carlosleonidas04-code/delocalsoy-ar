import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import {
  IngestaAltaSchema,
  IngestaEstadoCambioSchema,
  SanJuanNodeSlugSchema,
} from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio fuentes espaciales + procedencia — NODO-CAU R2 (#138/#147,
 * ADR-035): el registro de procedencia del sistema.
 *
 * GET /api/fuentes — catálogo público y anónimo de fuentes espaciales:
 * organismo, URL, tipo de acceso, licencia, estado honesto de disponibilidad
 * y CAUTELA central (#147). El catálogo es registro de procedencia, no de
 * datos: nunca un feature real sin fuente citable (R15).
 *
 * POST /api/ingestas — ingesta curada por ADMIN (decisión DH 2026-10-15):
 * cada conjunto externo declara fuente del catálogo, capa/servicio, fechas
 * de acceso y corte, licencia, CRS origen/normalizado, escala/precisión, id
 * externo y transformaciones (NC-EV-09: el contrato rechaza la ingesta
 * incompleta). Nace 'recibido'; hash único → idempotencia del alta.
 *
 * PATCH /api/ingestas/:id/estado — pipeline por admin: recibido →
 * validado_tecnicamente → validado_territorialmente → publicado (solo hacia
 * adelante; salto inválido → 400; sin transición → 409).
 *
 * GET /api/ingestas — lectura pública: SOLO las ingestas publicadas; el
 * pipeline en curso queda para custodia (R15/ADR-036).
 *
 * Sellos en events_raw con rollback (R4/R15): ingesta.creada e
 * ingesta.estado_cambiado — nunca una escritura sin su evento. Pseudónimo
 * sha256(usuario_id) truncado — sin PII (Ley 25.326, ADR-027).
 */
const router: Router = Router();

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

// Matriz del pipeline de procedencia (#147): solo hacia adelante —
// recibido → validado_tecnicamente → validado_territorialmente → publicado.
// 'publicado' es terminal (admin, decisión DH 2026-10-15).
const TRANSICIONES: Record<string, string[]> = {
  recibido: ['validado_tecnicamente'],
  validado_tecnicamente: ['validado_territorialmente'],
  validado_territorialmente: ['publicado'],
  publicado: [],
};

// Filas tipadas de las lecturas: el cliente prisma se exporta `any` (patrón
// mock de pruebas en lib/prisma), así que la forma de las filas se declara
// explícita para que la lectura siga chequeada en tsc.
type FuenteRow = {
  id: string;
  key: string;
  organismo: string;
  nombre: string;
  url: string | null;
  tipo: string;
  licencia: string | null;
  estado: string;
  cautela: string;
  created_at: Date;
  updated_at: Date;
};

type IngestaRow = {
  id: string;
  source_id: string;
  fuente_key: string;
  nodo_key: string;
  capa_servicio: string;
  fecha_acceso: string;
  fecha_corte: string;
  licencia: string | null;
  crs_origen: string;
  crs_normalizado: string;
  escala_precision: string;
  external_id: string | null;
  transformaciones: string | null;
  estado: string;
  created_by_hash: string;
  hash: string;
  created_at: Date;
  updated_at: Date;
};

// GET /api/fuentes — catálogo público y anónimo de fuentes espaciales:
// el registro de procedencia del sistema (ADR-035), con sus cautelas.
router.get('/fuentes', async (_req: Request, res: Response) => {
  try {
    const fuentes = (await prisma.fuentes.findMany({
      orderBy: { organismo: 'asc' },
      take: 200,
    })) as FuenteRow[];
    res.json({ success: true, data: fuentes, count: fuentes.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[fuentes] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener el catálogo de fuentes' });
  }
});

// GET /api/fuentes/:key — ficha pública de una fuente del catálogo.
router.get('/fuentes/:key', async (req: Request, res: Response) => {
  try {
    const fuente = (await prisma.fuentes.findUnique({
      where: { key: req.params.key },
    })) as FuenteRow | null;
    if (!fuente) {
      res.status(404).json({ success: false, error: 'fuente no encontrada en el catálogo' });
      return;
    }
    res.json({ success: true, data: fuente });
  } catch (err) {
    console.error('[fuentes] leer:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener la fuente' });
  }
});

// POST /api/ingestas — ingesta curada (requireRole admin, decisión DH
// 2026-10-15): todo dato externo entra declarando procedencia completa
//#147. El contrato Zod es la compuerta NC-EV-09 (sin fuente/fecha de
// corte/precisión no hay ingesta). Nace 'recibido' en el pipeline.
router.post('/ingestas', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof IngestaAltaSchema>;
  try {
    parsed = IngestaAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre TODO el texto de autoría
  // humana ANTES de persistir; rechazo genérico, sin eco del valor.
  const pii = detectaPII(
    JSON.stringify({
      capa_servicio: parsed.capa_servicio,
      escala_precision: parsed.escala_precision,
      external_id: parsed.external_id ?? '',
      transformaciones: parsed.transformaciones ?? '',
    })
  );
  if (pii) {
    res.status(400).json({
      error: `payload rechazado: contiene datos personales identificables (${pii}) — ADR-020 cond. 1, Ley 25.326`,
    });
    return;
  }

  // La ingesta SOLO cita fuentes del catálogo (#147): la procedencia se
  // ancla a un registro público verificable — no a una fuente libre.
  const fuente = await prisma.fuentes.findUnique({ where: { key: parsed.fuente_key } });
  if (!fuente) {
    res.status(404).json({ success: false, error: 'fuente no encontrada en el catálogo de procedencia' });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);
  // Idempotencia: mismo conjunto (fuente+source_id) con mismo contenido =
  // una sola ingesta. El hash único de ingestas es la compuerta.
  const hash = createHash('sha256')
    .update(
      parsed.source_id + '|' + parsed.fuente_key + '|' + parsed.nodo_key + '|' + parsed.capa_servicio + '|' + parsed.fecha_acceso
    )
    .digest('hex');

  try {
    const existente = await prisma.ingestas.findUnique({ where: { hash } });
    if (existente) {
      res.status(200).json({ success: true, data: existente, idempotente: true });
      return;
    }

    const ingesta = await prisma.ingestas.create({
      data: {
        source_id: parsed.source_id,
        fuente_key: parsed.fuente_key,
        nodo_key: parsed.nodo_key,
        capa_servicio: parsed.capa_servicio,
        fecha_acceso: parsed.fecha_acceso,
        fecha_corte: parsed.fecha_corte,
        licencia: parsed.licencia ?? null,
        crs_origen: parsed.crs_origen,
        crs_normalizado: parsed.crs_normalizado,
        escala_precision: parsed.escala_precision,
        external_id: parsed.external_id ?? null,
        transformaciones: parsed.transformaciones ?? null,
        estado: 'recibido',
        created_by_hash: autor,
        hash,
      },
    });

    // Sello del sistema: 'ingesta.creada' sin PII — el payload lleva claves
    // de procedencia y estado; el detalle vive solo en la tabla ingestas.
    try {
      await sellarEvento('ingesta.creada', {
        ingesta_id: ingesta.id,
        source_id: ingesta.source_id,
        fuente_key: ingesta.fuente_key,
        nodo_key: ingesta.nodo_key,
        estado: ingesta.estado,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.ingestas.delete({ where: { id: ingesta.id } }).catch(() => undefined);
      console.error('[fuentes] sellar ingesta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la ingesta' });
      return;
    }

    res.status(201).json({ success: true, data: ingesta });
  } catch (err) {
    // Carrera de idempotencia (P2002 en hash o en fuente_key+source_id).
    const code = (err as { code?: string } | null)?.code;
    if (code === 'P2002') {
      const existente = await prisma.ingestas.findUnique({ where: { hash } });
      if (existente) {
        res.status(200).json({ success: true, data: existente, idempotente: true });
        return;
      }
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[fuentes] crear ingesta:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear la ingesta' });
  }
});

// GET /api/ingestas — lectura pública y anónima: SOLO las ingestas
// publicadas (el pipeline en curso queda para custodia, R15/ADR-036);
//#nodo= filtra por nodo. La procedencia publicada acompaña a todo dato
// real del sistema (ADR-035).
router.get('/ingestas', async (req: Request, res: Response) => {
  try {
    const nodoCrudo = typeof req.query.nodo === 'string' ? req.query.nodo : undefined;
    let nodo: z.infer<typeof SanJuanNodeSlugSchema> | undefined;
    if (nodoCrudo !== undefined) {
      const parsedNodo = SanJuanNodeSlugSchema.safeParse(nodoCrudo);
      if (!parsedNodo.success) {
        res.status(400).json({ success: false, error: 'nodo inválido', details: parsedNodo.error.errors });
        return;
      }
      nodo = parsedNodo.data;
    }

    const ingestas = (await prisma.ingestas.findMany({
      where: { estado: 'publicado', ...(nodo !== undefined ? { nodo_key: nodo } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    })) as IngestaRow[];
    res.json({ success: true, data: ingestas, count: ingestas.length });
  } catch (err) {
    console.error('[fuentes] listar ingestas:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener las ingestas' });
  }
});

// GET /api/ingestas/:id — ficha pública de una ingesta publicada; el
// pipeline en curso no se publica (404 sin eco, honesto — R15).
router.get('/ingestas/:id', async (req: Request, res: Response) => {
  try {
    const ingesta = (await prisma.ingestas.findUnique({
      where: { id: req.params.id },
    })) as IngestaRow | null;
    if (!ingesta || ingesta.estado !== 'publicado') {
      res.status(404).json({ success: false, error: 'ingesta no encontrada o no publicada' });
      return;
    }
    res.json({ success: true, data: ingesta });
  } catch (err) {
    console.error('[fuentes] leer ingesta:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener la ingesta' });
  }
});

// PATCH /api/ingestas/:id/estado — avance del pipeline (solo admin, decisión
// DH 2026-10-15): recibido → validado_tecnicamente → validado_territorialmente
// → publicado. Salto inválido → 400; sin transición → 409; sello
// ingesta.estado_cambiado en events_raw con rollback si falla.
router.patch('/ingestas/:id/estado', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  const id = req.params.id;

  let parsed: z.infer<typeof IngestaEstadoCambioSchema>;
  try {
    parsed = IngestaEstadoCambioSchema.parse(req.body);
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
    const existente = (await prisma.ingestas.findUnique({ where: { id } })) as IngestaRow | null;
    if (!existente) {
      res.status(404).json({ success: false, error: 'ingesta no encontrada' });
      return;
    }
    if (existente.estado === parsed.estado) {
      res.status(409).json({ success: false, error: `la ingesta ya está en estado '${parsed.estado}'` });
      return;
    }
    if (!(TRANSICIONES[existente.estado] ?? []).includes(parsed.estado)) {
      res.status(400).json({
        success: false,
        error: `transición inválida: '${existente.estado}' → '${parsed.estado}' (pipeline de procedencia #147)`,
      });
      return;
    }

    const actualizada = await prisma.ingestas.update({
      where: { id },
      data: { estado: parsed.estado },
    });

    const adminHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('ingesta.estado_cambiado', {
        ingesta_id: id,
        estado_anterior: existente.estado,
        estado: parsed.estado,
        motivo: parsed.motivo ?? null,
        admin_hash: adminHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay transición acreditada.
      await prisma.ingestas.update({ where: { id }, data: { estado: existente.estado } }).catch(() => undefined);
      console.error('[fuentes] sellar cambio de estado:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el cambio de estado' });
      return;
    }

    res.json({ success: true, data: actualizada });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[fuentes] cambiar estado:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al cambiar el estado' });
  }
});

export default router;

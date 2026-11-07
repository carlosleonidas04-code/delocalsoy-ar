import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { PEDIDOS_DPV_ESPERADOS, PedidoAltaSchema, PedidoRespuestaSchema } from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio pedidos — NODO-VIG-3 VIG-012 (#379, épica #377): pedidos
 * formales del nodo Iglesia (libro de reclamos del plan vecinal) y su
 * seguimiento público ante Vialidad Provincial (DPV).
 *
 * R15 (preparar la nota ≠ presentarla): la tabla NACE VACÍA — los 15
 * pedidos de la nota formal a DPV (bloques A-E) son contenido DOCUMENTAL
 * (fuente: documento vecinal interno, procedencia declarada, citado sin
 * firmantes expuestos — ADR-027), NO filas precargadas. Cada fila es un
 * pedido REALMENTE presentado, con fecha real y sello pedido.presentado.
 *
 * Ciclo: presentado → respondido_en_plazo | respondido_tardio. El estado
 * final de la respuesta lo DERIVA la ruta contra el plazo — nunca se
 * declara a mano. sin_respuesta NO se transita ni se sella: se DERIVA
 * honesto en la lectura (presentado con plazo vencido y sin respuesta —
 * no existe el evento «no contestaron», existe la fecha vencida, R15).
 *
 * Tablero público de cobertura/fecha (patrón NCAP-R5): «X de 15
 * presentados · Y respondidos (fecha de corte)» — conteo 0 honesto el
 * día que la tabla está vacía, NUNCA un puntaje global (R5/R15). Cada
 * pedido puede citar puntos críticos corroborados del AMC (features pc-*
 * community_validated de VIG-011: N reportes de M vecinos detrás).
 *
 * Presentar y responder son actos INSTITUCIONALES del nodo: solo admin
 * (ADR-031) — la DH ratifica. Autor = pseudónimo sha256(usuario_id)
 * truncado — sin PII (Ley 25.326, ADR-027). Sellos en events_raw (R4/R15)
 * sin tema ni nota del vecino: si el sello falla, la escritura se revierte
 * (nunca una fila sin evento).
 */
const router: Router = Router();

// Sello idempotente en events_raw + referencia al stream (patrón reportes).
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

// Pseudónimo del admin que registra (ADR-027, Ley 25.326).
function seudonimo(usuarioId: string): string {
  return createHash('sha256').update(usuarioId).digest('hex').slice(0, 32);
}

type PedidoRow = {
  id: string;
  nodo_key: string;
  key: string;
  bloque: string;
  tema: string;
  destinatario: string;
  fecha_presentacion: Date;
  plazo_dias: number;
  estado: string;
  respondido_en: Date | null;
  nota_respuesta: string | null;
  evidencia_cluster_keys: string[];
};

// Filas tipadas de las lecturas: el cliente prisma se exporta any (patron
// mock de pruebas en lib/prisma) — la forma de la fila se declara explicita
// para que el callback de map quede contextualmente tipado (mismo patron
// que reportes.ts, fix TS7006 del PR #151).
type SelloRow = { payload: unknown; occurred_at: Date };

function aFechaIso(f: Date): string {
  return f.toISOString().slice(0, 10);
}

function fechaUtc(yyyyMmDd: string): Date {
  return new Date(yyyyMmDd + 'T00:00:00.000Z');
}

function medianocheHoy(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Último día del plazo de respuesta (medianoche UTC, inclusive).
function deadlineDe(p: { fecha_presentacion: Date; plazo_dias: number }): Date {
  const d = new Date(p.fecha_presentacion);
  d.setUTCDate(d.getUTCDate() + p.plazo_dias);
  return d;
}

// Evidencia ampliada en lectura: el título del punto crítico citado
// («N reportes de M vecinos», VIG-011) — NULL honesto si el feature
// ya no existe (R15: la cita no simula vigencia).
async function evidenciaAmpliada(
  clusterKeys: string[]
): Promise<Array<{ cluster_key: string; titulo: string | null; estado: string | null }>> {
  const salida: Array<{ cluster_key: string; titulo: string | null; estado: string | null }> = [];
  for (const ck of clusterKeys) {
    const feature = await prisma.features.findFirst({ where: { id: ck } });
    salida.push({
      cluster_key: ck,
      titulo: feature?.titulo ?? null,
      estado: feature?.estado ?? null,
    });
  }
  return salida;
}

function publico(p: PedidoRow) {
  return {
    key: p.key,
    nodo_key: p.nodo_key,
    bloque: p.bloque,
    tema: p.tema,
    destinatario: p.destinatario,
    fecha_presentacion: aFechaIso(p.fecha_presentacion),
    plazo_dias: p.plazo_dias,
    estado: p.estado,
    respondido_en: p.respondido_en ? aFechaIso(p.respondido_en) : null,
    nota_respuesta: p.nota_respuesta,
    evidencia_cluster_keys: p.evidencia_cluster_keys,
  };
}

// Estado efectivo en lectura: 'sin_respuesta' se DERIVA (presentado con
// plazo vencido y sin respuesta), nunca se almacena ni se sella (R15).
function estadoEfectivoDe(p: PedidoRow, hoy: Date): string {
  if (p.estado !== 'presentado') return p.estado;
  return deadlineDe(p).getTime() < hoy.getTime() ? 'sin_respuesta' : 'presentado';
}

// POST /api/pedidos — registro SOLO admin: presentar un pedido formal
// ante el organismo (DPV) es un acto institucional del nodo con la DH
// ratificando (ADR-031). R15: la fecha de presentación es REAL — la ruta
// rechaza fechas futuras (preparar la nota ≠ presentarla).
router.post('/', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof PedidoAltaSchema>;
  try {
    parsed = PedidoAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  try {
    const usuario = res.locals.usuario as { id: string };

    // R15: la fecha de presentación es REAL — no futura.
    if (fechaUtc(parsed.fecha_presentacion).getTime() > medianocheHoy().getTime()) {
      res.status(400).json({
        success: false,
        error: 'fecha de presentación futura: preparar la nota ≠ presentarla — registre el pedido cuando se presente (R15, VIG-012)',
      });
      return;
    }

    // Anti-PII (ADR-020 cond. 1): el tema es público — sin eco del valor.
    if (detectaPII(parsed.tema) !== null) {
      res.status(400).json({ success: false, error: 'payload rechazado: contiene datos personales identificables' });
      return;
    }

    // Nodo declarado real (defensivo: el enum ya acota a los slugs del repo).
    const nodo = await prisma.nodos.findFirst({ where: { key: parsed.nodo_key } });
    if (!nodo) {
      res.status(404).json({ success: false, error: 'Nodo no encontrado' });
      return;
    }

    // La evidencia cita puntos críticos corroborados REALES del AMC
    // (VIG-011): clusters pc-* community_validated — nunca un puntaje.
    if (parsed.evidencia_cluster_keys !== undefined) {
      for (const ck of parsed.evidencia_cluster_keys) {
        const feature = await prisma.features.findFirst({ where: { id: ck, estado: 'community_validated' } });
        if (!feature) {
          res.status(400).json({
            success: false,
            error: 'evidencia_cluster_keys: cluster pc-* inexistente o sin validación comunitaria (VIG-011, #379)',
          });
          return;
        }
      }
    }

    // Idempotencia por hash: re-registrar el mismo pedido → 200 sin sello.
    const hash = createHash('sha256')
      .update(
        usuario.id +
          '|' +
          parsed.nodo_key +
          '|' +
          parsed.key +
          '|' +
          parsed.bloque +
          '|' +
          parsed.tema +
          '|' +
          parsed.fecha_presentacion
      )
      .digest('hex');
    const existente = await prisma.pedidos.findUnique({ where: { hash } });
    if (existente) {
      res.status(200).json({ success: true, data: publico(existente), idempotente: true });
      return;
    }

    let pedido;
    try {
      pedido = await prisma.pedidos.create({
        data: {
          nodo_key: parsed.nodo_key,
          key: parsed.key,
          bloque: parsed.bloque,
          tema: parsed.tema,
          destinatario: parsed.destinatario,
          fecha_presentacion: fechaUtc(parsed.fecha_presentacion),
          plazo_dias: parsed.plazo_dias,
          estado: 'presentado',
          evidencia_cluster_keys: parsed.evidencia_cluster_keys ?? [],
          created_by_hash: seudonimo(usuario.id),
          hash,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // 409 honesto: la key del pedido es única.
        res.status(409).json({ success: false, error: 'ya existe un pedido con esa key' });
        return;
      }
      throw err;
    }

    try {
      // Sello SIN PII y SIN tema (patrón VIG-011: el texto nunca al evento).
      await sellarEvento('pedido.presentado', {
        pedido_id: pedido.id,
        key: pedido.key,
        nodo_key: pedido.nodo_key,
        bloque: pedido.bloque,
        destinatario: pedido.destinatario,
        fecha_presentacion: parsed.fecha_presentacion,
        plazo_dias: pedido.plazo_dias,
        evidencia_cluster_keys: pedido.evidencia_cluster_keys,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay presentación acreditada.
      await prisma.pedidos.delete({ where: { id: pedido.id } }).catch(() => undefined);
      console.error('[pedidos] sellar presentación:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el pedido' });
      return;
    }

    res.status(201).json({ success: true, data: publico(pedido) });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[pedidos] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al registrar el pedido' });
  }
});

// POST /api/pedidos/:key/respuesta — registro de la respuesta del
// organismo (admin, acto institucional): fecha REAL (no futura, R15);
// el estado final lo DERIVA la ruta contra el plazo — en_plazo | tardío.
router.post('/:key/respuesta', requireJwt, requireRole('admin'), async (req: Request, res: Response) => {
  let parsed: z.infer<typeof PedidoRespuestaSchema>;
  try {
    parsed = PedidoRespuestaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  try {
    const pedido = (await prisma.pedidos.findFirst({ where: { key: req.params.key } })) as PedidoRow | null;
    if (!pedido) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (pedido.estado !== 'presentado') {
      res.status(409).json({ success: false, error: 'el pedido ya tiene respuesta registrada' });
      return;
    }
    if (fechaUtc(parsed.fecha_respuesta).getTime() > medianocheHoy().getTime()) {
      res.status(400).json({
        success: false,
        error: 'fecha de respuesta futura: la respuesta se registra cuando llega — nunca antes (R15, VIG-012)',
      });
      return;
    }
    if (parsed.nota !== undefined && detectaPII(parsed.nota) !== null) {
      res.status(400).json({ success: false, error: 'payload rechazado: contiene datos personales identificables' });
      return;
    }

    // Estado DERIVADO contra el plazo — nunca declarado a mano (R15).
    const fechaRespuesta = fechaUtc(parsed.fecha_respuesta);
    const estadoNuevo =
      fechaRespuesta.getTime() <= deadlineDe(pedido).getTime()
        ? 'respondido_en_plazo'
        : 'respondido_tardio';

    const actualizado = await prisma.pedidos.update({
      where: { id: pedido.id },
      data: { estado: estadoNuevo, respondido_en: fechaRespuesta, nota_respuesta: parsed.nota ?? null },
    });

    try {
      await sellarEvento('pedido.respondido', {
        pedido_id: actualizado.id,
        key: actualizado.key,
        estado_nuevo: estadoNuevo,
        fecha_respuesta: parsed.fecha_respuesta,
        plazo_dias: actualizado.plazo_dias,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay respuesta acreditada.
      await prisma.pedidos
        .update({
          where: { id: pedido.id },
          data: { estado: 'presentado', respondido_en: null, nota_respuesta: null },
        })
        .catch(() => undefined);
      console.error('[pedidos] sellar respuesta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la respuesta' });
      return;
    }

    res.status(201).json({ success: true, data: publico(actualizado) });
  } catch (err) {
    console.error('[pedidos] responder:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al registrar la respuesta' });
  }
});

// GET /api/pedidos?nodo=iglesia — tablero público de cobertura/fecha:
// «X de 15 presentados · Y respondidos (fecha de corte)» con el estado
// efectivo DERIVADO de cada fila ('sin_respuesta' nunca se almacena).
router.get('/', async (req: Request, res: Response) => {
  try {
    const nodo = typeof req.query.nodo === 'string' ? req.query.nodo : undefined;
    const rows = (await prisma.pedidos.findMany({
      where: nodo !== undefined ? { nodo_key: nodo } : {},
      orderBy: [{ fecha_presentacion: 'desc' }, { key: 'asc' }],
    })) as PedidoRow[];
    const hoy = medianocheHoy();
    let respondidosEnPlazo = 0;
    let respondidosTardio = 0;
    let sinRespuesta = 0;
    let enEspera = 0;
    const pedidosPublicos: Array<Record<string, unknown>> = [];
    for (const p of rows) {
      if (p.estado === 'presentado') {
        if (deadlineDe(p).getTime() < hoy.getTime()) sinRespuesta += 1;
        else enEspera += 1;
      } else if (p.estado === 'respondido_en_plazo') {
        respondidosEnPlazo += 1;
      } else if (p.estado === 'respondido_tardio') {
        respondidosTardio += 1;
      }
      pedidosPublicos.push({
        ...publico(p),
        estado_efectivo: estadoEfectivoDe(p, hoy),
        evidencia: await evidenciaAmpliada(p.evidencia_cluster_keys),
      });
    }
    const respondidos = respondidosEnPlazo + respondidosTardio;
    const fechaCorte = aFechaIso(hoy);
    const cobertura =
      rows.length + ' de ' + PEDIDOS_DPV_ESPERADOS + ' presentados · ' + respondidos + ' respondidos (corte ' + fechaCorte + ')';
    res.json({
      success: true,
      data: {
        esperados_documento: PEDIDOS_DPV_ESPERADOS,
        presentados: rows.length,
        respondidos,
        respondidos_en_plazo: respondidosEnPlazo,
        respondidos_tardio: respondidosTardio,
        sin_respuesta: sinRespuesta,
        en_espera: enEspera,
        fecha_corte: fechaCorte,
        cobertura,
        fuente: 'documento vecinal interno (procedencia declarada, sin firmantes — ADR-027)',
        pedidos: pedidosPublicos,
      },
      count: rows.length,
    });
  } catch (err) {
    console.error('[pedidos] tablero:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar el tablero de pedidos' });
  }
});

// GET /api/pedidos/:key — seguimiento público de un pedido: historial de
// transiciones DERIVADO de los sellos (ADR-038) — la línea de tiempo es
// la acreditación, nunca el estado puntual de la fila.
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const pedido = (await prisma.pedidos.findFirst({ where: { key: req.params.key } })) as PedidoRow | null;
    if (!pedido) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    const sellos = (await prisma.events_raw.findMany({
      where: {
        type: { in: ['pedido.presentado', 'pedido.respondido'] },
        payload: { path: ['key'], equals: pedido.key },
      },
      orderBy: { occurred_at: 'asc' },
    })) as SelloRow[];
    const transiciones = sellos.map((s) => {
      const p = s.payload as Record<string, unknown>;
      return {
        estado_nuevo: (p.estado_nuevo as string | undefined) ?? 'presentado',
        occurred_at: s.occurred_at.toISOString(),
      };
    });
    res.json({
      success: true,
      data: {
        ...publico(pedido),
        estado_efectivo: estadoEfectivoDe(pedido, medianocheHoy()),
        evidencia: await evidenciaAmpliada(pedido.evidencia_cluster_keys),
        transiciones,
      },
    });
  } catch (err) {
    console.error('[pedidos] detalle:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al leer el pedido' });
  }
});

export default router;

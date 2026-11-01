import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { ReporteAltaSchema, ReporteDuplicadoSugeridoSchema, ReporteEstadoCambioSchema, REPORTE_TRANSICIONES } from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio reportes — CORE-005 R2 (#206): escritura ciudadana de reportes.
 *
 * Flujo: ciudadano autenticado reporta (POST, estado 'received' del
 * ReporteEstadoSchema de R1) → moderación transita con justificación
 * pública (R3, ADR-038) → historial derivado de los sellos (R4). La
 * lectura pública ya vive en GET /api/nodos/:key/reportes (CORE-003 R1).
 *
 * Pseudonimización (Ley 25.326, ADR-027): el autor nunca queda identificado —
 * created_by_hash = sha256(usuario_id) truncado. La descripción pasa el
 * anti-PII compartido ANTES de persistir (ADR-020 cond. 1, mismo criterio
 * que el resto de la escritura ciudadana).
 *
 * Sello en events_raw (R4/R15): toda escritura queda acreditada en la fuente
 * de verdad con un evento 'reporte.recibido' sin PII. Si el sello falla, la
 * escritura se revierte — nunca un reporte persistido sin su evento.
 *
 * Idempotencia por hash único (patrón activos/fichas): el mismo ciudadano
 * reintentando el mismo reporte (nodo + categoría + descripción + punto)
 * recibe 200 con el reporte ya existente — sin sello nuevo, sin duplicar.
 *
 * Duplicados sugeridos (CORE-005 R5, ADR-039): la respuesta del alta (y su
 * reintento idempotente) incluye duplicados_sugeridos — reportes abiertos
 * reales del mismo nodo dentro del radio, con ST_DWithin sobre reportes.geom.
 * Es una sugerencia de lectura: NADA se fusiona, persiste o sella; la
 * decisión de marcar duplicado es humana, con sello (ADR-039).
 */
const router: Router = Router();

// Filas tipadas de las lecturas: el cliente prisma se exporta `any` (patron
// mock de pruebas en lib/prisma), asi que la forma de las filas se declara
// explicita para que los callbacks de map queden contextualmente tipados
// (mismo patron que fuentes.ts - fix TS7006 del PR #151).
type ReporteRow = {
  id: string;
  nodo_id: string;
  categoria: string;
  descripcion: string;
  estado: string;
  lat: number | null;
  lng: number | null;
  created_at: Date;
};
type NodoRow = { id: string; key: string };
type SelloRow = { payload: unknown; occurred_at: Date };

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

// R5 (#206, ADR-039): duplicados sugeridos por proximidad — SUGERENCIA en la
// respuesta del alta, nunca una fusión automática. Solo reportes abiertos
// (received|evaluating|in_progress — resolved y descartado son terminales y
// dejan de ser sugeribles) del mismo nodo, y solo reales (is_synthetic =
// false: el demo nunca es duplicado de un reporte ciudadano). Doble filtro
// espacial: pre-caja en grados sobre el índice GiST de reportes.geom (cota
// superior — 1° de latitud ≈ 111 320 m, cubre el círculo en ambas
// dimensiones) y distancia exacta en metros con el cast a geography. El
// radio es configurable (REPORTES_DUPLICADOS_RADIO_M, default 100 m). La
// consulta NO persiste, NO sella y NO muta nada (ADR-039: la decisión de
// marcar duplicado es humana, con sello).
const RADIO_DUPLICADOS_CONFIGURADO = Number(process.env.REPORTES_DUPLICADOS_RADIO_M ?? '100');
const RADIO_DUPLICADOS_M =
  Number.isFinite(RADIO_DUPLICADOS_CONFIGURADO) && RADIO_DUPLICADOS_CONFIGURADO > 0
    ? RADIO_DUPLICADOS_CONFIGURADO
    : 100;

type DuplicadoRow = {
  id: string;
  categoria: string;
  estado: 'received' | 'evaluating' | 'in_progress';
  lat: number | null;
  lng: number | null;
  distancia_m: number | null;
  created_at: Date;
};

async function sugerirDuplicados(
  nodoId: string,
  reporteId: string,
  lat: number | null,
  lng: number | null
): Promise<z.infer<typeof ReporteDuplicadoSugeridoSchema>[]> {
  if (lat === null || lng === null) return [];
  const radioGrados = RADIO_DUPLICADOS_M / 111320;
  const rows = (await prisma.$queryRaw`
    SELECT id, categoria, estado, lat, lng,
      ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distancia_m,
      created_at
    FROM reportes
    WHERE nodo_id = ${nodoId}
      AND estado IN ('received', 'evaluating', 'in_progress')
      AND is_synthetic = false
      AND id <> ${reporteId}
      AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), ${radioGrados})
      AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${RADIO_DUPLICADOS_M})
    ORDER BY distancia_m ASC
    LIMIT 5
  `) as DuplicadoRow[];
  return rows.map((r) => ({
    id: r.id,
    categoria: r.categoria,
    estado: r.estado,
    lat: r.lat,
    lng: r.lng,
    distancia_m: r.distancia_m === null ? null : Number(r.distancia_m),
    created_at: r.created_at.toISOString(),
  }));
}

// POST /api/reportes — alta ciudadana (requireJwt): todo usuario con sesión
// puede reportar; el reporte nace 'received', nunca un estado resuelto.
router.post('/', requireJwt, async (req: Request, res: Response) => {
  let parsed: z.infer<typeof ReporteAltaSchema>;
  try {
    parsed = ReporteAltaSchema.parse(req.body);
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
    categoria: parsed.categoria,
    descripcion: parsed.descripcion,
  });
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);

  // Idempotencia por hash único: mismo ciudadano + mismo reporte → una sola
  // fila (patrón activos/fichas). El hash nunca contiene PII (sha256).
  const hash = createHash('sha256')
    .update(
      usuario.id + '|' + parsed.nodo_key + '|' + parsed.categoria + '|' +
      parsed.descripcion + '|' + parsed.lat + '|' + parsed.lng
    )
    .digest('hex');

  try {
    // El nodo declarado debe existir (404) y la categoría pertenecer a su
    // vocabulario real (400) — el contexto territorial no se acepta por
    // confianza (tabla categorias del CORE-003, no un enum libre).
    const nodo = await prisma.nodos.findFirst({ where: { key: parsed.nodo_key } });
    if (nodo === null) {
      res.status(404).json({ success: false, error: 'Nodo no encontrado' });
      return;
    }
    const categoria = await prisma.categorias.findFirst({
      where: { code: parsed.categoria, nodo_id: nodo.id },
    });
    if (categoria === null) {
      res.status(400).json({ success: false, error: 'categoría inexistente en el vocabulario del nodo' });
      return;
    }

    const reporte = await prisma.reportes.create({
      data: {
        nodo_id: nodo.id,
        categoria: parsed.categoria,
        descripcion: parsed.descripcion,
        estado: 'received',
        lat: parsed.lat,
        lng: parsed.lng,
        is_synthetic: false, // el reporte ciudadano es registro comunitario real
        hash,
        created_by_hash: autor,
      },
    });

    // Sello del sistema: 'reporte.recibido' sin PII — el payload lleva ids y
    // estados; el texto del ciudadano vive solo en la tabla reportes.
    try {
      await sellarEvento('reporte.recibido', {
        reporte_id: reporte.id,
        nodo_key: parsed.nodo_key,
        categoria: parsed.categoria,
        estado: reporte.estado,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.reportes.delete({ where: { id: reporte.id } }).catch(() => undefined);
      console.error('[reportes] sellar alta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el reporte' });
      return;
    }

    // R5 (ADR-039): la sugerencia vive SOLO en esta respuesta — sin
    // persistencia, sin sello, sin fusión. Fail-open honesto: si la consulta
    // falla, el alta YA está acreditada (reporte + sello); se responde con
    // duplicados_verificados: false en vez de un 500 tras una escritura
    // comprometida (el reintento del cliente caería en idempotencia sin
    // recuperar la sugerencia). false ≠ "sin duplicados" (R15: nunca se
    // declara un vacío no verificado).
    let duplicadosSugeridos: z.infer<typeof ReporteDuplicadoSugeridoSchema>[] = [];
    let duplicadosVerificados = true;
    try {
      duplicadosSugeridos = await sugerirDuplicados(nodo.id, reporte.id, parsed.lat, parsed.lng);
    } catch (err) {
      duplicadosVerificados = false;
      console.error('[reportes] sugerir duplicados:', err instanceof Error ? err.message : String(err));
    }

    res.status(201).json({
      success: true,
      data: reporte,
      duplicados_sugeridos: duplicadosSugeridos,
      duplicados_verificados: duplicadosVerificados,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Reintento idempotente del mismo ciudadano: 200 con el reporte ya
      // existente — sin sello nuevo (R4: una escritura, un evento).
      const existente = await prisma.reportes.findUnique({ where: { hash } });
      if (existente !== null) {
        // R5 (ADR-039): la sugerencia acompaña también al reintento
        // idempotente — mismo cálculo de lectura, sin escritura nueva.
        let sugeridos: z.infer<typeof ReporteDuplicadoSugeridoSchema>[] = [];
        let verificados = true;
        try {
          sugeridos = await sugerirDuplicados(existente.nodo_id, existente.id, existente.lat, existente.lng);
        } catch (err) {
          verificados = false;
          console.error('[reportes] sugerir duplicados (idempotente):', err instanceof Error ? err.message : String(err));
        }
        res.status(200).json({
          success: true,
          data: existente,
          idempotente: true,
          duplicados_sugeridos: sugeridos,
          duplicados_verificados: verificados,
        });
        return;
        return;
      }
    }
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[reportes] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el reporte' });
  }
});

// PATCH /api/reportes/:id/estado — moderación transparente (R3, #206 —
// ADR-038): moderador|admin transita el ciclo con justificación pública
// OBLIGATORIA por transición (el contrato R1 la exige >=10 chars → 400 sin
// ella). La validez del salto la decide la matriz compartida
// REPORTE_TRANSICIONES: la moderación no inventa caminos (400 salto fuera
// de la matriz; 409 si no hay transición — mismo estado). La justificación
// pasa el anti-PII ANTES de sellarla (sin eco del valor). Sello
// 'reporte.estado_cambiado' con el ciclo completo {estado_anterior,
// estado_nuevo, justificacion, moderador_hash} — sin sello no hay
// transición acreditada: rollback del estado si falla (R4/R15).
router.patch('/:id/estado', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const reporteId = req.params.id;

  let parsed: z.infer<typeof ReporteEstadoCambioSchema>;
  try {
    parsed = ReporteEstadoCambioSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre la justificación pública
  // ANTES de sellarla — rechazo genérico, sin eco del valor.
  const pii = detectaPII(parsed.justificacion);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  try {
    const reporte = await prisma.reportes.findUnique({ where: { id: reporteId } });
    if (reporte === null) {
      res.status(404).json({ success: false, error: 'reporte no encontrado' });
      return;
    }

    // Sin transición no hay evento (patrón activos/productos): repetir el
    // mismo estado → 409.
    if (reporte.estado === parsed.estado) {
      res.status(409).json({ success: false, error: "el reporte ya está en estado '" + parsed.estado + "'" });
      return;
    }

    // Matriz del ciclo (ADR-038): la ruta decide contra REPORTE_TRANSICIONES
    // — un salto fuera de la matriz es inválido (400), la moderación no
    // inventa caminos. resolved y descartado son terminales en v1.
    const permitidas = REPORTE_TRANSICIONES[reporte.estado as keyof typeof REPORTE_TRANSICIONES] ?? [];
    if (!permitidas.includes(parsed.estado)) {
      res.status(400).json({
        success: false,
        error: "transición inválida: '" + reporte.estado + "' → '" + parsed.estado + "' no está en la matriz del ciclo (ADR-038)",
      });
      return;
    }

    const nodo = await prisma.nodos.findUnique({ where: { id: reporte.nodo_id } });
    const actualizado = await prisma.reportes.update({
      where: { id: reporteId },
      data: { estado: parsed.estado },
    });

    const moderadorHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      // Sello del sistema: el ciclo completo queda acreditado en la fuente
      // de verdad — de aquí derivará el historial público (R4, ADR-038).
      await sellarEvento('reporte.estado_cambiado', {
        reporte_id: reporteId,
        nodo_key: nodo?.key ?? null,
        categoria: reporte.categoria,
        estado_anterior: reporte.estado,
        estado_nuevo: parsed.estado,
        justificacion: parsed.justificacion,
        moderador_hash: moderadorHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay transición acreditada.
      await prisma.reportes.update({ where: { id: reporteId }, data: { estado: reporte.estado } }).catch(() => undefined);
      console.error('[reportes] sellar cambio de estado:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el cambio de estado' });
      return;
    }

    res.json({ success: true, data: actualizado });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[reportes] cambiar estado:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al cambiar el estado' });
  }
});

// GET /mios — suscripción del reportero (R4, #206): los reportes del
// ciudadano por pseudónimo (created_by_hash — nunca PII, Ley 25.326),
// con estado y las justificaciones de cada transición (ADR-038). El
// reportero ve el ciclo completo, incluido el reporte descartado (que
// nunca es publicable): la transparencia del propio reclamo es suya.
router.get('/mios', requireJwt, async (req: Request, res: Response) => {
  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);
  try {
    const rows = (await prisma.reportes.findMany({
      where: { created_by_hash: autor },
      orderBy: { created_at: 'desc' },
    })) as ReporteRow[];

    // Historial derivado de events_raw (única fuente de verdad, ADR-032/
    // ADR-038): cada reporte lleva sus transiciones selladas con
    // justificación — nunca una tabla mutable de historial.
    const nodoIds = [...new Set(rows.map((r) => r.nodo_id))];
    const nodosRows = (await prisma.nodos.findMany({ where: { id: { in: nodoIds } } })) as NodoRow[];
    const nodoPorId = new Map(nodosRows.map((n) => [n.id, n.key]));

    const data = [];
    for (const r of rows) {
      const sellos = (await prisma.events_raw.findMany({
        where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: r.id } },
        orderBy: { occurred_at: 'asc' },
      })) as SelloRow[];
      data.push({
        id: r.id,
        nodo_key: nodoPorId.get(r.nodo_id) ?? null,
        categoria: r.categoria,
        descripcion: r.descripcion,
        estado: r.estado,
        lat: r.lat,
        lng: r.lng,
        created_at: r.created_at,
        transiciones: sellos.map((s) => {
          const p = s.payload as Record<string, unknown>;
          return {
            estado_anterior: p.estado_anterior,
            estado_nuevo: p.estado_nuevo,
            justificacion: p.justificacion,
            moderador_hash: p.moderador_hash,
            occurred_at: s.occurred_at.toISOString(),
          };
        }),
      });
    }

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[reportes] mios:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al listar los reportes del ciudadano' });
  }
});

// GET /:id/historial — historial público del reporte (R4, #206 — ADR-038):
// transparencia del ciclo de vida derivada de los sellos reporte.estado_cambiado
// en events_raw (única fuente de verdad — el historial es inmutable porque el
// registro es append-only; NUNCA una tabla mutable). 'descartado' nunca es
// publicable (ReporteEstadoPublicoFiltroSchema): su historial queda para el
// reportero en /mios. Reporte sin transiciones aún → transiciones vacías,
// honesto (R15).
router.get('/:id/historial', async (req: Request, res: Response) => {
  const reporteId = req.params.id;
  try {
    const reporte = await prisma.reportes.findUnique({ where: { id: reporteId } });
    if (reporte === null || reporte.estado === 'descartado') {
      res.status(404).json({ success: false, error: 'reporte no encontrado' });
      return;
    }

    // 1:1 con los sellos: una transición, un evento (EV-054).
    const sellos = (await prisma.events_raw.findMany({
      where: { type: 'reporte.estado_cambiado', payload: { path: ['reporte_id'], equals: reporteId } },
      orderBy: { occurred_at: 'asc' },
    })) as SelloRow[];
    const transiciones = sellos.map((s) => {
      const p = s.payload as Record<string, unknown>;
      return {
        estado_anterior: p.estado_anterior,
        estado_nuevo: p.estado_nuevo,
        justificacion: p.justificacion,
        moderador_hash: p.moderador_hash,
        occurred_at: s.occurred_at.toISOString(),
      };
    });

    res.json({ success: true, data: { reporte_id: reporteId, transiciones } });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[reportes] historial:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener el historial' });
  }
});

export default router;

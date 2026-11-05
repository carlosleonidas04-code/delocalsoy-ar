import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { Prisma } from '@delocalsoy/db';
import { AskPreguntaSchema, SubnodoFiltroSchema } from '@delocalsoy/contracts';

/**
 * Rutas de lectura del vocabulario CORE-002 (CORE-003 R1, #83).
 *
 * GET públicos (mismo criterio que GET /api/territorios): el vocabulario del
 * demo federado (nodos/capas/categorias/features/reportes) se sirve sin
 * autenticación. No hay escrituras nuevas — los reportes del demo siguen
 * siendo de sesión (frontend) hasta que exista una ruta de ingesta con guard
 * R8 (deuda declarada en ADR-030).
 */
const router: Router = Router();

/** Nodo por key ('capital' | 'caucete' | 'iglesia'); null si no existe. */
async function nodoPorKey(key: string): Promise<any> {
  return prisma.nodos.findFirst({ where: { key } });
}

// GET /nodos - listar todos los nodos federados (con población y centro reales)
router.get('/', async (_req, res: Response) => {
  try {
    const nodos = await prisma.nodos.findMany({ orderBy: { key: 'asc' } });
    res.json({ success: true, data: nodos, count: nodos.length });
  } catch (error) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[nodos] listar:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener nodos' });
  }
});

// GET /nodos/:key - un nodo por key
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    res.json({ success: true, data: nodo });
  } catch (error) {
    console.error('[nodos] por key:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener nodo' });
  }
});

// GET /nodos/:key/capas - catálogo explícito de capas del nodo
router.get('/:key/capas', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const capas = await prisma.capas.findMany({
      where: { nodo_id: nodo.id },
      orderBy: { key: 'asc' },
    });
    res.json({ success: true, data: capas, count: capas.length });
  } catch (error) {
    console.error('[nodos] capas:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener capas' });
  }
});

// GET /nodos/:key/categorias - categorías de reporte (layer = capa.key)
router.get('/:key/categorias', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const rows = await prisma.categorias.findMany({
      where: { nodo_id: nodo.id },
      include: { capa: true },
      orderBy: { code: 'asc' },
    });
    const data = rows.map((c: any) => ({
      id: c.id,
      code: c.code,
      label: c.label,
      layer: c.capa?.key ?? '',
    }));
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('[nodos] categorías:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener categorías' });
  }
});

// GET /nodos/:key/features - features del nodo (domain heredado de la capa)
router.get('/:key/features', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const rows = await prisma.features.findMany({
      where: { nodo_id: nodo.id },
      include: { capa: true },
      orderBy: { titulo: 'asc' },
    });
    const data = rows.map((f: any) => ({
      id: f.id,
      layer: f.capa?.key ?? '',
      domain: f.capa?.dominio ?? '',
      titulo: f.titulo,
      tipo: f.tipo,
      estado: f.estado,
      fuente_label: f.fuente_label,
      observado_at: f.observado_at,
      lat: f.lat,
      lng: f.lng,
      is_synthetic: f.is_synthetic,
    }));
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('[nodos] features:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener features' });
  }
});

// GET /nodos/:key/reportes - reportes del nodo (flujo received → resolved)
// 'descartado' nunca es publicable (CORE-005 R4, ADR-038): el listado
// publico del nodo lo excluye; el reportero lo sigue viendo en su
// suscripcion GET /api/reportes/mios.
router.get('/:key/reportes', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const rows = await prisma.reportes.findMany({
      // 'descartado' nunca es publicable (CORE-005 R4, ADR-038): el listado
      // publico lo excluye; el reportero lo ve en GET /api/reportes/mios.
      where: { nodo_id: nodo.id, estado: { not: 'descartado' } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('[nodos] reportes:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener reportes' });
  }
});


// GET /nodos/:key/subnodos - jerarquía territorial del nodo (VIG-001, #171,
// épica #167): distritos → parajes → subparajes + localidades INDEC. Lectura
// pública con filtros ?type= (district|paraje|subparaje|locality) y
// ?parent=<key>|none (none = hijos directos del nodo, p.ej. alta cordillera).
// lat/lng solo cuando hay punto público (BAHRA/Georef) — null es honesto (R15).
router.get('/:key/subnodos', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const parsed = SubnodoFiltroSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Filtros inválidos (type, parent)' });
    }
    const where: any = { nodo_key: nodo.key };
    if (parsed.data.type) where.type = parsed.data.type;
    if (parsed.data.parent !== undefined) {
      where.parent_key = parsed.data.parent === 'none' ? null : parsed.data.parent;
    }
    const rows = await prisma.subnodos.findMany({
      where,
      orderBy: [{ type: 'asc' }, { key: 'asc' }],
    });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('[nodos] subnodos:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener subnodos' });
  }
});

// GET /nodos/:key/kpis - KPIs materializados del nodo (VIG-003, #182, épica
// #167): lectura pública anónima del set honesto v1 (9 KPIs, kpi_snapshots)
// que el consumidor vig003-kpi del worker re-computa desde el dominio
// (upsert idempotente por nodo_key+kpi_key — nunca incrementos). El nodo
// inexistente es 404 (R15); count 0 es honesto: nodo sin snapshots aún.
router.get('/:key/kpis', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const rows = await prisma.kpi_snapshots.findMany({
      where: { nodo_key: nodo.key },
      orderBy: { kpi_key: 'asc' },
    });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('[nodos] kpis:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener KPIs' });
  }
});


// GET /nodos/:key/accesibilidad - dashboard público de accesibilidad
// peatonal (NODO-CAPITAL NCAP-R5, #157 — épica #152): conteos CON cobertura
// y fecha, NUNCA puntajes globales (R5/ADR-036 — «82% de los tramos
// relevados cumple (cobertura: 14 de 120)», jamás «accesibilidad del
// Centro: 82%»). Dominio movilidad del nodo: accessibility (puntos:
// rampas/cruces/obstáculos — cada registro con fecha+método+estado de
// revisión) + sidewalks (tramos). Los tramos priorizados provienen del
// anuncio municipal de repavimentación microcentro 2026 (fuente
// repavimentacion_microcentro_2026, ADR-035) y nacen 'declared' — anuncio
// ≠ obra: el estado por tramo exige verificación municipal (R15); el
// relevamiento real los moverá a community_validated | verified. Lectura
// pública anónima; 404 nodo inexistente (R15).
router.get('/:key/accesibilidad', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const [feats, hitos, reportes] = await Promise.all([
      prisma.features.findMany({ where: { nodo_id: nodo.id }, include: { capa: true } }),
      prisma.corredor_hitos.findMany({ where: { nodo_key: nodo.key }, orderBy: { key: 'asc' } }),
      prisma.reportes.findMany({
        where: { nodo_id: nodo.id, estado: { not: 'descartado' } },
        select: { categoria: true },
      }),
    ]);
    const mov = feats.filter((f: any) => f.capa?.key === 'accessibility' || f.capa?.key === 'sidewalks');

    // features del dominio movilidad por capa/estado y por fuente
    const porCapa = new Map<string, { capa: string; total: number; por_estado: Record<string, number> }>();
    const porFuente = new Map<string, number>();
    for (const f of mov) {
      const capaKey = (f.capa?.key as string) ?? '';
      if (!porCapa.has(capaKey)) {
        porCapa.set(capaKey, { capa: capaKey, total: 0, por_estado: {} });
      }
      const entry = porCapa.get(capaKey)!;
      entry.total += 1;
      const est = f.estado as string;
      entry.por_estado[est] = (entry.por_estado[est] ?? 0) + 1;
      const fuente = f.fuente_label as string;
      porFuente.set(fuente, (porFuente.get(fuente) ?? 0) + 1);
    }
    const porCategoria = new Map<string, number>();
    for (const r of reportes) {
      porCategoria.set(r.categoria, (porCategoria.get(r.categoria) ?? 0) + 1);
    }

    // Tramos de vereda priorizados (convención seed-f-tramo-* de NCAP-R5
    // v1): 'declared' = anuncio sin verificación; el relevamiento los
    // mueve a community_validated | verified.
    const tramos = mov.filter(
      (f: any) => f.capa?.key === 'sidewalks' && typeof f.id === 'string' && f.id.startsWith('seed-f-tramo-')
    );
    const priorizados = tramos.filter((f: any) => f.estado === 'declared').length;
    const relevados = tramos.filter(
      (f: any) => f.estado === 'community_validated' || f.estado === 'verified'
    ).length;
    const fechasTramos = tramos
      .map((f: any) => new Date(f.observado_at).getTime())
      .sort((a: number, b: number) => b - a);
    const fechaCorteTramos = fechasTramos.length > 0 ? new Date(fechasTramos[0]).toISOString() : null;

    // Observaciones de accesibilidad (capa accessibility) por estado de
    // revisión: ingresadas (pending), revisadas (community_validated),
    // corroboradas (verified), disputadas (disputed); synthetic_demo son
    // las ilustrativas del vocabulario NCAP-R1.
    const acc = mov.filter((f: any) => f.capa?.key === 'accessibility');
    const observaciones: Record<string, number> = {
      ingresadas: 0,
      revisadas: 0,
      corroboradas: 0,
      disputadas: 0,
      ilustrativas: 0,
    };
    let fechaObsMax = 0;
    for (const f of acc) {
      const est = f.estado as string;
      if (est === 'pending') observaciones.ingresadas += 1;
      else if (est === 'community_validated') observaciones.revisadas += 1;
      else if (est === 'verified') observaciones.corroboradas += 1;
      else if (est === 'disputed') observaciones.disputadas += 1;
      else observaciones.ilustrativas += 1;
      const t = new Date(f.observado_at).getTime();
      if (t > fechaObsMax) fechaObsMax = t;
    }

    // Hitos del catálogo global con ficha (feature landmarks 1:1 por id
    // seed-f-<hito_key>, NCAP-R1) y fecha de última revisión de la ficha.
    const hitosData = hitos.map((h: any) => {
      const ficha = feats.find((f: any) => f.id === 'seed-f-' + h.key);
      return {
        key: h.key,
        label: h.label,
        tipo: h.tipo,
        con_ficha: Boolean(ficha),
        ultima_revision: ficha ? new Date((ficha as any).observado_at).toISOString() : null,
      };
    });

    res.json({
      success: true,
      data: {
        nodo_key: nodo.key,
        generado_en: new Date().toISOString(),
        regla: 'Conteos con cobertura y fecha — jamás puntajes globales (R5/ADR-036)',
        features_por_capa: Array.from(porCapa.values()),
        features_por_fuente: Array.from(porFuente.entries()).map(([fuente, total]) => ({ fuente, total })),
        reportes_por_categoria: Array.from(porCategoria.entries()).map(([categoria, total]) => ({ categoria, total })),
        tramos_vereda: {
          priorizados,
          con_relevamiento: relevados,
          cobertura:
            relevados + ' de ' + (priorizados + relevados) + ' tramos priorizados cuentan con relevamiento',
          fecha_corte: fechaCorteTramos,
          cautela:
            'Anuncio municipal de repavimentación microcentro 2026 (fuente repavimentacion_microcentro_2026): anuncio ≠ obra — el estado por tramo exige verificación municipal (R15)',
        },
        observaciones: {
          ...observaciones,
          fecha_corte: fechaObsMax > 0 ? new Date(fechaObsMax).toISOString() : null,
        },
        hitos: hitosData,
      },
    });
  } catch (error) {
    console.error('[nodos] accesibilidad:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al obtener el dashboard de accesibilidad' });
  }
});

// POST /nodos/:key/ask - consulta territorial ética (VIG-006, #188, épica
// #167): recuperación full-text NATIVA de PostgreSQL sobre rag_index
// (tsvector 'spanish' generado + GIN, migración 20261014230000) y respuesta
// Dato–Interpretación–Sugerencia SIN LLM (decisión DH ratificada
// 2026-10-14): la interpretación y la sugerencia son PLANTILLAS
// AUTORIZADAS del dominio dominante — nada generado; sin fragmentos son
// null honesto (R15). Público anónimo (mismo criterio que GET /kpis); toda
// respuesta nace human_review 'pending' (revisión humana habilitada). El
// índice solo contiene prosa autorizada: restricted y sensible JAMÁS
// llegan acá (ADR-036, VIG-004). El 500 es sanitizado (AUD-06).
router.post('/:key/ask', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const parsed = AskPreguntaSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Pregunta inválida (3-300 caracteres; subnodo y n1 opcionales)' });
    }
    const pregunta = parsed.data.pregunta;
    const subnodo = parsed.data.subnodo;
    const n1 = parsed.data.n1;

    // Recuperación full-text sobre rag_index (idioma español). Los filtros
    // opcionales acotan por subnodo o por capital N1 primaria de activos
    // aprobados no restricted (ADR-036).
    const conditions: Array<any> = [
      Prisma.sql`nodo_key = ${nodo.key}`,
      Prisma.sql`search @@ websearch_to_tsquery('spanish', ${pregunta})`,
    ];
    if (subnodo) {
      conditions.push(Prisma.sql`subnodo_key = ${subnodo}`);
    }
    if (n1) {
      conditions.push(
        Prisma.sql`source_type = 'activo' AND source_id IN (SELECT c.activo_id FROM activos_clasificaciones c JOIN activos a ON a.id = c.activo_id WHERE c.is_primary = true AND c.n1 = ${n1} AND a.nodo_key = ${nodo.key} AND a.estado = 'aprobado' AND a.visibilidad <> 'restricted')`
      );
    }
    const rows: Array<{ source_type: string; source_id: string; subnodo_key: string | null; texto: string; fuentes: Array<{ fuente: string; fecha?: string }> | null }> = (await prisma.$queryRaw(
      Prisma.sql`SELECT source_type, source_id, subnodo_key, texto, fuentes FROM rag_index WHERE ${Prisma.join(conditions, ' AND ')} ORDER BY ts_rank(search, websearch_to_tsquery('spanish', ${pregunta})) DESC LIMIT 8`
    )) as any;

    const dato = rows.map((r) => ({
      source_type: r.source_type,
      source_id: r.source_id,
      subnodo_key: r.subnodo_key,
      texto: r.texto,
      fuentes: r.fuentes ?? [],
    }));

    // Dominio dominante: N1 primaria más frecuente de los activos
    // recuperados; si solo hay subnodos/KPIs → 'territorial'. Sin
    // fragmentos → null honesto (R15).
    const activoIds = dato.filter((f) => f.source_type === 'activo').map((f) => f.source_id);
    const conteo: Record<string, number> = { patrimonial: 0, productivo_rural: 0, turistico: 0 };
    if (activoIds.length > 0) {
      const clasifs = await prisma.activos_clasificaciones.findMany({
        where: { activo_id: { in: activoIds }, is_primary: true },
        select: { n1: true },
      });
      for (const c of clasifs) {
        if (c.n1 in conteo) conteo[c.n1] += 1;
      }
    }
    let dominio: 'patrimonial' | 'productivo_rural' | 'turistico' | 'territorial' | null = null;
    const n = dato.length;
    if (n > 0) {
      const mejor = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
      dominio = mejor[1] > 0 ? (mejor[0] as 'patrimonial' | 'productivo_rural' | 'turistico') : 'territorial';
    }

    // Plantillas autorizadas v1 (nada generado — decisión DH): texto fijo
    // relleno con el recuento de fragmentos y el titular del principal.
    const titular = n > 0 ? dato[0].texto.split('.')[0] : null;
    let interpretacion: string | null = null;
    let sugerencia: string | null = null;
    if (n > 0 && dominio !== null) {
      if (dominio === 'patrimonial') {
        interpretacion =
          'La consulta recupera ' + n + ' fragmento(s) del dominio patrimonial — el principal es «' + titular + '». Plantilla autorizada (sin LLM): la protección declarada es registro público y el acceso se rige por las reglas publicadas del activo.';
        sugerencia =
          'Revise la ficha patrimonial pública (GET /api/patrimonio/:activoId) y sus reglas de acceso antes de planificar cualquier visita.';
      } else if (dominio === 'productivo_rural') {
        interpretacion =
          'La consulta recupera ' + n + ' fragmento(s) del dominio productivo rural — el principal es «' + titular + '». Plantilla autorizada (sin LLM): la producción se acredita por procedencia trazable (ADR-035), nunca por estimaciones.';
        sugerencia =
          'Para compra o cooperación, verifique el catálogo de productos del territorio y su temporada declarada.';
      } else if (dominio === 'turistico') {
        interpretacion =
          'La consulta recupera ' + n + ' fragmento(s) del dominio turístico — el principal es «' + titular + '». Plantilla autorizada (sin LLM): la operativa se publica en su estado honesto — unknown es sin dato verificado (R15).';
        sugerencia =
          'Antes de viajar, confirme horario y temporada en la operativa del activo, y las condiciones de acceso cuando el activo sea patrimonial.';
      } else {
        interpretacion =
          'La consulta recupera ' + n + ' fragmento(s) de estructura territorial o KPIs del nodo ' + nodo.key + ' — prosa autorizada derivada del dominio publicado (sin LLM).';
        sugerencia =
          'Para profundizar, consulte GET /api/nodos/' + nodo.key + '/subnodos y GET /api/nodos/' + nodo.key + '/kpis.';
      }
    }

    // confidence DERIVADO de la cobertura de fuentes (nunca declarado).
    const conFuente = dato.filter((f) => f.fuentes.length > 0).length;
    const confidence = n === 0 ? 0 : conFuente / n;

    // Fuentes deduplicadas por fuente+fecha.
    const vistas = new Set<string>();
    const fuentes: Array<{ fuente: string; fecha?: string }> = [];
    for (const f of dato) {
      for (const fuente of f.fuentes) {
        const clave = fuente.fuente + '|' + (fuente.fecha ?? '');
        if (!vistas.has(clave)) {
          vistas.add(clave);
          fuentes.push(fuente);
        }
      }
    }

    res.json({
      success: true,
      data: {
        nodo_key: nodo.key,
        pregunta,
        dato,
        dominio,
        interpretacion,
        sugerencia,
        fuentes,
        confidence,
        recovered: n,
        human_review: 'pending',
      },
    });
  } catch (error) {
    // AUD-06: el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[nodos] ask:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Error al procesar la consulta' });
  }
});
export default router;

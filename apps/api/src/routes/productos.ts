import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { ProductoAltaSchema, ProductoEdicionSchema, ProductoEstadoCambioSchema, ProductoFiltroSchema, TAXONOMIA_CANONICA_DELOCALSOY, TAXONOMIA_DIRECTORIO_CANONICA } from '@delocalsoy/contracts';
import { detectaPII } from '../lib/anti-pii.js';
import { requireJwt, requireRole } from '../lib/auth.js';

/**
 * Dominio producción y turismo — NODO-VIG VIG-005 (NVIG-R7 #174, épica #167).
 *
 * "Producción visible, turista informado": catálogo de productos del
 * territorio (1:N con activos — Opción A ratificada por la DH 2026-10-14,
 * traza #174 comment 6160361362) y operativa del activo (1:1: horario,
 * temporada, capacidad, seguridad y habilitación). La semilla siembra 0
 * productos: solo se publica lo verificado (la producción por distrito queda
 * como vacío declarado).
 *
 * Alta ciudadana autenticada con moderación: el producto nace 'propuesto'
 * (la propuesta es registro comunitario, nunca publicada como verificado);
 * 'aprobado' lo publica la moderación (moderador|admin) y 'archivado' retira
 * del catálogo vivo sin borrar la historia — el sello producto.estado_cambiado
 * queda como única acreditación (events_raw, R4/R15). Autor = pseudónimo
 * sha256(usuario_id) truncado — sin PII (Ley 25.326, ADR-027).
 *
 * ADR-036: la visibilidad 'restricted' queda excluida de toda lectura pública,
 * sin excepción ratificada (traza #174): ni el catálogo ni la operativa
 * confirman su existencia — 404 sin eco. capacity_status 'unknown' se publica
 * tal cual (R15): nunca se inventa un aforo que las fuentes no verifican.
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

// GET /api/activos/:id/productos — catálogo del activo (público anónimo).
// Visible: propuesto|aprobado (la propuesta es registro comunitario);
// rechazado|archivado nunca se publican.
router.get('/activos/:id/productos', async (req: Request, res: Response) => {
  try {
    const activo = await prisma.activos.findUnique({ where: { id: req.params.id } });
    if (activo === null || activo.visibilidad === 'restricted') {
      // ADR-036 sin excepción ratificada: restricted ni siquiera confirma
      // existencia — 404 sin eco.
      res.status(404).json({ success: false, error: 'activo no encontrado' });
      return;
    }
    const productos = await prisma.productos.findMany({
      where: { activo_id: activo.id, estado: { in: ['propuesto', 'aprobado'] } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: productos, count: productos.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[productos] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener los productos' });
  }
});

// POST /api/activos/:id/productos — alta ciudadana (requireJwt): nace
// 'propuesto' — nunca 'aprobado' por autodeclaración (moderación primero).
router.post('/activos/:id/productos', requireJwt, async (req: Request, res: Response) => {
  const activoId = req.params.id;

  let parsed: z.infer<typeof ProductoAltaSchema>;
  try {
    parsed = ProductoAltaSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII (ADR-020 cond. 1, Ley 25.326): sobre el nombre y la categoría
  // ANTES de persistir; rechazo genérico, sin eco del valor.
  const contenido = JSON.stringify({ nombre: parsed.nombre, categoria: parsed.categoria ?? null });
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  const usuario = res.locals.usuario as { id: string };
  const autor = seudonimo(usuario.id);

  try {
    const activo = await prisma.activos.findUnique({ where: { id: activoId } });
    if (activo === null || activo.visibilidad === 'restricted') {
      res.status(404).json({ success: false, error: 'activo no encontrado' });
      return;
    }

    const producto = await prisma.productos.create({
      data: {
        activo_id: activo.id,
        slug: parsed.slug,
        nombre: parsed.nombre,
        categoria: parsed.categoria ?? undefined,
        // [] = sin_dato honesto (R15): la temporada se declara, no se deduce.
        temporada_meses: parsed.temporada_meses ?? [],
        estado: 'propuesto',
        procedencia: parsed.procedencia ?? undefined, // ADR-035: opcional para el ciudadano
        created_by_hash: autor,
      },
    });

    // Sello del sistema: 'producto.propuesto' sin PII — el payload lleva ids,
    // claves territoriales y estados; el texto vive solo en la tabla productos.
    try {
      await sellarEvento('producto.propuesto', {
        producto_id: producto.id,
        activo_id: activo.id,
        slug: producto.slug,
        nodo_key: activo.nodo_key,
        subnodo_key: activo.subnodo_key ?? null,
        estado: producto.estado,
        created_by_hash: autor,
      });
    } catch (err) {
      // Rollback (R4/R15): sin evento no hay escritura acreditada.
      await prisma.productos.delete({ where: { id: producto.id } }).catch(() => undefined);
      console.error('[productos] sellar propuesta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la propuesta' });
      return;
    }

    res.status(201).json({ success: true, data: producto });
  } catch (err) {
    // Slug duplicado en el activo (@@unique([activo_id, slug])).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ success: false, error: 'ya existe un producto con ese slug en el activo' });
      return;
    }
    console.error('[productos] crear:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al crear el producto' });
  }
});

// PATCH /api/productos/:productoId/estado — moderación (moderador|admin):
// aprobado | rechazado | archivado. VIG-005: 'aprobado' hace al producto
// visible en ?producto= y ?mes= del mapa — sin sello no hay transición.
router.patch('/productos/:productoId/estado', requireJwt, requireRole('moderador', 'admin'), async (req: Request, res: Response) => {
  const productoId = req.params.productoId;

  let parsed: z.infer<typeof ProductoEstadoCambioSchema>;
  try {
    parsed = ProductoEstadoCambioSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII sobre el motivo (ADR-020 cond. 1): mismo criterio que activos.
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
    const producto = await prisma.productos.findUnique({ where: { id: productoId } });
    if (producto === null) {
      res.status(404).json({ success: false, error: 'producto no encontrado' });
      return;
    }
    // H8 (MARKET-CAP MK-3a #426): el activo declara el territorio del sello —
    // sin nodo_key el consumer vig003-kpi descarta la entrada y la aprobación
    // de un producto no dispara el recompute del nodo.
    const activoDelProducto = await prisma.activos.findUnique({ where: { id: producto.activo_id } });
    if (activoDelProducto === null) {
      res.status(404).json({ success: false, error: 'producto no encontrado' });
      return;
    }
    if (producto.estado === parsed.estado) {
      res.status(409).json({ success: false, error: "el producto ya está en estado '" + parsed.estado + "'" });
      return;
    }

    const actualizado = await prisma.productos.update({
      where: { id: productoId },
      data: { estado: parsed.estado },
    });

    const moderadorHash = seudonimo((res.locals.usuario as { id: string }).id);
    try {
      await sellarEvento('producto.estado_cambiado', {
        producto_id: productoId,
        activo_id: producto.activo_id,
        slug: producto.slug,
        // H8 (MK-3a #426): corrección aditiva del disparo — el sello declara
        // el territorio (mismo patrón que producto.propuesto).
        nodo_key: activoDelProducto.nodo_key,
        subnodo_key: activoDelProducto.subnodo_key ?? null,
        estado: parsed.estado,
        motivo: parsed.motivo ?? null,
        moderador_hash: moderadorHash,
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay transición acreditada.
      await prisma.productos.update({ where: { id: productoId }, data: { estado: producto.estado } }).catch(() => undefined);
      console.error('[productos] sellar cambio de estado:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar el cambio de estado' });
      return;
    }

    res.json({ success: true, data: actualizado });
  } catch (err) {
    console.error('[productos] cambiar estado:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al cambiar el estado' });
  }
});


// ─── MARKET-CAP MK-3b (#426, sub-épica #152): ofertas del Mercado ───
// Decisiones ratificadas por la DH 2026-11-07: catálogo público de ofertas
// dentro de MK-3b mismo PR; faceta subnodo junto a las existentes; q = LIKE
// simple por nombre. PATCH de oferta: titular verificado del comercio padre
// o moderador|admin (patrón PATCH habilitación MK-2 #254).

// Resolución de rubro por CÓDIGO (verbatim comercios.ts #248): canon de 11
// ratificado primero, legados cat-* después; código desconocido => label null
// honesto (R15) — la API nunca inventa una etiqueta de rubro.
function resolverRubro(rubroId: string): { id: string; rama: string | null; label: string | null } {
  const canon = TAXONOMIA_DIRECTORIO_CANONICA.find((c) => c.code === rubroId);
  if (canon) return { id: rubroId, rama: null, label: canon.name };
  const legada = TAXONOMIA_CANONICA_DELOCALSOY.find((c) => c.idCategoria === rubroId);
  if (legada) return { id: rubroId, rama: legada.rama, label: legada.nombre };
  return { id: rubroId, rama: null, label: null };
}

// Fila explícita (lección #151 TS7006): @delocalsoy/db exporta el cliente sin
// los tipos generados — la forma del producto con su comercio padre se
// declara explícitamente aquí.
interface ProductoConPadre {
  id: string;
  activo_id: string;
  slug: string;
  nombre: string;
  categoria: string | null;
  temporada_meses: unknown;
  estado: string;
  precio_centavos: number | null;
  vigencia_desde: Date | null;
  vigencia_hasta: Date | null;
  created_at: Date;
  activo: {
    id: string;
    titulo: string;
    estado: string;
    nodo_key: string;
    subnodo_key: string | null;
    visibilidad: string;
    comercio_ficha: {
      rubro_id: string;
      rubro_rama: string | null;
      habilitacion: Record<string, unknown>;
      titularidad: Record<string, unknown>;
    } | null;
  };
}

// Estado de vigencia DERIVADO en lectura (RFC-027: caducidad declarada, no
// silenciosa): sin ventana = 'sin_vigencia' (siempre visible, null honesto,
// R15); ventana futura = 'programada'; ventana vencida = 'vencida' — la
// oferta vencida SIGUE publicada con su estado derivado, jamás desaparece.
function estadoVigencia(
  desde: Date | null,
  hasta: Date | null
): 'sin_vigencia' | 'programada' | 'vigente' | 'vencida' {
  if (desde === null && hasta === null) return 'sin_vigencia';
  const ahora = Date.now();
  if (desde !== null && desde.getTime() > ahora) return 'programada';
  if (hasta !== null && hasta.getTime() < ahora) return 'vencida';
  return 'vigente';
}

// Oferta pública (MK-3b): producto + resumen del comercio padre. Sin PII por
// construcción (v1 sin datos de contacto — decisión DH: relay MK-4). El
// estado de vigencia se deriva en la lectura; el precio viaja en centavos
// AR enteros, jamás formateado como float.
function ofertaPublica(p: ProductoConPadre) {
  return {
    id: p.id,
    activo_id: p.activo_id,
    slug: p.slug,
    nombre: p.nombre,
    categoria: p.categoria,
    temporada_meses: p.temporada_meses,
    estado: p.estado,
    precio_centavos: p.precio_centavos,
    vigencia_desde: p.vigencia_desde === null ? null : p.vigencia_desde.toISOString().slice(0, 10),
    vigencia_hasta: p.vigencia_hasta === null ? null : p.vigencia_hasta.toISOString().slice(0, 10),
    estado_vigencia: estadoVigencia(p.vigencia_desde, p.vigencia_hasta),
    comercio: {
      id: p.activo.id,
      titulo: p.activo.titulo,
      nodo_key: p.activo.nodo_key,
      subnodo_key: p.activo.subnodo_key,
      rubro: p.activo.comercio_ficha === null ? null : resolverRubro(p.activo.comercio_ficha.rubro_id),
    },
  };
}

// GET /api/productos — catálogo público de ofertas (MK-3b, decisión DH
// 2026-11-07): el vecino que busca un producto específico aterriza acá.
// DOBLE compuerta (ADR-036/R15): SOLO producto aprobado cuyo comercio padre
// (activo con comercio_ficha) está aprobado y público — propuesto, rechazado,
// archivado o restricted jamás salen. Los productos de activos NO comerciales
// (patrimonio, producción) siguen en GET /api/activos/:id/productos (VIG-005):
// esta superficie es la del Mercado de Proximidad. Filtros ?nodo ?subnodo
// ?rubro (por CÓDIGO) ?precio_max ?vigente ?q (LIKE simple por nombre);
// take 100: paginación v1 declarada (MK-0 §2.5). Público anónimo, sin PII.
router.get('/productos', async (req: Request, res: Response) => {
  try {
    const parsedFiltros = ProductoFiltroSchema.safeParse(req.query);
    if (!parsedFiltros.success) {
      res.status(400).json({ success: false, error: 'filtros inválidos', details: parsedFiltros.error.issues });
      return;
    }
    const f = parsedFiltros.data;
    const ahora = new Date();
    // Filtro del comercio padre: aprobado + público (ADR-036) + CON ficha de
    // mercado (la oferta del Mercado pertenece a un comercio) + facetas.
    const filtroActivo: Record<string, unknown> = {
      estado: 'aprobado',
      visibilidad: 'public',
      NOT: [{ comercio_ficha: null }],
      ...(f.nodo !== undefined ? { nodo_key: f.nodo } : {}),
      ...(f.subnodo !== undefined ? { subnodo_key: f.subnodo } : {}),
      ...(f.rubro !== undefined ? { comercio_ficha: { rubro_id: f.rubro } } : {}),
    };
    const where: Record<string, unknown> = {
      estado: 'aprobado',
      activo: filtroActivo,
      ...(f.q !== undefined ? { nombre: { contains: f.q, mode: 'insensitive' } } : {}),
      ...(f.precio_max !== undefined ? { precio_centavos: { lte: f.precio_max } } : {}),
    };
    if (f.vigente === 'true') {
      // vigente = visible HOY: excluye SOLO la ventana vencida (RFC-027) —
      // la programada y la sin vigencia siguen (null ≠ vencida, R15).
      where.OR = [{ vigencia_hasta: null }, { vigencia_hasta: { gte: ahora } }];
    }
    const productos = await prisma.productos.findMany({
      where: where as never,
      include: { activo: { include: { comercio_ficha: true } } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    const data = (productos as unknown as ProductoConPadre[]).map(ofertaPublica);
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[productos] catálogo de ofertas:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener el catálogo de ofertas' });
  }
});

// GET /api/productos/:productoId — ficha pública de la oferta (MK-3b): el
// «producto específico buscado». 404 honesto y SIN eco (R15/ADR-036):
// inexistente, propuesto, archivado, commerce padre no aprobado/púbico o
// producto de activo sin ficha de mercado son indistinguibles desde afuera.
router.get('/productos/:productoId', async (req: Request, res: Response) => {
  const productoId = req.params.productoId;
  try {
    const producto = await prisma.productos.findUnique({
      where: { id: productoId },
      include: { activo: { include: { comercio_ficha: true } } },
    });
    const p = producto as unknown as ProductoConPadre | null;
    if (
      p === null ||
      p.estado !== 'aprobado' ||
      p.activo.estado !== 'aprobado' ||
      p.activo.visibilidad !== 'public' ||
      p.activo.comercio_ficha === null
    ) {
      res.status(404).json({ success: false, error: 'producto no encontrado' });
      return;
    }
    res.json({ success: true, data: ofertaPublica(p) });
  } catch (err) {
    console.error('[productos] ficha de oferta:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener la oferta' });
  }
});

// PATCH /api/productos/:productoId — edición de la oferta (MK-3b): titular
// verificado del comercio padre o moderador|admin — la API es la compuerta
// (403 real sin eco, Ley 25.326). Para productos de activos SIN ficha de
// mercado no existe titular: solo moderación puede editarlos (frontera
// declarada, R15 — no se inventa un titular que no existe). Justificación
// pública >=10 con anti-PII (ADR-038, ADR-020 cond. 1); precio en centavos
// AR ENTEROS jamás float (MK-3 D2); sello producto.atributos_editados con
// rollback (R4/R15): sin sello no hay edición acreditada.
router.patch('/productos/:productoId', requireJwt, async (req: Request, res: Response) => {
  const productoId = req.params.productoId;
  const usuario = res.locals.usuario as { id: string; rol: string };

  let parsed: z.infer<typeof ProductoEdicionSchema>;
  try {
    parsed = ProductoEdicionSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.issues });
      return;
    }
    throw error;
  }

  // Anti-PII sobre el nombre y la justificación ANTES de persistir (ADR-020
  // cond. 1); rechazo genérico, sin eco del valor.
  const contenido = JSON.stringify({ nombre: parsed.nombre ?? null, justificacion: parsed.justificacion });
  const pii = detectaPII(contenido);
  if (pii) {
    res.status(400).json({
      error: 'payload rechazado: contiene datos personales identificables (' + pii + ') — ADR-020 cond. 1, Ley 25.326',
    });
    return;
  }

  try {
    const producto = await prisma.productos.findUnique({
      where: { id: productoId },
      include: { activo: { include: { comercio_ficha: true } } },
    });
    if (producto === null) {
      res.status(404).json({ success: false, error: 'producto no encontrado' });
      return;
    }
    const activo = (producto as unknown as { activo: ProductoConPadre['activo'] }).activo;
    const ficha = activo.comercio_ficha;
    const titularidad = ((ficha?.titularidad ?? {}) as { estado?: string; reclamado_por_hash?: string });
    const esTitular =
      ficha !== null &&
      titularidad.estado === 'verificada' &&
      titularidad.reclamado_por_hash === seudonimo(usuario.id);
    const esModeracion = usuario.rol === 'moderador' || usuario.rol === 'admin';
    if (!esTitular && !esModeracion) {
      res.status(403).json({ success: false, error: 'solo el titular verificado del comercio o moderación puede editar la oferta' });
      return;
    }

    // Edición PARCIAL: solo los campos presentes viajan; null limpia el campo
    // declarado (sin precio / sin ventana de vigencia — R15).
    const campos: string[] = [];
    const data: Record<string, unknown> = {};
    if (parsed.nombre !== undefined) { data.nombre = parsed.nombre; campos.push('nombre'); }
    if (parsed.categoria !== undefined) { data.categoria = parsed.categoria; campos.push('categoria'); }
    if (parsed.temporada_meses !== undefined) { data.temporada_meses = parsed.temporada_meses; campos.push('temporada_meses'); }
    if (parsed.precio_centavos !== undefined) { data.precio_centavos = parsed.precio_centavos; campos.push('precio_centavos'); }
    if (parsed.vigencia_desde !== undefined) {
      data.vigencia_desde = parsed.vigencia_desde === null ? null : new Date(parsed.vigencia_desde + 'T00:00:00.000Z');
      campos.push('vigencia_desde');
    }
    if (parsed.vigencia_hasta !== undefined) {
      data.vigencia_hasta = parsed.vigencia_hasta === null ? null : new Date(parsed.vigencia_hasta + 'T00:00:00.000Z');
      campos.push('vigencia_hasta');
    }

    await prisma.productos.update({ where: { id: productoId }, data: data as never });

    try {
      await sellarEvento('producto.atributos_editados', {
        producto_id: productoId,
        activo_id: producto.activo_id,
        slug: producto.slug,
        // H8 (MK-3a #426): el sello declara el territorio — mismo patrón que
        // producto.estado_cambiado / producto.propuesto.
        nodo_key: activo.nodo_key,
        subnodo_key: activo.subnodo_key ?? null,
        campos_editados: campos,
        justificacion: parsed.justificacion,
        actualizado_por_hash: seudonimo(usuario.id),
      });
    } catch (err) {
      // Rollback (R4/R15): sin sello no hay edición acreditada.
      await prisma.productos
        .update({
          where: { id: productoId },
          data: {
            nombre: producto.nombre,
            categoria: producto.categoria,
            temporada_meses: producto.temporada_meses as never,
            precio_centavos: producto.precio_centavos ?? null,
            vigencia_desde: producto.vigencia_desde ?? null,
            vigencia_hasta: producto.vigencia_hasta ?? null,
          } as never,
        })
        .catch(() => undefined);
      console.error('[productos] sellar edición de oferta:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, error: 'fallo al sellar la edición de la oferta' });
      return;
    }

    const actualizado = await prisma.productos.findUnique({ where: { id: productoId } });
    res.json({ success: true, data: actualizado, campos_editados: campos });
  } catch (err) {
    console.error('[productos] editar oferta:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al editar la oferta' });
  }
});

// GET /api/operativa/:activoId — operativa del activo (público anónimo):
// horario, temporada, capacidad, seguridad y habilitación honesta.
// capacity_status 'unknown' (R15) se publica tal cual — el turista informado
// decide con el dato real, no con un aforo inventado.
router.get('/operativa/:activoId', async (req: Request, res: Response) => {
  try {
    const activo = await prisma.activos.findUnique({ where: { id: req.params.activoId } });
    if (activo === null || activo.visibilidad === 'restricted') {
      res.status(404).json({ success: false, error: 'activo no encontrado' });
      return;
    }
    const operativa = await prisma.activos_operativa.findUnique({ where: { activo_id: activo.id } });
    if (operativa === null) {
      res.status(404).json({ success: false, error: 'el activo no tiene operativa publicada' });
      return;
    }
    res.json({
      success: true,
      data: {
        activo_id: activo.id,
        titulo: activo.titulo,
        tipo: activo.tipo,
        nodo_key: activo.nodo_key,
        subnodo_key: activo.subnodo_key,
        horario: operativa.horario,
        temporada_meses: operativa.temporada_meses,
        capacity_status: operativa.capacity_status,
        capacidad_plazas: operativa.capacidad_plazas,
        seguridad: operativa.seguridad,
        habilitacion: operativa.habilitacion,
        procedencia: operativa.procedencia,
      },
    });
  } catch (err) {
    console.error('[operativa] ficha:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al obtener la operativa' });
  }
});

export default router;

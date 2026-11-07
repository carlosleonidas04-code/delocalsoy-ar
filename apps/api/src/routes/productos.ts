import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@delocalsoy/db';
import { xaddEventReference } from '@delocalsoy/redis';
import { ProductoAltaSchema, ProductoEstadoCambioSchema } from '@delocalsoy/contracts';
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

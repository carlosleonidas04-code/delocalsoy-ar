import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { SubnodoFiltroSchema } from '@delocalsoy/contracts';

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
router.get('/:key/reportes', async (req: Request, res: Response) => {
  try {
    const nodo = await nodoPorKey(req.params.key);
    if (!nodo) {
      return res.status(404).json({ success: false, error: 'Nodo no encontrado' });
    }
    const rows = await prisma.reportes.findMany({
      where: { nodo_id: nodo.id },
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

export default router;

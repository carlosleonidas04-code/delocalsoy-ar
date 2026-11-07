import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '@delocalsoy/db';
import { SellosQuerySchema } from '@delocalsoy/contracts';

/**
 * Dominio sellos — ARTEFACTOS-ROLES AR4 (#403, épica #399): libro contable
 * público de events_raw para el auditor.
 *
 * Lectura anónima SOLO de los sellos YA emitidos (ADR-032: events_raw es
 * la única fuente de verdad, append-only e inmutable). Sin PII por
 * construcción: la compuerta anti-PII vive en la INGESTA (POST /api/events,
 * ADR-020 cond. 1, Ley 25.326) y el guard system.* (H-01) — esta ruta solo
 * expone lo que ya pasó esa compuerta. El auditor NO muta: sin POST, sin
 * PATCH (spec A4 §4).
 *
 * El nodo vive en el payload del sello (events_raw no tiene columna nodo —
 * deuda ADR-030): el filtro ?nodo= consulta payload->nodo_key (mismo
 * patrón que reportes.ts). Paginación limit/offset con el total en el
 * header X-DELocalSoy-Total-Count (patrón #165).
 */
const router: Router = Router();

// Filas tipadas de las lecturas: el cliente prisma se exporta `any` (patron
// mock de pruebas en lib/prisma), asi que la forma de las filas se declara
// explicita (mismo patron que reportes.ts - fix TS7006 del PR #151).
type SelloRow = {
  id: string;
  type: string;
  hash: string;
  payload: unknown;
  occurred_at: Date;
};
type TipoCountRow = { type: string; _count: { type: number } };

// GET / — libro contable público: sellos YA emitidos ordenados por
// occurred_at desc, con filtros ?nodo= (payload->nodo_key) y ?type=
// (exacto) + paginación limit 1-200 (default 50) / offset. El total viaja
// en el header X-DELocalSoy-Total-Count (patrón #165) y también en el body.
router.get('/', async (req: Request, res: Response) => {
  let q: z.infer<typeof SellosQuerySchema>;
  try {
    q = SellosQuerySchema.parse(req.query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'datos inválidos', details: error.errors });
      return;
    }
    throw error;
  }

  try {
    const where: Record<string, unknown> = {};
    if (q.nodo !== undefined) {
      where.payload = { path: ['nodo_key'], equals: q.nodo };
    }
    if (q.type !== undefined) {
      where.type = q.type;
    }

    const [rows, total] = await Promise.all([
      prisma.events_raw.findMany({
        where,
        orderBy: { occurred_at: 'desc' },
        take: q.limit,
        skip: q.offset,
      }),
      prisma.events_raw.count({ where }),
    ]);

    const data = (rows as SelloRow[]).map((s) => ({
      id: s.id,
      type: s.type,
      hash: s.hash,
      occurred_at: s.occurred_at.toISOString(),
      payload: s.payload,
    }));

    res.setHeader('X-DELocalSoy-Total-Count', String(total));
    res.json({
      success: true,
      data,
      count: data.length,
      total,
      limit: q.limit,
      offset: q.offset,
    });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[sellos] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al leer el libro contable' });
  }
});

// GET /tipos — conteo de sellos por type para la vista de cobertura contra
// docs/MATRIZ_SELLOS.md v0.2: los tipos SIN fila en la matriz (p. ej.
// system.*) se exponen como hallazgo honesto — nunca se esconden (R15).
router.get('/tipos', async (_req: Request, res: Response) => {
  try {
    const grouped = (await prisma.events_raw.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
    })) as TipoCountRow[];

    const data = grouped.map((g) => ({ type: g.type, count: g._count.type }));
    res.json({
      success: true,
      data,
      count: data.length,
      total: data.reduce((acc, x) => acc + x.count, 0),
    });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[sellos] tipos:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al contar los sellos por tipo' });
  }
});

export default router;

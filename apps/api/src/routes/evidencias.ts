import { Router, type Response } from 'express';
import { prisma } from '@delocalsoy/db';

/**
 * Registro de evidencias ejecutables (EV-xxx).
 * Lectura ordenada por código; fuente de la pantalla "Evidencias" del frontend.
 */
const router: Router = Router();

router.get('/', async (_req, res: Response) => {
  try {
    const rows = await prisma.evidencias.findMany({ orderBy: { code: 'asc' } });
    res.json({ count: rows.length, evidencias: rows });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[evidencias] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'fallo al leer evidencias' });
  }
});

export default router;
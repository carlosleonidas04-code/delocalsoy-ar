import { Router, type Response } from 'express';
import { prisma } from '@delocalsoy/db';

/**
 * Registro de evidencias ejecutables (EV-xxx).
 * Lectura ordenada por código; fuente de la pantalla "Evidencias" del frontend.
 */
const router = Router();

router.get('/', async (_req, res: Response) => {
  try {
    const rows = await prisma.evidencias.findMany({ orderBy: { code: 'asc' } });
    res.json({ count: rows.length, evidencias: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error desconocido';
    res.status(500).json({ error: 'fallo al leer evidencias', detail: message });
  }
});

export default router;

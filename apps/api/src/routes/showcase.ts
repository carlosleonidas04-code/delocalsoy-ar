import { Router, type Request, type Response } from 'express';
import { prisma } from '@delocalsoy/db';
import { ShowcaseResponseSchema } from '@delocalsoy/contracts';

/**
 * Demo final del showcase — NODO-VIG VIG-007 (NVIG-R9 #193, épica #167).
 *
 * "Recorrido Caucete → Capital → Valle de Iglesia" (fuente §Guion de
 * demostración final): lectura federada PÚBLICA del estado REAL de los tres
 * nodos. No hay tabla nueva: cada resumen se deriva de las tablas de dominio
 * con las exclusiones de siempre (ADR-036: restricted fuera de los counts
 * públicos de activos, operativa y productos; la ficha patrimonial cuenta
 * también para restricted porque la declaratoria es registro público —
 * decisión DH VIG-004, traza #173). Un nodo sin kpi_snapshots aún
 * (capital/caucete hoy) → kpis: 0 honesto, nunca fabricado (R15).
 *
 * El guion ejecutable (13 pasos, 4 escenarios, 10 criterios de aceptación
 * con estado real) vive en docs/nodes/valle-de-iglesia/VIG-007-DEMO-FINAL.md
 * y su ejecución se acredita en apps/api/src/showcase-demo.test.ts.
 */
const router: Router = Router();

// Orden del guion de la fuente: Caucete → Capital → Valle de Iglesia.
const RECORRIDO = ['caucete', 'capital', 'iglesia'] as const;
const GUION = { doc: 'docs/nodes/valle-de-iglesia/VIG-007-DEMO-FINAL.md', pasos: 13 };

router.get('/', async (_req: Request, res: Response) => {
  try {
    const nodosRows = await prisma.nodos.findMany();
    const byKey = new Map<string, any>(nodosRows.map((n: any) => [n.key, n]));

    const resumenes: any[] = [];
    for (const key of RECORRIDO) {
      const nodo = byKey.get(key);
      if (!nodo) continue;

      const subnodos = await prisma.subnodos.count({ where: { nodo_key: key } });
      const kpisRows = await prisma.kpi_snapshots.findMany({
        where: { nodo_key: key },
        orderBy: { kpi_key: 'asc' },
      });

      // Exclusión ADR-036: restricted nunca cuenta en la superficie pública
      // de activos; las fichas patrimoniales sí (registro público, VIG-004).
      const activosRows = await prisma.activos.findMany({
        where: { nodo_key: key, estado: 'aprobado' },
        select: { id: true, visibilidad: true },
      });
      const idsTodos = activosRows.map((a: any) => a.id);
      const idsNoRestricted = activosRows
        .filter((a: any) => a.visibilidad !== 'restricted')
        .map((a: any) => a.id);

      const fichas_patrimoniales = await prisma.activos_patrimonio.count({
        where: { activo_id: { in: idsTodos } },
      });
      const operativas = await prisma.activos_operativa.count({
        where: { activo_id: { in: idsNoRestricted } },
      });
      const productos_aprobados = await prisma.productos.count({
        where: { estado: 'aprobado', activo_id: { in: idsNoRestricted } },
      });
      const rag_fragmentos = await prisma.rag_index.count({ where: { nodo_key: key } });

      resumenes.push({
        key,
        nombre: nodo.nombre,
        foco: nodo.foco,
        poblacion: nodo.poblacion,
        activo: nodo.activo,
        subnodos,
        kpis: kpisRows.length,
        activos_aprobados: idsNoRestricted.length,
        fichas_patrimoniales,
        operativas,
        productos_aprobados,
        rag_fragmentos,
        kpis_detalle: kpisRows.map((k: any) => ({
          kpi_key: k.kpi_key,
          valor: k.valor,
          detalles: k.detalles,
        })),
      });
    }

    const data = { recorrido: [...RECORRIDO], nodos: resumenes, guion: GUION };
    // Contrato como fuente única: si la superficie deriva del contrato,
    // la lectura falla ruidosamente en vez de servir algo sin acreditar.
    ShowcaseResponseSchema.parse(data);
    res.json({ success: true, data, count: resumenes.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[showcase] recorrido:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar el recorrido del showcase' });
  }
});

export default router;

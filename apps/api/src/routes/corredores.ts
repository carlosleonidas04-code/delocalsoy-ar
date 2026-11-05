import { Router, type Request, type Response } from 'express';
import { prisma } from '@delocalsoy/db';

/**
 * Dominio corredores — NODO-CAPITAL NCAP-R4 (#156, épica #152): red de
 * corredores v0.1. Los corredores son una RED MODELADA (grafo relacional:
 * corredor → segmentos from/to tipados → hitos/subnodos vinculados), no
 * líneas dibujadas: SIN geometría en v0.1 (R15: la traza dibujada exige
 * fuente verificada que aún no existe — nada se presenta como traza
 * oficial; el status 'candidate' declara la hipótesis de diseño DH).
 *
 * REGLA DE MODELADO (#154): los hitos participan por relaciones
 * connects/near SIN asignación distrital — el detalle relaciona, jamás
 * reasigna (áreas analíticas ≠ distritos ≠ relación por corredor).
 *
 * v0.1 es SOLO LECTURA pública anónima: los corredores son hipótesis de
 * diseño de la DH (ratificadas 2026-11-04), no input ciudadano — sin
 * escritura pública hasta que la DH declare lo contrario.
 *
 * Procedencia por tramo (ADR-035): cada segmento declara sus fuentes —
 * una relación sin fuente es una invención. Continuidad revisada
 * (criterio de cierre #156): ok|ruptura derivada de la cadena de
 * segmentos por secuencia, con el detalle de dónde se corta.
 */
const router: Router = Router();

// Filas tipadas: el cliente prisma se exporta como any (patrón mock de
// pruebas en lib/prisma), así que la forma de las filas se declara
// explícita para que la lectura siga chequeada en tsc.
type CorredorRow = {
  id: string;
  key: string;
  nodo_key: string;
  label: string;
  proposito: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  segmentos: SegmentoRow[];
};

type HitoRow = {
  id: string;
  key: string;
  nodo_key: string;
  label: string;
  tipo: string;
  lat: number | null;
  lng: number | null;
  notas: string | null;
  created_at: Date;
};

type SegmentoRow = {
  id: string;
  corredor_id: string;
  secuencia: number;
  from_tipo: string;
  from_key: string;
  to_tipo: string;
  to_key: string;
  modos: Array<string>;
  observaciones: Record<string, string> | null;
  observed_at: Date;
  fuentes: Array<Record<string, string>>;
  created_at: Date;
};

type Ruptura = {
  despues_de_secuencia: number;
  esperaba: { tipo: string; key: string };
  encontro: { tipo: string; key: string };
};

// Continuidad de la cadena de segmentos (criterio de cierre #156): cada
// segmento debe retomar donde terminó el anterior (por secuencia) — ok si
// la cadena es continua, ruptura si se corta, con el detalle del corte.
function revisarContinuidad(segmentos: SegmentoRow[]): { continuidad: 'ok' | 'ruptura'; rupturas: Ruptura[] } {
  const ordenados = [...segmentos].sort((a, b) => a.secuencia - b.secuencia);
  const rupturas: Ruptura[] = [];
  for (let i = 1; i < ordenados.length; i += 1) {
    const prev = ordenados[i - 1];
    const curr = ordenados[i];
    if (curr.from_tipo !== prev.to_tipo || curr.from_key !== prev.to_key) {
      rupturas.push({
        despues_de_secuencia: prev.secuencia,
        esperaba: { tipo: prev.to_tipo, key: prev.to_key },
        encontro: { tipo: curr.from_tipo, key: curr.from_key },
      });
    }
  }
  return { continuidad: rupturas.length === 0 ? 'ok' : 'ruptura', rupturas };
}

// Hitos distintos que articulan la red del corredor: derivados de los
// endpoints de los segmentos — la pertenencia la derivan los segmentos,
// no una columna (el grafo ES la red).
function hitosDeLosSegmentos(segmentos: SegmentoRow[]): string[] {
  const keys = new Set<string>();
  for (const s of segmentos) {
    if (s.from_tipo === 'hito') keys.add(s.from_key);
    if (s.to_tipo === 'hito') keys.add(s.to_key);
  }
  return Array.from(keys);
}

// GET /api/corredores — lectura pública anónima del catálogo v0.1: cada
// corredor con su continuidad revisada. Los 5 de la hipótesis DH (#156)
// nacen 'candidate' — jamás se presentan como trazas oficiales (R15).
router.get('/', async (_req: Request, res: Response) => {
  try {
    const corredores = (await prisma.corredores.findMany({
      orderBy: { key: 'asc' },
      include: { segmentos: true },
    })) as CorredorRow[];
    const data = corredores.map((c) => {
      const { continuidad } = revisarContinuidad(c.segmentos);
      return {
        key: c.key,
        label: c.label,
        proposito: c.proposito,
        status: c.status,
        nodo_key: c.nodo_key,
        segmentos_count: c.segmentos.length,
        hitos_count: hitosDeLosSegmentos(c.segmentos).length,
        continuidad,
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[corredores] listar:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al listar corredores' });
  }
});

// GET /api/corredores/:key — detalle público de la red del corredor:
// hitos y subnodos resueltos con label, segmentos ordenados por secuencia
// con fuentes por tramo (ADR-035) y continuidad revisada con detalle de
// rupturas. 404 sin eco del valor (anti-PII por defecto, ADR-020).
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const corredor = (await prisma.corredores.findUnique({
      where: { key: req.params.key },
      include: { segmentos: { orderBy: { secuencia: 'asc' } } },
    })) as CorredorRow | null;
    if (!corredor) {
      res.status(404).json({ success: false, error: 'corredor inexistente' });
      return;
    }
    const hitoKeys = hitosDeLosSegmentos(corredor.segmentos);
    const subnodoKeys = Array.from(
      new Set(
        corredor.segmentos.flatMap((s) => {
          const out: string[] = [];
          if (s.from_tipo === 'subnodo') out.push(s.from_key);
          if (s.to_tipo === 'subnodo') out.push(s.to_key);
          return out;
        })
      )
    );
    const [hitos, subnodos] = await Promise.all([
      prisma.corredor_hitos.findMany({ where: { key: { in: hitoKeys } }, orderBy: { key: 'asc' } }) as Promise<
        HitoRow[]
      >,
      subnodoKeys.length > 0
        ? (prisma.subnodos.findMany({
            where: { key: { in: subnodoKeys } },
            select: { key: true, label: true },
            orderBy: { key: 'asc' },
          }) as Promise<Array<{ key: string; label: string }>>)
        : Promise.resolve([] as Array<{ key: string; label: string }>),
    ]);
    const { continuidad, rupturas } = revisarContinuidad(corredor.segmentos);
    res.json({
      success: true,
      data: {
        key: corredor.key,
        label: corredor.label,
        proposito: corredor.proposito,
        status: corredor.status,
        nodo_key: corredor.nodo_key,
        hitos: hitos.map((h) => ({
          key: h.key,
          label: h.label,
          tipo: h.tipo,
          lat: h.lat,
          lng: h.lng,
          notas: h.notas,
        })),
        subnodos,
        segmentos: corredor.segmentos.map((s) => ({
          secuencia: s.secuencia,
          from: { tipo: s.from_tipo, key: s.from_key },
          to: { tipo: s.to_tipo, key: s.to_key },
          modos: s.modos,
          observaciones: s.observaciones,
          observed_at: s.observed_at,
          fuentes: s.fuentes,
        })),
        continuidad,
        rupturas,
      },
    });
  } catch (err) {
    // AUD-06 (#100): el detalle queda en stdout del servidor, nunca en la respuesta.
    console.error('[corredores] detalle:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al leer el corredor' });
  }
});

export default router;

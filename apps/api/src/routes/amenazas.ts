import { Router, type Request, type Response } from 'express';
import { prisma } from '@delocalsoy/db';
import { AmenazaCatalogoResponseSchema, AmenazaCoberturaResponseSchema } from '@delocalsoy/contracts';

/**
 * Capas de amenaza sísmica — LIC-DLUI LIC-R4 (LIC-04 #455, épica #448).
 *
 * DL-9 ratificado: la capa de amenaza nace del vocabulario (tabla capas,
 * seed-lic-r4-amenaza-sismica.sql) y su publicación fluye por el pipeline
 * de ingestas (capa_servicio = capas.key, patrón NODO-CAU R2 #138/#147 —
 * EV-049). Esta ruta es LECTURA PÚBLICA anónima derivada de las tablas de
 * dominio (patrón showcase VIG-007): sin tabla nueva, sin escritura.
 *
 * Regla ratificada metadatos-antes-de-capa: la capa declarada SIN ingesta
 * publicada se sirve con estado 'declarada' e ingesta null (R15: null ≠ 0 —
 * sin fuente ingestada no hay capa publicada, jamás geometría de memoria).
 * La ingesta publicada aporta la procedencia completa (NC-EV-09): fuente
 * (INPRES del catálogo), fecha de corte, CRS normalizado y escala.
 *
 * Anti-puntaje (R5/ADR-036): el dashboard de cobertura es un conteo CON
 * cobertura y fecha «X de N distritos», NUNCA un ranking de riesgo entre
 * nodos ni una evaluación de vulnerabilidad por edificio. La plataforma no
 * es alerta operativa: esta capa no monitorea, no sirena, no alerta.
 *
 * Contratos como fuente única (patrón showcase): la superficie deriva del
 * contrato — si la lectura diverge, falla ruidosamente (R4/R15).
 */
const router: Router = Router();

const AMENAZA = 'sísmica';
const CAPA_KEY = 'seismic_risk';
const REGLA =
  'Conteos con cobertura y fecha — jamás puntajes ni ranking de riesgo (R5/ADR-036)';
const CAUTELA =
  'Zonificación INPRES por departamento (Zona 4) y norma INPRES-CIRSOC 103 Parte I (2018) como metadatos de la ingesta publicada; la microzonificación y la evaluación de vulnerabilidad por edificio NO se computan (ADR-036); la traza federada llega por ingesta, jamás de memoria (R15)';

interface AmenazaIngestaPublica {
  source_id: string;
  fuente_key: string;
  fecha_corte: string;
  crs_normalizado: string;
  escala_precision: string;
  licencia: string | null;
}

interface AmenazaNodo {
  nodo_key: string;
  capa_key: string;
  nombre: string;
  dominio: string;
  estado: 'declarada' | 'publicada';
  ingesta: AmenazaIngestaPublica | null;
}

// Lectura derivada de capas × ingestas publicadas (capa_servicio = key).
async function estadoAmenaza(): Promise<AmenazaNodo[]> {
  const capas = await prisma.capas.findMany({
    where: { key: CAPA_KEY },
    select: { nodo_id: true, key: true, nombre: true, dominio: true },
  });
  if (capas.length === 0) return [];
  const nodos = await prisma.nodos.findMany({ select: { id: true, key: true } });
  const idToKey = new Map<string, string>(nodos.map((n: any) => [n.id, n.key]));

  // R15: SOLO ingestas publicadas alimentan la lectura pública (el
  // pipeline en curso queda en custodia, patrón fuentes.ts).
  const ingestas = await prisma.ingestas.findMany({
    where: { capa_servicio: CAPA_KEY, estado: 'publicado' },
    select: {
      nodo_key: true,
      source_id: true,
      fuente_key: true,
      fecha_corte: true,
      crs_normalizado: true,
      escala_precision: true,
      licencia: true,
    },
    orderBy: [{ nodo_key: 'asc' }, { fecha_corte: 'desc' }],
  });
  const porNodo = new Map<string, any>();
  for (const i of ingestas) if (!porNodo.has(i.nodo_key)) porNodo.set(i.nodo_key, i);

  return capas
    .map((c: any): AmenazaNodo => {
      const nodo_key = idToKey.get(c.nodo_id) ?? '';
      const i = porNodo.get(nodo_key) ?? null;
      return {
        nodo_key,
        capa_key: c.key,
        nombre: c.nombre,
        dominio: c.dominio,
        estado: i ? 'publicada' : 'declarada',
        ingesta: i
          ? {
              source_id: i.source_id,
              fuente_key: i.fuente_key,
              fecha_corte: i.fecha_corte,
              crs_normalizado: i.crs_normalizado,
              escala_precision: i.escala_precision,
              licencia: i.licencia ?? null,
            }
          : null,
      };
    })
    .sort((a: AmenazaNodo, b: AmenazaNodo) => a.nodo_key.localeCompare(b.nodo_key));
}

// GET /api/amenazas — catálogo público: capas declaradas × ingestas
// publicadas, con metadatos de procedencia y estado honesto por nodo.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const nodos = await estadoAmenaza();
    const data = { amenaza: AMENAZA, regla: REGLA, nodos };
    AmenazaCatalogoResponseSchema.parse(data);
    res.json({ success: true, data, count: nodos.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[amenazas] catálogo:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar el catálogo de amenazas' });
  }
});

// GET /api/amenazas/cobertura — dashboard honesto de cobertura (criterio de
// cierre #455): «X de N distritos con capa sísmica publicada» + fecha de
// corte de la ingesta más reciente. Nace honesto «0 de N» con fecha null
// (R15: sin ingesta publicada el 0 es REAL, la brecha es visible).
router.get('/cobertura', async (_req: Request, res: Response) => {
  try {
    const nodos = await estadoAmenaza();
    const publicados = nodos.filter((n) => n.estado === 'publicada');
    const fechas = publicados
      .map((n) => n.ingesta?.fecha_corte ?? '')
      .filter((f) => f.length > 0)
      .sort()
      .reverse();
    const data = {
      amenaza: AMENAZA,
      cobertura: `${publicados.length} de ${nodos.length}`,
      nodos_total: nodos.length,
      nodos_con_capa: nodos.length,
      nodos_publicados: publicados.length,
      fecha_corte: fechas[0] ?? null,
      regla: REGLA,
      cautela: CAUTELA,
    };
    AmenazaCoberturaResponseSchema.parse(data);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[amenazas] cobertura:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar la cobertura de amenazas' });
  }
});

export default router;

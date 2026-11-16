import { Router, type Request, type Response } from 'express';
import { prisma } from '@delocalsoy/db';
import { AtlasNodoResponseSchema, NodoKeyAtlasSchema } from '@delocalsoy/contracts';

/**
 * Atlas Territorial por nodo — MVP-1 (RFC-021, #532, épica OBJE-CAMPUS #531).
 *
 * ADR-084 (DH 2026-11-15): el atlas es una COMPOSICIÓN DE SOLO-LECTURA de
 * superficies públicas ya acreditadas en el repo — vocabulario CORE-002
 * (nodos/capas/categorías/features), KPIs del observatorio LIC-R1, capa de
 * amenaza sísmica LIC-R4, convenios LIC-R9 y la matriz curricular MVP-1
 * (ADR-082) — sin nueva escritura territorial y sin duplicar rutas ni
 * capacidades. Cada bloque declara su estado honesto:
 *
 *   - `publicado`            → la superficie fuente tiene datos publicados.
 *   - `sin_fuente_ingestada` → la superficie no tiene datos (R15: null ≠ 0,
 *                              lo vacío se declara, jamás se fabrica).
 *   - `en_custodia`          → la capa está declarada pero su ingesta sigue
 *                              en el pipeline sin publicar (patrón fuentes).
 *
 * Lectura pública anónima. Anti-ranking (R5/ADR-036): el atlas compone
 * conteos y estados con procedencia, jamás puntajes ni ranking entre nodos.
 * Sin geometrías de dominios sensibles (patrón Iglesia): este endpoint
 * expone estados y conteos, jamás trazas. Nodo fuera del vocabulario
 * canónico → 400. AUD-06: el detalle de un fallo queda server-side.
 */

const router: Router = Router();

const CAPA_AMENAZA_KEY = 'seismic_risk';

// GET /api/atlas/:nodo — composición solo-lectura (ADR-084) de las 5
// superficies acreditadas, con estado honesto por bloque.
router.get('/:nodo', async (req: Request, res: Response) => {
  const parsedNodo = NodoKeyAtlasSchema.safeParse(req.params.nodo);
  if (!parsedNodo.success) {
    res.status(400).json({ success: false, error: 'nodo desconocido — vocabulario canónico: capital | caucete | iglesia' });
    return;
  }
  const nodoKey = parsedNodo.data;

  try {
    // 1. vocabulario (CORE-002): el nodo y su catálogo declarado.
    const nodo = await prisma.nodos.findUnique({
      where: { key: nodoKey },
      select: { _count: { select: { capas: true, categorias: true, features: true } } },
    });
    const bloqueVocabulario = nodo
      ? {
          bloque: 'vocabulario',
          estado: 'publicado' as const,
          detalle: `CORE-002: nodo con ${nodo._count.capas} capas, ${nodo._count.categorias} categorías y ${nodo._count.features} features declaradas`,
        }
      : {
          bloque: 'vocabulario',
          estado: 'sin_fuente_ingestada' as const,
          detalle: 'CORE-002: nodo sin vocabulario ingestado — lo vacío se declara (R15)',
        };

    // 2. kpis (LIC-R1): snapshots del observatorio por nodo.
    const kpis = await prisma.kpi_snapshots.count({ where: { nodo_key: nodoKey } });
    const bloqueKpis =
      kpis > 0
        ? { bloque: 'kpis', estado: 'publicado' as const, detalle: `LIC-R1: ${kpis} KPIs con snapshot para el nodo` }
        : {
            bloque: 'kpis',
            estado: 'sin_fuente_ingestada' as const,
            detalle: 'LIC-R1: sin snapshots de KPIs para el nodo — 0 honesto (R15)',
          };

    // 3. amenazas (LIC-R4): capa declarada × ingesta publicada
    // (capa_servicio = key, patrón amenazas.ts). Capa declarada sin ingesta
    // publicada = en_custodia; sin capa = sin_fuente_ingestada.
    const [capaAmenaza, ingestaAmenaza] = await Promise.all([
      prisma.capas.findFirst({
        where: { key: CAPA_AMENAZA_KEY, nodo: { key: nodoKey } },
        select: { key: true },
      }),
      prisma.ingestas.findFirst({
        where: { capa_servicio: CAPA_AMENAZA_KEY, nodo_key: nodoKey, estado: 'publicado' },
        select: { fuente_key: true, fecha_corte: true },
        orderBy: [{ fecha_corte: 'desc' }],
      }),
    ]);
    const bloqueAmenazas = ingestaAmenaza
      ? {
          bloque: 'amenazas',
          estado: 'publicado' as const,
          detalle: `LIC-R4: capa sísmica publicada — fuente ${ingestaAmenaza.fuente_key}, fecha de corte ${ingestaAmenaza.fecha_corte}`,
        }
      : capaAmenaza
        ? {
            bloque: 'amenazas',
            estado: 'en_custodia' as const,
            detalle: 'LIC-R4: capa sísmica declarada sin ingesta publicada — en custodia del pipeline (R15: sin geometría de memoria)',
          }
        : {
            bloque: 'amenazas',
            estado: 'sin_fuente_ingestada' as const,
            detalle: 'LIC-R4: sin capa de amenaza declarada para el nodo',
          };

    // 4. convenios (LIC-R9): declaraciones con fuente por nodo.
    const convenios = await prisma.convenios.count({ where: { nodo_key: nodoKey } });
    const bloqueConvenios =
      convenios > 0
        ? { bloque: 'convenios', estado: 'publicado' as const, detalle: `LIC-R9: ${convenios} convenios declarados para el nodo` }
        : {
            bloque: 'convenios',
            estado: 'sin_fuente_ingestada' as const,
            detalle: 'LIC-R9: sin convenios declarados para el nodo — 0 honesto (R15)',
          };

    // 5. curricular (MVP-1, ADR-082): el catálogo es global — el bloque
    // declara su disponibilidad para la vista del nodo, con conteos honestos.
    const [cursos, tracks] = await Promise.all([prisma.courses.count(), prisma.tracks.count()]);
    const bloqueCurricular =
      cursos > 0
        ? {
            bloque: 'curricular',
            estado: 'publicado' as const,
            detalle: `MVP-1: matriz curricular con ${cursos} cursos y ${tracks} tracks declarados (catálogo global, ADR-082)`,
          }
        : {
            bloque: 'curricular',
            estado: 'sin_fuente_ingestada' as const,
            detalle: 'MVP-1: catálogo curricular nace vacío — corpus DLUI-IT sin ingesta autorizada por la DH (ECO-5, R15)',
          };

    const data = { nodo_key: nodoKey, bloques: [bloqueVocabulario, bloqueKpis, bloqueAmenazas, bloqueConvenios, bloqueCurricular] };
    AtlasNodoResponseSchema.parse(data);
    res.json({ success: true, data, count: data.bloques.length });
  } catch (err) {
    // AUD-06 (#100): el detalle queda server-side, nunca en la respuesta.
    console.error('[atlas] nodo:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, error: 'fallo al armar el atlas del nodo' });
  }
});

export default router;

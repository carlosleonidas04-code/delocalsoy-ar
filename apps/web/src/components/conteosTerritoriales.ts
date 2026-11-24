import { classifySpatialGeometryLayer, type MapGeometryLayerKey } from './TerritoriosMap';
import type { SpatialGeometryRecord } from '../data/federatedModel';

/**
 * INTER-TERR IT-R4 (#613, épica #607 / NCAP-R5): conteos territoriales honestos
 * por nodo y capa, con cobertura (desglose por estado epistémico) y fecha
 * (mayor trimestre presente en los datos regla LIC-01/LIC-02 — jamás fabricada).
 *
 * R5/ADR-036: JAMÁS puntaje global ni comparación entre nodos. La salida solo
 * agrega conteos por partición; los nodos se listan en el orden del dataset,
 * no en un ranking por cantidad.
 * R15: sin dato ingerido el panel declara la ausencia; un 0 sin cobertura
 * NUNCA se disfraza de «cero completo».
 */

export type EstadoConteo = EpistemicStatusAlias | "otro";

type EpistemicStatusAlias = "verified" | "community_validated" | "pending" | "synthetic_demo";

export interface ConteoPorCapa {
  capa: MapGeometryLayerKey;
  total: number;
  porEstado: Partial<Record<EstadoConteo, number>>;
  estadoOtroCrudo: string[];
  ultimoQuarter: string | null;
}

export interface ConteoPorNodo {
  nodeKey: string;
  porCapa: Record<MapGeometryLayerKey, ConteoPorCapa>;
  total: number;
}

export const FUENTE_CONTEOS_TERRITORIALES =
  'GET /api/modelo-federado → data.spatialGeometries (lectura pública; contrato DataSource, ADR-040)';

export interface ConteoTerritorial {
  fuente: string;
  nodos: ConteoPorNodo[];
}

const ESTADOS_CONOCIDOS = ["verified", "community_validated", "pending", "synthetic_demo"] as const;

function esEstadoConocido(s: string): s is EpistemicStatusAlias {
  return (ESTADOS_CONOCIDOS as readonly string[]).includes(s);
}

export function conteosTerritoriales(
  spatialGeometries: SpatialGeometryRecord[],
): ConteoTerritorial {
  const porNodeKey = new Map<string, ConteoPorNodo>();

  const capaVacia = (capa: MapGeometryLayerKey): ConteoPorCapa => ({
    capa,
    total: 0,
    porEstado: {},
    estadoOtroCrudo: [],
    ultimoQuarter: null,
  });

  const nodoNuevo = (nodeKey: string): ConteoPorNodo => ({
    nodeKey,
    porCapa: {
      assets: capaVacia('assets'),
      problems: capaVacia('problems'),
      public_space: capaVacia('public_space'),
      corredores: capaVacia('corredores'),
    },
    total: 0,
  });

  for (const g of spatialGeometries) {
    let nodo = porNodeKey.get(g.nodeKey);
    if (!nodo) {
      nodo = nodoNuevo(g.nodeKey);
      porNodeKey.set(g.nodeKey, nodo);
    }
    const capa = classifySpatialGeometryLayer(g);
    const c = nodo.porCapa[capa];
    c.total += 1;
    nodo.total += 1;
    const estado: EstadoConteo = esEstadoConocido(g.status) ? g.status : "otro";
    c.porEstado[estado] = (c.porEstado[estado] ?? 0) + 1;
    if (estado === "otro") c.estadoOtroCrudo.push(g.status);
    if (typeof g.quarter === 'string' && g.quarter.length > 0 && (c.ultimoQuarter === null || g.quarter > c.ultimoQuarter)) {
      c.ultimoQuarter = g.quarter;
    }
  }

  // Orden del dataset (aparecer): NUNCA reordena por total ni alfabético (anti-ranking).
  const nodos = Array.from(porNodeKey.values());
  return { fuente: FUENTE_CONTEOS_TERRITORIALES, nodos };
}

// REF-R7 (#640, épica REF #633): fuente por capa — agrega por CAPA (orden fijo
// de MAP_GEOMETRY_LAYER_GROUPS, jamás por total — anti-ranking R5/ADR-036)
// total, cobertura por estado epistémico y corte (mayor trimestre presente,
// jamás fabricado — null ≠ 0, R15). Reutiliza el tipo ConteoPorCapa de IT-R4
// (EV-131) y la clasificación de la fuente única classifySpatialGeometryLayer.
// Datos: GET /api/modelo-federado → data.spatialGeometries (lectura pública;
// contrato DataSource, ADR-040).

import {
  classifySpatialGeometryLayer,
  MAP_GEOMETRY_LAYER_GROUPS,
  type MapGeometryLayerKey,
} from './TerritoriosMap';
import type { ConteoPorCapa, EstadoConteo } from './conteosTerritoriales';
import type { SpatialGeometryRecord } from '../data/federatedModel';

export const FUENTE_CAPAS =
  'GET /api/modelo-federado → data.spatialGeometries (lectura pública; contrato DataSource, ADR-040)';

export interface FuentePorCapa {
  fuente: string;
  /** Una entrada por grupo de MAP_GEOMETRY_LAYER_GROUPS, en su orden fijo. */
  capas: ConteoPorCapa[];
}

const ESTADOS_CONOCIDOS = ['verified', 'community_validated', 'pending', 'synthetic_demo'] as const;

function estadoDe(s: string): EstadoConteo {
  return (ESTADOS_CONOCIDOS as readonly string[]).includes(s) ? (s as EstadoConteo) : 'otro';
}

export function fuenteCapas(spatialGeometries: SpatialGeometryRecord[]): FuentePorCapa {
  const porCapa = new Map<MapGeometryLayerKey, ConteoPorCapa>();
  for (const g of MAP_GEOMETRY_LAYER_GROUPS) {
    porCapa.set(g.key, { capa: g.key, total: 0, porEstado: {}, estadoOtroCrudo: [], ultimoQuarter: null });
  }
  for (const geom of spatialGeometries) {
    const c = porCapa.get(classifySpatialGeometryLayer(geom));
    if (!c) continue;
    c.total += 1;
    const estado = estadoDe(geom.status);
    c.porEstado[estado] = (c.porEstado[estado] ?? 0) + 1;
    if (estado === 'otro' && !c.estadoOtroCrudo.includes(geom.status)) c.estadoOtroCrudo.push(geom.status);
    if (typeof geom.quarter === 'string' && geom.quarter.length > 0 && (c.ultimoQuarter === null || geom.quarter > c.ultimoQuarter)) {
      c.ultimoQuarter = geom.quarter;
    }
  }
  // Orden fijo de la fuente única: NUNCA reordena por total (anti-ranking).
  return { fuente: FUENTE_CAPAS, capas: MAP_GEOMETRY_LAYER_GROUPS.map((g) => porCapa.get(g.key) as ConteoPorCapa) };
}

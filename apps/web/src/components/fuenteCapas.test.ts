// REF-R7 (#640, épica REF #633): test de fuenteCapas — orden fijo por capa
// (anti-ranking R5/ADR-036), cobertura por estado epistémico y corte honesto
// (mayor trimestre presente, jamás fabricado — null ≠ 0, R15).

import { describe, expect, it } from 'vitest';
import { fuenteCapas, FUENTE_CAPAS } from './fuenteCapas';
import { MAP_GEOMETRY_LAYER_GROUPS } from './TerritoriosMap';
import type { SpatialGeometryRecord } from '../data/federatedModel';

function geom(parcial: Partial<SpatialGeometryRecord>): SpatialGeometryRecord {
  return {
    id: 'g', nodeKey: 'capital', layerKey: 'l', domain: 'assets', title: 't',
    geometryType: 'POINT', srid: 4326, wkt: 'POINT(0 0)', metricLabel: 'm',
    custodians: [], status: 'verified', quarter: '2026-Q1',
    schematicPath: [], realCoords: [], color: '#000000',
    ...parcial,
  } as unknown as SpatialGeometryRecord;
}

describe('fuenteCapas — REF-R7 (#640, épica REF #633)', () => {
  it('agrega por capa en el orden fijo de MAP_GEOMETRY_LAYER_GROUPS, jamás por total (anti-ranking)', () => {
    const r = fuenteCapas([
      geom({ domain: 'corredores' as never }),
      geom({ domain: 'corredores' as never }),
      geom({ domain: 'corredores' as never }),
      geom({ domain: 'assets' }),
    ]);
    expect(r.capas.map((c) => c.capa)).toEqual(MAP_GEOMETRY_LAYER_GROUPS.map((g) => g.key));
    expect(r.capas[0].capa).toBe('assets'); // primera del orden fijo aunque corredores tenga más
  });

  it('dataset vacío: cada capa declara ausencia (total 0, corte null — R15: null ≠ 0)', () => {
    const r = fuenteCapas([]);
    expect(r.capas.every((c) => c.total === 0 && c.ultimoQuarter === null)).toBe(true);
    expect(r.fuente).toBe(FUENTE_CAPAS);
  });

  it('cobertura por estado epistémico; estado crudo desconocido se declara sin categoría', () => {
    const r = fuenteCapas([
      geom({ status: 'verified' }),
      geom({ status: 'community_validated' }),
      geom({ status: 'estado_raro' }),
    ]);
    const assets = r.capas.find((c) => c.capa === 'assets') as ConteoPorCapaLocal;
    expect(assets.total).toBe(3);
    expect(assets.porEstado['verified']).toBe(1);
    expect(assets.porEstado['community_validated']).toBe(1);
    expect(assets.estadoOtroCrudo).toContain('estado_raro');
  });

  it('corte = mayor trimestre presente en los datos, jamás fabricado', () => {
    const r = fuenteCapas([
      geom({ quarter: '2025-Q4' }),
      geom({ quarter: '2026-Q2' }),
      geom({ quarter: '2026-Q1' }),
    ]);
    expect((r.capas.find((c) => c.capa === 'assets') as ConteoPorCapaLocal).ultimoQuarter).toBe('2026-Q2');
  });
});

type ConteoPorCapaLocal = ReturnType<typeof fuenteCapas>['capas'][number];

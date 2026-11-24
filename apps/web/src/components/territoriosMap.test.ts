import { describe, expect, it } from 'vitest';

// IT-R3 (#612, épica #607 INTER-TERR / NCAP-R4): la capa Corredores es
// hipótesis de diseño con boundary_status: provisional declarado en la
// configuración del grupo. R15: las geometrías de corredores solo surgen de
// fuentes ingeridas — sin dato, la capa declara vacío (conteo 0 honesto) y
// NADA se traza. Anti-ranking R5/ADR-036; WCAG 2.2 AA ADR-061.

import {
  classifySpatialGeometryLayer,
  conteosIniciales,
  MAP_GEOMETRY_LAYER_GROUPS,
  visibilidadInicialCapas,
} from './TerritoriosMap';
import type { SpatialGeometryRecord } from '../data/federatedModel';

const GEOM = (domain: string) =>
  ({
    id: 'g-' + domain,
    nodeKey: 'capital',
    layerKey: 'l-' + domain,
    domain,
    title: 'geometría de prueba',
    geometryType: 'LineString',
    srid: 4326,
    wkt: 'LINESTRING(-68.5 -31.5, -68.4 -31.5)',
    metricLabel: 'km',
    custodians: [],
    status: 'verified',
    quarter: '2026-Q4',
    schematicPath: [],
    realCoords: [{ lat: -31.5, lng: -68.5 }],
    color: '#38bdf8',
  }) as unknown as SpatialGeometryRecord;

describe('IT-R3 (#612, épica #607) — capa Corredores v0.1 provisional (NCAP-R4)', () => {
  it('declara el 4.º grupo corredores con boundary_status: provisional (jamás traza oficial)', () => {
    const corredores = MAP_GEOMETRY_LAYER_GROUPS.find((g) => g.key === 'corredores');
    expect(corredores).toBeDefined();
    expect(corredores?.boundaryStatus).toBe('provisional');
    expect(corredores?.description).toContain('provisional');
    expect(corredores?.description).toContain('cor_centro_civico');
    expect(corredores?.description).toContain('UNIDE/Catastro');
  });

  it('los 3 grupos preexistentes NO cambian su régimen declarado (sin boundaryStatus)', () => {
    for (const key of ['assets', 'problems', 'public_space'] as const) {
      const g = MAP_GEOMETRY_LAYER_GROUPS.find((x) => x.key === key);
      expect(g).toBeDefined();
      expect(g?.boundaryStatus).toBeUndefined();
    }
    expect(MAP_GEOMETRY_LAYER_GROUPS).toHaveLength(4);
  });

  it('por defecto las 4 capas arrancan visibles, derivadas de la fuente única (sin drift)', () => {
    const vis = visibilidadInicialCapas();
    expect(MAP_GEOMETRY_LAYER_GROUPS.map((g) => vis[g.key])).toEqual([true, true, true, true]);
    expect(MAP_GEOMETRY_LAYER_GROUPS.map((g) => g.key)).toEqual([
      'assets',
      'problems',
      'public_space',
      'corredores',
    ]);
  });

  it('conteo inicial 0 honesto por capa; sin dato no hay trazado (R15)', () => {
    const conteos = conteosIniciales();
    expect(MAP_GEOMETRY_LAYER_GROUPS.map((g) => conteos[g.key])).toEqual([0, 0, 0, 0]);
  });

  it('clasificación: dominio corredores → capa corredores; los 6 dominios restantes intactos', () => {
    expect(classifySpatialGeometryLayer(GEOM('corredores'))).toBe('corredores');
    expect(classifySpatialGeometryLayer(GEOM('assets'))).toBe('assets');
    expect(classifySpatialGeometryLayer(GEOM('problems'))).toBe('problems');
    expect(classifySpatialGeometryLayer(GEOM('public_space'))).toBe('public_space');
    expect(classifySpatialGeometryLayer(GEOM('community'))).toBe('public_space');
    expect(classifySpatialGeometryLayer(GEOM('health'))).toBe('assets');
    expect(classifySpatialGeometryLayer(GEOM('production'))).toBe('assets');
    expect(classifySpatialGeometryLayer(GEOM('tourism'))).toBe('assets');
  });

  it('anti-ranking: los grupos no puntúan ni comparan nodos (R5/ADR-036)', () => {
    const serializado = JSON.stringify(MAP_GEOMETRY_LAYER_GROUPS).toLowerCase();
    expect(serializado).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/);
  });

  it('accesibilidad: label, descripción textual y acento único por grupo (1.4.1 + no solo color)', () => {
    for (const g of MAP_GEOMETRY_LAYER_GROUPS) {
      expect(g.label.length).toBeGreaterThanOrEqual(3);
      expect(g.description.length).toBeGreaterThanOrEqual(10);
      expect(g.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    const acentos = MAP_GEOMETRY_LAYER_GROUPS.map((g) => g.accentColor);
    expect(new Set(acentos).size).toBe(acentos.length);
  });
});

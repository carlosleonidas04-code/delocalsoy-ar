import { describe, expect, it } from 'vitest';

// IT-R4 (#613, épica #607 / NCAP-R5): conteos territoriales honestos por nodo
// y capa con cobertura (estado epistémico) y fecha (trimestre mayor presente —
// LIC-01/LIC-02). Anti-ranking R5/ADR-036; R15: ausencia declarada, jamás
// cero disfrazado de cobertura completa.

import { conteosTerritoriales, FUENTE_CONTEOS_TERRITORIALES } from './conteosTerritoriales';
import type { SpatialGeometryRecord } from '../data/federatedModel';

const GEOM = (over: Partial<SpatialGeometryRecord> & Pick<SpatialGeometryRecord, "nodeKey" | "domain">): SpatialGeometryRecord =>
  ({
    id: 'g-1',
    layerKey: 'l-1',
    title: 'geometría de prueba',
    geometryType: 'Point',
    srid: 4326,
    wkt: 'POINT(-68.5 -31.5)',
    metricLabel: 'unidades',
    custodians: [],
    status: 'verified',
    quarter: '2026-Q1',
    schematicPath: [],
    realCoords: [{ lat: -31.5, lng: -68.5 }],
    color: '#2e9e5b',
    ...over,
  });

describe('IT-R4 (#613, épica #607) — conteos territoriales honestos (NCAP-R5)', () => {
  it('agrupa por nodo EN EL ORDEN DE APARICIÓN del dataset (sin ranking por total)', () => {
    const g1 = GEOM({ id: "a", nodeKey: "capital", domain: "assets" });
    const g2 = GEOM({ id: "b", nodeKey: "caucete", domain: "assets" });
    const g3 = GEOM({ id: "c", nodeKey: "caucete", domain: "assets" });
    const g4 = GEOM({ id: "d", nodeKey: "caucete", domain: "problems" });
    const r = conteosTerritoriales([g1, g2, g3, g4]);
    expect(r.nodos.map((n) => n.nodeKey)).toEqual(['capital', 'caucete']);
    expect(r.nodos[1].total).toBe(3);
    expect(r.nodos[0].total).toBe(1); // capital primero aunque caucete tenga MÁS: el orden no es un ranking
  });

  it('desglose por estado epistémico (cobertura) + estado crudo declarado (R15)', () => {
    const g1 = GEOM({ id: "a", nodeKey: "capital", domain: "assets", status: "verified" });
    const g2 = GEOM({ id: "b", nodeKey: "capital", domain: "assets", status: "verified" });
    const g3 = GEOM({ id: "c", nodeKey: "capital", domain: "assets", status: "community_validated" });
    const g4 = GEOM({ id: "d", nodeKey: "capital", domain: "assets", status: "cronometrado_a_mano" });
    const r = conteosTerritoriales([g1, g2, g3, g4]);
    const capa = r.nodos[0].porCapa.assets;
    expect(capa.total).toBe(4);
    expect(capa.porEstado).toEqual({ verified: 2, community_validated: 1, otro: 1 });
    expect(capa.estadoOtroCrudo).toEqual(['cronometrado_a_mano']); // el estado desconocido se DECLARA, jamás se disimula
  });

  it('fecha honesta: mayor trimestre PRESENTE en los datos (LIC-01/LIC-02: no fabricada)', () => {
    const g1 = GEOM({ id: "a", nodeKey: "capital", domain: "assets", quarter: "2026-Q2" });
    const g2 = GEOM({ id: "b", nodeKey: "capital", domain: "problems", quarter: "2026-Q4" });
    const g3 = GEOM({ id: "c", nodeKey: "capital", domain: "public_space", quarter: "2026-Q1" });
    const r = conteosTerritoriales([g1, g2, g3]);
    expect(r.nodos[0].porCapa.assets.ultimoQuarter).toBe('2026-Q2');
    expect(r.nodos[0].porCapa.problems.ultimoQuarter).toBe('2026-Q4');
    expect(r.nodos[0].porCapa.corredores.ultimoQuarter).toBeNull(); // sin dato → sin fecha, null honesto
  });

  it('capa sin dato en un nodo con dato → 0 SIN cobertura (no es un cero completo, LIC-01/LIC-02)', () => {
    const g1 = GEOM({ id: "a", nodeKey: "capital", domain: "assets" });
    const r = conteosTerritoriales([g1]);
    const capa = r.nodos[0].porCapa.public_space;
    expect(capa.total).toBe(0);
    expect(capa.porEstado).toEqual({});
    expect(capa.ultimoQuarter).toBeNull();
  });

  it('dataset vacío → sin nodos (la ausencia se declara, R15), con fuente declarada', () => {
    const r = conteosTerritoriales([]);
    expect(r.nodos).toEqual([]);
    expect(r.fuente).toBe(FUENTE_CONTEOS_TERRITORIALES);
    expect(r.fuente).toContain('modelo-federado');
  });

  it('anti-ranking estructural: la salida no produce puntaje, solo contadores por partición', () => {
    const g1 = GEOM({ id: "a", nodeKey: "capital", domain: "assets" });
    const g2 = GEOM({ id: "b", nodeKey: "caucete", domain: "assets" });
    const r = conteosTerritoriales([g1, g2]) as unknown as Record<string, unknown>;
    const serializado = JSON.stringify(r).toLowerCase();
    expect(serializado).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/);
  });
});

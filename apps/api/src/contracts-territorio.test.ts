import { describe, expect, it } from 'vitest';

// CORE-002 T4 (#66): el contrato es la fuente única — TerritorioSchema y
// BboxStringSchema viven en @delocalsoy/contracts y se prueban acá (la suite
// de api resuelve el workspace por fuente TS vía aliases de vitest.config).
import { BboxStringSchema, TerritorioSchema } from '@delocalsoy/contracts';

describe('contracts: TerritorioSchema (T4, #66)', () => {
  it('acepta un payload válido y aplica default activo=true', () => {
    const parsed = TerritorioSchema.parse({ nombre: 'Capital', provincia: 'San Juan' });
    expect(parsed.nombre).toBe('Capital');
    expect(parsed.activo).toBe(true);
  });

  it('rechaza nombre vacío y provincia vacía', () => {
    expect(TerritorioSchema.safeParse({ nombre: '', provincia: 'San Juan' }).success).toBe(false);
    expect(TerritorioSchema.safeParse({ nombre: 'X', provincia: '' }).success).toBe(false);
  });

  it('partial() permite actualizar solo activo (PUT del route)', () => {
    const parsed = TerritorioSchema.partial().parse({ activo: false });
    expect(parsed.activo).toBe(false);
  });
});

describe('contracts: BboxStringSchema (T4, #66)', () => {
  it('acepta bbox válido y rechaza rangos SRID=4326 fuera de límite', () => {
    expect(BboxStringSchema.safeParse('-70.0,-32.0,-66.5,-29.0').success).toBe(true);
    expect(BboxStringSchema.safeParse('-190.0,-32.0,-66.5,-29.0').success).toBe(false);
    expect(BboxStringSchema.safeParse('-70.0,-95.0,-66.5,-29.0').success).toBe(false);
  });

  it('rechaza envolvente vacía y formato incorrecto', () => {
    expect(BboxStringSchema.safeParse('-68.0,-31.0,-68.0,-31.0').success).toBe(false);
    expect(BboxStringSchema.safeParse('a,b,c,d').success).toBe(false);
  });
});

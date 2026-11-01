import { describe, expect, it } from 'vitest';

// VIG-007 (NVIG-R9 #193): normalización del recorrido del showcase — R15:
// nada se inventa; 0 se muestra como 0 y null se conserva como null.

import { normalizarShowcase, notaCount } from './showcaseRecorrido';

describe('normalizarShowcase (VIG-007, #193)', () => {
  it('normaliza un payload completo de 3 nodos conservando el orden del recorrido', () => {
    const payload = {
      recorrido: ['caucete', 'capital', 'iglesia'],
      nodos: [
        { key: 'caucete', nombre: 'Caucete', foco: 'Datos oficiales', poblacion: 44047, activo: true, subnodos: 0, kpis: 0, activos_aprobados: 0, fichas_patrimoniales: 0, operativas: 0, productos_aprobados: 0, rag_fragmentos: 0, kpis_detalle: [] },
        { key: 'capital', nombre: 'Gran San Juan', foco: 'Densidad urbana', poblacion: 500000, activo: true, subnodos: 0, kpis: 0, activos_aprobados: 0, fichas_patrimoniales: 0, operativas: 0, productos_aprobados: 0, rag_fragmentos: 0, kpis_detalle: [] },
        { key: 'iglesia', nombre: 'Valle de Iglesia', foco: 'Integración multimodal', poblacion: 10000, activo: true, subnodos: 52, kpis: 9, activos_aprobados: 6, fichas_patrimoniales: 3, operativas: 3, productos_aprobados: 0, rag_fragmentos: 64, kpis_detalle: [{ kpi_key: 'subnodos_total', valor: 52, detalles: {} }] },
      ],
      guion: { doc: 'docs/nodes/valle-de-iglesia/VIG-007-DEMO-FINAL.md', pasos: 13 },
    };
    const data = normalizarShowcase(payload);
    expect(data.recorrido).toEqual(['caucete', 'capital', 'iglesia']);
    expect(data.nodos.map((n) => n.key)).toEqual(['caucete', 'capital', 'iglesia']);
    const iglesia = data.nodos[2];
    if (!iglesia) throw new Error('iglesia ausente');
    expect(iglesia.subnodos).toBe(52);
    expect(iglesia.kpis).toBe(9);
    expect(iglesia.rag_fragmentos).toBe(64);
    expect(data.guion.pasos).toBe(13);
  });

  it('los 0 permanecen 0 — sin maquillar (R15)', () => {
    const data = normalizarShowcase({
      recorrido: ['caucete'],
      nodos: [{ key: 'caucete', nombre: 'Caucete', kpis: 0, kpis_detalle: [] }],
    });
    const caucete = data.nodos[0];
    if (!caucete) throw new Error('caucete ausente');
    expect(caucete.kpis).toBe(0);
    expect(caucete.kpis_detalle).toEqual([]);
    expect(caucete.productos_aprobados).toBe(0);
  });

  it('conserva valor null del KPI como null (null ≠ 0, R15)', () => {
    const data = normalizarShowcase({
      recorrido: ['iglesia'],
      nodos: [{ key: 'iglesia', nombre: 'Valle de Iglesia', kpis_detalle: [{ kpi_key: 'cobertura_geometrica', valor: null, detalles: {} }] }],
    });
    const iglesia = data.nodos[0];
    if (!iglesia) throw new Error('iglesia ausente');
    const cobertura = iglesia.kpis_detalle.find((k) => k.kpi_key === 'cobertura_geometrica');
    if (!cobertura) throw new Error('KPI ausente');
    expect(cobertura.valor).toBeNull();
  });

  it('filtra claves inválidas del recorrido y nodos malformados, sin crash', () => {
    const data = normalizarShowcase({
      recorrido: ['caucete', 'mendoza', 'capital'],
      nodos: [{ key: 'no-un-nodo', nombre: 'X' }, null, { key: 'capital', nombre: 'Gran San Juan' }],
    });
    expect(data.recorrido).toEqual(['caucete', 'capital']);
    expect(data.nodos.map((n) => n.key)).toEqual(['capital']);
  });

  it('payload vacío → estructura vacía honesta (sin crash)', () => {
    const data = normalizarShowcase(undefined);
    expect(data.recorrido).toEqual([]);
    expect(data.nodos).toEqual([]);
    expect(data.guion.doc).toBe('');
    expect(data.guion.pasos).toBe(0);
  });
});

describe('notaCount (VIG-007, #193)', () => {
  it('explica el 0 como dato honesto (R15)', () => {
    expect(notaCount(0, 'KPIs')).toBe('KPIs: 0 (sin materializar aún — R15)');
    expect(notaCount(9, 'KPIs')).toBe('KPIs: 9');
  });
});

import { describe, expect, it } from 'vitest';
import {
  ANCLAS_REALES,
  CAPAS_MONTAJE,
  ETIQUETA_ESTADO,
  MONTAJE_PLATAFORMA,
  SUBNODOS_CAPITAL_RATIFICADOS,
  SUBNODOS_IGLESIA_DISTRITOS_RATIFICADOS,
  agruparPorCapa,
} from './montajePlataforma';

const VOCABULARIO_RATIFICADO = new Set<string>([
  ...SUBNODOS_CAPITAL_RATIFICADOS,
  ...SUBNODOS_IGLESIA_DISTRITOS_RATIFICADOS,
  'sj_iglesia_p_pismanta',
]);

describe('MONTAR-2 (#445): catálogo del montaje de la plataforma', () => {
  it('declara 35 bloques con ids únicos y campos completos', () => {
    expect(MONTAJE_PLATAFORMA).toHaveLength(35);
    const ids = MONTAJE_PLATAFORMA.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of MONTAJE_PLATAFORMA) {
      expect(b.id.length).toBeGreaterThan(0);
      expect(b.titulo.length).toBeGreaterThan(0);
      expect(b.detalle.length).toBeGreaterThan(0);
      expect(b.fuente.length).toBeGreaterThan(0);
    }
  });

  it('solo usa estados y capas del dominio honesto', () => {
    const estados = new Set(['verified', 'community_validated', 'pending', 'synthetic_demo']);
    const capas = new Set(CAPAS_MONTAJE.map((c) => c.capa));
    for (const b of MONTAJE_PLATAFORMA) {
      expect(estados.has(b.estado)).toBe(true);
      expect(capas.has(b.capa)).toBe(true);
    }
  });

  it('toda ancla apunta a una sección REAL de App.tsx', () => {
    const anclas = [...ANCLAS_REALES];
    for (const b of MONTAJE_PLATAFORMA) {
      if (b.ancla) expect(anclas).toContain(b.ancla);
    }
  });

  it('los 2 stages son synthetic_demo con ancla propia (R15)', () => {
    const stages = MONTAJE_PLATAFORMA.filter((b) => b.capa === 'stages');
    expect(stages).toHaveLength(2);
    const ids = stages.map((b) => b.id).sort();
    expect(ids).toEqual(['stage-capital-215', 'stage-valle-de-iglesia']);
    for (const b of stages) {
      expect(b.estado).toBe('synthetic_demo');
      expect(b.ancla).toBeTruthy();
    }
  });

  it('apila los 3 nodos federados con su montaje ratificado', () => {
    for (const prefijo of ['capital-', 'caucete-', 'iglesia-']) {
      const bloques = MONTAJE_PLATAFORMA.filter(
        (b) => b.capa === 'nodos' && b.id.startsWith(prefijo),
      );
      expect(bloques.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('apila sesión, Mi cuenta y los artefactos A1–A4 (ancla artefactos)', () => {
    const ids = new Set(MONTAJE_PLATAFORMA.map((b) => b.id));
    for (const id of [
      'artefacto-sesion',
      'artefacto-micuenta',
      'artefacto-a1',
      'artefacto-a2',
      'artefacto-a3',
      'artefacto-a4',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
    for (const b of MONTAJE_PLATAFORMA.filter((x) => x.capa === 'artefactos')) {
      expect(b.ancla).toBe('artefactos');
    }
  });

  it('la acreditación full-stack nace pending (R15: no se simula)', () => {
    const fullstack = MONTAJE_PLATAFORMA.find((b) => b.id === 'acreditacion-fullstack');
    expect(fullstack).toBeDefined();
    expect(fullstack?.estado).toBe('pending');
  });

  it('solo cita claves sj_* del vocabulario ratificado', () => {
    expect([...SUBNODOS_CAPITAL_RATIFICADOS]).toEqual([
      'sj_capital_centro',
      'sj_capital_desamparados',
    ]);
    expect(SUBNODOS_IGLESIA_DISTRITOS_RATIFICADOS).toHaveLength(6);
    for (const k of SUBNODOS_IGLESIA_DISTRITOS_RATIFICADOS) {
      expect(k.startsWith('sj_iglesia_')).toBe(true);
    }
    const tokens = new Set<string>();
    for (const b of MONTAJE_PLATAFORMA) {
      const texto = b.titulo + ' ' + b.detalle + ' ' + b.fuente;
      for (const m of texto.matchAll(/sj_[a-z0-9_]+[a-z0-9]/g)) tokens.add(m[0]);
    }
    expect(tokens.size).toBeGreaterThan(0);
    for (const t of tokens) {
      expect(VOCABULARIO_RATIFICADO.has(t)).toBe(true);
    }
  });

  it('agruparPorCapa reparte los 35 bloques en 5 capas no vacías', () => {
    const grupos = agruparPorCapa(MONTAJE_PLATAFORMA);
    expect(grupos).toHaveLength(5);
    expect(grupos.map((g) => g.capa)).toEqual(CAPAS_MONTAJE.map((c) => c.capa));
    for (const g of grupos) {
      expect(g.bloques.length).toBeGreaterThan(0);
    }
    expect(grupos.reduce((n, g) => n + g.bloques.length, 0)).toBe(MONTAJE_PLATAFORMA.length);
  });

  it('etiqueta cada estado epistémico sin huecos', () => {
    expect(Object.keys(ETIQUETA_ESTADO)).toHaveLength(4);
    for (const estado of ['verified', 'community_validated', 'pending', 'synthetic_demo']) {
      expect(ETIQUETA_ESTADO[estado as keyof typeof ETIQUETA_ESTADO].length).toBeGreaterThan(0);
    }
  });
});

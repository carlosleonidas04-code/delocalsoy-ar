import { describe, expect, it } from 'vitest';

// MVP-1 «Atlas Territorial» S4 (RFC-021, #532): lógica del frontend del
// atlas contra la forma REAL de GET /api/atlas/:nodo (ADR-084). R5: ningún
// error se vuelve [] — la divergencia del contrato se propaga. R15: los
// estados honestos se declaran con texto, jamás solo color (WCAG 2.2 AA,
// ADR-061). Sin ranking entre nodos (R5/ADR-036).

import {
  descripcionAccesibleBloque,
  ETIQUETAS_ESTADO_BLOQUE,
  etiquetaEstadoBloque,
  METADATOS_BLOQUE,
  NODOS_ATLAS,
  normalizarAtlasNodo,
  ORDEN_BLOQUES_ATLAS,
  type AtlasNodoUI,
} from './atlasTerritorial';

// Forma real del endpoint (S3): envelope {success, data, count} con 5
// bloques en orden canónico y detalle textual por estado.
const PAYLOAD_OK = {
  success: true,
  count: 5,
  data: {
    nodo_key: 'iglesia',
    bloques: [
      { bloque: 'vocabulario', estado: 'publicado', detalle: 'CORE-002: nodo con 9 capas, 4 categorías y 12 features declaradas' },
      { bloque: 'kpis', estado: 'sin_fuente_ingestada', detalle: 'LIC-R1: sin snapshots de KPIs para el nodo — 0 honesto (R15)' },
      { bloque: 'amenazas', estado: 'en_custodia', detalle: 'LIC-R4: capa sísmica declarada sin ingesta publicada — en custodia del pipeline (R15: sin geometría de memoria)' },
      { bloque: 'convenios', estado: 'sin_fuente_ingestada', detalle: 'LIC-R9: sin convenios declarados para el nodo — 0 honesto (R15)' },
      { bloque: 'curricular', estado: 'sin_fuente_ingestada', detalle: 'MVP-1: catálogo curricular nace vacío — corpus DLUI-IT sin ingesta autorizada por la DH (ECO-5, R15)' },
    ],
  },
};

describe('normalizarAtlasNodo (MVP-1 S4 — RFC-021, ADR-084)', () => {
  it('normaliza el payload real con los 5 bloques acreditados en orden canónico', () => {
    const atlas = normalizarAtlasNodo(PAYLOAD_OK.data, 'iglesia');
    expect(atlas.nodo_key).toBe('iglesia');
    expect(atlas.bloques.map((b) => b.bloque)).toEqual([...ORDEN_BLOQUES_ATLAS]);
    expect(atlas.bloques).toHaveLength(5);
    expect(atlas.bloques[0]).toEqual({
      bloque: 'vocabulario',
      estado: 'publicado',
      detalle: PAYLOAD_OK.data.bloques[0].detalle,
    });
  });

  it('reordena a canónico aunque la API devuelva otro orden (vista declarada, ADR-084)', () => {
    const desordenado = {
      nodo_key: 'capital',
      bloques: [...PAYLOAD_OK.data.bloques]
        .reverse()
        .map((b) => ({ bloque: b.bloque, estado: b.estado, detalle: b.detalle })),
    };
    const atlas = normalizarAtlasNodo(desordenado, 'capital');
    expect(atlas.bloques.map((b) => b.bloque)).toEqual([...ORDEN_BLOQUES_ATLAS]);
  });

  it('detalle ausente o vacío → null honesto (R15: null ≠ 0, nada fabricado)', () => {
    const sinDetalle = {
      nodo_key: 'caucete',
      bloques: [
        { bloque: 'vocabulario', estado: 'publicado' },
        { bloque: 'kpis', estado: 'publicado', detalle: '' },
        { bloque: 'amenazas', estado: 'en_custodia', detalle: 'LIC-R4: capa sísmica declarada sin ingesta publicada' },
        { bloque: 'convenios', estado: 'sin_fuente_ingestada', detalle: 'LIC-R9: sin convenios declarados' },
        { bloque: 'curricular', estado: 'publicado', detalle: 'MVP-1: matriz curricular con 1 cursos' },
      ],
    };
    const atlas = normalizarAtlasNodo(sinDetalle, 'caucete');
    expect(atlas.bloques[0].detalle).toBeNull();
    expect(atlas.bloques[1].detalle).toBeNull();
  });

  it('R5: nodo_key que no coincide con el solicitado → error, jamás datos ajenos', () => {
    expect(() => normalizarAtlasNodo(PAYLOAD_OK.data, 'capital')).toThrow('no coincide');
  });

  it('R5: bloque faltante, duplicado o desconocido → error, jamás bloque fabricado', () => {
    const sinCurricular = {
      nodo_key: 'capital',
      bloques: PAYLOAD_OK.data.bloques.filter((b) => b.bloque !== 'curricular'),
    };
    expect(() => normalizarAtlasNodo(sinCurricular, 'capital')).toThrow('falta el bloque acreditado');

    const duplicado = {
      nodo_key: 'capital',
      bloques: [...PAYLOAD_OK.data.bloques, PAYLOAD_OK.data.bloques[0]],
    };
    expect(() => normalizarAtlasNodo(duplicado, 'capital')).toThrow('duplicado');

    const desconocido = {
      nodo_key: 'capital',
      bloques: [...PAYLOAD_OK.data.bloques, { bloque: 'ranking_nodos', estado: 'publicado' }],
    };
    expect(() => normalizarAtlasNodo(desconocido, 'capital')).toThrow('desconocido');
  });

  it('R5: estado fuera del vocabulario honesto → error (nada se estima, R15)', () => {
    const estimado = {
      nodo_key: 'capital',
      bloques: PAYLOAD_OK.data.bloques.map((b) =>
        b.bloque === 'kpis' ? { ...b, estado: 'estimado' } : b,
      ),
    };
    expect(() => normalizarAtlasNodo(estimado, 'capital')).toThrow('estado honesto inválido');
  });

  it('R5: payload no-objeto o bloques no-arreglo → error, jamás [] silencioso', () => {
    expect(() => normalizarAtlasNodo(null, 'capital')).toThrow('malformada');
    expect(() => normalizarAtlasNodo([PAYLOAD_OK.data], 'capital')).toThrow('malformada');
    expect(() => normalizarAtlasNodo({ nodo_key: 'capital', bloques: 'no-soy-arreglo' }, 'capital')).toThrow('malformada');
  });
});

describe('estados y accesibilidad del atlas (WCAG 2.2 AA — ADR-061)', () => {
  it('los 3 estados honestos tienen etiqueta textual — el color nunca es el único portador (1.4.1)', () => {
    expect(ETIQUETAS_ESTADO_BLOQUE.publicado).toBe('Publicado');
    expect(ETIQUETAS_ESTADO_BLOQUE.sin_fuente_ingestada).toBe('Sin fuente ingerida');
    expect(ETIQUETAS_ESTADO_BLOQUE.en_custodia).toBe('En custodia del pipeline');
    for (const estado of ['publicado', 'sin_fuente_ingestada', 'en_custodia'] as const) {
      expect(etiquetaEstadoBloque(estado)).toBe(ETIQUETAS_ESTADO_BLOQUE[estado]);
    }
  });

  it('los 5 bloques acreditados llevan título y descripción accesible (WCAG 2.2 AA)', () => {
    for (const id of ORDEN_BLOQUES_ATLAS) {
      const meta = METADATOS_BLOQUE[id];
      expect(meta.titulo.length).toBeGreaterThanOrEqual(3);
      expect(meta.descripcion.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('la descripción accesible combina título + estado en texto + detalle real', () => {
    const atlas: AtlasNodoUI = normalizarAtlasNodo(PAYLOAD_OK.data, 'iglesia');
    const vocab = atlas.bloques[0];
    const desc = descripcionAccesibleBloque(vocab);
    expect(desc).toContain(METADATOS_BLOQUE.vocabulario.titulo);
    expect(desc).toContain('Publicado');
    expect(desc).toContain('CORE-002');
    const kpis = atlas.bloques[1];
    expect(descripcionAccesibleBloque(kpis)).toContain('Sin fuente ingerida');
  });

  it('anti-ranking: los metadatos no declaran puntajes, posiciones ni comparaciones (R5/ADR-036)', () => {
    const serializado = JSON.stringify({ METADATOS_BLOQUE, ETIQUETAS_ESTADO_BLOQUE, NODOS_ATLAS }).toLowerCase();
    expect(serializado).not.toMatch(/puntaje|ranking|score|posicion|mejor|peor/);
  });

  it('el selector de nodos usa el vocabulario canónico de los 3 nodos', () => {
    expect(NODOS_ATLAS.map((n) => n.key)).toEqual(['capital', 'caucete', 'iglesia']);
    expect(NODOS_ATLAS.every((n) => n.nombre.length >= 3)).toBe(true);
  });
});

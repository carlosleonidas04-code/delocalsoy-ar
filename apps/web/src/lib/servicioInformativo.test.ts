import { describe, expect, it } from 'vitest';

// NC-R5 (#142, NODO-CAU): lógica del servicio informativo contra las formas
// reales de la API (/api/fuentes, /api/ingestas, /api/nodos/caucete/capas y
// /features). R15: nada se inventa — 0 es 0 y solo lo publicado se muestra.

import { ApiDataSource } from './ApiDataSource';
import {
  agruparCapasPorDominio,
  CAPAS_V6_CAUCETE,
  esOrigenSintetico,
  ETIQUETA_STAGING_R15,
  etiquetaDualFeature,
  etiquetaEstadoFuente,
  leyendaEstados,
  normalizarCapas,
  normalizarFeatures,
  normalizarFuentes,
  normalizarIngestas,
  notaIngestas,
  type FeatureInformativa,
} from './servicioInformativo';

interface FakeResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

function responder(body: unknown, status = 200): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function fetchConBody(body: unknown, status = 200): typeof fetch {
  const impl = (async () => responder(body, status)) as unknown as typeof fetch;
  return impl;
}

const FUENTE_ROW = {
  id: 'f-001',
  key: 'catastro_vector',
  organismo: 'Catastro Provincial',
  nombre: 'Cobertura catastral vector',
  url: 'https://ejemplo.gob.ar/wms',
  tipo: 'wms',
  licencia: null,
  estado: 'requiere_credenciales',
  cautela: 'Requiere credenciales solicitadas formalmente',
  created_at: '2026-10-15T12:00:00.000Z',
  updated_at: '2026-10-15T12:00:00.000Z',
};

describe('normalizarFuentes (NC-R5 #142, ADR-035)', () => {
  it('normaliza el payload real de /api/fuentes con estados honestos y cautelas', () => {
    const payload = {
      success: true,
      count: 2,
      data: [
        FUENTE_ROW,
        {
          id: 'f-002',
          key: 'indec_cnv2022',
          organismo: 'INDEC',
          nombre: 'Localidades censales',
          url: null,
          tipo: 'descarga',
          licencia: 'Datos abiertos',
          estado: 'disponible',
          cautela: 'Corte censal 2022',
          created_at: '2026-10-15T12:00:00.000Z',
          updated_at: '2026-10-15T12:00:00.000Z',
        },
      ],
    };
    const fuentes = normalizarFuentes(payload);
    expect(fuentes).toHaveLength(2);
    const primera = fuentes[0];
    if (!primera) throw new Error('fuente ausente');
    expect(primera.estado).toBe('requiere_credenciales');
    expect(etiquetaEstadoFuente(primera.estado)).toBe('Requiere credenciales');
    const segunda = fuentes[1];
    if (!segunda) throw new Error('segunda fuente ausente');
    expect(segunda.url).toBeNull();
    expect(segunda.licencia).toBe('Datos abiertos');
  });

  it('conserva estados desconocidos tal cual (R15: sin recortar vocabulario)', () => {
    const fuentes = normalizarFuentes({
      success: true,
      count: 1,
      data: [
        { id: 'f-x', key: 'nueva', organismo: 'O', nombre: 'N', url: null, tipo: 'api', licencia: null, estado: 'estado_futuro', cautela: '' },
      ],
    });
    const unica = fuentes[0];
    if (!unica) throw new Error('fuente ausente');
    expect(unica.estado).toBe('estado_futuro');
    expect(etiquetaEstadoFuente('estado_futuro')).toBe('estado_futuro');
  });
});

describe('normalizarIngestas (NC-EV-09: solo lo publicado es público)', () => {
  const fila = (id: string, estado: string) => ({
    id,
    source_id: 'src-' + id,
    fuente_key: 'catastro_vector',
    nodo_key: 'caucete',
    capa_servicio: 'hydrology',
    fecha_acceso: '2026-10-15',
    fecha_corte: '2026-10-01',
    licencia: null,
    crs_origen: 'EPSG:4326',
    crs_normalizado: 'EPSG:4326',
    escala_precision: '1:25000',
    external_id: null,
    transformaciones: null,
    estado,
    created_by_hash: 'h',
    hash: 'hash-' + id,
    created_at: '2026-10-15T12:00:00.000Z',
    updated_at: '2026-10-15T12:00:00.000Z',
  });

  it('filtra las filas no publicadas del pipeline de procedencia', () => {
    const ingestas = normalizarIngestas({
      success: true,
      count: 3,
      data: [fila('i-1', 'recibido'), fila('i-2', 'validado_tecnicamente'), fila('i-3', 'publicado')],
    });
    expect(ingestas).toHaveLength(1);
    const publicada = ingestas[0];
    if (!publicada) throw new Error('ingesta ausente');
    expect(publicada.estado).toBe('publicado');
    expect(publicada.fuente_key).toBe('catastro_vector');
  });

  it('count 0 → nota honesta (R15), nunca maquetado', () => {
    expect(notaIngestas(0)).toContain('sin materializar aún');
    expect(notaIngestas(0)).toContain('0');
    expect(notaIngestas(2)).toBe('Ingestas publicadas: 2');
  });

  it('payload malformado no crashea y no inventa filas', () => {
    expect(normalizarIngestas(undefined)).toEqual([]);
    expect(normalizarIngestas({ success: true, data: 'no-array' })).toEqual([]);
  });
});

describe('normalizarCapas / normalizarFeatures (#141 vocabulario v6)', () => {
  const CAPA_ROWS = [
    { id: 'c-1', nodo_id: 'n1', key: 'health_facilities', nombre: 'Salud', dominio: 'health', geometria: 'Point', default_on: true },
    { id: 'c-2', nodo_id: 'n1', key: 'education', nombre: 'Educación', dominio: 'community', geometria: 'Point', default_on: true },
    { id: 'c-3', nodo_id: 'n1', key: 'community_spaces', nombre: 'Espacios y recursos comunitarios', dominio: 'community', geometria: 'Point', default_on: true },
    { id: 'c-4', nodo_id: 'n1', key: 'resilience_points', nombre: 'Puntos de resiliencia', dominio: 'health', geometria: 'Point', default_on: false },
    { id: 'c-5', nodo_id: 'n1', key: 'community_resources', nombre: 'Agua y recursos básicos', dominio: 'community', geometria: 'Point', default_on: false },
    { id: 'c-6', nodo_id: 'n1', key: 'hydrology', nombre: 'Hidrología: canales, acequias y drenaje', dominio: 'assets', geometria: 'LineString', default_on: true },
    { id: 'c-7', nodo_id: 'n1', key: 'seismic_risk', nombre: 'Riesgo sísmico y puntos de encuentro', dominio: 'health', geometria: 'Point', default_on: true },
    { id: 'c-8', nodo_id: 'n1', key: 'public_space', nombre: 'Espacio público y mejora del común', dominio: 'public_space', geometria: 'Point', default_on: true },
    { id: 'c-9', nodo_id: 'n1', key: 'accessibility', nombre: 'Accesibilidad: veredas, rampas y transporte', dominio: 'problems', geometria: 'Point', default_on: false },
    { id: 'c-10', nodo_id: 'n1', key: 'sustainability', nombre: 'Sustentabilidad: agua, arbolado, energía y residuos', dominio: 'community', geometria: 'Point', default_on: false },
  ];

  it('normaliza las 10 capas de caucete y agrupa por dominio con las v6 presentes', () => {
    const capas = normalizarCapas({ success: true, count: CAPA_ROWS.length, data: CAPA_ROWS });
    expect(capas).toHaveLength(10);
    for (const key of CAPAS_V6_CAUCETE) {
      expect(capas.some((c) => c.key === key)).toBe(true);
    }
    const grupos = agruparCapasPorDominio(capas);
    const dominios = grupos.map((g) => g.dominio);
    expect(dominios).toEqual([...dominios].sort());
    const health = grupos.find((g) => g.dominio === 'health');
    if (!health) throw new Error('grupo health ausente');
    expect(health.capas.map((c) => c.key)).toEqual(['health_facilities', 'resilience_points', 'seismic_risk']);
  });

  it('normaliza features con estado honesto y origen sintético explícito', () => {
    const features = normalizarFeatures({
      success: true,
      count: 2,
      data: [
        { id: 'seed-f-cau-201', layer: 'hydrology', domain: 'assets', titulo: 'Acequia obstruida — tramo crítico', tipo: 'problem', estado: 'community_validated', fuente_label: 'Ilustrativa · relevamiento comunitario', observado_at: '2026-10-05T12:00:00Z', lat: -31.383, lng: -68.291, is_synthetic: true },
        { id: 'f-real-1', layer: 'hydrology', domain: 'assets', titulo: 'Canal Norte — sección Caucete', tipo: 'asset', estado: 'verified', fuente_label: 'Hidráulica · inventario oficial', observado_at: '2026-10-01T12:00:00Z', lat: -31.38, lng: -68.28, is_synthetic: false },
      ],
    });
    expect(features).toHaveLength(2);
    const sintetica = features[0];
    if (!sintetica) throw new Error('feature sintética ausente');
    const real = features[1];
    if (!real) throw new Error('feature real ausente');
    expect(esOrigenSintetico(sintetica)).toBe(true);
    expect(esOrigenSintetico(real)).toBe(false);
    expect(etiquetaDualFeature(sintetica)).toBe('Validado por la comunidad · Sintético');
    expect(etiquetaDualFeature(real)).toBe('Verificado · Real');
  });

  it('leyendaEstados cuenta por estado y separa los sintéticos', () => {
    const mk = (estado: string, isSynthetic: boolean): FeatureInformativa => ({
      id: 'x-' + estado + String(isSynthetic),
      layer: 'hydrology',
      domain: 'assets',
      titulo: 't',
      tipo: 'problem',
      estado,
      fuente_label: isSynthetic ? 'Ilustrativa · relevamiento comunitario' : 'Organismo · referencia',
      observado_at: null,
      lat: null,
      lng: null,
      is_synthetic: isSynthetic,
    });
    const leyenda = leyendaEstados([
      mk('verified', false),
      mk('community_validated', true),
      mk('community_validated', false),
      mk('pending', true),
    ]);
    const primero = leyenda[0];
    if (!primero) throw new Error('leyenda vacía');
    expect(primero.estado).toBe('verified');
    const cv = leyenda.find((l) => l.estado === 'community_validated');
    if (!cv) throw new Error('community_validated ausente');
    expect(cv.count).toBe(2);
    expect(cv.sinteticos).toBe(1);
  });

  it('etiqueta de staging R15 disponible para el material no acreditado', () => {
    expect(ETIQUETA_STAGING_R15).toBe('En Staging — Pendiente de PR/Merge');
  });
});

describe('ApiDataSource — acople /api (ADR-029, R5 sin fallbacks silenciosos)', () => {
  it('listIngestas consulta /api/ingestas?nodo=caucete y devuelve solo lo publicado', async () => {
    let llamadaUrl = '';
    const spy = (async (input: RequestInfo | URL) => {
      llamadaUrl = String(input);
      return responder({
        success: true,
        count: 2,
        data: [
          { id: 'i-1', fuente_key: 'catastro_vector', nodo_key: 'caucete', capa_servicio: 'hydrology', fecha_acceso: '2026-10-15', fecha_corte: '2026-10-01', licencia: null, crs_origen: 'EPSG:4326', crs_normalizado: 'EPSG:4326', escala_precision: '1:25000', estado: 'recibido' },
          { id: 'i-2', fuente_key: 'indec_cnv2022', nodo_key: 'caucete', capa_servicio: 'education', fecha_acceso: '2026-10-14', fecha_corte: '2026-10-01', licencia: 'Datos abiertos', crs_origen: 'EPSG:4326', crs_normalizado: 'EPSG:4326', escala_precision: null, estado: 'publicado' },
        ],
      });
    }) as unknown as typeof fetch;
    const ds = new ApiDataSource({ fetchImpl: spy });
    const ingestas = await ds.listIngestas?.('caucete');
    expect(llamadaUrl).toContain('/api/ingestas?nodo=caucete');
    expect(ingestas).toHaveLength(1);
    const publicada = ingestas?.[0];
    if (!publicada) throw new Error('ingesta publicada ausente');
    expect(publicada.estado).toBe('publicado');
    expect(publicada.capa_servicio).toBe('education');
  });

  it('listFuentes y listNodeCapas/listNodeFeatures contra las rutas reales', async () => {
    const fuentes = await new ApiDataSource({
      fetchImpl: fetchConBody({ success: true, count: 1, data: [FUENTE_ROW] }),
    }).listFuentes?.();
    expect(fuentes).toHaveLength(1);
    expect(fuentes?.[0]?.key).toBe('catastro_vector');

    const capas = await new ApiDataSource({
      fetchImpl: fetchConBody({ success: true, count: 1, data: [{ id: 'c-6', key: 'hydrology', nombre: 'Hidrología', dominio: 'assets', geometria: 'LineString', default_on: true }] }),
    }).listNodeCapas?.('caucete');
    expect(capas?.[0]?.key).toBe('hydrology');

    const features = await new ApiDataSource({
      fetchImpl: fetchConBody({ success: true, count: 1, data: [{ id: 'seed-f-cau-203', layer: 'seismic_risk', domain: 'health', titulo: 'Punto de encuentro comunitario señalado', tipo: 'asset', estado: 'verified', fuente_label: 'Ilustrativa · inventario institucional', observado_at: '2026-10-04T12:00:00Z', lat: -31.386, lng: -68.279, is_synthetic: true }] }),
    }).listNodeFeatures?.('caucete');
    expect(features?.[0]?.estado).toBe('verified');
    expect(features?.[0]?.is_synthetic).toBe(true);
  });

  it('un 404 se propaga como DataSourceHttpError — jamás [] (R5)', async () => {
    const ds = new ApiDataSource({
      fetchImpl: fetchConBody({ success: false, error: 'Ruta no encontrada' }, 404),
    });
    await expect(ds.listFuentes?.()).rejects.toMatchObject({
      name: 'DataSourceHttpError',
      status: 404,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { ApiDataSource } from './ApiDataSource';
import { DataSourceHttpError, SyntheticDataSource } from './dataSource';
import {
  ESTADOS_PUBLICOS,
  OPORTUNIDAD_TRANSICIONES,
  SECUENCIA_CICLO,
  esSinteticaOportunidad,
  normalizarAccesibilidad,
  normalizarCorredores,
  normalizarOportunidades,
} from './oportunidades';

/**
 * NCAP-FE #163 (cascada NODO-CAPITAL): suite del contrato de la vista del
 * nodo Capital — oportunidades (NCAP-R6), corredores (NCAP-R4) y
 * accesibilidad (NCAP-R5) por DataSource (ADR-029). R5: los errores HTTP se
 * propagan tipados, JAMÁS se enmascaran como lista vacía.
 */

const OPORTUNIDAD_ROW = {
  id: 'opp-cap-001',
  tipo: 'human_capacity',
  titulo: 'Taller de oficios del microcentro',
  descripcion: 'Capacidad humana comunitaria del centro.',
  estado: 'under_review',
  nodo_key: 'capital',
  subnodo_key: 'sj_capital_centro',
  evidencia: {
    evidence_type: 'community_input',
    descripcion: 'Asamblea vecinal del 2026-11-05',
    reference_url: null,
    validationStatus: null,
  },
  actores: [{ role: 'proposer', name: 'Cooperativa de oficios', consent_confirmed: true }],
  tags: ['oficios'],
  scoring: null,
  territorial_context: {
    corridor_id: 'cor_centro_micro_macro',
    landmark_id: null,
    service_area_name: 'Microcentro',
  },
  created_by_hash: 'abc123',
  hash: 'h1',
  created_at: '2026-11-05T12:00:00.000Z',
  updated_at: '2026-11-05T12:00:00.000Z',
};

const CORREDOR_ROW = {
  key: 'cor_centro_civico',
  label: 'Corredor Cívico-Cultural',
  proposito: 'Articulación cívico-cultural del centro.',
  status: 'candidate',
  nodo_key: 'capital',
  segmentos_count: 3,
  hitos_count: 2,
  continuidad: 'ok',
};

const ACCESIBILIDAD_DATA = {
  nodo_key: 'capital',
  generado_en: '2026-11-05T12:00:00.000Z',
  regla: 'Conteos con cobertura y fecha — jamás puntajes globales (R5/ADR-036)',
  features_por_capa: [
    {
      capa: 'accessibility',
      total: 10,
      por_estado: { pending: 2, community_validated: 2, verified: 1, disputed: 1, synthetic_demo: 4 },
    },
    { capa: 'sidewalks', total: 19, por_estado: { declared: 18, community_validated: 1 } },
  ],
  features_por_fuente: [
    { fuente: 'Ilustrativa · anuncio de repavimentación microcentro 2026', total: 18 },
  ],
  reportes_por_categoria: [{ categoria: 'tramo_priorizado', total: 18 }],
  tramos_vereda: {
    priorizados: 18,
    con_relevamiento: 0,
    cobertura: '0 de 18 tramos priorizados cuentan con relevamiento',
    fecha_corte: '2026-11-05T12:00:00.000Z',
    cautela: 'Anuncio municipal: anuncio ≠ obra (R15).',
  },
  observaciones: {
    ingresadas: 2,
    revisadas: 2,
    corroboradas: 1,
    disputadas: 1,
    ilustrativas: 4,
    fecha_corte: '2026-11-05T12:00:00.000Z',
  },
  hitos: [
    {
      key: 'hit_plaza_mayor',
      label: 'Plaza Mayor',
      tipo: 'plaza',
      con_ficha: true,
      ultima_revision: '2026-11-05T12:00:00.000Z',
    },
  ],
};

class FakeResponse {
  public readonly ok: boolean;
  public readonly status: number;
  public readonly headers: { get: () => null };
  private readonly body: unknown;
  constructor(status: number, body: unknown) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.body = body;
    this.headers = { get: () => null };
  }
  public async json(): Promise<unknown> {
    return this.body;
  }
}

function crearFetchSpy(status: number, body: unknown): { fetchImpl: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  const fetchImpl = (async (input: unknown, _init?: unknown) => {
    urls.push(String(input));
    return new FakeResponse(status, body);
  }) as unknown as typeof fetch;
  return { fetchImpl, urls };
}

describe('oportunidades — normalización y vocabulario (NCAP-R6/R4/R5)', () => {
  it('normaliza la fila real de /api/oportunidades (envoltura success/data)', () => {
    const items = normalizarOportunidades({
      success: true,
      data: [OPORTUNIDAD_ROW],
      count: 1,
      total: 1,
    });
    expect(items).toHaveLength(1);
    const o = items[0];
    expect(o.id).toBe('opp-cap-001');
    expect(o.tipo).toBe('human_capacity');
    expect(o.estado).toBe('under_review');
    expect(o.nodo_key).toBe('capital');
    expect(o.subnodo_key).toBe('sj_capital_centro');
    expect(o.scoring).toBeNull();
    expect(o.territorial_context?.corridor_id).toBe('cor_centro_micro_macro');
    expect(o.evidencia.validationStatus).toBeNull();
    expect(o.actores[0]?.consent_confirmed).toBe(true);
    expect(o.tags).toEqual(['oficios']);
  });

  it('acepta payload arreglo directo (sin envoltura)', () => {
    expect(normalizarOportunidades([OPORTUNIDAD_ROW])).toHaveLength(1);
  });

  it('preserva el scoring declarado (null ≠ niveles: no inventa)', () => {
    const items = normalizarOportunidades([
      {
        ...OPORTUNIDAD_ROW,
        scoring: {
          territorial_impact: 'alta',
          feasibility: 'media',
          urgency: 'baja',
          metodo: 'taller comunitario 2026-11-05',
          fuente: null,
        },
      },
    ]);
    expect(items[0]?.scoring).toMatchObject({
      territorial_impact: 'alta',
      feasibility: 'media',
      urgency: 'baja',
      metodo: 'taller comunitario 2026-11-05',
    });
  });

  it('preserva vocabulario futuro sin recortarlo (R15)', () => {
    const items = normalizarOportunidades([
      { ...OPORTUNIDAD_ROW, estado: 'bogus_estado', tipo: 'nuevo_tipo' },
    ]);
    expect(items[0]?.estado).toBe('bogus_estado');
    expect(items[0]?.tipo).toBe('nuevo_tipo');
  });

  it('ESTADOS_PUBLICOS tiene 9 estados y nunca publica discarded', () => {
    expect(ESTADOS_PUBLICOS).toHaveLength(9);
    expect(ESTADOS_PUBLICOS.includes('discarded')).toBe(false);
  });

  it('la matriz de transiciones espeja la canónica de la API (NCAP-R6 #158)', () => {
    expect(Object.keys(OPORTUNIDAD_TRANSICIONES)).toHaveLength(10);
    expect(OPORTUNIDAD_TRANSICIONES.detected).toEqual(['under_review', 'discarded']);
    expect(OPORTUNIDAD_TRANSICIONES.implemented).toEqual(['archived']);
    expect(OPORTUNIDAD_TRANSICIONES.archived).toEqual([]);
    expect(OPORTUNIDAD_TRANSICIONES.paused).toEqual(['prioritized', 'in_development', 'discarded']);
  });

  it('SECUENCIA_CICLO es el camino principal sin laterales', () => {
    expect(SECUENCIA_CICLO).toEqual([
      'detected',
      'under_review',
      'validated',
      'prioritized',
      'in_development',
      'active',
      'implemented',
    ]);
  });

  it('esSinteticaOportunidad detecta el título [SINTÉTICO]', () => {
    expect(esSinteticaOportunidad({ ...OPORTUNIDAD_ROW, titulo: '[SINTÉTICO] demo' })).toBe(true);
    expect(esSinteticaOportunidad(OPORTUNIDAD_ROW)).toBe(false);
  });

  it('normalizarCorredores mapea la fila real de /api/corredores (NCAP-R4)', () => {
    const corredores = normalizarCorredores({ success: true, data: [CORREDOR_ROW] });
    expect(corredores).toHaveLength(1);
    expect(corredores[0]).toMatchObject({
      key: 'cor_centro_civico',
      status: 'candidate',
      continuidad: 'ok',
      segmentos_count: 3,
      hitos_count: 2,
    });
  });

  it('normalizarAccesibilidad mapea el data real del nodo Capital (18 tramos, NCAP-R5)', () => {
    const a = normalizarAccesibilidad(ACCESIBILIDAD_DATA);
    expect(a.nodo_key).toBe('capital');
    expect(a.tramos_vereda.priorizados).toBe(18);
    expect(a.tramos_vereda.con_relevamiento).toBe(0);
    expect(a.tramos_vereda.cobertura).toBe('0 de 18 tramos priorizados cuentan con relevamiento');
    expect(a.observaciones).toMatchObject({
      ingresadas: 2,
      revisadas: 2,
      corroboradas: 1,
      disputadas: 1,
      ilustrativas: 4,
    });
    expect(a.features_por_capa[1]?.por_estado.declared).toBe(18);
    expect(a.features_por_capa[0]?.por_estado.synthetic_demo).toBe(4);
    expect(a.hitos[0]?.con_ficha).toBe(true);
    expect(a.hitos[0]?.ultima_revision).not.toBeNull();
  });

  it('normalizarAccesibilidad degrada por contrato de forma fija (R5)', () => {
    const a = normalizarAccesibilidad({});
    expect(a.tramos_vereda.priorizados).toBe(0);
    expect(a.tramos_vereda.cobertura).toBe('');
    expect(a.hitos).toEqual([]);
  });

  it('ApiDataSource.listOportunidades llama /api/oportunidades con parámetros canónicos', async () => {
    const { fetchImpl, urls } = crearFetchSpy(200, {
      success: true,
      data: [OPORTUNIDAD_ROW],
      count: 1,
      total: 1,
    });
    const ds = new ApiDataSource({ fetchImpl });
    const items = await ds.listOportunidades({ nodo: 'capital', limit: 100 });
    expect(urls).toEqual(['/api/oportunidades?nodo=capital&limit=100']);
    expect(items).toHaveLength(1);
  });

  it('listOportunidades propaga el 404 como DataSourceHttpError (R5: sin fallback)', async () => {
    const { fetchImpl } = crearFetchSpy(404, { success: false, error: 'no existe' });
    const ds = new ApiDataSource({ fetchImpl });
    await expect(ds.listOportunidades()).rejects.toMatchObject({
      name: 'DataSourceHttpError',
      status: 404,
    });
  });

  it('listCorredores llama exactamente /api/corredores', async () => {
    const { fetchImpl, urls } = crearFetchSpy(200, { success: true, data: [CORREDOR_ROW] });
    const ds = new ApiDataSource({ fetchImpl });
    const corredores = await ds.listCorredores();
    expect(urls).toEqual(['/api/corredores']);
    expect(corredores[0]?.key).toBe('cor_centro_civico');
  });

  it('getAccesibilidad llama /api/nodos/:key/accesibilidad y normaliza data (NCAP-R5)', async () => {
    const { fetchImpl, urls } = crearFetchSpy(200, { success: true, data: ACCESIBILIDAD_DATA });
    const ds = new ApiDataSource({ fetchImpl });
    const resumen = await ds.getAccesibilidad('capital');
    expect(urls).toEqual(['/api/nodos/capital/accesibilidad']);
    expect(resumen.tramos_vereda.priorizados).toBe(18);
  });

  it('getAccesibilidad rechaza data malformada con 500 honesto (R5)', async () => {
    const { fetchImpl } = crearFetchSpy(200, { success: true, data: [] });
    const ds = new ApiDataSource({ fetchImpl });
    await expect(ds.getAccesibilidad('capital')).rejects.toMatchObject({
      name: 'DataSourceHttpError',
      status: 500,
    });
  });

  it('SyntheticDataSource declara 2 oportunidades [SINTÉTICO] y filtra honesto', async () => {
    const ds = new SyntheticDataSource();
    const todas = await ds.listOportunidades();
    expect(todas).toHaveLength(2);
    expect(todas.every(esSinteticaOportunidad)).toBe(true);
    const capital = await ds.listOportunidades({ nodo: 'capital' });
    expect(capital).toHaveLength(2);
    const caucete = await ds.listOportunidades({ nodo: 'caucete' });
    expect(caucete).toHaveLength(0);
  });

  it('SyntheticDataSource ofrece 2 corredores candidate con paridad', async () => {
    const ds = new SyntheticDataSource();
    const corredores = await ds.listCorredores();
    expect(corredores).toHaveLength(2);
    expect(corredores.every((c) => c.status === 'candidate')).toBe(true);
  });

  it('SyntheticDataSource.getAccesibilidad: capital cobertura 0 de 2 honesta; caucete 404 (R5)', async () => {
    const ds = new SyntheticDataSource();
    const capital = await ds.getAccesibilidad('capital');
    expect(capital.tramos_vereda.cobertura).toBe('0 de 2 tramos priorizados cuentan con relevamiento');
    expect(capital.tramos_vereda.con_relevamiento).toBe(0);
    await expect(ds.getAccesibilidad('caucete')).rejects.toMatchObject({
      name: 'DataSourceHttpError',
      status: 404,
    });
  });

  it('DataSourceHttpError expone status y endpoint tipados (contrato R5)', () => {
    const err = new DataSourceHttpError({
      status: 503,
      endpoint: '/api/oportunidades',
      message: 'degradado',
    });
    expect(err.name).toBe('DataSourceHttpError');
    expect(err.status).toBe(503);
    expect(err.endpoint).toBe('/api/oportunidades');
  });
});

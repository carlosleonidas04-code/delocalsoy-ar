// NODO-VIG-3 VIG-014 (#380, épica #377 — cierra el módulo): lógica del
// panel de infraestructura y movilidad del nodo iglesia contra las formas
// reales de la API (VIG-013 dashboard, VIG-012 pedidos, VIG-001 subnodos,
// VIG-011 AMC). R15: nada se inventa — null ≠ 0, 0 es 0 y solo lo
// publicado se muestra. R5: el error ES error, jamás [].

import { describe, expect, it } from 'vitest';
import { ApiDataSource } from './ApiDataSource';
import { DataSourceHttpError, SyntheticDataSource } from './dataSource';
import {
  AMC_CATEGORIAS_POR_DOMINIO,
  calcularBboxVig,
  normalizarFeaturesMapa,
  normalizarInfraestructuraMovilidad,
  normalizarMisReportes,
  normalizarPedidosTablero,
  normalizarReporteAmcRespuesta,
  normalizarReporteHistorial,
  normalizarSubnodos,
  validarReporteAmc,
  type ReporteAmcForm,
} from './vig014';

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

// ─── Fixtures con las formas reales de la API (main @ 4ecf9dd) ───

const DASHBOARD_ROW = {
  success: true,
  data: {
    nodo_key: 'iglesia',
    generado_en: '2026-11-06T12:00:00.000Z',
    regla: 'Conteos con cobertura y fecha — jamás puntajes globales (R5/ADR-036)',
    obras: {
      total: 4,
      por_estado: { declared: 3, in_execution: 1 },
      por_fuente: [
        { fuente: 'Prensa provincial (anuncio — R15)', total: 4 },
      ],
      km_ejecucion: null,
      km_nota: 'los km de los tramos en ejecución no están estructurados en fuente verificada — null honesto (R15)',
      fecha_corte: '2026-11-06',
      cautela: 'anuncio ≠ obra (R15): RN 150 y derivadores son anuncios/ejecuciones de prensa provincial',
    },
    puntos_criticos: {
      total: 2,
      por_estado: { community_validated: 2 },
      criticos: [
        { id: 'seed-f-vig011-pc-01', titulo: '2 reportes de 2 vecinos', estado: 'community_validated', observado_at: '2026-11-05' },
        { id: 'seed-f-vig011-pc-02', titulo: '3 reportes de 2 vecinos', estado: 'community_validated', observado_at: '2026-11-04' },
      ],
      fecha_corte: '2026-11-05',
      cautela: 'la comunidad corrobora, NUNCA verifica (R15)',
    },
    paradas_transporte: {
      total: 0,
      por_estado: {},
      cobertura: '0 paradas registradas (sin padrón verificado — R15)',
      fuente: 'agregador de transporte (secundaria/provisional — ADR-035, sin GTFS/padrón de las líneas 600/601)',
      cautela: 'la capa parada_transporte nace VACÍA (R15): sin padrón verificado no se siembran paradas',
    },
    cobertura_sos: {
      red_por_estado: { verified: 1 },
      brechas_declaradas: [
        { tramo: 'RN 150 tramo Las Flores–Colola', estado: 'declarada', fuente: 'documento vecinal interno (procedencia declarada, sin firmantes — ADR-027)' },
        { tramo: 'RN 150 tramo Rodeo–Jáchal', estado: 'declarada', fuente: 'documento vecinal interno (procedencia declarada, sin firmantes — ADR-027)' },
        { tramo: 'RN 149 bajada Alto del Colorado–Villa Iglesia', estado: 'declarada', fuente: 'documento vecinal interno (procedencia declarada, sin firmantes — ADR-027)' },
      ],
      fecha_corte: '2026-11-06',
      cautela: 'brechas DECLARADAS por el trabajo territorial (R15)',
    },
    pedidos_dpv: {
      esperados_documento: 15,
      presentados: 0,
      respondidos: 0,
      cobertura: '0 de 15 presentados · 0 respondidos (corte 2026-11-06)',
      fecha_corte: '2026-11-06',
    },
    kpis: {
      total: 1,
      snapshots: [
        { kpi_key: 'puntos_criticos_con_revision', valor: 2, detalles: { community_validated: 2, verified: 0 }, computed_at: '2026-11-06T03:00:00.000Z' },
      ],
      fecha_corte: '2026-11-06',
      nota: 'materializados por el consumidor vig003-kpi (patrón VIG-003): sin corrida del worker → 0 honesto (R15)',
    },
  },
};

const PEDIDOS_ROW = {
  success: true,
  count: 1,
  data: {
    esperados_documento: 15,
    presentados: 1,
    respondidos: 0,
    respondidos_en_plazo: 0,
    respondidos_tardio: 0,
    sin_respuesta: 1,
    en_espera: 0,
    fecha_corte: '2026-11-06',
    cobertura: '1 de 15 presentados · 0 respondidos (corte 2026-11-06)',
    fuente: 'documento vecinal interno (procedencia declarada, sin firmantes — ADR-027)',
    pedidos: [
      {
        key: 'dpv_01_rn150_colola',
        nodo_key: 'iglesia',
        bloque: 'A',
        tema: 'Baches RN 150 tramo Las Flores–Colola',
        destinatario: 'DPV',
        fecha_presentacion: '2026-09-01',
        plazo_dias: 30,
        estado: 'presentado',
        estado_efectivo: 'sin_respuesta',
        respondido_en: null,
        nota_respuesta: null,
        evidencia: [
          { cluster_key: 'seed-f-vig011-pc-01', titulo: '2 reportes de 2 vecinos', estado: 'community_validated' },
          { cluster_key: 'seed-f-inexistente', titulo: null, estado: null },
        ],
      },
    ],
  },
};

const SUBNODOS_ROW = {
  success: true,
  data: [
    { id: 'sn-1', nodo_key: 'iglesia', key: 'sj_iglesia_rodeo', label: 'Rodeo', type: 'district', parent_key: null, lat: -30.2114, lng: -69.1392 },
    { id: 'sn-2', nodo_key: 'iglesia', key: 'sj_iglesia_p_las_flores', label: 'Las Flores', type: 'paraje', parent_key: 'sj_iglesia_rodeo', lat: null, lng: null },
  ],
};

function formAmc(parcial: Partial<ReporteAmcForm> = {}): ReporteAmcForm {
  return {
    nodo_key: 'iglesia',
    categoria: 'road_surface',
    descripcion: 'Bache profundo en la RN 150 frente a la escuela, tránsito de camiones.',
    lat: -30.2114,
    lng: -69.1392,
    subnodo_key: 'sj_iglesia_rodeo',
    dominio: 'infraestructura_vial',
    canal_ingreso: 'web',
    precision: 'referencial',
    riesgo_inmediato: false,
    ...parcial,
  };
}

describe('normalizarInfraestructuraMovilidad (VIG-013 #382)', () => {
  it('conserva km null honesto, paradas VACÍAS y brechas declaradas', () => {
    const dash = normalizarInfraestructuraMovilidad(DASHBOARD_ROW.data);
    expect(dash.obras.km_ejecucion).toBeNull();
    expect(dash.obras.km_nota).toContain('null honesto (R15)');
    expect(dash.paradas_transporte.total).toBe(0);
    expect(dash.paradas_transporte.cobertura).toContain('sin padrón verificado — R15');
    expect(dash.cobertura_sos.brechas_declaradas).toHaveLength(3);
    expect(dash.cobertura_sos.brechas_declaradas[0]?.tramo).toBe('RN 150 tramo Las Flores–Colola');
    expect(dash.pedidos_dpv.esperados_documento).toBe(15);
    expect(dash.pedidos_dpv.cobertura).toContain('0 de 15 presentados');
    expect(dash.kpis.snapshots).toHaveLength(1);
    expect(dash.kpis.snapshots[0]?.kpi_key).toBe('puntos_criticos_con_revision');
  });

  it('el KPI sin cómputo llega con valor null — null ≠ 0 (R15)', () => {
    const dash = normalizarInfraestructuraMovilidad({
      ...DASHBOARD_ROW.data,
      kpis: {
        total: 1,
        snapshots: [{ kpi_key: 'obras_km_ejecucion', valor: null, detalles: { tramos_declared: 3, tramos_in_execution: 1, tramos_completed: 0 }, computed_at: '2026-11-06T03:00:00.000Z' }],
        fecha_corte: '2026-11-06',
        nota: 'sin corrida del worker → 0 honesto (R15)',
      },
    });
    expect(dash.kpis.snapshots[0]?.valor).toBeNull();
    expect(dash.kpis.snapshots[0]?.detalles.tramos_declared).toBe(3);
  });

  it('los títulos de puntos críticos declaran «N reportes de M vecinos», nunca un puntaje', () => {
    const dash = normalizarInfraestructuraMovilidad(DASHBOARD_ROW.data);
    expect(dash.puntos_criticos.criticos[0]?.titulo).toBe('2 reportes de 2 vecinos');
    expect(dash.puntos_criticos.cautela).toContain('NUNCA verifica');
  });
});

describe('normalizarPedidosTablero (VIG-012 #379)', () => {
  it('mantiene «X de 15», el estado efectivo DERIVADO y la evidencia null honesta', () => {
    const tablero = normalizarPedidosTablero(PEDIDOS_ROW.data);
    expect(tablero.cobertura).toBe('1 de 15 presentados · 0 respondidos (corte 2026-11-06)');
    expect(tablero.pedidos).toHaveLength(1);
    const pedido = tablero.pedidos[0];
    if (!pedido) throw new Error('pedido ausente');
    expect(pedido.estado).toBe('presentado');
    expect(pedido.estado_efectivo).toBe('sin_respuesta');
    expect(pedido.evidencia).toHaveLength(2);
    const evNull = pedido.evidencia[1];
    if (!evNull) throw new Error('evidencia ausente');
    expect(evNull.titulo).toBeNull();
    expect(evNull.estado).toBeNull();
  });
});

describe('normalizarSubnodos (VIG-001 #171)', () => {
  it('conserva la jerarquía parent_key y el punto null honesto', () => {
    const subnodos = normalizarSubnodos(SUBNODOS_ROW.data);
    expect(subnodos).toHaveLength(2);
    const rodeo = subnodos[0];
    if (!rodeo) throw new Error('subnodo ausente');
    expect(rodeo.label).toBe('Rodeo');
    expect(rodeo.parent_key).toBeNull();
    const lasFlores = subnodos[1];
    if (!lasFlores) throw new Error('subnodo ausente');
    expect(lasFlores.parent_key).toBe('sj_iglesia_rodeo');
    expect(lasFlores.lat).toBeNull();
    expect(lasFlores.lng).toBeNull();
  });
});

describe('normalizarMisReportes / historial / respuesta AMC (VIG-011 #378)', () => {
  it('mis reportes llevan el ciclo de vida con justificaciones públicas (ADR-038)', () => {
    const mios = normalizarMisReportes([
      {
        id: 'rep-1',
        nodo_key: 'iglesia',
        categoria: 'road_surface',
        descripcion: 'Bache profundo RN 150.',
        estado: 'evaluating',
        lat: -30.2114,
        lng: -69.1392,
        created_at: '2026-11-05T12:00:00.000Z',
        transiciones: [
          {
            estado_anterior: 'received',
            estado_nuevo: 'evaluating',
            justificacion: 'Inspección programada con la comisión vecinal de Rodeo.',
            moderador_hash: 'a1b2c3d4e5f67890',
            occurred_at: '2026-11-06T10:00:00.000Z',
          },
        ],
      },
    ]);
    expect(mios).toHaveLength(1);
    const primero = mios[0];
    if (!primero) throw new Error('reporte ausente');
    expect(primero.transiciones).toHaveLength(1);
    expect(primero.transiciones[0]?.justificacion).toContain('Rodeo');
  });

  it('el historial público deriva transiciones de los sellos — vacío es honesto', () => {
    const hist = normalizarReporteHistorial({ reporte_id: 'rep-1', transiciones: [] });
    expect(hist.reporte_id).toBe('rep-1');
    expect(hist.transiciones).toHaveLength(0);
  });

  it('la respuesta 201 marca creado y la 200 idempotente marca reintento (R4)', () => {
    const creado = normalizarReporteAmcRespuesta({
      success: true,
      data: { id: 'rep-9', categoria: 'road_surface', estado: 'received' },
      duplicados_sugeridos: [{ id: 'rep-1', categoria: 'road_surface', estado: 'evaluating' }],
      duplicados_verificados: true,
      cluster: { cluster_key: null },
      cluster_verificado: true,
    });
    expect(creado.creado).toBe(true);
    expect(creado.duplicados_sugeridos).toHaveLength(1);
    const idempotente = normalizarReporteAmcRespuesta({
      success: true,
      data: { id: 'rep-9', categoria: 'road_surface', estado: 'received' },
      idempotente: true,
      duplicados_sugeridos: [],
      duplicados_verificados: true,
    });
    expect(idempotente.creado).toBe(false);
  });
});

describe('validarReporteAmc — espejo cliente del Zod de la API', () => {
  it('acepta el formulario válido del canal web', () => {
    expect(validarReporteAmc(formAmc()).ok).toBe(true);
  });

  it('rechaza la categoría ajena al dominio (canon VIG-010)', () => {
    const res = validarReporteAmc(formAmc({ categoria: 'street_lighting' }));
    expect(res.ok).toBe(false);
    expect(res.errores.join(' ')).toContain('canon VIG-010');
  });

  it('el canal papel exige mediador con aval y alias del vecino (refines b y c)', () => {
    const res = validarReporteAmc(formAmc({ canal_ingreso: 'papel' }));
    expect(res.ok).toBe(false);
    expect(res.errores.join(' ')).toContain('mediador');
    expect(res.errores.join(' ')).toContain('alias');
  });

  it('papel con mediador y alias pasa, pero el alias exige guarda_alias (refine a)', () => {
    const conMediador = validarReporteAmc(
      formAmc({ canal_ingreso: 'papel', mediador_ref: 'mediador_rodeo', reportado_por: 'don_zonda' }),
    );
    expect(conMediador.ok).toBe(false);
    expect(conMediador.errores.join(' ')).toContain('guarda_alias');
    const conConsentimiento = validarReporteAmc(
      formAmc({
        canal_ingreso: 'papel',
        mediador_ref: 'mediador_rodeo',
        reportado_por: 'don_zonda',
        consentimiento: { acepta_devolucion_contacto: true, guarda_alias: true },
        observado_en: '2026-11-01',
      }),
    );
    expect(conConsentimiento.ok).toBe(true);
  });

  it('la descripción corta y la fecha mal formada se anticipan sin castigar al vecino', () => {
    const res = validarReporteAmc(
      formAmc({ descripcion: 'bache', observado_en: '01/11/2026' }),
    );
    expect(res.ok).toBe(false);
    expect(res.errores.join(' ')).toContain('descripción');
    expect(res.errores.join(' ')).toContain('YYYY-MM-DD');
  });
});

describe('ApiDataSource — acople /api (ADR-029, R5 sin fallbacks silenciosos)', () => {
  it('getInfraestructuraMovilidad consulta la ruta VIG-013 y normaliza el dashboard', async () => {
    let llamadaUrl = '';
    const spy = (async (input: RequestInfo | URL) => {
      llamadaUrl = String(input);
      return responder(DASHBOARD_ROW);
    }) as unknown as typeof fetch;
    const ds = new ApiDataSource({ fetchImpl: spy });
    const dash = await ds.getInfraestructuraMovilidad?.('iglesia');
    expect(llamadaUrl).toContain('/api/nodos/iglesia/infraestructura-movilidad');
    expect(dash?.obras.total).toBe(4);
    expect(dash?.obras.km_ejecucion).toBeNull();
  });

  it('getPedidosTablero consulta /api/pedidos?nodo=iglesia (VIG-012)', async () => {
    let llamadaUrl = '';
    const spy = (async (input: RequestInfo | URL) => {
      llamadaUrl = String(input);
      return responder(PEDIDOS_ROW);
    }) as unknown as typeof fetch;
    const ds = new ApiDataSource({ fetchImpl: spy });
    const tablero = await ds.getPedidosTablero?.('iglesia');
    expect(llamadaUrl).toContain('/api/pedidos?nodo=iglesia');
    expect(tablero?.pedidos[0]?.estado_efectivo).toBe('sin_respuesta');
  });

  it('listSubnodos y getFeaturesMapa consultan las rutas del nodo', async () => {
    const dsSubnodos = new ApiDataSource({ fetchImpl: fetchConBody(SUBNODOS_ROW) });
    const subnodos = await dsSubnodos.listSubnodos?.('iglesia');
    expect(subnodos?.[0]?.key).toBe('sj_iglesia_rodeo');

    const dsFeatures = new ApiDataSource({
      fetchImpl: fetchConBody({
        success: true,
        count: 1,
        data: [
          { id: 'seed-f-vig010-derivador-ejecucion', layer: 'obra_vial', domain: 'problems', titulo: 'Derivador RN 150 (en ejecución declarada)', tipo: 'asset', estado: 'in_execution', fuente_label: 'Ilustrativa · prensa provincial', observado_at: '2026-11-01T12:00:00Z', lat: -30.28, lng: -69.19, is_synthetic: true },
        ],
      }),
    });
    const features = await dsFeatures.getFeaturesMapa?.('iglesia');
    expect(features?.[0]?.capa).toBe('obra_vial');
    expect(features?.[0]?.is_synthetic).toBe(true);
  });

  it('createReporteAmc envía POST /api/reportes con Bearer del ciudadano', async () => {
    let llamadaUrl = '';
    let metodo = '';
    let authHeader = '';
    let cuerpo: Record<string, unknown> = {};
    const spy = (async (input: RequestInfo | URL, init?: RequestInit) => {
      llamadaUrl = String(input);
      metodo = String(init?.method ?? 'GET');
      authHeader = String((init?.headers as Record<string, string>)?.Authorization ?? '');
      cuerpo = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      return responder({
        success: true,
        data: { id: 'rep-9', categoria: 'road_surface', estado: 'received' },
        duplicados_sugeridos: [],
        duplicados_verificados: true,
        cluster: { cluster_key: null },
        cluster_verificado: true,
      }, 201);
    }) as unknown as typeof fetch;
    const ds = new ApiDataSource({ fetchImpl: spy });
    const res = await ds.createReporteAmc?.({ ...formAmc(), token: 'jwt-de-prueba' });
    expect(llamadaUrl).toContain('/api/reportes');
    expect(metodo).toBe('POST');
    expect(authHeader).toBe('Bearer jwt-de-prueba');
    expect(cuerpo['dominio']).toBe('infraestructura_vial');
    expect(cuerpo['token']).toBeUndefined();
    expect(res?.creado).toBe(true);
  });

  it('listMisReportes envía el Bearer y getReporteHistorial consulta la ruta pública', async () => {
    let authHeader = '';
    const spyMios = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      authHeader = String((init?.headers as Record<string, string>)?.Authorization ?? '');
      return responder({
        success: true,
        count: 1,
        data: [
          { id: 'rep-1', nodo_key: 'iglesia', categoria: 'road_surface', descripcion: 'Bache RN 150.', estado: 'received', lat: -30.21, lng: -69.14, created_at: '2026-11-05T12:00:00.000Z', transiciones: [] },
        ],
      });
    }) as unknown as typeof fetch;
    const dsMios = new ApiDataSource({ fetchImpl: spyMios });
    const mios = await dsMios.listMisReportes?.('jwt-de-prueba');
    expect(authHeader).toBe('Bearer jwt-de-prueba');
    expect(mios?.[0]?.estado).toBe('received');

    let llamadaUrl = '';
    const spyHist = (async (input: RequestInfo | URL) => {
      llamadaUrl = String(input);
      return responder({ success: true, data: { reporte_id: 'rep-1', transiciones: [] } });
    }) as unknown as typeof fetch;
    const dsHist = new ApiDataSource({ fetchImpl: spyHist });
    const hist = await dsHist.getReporteHistorial?.('rep-1');
    expect(llamadaUrl).toContain('/api/reportes/rep-1/historial');
    expect(hist?.transiciones).toHaveLength(0);
  });

  it('un 404 se propaga como DataSourceHttpError — jamás [] (R5)', async () => {
    const ds = new ApiDataSource({
      fetchImpl: fetchConBody({ success: false, error: 'Nodo no encontrado' }, 404),
    });
    await expect(ds.getInfraestructuraMovilidad?.('iglesia')).rejects.toBeInstanceOf(DataSourceHttpError);
    await expect(ds.getPedidosTablero?.('iglesia')).rejects.toMatchObject({
      name: 'DataSourceHttpError',
      status: 404,
    });
  });

  it('un data malformado (arreglo donde hay objeto) es un error honesto (R5)', async () => {
    const ds = new ApiDataSource({
      fetchImpl: fetchConBody({ success: true, data: [] }),
    });
    await expect(ds.getInfraestructuraMovilidad?.('iglesia')).rejects.toMatchObject({
      name: 'DataSourceHttpError',
      status: 500,
    });
  });
});

describe('SyntheticDataSource — paridad [SINTÉTICO] declarada (R15)', () => {
  it('el dashboard demo conserva los null y ceros honestos del módulo', async () => {
    const ds = new SyntheticDataSource();
    const dash = await ds.getInfraestructuraMovilidad?.('iglesia');
    expect(dash?.obras.km_ejecucion).toBeNull();
    expect(dash?.paradas_transporte.total).toBe(0);
    expect(dash?.pedidos_dpv.cobertura).toContain('0 de 15');
    expect(dash?.kpis.total).toBe(0);
  });

  it('los subnodos demo se etiquetan [SINTÉTICO] y el nodo ajeno cae 404 (R5)', async () => {
    const ds = new SyntheticDataSource();
    const subnodos = await ds.listSubnodos?.('iglesia');
    expect(subnodos?.[0]?.label).toContain('[SINTÉTICO]');
    await expect(ds.listSubnodos?.('capital')).rejects.toMatchObject({
      name: 'DataSourceHttpError',
      status: 404,
    });
  });

  it('fix post-VIG-014: la demo espeja las 12 localidades del valle con keys/types/parents del seed VIG-001', async () => {
    const ds = new SyntheticDataSource();
    const subnodos = await ds.listSubnodos?.('iglesia');
    expect(subnodos).toHaveLength(12);
    const buscar = (k: string) => subnodos?.find((s) => s.key === k);
    const lasFlores = buscar('sj_iglesia_las_flores');
    expect(lasFlores?.type).toBe('district');
    expect(lasFlores?.parent_key).toBeNull();
    const pismanta = buscar('sj_iglesia_p_pismanta');
    expect(pismanta?.type).toBe('locality');
    expect(pismanta?.parent_key).toBe('sj_iglesia_las_flores');
    expect(pismanta?.lat).not.toBeNull();
    const colola = buscar('sj_iglesia_p_colola');
    expect(colola?.parent_key).toBe('sj_iglesia_rodeo');
    expect(colola?.lat).toBeNull();
    expect(buscar('sj_iglesia_p_zonda')?.label).toContain('Zonda');
    expect(buscar('sj_iglesia_p_maipirinqui')?.label).toContain('Maipirinqui');
    expect(buscar('sj_iglesia_angualasto')?.type).toBe('district');
  });

  it('createReporteAmc en synthetic es demo declarada — jamás acreditada (R15)', async () => {
    const ds = new SyntheticDataSource();
    const res = await ds.createReporteAmc?.({ ...formAmc(), token: 'x' });
    expect(res?.devolucion).toContain('[SINTÉTICO]');
    expect(res?.devolucion).toContain('R15');
  });
});

describe('calcularBboxVig — proyección del mapa', () => {
  it('bbox de features y fallback declarado del Valle ante 0 features', () => {
    const features = normalizarFeaturesMapa([
      { id: 'f1', layer: 'obra_vial', titulo: 'a', estado: 'declared', fuente_label: 'x', lat: -30.1, lng: -69.1, is_synthetic: false },
      { id: 'f2', layer: 'obra_vial', titulo: 'b', estado: 'declared', fuente_label: 'x', lat: -30.3, lng: -69.3, is_synthetic: false },
    ]);
    const bbox = calcularBboxVig(features);
    expect(bbox.minLat).toBeLessThan(-30.3);
    expect(bbox.maxLat).toBeGreaterThan(-30.1);
    const vacio = calcularBboxVig([]);
    expect(vacio.minLat).toBeCloseTo(-30.6, 5);
  });

  it('la copia citada del canon AMC tiene las 9 categorías del dominio vial', () => {
    expect(Object.keys(AMC_CATEGORIAS_POR_DOMINIO)).toHaveLength(9);
    expect(AMC_CATEGORIAS_POR_DOMINIO['infraestructura_vial']).toContain('road_surface');
  });
});

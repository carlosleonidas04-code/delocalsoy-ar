import { describe, it, expect } from 'vitest';
import {
  COMPONENTES_A4,
  MATRIZ_PERMISOS_A4,
  capacidadesA4,
  permisoVisibleA4,
  canonizar,
  huellaSha256,
  crearClienteA4,
  ErrorA4,
  type CapacidadesA4,
  type ComponenteA4Id,
} from './artefactoA4';
import type { EstadoSesion, RolPlataforma, TransporteSesion } from './sesion';

/**
 * ART-R3 — Artefacto A4 auditoría y datos abiertos (#272, épica #268): suite
 * node SIN jsdom, transporte programado (patrón artefactoA1/A3.test.ts).
 * R15 declarado: CI en pausa (pre-activación #262) — la suite corre al
 * volver Actions.
 */

interface Programada {
  status: number;
  cuerpo: unknown;
}

function crearTransporte() {
  const llamadas: Array<{ ruta: string; init?: Record<string, unknown> }> = [];
  let cola: Programada[] = [];
  const transporte: TransporteSesion = async (ruta, init) => {
    llamadas.push({ ruta, init: init as Record<string, unknown> });
    const sig = cola.shift() ?? { status: 500, cuerpo: { success: false } };
    return {
      ok: sig.status >= 200 && sig.status < 300,
      status: sig.status,
      json: async () => sig.cuerpo,
    };
  };
  const programar = (respuestas: Programada[]) => {
    cola = respuestas.slice();
  };
  return { transporte, llamadas, programar };
}

function sesion(rol: string): EstadoSesion {
  return {
    tipo: 'sesion',
    usuario: { id: 'u1', email: 'auditor@ejemplo.ar', rol: rol as RolPlataforma, display_name: null },
  };
}

const SIN_SESION: EstadoSesion = { tipo: 'sin_sesion' };
const DEMO: EstadoSesion = { tipo: 'demo_sintetico', etiqueta: 'SINTETICO' };

const SALUD = {
  status: 'ok',
  service: 'delocalsoy-ar-api',
  version: '0.4.0',
  mode: 'real',
  modeDeclared: 'real',
  modeDeclaredAt: '2026-10-28T12:00:00.000Z',
  modeSource: 'events_raw',
  dataSource: 'postgres',
  redis: 'ok',
  branchProtection: false,
  evidencias: 15,
  timestamp: '2026-10-30T12:00:00.000Z',
};

const EVIDENCIA = {
  id: 'ev1',
  code: 'EV-001',
  title: 'Evidencia ejecutable 1',
  status: 'ok',
  result: { ok: true },
  verified_at: '2026-10-28T10:00:00.000Z',
};

const REPORTE = {
  id: 'r1',
  categoria: 'arbolado',
  descripcion: 'rama caída sobre la vereda',
  estado: 'received',
  lat: -31.5376,
  lng: -68.5285,
  created_at: '2026-10-30T12:00:00.000Z',
  is_synthetic: false,
};

const TRANSICION = {
  estado_anterior: 'received',
  estado_nuevo: 'evaluating',
  justificacion: 'se inspeccionó el sitio con fotos',
  moderador_hash: 'hashmod32',
  occurred_at: '2026-10-30T13:00:00.000Z',
};

const FUENTE = {
  key: 'ign',
  organismo: 'IGN',
  nombre: 'Capa WMS de IGN',
  url: null,
  tipo: 'wms',
  licencia: null,
  estado: 'verificado',
  cautela: 'sin proxy aún: acceso directo',
};

const INGESTA = {
  id: 'i1',
  source_id: 'conjunto-1',
  fuente_key: 'ign',
  nodo_key: 'caucete',
  capa_servicio: 'capa-wms-1',
  fecha_acceso: '2026-10-01',
  fecha_corte: '2026-09',
  licencia: null,
  crs_origen: 'EPSG:4326',
  crs_normalizado: 'EPSG:4326',
  escala_precision: '1:5000',
  external_id: null,
  transformaciones: null,
  estado: 'publicado',
};

const KPI_NULL = {
  nodo_key: 'iglesia',
  kpi_key: 'cobertura_geometrica',
  valor: null,
  detalles: {},
  computed_at: '2026-10-30T12:00:00.000Z',
};

const FICHA_PATRIMONIO = {
  activo_id: 'a1',
  titulo: 'Capilla histórica',
  tipo: 'patrimonio',
  proteccion_nivel: 'provincial_ley',
  proteccion_norma: 'Ley 1234',
  conservacion_estado: 'buena',
  acceso_lat: -31.5,
  acceso_lng: -68.5,
  reglas_acceso: [{ regla: 'visitas guiadas', fuente: 'municipio' }],
  sensible_status: 'sin_relevamiento',
  visibilidad: 'public',
};

/* ------------------------------------------------------------------ */
/* Componentes y matriz                                                */
/* ------------------------------------------------------------------ */

describe('ART-R3 — componentes A4', () => {
  it('8 componentes, ids únicos, con traza', () => {
    expect(COMPONENTES_A4.length).toBe(8);
    const ids = new Set(COMPONENTES_A4.map((c) => c.id));
    expect(ids.size).toBe(8);
    for (const c of COMPONENTES_A4) {
      expect(c.titulo.length).toBeGreaterThan(0);
      expect(c.resumen.length).toBeGreaterThan(0);
      expect(c.traza.length).toBeGreaterThan(0);
    }
  });

  it('estado honesto: 7 en_main, tamiz 13 dimensiones propuesto (◇, R15)', () => {
    const enMain = COMPONENTES_A4.filter((c) => c.estado === 'en_main');
    expect(enMain.length).toBe(7);
    const tamiz = COMPONENTES_A4.find((c) => c.id === 'tamiz_13_dimensiones');
    expect(tamiz?.estado).toBe('propuesto');
  });
});

describe('ART-R3 — matriz de permisos A4', () => {
  it('columnas público/auditor completas y SIN escritura (el auditor no muta)', () => {
    const ids: ComponenteA4Id[] = [
      'libro_contable',
      'historiales_publicos',
      'cadena_acreditacion',
      'fuentes_ingestas_publicas',
      'kpis_publicos',
      'ficha_patrimonial_publica',
      'export_verificacion',
      'tamiz_13_dimensiones',
    ];
    for (const id of ids) {
      const fila = MATRIZ_PERMISOS_A4[id];
      expect(fila.publico === 'leer' || fila.publico === 'verificar' || fila.publico === null).toBe(true);
      expect(fila.auditor === 'leer' || fila.auditor === 'verificar' || fila.auditor === null).toBe(true);
    }
  });

  it('tamiz por diseñar: null/null — sin superficie no hay permiso que mostrar', () => {
    expect(MATRIZ_PERMISOS_A4.tamiz_13_dimensiones).toEqual({ publico: null, auditor: null });
  });
});

/* ------------------------------------------------------------------ */
/* Capacidades por sesión                                              */
/* ------------------------------------------------------------------ */

describe('ART-R3 — capacidades A4', () => {
  it('sin sesión: visitante, techo 10, no auditor (datos abiertos: igual lectura)', () => {
    const caps: CapacidadesA4 = capacidadesA4(SIN_SESION);
    expect(caps.esVisitante).toBe(true);
    expect(caps.esDemo).toBe(false);
    expect(caps.rol).toBeNull();
    expect(caps.techoReqsMin).toBe(10);
    expect(caps.esAuditor).toBe(false);
  });

  it('demo SINTÉTICO declarada: nada se acredita (R15)', () => {
    const caps = capacidadesA4(DEMO);
    expect(caps.esVisitante).toBe(true);
    expect(caps.esDemo).toBe(true);
    expect(caps.esAuditor).toBe(false);
    expect(caps.techoReqsMin).toBe(10);
  });

  it("sesión rol 'auditor': techo real 500 y esAuditor (DECLARATIVO — la API aún no lo emite, hallazgo 1)", () => {
    const caps = capacidadesA4(sesion('auditor'));
    expect(caps.esVisitante).toBe(false);
    expect(caps.rol).toBe('auditor');
    expect(caps.techoReqsMin).toBe(500);
    expect(caps.esAuditor).toBe(true);
  });

  it('sesión ciudadano: techo 10, NO auditor — pero la lectura pública es la misma', () => {
    const caps = capacidadesA4(sesion('ciudadano'));
    expect(caps.techoReqsMin).toBe(10);
    expect(caps.esAuditor).toBe(false);
  });

  it('sesión moderador: techo 100, no auditor', () => {
    const caps = capacidadesA4(sesion('moderador'));
    expect(caps.techoReqsMin).toBe(100);
    expect(caps.esAuditor).toBe(false);
  });
});

describe('ART-R3 — permiso visible', () => {
  it('visitante y roles no-auditor ven la columna público', () => {
    const visitante = capacidadesA4(SIN_SESION);
    const ciudadano = capacidadesA4(sesion('ciudadano'));
    expect(permisoVisibleA4('libro_contable', visitante)).toBe('leer');
    expect(permisoVisibleA4('libro_contable', ciudadano)).toBe('leer');
    expect(permisoVisibleA4('tamiz_13_dimensiones', visitante)).toBeNull();
  });

  it('auditor ve la columna auditor (verificar donde corresponde)', () => {
    const auditor = capacidadesA4(sesion('auditor'));
    expect(permisoVisibleA4('libro_contable', auditor)).toBe('verificar');
    expect(permisoVisibleA4('cadena_acreditacion', auditor)).toBe('leer');
    expect(permisoVisibleA4('tamiz_13_dimensiones', auditor)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Huella de verificación                                               */
/* ------------------------------------------------------------------ */

describe('ART-R3 — canonización y huella SHA-256', () => {
  it('canonizar: claves desordenadas producen el MISMO canónico', () => {
    const a = canonizar({ z: 1, a: { y: [3, 2], x: null } });
    const b = canonizar({ a: { x: null, y: [3, 2] }, z: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":{"x":null,"y":[3,2]},"z":1}');
  });

  it('canonizar: arrays preservan orden (no se ordenan)', () => {
    expect(canonizar([2, 1])).toBe('[2,1]');
    expect(canonizar([2, 1])).not.toBe('[1,2]');
  });

  it('canonizar: primitivos, null y undefined honestos', () => {
    expect(canonizar(null)).toBe('null');
    expect(canonizar(undefined)).toBe('null');
    expect(canonizar('hola')).toBe('"hola"');
    expect(canonizar(42)).toBe('42');
  });

  it('huellaSha256: determinista, 64 hex, distinta para distinto contenido', async () => {
    const h1a = await huellaSha256('delocalsoy');
    const h1b = await huellaSha256('delocalsoy');
    const h2 = await huellaSha256('delocalsoy-2');
    expect(h1a).toBe(h1b);
    expect(h1a).toMatch(/^[0-9a-f]{64}$/);
    expect(h1a).not.toBe(h2);
  });

  it('huellaSha256: snapshots equivalentes (claves desordenadas) → MISMA huella', async () => {
    const h1 = await huellaSha256(canonizar({ modo: 'real', ts: 1 }));
    const h2 = await huellaSha256(canonizar({ ts: 1, modo: 'real' }));
    expect(h1).toBe(h2);
  });
});

/* ------------------------------------------------------------------ */
/* Superficies: salud (SIN envelope)                                   */
/* ------------------------------------------------------------------ */

describe('ART-R3 — salud del sistema (GET /api/health, sin envelope)', () => {
  it('parse completo: modeSource events_raw = modo resuelto desde el sello (R7)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: SALUD }]);
    const salud = await cliente.salud();
    expect(salud.status).toBe('ok');
    expect(salud.mode).toBe('real');
    expect(salud.modeSource).toBe('events_raw');
    expect(salud.dataSource).toBe('postgres');
    expect(salud.branchProtection).toBe(false); // honesto: sin regla de rama aún (#25)
    expect(salud.evidencias).toBe(15);
    expect(t.llamadas[0].ruta).toBe('/api/health');
    expect(t.llamadas[0].init).toBeUndefined(); // lectura pública: sin credenciales
  });

  it('sin base: dataSource none, mode degraded R5 y evidencias null honesto', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([
      {
        status: 200,
        cuerpo: {
          ...SALUD,
          status: 'degraded',
          mode: 'degraded',
          modeSource: 'process',
          dataSource: 'none',
          evidencias: null,
        },
      },
    ]);
    const salud = await cliente.salud();
    expect(salud.status).toBe('degraded'); // nunca 200 OK silencioso (R5)
    expect(salud.evidencias).toBeNull(); // null ≠ 0: sin base no se puede contar
  });

  it('500 → ErrorA4 no_disponible', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 500, cuerpo: { error: 'fallo al leer' } }]);
    await expect(cliente.salud()).rejects.toMatchObject({ codigo: 'no_disponible' });
  });

  it('JSON malformado → ErrorA4 no_disponible (R5)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: 'texto plano' }]);
    await expect(cliente.salud()).rejects.toMatchObject({ codigo: 'no_disponible' });
  });
});

/* ------------------------------------------------------------------ */
/* Superficies: cadena de acreditación (GET /api/evidencias)            */
/* ------------------------------------------------------------------ */

describe('ART-R3 — evidencias EV-xxx (GET /api/evidencias, sin envelope)', () => {
  it('parse {count, evidencias} con result/verified_at honestos', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([
      { status: 200, cuerpo: { count: 2, evidencias: [EVIDENCIA, { ...EVIDENCIA, id: 'ev2', code: 'EV-002', status: 'pendiente', result: null, verified_at: null }] } },
    ]);
    const registro = await cliente.evidencias();
    expect(registro.count).toBe(2);
    expect(registro.evidencias[0].code).toBe('EV-001');
    expect(registro.evidencias[0].status).toBe('ok');
    expect(registro.evidencias[1].result).toBeNull();
    expect(registro.evidencias[1].verified_at).toBeNull();
    expect(t.llamadas[0].ruta).toBe('/api/evidencias');
  });

  it('count ausente → malformado (R5: jamás un conteo inventado)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: { evidencias: [] } }]);
    await expect(cliente.evidencias()).rejects.toMatchObject({ codigo: 'no_disponible' });
  });

  it('lista ausente → malformado (R5: jamás [])', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: { count: 1 } }]);
    await expect(cliente.evidencias()).rejects.toMatchObject({ codigo: 'no_disponible' });
  });
});

/* ------------------------------------------------------------------ */
/* Libro contable por derivados: bandeja + historial sellado           */
/* ------------------------------------------------------------------ */

describe('ART-R3 — bandeja pública (GET /api/nodos/:key/reportes)', () => {
  it('lectura SIN Authorization y SIN descartado (el servidor lo excluye)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: { success: true, data: [REPORTE] } }]);
    const reportes = await cliente.reportesDeNodo('capital');
    expect(reportes[0].id).toBe('r1');
    expect(reportes[0].estado).toBe('received');
    expect(t.llamadas[0].ruta).toBe('/api/nodos/capital/reportes');
    expect(t.llamadas[0].init).toBeUndefined(); // datos abiertos: sin credenciales
  });

  it('lista malformada → error visible (R5: jamás [])', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: { success: true, data: { no: 'lista' } } }]);
    await expect(cliente.reportesDeNodo('capital')).rejects.toMatchObject({ codigo: 'no_disponible' });
  });
});

describe('ART-R3 — historial sellado (GET /api/reportes/:id/historial)', () => {
  it('transiciones con justificación pública y moderador_hash (ADR-038)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([
      { status: 200, cuerpo: { success: true, data: { reporte_id: 'r1', transiciones: [TRANSICION] } } },
    ]);
    const transiciones = await cliente.historialReporte('r1');
    expect(transiciones[0].estado_anterior).toBe('received');
    expect(transiciones[0].estado_nuevo).toBe('evaluating');
    expect(transiciones[0].justificacion.length).toBeGreaterThanOrEqual(10);
    expect(transiciones[0].moderador_hash).toBe('hashmod32');
    expect(t.llamadas[0].ruta).toBe('/api/reportes/r1/historial');
  });

  it('descartado → 404 honesto con mensaje (nunca publicable)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([
      { status: 404, cuerpo: { success: false, error: 'reporte descartado: no publicable' } },
    ]);
    await expect(cliente.historialReporte('r-x')).rejects.toMatchObject({
      codigo: 'no_encontrado',
      message: 'reporte descartado: no publicable',
    });
  });
});

/* ------------------------------------------------------------------ */
/* Procedencia: fuentes e ingestas publicadas                          */
/* ------------------------------------------------------------------ */

describe('ART-R3 — fuentes e ingestas (procedencia ADR-035)', () => {
  it('catálogo con cautela; url/licencia null honestos', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: { success: true, data: [FUENTE] } }]);
    const fuentes = await cliente.fuentes();
    expect(fuentes[0].key).toBe('ign');
    expect(fuentes[0].url).toBeNull();
    expect(fuentes[0].cautela.length).toBeGreaterThan(0);
    expect(t.llamadas[0].ruta).toBe('/api/fuentes');
  });

  it('ingestas SOLO publicadas: ?nodo= exacto cuando se filtra, nada cuando no', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: { success: true, data: [INGESTA] } }]);
    const ingestas = await cliente.ingestasPublicadas('caucete');
    expect(ingestas[0].estado).toBe('publicado');
    expect(t.llamadas[0].ruta).toBe('/api/ingestas?nodo=caucete');

    t.programar([{ status: 200, cuerpo: { success: true, data: [] } }]);
    const vacio = await cliente.ingestasPublicadas();
    expect(vacio).toEqual([]);
    expect(t.llamadas[1].ruta).toBe('/api/ingestas'); // sin query: sin nodo no hay filtro
  });
});

/* ------------------------------------------------------------------ */
/* KPIs y ficha patrimonial pública                                    */
/* ------------------------------------------------------------------ */

describe('ART-R3 — KPIs públicos (VIG-003)', () => {
  it('valor null ≠ 0 (cobertura sin computar, R15)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: { success: true, data: [KPI_NULL] } }]);
    const kpis = await cliente.kpis('iglesia');
    expect(kpis[0].valor).toBeNull();
    expect(t.llamadas[0].ruta).toBe('/api/nodos/iglesia/kpis');
  });
});

describe('ART-R3 — ficha patrimonial pública (VIG-004, ADR-036)', () => {
  it('parse SIN sensible/sensible_nota por construcción (el auditor tampoco los ve)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 200, cuerpo: { success: true, data: FICHA_PATRIMONIO } }]);
    const ficha = await cliente.fichaPatrimonio('a1');
    expect(ficha.titulo).toBe('Capilla histórica');
    expect(ficha.proteccion_nivel).toBe('provincial_ley');
    expect(ficha.sensible_status).toBe('sin_relevamiento');
    expect(Object.keys(ficha)).not.toContain('sensible');
    expect(Object.keys(ficha)).not.toContain('sensible_nota');
    expect(t.llamadas[0].ruta).toBe('/api/patrimonio/a1');
  });

  it('404 → no_encontrado (el restricted no tiene eco, ADR-036)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([{ status: 404, cuerpo: { success: false, error: '' } }]);
    await expect(cliente.fichaPatrimonio('a-x')).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

/* ------------------------------------------------------------------ */
/* El auditor NO muta (spec A4 §4)                                     */
/* ------------------------------------------------------------------ */

describe('ART-R3 — el auditor no muta', () => {
  it('el cliente expone EXACTAMENTE los 8 métodos de lectura: ninguna escritura existe', () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    const metodos = Object.keys(cliente).sort();
    expect(metodos).toEqual(
      ['evidencias', 'fichaPatrimonio', 'fuentes', 'historialReporte', 'ingestasPublicadas', 'kpis', 'reportesDeNodo', 'salud']
    );
    for (const m of metodos) {
      expect(m.startsWith('crear')).toBe(false);
      expect(m.startsWith('moderar')).toBe(false);
      expect(m.startsWith('avanzar')).toBe(false);
      expect(m.startsWith('eliminar')).toBe(false);
      expect(m.startsWith('publicar')).toBe(false);
    }
  });

  it('ninguna llamada lleva init: cero POST/PATCH salen del panel A4', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA4({ transporte: t.transporte });
    t.programar([
      { status: 200, cuerpo: SALUD },
      { status: 200, cuerpo: { count: 0, evidencias: [] } },
      { status: 200, cuerpo: { success: true, data: [] } },
      { status: 200, cuerpo: { success: true, data: [] } },
      { status: 200, cuerpo: { success: true, data: [] } },
      { status: 200, cuerpo: { success: true, data: [] } },
      { status: 200, cuerpo: { success: true, data: [] } },
      { status: 200, cuerpo: { success: true, data: [] } },
    ]);
    await cliente.salud();
    await cliente.evidencias();
    await cliente.reportesDeNodo('capital');
    await cliente.historialReporte('r1');
    await cliente.fuentes();
    await cliente.ingestasPublicadas();
    await cliente.kpis('capital');
    await cliente.fichaPatrimonio('a1');
    for (const llamada of t.llamadas) {
      expect(llamada.init).toBeUndefined(); // GET implícito, sin method/headers/body
    }
  });
});

/* ------------------------------------------------------------------ */
/* Red caída (R5: jamás [])                                            */
/* ------------------------------------------------------------------ */

describe('ART-R3 — red caída', () => {
  it('fallo de red → ErrorA4 no_disponible en cualquier superficie', async () => {
    const roto: TransporteSesion = async () => {
      throw new Error('red caída');
    };
    const cliente = crearClienteA4({ transporte: roto });
    await expect(cliente.salud()).rejects.toBeInstanceOf(ErrorA4);
    await expect(cliente.evidencias()).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.reportesDeNodo('capital')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.historialReporte('r1')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.fuentes()).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.ingestasPublicadas()).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.kpis('capital')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.fichaPatrimonio('a1')).rejects.toMatchObject({ codigo: 'no_disponible' });
  });
});

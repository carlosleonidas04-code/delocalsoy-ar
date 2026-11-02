import { describe, it, expect } from 'vitest';
import {
  COMPONENTES_A3,
  MATRIZ_PERMISOS_A3,
  capacidadesA3,
  permisoVisibleA3,
  crearClienteA3,
  validarJustificacion,
  validarMotivo,
  validarTransicionReporte,
  validarTransicionOportunidad,
  validarTransicionIngesta,
  validarCambioFicha,
  REPORTE_TRANSICIONES_A3,
  OPORTUNIDAD_TRANSICIONES_A3,
  INGESTA_TRANSICIONES_A3,
  ESTADOS_PRODUCTO_MODERABLES,
  ErrorA3,
  type TransporteSesion,
  type NuevaIngesta,
} from './artefactoA3';
import type { EstadoSesion } from './sesion';
import { RATE_LIMIT_VISITANTE } from './sesion';

/**
 * ART-R2 — Artefacto A3 moderación y gestión (#271, épica #268): suite node
 * SIN jsdom, transporte programado (patrón sesion.test.ts / artefactoA1.test.ts).
 * R15 declarado: CI en pausa (pre-activación #262) — la suite corre al volver
 * Actions.
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
    const sig = cola.length > 0 ? cola.shift() : { status: 500, cuerpo: { success: false } };
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
    usuario: { id: 'u1', email: 'gestor@ejemplo.ar', rol: rol as never, display_name: null },
  };
}

const SIN_SESION: EstadoSesion = { tipo: 'sin_sesion' };
const DEMO: EstadoSesion = { tipo: 'demo_sintetico', etiqueta: 'SINTETICO' };

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

const PRODUCTO = {
  id: 'p1',
  activo_id: 'a1',
  slug: 'aceite-de-oliva',
  nombre: 'Aceite de oliva artesanal',
  categoria: null,
  temporada_meses: [4, 5],
  estado: 'propuesto',
  created_by_hash: 'hash32',
  created_at: '2026-10-30T12:00:00.000Z',
};

const FICHA = {
  id: 'f1',
  nodo_key: 'caucete',
  feature_id: 'seed-f-cau-204',
  version: 'v1',
  respuestas: {},
  estado: 'testimonio',
  corroboracion: null,
  created_by_hash: 'hash32',
  created_at: '2026-10-30T12:00:00.000Z',
  updated_at: '2026-10-30T12:00:00.000Z',
  feature_titulo: 'Plaza',
  feature_lat: -31.5,
  feature_lng: -68.5,
  feature_is_synthetic: false,
  feature_fuente_label: 'Municipio · plano 2024',
  estado_publico: 'testimonio',
};

const OPORTUNIDAD = {
  id: 'o1',
  tipo: 'market_gap',
  titulo: 'Vacancia de insumos',
  descripcion: 'sin proveedor de insumos en el corredor',
  estado: 'detected',
  nodo_key: 'capital',
  subnodo_key: null,
  evidencia: { evidence_type: 'community_input', descripcion: ' relevamiento ' },
  actores: [],
  tags: ['corredor'],
  created_by_hash: 'hash32',
  created_at: '2026-10-30T12:00:00.000Z',
  updated_at: '2026-10-30T12:00:00.000Z',
};

const FICHA_PATRIMONIO = {
  activo_id: 'seed-patrimonio-capilla-achango',
  titulo: 'Capilla de Achango',
  tipo: 'patrimonio',
  proteccion_nivel: 'nacional_ley',
  proteccion_norma: 'Ley 24.790',
  conservacion_estado: 'regular',
  acceso_lat: -30.2894,
  acceso_lng: -69.1978,
  reglas_acceso: [{ regla: 'visitas guiadas', fuente: 'Municipio de Iglesia' }],
  sensible_status: 'sin_relevamiento',
  visibilidad: 'public',
};

const FUENTE = {
  key: 'ign_bahra',
  organismo: 'IGN',
  nombre: 'BAHRA parajes',
  url: 'https://www.ign.gob.ar',
  tipo: 'wfs',
  licencia: 'abierto',
  estado: 'disponible',
  cautela: 'geometría provisional',
};

const INGESTA = {
  id: 'i1',
  source_id: 'bahra-parajes-2026',
  fuente_key: 'ign_bahra',
  nodo_key: 'iglesia',
  capa_servicio: 'ign:bahra_paraje',
  fecha_acceso: '2026-10-30',
  fecha_corte: '2026',
  licencia: 'abierto',
  crs_origen: 'EPSG:4326',
  crs_normalizado: 'EPSG:4326',
  escala_precision: '1:250.000',
  external_id: null,
  transformaciones: null,
  estado: 'recibido',
};

const NUEVA_INGESTA: NuevaIngesta = {
  source_id: 'bahra-parajes-2026',
  fuente_key: 'ign_bahra',
  nodo_key: 'iglesia',
  capa_servicio: 'ign:bahra_paraje',
  fecha_acceso: '2026-10-30',
  fecha_corte: '2026',
  crs_origen: 'EPSG:4326',
  crs_normalizado: 'EPSG:4326',
  escala_precision: '1:250.000',
};

/* ---------------------------------------------------------------- */

describe('ART-R2 — matriz de componentes A3 (serie docs v0.1)', () => {
  it('8 componentes con estado honesto contrastado', () => {
    expect(COMPONENTES_A3.length).toBe(8);
    const comercios = COMPONENTES_A3.find((c) => c.id === 'moderacion_comercios');
    expect(comercios?.estado).toBe('en_rama'); // MK-1/MK-2 en cola: no se cablea (R15)
    const alcance = COMPONENTES_A3.find((c) => c.id === 'alcance_por_nodo');
    expect(alcance?.estado).toBe('propuesto'); // ◇ diseño lote-2 / #136
    const enMain = COMPONENTES_A3.filter((c) => c.estado === 'en_main').length;
    expect(enMain).toBe(6);
  });

  it('la matriz declarada cubre los 8 componentes × 5 columnas', () => {
    expect(Object.keys(MATRIZ_PERMISOS_A3).length).toBe(8);
    expect(MATRIZ_PERMISOS_A3.fuentes_ingestas.admin).toBe('administrar');
    expect(MATRIZ_PERMISOS_A3.fuentes_ingestas.moderador).toBe('leer');
    expect(MATRIZ_PERMISOS_A3.bandeja_reportes.moderador).toBe('moderar');
    expect(MATRIZ_PERMISOS_A3.custodia_patrimonial.custodio_territorial).toBe('moderar');
    expect(MATRIZ_PERMISOS_A3.moderacion_comercios.visitante).toBeNull();
  });
});

describe('ART-R2 — capacidades por sesión (gates efectivos)', () => {
  it('moderador: modera, NO publica ingestas, techo 100', () => {
    const caps = capacidadesA3(sesion('moderador'));
    expect(caps.puedeModerar).toBe(true);
    expect(caps.puedeAdministrarIngestas).toBe(false);
    expect(caps.techoReqsMin).toBe(100);
  });

  it("hallazgo 1: rol API 'admin' (no está en RolPlataforma) se normaliza a gestión plena", () => {
    const caps = capacidadesA3(sesion('admin'));
    expect(caps.puedeModerar).toBe(true);
    expect(caps.puedeAdministrarIngestas).toBe(true);
    expect(caps.techoReqsMin).toBe(500);
  });

  it('admin_nodo/admin_hitub de la tabla RBAC también gestionan', () => {
    expect(capacidadesA3(sesion('admin_nodo')).puedeAdministrarIngestas).toBe(true);
    expect(capacidadesA3(sesion('admin_hitub')).puedeModerar).toBe(true);
  });

  it('ciudadano: sin moderación (la API daría 403 real)', () => {
    const caps = capacidadesA3(sesion('ciudadano'));
    expect(caps.puedeModerar).toBe(false);
    expect(caps.puedeAdministrarIngestas).toBe(false);
  });

  it('synthetic y sin sesión: sin gestión — demo declarada (R15)', () => {
    expect(capacidadesA3(DEMO).esDemo).toBe(true);
    expect(capacidadesA3(DEMO).puedeModerar).toBe(false);
    expect(capacidadesA3(SIN_SESION).esVisitante).toBe(true);
    expect(capacidadesA3(SIN_SESION).techoReqsMin).toBe(RATE_LIMIT_VISITANTE);
  });

  it('permisoVisibleA3: moderador lee su columna; ciudadano cae a la de visitante', () => {
    const capsMod = capacidadesA3(sesion('moderador'));
    expect(permisoVisibleA3('bandeja_reportes', capsMod)).toBe('moderar');
    const capsCiu = capacidadesA3(sesion('ciudadano'));
    expect(permisoVisibleA3('bandeja_reportes', capsCiu)).toBe('leer');
    expect(permisoVisibleA3('moderacion_comercios', capsCiu)).toBeNull();
    expect(permisoVisibleA3('fuentes_ingestas', capacidadesA3(sesion('admin')))).toBe('administrar');
  });
});

describe('ART-R2 — matrices de transiciones (espejo EXACTO de la API)', () => {
  it('reportes: ciclo ADR-038 con resolved/descartado terminales', () => {
    expect(REPORTE_TRANSICIONES_A3.received).toEqual(['evaluating', 'descartado']);
    expect(REPORTE_TRANSICIONES_A3.in_progress).toEqual(['resolved', 'descartado']);
    expect(REPORTE_TRANSICIONES_A3.resolved).toEqual([]);
    expect(REPORTE_TRANSICIONES_A3.descartado).toEqual([]);
  });

  it('oportunidades: matriz Bloque 9 espejo (laterales paused/discarded)', () => {
    expect(OPORTUNIDAD_TRANSICIONES_A3.detected).toEqual(['under_review', 'discarded']);
    expect(OPORTUNIDAD_TRANSICIONES_A3.paused).toEqual(['prioritized', 'in_development', 'discarded']);
    expect(OPORTUNIDAD_TRANSICIONES_A3.implemented).toEqual(['archived']);
    expect(OPORTUNIDAD_TRANSICIONES_A3.archived).toEqual([]);
  });

  it('ingestas: pipeline forward-only, publicado terminal', () => {
    expect(INGESTA_TRANSICIONES_A3.recibido).toEqual(['validado_tecnicamente']);
    expect(INGESTA_TRANSICIONES_A3.publicado).toEqual([]);
  });

  it('productos: SIN matriz — la API solo rechaza el mismo estado (409)', () => {
    expect(ESTADOS_PRODUCTO_MODERABLES).toEqual(['aprobado', 'rechazado', 'archivado']);
  });
});

describe('ART-R2 — validadores de pre-check (la API es la compuerta real)', () => {
  it('justificación ADR-038: >=10 obligatoria', () => {
    expect(validarJustificacion('corta')).not.toBeNull();
    expect(validarJustificacion('justificación pública suficiente')).toBeNull();
  });

  it('motivo opcional <=500', () => {
    expect(validarMotivo(undefined)).toBeNull();
    expect(validarMotivo('motivo corto')).toBeNull();
    expect(validarMotivo('x'.repeat(501))).not.toBeNull();
  });

  it('saltos válidos contra las matrices espejo', () => {
    expect(validarTransicionReporte('received', 'evaluating')).toBeNull();
    expect(validarTransicionReporte('received', 'resolved')).not.toBeNull();
    expect(validarTransicionReporte('resolved', 'received')).not.toBeNull();
    expect(validarTransicionOportunidad('detected', 'under_review')).toBeNull();
    expect(validarTransicionOportunidad('detected', 'validated')).not.toBeNull();
    expect(validarTransicionIngesta('recibido', 'validado_tecnicamente')).toBeNull();
    expect(validarTransicionIngesta('recibido', 'publicado')).not.toBeNull();
  });

  it('corroborar una ficha exige instancia (refine #149)', () => {
    expect(validarCambioFicha('corroborada', undefined)).not.toBeNull();
    expect(validarCambioFicha('corroborada', 'individual')).toBeNull();
    expect(validarCambioFicha('corroborada', 'taller_comunitario')).toBeNull();
    expect(validarCambioFicha('descartada', undefined)).toBeNull();
  });
});

describe('ART-R2 — bandeja de reportes', () => {
  it('lectura pública del nodo SIN Authorization (bandeja sin descartados: hallazgo 4)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: [REPORTE], count: 1 } }]);
    const reportes = await cliente.reportesDeNodo('capital');
    expect(reportes[0].id).toBe('r1');
    expect(reportes[0].estado).toBe('received');
    expect(t.llamadas[0].ruta).toBe('/api/nodos/capital/reportes');
    expect((t.llamadas[0].init?.headers as Record<string, unknown>)?.Authorization).toBeUndefined();
  });

  it('historial: transiciones selladas parseadas', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: {
            reporte_id: 'r1',
            transiciones: [
              {
                estado_anterior: 'received',
                estado_nuevo: 'evaluating',
                justificacion: 'se está evaluando el reclamo',
                moderador_hash: 'hash32',
                occurred_at: '2026-10-30T13:00:00.000Z',
              },
            ],
          },
        },
      },
    ]);
    const transiciones = await cliente.historialReporte('r1');
    expect(transiciones[0].estado_nuevo).toBe('evaluating');
    expect(transiciones[0].justificacion).toBe('se está evaluando el reclamo');
    expect(t.llamadas[0].ruta).toBe('/api/reportes/r1/historial');
  });

  it('moderarReporte: PATCH con justificación y Authorization', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 200, cuerpo: { success: true, data: { ...REPORTE, estado: 'evaluating' } } }]);
    const r = await cliente.moderarReporte('r1', 'evaluating', 'se está evaluando el reclamo');
    expect(r.estado).toBe('evaluating');
    expect(t.llamadas[0].ruta).toBe('/api/reportes/r1/estado');
    expect(t.llamadas[0].init?.method).toBe('PATCH');
    expect((t.llamadas[0].init?.headers as Record<string, unknown>)?.Authorization).toBe('Bearer jwt-mod');
    expect(JSON.parse(t.llamadas[0].init?.body as string)).toEqual({
      estado: 'evaluating',
      justificacion: 'se está evaluando el reclamo',
    });
  });

  it('moderarReporte: mapa honesto de la API (400/401/403/404/409/PII/salto)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 400, cuerpo: { success: false, error: 'datos inválidos' } }]);
    await expect(cliente.moderarReporte('r1', 'evaluating', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'datos' });
    t.programar([{ status: 400, cuerpo: { error: 'payload rechazado: contiene datos personales identificables (email) — ADR-020 cond. 1, Ley 25.326' } }]);
    await expect(cliente.moderarReporte('r1', 'evaluating', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'pii' });
    t.programar([{ status: 400, cuerpo: { success: false, error: "transición inválida: 'received' → 'resolved' no está en la matriz del ciclo (ADR-038)" } }]);
    await expect(cliente.moderarReporte('r1', 'resolved', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'transicion' });
    t.programar([{ status: 401, cuerpo: { success: false, error: 'token vencido' } }]);
    await expect(cliente.moderarReporte('r1', 'evaluating', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'credenciales' });
    t.programar([{ status: 403, cuerpo: { success: false, error: 'rol insuficiente' } }]);
    await expect(cliente.moderarReporte('r1', 'evaluating', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'permiso' });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'reporte no encontrado' } }]);
    await expect(cliente.moderarReporte('r-inexistente', 'evaluating', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'no_encontrado' });
    t.programar([{ status: 409, cuerpo: { success: false, error: "el reporte ya está en estado 'evaluating'" } }]);
    await expect(cliente.moderarReporte('r1', 'evaluating', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'ya_estado' });
  });

  it('sin token: credenciales ANTES de gastar la llamada (techo por rol)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    await expect(cliente.moderarReporte('r1', 'evaluating', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'credenciales' });
    expect(t.llamadas.length).toBe(0);
  });
});

describe('ART-R2 — moderación de productos', () => {
  it('listado por activo: propuesto|aprobado visibles (la bandeja exige conocer el activo)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: [PRODUCTO], count: 1 } }]);
    const productos = await cliente.productosDeActivo('a1');
    expect(productos[0].estado).toBe('propuesto');
    expect(t.llamadas[0].ruta).toBe('/api/activos/a1/productos');
  });

  it('moderarProducto: aprobado con motivo opcional', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 200, cuerpo: { success: true, data: { ...PRODUCTO, estado: 'aprobado' } } }]);
    const p = await cliente.moderarProducto('p1', 'aprobado', 'verificado contra el padrón');
    expect(p.estado).toBe('aprobado');
    expect(JSON.parse(t.llamadas[0].init?.body as string)).toEqual({
      estado: 'aprobado',
      motivo: 'verificado contra el padrón',
    });
  });

  it('moderarProducto: sin motivo la clave NO viaja (Zod rechaza null explícito)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 200, cuerpo: { success: true, data: { ...PRODUCTO, estado: 'rechazado' } } }]);
    await cliente.moderarProducto('p1', 'rechazado');
    expect(JSON.parse(t.llamadas[0].init?.body as string)).toEqual({ estado: 'rechazado' });
  });

  it('mismo estado → ya_estado (409, sin matriz de productos)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 409, cuerpo: { success: false, error: "el producto ya está en estado 'aprobado'" } }]);
    await expect(cliente.moderarProducto('p1', 'aprobado')).rejects.toMatchObject({ codigo: 'ya_estado' });
  });
});

describe('ART-R2 — corroboración de fichas', () => {
  it('lectura con filtros exactos (?nodo=&estado=)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: [FICHA], count: 1 } }]);
    const fichas = await cliente.fichas({ nodo: 'caucete', estado: 'testimonio' });
    expect(fichas[0].estado_publico).toBe('testimonio');
    expect(t.llamadas[0].ruta).toBe('/api/fichas-valoracion?nodo=caucete&estado=testimonio');
  });

  it('corroborar exige instancia: el API responde 400 sin corroboracion (refine)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([
      { status: 400, cuerpo: { success: false, error: 'datos inválidos', details: [{ path: ['corroboracion'] }] } },
    ]);
    await expect(cliente.moderarFicha('f1', 'corroborada')).rejects.toMatchObject({ codigo: 'datos' });
  });

  it('corroborada por taller comunitario: body exacto con corroboracion', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([
      { status: 200, cuerpo: { success: true, data: { ...FICHA, estado: 'corroborada', corroboracion: 'taller_comunitario', estado_publico: 'validado' } } },
    ]);
    const f = await cliente.moderarFicha('f1', 'corroborada', 'taller_comunitario', 'taller del 30-10');
    expect(f.corroboracion).toBe('taller_comunitario');
    expect(JSON.parse(t.llamadas[0].init?.body as string)).toEqual({
      estado: 'corroborada',
      corroboracion: 'taller_comunitario',
      motivo: 'taller del 30-10',
    });
  });
});

describe('ART-R2 — moderación de oportunidades (Bloque 9)', () => {
  it('filtros de lectura: query exacto', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: [OPORTUNIDAD], count: 1 } }]);
    const oport = await cliente.oportunidades({ nodo: 'capital', estado: 'detected' });
    expect(oport[0].estado).toBe('detected');
    expect(t.llamadas[0].ruta).toBe('/api/oportunidades?nodo=capital&estado=detected');
  });

  it('transit detected→under_review con motivo', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 200, cuerpo: { success: true, data: { ...OPORTUNIDAD, estado: 'under_review' } } }]);
    const o = await cliente.moderarOportunidad('o1', 'under_review', 'evidencia comunitaria suficiente');
    expect(o.estado).toBe('under_review');
    expect(t.llamadas[0].ruta).toBe('/api/oportunidades/o1/estado');
  });

  it('salto fuera de la matriz → transicion (400 Bloque 9)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([
      { status: 400, cuerpo: { success: false, error: "transición inválida: 'detected' → 'validated' (ciclo de vida Bloque 9)" } },
    ]);
    await expect(cliente.moderarOportunidad('o1', 'validated')).rejects.toMatchObject({ codigo: 'transicion' });
  });
});

describe('ART-R2 — custodia patrimonial (ADR-036)', () => {
  it('ficha pública SIN sensible/sensible_nota — jamás expuestos', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: FICHA_PATRIMONIO } }]);
    const ficha = await cliente.patrimonioFicha('seed-patrimonio-capilla-achango');
    expect(ficha.sensible_status).toBe('sin_relevamiento');
    expect(ficha.reglas_acceso[0].fuente).toBe('Municipio de Iglesia');
    // ADR-036: el tipo FichaPatrimonio NO tiene campos sensible/sensible_nota
    // — el parser los descarta por construcción.
    expect(Object.keys(ficha).includes('sensible_nota')).toBe(false);
    expect(Object.keys(ficha).includes('sensible')).toBe(false);
  });

  it('custodia: PATCH envía SOLO las claves presentes (Zod rechaza null explícito)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 200, cuerpo: { success: true, data: FICHA_PATRIMONIO } }]);
    await cliente.custodiarPatrimonio('seed-patrimonio-capilla-achango', {
      visibilidad: 'generalized',
      sensible_status: 'relevado_restringido',
      sensible_nota: 'relevamiento interno bajo custodia',
    });
    expect(t.llamadas[0].ruta).toBe('/api/patrimonio/seed-patrimonio-capilla-achango');
    expect(t.llamadas[0].init?.method).toBe('PATCH');
    expect(JSON.parse(t.llamadas[0].init?.body as string)).toEqual({
      visibilidad: 'generalized',
      sensible_status: 'relevado_restringido',
      sensible_nota: 'relevamiento interno bajo custodia',
    });
  });

  it('custodia de activo inexistente → no_encontrado (404 sin eco)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-mod' });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'activo no encontrado' } }]);
    await expect(
      cliente.custodiarPatrimonio('a-inexistente', { visibilidad: 'restricted' })
    ).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('ART-R2 — fuentes y pipeline de ingestas (#147/#200)', () => {
  it('catálogo público de fuentes con cautela', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 200, cuerpo: { success: true, data: [FUENTE], count: 1 } }]);
    const fuentes = await cliente.fuentes();
    expect(fuentes[0].key).toBe('ign_bahra');
    expect(fuentes[0].cautela).toBe('geometría provisional');
    expect(t.llamadas[0].ruta).toBe('/api/fuentes');
  });

  it('hallazgo 2: la lectura SOLO publica ingestas publicadas (pipeline en curso no listable)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-admin' });
    t.programar([{ status: 200, cuerpo: { success: true, data: [{ ...INGESTA, estado: 'publicado' }], count: 1 } }]);
    const ingestas = await cliente.ingestasPublicadas('iglesia');
    expect(ingestas[0].estado).toBe('publicado');
    expect(t.llamadas[0].ruta).toBe('/api/ingestas?nodo=iglesia');
    // No existe superficie para listar recibido/validado_*: el panel nunca
    // simula una bandeja de pendientes (R15) — administra por id del POST.
  });

  it('crearIngesta (admin): 201 nace recibido · 200 idempotente · 404 fuente · 403 moderador', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-admin' });
    t.programar([{ status: 201, cuerpo: { success: true, data: INGESTA } }]);
    const { ingesta, idempotente } = await cliente.crearIngesta(NUEVA_INGESTA);
    expect(ingesta.estado).toBe('recibido');
    expect(idempotente).toBe(false);
    expect(t.llamadas[0].ruta).toBe('/api/ingestas');
    expect(JSON.parse(t.llamadas[0].init?.body as string)).toEqual(NUEVA_INGESTA);

    t.programar([{ status: 200, cuerpo: { success: true, data: INGESTA, idempotente: true } }]);
    const re = await cliente.crearIngesta(NUEVA_INGESTA);
    expect(re.idempotente).toBe(true);

    t.programar([{ status: 404, cuerpo: { success: false, error: 'fuente no encontrada en el catálogo de procedencia' } }]);
    await expect(cliente.crearIngesta(NUEVA_INGESTA)).rejects.toMatchObject({ codigo: 'no_encontrado' });

    t.programar([{ status: 403, cuerpo: { success: false, error: 'rol insuficiente' } }]);
    await expect(cliente.crearIngesta(NUEVA_INGESTA)).rejects.toMatchObject({ codigo: 'permiso' });
  });

  it('avanzarIngesta (admin): pipeline forward-only con 403 real para moderador', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => 'jwt-admin' });
    t.programar([
      { status: 200, cuerpo: { success: true, data: { ...INGESTA, estado: 'validado_tecnicamente' } } },
    ]);
    const ingesta = await cliente.avanzarIngesta('i1', 'validado_tecnicamente', 'WFS responde 200');
    expect(ingesta.estado).toBe('validado_tecnicamente');
    expect(t.llamadas[0].ruta).toBe('/api/ingestas/i1/estado');

    t.programar([
      { status: 400, cuerpo: { success: false, error: "transición inválida: 'recibido' → 'publicado' (pipeline de procedencia #147)" } },
    ]);
    await expect(cliente.avanzarIngesta('i1', 'publicado')).rejects.toMatchObject({ codigo: 'transicion' });

    t.programar([{ status: 403, cuerpo: { success: false, error: 'rol insuficiente' } }]);
    await expect(cliente.avanzarIngesta('i1', 'publicado')).rejects.toMatchObject({ codigo: 'permiso' });
  });
});

describe('ART-R2 — KPIs del nodo', () => {
  it('valor null != 0 (cobertura_geometrica honesta, R15)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA3({ transporte: t.transporte, token: () => null });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: [
            { nodo_key: 'iglesia', kpi_key: 'cobertura_geometrica', valor: null, detalles: {}, computed_at: '2026-10-30T12:00:00.000Z' },
            { nodo_key: 'iglesia', kpi_key: 'subnodos_total', valor: 52, detalles: {}, computed_at: '2026-10-30T12:00:00.000Z' },
          ],
        },
      },
    ]);
    const kpis = await cliente.kpis('iglesia');
    expect(kpis[0].valor).toBeNull(); // null ≠ 0: sin métrica computada
    expect(kpis[1].valor).toBe(52);
    expect(t.llamadas[0].ruta).toBe('/api/nodos/iglesia/kpis');
  });
});

describe('ART-R2 — red caída (R5: jamás [])', () => {
  it('fallo de red → ErrorA3 no_disponible en cualquier superficie', async () => {
    const roto: TransporteSesion = async () => {
      throw new Error('red caída');
    };
    const cliente = crearClienteA3({ transporte: roto, token: () => 'jwt-mod' });
    await expect(cliente.reportesDeNodo('capital')).rejects.toBeInstanceOf(ErrorA3);
    await expect(cliente.moderarReporte('r1', 'evaluating', 'justificación suficiente')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.fichas()).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.oportunidades()).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.fuentes()).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.crearIngesta(NUEVA_INGESTA)).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.kpis('capital')).rejects.toMatchObject({ codigo: 'no_disponible' });
  });
});

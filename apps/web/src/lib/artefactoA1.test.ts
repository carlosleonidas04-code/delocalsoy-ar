import { describe, it, expect } from 'vitest';
import {
  COMPONENTES_A1,
  MATRIZ_PERMISOS_A1,
  capacidadesA1,
  permisoVisible,
  crearClienteA1,
  validarActorA1,
  ErrorA1,
  TIPOS_OPORTUNIDAD,
  TIPOS_EVIDENCIA,
  type CategoriaNodo,
  type FichaRespuestasV1,
} from './artefactoA1';
import type { EstadoSesion, TransporteSesion } from './sesion';
import { RATE_LIMIT_VISITANTE } from './sesion';

/**
 * ART-R1 cableado exhaustivo (#270, épica #268): suite node SIN jsdom,
 * transporte programado (patrón sesion.test.ts / activosApi.test.ts).
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
  return { llamadas, transporte, programar };
}

const sesionCiudadano: EstadoSesion = {
  tipo: 'sesion',
  usuario: { id: 'usr-1', email: 'v@t.test', rol: 'ciudadano', display_name: null },
};
const sesionModerador: EstadoSesion = {
  tipo: 'sesion',
  usuario: { id: 'usr-2', email: 'm@t.test', rol: 'moderador', display_name: null },
};

const respuestasV1Ejemplo: FichaRespuestasV1 = {
  usos_vitalidad: { usos_detectados: ['recreo'], nivel_actividad: 'media' },
  accesibilidad: { rampa_acceso: 'si', estado_vereda: 'bueno', obstaculos: false },
  sombra_arbolado: { arbolado_presente: true, sombra_horario_central: 'parcial' },
  agua_xerojardin: { riego: 'no', perdidas_visibles: false, especies_apto_clima: 'si' },
  seguridad_disenio: { iluminacion: 'buena', visibilidad: 'regular', mantenimiento: 'bueno', destinos_activos_cercanos: true },
  equipamiento: { bancos: true, juegos_infantiles: false, canchas: false, basureros: true, bebedero: false },
  custodia: { custodia_presente: false, tipo_acuerdo: 'ninguno' },
};

describe('ART-R1 — componentes y matriz v0.1', () => {
  it('los 9 componentes de la spec existen con estado honesto', () => {
    expect(COMPONENTES_A1.length).toBe(9);
    const ids = COMPONENTES_A1.map((c) => c.id);
    expect(new Set(ids).size).toBe(9);
    expect(MATRIZ_PERMISOS_A1.reporte_ciudadano).toEqual({
      visitante: 'leer',
      ciudadano: 'escribir',
      vecino: 'escribir',
    });
  });

  it('la matriz cubre exactamente los 9 componentes', () => {
    expect(Object.keys(MATRIZ_PERMISOS_A1).sort()).toEqual(
      COMPONENTES_A1.map((c) => c.id).sort()
    );
  });

  it('permisoVisible: visitante lee, ciudadano escribe, rol de plataforma usa columna vecino', () => {
    const visitante = capacidadesA1({ tipo: 'sin_sesion' });
    const ciudadano = capacidadesA1(sesionCiudadano);
    const moderador = capacidadesA1(sesionModerador);
    expect(permisoVisible('reporte_ciudadano', visitante)).toBe('leer');
    expect(permisoVisible('reporte_ciudadano', ciudadano)).toBe('escribir');
    expect(permisoVisible('reporte_ciudadano', moderador)).toBe('escribir');
    // Oportunidades (postular) en spec: visitante NUNCA escribe.
    expect(permisoVisible('banco_potencialidades', visitante)).toBe('leer');
  });
});

describe('ART-R1 — capacidades por estado de sesión', () => {
  it('sin sesión: visitante, lectura, techo 10', () => {
    const caps = capacidadesA1({ tipo: 'sin_sesion' });
    expect(caps.esVisitante).toBe(true);
    expect(caps.esDemo).toBe(false);
    expect(caps.puedeEscribir).toBe(false);
    expect(caps.puedeVerMios).toBe(false);
    expect(caps.techoReqsMin).toBe(RATE_LIMIT_VISITANTE);
    expect(RATE_LIMIT_VISITANTE).toBe(10);
  });

  it('synthetic: demo SINTÉTICO — las escrituras NO se acreditan (R15)', () => {
    const caps = capacidadesA1({ tipo: 'demo_sintetico', etiqueta: 'SINTETICO' });
    expect(caps.esDemo).toBe(true);
    expect(caps.puedeEscribir).toBe(false);
    expect(caps.puedeVerMios).toBe(false);
  });

  it('sesión ciudadano: escribe, ve propios, techo real 10 req/min', () => {
    const caps = capacidadesA1(sesionCiudadano);
    expect(caps.puedeEscribir).toBe(true);
    expect(caps.puedeVerMios).toBe(true);
    expect(caps.rol).toBe('ciudadano');
    expect(caps.techoReqsMin).toBe(10);
  });

  it('sesión moderador: techo real 100 req/min (tabla RBAC)', () => {
    const caps = capacidadesA1(sesionModerador);
    expect(caps.techoReqsMin).toBe(100);
  });
});

describe('ART-R1 — lectura pública del vocabulario (visitante sin token)', () => {
  it('categorias, features, subnodos y reportes llaman SIN Authorization', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 200, cuerpo: { success: true, data: [{ id: 'c1', code: 'arbolado', label: 'Arbolado', layer: 'urbanismo' }], count: 1 } },
      { status: 200, cuerpo: { success: true, data: [{ id: 'f1', layer: 'public_space', domain: 'urbano', titulo: 'Plaza', tipo: 'plaza', estado: 'verified', fuente_label: 'Municipio · plano 2024', observado_at: null, lat: -31.5, lng: -68.5, is_synthetic: false }], count: 1 } },
      { status: 200, cuerpo: { success: true, data: [{ key: 'distrito_sur', type: 'district', parent_key: null, boundary_status: 'provisional' }], count: 1 } },
      { status: 200, cuerpo: { success: true, data: [{ id: 'r1', categoria: 'arbolado', descripcion: 'rama caída', estado: 'received', lat: -31.5, lng: -68.5, created_at: '2026-10-30T12:00:00.000Z', is_synthetic: false }], count: 1 } },
    ]);
    const cats: CategoriaNodo[] = await cliente.categorias('capital');
    const feats = await cliente.features('capital');
    const subs = await cliente.subnodos('capital');
    const reportes = await cliente.reportesPublicos('capital');
    expect(cats[0].code).toBe('arbolado');
    expect(feats[0].estado).toBe('verified');
    expect(feats[0].is_synthetic).toBe(false);
    expect(subs[0].boundary_status).toBe('provisional');
    expect(reportes[0].estado).toBe('received');
    expect(t.llamadas.map((l) => l.ruta)).toEqual([
      '/api/nodos/capital/categorias',
      '/api/nodos/capital/features',
      '/api/nodos/capital/subnodos',
      '/api/nodos/capital/reportes',
    ]);
    for (const l of t.llamadas) {
      const headers = ((l.init ?? {}) as { headers?: Record<string, string> }).headers;
      expect(headers?.Authorization).toBeUndefined();
    }
  });

  it('404 de nodo → ErrorA1 nodo, nunca [] (R5)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'Nodo no encontrado' } }]);
    await expect(cliente.reportesPublicos('noexiste')).rejects.toMatchObject({ codigo: 'nodo' });
  });

  it('500 → ErrorA1 no_disponible (sin fallback silencioso)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([{ status: 500, cuerpo: { success: false, error: 'fallo' } }]);
    await expect(cliente.reportesPublicos('capital')).rejects.toBeInstanceOf(ErrorA1);
  });
});

describe('ART-R1 — escritura ciudadana (POST /api/reportes)', () => {
  it('201 con Bearer y lat/lng EXIGIDOS: el reporte nace received', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 201, cuerpo: { success: true, data: { id: 'r1', categoria: 'arbolado', descripcion: 'rama caída', estado: 'received', lat: -31.5, lng: -68.5, created_at: '2026-10-30T12:00:00.000Z', is_synthetic: false } } },
    ]);
    const { reporte, idempotente } = await cliente.crearReporte({
      nodo_key: 'capital',
      categoria: 'arbolado',
      descripcion: 'rama caída sobre vereda',
      lat: -31.5,
      lng: -68.5,
    });
    expect(reporte.estado).toBe('received');
    expect(idempotente).toBe(false);
    const init = t.llamadas[0].init as { method: string; headers: Record<string, string>; body: string };
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    expect(JSON.parse(init.body)).toEqual({
      nodo_key: 'capital',
      categoria: 'arbolado',
      descripcion: 'rama caída sobre vereda',
      lat: -31.5,
      lng: -68.5,
    });
  });

  it('200 idempotente: reintento del mismo ciudadano no duplica', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 200, cuerpo: { success: true, data: { id: 'r1', estado: 'received', lat: 1, lng: 1 }, idempotente: true } },
    ]);
    const { idempotente } = await cliente.crearReporte({
      nodo_key: 'capital', categoria: 'arbolado', descripcion: 'duplicado', lat: -31.5, lng: -68.5,
    });
    expect(idempotente).toBe(true);
  });

  it('400 categoría inexistente → codigo categoria', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 400, cuerpo: { success: false, error: 'categoría inexistente en el vocabulario del nodo' } },
    ]);
    await expect(cliente.crearReporte({ nodo_key: 'capital', categoria: 'zzz', descripcion: 'x'.repeat(20), lat: -31.5, lng: -68.5 }))
      .rejects.toMatchObject({ codigo: 'categoria' });
  });

  it('400 anti-PII (sin campo success en la respuesta real) → codigo pii', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 400, cuerpo: { error: 'payload rechazado: contiene datos personales identificables (DNI) — ADR-020 cond. 1, Ley 25.326' } },
    ]);
    await expect(cliente.crearReporte({ nodo_key: 'capital', categoria: 'arbolado', descripcion: 'mi DNI 30123456', lat: -31.5, lng: -68.5 }))
      .rejects.toMatchObject({ codigo: 'pii' });
  });

  it('401 → credenciales; sin token local → credenciales ANTES de llamar', async () => {
    const t = crearTransporte();
    const sinToken = crearClienteA1({ transporte: t.transporte, token: () => null });
    await expect(sinToken.crearReporte({ nodo_key: 'capital', categoria: 'a', descripcion: 'b', lat: -31.5, lng: -68.5 }))
      .rejects.toMatchObject({ codigo: 'credenciales' });
    expect(t.llamadas.length).toBe(0);

    t.programar([{ status: 401, cuerpo: { success: false, error: 'sesión inválida' } }]);
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-vencido' });
    await expect(cliente.crearReporte({ nodo_key: 'capital', categoria: 'a', descripcion: 'b', lat: -31.5, lng: -68.5 }))
      .rejects.toMatchObject({ codigo: 'credenciales' });
  });
});

describe('ART-R1 — mis reportes e historial', () => {
  it('mios con Bearer: transiciones selladas con justificación pública', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          count: 1,
          data: [
            {
              id: 'r1',
              nodo_key: 'capital',
              categoria: 'arbolado',
              descripcion: 'rama caída',
              estado: 'resolved',
              lat: -31.5,
              lng: -68.5,
              created_at: '2026-10-30T12:00:00.000Z',
              transiciones: [
                {
                  estado_anterior: 'received',
                  estado_nuevo: 'resolved',
                  justificacion: 'intervención verificada por la cuadrilla municipal',
                  moderador_hash: 'abc123',
                  occurred_at: '2026-10-30T15:00:00.000Z',
                },
              ],
            },
          ],
        },
      },
    ]);
    const mios = await cliente.mios();
    expect(mios.length).toBe(1);
    expect(mios[0].nodo_key).toBe('capital');
    expect(mios[0].transiciones[0].justificacion).toContain('verificada');
    const init = t.llamadas[0].init as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    expect(t.llamadas[0].ruta).toBe('/api/reportes/mios');
  });

  it('mios sin token → credenciales (nunca llama)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    await expect(cliente.mios()).rejects.toMatchObject({ codigo: 'credenciales' });
    expect(t.llamadas.length).toBe(0);
  });

  it('historial público sin token: transiciones del ciclo', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: {
            reporte_id: 'r1',
            transiciones: [
              { estado_anterior: 'received', estado_nuevo: 'in_progress', justificacion: 'en revisión', moderador_hash: 'abc', occurred_at: '2026-10-30T14:00:00.000Z' },
            ],
          },
        },
      },
    ]);
    const transiciones = await cliente.historial('r1');
    expect(transiciones.length).toBe(1);
    expect(transiciones[0].estado_nuevo).toBe('in_progress');
    expect(t.llamadas[0].ruta).toBe('/api/reportes/r1/historial');
    const init = (t.llamadas[0].init ?? {}) as { headers?: Record<string, string> };
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('historial 404 (descartado nunca publicable) → no_encontrado', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'reporte no encontrado' } }]);
    await expect(cliente.historial('r-descartado')).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('ART-R1 — fichas de valoración (#149, 7 dimensiones)', () => {
  it('fichas público con filtros: query string exacto y sin Authorization', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 200, cuerpo: { success: true, count: 1, data: [{ id: 'fi1', nodo_key: 'capital', feature_id: 'f1', version: 'v1', respuestas: {}, estado: 'corroborada', corroboracion: 'taller_comunitario', created_by_hash: 'abc', created_at: '2026-10-30T10:00:00.000Z', updated_at: '2026-10-30T11:00:00.000Z', feature_titulo: 'Plaza Independencia', feature_lat: -31.5, feature_lng: -68.5, feature_is_synthetic: false, feature_fuente_label: 'Municipio · plano', estado_publico: 'validado' }] } },
    ]);
    const fichas = await cliente.fichas({ nodo: 'capital', estado: 'corroborada' });
    expect(fichas[0].estado_publico).toBe('validado');
    expect(fichas[0].corroboracion).toBe('taller_comunitario');
    expect(t.llamadas[0].ruta).toBe('/api/fichas-valoracion?nodo=capital&estado=corroborada');
    const init = (t.llamadas[0].init ?? {}) as { headers?: Record<string, string> };
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('crearFicha 201 con Bearer: nace testimonio anclada al espacio', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 201, cuerpo: { success: true, data: { id: 'fi1', nodo_key: 'capital', feature_id: 'f1', version: 'v1', respuestas: {}, estado: 'testimonio', corroboracion: null, created_by_hash: 'abc', created_at: '2026-10-30T10:00:00.000Z', updated_at: '2026-10-30T10:00:00.000Z' } } },
    ]);
    const { ficha, idempotente } = await cliente.crearFicha({
      nodo_key: 'capital',
      feature_id: 'f1',
      version: 'v1',
      respuestas: respuestasV1Ejemplo,
    });
    expect(ficha.estado).toBe('testimonio');
    expect(idempotente).toBe(false);
    const init = t.llamadas[0].init as { method: string; headers: Record<string, string>; body: string };
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    const body = JSON.parse(init.body);
    expect(body.nodo_key).toBe('capital');
    expect(body.feature_id).toBe('f1');
    expect(body.version).toBe('v1');
    // 7 dimensiones del contrato, íntegras
    expect(Object.keys(body.respuestas)).toEqual([
      'usos_vitalidad', 'accesibilidad', 'sombra_arbolado', 'agua_xerojardin', 'seguridad_disenio', 'equipamiento', 'custodia',
    ]);
    expect(t.llamadas[0].ruta).toBe('/api/fichas-valoracion');
  });

  it('crearFicha 404 espacio (feature fuera de public_space) → no_encontrado', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 404, cuerpo: { success: false, error: 'espacio público no encontrado en el nodo indicado' } },
    ]);
    await expect(cliente.crearFicha({ nodo_key: 'capital', feature_id: 'fx', version: 'v1', respuestas: respuestasV1Ejemplo }))
      .rejects.toMatchObject({ codigo: 'no_encontrado' });
  });

  it('crearFicha 400 anti-PII (sin success) → pii', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 400, cuerpo: { error: 'payload rechazado: contiene datos personales identificables (Teléfono) — ADR-020 cond. 1, Ley 25.326' } },
    ]);
    await expect(cliente.crearFicha({ nodo_key: 'capital', feature_id: 'f1', version: 'v1', respuestas: respuestasV1Ejemplo }))
      .rejects.toMatchObject({ codigo: 'pii' });
  });
});

describe('ART-R1 — Banco de Potencialidades (Bloque 9)', () => {
  it('oportunidades público con filtros ?nodo=&tipo=', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 200, cuerpo: { success: true, count: 1, data: [{ id: 'op1', tipo: 'human_capacity', titulo: 'Taller de riego', descripcion: 'vecinos con oficio de riego', estado: 'detected', nodo_key: 'capital', subnodo_key: null, evidencia: { evidence_type: 'community_input', descripcion: 'asamblea vecinal' }, actores: [], tags: ['riego'], created_by_hash: 'abc', created_at: '2026-10-30T10:00:00.000Z', updated_at: '2026-10-30T10:00:00.000Z' }] } },
    ]);
    const ops = await cliente.oportunidades({ nodo: 'capital', tipo: 'human_capacity' });
    expect(ops[0].estado).toBe('detected');
    expect(ops[0].tags).toEqual(['riego']);
    expect(t.llamadas[0].ruta).toBe('/api/oportunidades?nodo=capital&tipo=human_capacity');
  });

  it('postular 201 con Bearer: nace detected con evidencia obligatoria', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 201, cuerpo: { success: true, data: { id: 'op1', tipo: 'market_gap', titulo: 'Feria falta', descripcion: 'sin feria barrial los domingos', estado: 'detected', nodo_key: 'capital', subnodo_key: null, evidencia: {}, actores: [], tags: [], created_by_hash: 'abc', created_at: '2026-10-30T10:00:00.000Z', updated_at: '2026-10-30T10:00:00.000Z' } } },
    ]);
    const { oportunidad, idempotente } = await cliente.postularOportunidad({
      tipo: 'market_gap',
      titulo: 'Feria falta',
      descripcion: 'sin feria barrial los domingos',
      nodo_key: 'capital',
      evidencia: { evidence_type: 'field_observation', descripcion: 'observación de tres domingos consecutivos' },
    });
    expect(oportunidad.estado).toBe('detected');
    expect(idempotente).toBe(false);
    const init = t.llamadas[0].init as { method: string; headers: Record<string, string>; body: string };
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    const body = JSON.parse(init.body);
    expect(body.evidencia.evidence_type).toBe('field_observation');
    expect(body.subnodo_key).toBeUndefined(); // opcional no enviado
    expect(t.llamadas[0].ruta).toBe('/api/oportunidades');
  });

  it('postular con actores nombrados + consentimiento: van en el body', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => 'jwt-1' });
    t.programar([
      { status: 201, cuerpo: { success: true, data: { id: 'op1', estado: 'detected', tipo: 'partnership_opportunity', titulo: 'x', descripcion: 'y', nodo_key: 'capital', subnodo_key: null, evidencia: {}, actores: [], tags: [], created_by_hash: 'a', created_at: '2026-10-30T10:00:00.000Z', updated_at: '2026-10-30T10:00:00.000Z' } } },
    ]);
    await cliente.postularOportunidad({
      tipo: 'partnership_opportunity',
      titulo: 'Vínculo cooperativa',
      descripcion: 'la cooperativa quiere sumar un punto de venta',
      nodo_key: 'capital',
      evidencia: { evidence_type: 'institutional_document', descripcion: 'acta de asamblea cooperativa' },
      actores: [{ role: 'partner', name: 'Cooperativa X', consent_confirmed: true }],
      tags: ['cooperativa'],
    });
    const body = JSON.parse((t.llamadas[0].init as { body: string }).body);
    expect(body.actores[0]).toEqual({ role: 'partner', name: 'Cooperativa X', consent_confirmed: true });
    expect(body.tags).toEqual(['cooperativa']);
  });

  it('validarActorA1: actor nombrado SIN consentimiento → error honesto ANTES de llamar (ADR-027)', () => {
    expect(validarActorA1({ role: 'proposer', name: 'Juana', consent_confirmed: false })).toContain('consentimiento');
    expect(validarActorA1({ role: 'proposer', name: 'Juana', consent_confirmed: true })).toBeNull();
    // sin nombre → el consentimiento no es exigido (no hay identidad en juego)
    expect(validarActorA1({ role: 'validator', consent_confirmed: false })).toBeNull();
  });

  it('los vocabularios de tipos coinciden con el contrato (10 tipos, 7 evidencias)', () => {
    expect(TIPOS_OPORTUNIDAD.length).toBe(10);
    expect(TIPOS_EVIDENCIA.length).toBe(7);
    expect(TIPOS_OPORTUNIDAD.map((t) => t.valor)).toContain('market_gap');
    expect(TIPOS_EVIDENCIA.map((t) => t.valor)).toContain('field_observation');
  });
});

describe('ART-R1 — KPIs públicos (VIG-003, set honesto v1)', () => {
  it('kpis público: parse de snapshot con valor y detalles; count 0 honesto', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 200, cuerpo: { success: true, data: [{ nodo_key: 'capital', kpi_key: 'activos_por_estado', valor: 4, detalles: { aprobado: 3, propuesto: 1 }, computed_at: '2026-10-30T06:00:00.000Z' }], count: 1 } },
      { status: 200, cuerpo: { success: true, data: [], count: 0 } },
    ]);
    const kpis = await cliente.kpis('capital');
    expect(kpis[0].valor).toBe(4);
    expect(kpis[0].detalles.aprobado).toBe(3);
    const vacio = await cliente.kpis('caucete');
    expect(vacio).toEqual([]); // count 0 honesto: nodo sin snapshots aún (R15)
    expect(t.llamadas[0].ruta).toBe('/api/nodos/capital/kpis');
  });

  it('kpis con valor null (cobertura_geometrica v1) → null ≠ 0 (R15)', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 200, cuerpo: { success: true, data: [{ nodo_key: 'capital', kpi_key: 'cobertura_geometrica', valor: null, detalles: {}, computed_at: '2026-10-30T06:00:00.000Z' }], count: 1 } },
    ]);
    const kpis = await cliente.kpis('capital');
    expect(kpis[0].valor).toBeNull();
  });
});

describe('ART-R1 — asistente territorial (VIG-006, sin LLM)', () => {
  it('ask público con pregunta exacta: respuesta Dato–Interpretación–Sugerencia', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      {
        status: 200,
        cuerpo: {
          success: true,
          data: {
            nodo_key: 'capital',
            pregunta: '¿qué activos turísticos hay?',
            dato: [{ source_type: 'activo', source_id: 'a1', subnodo_key: null, texto: 'Paseo peatonal con mirador.', fuentes: [{ fuente: 'Municipio · plano 2024' }] }],
            dominio: 'turistico',
            interpretacion: 'La consulta recupera 1 fragmento(s) del dominio turístico…',
            sugerencia: 'Antes de viajar, confirme horario y temporada…',
            fuentes: [{ fuente: 'Municipio · plano 2024' }],
            confidence: 1,
            recovered: 1,
            human_review: 'pending',
          },
        },
      },
    ]);
    const r = await cliente.ask('capital', { pregunta: '¿qué activos turísticos hay?' });
    expect(r.human_review).toBe('pending');
    expect(r.dominio).toBe('turistico');
    expect(r.dato[0].fuentes[0].fuente).toBe('Municipio · plano 2024');
    const init = t.llamadas[0].init as { method: string; body: string };
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ pregunta: '¿qué activos turísticos hay?' });
    expect(t.llamadas[0].ruta).toBe('/api/nodos/capital/ask');
  });

  it('ask sin fragmentos: interpretacion null honesto (R15), recovered 0', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 200, cuerpo: { success: true, data: { nodo_key: 'capital', pregunta: 'xyz', dato: [], dominio: null, interpretacion: null, sugerencia: null, fuentes: [], confidence: 0, recovered: 0, human_review: 'pending' } } },
    ]);
    const r = await cliente.ask('capital', { pregunta: 'xyz' });
    expect(r.interpretacion).toBeNull();
    expect(r.recovered).toBe(0);
  });

  it('ask 400 pregunta inválida → datos; 404 nodo → nodo', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 400, cuerpo: { success: false, error: 'Pregunta inválida (3-300 caracteres; subnodo y n1 opcionales)' } },
      { status: 404, cuerpo: { success: false, error: 'Nodo no encontrado' } },
    ]);
    await expect(cliente.ask('capital', { pregunta: 'x' })).rejects.toMatchObject({ codigo: 'datos' });
    await expect(cliente.ask('noexiste', { pregunta: 'una pregunta válida' })).rejects.toMatchObject({ codigo: 'nodo' });
  });
});

describe('ART-R1 — directorio y producción (VIG-005)', () => {
  it('productos y operativa públicos: parse honesto', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([
      { status: 200, cuerpo: { success: true, data: [{ id: 'p1', activo_id: 'a1', slug: 'dulce-de-membrillo', nombre: 'Dulce de membrillo', categoria: 'dulces', temporada_meses: [3, 4], estado: 'aprobado', created_by_hash: 'abc', created_at: '2026-10-30T10:00:00.000Z' }], count: 1 } },
      { status: 200, cuerpo: { success: true, data: { activo_id: 'a1', titulo: 'Familiar productor', tipo: 'local', nodo_key: 'caucete', subnodo_key: null, horario: 'lunes a viernes 8-13', temporada_meses: [], capacity_status: 'unknown', capacidad_plazas: null, seguridad: null, habilitacion: { municipal: 'unknown', provincial_2400_t: 'unknown', sello: 'unknown', verified_at: null }, procedencia: null } } },
    ]);
    const productos = await cliente.productos('a1');
    expect(productos[0].estado).toBe('aprobado');
    expect(productos[0].temporada_meses).toEqual([3, 4]);
    const operativa = await cliente.operativa('a1');
    expect(operativa.capacity_status).toBe('unknown'); // unknown se publica tal cual (R15)
    expect(t.llamadas[0].ruta).toBe('/api/activos/a1/productos');
    expect(t.llamadas[1].ruta).toBe('/api/operativa/a1');
    for (const l of t.llamadas) {
      const init = (l.init ?? {}) as { headers?: Record<string, string> };
      expect(init.headers?.Authorization).toBeUndefined();
    }
  });

  it('operativa 404 (sin operativa publicada / restricted sin eco) → no_encontrado', async () => {
    const t = crearTransporte();
    const cliente = crearClienteA1({ transporte: t.transporte, token: () => null });
    t.programar([{ status: 404, cuerpo: { success: false, error: 'el activo no tiene operativa publicada' } }]);
    await expect(cliente.operativa('a-restricted')).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('ART-R1 — red caída (R5: jamás [])', () => {
  it('fallo de red → ErrorA1 no_disponible en cualquier superficie', async () => {
    const roto: TransporteSesion = async () => {
      throw new Error('red caída');
    };
    const cliente = crearClienteA1({ transporte: roto, token: () => 'jwt-1' });
    await expect(cliente.mios()).rejects.toBeInstanceOf(ErrorA1);
    await expect(cliente.fichas()).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.oportunidades()).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.kpis('capital')).rejects.toMatchObject({ codigo: 'no_disponible' });
    await expect(cliente.ask('capital', { pregunta: 'algo' })).rejects.toMatchObject({ codigo: 'no_disponible' });
  });
});

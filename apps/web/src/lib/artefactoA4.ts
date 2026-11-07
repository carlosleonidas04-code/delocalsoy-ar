/**
 * DELocalSoy.AR — Artefacto A4 (auditor y datos abiertos): matriz de permisos
 * v0.1, capacidades por sesión, huella de verificación y cliente HTTP puro
 * de LECTURA para las superficies REALES (ART-R3, #272, épica #268).
 *
 * Superficies contrastadas contra main @ 77500be (apps/api/src/routes +
 * packages/db/prisma/schema.prisma):
 *   GET  /api/health              (público) estado honesto — SIN envelope
 *   GET  /api/evidencias          (público) cadena EV-xxx — SIN envelope {count, evidencias}
 *   GET  /api/reportes/:id/historial (público) ciclo sellado con moderador_hash (ADR-038)
 *   GET  /api/nodos/:key/reportes (público) bandeja SIN 'descartado'
 *   GET  /api/fuentes             (público) catálogo de procedencia con cautelas (#147)
 *   GET  /api/ingestas?nodo=      (público) SOLO estado='publicado' (#200)
 *   GET  /api/nodos/:key/kpis     (público) valor null != 0 (R15)
 *   GET  /api/patrimonio/:activoId (público) ficha SIN sensible/sensible_nota (ADR-036)
 *   GET  /api/sellos?nodo=&type=    (público) libro contable AR4 (#403): sellos YA emitidos
 *   GET  /api/sellos/tipos          (público) conteo por type (cobertura vs MATRIZ_SELLOS v0.2)
 *
 * Reglas vivas: R5 (errores tipados, jamás []) · R15 (sin simulación: el
 * auditor NO muta — ninguna escritura se cablea; lo no publicado no se
 * inventa) · ADR-032 (events_raw: libro contable append-only) · ADR-035
 * (nada verificado sin fuente) · ADR-036 (el auditor tampoco ve sensible) ·
 * Ley 25.326/ADR-027 (los sellos viven sin PII; el auditor jamás ve
 * identidades, solo pseudónimos y hashes).
 *
 * HALLAZGOS honestos del contraste (declarados, no escondidos):
 *  1. El rol 'auditor' existe en RolPlataforma (techo 500 req/min, sesion.ts)
 *     pero la API NO lo emite: RolSchema real = {ciudadano, moderador, admin}
 *     (ADR-031); el registro público solo crea 'ciudadano' y la promoción es
 *     operación de sistema. esAuditor es DECLARATIVO: toda la lectura A4 es
 *     pública (datos abiertos) — la sesión no agrega datos, solo techo.
 *  2. AR4 (#403): events_raw YA tiene GET público — GET /api/sellos (libro
 *     contable con ?nodo= ?type= y paginación limit/offset) y
 *     GET /api/sellos/tipos (cobertura). Los derivados siguen existiendo
 *     (health modeSource, historiales con moderador_hash, KPIs). POST
 *     /api/events sigue siendo ingesta pública (append-only, anti-PII) y
 *     JAMÁS se cablea acá: el auditor no muta.
 *  3. /api/health y /api/evidencias responden SIN envelope {success,data} —
 *     los parsers son directos (el resto de la API sí usa envelope).
 *  4. El modo del sistema (real|synthetic|degraded) se resuelve desde el
 *     ÚLTIMO sello 'system.mode_change' en events_raw (R7): el health es en
 *     sí mismo una pieza de auditoría — modeSource declara de dónde salió.
 *  5. Tamiz de 13 dimensiones (P-10) e historial de acreditación (P-09):
 *     ◇ por diseñar — sin superficie en main, no se simula (R15).
 *  6. Comercios (MK-2, historial F-3): PR #254 en cola de merge — sin
 *     cablear hasta que exista en main (R15).
 */

import type { EstadoSesion, RolPlataforma, TransporteSesion } from './sesion';
import { RATE_LIMIT_POR_ROL, RATE_LIMIT_VISITANTE } from './sesion';
import type { EstadoComponente, KpiSnapshot, ReportePublico, TransicionReporte } from './artefactoA1';
// Re-export de tipos compartidos: los paneles A4 consumen UNA sola fuente web de contratos.
export type { EstadoComponente, KpiSnapshot, ReportePublico, TransicionReporte } from './artefactoA1';
import type { FichaPatrimonio, FuenteEspacial, Ingesta } from './artefactoA3';
export type { FichaPatrimonio, FuenteEspacial, Ingesta } from './artefactoA3';

/* ------------------------------------------------------------------ */
/* Componentes del artefacto (ARTEFACTO_A4_AUDITOR_DATOS_ABIERTOS v0.1) */
/* ------------------------------------------------------------------ */

export type ComponenteA4Id =
  | 'libro_contable'
  | 'historiales_publicos'
  | 'cadena_acreditacion'
  | 'fuentes_ingestas_publicas'
  | 'kpis_publicos'
  | 'ficha_patrimonial_publica'
  | 'export_verificacion'
  | 'tamiz_13_dimensiones';

export interface ComponenteA4 {
  id: ComponenteA4Id;
  titulo: string;
  resumen: string;
  /** Estado honesto contrastado en vivo (R15). */
  estado: EstadoComponente;
  traza: string;
}

export const COMPONENTES_A4: readonly ComponenteA4[] = [
  {
    id: 'libro_contable',
    titulo: 'Libro contable (events_raw)',
    resumen:
      'Sellos inmutables 1:1 con cada transición, append-only con hash único idempotente (ADR-032). AR4 (#403): lectura pública directa — GET /api/sellos con filtros ?nodo= ?type= y paginación, GET /api/sellos/tipos para la cobertura contra docs/MATRIZ_SELLOS.md v0.2 (39 sellos).',
    estado: 'en_main',
    traza: 'ADR-032 / CORE-004 R4a (#213, EV-054) / AR4 #403 (épica #399)',
  },
  {
    id: 'historiales_publicos',
    titulo: 'Historiales públicos derivados de sellos',
    resumen:
      'Ciclo del reporte con justificación pública >=10 y moderador_hash (ADR-038); nunca tabla mutable. Comercios (MK-2, F-3) en cola: PR #254 sin merge — sin cablear (R15).',
    estado: 'en_main',
    traza: 'CORE-005 R3/R4 (#211/#213, EV-053/EV-054)',
  },
  {
    id: 'cadena_acreditacion',
    titulo: 'Cadena de acreditación (EV-xxx)',
    resumen:
      'GET /api/evidencias: registro de evidencias ejecutables ordenado por código + la cadena pública GitHub issue ↔ PR ↔ EV ↔ SHA ↔ docs (EVIDENCIA.md, compuerta R9, label r9-ratificado).',
    estado: 'en_main',
    traza: 'R9 / EVIDENCIA.md / PR #267',
  },
  {
    id: 'fuentes_ingestas_publicas',
    titulo: 'Fuentes e ingestas públicas',
    resumen:
      'GET /api/fuentes con cautela central honesta; GET /api/ingestas?nodo= SOLO estado publicado — el pipeline en curso no existe para la lectura pública (R15).',
    estado: 'en_main',
    traza: '#147/#200 (EV-049)',
  },
  {
    id: 'kpis_publicos',
    titulo: 'KPIs públicos del nodo',
    resumen: 'Set honesto v1: valor null = métrica sin computar (cobertura geométrica), counts 0 honestos. Null no es 0 (R15).',
    estado: 'en_main',
    traza: 'VIG-003 (#182, EV-043)',
  },
  {
    id: 'ficha_patrimonial_publica',
    titulo: 'Ficha pública patrimonial',
    resumen:
      'La declaratoria es registro público: existe ficha también para restricted (404 solo oculta el activo, no la declaratoria cuando se consulta por id de ficha). SIN sensible/sensible_nota (ADR-036).',
    estado: 'en_main',
    traza: 'VIG-004 (#173, EV-044)',
  },
  {
    id: 'export_verificacion',
    titulo: 'Export y verificación por hashes',
    resumen:
      'Huella SHA-256 local del snapshot cargado (canonización de claves estables): lo mostrado es verificable por terceros, byte a byte. La mecánica de lotes (md5/SHA por archivo, blob SHA por push) vive en el repositorio.',
    estado: 'en_main',
    traza: 'mecánica de lotes / DriveReportExportModal',
  },
  {
    id: 'tamiz_13_dimensiones',
    titulo: 'Tamiz de 13 dimensiones (P-10) + historial de acreditación (P-09)',
    resumen:
      'Criterios de auditoría de datos abiertos. ◇ Por diseñar como checklist operativo: sin superficie en main, no se simula (R15).',
    estado: 'propuesto',
    traza: 'DESIGN.md lote-1 (P-09/P-10)',
  },
];

/* ------------------------------------------------------------------ */
/* Matriz de permisos componente × rol (spec A4 v0.1 §3)                */
/* ------------------------------------------------------------------ */

/** El auditor NO escribe: solo leer y verificar. La escritura no existe en A4. */
export type PermisoA4 = 'leer' | 'verificar' | null;

export interface ColumnasPermisoA4 {
  publico: PermisoA4;
  auditor: PermisoA4;
}

export const MATRIZ_PERMISOS_A4: Record<ComponenteA4Id, ColumnasPermisoA4> = {
  libro_contable: { publico: 'leer', auditor: 'verificar' },
  historiales_publicos: { publico: 'leer', auditor: 'verificar' },
  cadena_acreditacion: { publico: 'leer', auditor: 'leer' },
  fuentes_ingestas_publicas: { publico: 'leer', auditor: 'leer' },
  kpis_publicos: { publico: 'leer', auditor: 'verificar' },
  ficha_patrimonial_publica: { publico: 'leer', auditor: 'leer' },
  export_verificacion: { publico: 'leer', auditor: 'verificar' },
  tamiz_13_dimensiones: { publico: null, auditor: null },
};

/* ------------------------------------------------------------------ */
/* Capacidades derivadas del estado de sesión                          */
/* ------------------------------------------------------------------ */

export interface CapacidadesA4 {
  esVisitante: boolean;
  /** Modo synthetic: demo SINTÉTICO declarada — nada se acredita (R15). */
  esDemo: boolean;
  rol: RolPlataforma | null;
  techoReqsMin: number;
  /**
   * DECLARATIVO (hallazgo 1): la API aún no emite el rol 'auditor'
   * (RolSchema real {ciudadano, moderador, admin}); toda la lectura A4 es
   * pública. Con sesión de rol 'auditor' el techo real es 500 req/min.
   */
  esAuditor: boolean;
}

export function capacidadesA4(estado: EstadoSesion): CapacidadesA4 {
  if (estado.tipo === 'demo_sintetico') {
    return {
      esVisitante: true,
      esDemo: true,
      rol: null,
      techoReqsMin: RATE_LIMIT_VISITANTE,
      esAuditor: false,
    };
  }
  if (estado.tipo === 'sesion') {
    const rol = estado.usuario.rol;
    return {
      esVisitante: false,
      esDemo: false,
      rol,
      techoReqsMin: RATE_LIMIT_POR_ROL[rol] ?? RATE_LIMIT_VISITANTE,
      esAuditor: rol === 'auditor',
    };
  }
  return {
    esVisitante: true,
    esDemo: false,
    rol: null,
    techoReqsMin: RATE_LIMIT_VISITANTE,
    esAuditor: false,
  };
}

/**
 * Permiso visible en la matriz. El no-auditor (con o sin sesión) ve la
 * columna pública: los datos abiertos son idénticos para todos — la sesión
 * no agrega lecturas, solo techo (hallazgo 1, declarado).
 */
export function permisoVisibleA4(componente: ComponenteA4Id, caps: CapacidadesA4): PermisoA4 {
  return caps.esAuditor ? MATRIZ_PERMISOS_A4[componente].auditor : MATRIZ_PERMISOS_A4[componente].publico;
}

/* ------------------------------------------------------------------ */
/* Errores honestos (R5: jamás []) — A4 es lectura: sin credenciales    */
/* ni permisos que fallar: el error de lectura es de datos o de red.    */
/* ------------------------------------------------------------------ */

export type CodigoErrorA4 = 'datos' | 'no_encontrado' | 'no_disponible';

export class ErrorA4 extends Error {
  codigo: CodigoErrorA4;
  constructor(codigo: CodigoErrorA4, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorA4';
    this.codigo = codigo;
  }
}

/* ------------------------------------------------------------------ */
/* Tipos del dominio A4 (espejo EXACTO del contrastado en vivo)         */
/* ------------------------------------------------------------------ */

/** GET /api/health — estado honesto del sistema (SIN envelope). */
export interface HealthSnapshot {
  /** ok | synthetic | degraded (R5: el estado efectivo, no el deseado). */
  status: string;
  service: string;
  version: string;
  /** real | synthetic | degraded — modo EFECTIVO. */
  mode: string;
  /** Modo declarado por el último sello (puede diferir del efectivo sin base). */
  modeDeclared: string;
  modeDeclaredAt: string;
  /** events_raw | process (R7): de dónde se resolvió el modo — auditoría. */
  modeSource: string;
  /** postgres | none — sin base no hay sello posible. */
  dataSource: string;
  /** ok | down — transporte Redis Streams (ADR-032 R4a), fail-open. */
  redis: string;
  /** false honesto hasta que exista la regla de rama (issue #25). */
  branchProtection: boolean;
  /** null honesto: sin base no se puede contar. */
  evidencias: number | null;
  timestamp: string;
}

/** GET /api/evidencias — registro de evidencias ejecutables (EV-xxx). */
export interface Evidencia {
  id: string;
  code: string;
  /** pendiente | ok | fallido. */
  status: string;
  title: string;
  result: Record<string, unknown> | null;
  verified_at: string | null;
}

/* ------------------------------------------------------------------ */
/* Huella de verificación (export/verificación por hashes)             */
/* ------------------------------------------------------------------ */

/**
 * Canonización estable: claves de objeto ordenadas, arrays en orden.
 * Dos snapshots iguales en contenido producen la MISMA huella, sin importar
 * el orden de serialización del servidor.
 */
export function canonizar(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') {
    const plano = JSON.stringify(valor);
    return plano === undefined ? 'null' : plano;
  }
  if (Array.isArray(valor)) {
    return '[' + valor.map(canonizar).join(',') + ']';
  }
  const claves = Object.keys(valor as Record<string, unknown>).sort();
  return '{' + claves.map((k) => JSON.stringify(k) + ':' + canonizar((valor as Record<string, unknown>)[k])).join(',') + '}';
}

/** Huella SHA-256 del texto canónico — verificable por terceros (WebCrypto). */
export async function huellaSha256(textoCanonico: string): Promise<string> {
  const cripto = globalThis.crypto;
  if (cripto === undefined || cripto.subtle === undefined) {
    throw new ErrorA4('no_disponible', 'este entorno no expone WebCrypto: la huella no puede calcularse (honesto, R5)');
  }
  const datos = new TextEncoder().encode(textoCanonico);
  const digerido = await cripto.subtle.digest('SHA-256', datos);
  let hex = '';
  for (const byte of new Uint8Array(digerido)) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/* ------------------------------------------------------------------ */
/* Cliente puro — SOLO LECTURA (el auditor no muta, spec A4 §4)          */
/* ------------------------------------------------------------------ */

function texto(crudo: unknown): string {
  return typeof crudo === 'string' ? crudo : '';
}

function textoOnulo(crudo: unknown): string | null {
  return typeof crudo === 'string' ? crudo : null;
}

function numeroOnulo(crudo: unknown): number | null {
  return typeof crudo === 'number' ? crudo : null;
}

function query(params: Record<string, string | undefined>): string {
  const pares = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (pares.length === 0) {
    return '';
  }
  return '?' + pares.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v as string)).join('&');
}

/* Parsers locales: los tipos compartidos viven en artefactoA1/artefactoA3;
   los parsers de A4 son propios para no acoplar los clientes entre sí. */

function parseSalud(crudo: Record<string, unknown>): HealthSnapshot {
  return {
    status: texto(crudo.status),
    service: texto(crudo.service),
    version: texto(crudo.version),
    mode: texto(crudo.mode),
    modeDeclared: texto(crudo.modeDeclared),
    modeDeclaredAt: texto(crudo.modeDeclaredAt),
    modeSource: texto(crudo.modeSource),
    dataSource: texto(crudo.dataSource),
    redis: texto(crudo.redis),
    branchProtection: crudo.branchProtection === true,
    evidencias: numeroOnulo(crudo.evidencias),
    timestamp: texto(crudo.timestamp),
  };
}

function parseEvidencia(crudo: Record<string, unknown>): Evidencia {
  return {
    id: texto(crudo.id),
    code: texto(crudo.code),
    status: texto(crudo.status),
    title: texto(crudo.title),
    result:
      crudo.result === null || crudo.result === undefined
        ? null
        : (crudo.result as Record<string, unknown>),
    verified_at: textoOnulo(crudo.verified_at),
  };
}

function parseReporte(crudo: Record<string, unknown>): ReportePublico {
  return {
    id: texto(crudo.id),
    categoria: texto(crudo.categoria),
    descripcion: texto(crudo.descripcion),
    estado: texto(crudo.estado),
    lat: numeroOnulo(crudo.lat),
    lng: numeroOnulo(crudo.lng),
    created_at: texto(crudo.created_at),
    is_synthetic: crudo.is_synthetic === true,
  };
}

function parseTransicion(crudo: Record<string, unknown>): TransicionReporte {
  return {
    estado_anterior: texto(crudo.estado_anterior),
    estado_nuevo: texto(crudo.estado_nuevo),
    justificacion: texto(crudo.justificacion),
    moderador_hash: texto(crudo.moderador_hash),
    occurred_at: texto(crudo.occurred_at),
  };
}

function parseKpi(crudo: Record<string, unknown>): KpiSnapshot {
  return {
    nodo_key: texto(crudo.nodo_key),
    kpi_key: texto(crudo.kpi_key),
    valor: crudo.valor === null ? null : numeroOnulo(crudo.valor),
    detalles: (crudo.detalles ?? {}) as Record<string, number>,
    computed_at: texto(crudo.computed_at),
  };
}

function parseFuente(crudo: Record<string, unknown>): FuenteEspacial {
  return {
    key: texto(crudo.key),
    organismo: texto(crudo.organismo),
    nombre: texto(crudo.nombre),
    url: textoOnulo(crudo.url),
    tipo: texto(crudo.tipo),
    licencia: textoOnulo(crudo.licencia),
    estado: texto(crudo.estado),
    cautela: texto(crudo.cautela),
  };
}

function parseIngesta(crudo: Record<string, unknown>): Ingesta {
  return {
    id: texto(crudo.id),
    source_id: texto(crudo.source_id),
    fuente_key: texto(crudo.fuente_key),
    nodo_key: texto(crudo.nodo_key),
    capa_servicio: texto(crudo.capa_servicio),
    fecha_acceso: texto(crudo.fecha_acceso),
    fecha_corte: texto(crudo.fecha_corte),
    licencia: textoOnulo(crudo.licencia),
    crs_origen: texto(crudo.crs_origen),
    crs_normalizado: texto(crudo.crs_normalizado),
    escala_precision: texto(crudo.escala_precision),
    external_id: textoOnulo(crudo.external_id),
    transformaciones: textoOnulo(crudo.transformaciones),
    estado: texto(crudo.estado) as Ingesta['estado'],
  };
}

function parseFichaPatrimonio(crudo: Record<string, unknown>): FichaPatrimonio {
  return {
    activo_id: texto(crudo.activo_id),
    titulo: texto(crudo.titulo),
    tipo: texto(crudo.tipo),
    proteccion_nivel: texto(crudo.proteccion_nivel),
    proteccion_norma: texto(crudo.proteccion_norma),
    conservacion_estado: textoOnulo(crudo.conservacion_estado),
    acceso_lat: numeroOnulo(crudo.acceso_lat),
    acceso_lng: numeroOnulo(crudo.acceso_lng),
    reglas_acceso: Array.isArray(crudo.reglas_acceso)
      ? (crudo.reglas_acceso as Array<Record<string, unknown>>).map((r) => ({
          regla: texto(r.regla),
          fuente: texto(r.fuente),
        }))
      : [],
    sensible_status: texto(crudo.sensible_status),
    visibilidad: texto(crudo.visibilidad),
  };
}

export interface OpcionesClienteA4 {
  transporte: TransporteSesion;
  baseReportes?: string;
  baseNodos?: string;
  baseFuentes?: string;
  basePatrimonio?: string;
  baseHealth?: string;
  baseEvidencias?: string;
  baseSellos?: string;
}

/**
 * Cliente A4: 10 métodos, TODOS de lectura pública. Sin token, sin
 * Authorization: ninguna superficie A4 exige sesión (datos abiertos) y el
 * auditor no muta — no existe método de escritura por diseño (spec §4).
 */
export interface ClienteA4 {
  // Estado honesto del sistema (SIN envelope) — pieza de auditoría (R7).
  salud(): Promise<HealthSnapshot>;
  // Cadena de acreditación EV-xxx (SIN envelope {count, evidencias}).
  evidencias(): Promise<{ count: number; evidencias: Evidencia[] }>;
  // Libro contable, derivado 1: bandeja pública SIN descartado.
  reportesDeNodo(nodoKey: string): Promise<ReportePublico[]>;
  // Libro contable, derivado 2: ciclo sellado con moderador_hash (ADR-038).
  historialReporte(reporteId: string): Promise<TransicionReporte[]>;
  // Procedencia ADR-035.
  fuentes(): Promise<FuenteEspacial[]>;
  // SOLO estado 'publicado' (hallazgo R2-2): el pipeline en curso no existe.
  ingestasPublicadas(nodo?: string): Promise<Ingesta[]>;
  // KPIs honestos: valor null ≠ 0 (R15).
  kpis(nodoKey: string): Promise<KpiSnapshot[]>;
  // Ficha pública patrimonial SIN sensible/sensible_nota (ADR-036).
  fichaPatrimonio(activoId: string): Promise<FichaPatrimonio>;
  // AR4 (#403): libro contable — sellos YA emitidos con filtros y paginación.
  sellos(params?: { nodo?: string; type?: string; limit?: number; offset?: number }): Promise<{ sellos: SelloPublico[]; total: number }>;
  // AR4 (#403): conteo por type — base de la cobertura contra la matriz.
  sellosTipos(): Promise<SelloTipoCount[]>;
}

interface Envelope {
  success?: boolean;
  data?: unknown;
  error?: unknown;
}

export function crearClienteA4(opts: OpcionesClienteA4): ClienteA4 {
  const baseReportes: string = opts.baseReportes ?? '/api/reportes';
  const baseNodos: string = opts.baseNodos ?? '/api/nodos';
  const baseFuentes: string = opts.baseFuentes ?? '/api';
  const basePatrimonio: string = opts.basePatrimonio ?? '/api/patrimonio';
  const baseHealth: string = opts.baseHealth ?? '/api/health';
  const baseEvidencias: string = opts.baseEvidencias ?? '/api/evidencias';
  const baseSellos: string = opts.baseSellos ?? '/api/sellos';

  const llamar = async (
    ruta: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ) => {
    try {
      return await opts.transporte(ruta, init);
    } catch {
      throw new ErrorA4('no_disponible', 'no se pudo contactar la plataforma');
    }
  };

  const leerJson = async (res: { json(): Promise<unknown> }): Promise<unknown> => {
    try {
      const cuerpo = await res.json();
      if (!cuerpo || typeof cuerpo !== 'object') {
        throw new Error('malformado');
      }
      return cuerpo;
    } catch {
      throw new ErrorA4('no_disponible', 'respuesta malformada de la plataforma');
    }
  };

  /** Mapeo honesto de error HTTP → ErrorA4 (R5). */
  const errorDe = (status: number, mensaje: string): ErrorA4 => {
    if (status === 404) {
      return new ErrorA4('no_encontrado', mensaje || 'no encontrado');
    }
    if (status === 400) {
      return new ErrorA4('datos', mensaje || 'datos inválidos');
    }
    if (status === 429) {
      return new ErrorA4('no_disponible', 'demasiados intentos — esperá un momento (techo por rol)');
    }
    return new ErrorA4('no_disponible', mensaje || 'HTTP ' + status);
  };

  /** Lectura con envelope {success, data} — la mayoría de la API. */
  const lectura = async (ruta: string): Promise<unknown> => {
    const res = await llamar(ruta);
    const cuerpo = (await leerJson(res)) as Envelope;
    if (res.status === 200) {
      if (cuerpo.data === undefined) {
        throw new ErrorA4('no_disponible', 'respuesta malformada (HTTP 200 sin data)');
      }
      return cuerpo.data;
    }
    throw errorDe(res.status, texto(cuerpo.error));
  };

  /** Lectura SIN envelope (health, evidencias): el cuerpo ES el dato. */
  const lecturaDirecta = async (ruta: string): Promise<Record<string, unknown>> => {
    const res = await llamar(ruta);
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      return cuerpo as Record<string, unknown>;
    }
    const sobre = cuerpo as Envelope;
    throw errorDe(res.status, texto(sobre.error));
  };

  const lista = (crudo: unknown): Array<Record<string, unknown>> => {
    if (Array.isArray(crudo)) {
      return crudo as Array<Record<string, unknown>>;
    }
    // R5: una lista malformada es un error visible, jamás [].
    throw new ErrorA4('no_disponible', 'respuesta malformada (se esperaba una lista)');
  };

  const salud = async (): Promise<HealthSnapshot> => {
    const crudo = await lecturaDirecta(baseHealth);
    return parseSalud(crudo);
  };

  const evidencias = async (): Promise<{ count: number; evidencias: Evidencia[] }> => {
    const crudo = await lecturaDirecta(baseEvidencias);
    if (typeof crudo.count !== 'number') {
      throw new ErrorA4('no_disponible', 'respuesta malformada (count ausente en /api/evidencias)');
    }
    return { count: crudo.count, evidencias: lista(crudo.evidencias).map(parseEvidencia) };
  };

  const reportesDeNodo = async (nodoKey: string): Promise<ReportePublico[]> => {
    const data = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/reportes');
    return lista(data).map(parseReporte);
  };

  const historialReporte = async (reporteId: string): Promise<TransicionReporte[]> => {
    const data = await lectura(baseReportes + '/' + encodeURIComponent(reporteId) + '/historial');
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new ErrorA4('no_disponible', 'respuesta malformada (se esperaba el objeto del historial)');
    }
    const registro = data as Record<string, unknown>;
    return lista(registro.transiciones).map(parseTransicion);
  };

  const fuentes = async (): Promise<FuenteEspacial[]> => {
    const data = await lectura(baseFuentes + '/fuentes');
    return lista(data).map(parseFuente);
  };

  const ingestasPublicadas = async (nodo?: string): Promise<Ingesta[]> => {
    const data = await lectura(baseFuentes + '/ingestas' + query({ nodo }));
    return lista(data).map(parseIngesta);
  };

  const kpis = async (nodoKey: string): Promise<KpiSnapshot[]> => {
    const data = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/kpis');
    return lista(data).map(parseKpi);
  };

  const fichaPatrimonio = async (activoId: string): Promise<FichaPatrimonio> => {
    const data = await lectura(basePatrimonio + '/' + encodeURIComponent(activoId));
    return parseFichaPatrimonio(data as Record<string, unknown>);
  };

  // AR4 (#403): libro contable — lectura pública de los sellos YA emitidos.
  // El total llega en el body y, como respaldo, en el header
  // X-DELocalSoy-Total-Count (patrón #165): si el transporte no expone
  // headers, total 0 declarado (honesto — se muestra lo listado).
  const sellos = async (
    params: { nodo?: string; type?: string; limit?: number; offset?: number } = {}
  ): Promise<{ sellos: SelloPublico[]; total: number }> => {
    const res = await llamar(
      baseSellos +
        query({
          nodo: params.nodo,
          type: params.type,
          limit: params.limit !== undefined ? String(params.limit) : undefined,
          offset: params.offset !== undefined ? String(params.offset) : undefined,
        })
    );
    const cuerpo = (await leerJson(res)) as Envelope & { total?: unknown };
    if (res.status !== 200) {
      throw errorDe(res.status, texto(cuerpo.error));
    }
    if (cuerpo.data === undefined) {
      throw new ErrorA4('no_disponible', 'respuesta malformada (HTTP 200 sin data)');
    }
    let total = 0;
    if (typeof cuerpo.total === 'number') {
      total = cuerpo.total;
    } else {
      const h = (res as unknown as { headers?: { get?: (n: string) => string | null } }).headers;
      const crudo = h && typeof h.get === 'function' ? h.get('x-delocalsoy-total-count') : null;
      if (crudo !== null && Number.isFinite(Number(crudo))) total = Number(crudo);
    }
    return { sellos: lista(cuerpo.data).map(parseSello), total };
  };

  // AR4 (#403): conteo de sellos por type (GET /api/sellos/tipos).
  const sellosTipos = async (): Promise<SelloTipoCount[]> => {
    const data = await lectura(baseSellos + '/tipos');
    return lista(data).map((r) => ({
      type: texto(r.type),
      count: typeof r.count === 'number' ? r.count : 0,
    }));
  };

  return {
    salud,
    evidencias,
    reportesDeNodo,
    historialReporte,
    fuentes,
    ingestasPublicadas,
    kpis,
    fichaPatrimonio,
    sellos,
    sellosTipos,
  };
}


/* ------------------------------------------------------------------ */
/* AR4 (#403, épica #399): libro contable de sellos — tipos y cobertura */
/* ------------------------------------------------------------------ */

/** Sello público del libro contable: tal como vive en events_raw (sin PII). */
export interface SelloPublico {
  id: string;
  type: string;
  hash: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

/** Conteo por type (GET /api/sellos/tipos). */
export interface SelloTipoCount {
  type: string;
  count: number;
}

/** Fila de docs/MATRIZ_SELLOS.md v0.2 — espejo EXACTO de la matriz (R15). */
export interface FilaMatrizSello {
  sello: string;
  dominio: string;
  origen: string;
}

// Matriz v0.2 (revisión M0 2026-11-06 + cluster.creado saldada por AR4 #403
// + 4 filas de deuda saldadas por C5 #412 + producto.atributos_editados
// MK-3b #426): 39 sellos documentados. Espejo de
// docs/MATRIZ_SELLOS.md — si la matriz cambia en un PR, este espejo cambia en
// el MISMO PR (regla 5).
export const MATRIZ_SELLOS_V0_2: readonly FilaMatrizSello[] = [
  { sello: 'subnodo.creado', dominio: 'subnodos', origen: 'VIG-001 (#175), Fase C (#198)' },
  { sello: 'activo.propuesto', dominio: 'activos', origen: 'CORE-004 R6 (#204, EV-035)' },
  { sello: 'activo.ingestado', dominio: 'activos (seed VIG-002)', origen: '#179' },
  { sello: 'activo.estado_cambiado', dominio: 'activos (PATCH moderación)', origen: 'CORE-004 R5b (#111, EV-034) — fila saldada por C5 #412' },
  { sello: 'patrimonio.ingestado', dominio: 'patrimonio (seed VIG-004)', origen: '#186' },
  { sello: 'patrimonio.custodiado', dominio: 'patrimonio (PATCH custodia)', origen: '#186' },
  { sello: 'patrimonio.observado', dominio: 'patrimonio_observaciones', origen: 'VIG-009 (#253 → #301, EV-072)' },
  { sello: 'operativa.ingestado', dominio: 'activos_operativa (seed VIG-005)', origen: '#189' },
  { sello: 'producto.propuesto', dominio: 'productos', origen: '#189' },
  { sello: 'producto.estado_cambiado', dominio: 'productos', origen: '#189' },
  { sello: 'producto.atributos_editados', dominio: 'productos (MK-3b, PATCH de oferta)', origen: '#426 (EV-095)' },
  { sello: 'oportunidad.propuesta', dominio: 'oportunidades (Bloque 9)', origen: '#160 (EV-039)' },
  { sello: 'oportunidad.estado_cambiado', dominio: 'oportunidades', origen: '#160' },
  { sello: 'oportunidad.conexion_creada', dominio: 'oportunidades (vínculos actores)', origen: 'NCAP-R6-ext (#165) — fila saldada por C5 #412' },
  { sello: 'oportunidad.evidencia_validada', dominio: 'oportunidades (gate de evidencia)', origen: 'NCAP-R6-ext (#165, ADR-035) — fila saldada por C5 #412' },
  { sello: 'oportunidad.scoring_declarado', dominio: 'oportunidades (niveles cualitativos)', origen: 'NCAP-R6-ext (#165, ADR-035) — fila saldada por C5 #412' },
  { sello: 'ficha_valoracion.propuesta', dominio: 'fichas_valoracion', origen: '#196 (EV-038)' },
  { sello: 'ficha_valoracion.estado_cambiado', dominio: 'fichas_valoracion', origen: '#196 (EV-038)' },
  { sello: 'reporte.recibido', dominio: 'reportes', origen: 'CORE-005 R2 (#209, EV-052)' },
  { sello: 'reporte.corroborado', dominio: 'reportes', origen: 'CORE-005 R4 (#219, EV-055)' },
  { sello: 'reporte.estado_cambiado', dominio: 'reportes', origen: 'CORE-005 R3 (#211, EV-053)' },
  { sello: 'fuente.registrada', dominio: 'fuentes (seed)', origen: '#200 (EV-049)' },
  { sello: 'ingesta.creada', dominio: 'ingestas', origen: '#200' },
  { sello: 'ingesta.estado_cambiado', dominio: 'ingestas', origen: '#200' },
  { sello: 'comercio.ingestado', dominio: 'comercios (MK-1)', origen: '#248 → #300 (EV-070)' },
  { sello: 'comercio.estado_cambiado', dominio: 'comercios', origen: '#248 → #300' },
  { sello: 'comercio.titularidad_reclamada', dominio: 'comercios', origen: '#248 → #300' },
  { sello: 'comercio.titularidad_verificada', dominio: 'comercios', origen: '#248 → #300' },
  { sello: 'comercio.atributos_editados', dominio: 'comercios', origen: '#248 → #300' },
  { sello: 'comercio.habilitacion_actualizada', dominio: 'comercios (MK-2)', origen: '#254 → #302 (EV-073)' },
  { sello: 'comercio.titularidad_desistida', dominio: 'comercios (MK-2)', origen: '#254 → #302' },
  { sello: 'capa.registrada', dominio: 'capas (seed de vocabulario)', origen: 'NCAP-R1 #369 (EV-079) · VIG-010 #383 (EV-083)' },
  { sello: 'corredor.creado', dominio: 'corredores', origen: 'NCAP-R4 #365 (EV-077)' },
  { sello: 'mediador.registrado', dominio: 'mediadores (AMC)', origen: 'VIG-011 #385 (EV-084)' },
  { sello: 'pedido.presentado', dominio: 'pedidos', origen: 'VIG-012 #387 (EV-085)' },
  { sello: 'pedido.respondido', dominio: 'pedidos', origen: 'VIG-012 #387 (EV-085)' },
  { sello: 'cluster.creado', dominio: 'features (clusters AMC)', origen: 'VIG-011 #378 (EV-084) — fila saldada por AR4 #403' },
  { sello: 'residencia.declarada', dominio: 'usuarios (AR1)', origen: 'ARTEFACTOS-ROLES #400 (épica #399)' },
  { sello: 'visitante.registrado', dominio: 'usuarios (AR1)', origen: 'ARTEFACTOS-ROLES #400 (épica #399)' },
];

/** Parser local del sello (mismo patrón que los parsers A4). */
function parseSello(crudo: Record<string, unknown>): SelloPublico {
  const payload = crudo.payload;
  return {
    id: texto(crudo.id),
    type: texto(crudo.type),
    hash: texto(crudo.hash),
    occurred_at: texto(crudo.occurred_at),
    payload:
      payload !== null && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {},
  };
}

/**
 * Cobertura de la matriz v0.2 contra los types vistos en el libro contable
 * (GET /api/sellos/tipos). Hallazgo honesto (R15): los types SIN fila en la
 * matriz (p. ej. system.* o los test.*) se exponen, jamás se esconden.
 */
export interface CoberturaSellos {
  /** Sellos de la matriz con eventos ya emitidos. */
  documentados: Array<FilaMatrizSello & { count: number }>;
  /** Types vistos en events_raw SIN fila en la matriz — hallazgo honesto. */
  sinFilaEnMatriz: SelloTipoCount[];
  /** Sellos de la matriz sin eventos aún (count 0 o ausente). */
  sinEventosAun: FilaMatrizSello[];
}

export function coberturaSellos(tipos: readonly SelloTipoCount[]): CoberturaSellos {
  const counts = new Map(tipos.map((t) => [t.type, t.count]));
  const conFila = new Set(MATRIZ_SELLOS_V0_2.map((f) => f.sello));
  const documentados: CoberturaSellos['documentados'] = [];
  const sinEventosAun: FilaMatrizSello[] = [];
  const sinFilaEnMatriz: SelloTipoCount[] = [];
  for (const fila of MATRIZ_SELLOS_V0_2) {
    const count = counts.get(fila.sello);
    if (count !== undefined && count > 0) {
      documentados.push({ ...fila, count });
    } else {
      sinEventosAun.push(fila);
    }
  }
  for (const t of tipos) {
    if (!conFila.has(t.type)) {
      sinFilaEnMatriz.push(t);
    }
  }
  return { documentados, sinFilaEnMatriz, sinEventosAun };
}

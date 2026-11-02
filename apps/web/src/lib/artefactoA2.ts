/**
 * DELocalSoy.AR — Artefacto A2 (comerciante y titular verificado): matriz de
 * permisos v0.1, capacidades por sesión y cliente HTTP puro para las
 * superficies REALES del Mercado de Proximidad (ART-R4, #273, épica #268).
 *
 * Superficies contrastadas contra main @ 1da44723 (apps/api/src/routes/
 * comercios.ts + packages/contracts/src/comercios.ts):
 *   GET   /api/comercios              (público) solo aprobado+public; facetas
 *                                     ?rubro ?subnodo ?habilitacion ?nodo ?bbox; take 100
 *   POST  /api/comercios              (JWT) alta ciudadana: nace 'propuesto';
 *                                     idempotente P2002 → 200 {idempotente:true}
 *   GET   /api/comercios/:id          (público) propuesto|aprobado, jamás restricted;
 *                                     404 sin eco (ADR-036)
 *   POST  /api/comercios/:id/titular  (JWT) TRES flujos en una puerta:
 *                                     · reclamo ciudadano {metodo, identificador,
 *                                       declaracion_consentimiento:true} → 201
 *                                       (identificador persiste SOLO como hash, Ley 25.326)
 *                                     · desistir {accion:'desistir', declaracion_consentimiento:true}
 *                                       → 200 saneada {estado:'desistida'} (solo quien reclamó)
 *                                     · verificación moderador|admin (sin body) → 200 (409 si no reclamada)
 *   PATCH /api/comercios/:id          (JWT titular verificado) {atributos} → 200;
 *                                     403 sin eco (Ley 25.326)
 *   PATCH /api/comercios/:id/habilitacion (JWT titular verificado o moderador|admin)
 *                                     {habilitacion, justificacion >=10} → 200; 409 mismo estado
 *   GET   /api/comercios/:id/historial (público F-3) sellos comercio.* 1:1;
 *                                     identificador_hash JAMÁS en la salida (DH §7.2)
 *
 * HALLAZGOS honestos del contraste (declarados, no escondidos):
 *  1. «Titular verificado» NO es un rol de sesión: es un ESTADO de la ficha
 *     (sin_reclamo → reclamada → verificada, anclado al pseudónimo
 *     reclamado_por_hash). El panel NO puede saber del lado cliente quién es
 *     titular: la API es la compuerta (403 real, R15) — el panel ofrece la
 *     acción y declara el rechazo honesto, jamás lo simula.
 *  2. El rol «comerciante» de la tabla RBAC (techo 50 req/min) pertenece al
 *     canal live-ws; la sesión devuelve RolSchema {ciudadano, moderador,
 *     admin} (ADR-031). El «comerciante» del A2 es el titular verificado de
 *     la spec v0.1 — estado, no rol de login (nota de dominio MK-1).
 *  3. La respuesta 201 del reclamo incluye titularidad con reclamado_por_hash
 *     (pseudónimo del propio usuario); la del desistimiento viene saneada
 *     {estado:'desistida'} — el cliente NO expone hashes en sus tipos.
 *  4. El rechazo anti-PII responde 400 SIN campo success ({error:'payload
 *     rechazado…'}) — el cliente lo tipa como pii (ADR-020 cond. 1).
 *  5. PATCH /:id/estado (matriz COMERCIO_TRANSICIONES) es moderación (A3),
 *     NO vive en este artefacto; la verificación de titularidad sí (spec §3).
 *  6. La ficha 1:1 vive en comercio_ficha; consentimiento granular por campo
 *     vive en activos.consentimiento (VIG-002) y NO se duplica acá.
 *
 * Reglas vivas: R5 (errores tipados, jamás []) · R15 (sin simulación: el alta
 * nace propuesto, la moderación ES la validación; el identificador jamás
 * viaja en claro) · ADR-027/Ley 25.326 (consentimiento nunca pre-marcado;
 * solo hash) · ADR-035 (habilitación 'verificada' SOLO con evidencia
 * primaria completa) · ADR-038 (justificación pública >=10).
 *
 * Montaje único en ART-R5 (ArtefactosRoot): este módulo NO toca App.tsx ni
 * main.tsx (regla M0).
 */
import type { EstadoSesion, RolPlataforma, TransporteSesion } from './sesion';
import { RATE_LIMIT_POR_ROL, RATE_LIMIT_VISITANTE } from './sesion';
import {
  normalizarComercios,
  normalizarComercioDetalle,
  normalizarComercioHistorial,
  type ComercioDetalle,
  type ComercioHistorialEntrada,
  type ComercioItem,
  type ComerciosQuery,
} from './comercios';

// Re-export de tipos compartidos: los paneles A2 consumen UNA sola fuente web
// de contratos (los normalizadores públicos del directorio MK-1 ya viven en
// lib/comercios.ts — no se duplican, lección #161).
export type { ComercioDetalle, ComercioHistorialEntrada, ComercioItem, ComerciosQuery } from './comercios';

/* ------------------------------------------------------------------ */
/* Componentes del artefacto (serie docs/artefactos/ v0.1, PR #267)    */
/* ------------------------------------------------------------------ */

export type ComponenteA2Id =
  | 'directorio_publico'
  | 'alta_comercio'
  | 'ficha_comercio'
  | 'titularidad_reclamo'
  | 'titularidad_verificacion'
  | 'edicion_atributos'
  | 'habilitacion_siic'
  | 'ofertas_productos'
  | 'historial_confianza'
  | 'marketplace';

export type EstadoComponente = 'en_main' | 'en_rama' | 'propuesto';

export interface ComponenteA2 {
  id: ComponenteA2Id;
  titulo: string;
  resumen: string;
  /** Estado honesto contrastado en vivo (R15). */
  estado: EstadoComponente;
  traza: string;
}

export const COMPONENTES_A2: readonly ComponenteA2[] = [
  {
    id: 'directorio_publico',
    titulo: 'Directorio público (ComercioCard con sello)',
    resumen:
      'GET /api/comercios: SOLO aprobado y público (moderación primero; ADR-036); sello = estado epistémico verified, community_validated, pending, synthetic_demo — la acreditación (procedencia) es distinta del estado epistémico del dato.',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-1 (EV-070)',
  },
  {
    id: 'alta_comercio',
    titulo: 'Alta de comercio (testimonio ciudadano)',
    resumen:
      'POST /api/comercios (JWT): el comercio ES un activo (local, prestador) + ficha 1:1 en transacción atómica; nace propuesto (R15); idempotente por hash de autor+tipo+título+nodo (P2002 → 200); anti-PII sobre el texto (ADR-020 cond. 1).',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-1 (EV-070)',
  },
  {
    id: 'ficha_comercio',
    titulo: 'Ficha de comercio',
    resumen:
      'GET /api/comercios/:id (público): rubro por CÓDIGO con label honesto (null = sin dato), habilitación epistémica, titularidad pública {estado} sin hashes, productos aprobados; 404 sin eco para restricted, rechazado, archivado (ADR-036).',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-1/MK-2 (EV-070, EV-073)',
  },
  {
    id: 'titularidad_reclamo',
    titulo: 'Reclamo de titularidad',
    resumen:
      'POST /:id/titular {metodo: expediente|cuit, identificador, declaracion_consentimiento:true}: el identificador persiste SOLO como hash (Ley 25.326) — ni el propio titular lo vuelve a ver en claro; desistimiento del propio reclamante con respuesta saneada.',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-1/MK-2 (EV-070, EV-073)',
  },
  {
    id: 'titularidad_verificacion',
    titulo: 'Verificación de titularidad (moderación)',
    resumen:
      'POST /:id/titular con rol moderador|admin: reclamada → verificada (habilita la edición del titular); sello comercio.titularidad_verificada con verificado_por_hash.',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-2 (EV-073)',
  },
  {
    id: 'edicion_atributos',
    titulo: 'Edición de atributos (solo titular verificado)',
    resumen:
      'PATCH /:id {atributos}: venta_directa, delivery, pagos, accesibilidad, feria_espacio_publico; 403 sin eco para quien no es el titular verificado (Ley 25.326) — la API es la compuerta, no el panel.',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-1 (EV-070)',
  },
  {
    id: 'habilitacion_siic',
    titulo: 'Habilitación comercial (Ley 104-A / SIIC)',
    resumen:
      'PATCH /:id/habilitacion (titular verificado con evidencia o moderador|admin): estados epistémicos verificada, en_tramite, silencio_positivo, unknown, sin_dato; verificada SOLO con evidencia primaria completa (ADR-035); justificación pública >=10 (ADR-038); silencio positivo = ley 02-07-2026.',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-2 (EV-073)',
  },
  {
    id: 'ofertas_productos',
    titulo: 'Ofertas y productos',
    resumen:
      'Reutiliza productos 1:N de VIG-005 — JAMÁS una tabla paralela; la ficha GET /:id ya trae los productos aprobados con count; la escritura vive en la superficie VIG-005 (A1), no se duplica.',
    estado: 'en_main',
    traza: 'VIG-005 (EV-045)',
  },
  {
    id: 'historial_confianza',
    titulo: 'Historial de confianza (F-3)',
    resumen:
      'GET /:id/historial: bitácora derivada 1:1 de los sellos comercio.* en events_raw (ADR-032, append-only — jamás tabla mutable); identificador_hash y reclamado_por_hash JAMÁS viajan (DH §7.2).',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-2 (EV-073)',
  },
  {
    id: 'marketplace',
    titulo: 'Marketplace',
    resumen:
      'Deliberadamente en Fase 2 (roadmap §5.6, mes 12–24): sin pagos, sin promesas — v1 no simula transacción alguna (MK-5 con ADR propio Ley 24.240).',
    estado: 'propuesto',
    traza: 'diseño v0.1 — fase 2 deliberada',
  },
];

/* ------------------------------------------------------------------ */
/* Matriz de permisos declarada (docs v0.1 §3) vs permiso EFECTIVO     */
/* ------------------------------------------------------------------ */

export type PermisoA2 = 'leer' | 'escribir' | 'moderar' | null;

export interface ColumnasPermisoA2 {
  visitante: PermisoA2;
  /** Ciudadano con sesión JWT (el alta pública solo crea ciudadano, ADR-031). */
  ciudadano: PermisoA2;
  /**
   * Columna del TITULAR VERIFICADO — estado de la ficha, NO rol de sesión
   * (hallazgo 1): el permiso efectivo lo decide la API en cada PATCH (403
   * real). Se declara, no se deriva de la sesión.
   */
  titular_verificado: PermisoA2;
  moderacion: PermisoA2;
}

export const MATRIZ_PERMISOS_A2: Record<ComponenteA2Id, ColumnasPermisoA2> = {
  directorio_publico: { visitante: 'leer', ciudadano: 'leer', titular_verificado: 'leer', moderacion: 'leer' },
  alta_comercio: { visitante: null, ciudadano: 'escribir', titular_verificado: 'escribir', moderacion: 'escribir' },
  ficha_comercio: { visitante: 'leer', ciudadano: 'leer', titular_verificado: 'leer', moderacion: 'leer' },
  titularidad_reclamo: { visitante: null, ciudadano: 'escribir', titular_verificado: null, moderacion: null },
  titularidad_verificacion: { visitante: null, ciudadano: null, titular_verificado: null, moderacion: 'moderar' },
  edicion_atributos: { visitante: null, ciudadano: null, titular_verificado: 'escribir', moderacion: 'moderar' },
  habilitacion_siic: { visitante: null, ciudadano: null, titular_verificado: 'escribir', moderacion: 'moderar' },
  ofertas_productos: { visitante: 'leer', ciudadano: 'escribir', titular_verificado: 'escribir', moderacion: 'moderar' },
  historial_confianza: { visitante: 'leer', ciudadano: 'leer', titular_verificado: 'leer', moderacion: 'leer' },
  marketplace: { visitante: null, ciudadano: null, titular_verificado: null, moderacion: null },
};

/* ------------------------------------------------------------------ */
/* Capacidades por sesión (gates efectivos contra la API real)         */
/* ------------------------------------------------------------------ */

/** Rol observable: la API devuelve RolSchema {ciudadano, moderador, admin}. */
export type RolObservable = RolPlataforma | 'admin';

export interface CapacidadesA2 {
  esVisitante: boolean;
  /** Modo synthetic: demo SINTÉTICO declarada — la escritura no se acredita (R15). */
  esDemo: boolean;
  rol: RolObservable | null;
  techoReqsMin: number;
  /** Escritura ciudadana (alta, reclamo): exige sesión JWT real. */
  puedeEscribir: boolean;
  /** Verificación de titularidad y habilitación por moderación: moderador|admin. */
  puedeModerar: boolean;
}

const ES_MODERADOR: ReadonlyArray<RolObservable> = ['moderador', 'admin', 'admin_nodo', 'admin_hitub'];

export function capacidadesA2(estado: EstadoSesion): CapacidadesA2 {
  if (estado.tipo === 'demo_sintetico') {
    return {
      esVisitante: true,
      esDemo: true,
      rol: null,
      techoReqsMin: RATE_LIMIT_VISITANTE,
      puedeEscribir: false,
      puedeModerar: false,
    };
  }
  if (estado.tipo === 'sesion') {
    // Hallazgo 2 (mismo normalizado del A3): la API devuelve rol 'admin'
    // (RolSchema ADR-031), que NO es miembro del RolPlataforma de sesion.ts —
    // se normaliza acá: 'admin' es moderación plena. El rol 'comerciante' de
    // la tabla RBAC pertenece a live-ws: la titularidad es estado de ficha.
    const rol = estado.usuario.rol as RolObservable;
    const techo =
      rol === 'admin' ? 500 : (RATE_LIMIT_POR_ROL[rol as RolPlataforma] ?? RATE_LIMIT_VISITANTE);
    return {
      esVisitante: false,
      esDemo: false,
      rol,
      techoReqsMin: techo,
      puedeEscribir: true,
      puedeModerar: ES_MODERADOR.includes(rol),
    };
  }
  return {
    esVisitante: true,
    esDemo: false,
    rol: null,
    techoReqsMin: RATE_LIMIT_VISITANTE,
    puedeEscribir: false,
    puedeModerar: false,
  };
}

/**
 * Permiso visible en la matriz declarada para el rol actual. La columna
 * «titular verificado» NO se deriva de la sesión (hallazgo 1): se muestra la
 * del ciudadano; el permiso EFECTIVO del titular lo exige la API en cada
 * PATCH (403 real, no simulado).
 */
export function permisoVisibleA2(componente: ComponenteA2Id, caps: CapacidadesA2): PermisoA2 {
  const fila = MATRIZ_PERMISOS_A2[componente];
  if (caps.esVisitante) {
    return fila.visitante;
  }
  const rol = caps.rol;
  if (rol === 'moderador' || rol === 'admin' || rol === 'admin_nodo' || rol === 'admin_hitub') {
    return fila.moderacion;
  }
  return fila.ciudadano;
}

/* ------------------------------------------------------------------ */
/* Dominio del comercio (espejo EXACTO de @delocalsoy/contracts)       */
/* ------------------------------------------------------------------ */

export const NODOS_COMERCIO: ReadonlyArray<'capital' | 'caucete' | 'iglesia'> = [
  'capital',
  'caucete',
  'iglesia',
];
export const TIPOS_COMERCIO: ReadonlyArray<'local' | 'prestador'> = ['local', 'prestador'];
export const METODOS_TITULARIDAD: ReadonlyArray<'expediente' | 'cuit'> = ['expediente', 'cuit'];
export const PAGOS_COMERCIO: ReadonlyArray<'efectivo' | 'qr' | 'debito' | 'credito'> = [
  'efectivo',
  'qr',
  'debito',
  'credito',
];
export const ACCESIBILIDAD_COMERCIO: ReadonlyArray<'verificada' | 'declarada' | 'unknown'> = [
  'verificada',
  'declarada',
  'unknown',
];
export const ESTADOS_HABILITACION_COMERCIO: ReadonlyArray<
  'verificada' | 'en_tramite' | 'silencio_positivo' | 'unknown' | 'sin_dato'
> = ['verificada', 'en_tramite', 'silencio_positivo', 'unknown', 'sin_dato'];
export const TIPOS_HABILITACION_COMERCIO: ReadonlyArray<'municipal' | 'provincial_104a'> = [
  'municipal',
  'provincial_104a',
];

export type NodoKeyComercio = 'capital' | 'caucete' | 'iglesia';
export type TipoComercio = 'local' | 'prestador';
export type MetodoTitularidad = 'expediente' | 'cuit';
export type MedioPago = 'efectivo' | 'qr' | 'debito' | 'credito';
export type AccesibilidadComercio = 'verificada' | 'declarada' | 'unknown';
export type EstadoHabilitacionComercio =
  | 'verificada'
  | 'en_tramite'
  | 'silencio_positivo'
  | 'unknown'
  | 'sin_dato';
export type TipoHabilitacionComercio = 'municipal' | 'provincial_104a';

export interface HabilitacionComercio {
  estado: EstadoHabilitacionComercio;
  tipo?: TipoHabilitacionComercio;
  numero?: string;
  fuente_key?: string;
  url?: string;
  fecha_verificacion?: string;
  fecha_presentacion?: string;
}

export interface AtributosComercio {
  venta_directa: boolean;
  delivery: boolean;
  pagos: MedioPago[];
  accesibilidad: AccesibilidadComercio;
  feria_espacio_publico?: string;
}

export interface NuevaAltaComercio {
  nodo_key: NodoKeyComercio;
  subnodo_key?: string;
  titulo: string;
  descripcion?: string;
  rubro_id: string;
  tipo: TipoComercio;
  lat?: number;
  lng?: number;
  atributos?: AtributosComercio;
  habilitacion?: HabilitacionComercio;
}

export interface ReclamoTitularidad {
  metodo: MetodoTitularidad;
  identificador: string;
  declaracion_consentimiento: true;
}

/** Respuesta de la puerta de titularidad: SIN hashes en los tipos (hallazgo 3). */
export interface TitularidadRespuesta {
  activo_id: string;
  estado: string;
  metodo: string | null;
}

/* ------------------------------------------------------------------ */
/* Errores honestos (R5: jamás [])                                     */
/* ------------------------------------------------------------------ */

export type CodigoErrorA2 =
  | 'credenciales'
  | 'permiso'
  | 'datos'
  | 'pii'
  | 'ya_estado'
  | 'no_encontrado'
  | 'no_disponible';

export class ErrorA2 extends Error {
  codigo: CodigoErrorA2;
  constructor(codigo: CodigoErrorA2, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorA2';
    this.codigo = codigo;
  }
}

/* ------------------------------------------------------------------ */
/* Validadores de pre-check (la API sigue siendo la compuerta real)    */
/* ------------------------------------------------------------------ */

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_RUBRO = /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)?$/;
const REGEX_CODIGO = /^[a-z0-9_]+$/;

/** ADR-038: la justificación pública es OBLIGATORIA (>=10 chars). */
export function validarJustificacion(justificacion: string): string | null {
  const limpia = justificacion.trim();
  if (limpia.length < 10) {
    return 'ADR-038: el cambio exige justificación pública (mínimo 10 caracteres)';
  }
  return null;
}

/**
 * ADR-035 espejo: 'verificada' SOLO con evidencia primaria completa
 * (tipo, numero, fuente_key, url, fecha_verificacion); 'silencio_positivo'
 * exige fecha_presentacion (ley 02-07-2026, 30 días hábiles).
 */
export function validarHabilitacionComercio(h: HabilitacionComercio): string | null {
  if (!ESTADOS_HABILITACION_COMERCIO.includes(h.estado)) {
    return "estado de habilitación inválido: '" + h.estado + "'";
  }
  if (h.tipo !== undefined && !TIPOS_HABILITACION_COMERCIO.includes(h.tipo)) {
    return "tipo de habilitación inválido: '" + h.tipo + "' (municipal|provincial_104a)";
  }
  if (h.numero !== undefined && h.numero.length > 60) {
    return 'el número de habilitación admite hasta 60 caracteres';
  }
  if (h.fuente_key !== undefined && !REGEX_CODIGO.test(h.fuente_key)) {
    return 'fuente_key: solo códigos [a-z0-9_] (join a fuentes.key)';
  }
  if (h.url !== undefined) {
    try {
      void new URL(h.url);
    } catch {
      return 'url: debe ser una URL válida (evidencia primaria)';
    }
  }
  if (h.fecha_verificacion !== undefined && !REGEX_FECHA.test(h.fecha_verificacion)) {
    return 'fecha_verificacion: formato YYYY-MM-DD';
  }
  if (h.fecha_presentacion !== undefined && !REGEX_FECHA.test(h.fecha_presentacion)) {
    return 'fecha_presentacion: formato YYYY-MM-DD';
  }
  if (h.estado === 'verificada') {
    for (const campo of ['tipo', 'numero', 'fuente_key', 'url', 'fecha_verificacion'] as const) {
      if (h[campo] === undefined || h[campo] === '') {
        return 'ADR-035: habilitación verificada exige evidencia primaria completa (' + campo + ' faltante)';
      }
    }
  }
  if (h.estado === 'silencio_positivo' && (h.fecha_presentacion === undefined || h.fecha_presentacion === '')) {
    return 'silencio_positivo exige fecha_presentacion (ley 02-07-2026)';
  }
  return null;
}

/** Atributos espejo (ComercioAtributosSchema, .strict()): nada fuera de forma. */
export function validarAtributosComercio(a: AtributosComercio): string | null {
  if (typeof a.venta_directa !== 'boolean' || typeof a.delivery !== 'boolean') {
    return 'venta_directa y delivery son booleanos';
  }
  if (!Array.isArray(a.pagos)) {
    return 'pagos: lista de medios (efectivo, qr, debito, credito)';
  }
  for (const p of a.pagos) {
    if (!PAGOS_COMERCIO.includes(p)) {
      return "medio de pago inválido: '" + p + "'";
    }
  }
  if (!ACCESIBILIDAD_COMERCIO.includes(a.accesibilidad)) {
    return "accesibilidad inválida: '" + a.accesibilidad + "' (verificada|declarada|unknown)";
  }
  if (a.feria_espacio_publico !== undefined && !REGEX_CODIGO.test(a.feria_espacio_publico)) {
    return 'feria_espacio_publico: código de feature [a-z0-9_] (capa public_space)';
  }
  return null;
}

/** Pre-check del alta (ComercioAltaSchema espejo; la API decide igual). */
export function validarAltaComercio(n: NuevaAltaComercio): string | null {
  if (!NODOS_COMERCIO.includes(n.nodo_key)) {
    return "nodo inválido: '" + n.nodo_key + "' (capital|caucete|iglesia)";
  }
  const titulo = n.titulo.trim();
  if (titulo.length < 3 || titulo.length > 120) {
    return 'el título admite entre 3 y 120 caracteres';
  }
  if (n.descripcion !== undefined && n.descripcion.length > 2000) {
    return 'la descripción admite hasta 2000 caracteres';
  }
  if (!REGEX_RUBRO.test(n.rubro_id)) {
    return 'rubro_id: código del canon (food_drink) o legado (cat-*)';
  }
  if (!TIPOS_COMERCIO.includes(n.tipo)) {
    return "tipo inválido: '" + n.tipo + "' (local|prestador)";
  }
  if (n.subnodo_key !== undefined && !REGEX_CODIGO.test(n.subnodo_key)) {
    return 'subnodo_key: código [a-z0-9_] — debe existir y pertenecer al nodo declarado';
  }
  if (n.lat !== undefined && (typeof n.lat !== 'number' || n.lat < -90 || n.lat > 90)) {
    return 'lat: número entre -90 y 90 (R15: punto propio solo con fuente)';
  }
  if (n.lng !== undefined && (typeof n.lng !== 'number' || n.lng < -180 || n.lng > 180)) {
    return 'lng: número entre -180 y 180';
  }
  if (n.atributos !== undefined) {
    const err = validarAtributosComercio(n.atributos);
    if (err !== null) {
      return err;
    }
  }
  if (n.habilitacion !== undefined) {
    const err = validarHabilitacionComercio(n.habilitacion);
    if (err !== null) {
      return err;
    }
  }
  return null;
}

/**
 * Reclamo espejo: identificador 4–60 (se persiste SOLO como hash);
 * consentimiento EXPLÍCITO — jamás pre-marcado (ADR-027, Ley 25.326).
 */
export function validarReclamoTitularidad(
  metodo: MetodoTitularidad,
  identificador: string,
  consentimiento: boolean
): string | null {
  if (!METODOS_TITULARIDAD.includes(metodo)) {
    return "método inválido: '" + metodo + "' (expediente|cuit)";
  }
  const id = identificador.trim();
  if (id.length < 4 || id.length > 60) {
    return 'el identificador (expediente o CUIT) admite entre 4 y 60 caracteres';
  }
  if (consentimiento !== true) {
    return 'la declaración de consentimiento es explícita y obligatoria — nunca pre-marcada (ADR-027)';
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Cliente puro                                                       */
/* ------------------------------------------------------------------ */

export interface ClienteA2 {
  // Directorio público (solo aprobado+public, ADR-036)
  directorio(filtros?: ComerciosQuery): Promise<ComercioItem[]>;
  // Ficha + productos aprobados + operativa (404 sin eco fuera del público)
  ficha(id: string): Promise<ComercioDetalle>;
  // Historial F-3 (sellos comercio.*, sin identificador_hash JAMÁS)
  historial(id: string): Promise<ComercioHistorialEntrada[]>;
  // Alta ciudadana (JWT): nace propuesto; 200 = idempotente (P2002)
  alta(nueva: NuevaAltaComercio): Promise<{ ficha: ComercioItem; idempotente: boolean }>;
  // Reclamo de titularidad (JWT): identificador SOLO como hash (Ley 25.326)
  reclamar(id: string, reclamo: ReclamoTitularidad): Promise<TitularidadRespuesta>;
  // Desistimiento del propio reclamante (JWT): respuesta saneada
  desistir(id: string): Promise<TitularidadRespuesta>;
  // Verificación de moderación (JWT moderador|admin): reclamada → verificada
  verificarTitularidad(id: string): Promise<TitularidadRespuesta>;
  // Edición de atributos (JWT titular verificado; 403 real para el resto)
  editarAtributos(id: string, atributos: AtributosComercio): Promise<AtributosComercio>;
  // Habilitación SIIC (JWT titular verificado con evidencia o moderador|admin)
  cambiarHabilitacion(
    id: string,
    habilitacion: HabilitacionComercio,
    justificacion: string
  ): Promise<HabilitacionComercio>;
}

export interface OpcionesClienteA2 {
  transporte: TransporteSesion;
  token: () => string | null;
  base?: string;
}

interface Envelope {
  success?: boolean;
  data?: unknown;
  error?: unknown;
  idempotente?: boolean;
}

function texto(crudo: unknown): string {
  return typeof crudo === 'string' ? crudo : '';
}

function textoOnulo(crudo: unknown): string | null {
  return typeof crudo === 'string' ? crudo : null;
}

function query(params: Record<string, string | undefined>): string {
  const pares = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (pares.length === 0) {
    return '';
  }
  return '?' + pares.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v as string)).join('&');
}

/** Respuesta de la puerta de titularidad: SIN hashes en la salida (hallazgo 3). */
function parseTitularidadRespuesta(crudo: Record<string, unknown>): TitularidadRespuesta {
  const titularidad = (crudo.titularidad ?? {}) as Record<string, unknown>;
  return {
    activo_id: texto(crudo.activo_id),
    estado: texto(titularidad.estado),
    metodo: textoOnulo(titularidad.metodo),
  };
}

export function crearClienteA2(opts: OpcionesClienteA2): ClienteA2 {
  const base: string = opts.base ?? '/api/comercios';

  const llamar = async (
    ruta: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ) => {
    try {
      return await opts.transporte(ruta, init);
    } catch {
      throw new ErrorA2('no_disponible', 'no se pudo contactar la plataforma');
    }
  };

  const leerJson = async (res: { json(): Promise<unknown> }): Promise<Envelope> => {
    try {
      const cuerpo = (await res.json()) as Envelope;
      if (!cuerpo || typeof cuerpo !== 'object') {
        throw new Error('malformado');
      }
      return cuerpo;
    } catch {
      throw new ErrorA2('no_disponible', 'respuesta malformada de la plataforma');
    }
  };

  const headersToken = (): Record<string, string> => {
    const token = opts.token();
    if (!token) {
      throw new ErrorA2('credenciales', 'se requiere sesión iniciada para esta acción');
    }
    return { Authorization: 'Bearer ' + token };
  };

  /** Lectura pública: 200 -> data · 404/400/otro -> error tipado (R5). */
  const lectura = async (ruta: string): Promise<unknown> => {
    const res = await llamar(ruta);
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      if (cuerpo.data === undefined) {
        throw new ErrorA2('no_disponible', 'respuesta malformada (HTTP 200 sin data)');
      }
      return cuerpo.data;
    }
    const mensaje = texto(cuerpo.error);
    if (res.status === 404) {
      // ADR-036: 404 SIN eco — no se revela si existe ni por qué.
      throw new ErrorA2('no_encontrado', mensaje || 'comercio no encontrado');
    }
    if (res.status === 400) {
      throw new ErrorA2('datos', mensaje || 'datos inválidos');
    }
    if (res.status === 429) {
      throw new ErrorA2('no_disponible', 'demasiados intentos — esperá un momento (techo por rol)');
    }
    throw new ErrorA2('no_disponible', mensaje || 'HTTP ' + res.status);
  };

  /**
   * Mapeo honesto de la escritura (POST/PATCH): success esperado según la
   * puerta · 400 zod/PII · 401 sin sesión · 403 rol/titular insuficiente ·
   * 404 · 409 estado ya alcanzado · resto.
   */
  const escribir = async (
    ruta: string,
    method: 'POST' | 'PATCH',
    body: unknown,
    exitos: ReadonlyArray<number>
  ): Promise<{ status: number; cuerpo: Envelope }> => {
    const res = await llamar(ruta, {
      method,
      headers: { 'Content-Type': 'application/json', ...headersToken() },
      body: JSON.stringify(body),
    });
    const cuerpo = await leerJson(res);
    if (exitos.includes(res.status)) {
      if (!cuerpo.data || typeof cuerpo.data !== 'object') {
        throw new ErrorA2('no_disponible', 'respuesta malformada de la escritura');
      }
      return { status: res.status, cuerpo };
    }
    const mensaje = texto(cuerpo.error);
    if (res.status === 400) {
      // Hallazgo 4: el anti-PII responde SIN success — se tipa por el patrón.
      if (mensaje.includes('datos personales identificables')) {
        throw new ErrorA2('pii', mensaje);
      }
      throw new ErrorA2('datos', mensaje || 'datos inválidos');
    }
    if (res.status === 401) {
      throw new ErrorA2('credenciales', 'sesión no válida — iniciá sesión de nuevo');
    }
    if (res.status === 403) {
      throw new ErrorA2('permiso', mensaje || 'el rol o la titularidad no habilitan esta acción (API: 403 real)');
    }
    if (res.status === 404) {
      throw new ErrorA2('no_encontrado', mensaje || 'comercio no encontrado');
    }
    if (res.status === 409) {
      throw new ErrorA2('ya_estado', mensaje || 'el estado ya está alcanzado');
    }
    if (res.status === 429) {
      throw new ErrorA2('no_disponible', 'demasiados intentos — esperá un momento (techo por rol)');
    }
    throw new ErrorA2('no_disponible', mensaje || 'HTTP ' + res.status);
  };

  const directorio = async (filtros?: ComerciosQuery): Promise<ComercioItem[]> => {
    const data = await lectura(base + query({ ...(filtros ?? {}) }));
    return normalizarComercios(data);
  };

  const ficha = async (id: string): Promise<ComercioDetalle> => {
    const data = await lectura(base + '/' + encodeURIComponent(id));
    // normalizarComercioDetalle espera el envelope ({data: ...}): la lectura
    // ya desenvolvió, se re-envuelve — la forma pública es la misma.
    return normalizarComercioDetalle({ data });
  };

  const historial = async (id: string): Promise<ComercioHistorialEntrada[]> => {
    const data = await lectura(base + '/' + encodeURIComponent(id) + '/historial');
    return normalizarComercioHistorial(data);
  };

  const alta = async (nueva: NuevaAltaComercio): Promise<{ ficha: ComercioItem; idempotente: boolean }> => {
    // Solo las claves presentes viajan (Zod rechaza null explícito).
    const cuerpoBody: Record<string, unknown> = {
      nodo_key: nueva.nodo_key,
      titulo: nueva.titulo.trim(),
      rubro_id: nueva.rubro_id,
      tipo: nueva.tipo,
    };
    if (nueva.subnodo_key !== undefined && nueva.subnodo_key !== '') {
      cuerpoBody.subnodo_key = nueva.subnodo_key;
    }
    if (nueva.descripcion !== undefined && nueva.descripcion.trim() !== '') {
      cuerpoBody.descripcion = nueva.descripcion.trim();
    }
    if (nueva.lat !== undefined) {
      cuerpoBody.lat = nueva.lat;
    }
    if (nueva.lng !== undefined) {
      cuerpoBody.lng = nueva.lng;
    }
    cuerpoBody.atributos =
      nueva.atributos ?? { venta_directa: false, delivery: false, pagos: [], accesibilidad: 'unknown' };
    cuerpoBody.habilitacion = nueva.habilitacion ?? { estado: 'sin_dato' };
    const { status, cuerpo } = await escribir(base, 'POST', cuerpoBody, [200, 201]);
    const data = cuerpo.data as Record<string, unknown>;
    const fichaCruda = (data.ficha ?? data) as Record<string, unknown>;
    const fichaParseada = normalizarComercios({ data: [fichaCruda] })[0];
    if (fichaParseada === undefined) {
      throw new ErrorA2('no_disponible', 'respuesta malformada del alta (ficha no normalizable)');
    }
    return { ficha: fichaParseada, idempotente: status === 200 || cuerpo.idempotente === true };
  };

  const reclamar = async (id: string, reclamo: ReclamoTitularidad): Promise<TitularidadRespuesta> => {
    const { cuerpo } = await escribir(
      base + '/' + encodeURIComponent(id) + '/titular',
      'POST',
      {
        metodo: reclamo.metodo,
        identificador: reclamo.identificador.trim(),
        declaracion_consentimiento: true, // nunca pre-marcado (ADR-027)
      },
      [201]
    );
    return parseTitularidadRespuesta(cuerpo.data as Record<string, unknown>);
  };

  const desistir = async (id: string): Promise<TitularidadRespuesta> => {
    const { cuerpo } = await escribir(
      base + '/' + encodeURIComponent(id) + '/titular',
      'POST',
      { accion: 'desistir', declaracion_consentimiento: true },
      [200]
    );
    return parseTitularidadRespuesta(cuerpo.data as Record<string, unknown>);
  };

  const verificarTitularidad = async (id: string): Promise<TitularidadRespuesta> => {
    // La verificación de moderación NO lleva cuerpo: la puerta distingue el
    // flujo por el rol del JWT (moderador|admin verifica; el resto reclama).
    const { cuerpo } = await escribir(
      base + '/' + encodeURIComponent(id) + '/titular',
      'POST',
      {},
      [200]
    );
    return parseTitularidadRespuesta(cuerpo.data as Record<string, unknown>);
  };

  const editarAtributos = async (id: string, atributos: AtributosComercio): Promise<AtributosComercio> => {
    const { cuerpo } = await escribir(
      base + '/' + encodeURIComponent(id),
      'PATCH',
      { atributos },
      [200]
    );
    const data = cuerpo.data as Record<string, unknown>;
    const devueltos = (data.atributos ?? {}) as Record<string, unknown>;
    return {
      venta_directa: devueltos.venta_directa === true,
      delivery: devueltos.delivery === true,
      pagos: Array.isArray(devueltos.pagos)
        ? (devueltos.pagos as unknown[]).map((p) => texto(p)).filter((p) => (PAGOS_COMERCIO as readonly string[]).includes(p)) as MedioPago[]
        : [],
      accesibilidad: texto(devueltos.accesibilidad) as AccesibilidadComercio,
      feria_espacio_publico: textoOnulo(devueltos.feria_espacio_publico) ?? undefined,
    };
  };

  const cambiarHabilitacion = async (
    id: string,
    habilitacion: HabilitacionComercio,
    justificacion: string
  ): Promise<HabilitacionComercio> => {
    const cuerpoBody: Record<string, unknown> = {
      habilitacion,
      justificacion: justificacion.trim(), // ADR-038: pública, >=10, anti-PII
    };
    const { cuerpo } = await escribir(
      base + '/' + encodeURIComponent(id) + '/habilitacion',
      'PATCH',
      cuerpoBody,
      [200]
    );
    const data = cuerpo.data as Record<string, unknown>;
    const h = (data.habilitacion ?? {}) as Record<string, unknown>;
    const devuelta: HabilitacionComercio = {
      estado: texto(h.estado) as EstadoHabilitacionComercio,
    };
    const tipo = textoOnulo(h.tipo);
    if (tipo !== null) devuelta.tipo = tipo as TipoHabilitacionComercio;
    const numero = textoOnulo(h.numero);
    if (numero !== null) devuelta.numero = numero;
    const fuenteKey = textoOnulo(h.fuente_key);
    if (fuenteKey !== null) devuelta.fuente_key = fuenteKey;
    const url = textoOnulo(h.url);
    if (url !== null) devuelta.url = url;
    const fechaVerificacion = textoOnulo(h.fecha_verificacion);
    if (fechaVerificacion !== null) devuelta.fecha_verificacion = fechaVerificacion;
    const fechaPresentacion = textoOnulo(h.fecha_presentacion);
    if (fechaPresentacion !== null) devuelta.fecha_presentacion = fechaPresentacion;
    return devuelta;
  };

  return {
    directorio,
    ficha,
    historial,
    alta,
    reclamar,
    desistir,
    verificarTitularidad,
    editarAtributos,
    cambiarHabilitacion,
  };
}

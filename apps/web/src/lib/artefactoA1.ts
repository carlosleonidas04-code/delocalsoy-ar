/**
 * DELocalSoy.AR — Artefacto A1 (vecino, ciudadano y visitante): matriz de
 * permisos v0.1, capacidades por sesión y cliente HTTP puro para las
 * superficies REALES (ART-R1 cableado exhaustivo, #270, épica #268).
 *
 * Superficies contrastadas contra main @ 77500be (apps/api/src/routes +
 * packages/contracts/src/index.ts):
 *   POST /api/reportes                (JWT) 201 nace 'received' | 200 idempotente
 *   GET  /api/reportes/mios          (JWT) reportes propios + transiciones selladas
 *   GET  /api/reportes/:id/historial (público) ciclo del reporte (ADR-038)
 *   POST /api/fichas-valoracion      (JWT) 201 nace 'testimonio' anclada a public_space
 *   GET  /api/fichas-valoracion      (público) ?estado=&nodo= ('descartada' nunca)
 *   POST /api/oportunidades          (JWT) 201 nace 'detected' con evidencia OBLIGATORIA
 *   GET  /api/oportunidades[/:id]    (público) ?estado=&nodo=&tipo=&subnodo= (sin 'discarded')
 *   GET  /api/nodos/:key/{features,capas,subnodos,categorias,reportes,kpis} (público)
 *   POST /api/nodos/:key/ask          (público) Dato–Interpretación–Sugerencia SIN LLM
 *   GET  /api/activos/:id/productos   (público) propuesto|aprobado (restricted: 404 sin eco)
 *   GET  /api/operativa/:activoId      (público) horario/temporada/capacidad honesta
 *
 * Reglas vivas: R5 (ningún error HTTP se vuelve []; siempre ErrorA1) · R15
 * (sin simulación: testimonio/detected/received/propuesto; la moderación ES
 * la validación) · ADR-027/Ley 25.326 (el cliente jamás envía PII; el
 * consentimiento nunca viene pre-marcado) · ADR-035 (fuentes citables).
 */

import type { EstadoSesion, RolPlataforma, TransporteSesion } from './sesion';
import { RATE_LIMIT_POR_ROL, RATE_LIMIT_VISITANTE } from './sesion';

/* ------------------------------------------------------------------ */
/* Componentes del artefacto (serie docs/artefactos/ v0.1, PR #267)    */
/* ------------------------------------------------------------------ */

export type ComponenteA1Id =
  | 'mapa_territorio'
  | 'reporte_ciudadano'
  | 'ficha_valoracion'
  | 'banco_potencialidades'
  | 'observaciones_patrimoniales'
  | 'directorio_produccion'
  | 'comercios_lectura'
  | 'kpis_publicos'
  | 'asistente_territorial';

export type EstadoComponente = 'en_main' | 'en_rama' | 'propuesto';

export interface ComponenteA1 {
  id: ComponenteA1Id;
  titulo: string;
  estado: EstadoComponente;
  detalle: string;
}

/**
 * Estado honesto contrastado contra main @ 77500be y la cola de PRs abiertos.
 * El asistente territorial vive en main (POST /api/nodos/:key/ask, VIG-006)
 * pese a que la spec v0.1 lo marcaba propuesto — se declara 'en_main' por
 * realidad observada (R15); actualización de la serie docs propuesta a la DH.
 */
export const COMPONENTES_A1: readonly ComponenteA1[] = [
  { id: 'mapa_territorio', titulo: 'Mapa y territorio', estado: 'en_main', detalle: 'nodos, subnodos, capas y features con estado honesto (GET públicos, CORE-003)' },
  { id: 'reporte_ciudadano', titulo: 'Reporte ciudadano', estado: 'en_main', detalle: "POST nace 'received'; sugeridos por proximidad aún en rama (#219/#220)" },
  { id: 'ficha_valoracion', titulo: 'Ficha de valoración de espacio público', estado: 'en_main', detalle: '7 dimensiones ratificadas (#149), testimonio → corroborada | descartada (EV-038)' },
  { id: 'banco_potencialidades', titulo: 'Banco de Potencialidades (Bloque 9)', estado: 'en_main', detalle: 'oportunidades con evidencia obligatoria y consentimiento (#160, EV-039)' },
  { id: 'observaciones_patrimoniales', titulo: 'Observaciones patrimoniales', estado: 'en_rama', detalle: 'PR #253 (VIG-009) en cola — sin merge aún, sin cableado (R15)' },
  { id: 'directorio_produccion', titulo: 'Directorio y producción', estado: 'en_main', detalle: 'activos, productos y operativa (solo aprobado+public, VIG-002/005)' },
  { id: 'comercios_lectura', titulo: 'Comercios (lectura)', estado: 'en_rama', detalle: 'MK-1 #246–#250 en cola de merge — sin cableado (R15)' },
  { id: 'kpis_publicos', titulo: 'KPIs públicos', estado: 'en_main', detalle: 'set honesto v1, count 0 honesto (VIG-003, EV-043)' },
  { id: 'asistente_territorial', titulo: 'Asistente territorial', estado: 'en_main', detalle: 'POST /api/nodos/:key/ask — plantillas autorizadas sin LLM, human_review pending' },
];

/* ------------------------------------------------------------------ */
/* Matriz de permisos componente × rol (spec A1 v0.1 §3)               */
/* ------------------------------------------------------------------ */

export type PermisoA1 = 'leer' | 'escribir' | null;

export interface ColumnasPermiso {
  visitante: PermisoA1;
  ciudadano: PermisoA1;
  vecino: PermisoA1;
}

export const MATRIZ_PERMISOS_A1: Record<ComponenteA1Id, ColumnasPermiso> = {
  mapa_territorio: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
  reporte_ciudadano: { visitante: 'leer', ciudadano: 'escribir', vecino: 'escribir' },
  ficha_valoracion: { visitante: 'leer', ciudadano: 'escribir', vecino: 'escribir' },
  banco_potencialidades: { visitante: 'leer', ciudadano: 'escribir', vecino: 'escribir' },
  observaciones_patrimoniales: { visitante: 'leer', ciudadano: 'escribir', vecino: 'escribir' },
  directorio_produccion: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
  comercios_lectura: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
  kpis_publicos: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
  asistente_territorial: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
};

/* ------------------------------------------------------------------ */
/* Capacidades derivadas del estado de sesión                          */
/* ------------------------------------------------------------------ */

export interface CapacidadesA1 {
  esVisitante: boolean;
  /** Modo synthetic: demo SINTÉTICO declarada — las escrituras no se acreditan (R15). */
  esDemo: boolean;
  rol: RolPlataforma | null;
  techoReqsMin: number;
  /** La escritura ciudadana exige sesión JWT real (POST requiere requireJwt). */
  puedeEscribir: boolean;
  /** GET /api/reportes/mios exige sesión; el visitante no tiene 'míos'. */
  puedeVerMios: boolean;
}

export function capacidadesA1(estado: EstadoSesion): CapacidadesA1 {
  if (estado.tipo === 'demo_sintetico') {
    return { esVisitante: true, esDemo: true, rol: null, techoReqsMin: RATE_LIMIT_VISITANTE, puedeEscribir: false, puedeVerMios: false };
  }
  if (estado.tipo === 'sesion') {
    const rol = estado.usuario.rol;
    return { esVisitante: false, esDemo: false, rol, techoReqsMin: RATE_LIMIT_POR_ROL[rol] ?? RATE_LIMIT_VISITANTE, puedeEscribir: true, puedeVerMios: true };
  }
  return { esVisitante: true, esDemo: false, rol: null, techoReqsMin: RATE_LIMIT_VISITANTE, puedeEscribir: false, puedeVerMios: false };
}

/**
 * Permiso visible en la matriz para el rol actual. Los roles de plataforma
 * con sesión distintos de ciudadano/vecino leen la columna vecino: en v1 la
 * escritura A1 con sesión es la misma (requireJwt); la diferenciación por
 * competencias vive en A3/A4.
 */
export function permisoVisible(componente: ComponenteA1Id, caps: CapacidadesA1): PermisoA1 {
  const fila = MATRIZ_PERMISOS_A1[componente];
  if (!caps.puedeEscribir) {
    return fila.visitante;
  }
  return caps.rol === 'ciudadano' ? fila.ciudadano : fila.vecino;
}

/* ------------------------------------------------------------------ */
/* Errores honestos (R5: jamás [])                                     */
/* ------------------------------------------------------------------ */

export type CodigoErrorA1 =
  | 'credenciales'
  | 'datos'
  | 'categoria'
  | 'pii'
  | 'nodo'
  | 'no_encontrado'
  | 'no_disponible';

export class ErrorA1 extends Error {
  codigo: CodigoErrorA1;
  constructor(codigo: CodigoErrorA1, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorA1';
    this.codigo = codigo;
  }
}

/* ------------------------------------------------------------------ */
/* Tipos del dominio A1 (espejo EXACTO de @delocalsoy/contracts)       */
/* ------------------------------------------------------------------ */

export interface CategoriaNodo {
  id: string;
  code: string;
  label: string;
  layer: string;
}

export interface ReportePublico {
  id: string;
  categoria: string;
  descripcion: string;
  estado: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  is_synthetic: boolean;
}

export interface TransicionReporte {
  estado_anterior: string;
  estado_nuevo: string;
  justificacion: string;
  moderador_hash: string;
  occurred_at: string;
}

export interface ReporteMio extends ReportePublico {
  nodo_key: string | null;
  transiciones: TransicionReporte[];
}

/**
 * ReporteAltaSchema (contracts): lat/lng son NÚMEROS EXIGIDOS con rango
 * SRID=4326 — un reporte sin punto propio no es cartografiable (R2, #206).
 */
export interface NuevoReporte {
  nodo_key: string;
  categoria: string;
  descripcion: string;
  lat: number;
  lng: number;
}

export interface FeatureNodo {
  id: string;
  layer: string;
  domain: string;
  titulo: string;
  tipo: string;
  estado: string;
  fuente_label: string;
  observado_at: string | null;
  lat: number | null;
  lng: number | null;
  is_synthetic: boolean;
}

export interface CapaNodo {
  id: string;
  key: string;
  [extra: string]: unknown;
}

export interface SubnodoNodo {
  key: string;
  type: string;
  parent_key: string | null;
  boundary_status: string | null;
  [extra: string]: unknown;
}

/** 7 dimensiones ratificadas (#149) — FichaRespuestasV1Schema exacto. */
export interface FichaRespuestasV1 {
  usos_vitalidad: {
    usos_detectados: Array<'recreo' | 'deporte' | 'reunion' | 'descanso' | 'feria' | 'cultura' | 'transito'>;
    nivel_actividad: 'baja' | 'media' | 'alta';
    observaciones?: string;
  };
  accesibilidad: {
    rampa_acceso: 'si' | 'parcial' | 'no' | 'desconocido';
    estado_vereda: 'bueno' | 'regular' | 'malo' | 'desconocido';
    obstaculos: boolean;
  };
  sombra_arbolado: {
    arbolado_presente: boolean;
    sombra_horario_central: 'abundante' | 'parcial' | 'escasa' | 'nula' | 'desconocido';
    lectura_3_30_300?: string;
  };
  agua_xerojardin: {
    riego: 'si' | 'no' | 'desconocido';
    perdidas_visibles: boolean;
    especies_apto_clima: 'si' | 'no' | 'desconocido';
  };
  seguridad_disenio: {
    iluminacion: 'buena' | 'regular' | 'mala' | 'desconocido';
    visibilidad: 'buena' | 'regular' | 'mala' | 'desconocido';
    mantenimiento: 'bueno' | 'regular' | 'malo' | 'desconocido';
    destinos_activos_cercanos: boolean;
  };
  equipamiento: {
    bancos: boolean;
    juegos_infantiles: boolean;
    canchas: boolean;
    basureros: boolean;
    bebedero: boolean;
    otro?: string;
  };
  custodia: {
    custodia_presente: boolean;
    tipo_acuerdo: 'vecinal' | 'escolar' | 'club' | 'otro' | 'ninguno';
  };
  notas?: string;
}

export interface NuevaFicha {
  nodo_key: string;
  feature_id: string;
  version: 'v1';
  respuestas: FichaRespuestasV1;
}

export interface FichaPublica {
  id: string;
  nodo_key: string;
  feature_id: string;
  version: string;
  respuestas: Record<string, unknown>;
  estado: string;
  corroboracion: string | null;
  created_by_hash: string;
  created_at: string;
  updated_at: string;
  feature_titulo: string | null;
  feature_lat: number | null;
  feature_lng: number | null;
  feature_is_synthetic: boolean | null;
  feature_fuente_label: string | null;
  estado_publico: 'validado' | 'testimonio';
}

export type TipoOportunidad =
  | 'human_capacity'
  | 'productive_capacity'
  | 'physical_asset'
  | 'institutional_asset'
  | 'cultural_asset'
  | 'detected_demand'
  | 'market_gap'
  | 'partnership_opportunity'
  | 'investment_opportunity'
  | 'policy_opportunity';

export const TIPOS_OPORTUNIDAD: ReadonlyArray<{ valor: TipoOportunidad; etiqueta: string }> = [
  { valor: 'human_capacity', etiqueta: 'capacidad humana' },
  { valor: 'productive_capacity', etiqueta: 'capacidad productiva' },
  { valor: 'physical_asset', etiqueta: 'activo físico' },
  { valor: 'institutional_asset', etiqueta: 'activo institucional' },
  { valor: 'cultural_asset', etiqueta: 'activo cultural' },
  { valor: 'detected_demand', etiqueta: 'demanda detectada' },
  { valor: 'market_gap', etiqueta: 'vacío de mercado' },
  { valor: 'partnership_opportunity', etiqueta: 'oportunidad de vínculo' },
  { valor: 'investment_opportunity', etiqueta: 'oportunidad de inversión' },
  { valor: 'policy_opportunity', etiqueta: 'oportunidad de política' },
];

export type TipoEvidencia =
  | 'community_input'
  | 'survey'
  | 'platform_data'
  | 'field_observation'
  | 'institutional_document'
  | 'news_source'
  | 'statistical_source';

export const TIPOS_EVIDENCIA: ReadonlyArray<{ valor: TipoEvidencia; etiqueta: string }> = [
  { valor: 'community_input', etiqueta: 'aporte comunitario' },
  { valor: 'survey', etiqueta: 'relevamiento' },
  { valor: 'platform_data', etiqueta: 'datos de la plataforma' },
  { valor: 'field_observation', etiqueta: 'observación de campo' },
  { valor: 'institutional_document', etiqueta: 'documento institucional' },
  { valor: 'news_source', etiqueta: 'fuente periodística' },
  { valor: 'statistical_source', etiqueta: 'fuente estadística' },
];

export interface EvidenciaOportunidad {
  evidence_type: TipoEvidencia;
  descripcion: string;
  reference_url?: string;
}

export type RolActor = 'proposer' | 'beneficiary' | 'provider' | 'partner' | 'validator' | 'supporter';

export interface ActorOportunidad {
  role: RolActor;
  name?: string;
  consent_confirmed: boolean;
}

/**
 * ADR-027 (Ley 25.326): un actor nombrado exige consentimiento confirmado —
 * el contrato lo valida en el servidor; el cliente lo verifica ANTES de
 * llamar para no enviar PII sin consentimiento explícito.
 */
export function validarActorA1(actor: ActorOportunidad): string | null {
  if (actor.name !== undefined && actor.name.trim() !== '' && actor.consent_confirmed !== true) {
    return 'un actor nombrado exige consentimiento confirmado (ADR-027, Ley 25.326)';
  }
  return null;
}

export interface NuevaOportunidad {
  tipo: TipoOportunidad;
  titulo: string;
  descripcion: string;
  nodo_key: string;
  subnodo_key?: string;
  evidencia: EvidenciaOportunidad;
  actores?: ActorOportunidad[];
  tags?: string[];
}

export interface Oportunidad {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  estado: string;
  nodo_key: string;
  subnodo_key: string | null;
  evidencia: Record<string, unknown>;
  actores: Array<Record<string, unknown>>;
  tags: string[];
  created_by_hash: string;
  created_at: string;
  updated_at: string;
}

export interface KpiSnapshot {
  nodo_key: string;
  kpi_key: string;
  valor: number | null;
  detalles: Record<string, number>;
  computed_at: string;
}

export interface FuenteAsk {
  fuente: string;
  fecha?: string;
}

export interface FragmentoAsk {
  source_type: string;
  source_id: string;
  subnodo_key: string | null;
  texto: string;
  fuentes: FuenteAsk[];
}

export interface RespuestaAsk {
  nodo_key: string;
  pregunta: string;
  dato: FragmentoAsk[];
  dominio: string | null;
  interpretacion: string | null;
  sugerencia: string | null;
  fuentes: FuenteAsk[];
  confidence: number;
  recovered: number;
  human_review: 'pending';
}

export interface PreguntaAsk {
  pregunta: string;
  subnodo?: string;
  n1?: 'productivo_rural' | 'turistico' | 'patrimonial' | 'civico_social';
}

export interface ProductoCatalogo {
  id: string;
  activo_id: string;
  slug: string;
  nombre: string;
  categoria: string | null;
  temporada_meses: number[];
  estado: string;
  created_by_hash: string;
  created_at: string;
}

export interface OperativaActivo {
  activo_id: string;
  titulo: string;
  tipo: string;
  nodo_key: string;
  subnodo_key: string | null;
  horario: string | null;
  temporada_meses: number[];
  capacity_status: string;
  capacidad_plazas: number | null;
  seguridad: string | null;
  habilitacion: Record<string, unknown>;
  procedencia: Record<string, unknown> | null;
}

/* ------------------------------------------------------------------ */
/* Cliente HTTP puro (transporte y token inyectables)                  */
/* ------------------------------------------------------------------ */

export interface ClienteA1 {
  categorias(nodoKey: string): Promise<CategoriaNodo[]>;
  reportesPublicos(nodoKey: string): Promise<ReportePublico[]>;
  crearReporte(nuevo: NuevoReporte): Promise<{ reporte: ReportePublico; idempotente: boolean }>;
  mios(): Promise<ReporteMio[]>;
  historial(reporteId: string): Promise<TransicionReporte[]>;
  features(nodoKey: string): Promise<FeatureNodo[]>;
  capas(nodoKey: string): Promise<CapaNodo[]>;
  subnodos(nodoKey: string): Promise<SubnodoNodo[]>;
  fichas(filtros?: { nodo?: string; estado?: 'corroborada' | 'testimonio' }): Promise<FichaPublica[]>;
  crearFicha(nueva: NuevaFicha): Promise<{ ficha: FichaPublica; idempotente: boolean }>;
  oportunidades(filtros?: { nodo?: string; tipo?: string; estado?: string; subnodo?: string }): Promise<Oportunidad[]>;
  postularOportunidad(nueva: NuevaOportunidad): Promise<{ oportunidad: Oportunidad; idempotente: boolean }>;
  kpis(nodoKey: string): Promise<KpiSnapshot[]>;
  ask(nodoKey: string, pregunta: PreguntaAsk): Promise<RespuestaAsk>;
  productos(activoId: string): Promise<ProductoCatalogo[]>;
  operativa(activoId: string): Promise<OperativaActivo>;
}

export interface OpcionesClienteA1 {
  transporte: TransporteSesion;
  token: () => string | null;
  baseReportes?: string;
  baseNodos?: string;
  baseFichas?: string;
  baseOportunidades?: string;
  baseActivos?: string;
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

function fecha(crudo: unknown): string {
  return typeof crudo === 'string' ? crudo : '';
}

function numeroOnulo(crudo: unknown): number | null {
  return typeof crudo === 'number' ? crudo : null;
}

function parseReporte(crudo: Record<string, unknown>): ReportePublico {
  return {
    id: texto(crudo.id),
    categoria: texto(crudo.categoria),
    descripcion: texto(crudo.descripcion),
    estado: texto(crudo.estado),
    lat: numeroOnulo(crudo.lat),
    lng: numeroOnulo(crudo.lng),
    created_at: fecha(crudo.created_at),
    is_synthetic: crudo.is_synthetic === true,
  };
}

function parseTransicion(crudo: Record<string, unknown>): TransicionReporte {
  return {
    estado_anterior: texto(crudo.estado_anterior),
    estado_nuevo: texto(crudo.estado_nuevo),
    justificacion: texto(crudo.justificacion),
    moderador_hash: texto(crudo.moderador_hash),
    occurred_at: fecha(crudo.occurred_at),
  };
}

function parseFicha(crudo: Record<string, unknown>): FichaPublica {
  return {
    id: texto(crudo.id),
    nodo_key: texto(crudo.nodo_key),
    feature_id: texto(crudo.feature_id),
    version: texto(crudo.version),
    respuestas: (crudo.respuestas ?? {}) as Record<string, unknown>,
    estado: texto(crudo.estado),
    corroboracion: crudo.corroboracion === null || crudo.corroboracion === undefined ? null : texto(crudo.corroboracion),
    created_by_hash: texto(crudo.created_by_hash),
    created_at: fecha(crudo.created_at),
    updated_at: fecha(crudo.updated_at),
    feature_titulo: crudo.feature_titulo === null || crudo.feature_titulo === undefined ? null : texto(crudo.feature_titulo),
    feature_lat: crudo.feature_lat === null || crudo.feature_lat === undefined ? null : numeroOnulo(crudo.feature_lat),
    feature_lng: crudo.feature_lng === null || crudo.feature_lng === undefined ? null : numeroOnulo(crudo.feature_lng),
    feature_is_synthetic: crudo.feature_is_synthetic === null || crudo.feature_is_synthetic === undefined ? null : crudo.feature_is_synthetic === true,
    feature_fuente_label: crudo.feature_fuente_label === null || crudo.feature_fuente_label === undefined ? null : texto(crudo.feature_fuente_label),
    estado_publico: texto(crudo.estado_publico) === 'validado' ? 'validado' : 'testimonio',
  };
}

function parseOportunidad(crudo: Record<string, unknown>): Oportunidad {
  return {
    id: texto(crudo.id),
    tipo: texto(crudo.tipo),
    titulo: texto(crudo.titulo),
    descripcion: texto(crudo.descripcion),
    estado: texto(crudo.estado),
    nodo_key: texto(crudo.nodo_key),
    subnodo_key: crudo.subnodo_key === null || crudo.subnodo_key === undefined ? null : texto(crudo.subnodo_key),
    evidencia: (crudo.evidencia ?? {}) as Record<string, unknown>,
    actores: Array.isArray(crudo.actores) ? (crudo.actores as Array<Record<string, unknown>>) : [],
    tags: Array.isArray(crudo.tags) ? (crudo.tags as unknown[]).map((t) => texto(t)).filter((t) => t !== '') : [],
    created_by_hash: texto(crudo.created_by_hash),
    created_at: fecha(crudo.created_at),
    updated_at: fecha(crudo.updated_at),
  };
}

function parseKpi(crudo: Record<string, unknown>): KpiSnapshot {
  const detallesCrudos = crudo.detalles;
  const detalles: Record<string, number> = {};
  if (detallesCrudos !== null && detallesCrudos !== undefined && typeof detallesCrudos === 'object') {
    for (const [clave, valor] of Object.entries(detallesCrudos as Record<string, unknown>)) {
      if (typeof valor === 'number') {
        detalles[clave] = valor;
      }
    }
  }
  return {
    nodo_key: texto(crudo.nodo_key),
    kpi_key: texto(crudo.kpi_key),
    valor: crudo.valor === null ? null : numeroOnulo(crudo.valor),
    detalles,
    computed_at: fecha(crudo.computed_at),
  };
}

function parseProducto(crudo: Record<string, unknown>): ProductoCatalogo {
  return {
    id: texto(crudo.id),
    activo_id: texto(crudo.activo_id),
    slug: texto(crudo.slug),
    nombre: texto(crudo.nombre),
    categoria: crudo.categoria === null || crudo.categoria === undefined ? null : texto(crudo.categoria),
    temporada_meses: Array.isArray(crudo.temporada_meses) ? (crudo.temporada_meses as unknown[]).map((m) => (typeof m === 'number' ? m : 0)).filter((m) => m >= 1 && m <= 12) : [],
    estado: texto(crudo.estado),
    created_by_hash: texto(crudo.created_by_hash),
    created_at: fecha(crudo.created_at),
  };
}

function query(params: Record<string, string | undefined>): string {
  const pares = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (pares.length === 0) {
    return '';
  }
  return '?' + pares.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v as string)).join('&');
}

export function crearClienteA1(opts: OpcionesClienteA1): ClienteA1 {
  const baseReportes: string = opts.baseReportes ?? '/api/reportes';
  const baseNodos: string = opts.baseNodos ?? '/api/nodos';
  const baseFichas: string = opts.baseFichas ?? '/api/fichas-valoracion';
  const baseOportunidades: string = opts.baseOportunidades ?? '/api/oportunidades';
  const baseActivos: string = opts.baseActivos ?? '/api';

  const llamar = async (
    ruta: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ) => {
    try {
      return await opts.transporte(ruta, init);
    } catch {
      throw new ErrorA1('no_disponible', 'no se pudo contactar la plataforma');
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
      throw new ErrorA1('no_disponible', 'respuesta malformada de la plataforma');
    }
  };

  const headersToken = (): Record<string, string> => {
    const token = opts.token();
    if (!token) {
      throw new ErrorA1('credenciales', 'se requiere sesión iniciada para esta acción');
    }
    return { Authorization: 'Bearer ' + token };
  };

  const lista = (cuerpo: Envelope, status: number): unknown[] => {
    if (Array.isArray(cuerpo.data)) {
      return cuerpo.data;
    }
    throw new ErrorA1('no_disponible', 'respuesta malformada (HTTP ' + status + ')');
  };

  /** Mapeo honesto del alta ciudadana: 201 nuevo · 200 idempotente · resto error. */
  const alta = async (ruta: string, body: unknown): Promise<{ res: unknown; cuerpo: Envelope; idempotente: boolean; status: number }> => {
    const res = await llamar(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headersToken() },
      body: JSON.stringify(body),
    });
    const cuerpo = await leerJson(res);
    if (res.status === 201 || res.status === 200) {
      if (!cuerpo.data) {
        throw new ErrorA1('no_disponible', 'respuesta malformada del alta');
      }
      return { res, cuerpo, idempotente: res.status === 200 || cuerpo.idempotente === true, status: res.status };
    }
    const mensaje = texto(cuerpo.error);
    if (res.status === 400) {
      if (mensaje.includes('datos personales identificables')) {
        throw new ErrorA1('pii', mensaje);
      }
      if (mensaje.includes('categoría inexistente')) {
        throw new ErrorA1('categoria', mensaje);
      }
      throw new ErrorA1('datos', mensaje || 'datos inválidos');
    }
    if (res.status === 401) {
      throw new ErrorA1('credenciales', 'sesión no válida — iniciá sesión de nuevo');
    }
    if (res.status === 404) {
      throw new ErrorA1('no_encontrado', mensaje || 'no encontrado');
    }
    if (res.status === 429) {
      throw new ErrorA1('no_disponible', 'demasiados intentos — esperá un momento (techo por rol)');
    }
    throw new ErrorA1('no_disponible', mensaje || 'HTTP ' + res.status);
  };

  const lectura = async (ruta: string, sobre404: () => ErrorA1): Promise<Envelope> => {
    const res = await llamar(ruta);
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      return cuerpo;
    }
    if (res.status === 404) {
      throw sobre404();
    }
    if (res.status === 400) {
      throw new ErrorA1('datos', texto(cuerpo.error) || 'filtros inválidos');
    }
    throw new ErrorA1('no_disponible', texto(cuerpo.error) || 'HTTP ' + res.status);
  };

  /* ---------------- lectura pública del vocabulario ---------------- */

  const categorias = async (nodoKey: string): Promise<CategoriaNodo[]> => {
    const cuerpo = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/categorias', () => new ErrorA1('nodo', 'nodo no encontrado'));
    return lista(cuerpo, 200).map((c) => {
      const crudo = c as Record<string, unknown>;
      return { id: texto(crudo.id), code: texto(crudo.code), label: texto(crudo.label), layer: texto(crudo.layer) };
    });
  };

  const reportesPublicos = async (nodoKey: string): Promise<ReportePublico[]> => {
    const cuerpo = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/reportes', () => new ErrorA1('nodo', 'nodo no encontrado'));
    // El servidor excluye 'descartado' (ADR-038): lo público es lo público.
    return lista(cuerpo, 200).map((r) => parseReporte(r as Record<string, unknown>));
  };

  const features = async (nodoKey: string): Promise<FeatureNodo[]> => {
    const cuerpo = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/features', () => new ErrorA1('nodo', 'nodo no encontrado'));
    return lista(cuerpo, 200).map((f) => {
      const crudo = f as Record<string, unknown>;
      return {
        id: texto(crudo.id),
        layer: texto(crudo.layer),
        domain: texto(crudo.domain),
        titulo: texto(crudo.titulo),
        tipo: texto(crudo.tipo),
        estado: texto(crudo.estado),
        fuente_label: texto(crudo.fuente_label),
        observado_at: typeof crudo.observado_at === 'string' ? crudo.observado_at : null,
        lat: numeroOnulo(crudo.lat),
        lng: numeroOnulo(crudo.lng),
        is_synthetic: crudo.is_synthetic === true,
      };
    });
  };

  const capas = async (nodoKey: string): Promise<CapaNodo[]> => {
    const cuerpo = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/capas', () => new ErrorA1('nodo', 'nodo no encontrado'));
    return lista(cuerpo, 200).map((c) => {
      const crudo = c as Record<string, unknown>;
      return { ...crudo, id: texto(crudo.id), key: texto(crudo.key) };
    });
  };

  const subnodos = async (nodoKey: string): Promise<SubnodoNodo[]> => {
    const cuerpo = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/subnodos', () => new ErrorA1('nodo', 'nodo no encontrado'));
    return lista(cuerpo, 200).map((s) => {
      const crudo = s as Record<string, unknown>;
      return {
        ...crudo,
        key: texto(crudo.key),
        type: texto(crudo.type),
        parent_key: crudo.parent_key === null || crudo.parent_key === undefined ? null : texto(crudo.parent_key),
        boundary_status: crudo.boundary_status === null || crudo.boundary_status === undefined ? null : texto(crudo.boundary_status),
      };
    });
  };

  const kpis = async (nodoKey: string): Promise<KpiSnapshot[]> => {
    const cuerpo = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/kpis', () => new ErrorA1('nodo', 'nodo no encontrado'));
    return lista(cuerpo, 200).map((k) => parseKpi(k as Record<string, unknown>));
  };

  /* ---------------- reporte ciudadano (JWT) ---------------- */

  const crearReporte = async (nuevo: NuevoReporte) => {
    const { cuerpo, idempotente } = await alta(baseReportes, {
      nodo_key: nuevo.nodo_key,
      categoria: nuevo.categoria,
      descripcion: nuevo.descripcion,
      lat: nuevo.lat,
      lng: nuevo.lng,
    });
    const reporte = parseReporte(cuerpo.data as Record<string, unknown>);
    return { reporte, idempotente };
  };

  const mios = async (): Promise<ReporteMio[]> => {
    const res = await llamar(baseReportes + '/mios', { headers: headersToken() });
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      return lista(cuerpo, 200).map((r) => {
        const crudo = r as Record<string, unknown>;
        const transiciones = Array.isArray(crudo.transiciones)
          ? crudo.transiciones.map((t) => parseTransicion(t as Record<string, unknown>))
          : [];
        return { ...parseReporte(crudo), nodo_key: typeof crudo.nodo_key === 'string' ? crudo.nodo_key : null, transiciones };
      });
    }
    if (res.status === 401) {
      throw new ErrorA1('credenciales', 'sesión no válida — iniciá sesión de nuevo');
    }
    throw new ErrorA1('no_disponible', texto(cuerpo.error) || 'HTTP ' + res.status);
  };

  const historial = async (reporteId: string): Promise<TransicionReporte[]> => {
    const res = await llamar(baseReportes + '/' + encodeURIComponent(reporteId) + '/historial');
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      const data = cuerpo.data as Record<string, unknown> | undefined;
      const transiciones = data && Array.isArray(data.transiciones) ? data.transiciones : null;
      if (transiciones === null) {
        throw new ErrorA1('no_disponible', 'respuesta malformada del historial');
      }
      return transiciones.map((t) => parseTransicion(t as Record<string, unknown>));
    }
    if (res.status === 404) {
      // 'descartado' nunca es publicable (ADR-038): su historial es del reportero (/mios).
      throw new ErrorA1('no_encontrado', 'reporte no encontrado o no publicable');
    }
    throw new ErrorA1('no_disponible', texto(cuerpo.error) || 'HTTP ' + res.status);
  };

  /* ---------------- fichas de valoración (#149) ---------------- */

  const fichas = async (filtros?: { nodo?: string; estado?: 'corroborada' | 'testimonio' }): Promise<FichaPublica[]> => {
    const cuerpo = await lectura(baseFichas + query({ nodo: filtros?.nodo, estado: filtros?.estado }), () => new ErrorA1('datos', 'filtros inválidos'));
    return lista(cuerpo, 200).map((f) => parseFicha(f as Record<string, unknown>));
  };

  const crearFicha = async (nueva: NuevaFicha) => {
    const { cuerpo, idempotente } = await alta(baseFichas, {
      nodo_key: nueva.nodo_key,
      feature_id: nueva.feature_id,
      version: nueva.version,
      respuestas: nueva.respuestas,
    });
    const ficha = parseFicha(cuerpo.data as Record<string, unknown>);
    return { ficha, idempotente };
  };

  /* ---------------- Banco de Potencialidades (Bloque 9) ---------------- */

  const oportunidades = async (filtros?: { nodo?: string; tipo?: string; estado?: string; subnodo?: string }): Promise<Oportunidad[]> => {
    const cuerpo = await lectura(baseOportunidades + query({ nodo: filtros?.nodo, tipo: filtros?.tipo, estado: filtros?.estado, subnodo: filtros?.subnodo }), () => new ErrorA1('datos', 'filtros inválidos (discarded no es publicable)'));
    return lista(cuerpo, 200).map((o) => parseOportunidad(o as Record<string, unknown>));
  };

  const postularOportunidad = async (nueva: NuevaOportunidad) => {
    const body: Record<string, unknown> = {
      tipo: nueva.tipo,
      titulo: nueva.titulo,
      descripcion: nueva.descripcion,
      nodo_key: nueva.nodo_key,
      evidencia: nueva.evidencia,
    };
    if (nueva.subnodo_key !== undefined && nueva.subnodo_key !== '') {
      body.subnodo_key = nueva.subnodo_key;
    }
    if (nueva.actores !== undefined) {
      body.actores = nueva.actores;
    }
    if (nueva.tags !== undefined && nueva.tags.length > 0) {
      body.tags = nueva.tags;
    }
    const { cuerpo, idempotente } = await alta(baseOportunidades, body);
    const oportunidad = parseOportunidad(cuerpo.data as Record<string, unknown>);
    return { oportunidad, idempotente };
  };

  /* ---------------- asistente territorial (VIG-006, sin LLM) ---------------- */

  const ask = async (nodoKey: string, pregunta: PreguntaAsk): Promise<RespuestaAsk> => {
    const body: Record<string, unknown> = { pregunta: pregunta.pregunta };
    if (pregunta.subnodo !== undefined && pregunta.subnodo !== '') {
      body.subnodo = pregunta.subnodo;
    }
    if (pregunta.n1 !== undefined) {
      body.n1 = pregunta.n1;
    }
    const res = await llamar(baseNodos + '/' + encodeURIComponent(nodoKey) + '/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const cuerpo = await leerJson(res);
    if (res.status === 200 && cuerpo.data) {
      const crudo = cuerpo.data as Record<string, unknown>;
      const dato = Array.isArray(crudo.dato)
        ? (crudo.dato as Array<Record<string, unknown>>).map((f) => ({
            source_type: texto(f.source_type),
            source_id: texto(f.source_id),
            subnodo_key: f.subnodo_key === null || f.subnodo_key === undefined ? null : texto(f.subnodo_key),
            texto: texto(f.texto),
            fuentes: Array.isArray(f.fuentes) ? (f.fuentes as Array<Record<string, unknown>>).map((x) => ({ fuente: texto(x.fuente), fecha: typeof x.fecha === 'string' ? x.fecha : undefined })) : [],
          }))
        : [];
      const fuentes = Array.isArray(crudo.fuentes)
        ? (crudo.fuentes as Array<Record<string, unknown>>).map((x) => ({ fuente: texto(x.fuente), fecha: typeof x.fecha === 'string' ? x.fecha : undefined }))
        : [];
      return {
        nodo_key: texto(crudo.nodo_key),
        pregunta: texto(crudo.pregunta),
        dato,
        dominio: crudo.dominio === null || crudo.dominio === undefined ? null : texto(crudo.dominio),
        interpretacion: crudo.interpretacion === null || crudo.interpretacion === undefined ? null : texto(crudo.interpretacion),
        sugerencia: crudo.sugerencia === null || crudo.sugerencia === undefined ? null : texto(crudo.sugerencia),
        fuentes,
        confidence: typeof crudo.confidence === 'number' ? crudo.confidence : 0,
        recovered: typeof crudo.recovered === 'number' ? crudo.recovered : dato.length,
        human_review: 'pending',
      };
    }
    const mensaje = texto(cuerpo.error);
    if (res.status === 400) {
      throw new ErrorA1('datos', mensaje || 'pregunta inválida (3-300 caracteres)');
    }
    if (res.status === 404) {
      throw new ErrorA1('nodo', 'nodo no encontrado');
    }
    throw new ErrorA1('no_disponible', mensaje || 'HTTP ' + res.status);
  };

  /* ---------------- directorio y producción (VIG-005) ---------------- */

  const productos = async (activoId: string): Promise<ProductoCatalogo[]> => {
    // restricted: 404 SIN ECO (ADR-036) — el cliente no confirma existencia.
    const cuerpo = await lectura(baseActivos + '/activos/' + encodeURIComponent(activoId) + '/productos', () => new ErrorA1('no_encontrado', 'activo no encontrado'));
    return lista(cuerpo, 200).map((p) => parseProducto(p as Record<string, unknown>));
  };

  const operativa = async (activoId: string): Promise<OperativaActivo> => {
    const cuerpo = await lectura(baseActivos + '/operativa/' + encodeURIComponent(activoId), () => new ErrorA1('no_encontrado', 'activo no encontrado o sin operativa publicada'));
    if (!cuerpo.data) {
      throw new ErrorA1('no_disponible', 'respuesta malformada de la operativa');
    }
    const crudo = cuerpo.data as Record<string, unknown>;
    return {
      activo_id: texto(crudo.activo_id),
      titulo: texto(crudo.titulo),
      tipo: texto(crudo.tipo),
      nodo_key: texto(crudo.nodo_key),
      subnodo_key: crudo.subnodo_key === null || crudo.subnodo_key === undefined ? null : texto(crudo.subnodo_key),
      horario: crudo.horario === null || crudo.horario === undefined ? null : texto(crudo.horario),
      temporada_meses: Array.isArray(crudo.temporada_meses) ? (crudo.temporada_meses as unknown[]).map((m) => (typeof m === 'number' ? m : 0)).filter((m) => m >= 1 && m <= 12) : [],
      capacity_status: texto(crudo.capacity_status),
      capacidad_plazas: numeroOnulo(crudo.capacidad_plazas),
      seguridad: crudo.seguridad === null || crudo.seguridad === undefined ? null : texto(crudo.seguridad),
      habilitacion: (crudo.habilitacion ?? {}) as Record<string, unknown>,
      procedencia: (crudo.procedencia ?? null) as Record<string, unknown> | null,
    };
  };

  return {
    categorias,
    reportesPublicos,
    crearReporte,
    mios,
    historial,
    features,
    capas,
    subnodos,
    fichas,
    crearFicha,
    oportunidades,
    postularOportunidad,
    kpis,
    ask,
    productos,
    operativa,
  };
}

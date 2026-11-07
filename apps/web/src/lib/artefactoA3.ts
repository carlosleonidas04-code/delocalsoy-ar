/**
 * DELocalSoy.AR — Artefacto A3 (gestor y admin de nodo): matriz de permisos
 * v0.1, capacidades por sesión y cliente HTTP puro para las superficies
 * REALES de moderación y gestión (ART-R2, #271, épica #268 · AR3 #402,
 * épica #399: cola unificada de pendientes, matriz visible y sello esperado
 * ANTES de confirmar).
 *
 * Superficies contrastadas contra main @ 77500be (apps/api/src/routes +
 * packages/contracts/src/index.ts):
 *   GET   /api/nodos/:key/reportes        (público) bandeja SIN 'descartado'
 *   GET   /api/reportes/:id/historial     (público) ciclo sellado (ADR-038)
 *   PATCH /api/reportes/:id/estado        (moderador|admin) {estado, justificacion >=10}
 *   GET   /api/activos/:id/productos      (público) propuesto|aprobado
 *   PATCH /api/productos/:id/estado       (moderador|admin) {estado, motivo?} — SIN matriz
 *   GET   /api/fichas-valoracion          (público) ?estado=(corroborada|testimonio)&nodo=
 *   PATCH /api/fichas-valoracion/:id/estado (moderador|admin) {estado, corroboracion?, motivo?}
 *   GET   /api/oportunidades[/:id]       (público) sin 'discarded'
 *   PATCH /api/oportunidades/:id/estado  (moderador|admin) {estado, motivo?} + matriz Bloque 9
 *   GET   /api/patrimonio/:activoId      (público) ficha SIN sensible/sensible_nota (ADR-036)
 *   PATCH /api/patrimonio/:activoId      (moderador|admin) custodia + visibilidad
 *   GET   /api/fuentes[/:key]            (público) catálogo de procedencia (#147)
 *   GET   /api/ingestas[/:id]            (público) SOLO publicado — el pipeline en curso NO es listable
 *   POST  /api/ingestas                  (admin) ingesta curada NC-EV-09
 *   PATCH /api/ingestas/:id/estado        (admin) pipeline forward-only (#147)
 *   GET   /api/nodos/:key/kpis           (público) valor null != 0 (R15)
 *   GET   /api/activos?estado=propuesto  (público) cola de propuestos (AR3)
 *   PATCH /api/comercios/:id/estado       (moderador|admin) {estado, justificacion >=10} matriz COMERCIO_TRANSICIONES
 *
 * Reglas vivas: R5 (errores tipados, jamás []) · R15 (sin simulación: la
 * moderación ES la validación comunitaria; nada de lo descartado se simula)
 * · ADR-036 (sensible_nota JAMÁS vuelve por GET — ni para moderadores) ·
 * ADR-038 (justificación pública >=10 por transición de reporte) ·
 * Ley 25.326/ADR-027 (el gestor opera sobre hashes, nunca identidades).
 *
 * HALLAZGOS honestos del contraste (declarados, no escondidos):
 *  1. La API real solo reconoce RolSchema {ciudadano, moderador, admin}
 *     (ADR-031); los roles granulares gestor/custodio_territorial/admin_nodo/
 *     admin_hitub de la serie docs v0.1 son aspiracionales (◇). El 'admin'
 *     de la API NO es miembro de RolPlataforma de sesion.ts: este módulo
 *     normaliza 'admin' -> permisos plenos de gestión (corrección de
 *     derivación sesion.puedeModerar pendiente de decisión DH).
 *  2. El pipeline de ingestas en curso NO es listable: GET /api/ingestas
 *     filtra estado='publicado' (el resto queda para custodia, R15/ADR-036).
 *     El panel administra por id devuelto por el propio POST — jamás simula
 *     una bandeja de pendientes.
 *  3. 'sensible_nota' se ESCRIBE por PATCH pero NO existe lectura que la
 *     devuelva (el GET público la excluye por diseño) — el panel lo declara.
 *  4. La bandeja de reportes excluye 'descartado' (ReporteEstadoPublicoFiltro
 *     Schema): lo descartado solo lo ve su reportero en /mios.
 *
 * Montaje único en ART-R5 (ArtefactosRoot): este módulo NO toca App.tsx ni
 * main.tsx (regla M0).
 */
import type { EstadoSesion, RolPlataforma } from './sesion';
import { RATE_LIMIT_POR_ROL, RATE_LIMIT_VISITANTE } from './sesion';
import type {
  FichaPublica,
  KpiSnapshot,
  Oportunidad,
  ProductoCatalogo,
  ReportePublico,
  TransicionReporte,
} from './artefactoA1';

// Re-export de tipos compartidos: los paneles A3 consumen UNA sola fuente web de contratos.
export type { FichaPublica, KpiSnapshot, Oportunidad, ProductoCatalogo, ReportePublico, TransicionReporte } from './artefactoA1';

/* ------------------------------------------------------------------ */
/* Componentes del artefacto (serie docs/artefactos/ v0.1, PR #267)    */
/* ------------------------------------------------------------------ */

export type ComponenteA3Id =
  | 'bandeja_reportes'
  | 'moderacion_productos'
  | 'moderacion_comercios'
  | 'custodia_patrimonial'
  | 'fuentes_ingestas'
  | 'kpis_nodo'
  | 'corroboracion_fichas'
  | 'cola_pendientes'
  | 'alcance_por_nodo';

export type EstadoComponente = 'en_main' | 'en_rama' | 'propuesto';

export interface ComponenteA3 {
  id: ComponenteA3Id;
  titulo: string;
  resumen: string;
  /** Estado honesto contrastado en vivo (R15). */
  estado: EstadoComponente;
  traza: string;
}

export const COMPONENTES_A3: readonly ComponenteA3[] = [
  {
    id: 'bandeja_reportes',
    titulo: 'Bandeja de moderación de reportes',
    resumen:
      'PATCH /api/reportes/:id/estado con matriz REPORTE_TRANSICIONES y justificación pública >=10 (ADR-038); sello reporte.estado_cambiado con moderador_hash + rollback en la API.',
    estado: 'en_main',
    traza: 'CORE-005 R3 (#211, EV-053)',
  },
  {
    id: 'moderacion_productos',
    titulo: 'Moderación de productos',
    resumen:
      'PATCH /api/productos/:id/estado: aprobado|rechazado|archivado (sin matriz en la API: 409 solo por mismo estado).',
    estado: 'en_main',
    traza: 'VIG-005 (#174, EV-045)',
  },
  {
    id: 'moderacion_comercios',
    titulo: 'Moderación de comercios',
    resumen:
      'PATCH /api/comercios/:id/estado con matriz COMERCIO_TRANSICIONES y justificación pública >=10 (ADR-038); los comercios propuestos NO son listables (GET /api/comercios solo publica aprobados) — moderación por id, patrón ingestas (R15).',
    estado: 'en_main',
    traza: 'MARKET-CAP MK-1/MK-2 (#243, PRs #246–#254)',
  },
  {
    id: 'custodia_patrimonial',
    titulo: 'Custodia patrimonial',
    resumen:
      'PATCH /api/patrimonio/:activoId: upsert de ficha + transición de visibilidad (public|generalized|restricted) con custodio_hash; sensible_nota SOLO en canal de gestión (nunca en GET público).',
    estado: 'en_main',
    traza: 'VIG-004 (#173, EV-044)',
  },
  {
    id: 'fuentes_ingestas',
    titulo: 'Catálogo de fuentes y pipeline de ingestas',
    resumen:
      'POST /api/ingestas (admin, NC-EV-09) + PATCH /api/ingestas/:id/estado forward-only (solo admin publica — decisión DH 2026-10-15); lectura pública solo de lo publicado.',
    estado: 'en_main',
    traza: 'NODO-CAU R2 (#200, EV-049)',
  },
  {
    id: 'kpis_nodo',
    titulo: 'KPIs del nodo',
    resumen: 'Consumidor vig003-kpi con recompute idempotente; restricted excluido; count 0 honesto; valor null != 0 (cobertura_geometrica).',
    estado: 'en_main',
    traza: 'VIG-003 (#182, EV-043)',
  },
  {
    id: 'corroboracion_fichas',
    titulo: 'Corroboración de fichas de valoración',
    resumen: 'testimonio -> corroborada|descartada; corroborar exige instancia (individual|taller_comunitario) — decisión #149.',
    estado: 'en_main',
    traza: 'NODO-CAU R4 (#149, EV-038)',
  },
  {
    id: 'cola_pendientes',
    titulo: 'Cola unificada de pendientes (AR3)',
    resumen:
      'AR3 (#402): reportes received/evaluating + fichas testimonio + oportunidades detected/under_review + activos propuestos en una sola vista por nodo; matriz de transiciones visible por dominio y sello esperado mostrado ANTES de confirmar.',
    estado: 'en_main',
    traza: 'ARTEFACTOS-ROLES AR3 (#402, épica #399)',
  },
  {
    id: 'alcance_por_nodo',
    titulo: 'Alcance por nodo (JWT scope)',
    resumen: 'NODE_SCOPE_FORBIDDEN: un gestor de Caucete no modera Capital — diseño lote-2, a ratificar (◇).',
    estado: 'propuesto',
    traza: 'diseño lote-2 / #136 (trabado)',
  },
];

/* ------------------------------------------------------------------ */
/* Matriz de permisos declarada (docs v0.1) vs permiso EFECTIVO        */
/* ------------------------------------------------------------------ */

export type PermisoA3 = 'leer' | 'moderar' | 'administrar' | null;

export interface ColumnasPermisoA3 {
  moderador: PermisoA3;
  gestor: PermisoA3;
  custodio_territorial: PermisoA3;
  admin: PermisoA3;
  visitante: PermisoA3;
}

/**
 * Matriz DECLARADA de la serie docs v0.1. Los roles gestor y
 * custodio_territorial aún NO existen en la API real (RolSchema:
 * ciudadano|moderador|admin) — sus columnas son atribución ratificada de
 * la DH, no superficies ejecutables todavía (R15: se declaran, no se simulan).
 */
export const MATRIZ_PERMISOS_A3: Record<ComponenteA3Id, ColumnasPermisoA3> = {
  bandeja_reportes: { moderador: 'moderar', gestor: null, custodio_territorial: null, admin: 'moderar', visitante: 'leer' },
  moderacion_productos: { moderador: 'moderar', gestor: null, custodio_territorial: null, admin: 'moderar', visitante: 'leer' },
  moderacion_comercios: { moderador: 'moderar', gestor: null, custodio_territorial: null, admin: 'moderar', visitante: null },
  custodia_patrimonial: { moderador: 'moderar', gestor: null, custodio_territorial: 'moderar', admin: 'moderar', visitante: 'leer' },
  fuentes_ingestas: { moderador: 'leer', gestor: 'leer', custodio_territorial: null, admin: 'administrar', visitante: 'leer' },
  kpis_nodo: { moderador: 'leer', gestor: 'leer', custodio_territorial: 'leer', admin: 'leer', visitante: 'leer' },
  corroboracion_fichas: { moderador: 'moderar', gestor: null, custodio_territorial: null, admin: 'moderar', visitante: 'leer' },
  cola_pendientes: { moderador: 'moderar', gestor: null, custodio_territorial: null, admin: 'moderar', visitante: 'leer' },
  alcance_por_nodo: { moderador: null, gestor: null, custodio_territorial: null, admin: null, visitante: null },
};

/* ------------------------------------------------------------------ */
/* Capacidades por sesión (gates efectivos contra la API real)         */
/* ------------------------------------------------------------------ */

/** Rol observable: la API devuelve RolSchema {ciudadano, moderador, admin}. */
export type RolObservable = RolPlataforma | 'admin';

export interface CapacidadesA3 {
  esVisitante: boolean;
  /** Modo synthetic: demo SINTÉTICO declarada — la gestión no se acredita (R15). */
  esDemo: boolean;
  rol: RolObservable | null;
  techoReqsMin: number;
  /** Moderación (reportes/productos/fichas/oportunidades/patrimonio): moderador|admin. */
  puedeModerar: boolean;
  /** Pipeline de ingestas (alta + avance): SOLO admin (decisión DH 2026-10-15). */
  puedeAdministrarIngestas: boolean;
}

const ES_MODERADOR: ReadonlyArray<RolObservable> = ['moderador', 'admin', 'admin_nodo', 'admin_hitub'];
const ES_ADMIN: ReadonlyArray<RolObservable> = ['admin', 'admin_nodo', 'admin_hitub'];

export function capacidadesA3(estado: EstadoSesion): CapacidadesA3 {
  if (estado.tipo === 'demo_sintetico') {
    return {
      esVisitante: true,
      esDemo: true,
      rol: null,
      techoReqsMin: RATE_LIMIT_VISITANTE,
      puedeModerar: false,
      puedeAdministrarIngestas: false,
    };
  }
  if (estado.tipo === 'sesion') {
    // Hallazgo 1: la API devuelve rol 'admin' (RolSchema ADR-031), que no es
    // miembro del RolPlataforma de sesion.ts — se normaliza acá: 'admin' es
    // moderador pleno + publicador de ingestas. La corrección de derivación
    // de sesion.puedeModerar queda propuesta a la DH (R15: declarado, no
    // silenciado).
    const rol = estado.usuario.rol as RolObservable;
    const techo =
      rol === 'admin' ? 500 : (RATE_LIMIT_POR_ROL[rol as RolPlataforma] ?? RATE_LIMIT_VISITANTE);
    return {
      esVisitante: false,
      esDemo: false,
      rol,
      techoReqsMin: techo,
      puedeModerar: ES_MODERADOR.includes(rol),
      puedeAdministrarIngestas: ES_ADMIN.includes(rol),
    };
  }
  return {
    esVisitante: true,
    esDemo: false,
    rol: null,
    techoReqsMin: RATE_LIMIT_VISITANTE,
    puedeModerar: false,
    puedeAdministrarIngestas: false,
  };
}

/**
 * Permiso visible en la matriz declarada para el rol actual. Los roles que
 * aún no existen en la API (gestor, custodio_territorial) muestran su
 * columna declarada — el permiso EFECTIVO lo exige igualmente la API en
 * cada PATCH (403 real, no simulado).
 */
export function permisoVisibleA3(componente: ComponenteA3Id, caps: CapacidadesA3): PermisoA3 {
  const fila = MATRIZ_PERMISOS_A3[componente];
  if (caps.esVisitante) {
    return fila.visitante;
  }
  const rol = caps.rol;
  if (rol === 'moderador') return fila.moderador;
  if (rol === 'admin' || rol === 'admin_nodo' || rol === 'admin_hitub') return fila.admin;
  if (rol === 'gestor') return fila.gestor;
  if (rol === 'custodio_territorial') return fila.custodio_territorial;
  return fila.visitante;
}

/* ------------------------------------------------------------------ */
/* Errores honestos (R5: jamás [])                                     */
/* ------------------------------------------------------------------ */

export type CodigoErrorA3 =
  | 'credenciales'
  | 'permiso'
  | 'datos'
  | 'pii'
  | 'transicion'
  | 'ya_estado'
  | 'no_encontrado'
  | 'no_disponible';

export class ErrorA3 extends Error {
  codigo: CodigoErrorA3;
  constructor(codigo: CodigoErrorA3, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorA3';
    this.codigo = codigo;
  }
}

/* ------------------------------------------------------------------ */
/* Matrices de transiciones — espejo EXACTO de la API                 */
/* ------------------------------------------------------------------ */

export type EstadoReporte = 'received' | 'evaluating' | 'in_progress' | 'resolved' | 'descartado';

/** REPORTE_TRANSICIONES (contracts, ADR-038): resolved/descartado terminales. */
export const REPORTE_TRANSICIONES_A3: Readonly<Record<EstadoReporte, readonly EstadoReporte[]>> = {
  received: ['evaluating', 'descartado'],
  evaluating: ['in_progress', 'descartado'],
  in_progress: ['resolved', 'descartado'],
  resolved: [],
  descartado: [],
};

export type EstadoProducto = 'propuesto' | 'aprobado' | 'rechazado' | 'archivado';

/** Estados moderables del producto — la API NO tiene matriz (solo 409 mismo estado). */
export const ESTADOS_PRODUCTO_MODERABLES: ReadonlyArray<'aprobado' | 'rechazado' | 'archivado'> = [
  'aprobado',
  'rechazado',
  'archivado',
];

export type EstadoFicha = 'testimonio' | 'corroborada' | 'descartada';
export type CorroboracionFicha = 'individual' | 'taller_comunitario';

export type EstadoOportunidad =
  | 'detected'
  | 'under_review'
  | 'validated'
  | 'prioritized'
  | 'in_development'
  | 'active'
  | 'implemented'
  | 'paused'
  | 'discarded'
  | 'archived';

/** TRANSICIONES del Bloque 9 (routes/oportunidades.ts): espejo exacto. */
export const OPORTUNIDAD_TRANSICIONES_A3: Readonly<Record<EstadoOportunidad, readonly EstadoOportunidad[]>> = {
  detected: ['under_review', 'discarded'],
  under_review: ['validated', 'discarded'],
  validated: ['prioritized', 'paused', 'discarded'],
  prioritized: ['in_development', 'paused', 'discarded'],
  in_development: ['active', 'paused', 'discarded'],
  active: ['implemented', 'paused', 'discarded'],
  implemented: ['archived'],
  paused: ['prioritized', 'in_development', 'discarded'],
  discarded: ['archived'],
  archived: [],
};

export type EstadoIngesta =
  | 'recibido'
  | 'validado_tecnicamente'
  | 'validado_territorialmente'
  | 'publicado';

/** Pipeline de procedencia (routes/fuentes.ts): forward-only, publicado terminal. */
export const INGESTA_TRANSICIONES_A3: Readonly<Record<EstadoIngesta, readonly EstadoIngesta[]>> = {
  recibido: ['validado_tecnicamente'],
  validado_tecnicamente: ['validado_territorialmente'],
  validado_territorialmente: ['publicado'],
  publicado: [],
};

/* ------------------------------------------------------------------ */
/* AR3 (#402): comercios espejo MK-1 + sellos esperados + pendientes   */
/* ------------------------------------------------------------------ */

export type EstadoComercio = 'propuesto' | 'aprobado' | 'rechazado' | 'archivado';

/** COMERCIO_TRANSICIONES (contracts, MK-1 #243): espejo exacto. */
export const COMERCIO_TRANSICIONES_A3: Readonly<Record<EstadoComercio, readonly EstadoComercio[]>> = {
  propuesto: ['aprobado', 'rechazado'],
  aprobado: ['rechazado', 'archivado'],
  rechazado: ['propuesto'],
  archivado: ['propuesto'],
};

/** Sello esperado por dominio (AR3): fuente canónica docs/MATRIZ_SELLOS.md v0.2. */
export type DominioSelloA3 =
  | 'reportes'
  | 'activos'
  | 'productos'
  | 'fichas'
  | 'oportunidades'
  | 'comercios'
  | 'patrimonio'
  | 'ingestas';

export const SELLOS_ESPERADOS_A3: Readonly<Record<DominioSelloA3, string>> = {
  reportes: 'reporte.estado_cambiado',
  activos: 'activo.estado_cambiado',
  productos: 'producto.estado_cambiado',
  fichas: 'ficha_valoracion.estado_cambiado',
  oportunidades: 'oportunidad.estado_cambiado',
  comercios: 'comercio.estado_cambiado',
  patrimonio: 'patrimonio.custodiado',
  ingestas: 'ingesta.estado_cambiado',
};

/** Estados pendientes LISTABLES por dominio (AR3): solo lo que la API expone. */
export const ESTADOS_PENDIENTES_A3 = {
  reportes: ['received', 'evaluating'],
  fichas: ['testimonio'],
  oportunidades: ['detected', 'under_review'],
  activos: ['propuesto'],
} as const;

/** Resumen público del activo (GET /api/activos — cola de propuestos AR3). */
export interface ActivoResumen {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  nodo_key: string;
  subnodo_key: string | null;
  lat: number | null;
  lng: number | null;
  is_synthetic: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Validadores de pre-check (la API sigue siendo la compuerta real)    */
/* ------------------------------------------------------------------ */

/** ADR-038: la justificación pública es OBLIGATORIA (>=10 chars). */
export function validarJustificacion(justificacion: string): string | null {
  const limpia = justificacion.trim();
  if (limpia.length < 10) {
    return 'ADR-038: la transición exige justificación pública (mínimo 10 caracteres)';
  }
  return null;
}

/** El motivo de moderación es opcional (<=500 chars) en productos/fichas/oportunidades/ingestas. */
export function validarMotivo(motivo: string | undefined): string | null {
  if (motivo === undefined || motivo === null) {
    return null;
  }
  if (motivo.trim().length > 500) {
    return 'el motivo admite hasta 500 caracteres';
  }
  return null;
}

/** Salto válido de reporte contra la matriz espejo (la API decide igual). */
export function validarTransicionReporte(desde: EstadoReporte, hacia: EstadoReporte): string | null {
  if (!REPORTE_TRANSICIONES_A3[desde].includes(hacia)) {
    return "transición inválida: '" + desde + "' -> '" + hacia + "' no está en la matriz del ciclo (ADR-038)";
  }
  return null;
}

/** Salto válido de oportunidad contra la matriz espejo del Bloque 9. */
export function validarTransicionOportunidad(
  desde: EstadoOportunidad,
  hacia: EstadoOportunidad
): string | null {
  if (!OPORTUNIDAD_TRANSICIONES_A3[desde].includes(hacia)) {
    return "transición inválida: '" + desde + "' -> '" + hacia + "' (ciclo de vida Bloque 9)";
  }
  return null;
}

/** Avance válido del pipeline de ingestas (forward-only). */
export function validarTransicionIngesta(desde: EstadoIngesta, hacia: EstadoIngesta): string | null {
  if (!INGESTA_TRANSICIONES_A3[desde].includes(hacia)) {
    return "transición inválida: '" + desde + "' -> '" + hacia + "' (pipeline de procedencia #147)";
  }
  return null;
}

/** Salto válido de comercio contra la matriz espejo (MK-1 #243). */
export function validarTransicionComercio(desde: EstadoComercio, hacia: EstadoComercio): string | null {
  if (!COMERCIO_TRANSICIONES_A3[desde].includes(hacia)) {
    return "transición inválida: '" + desde + "' -> '" + hacia + "' (matriz COMERCIO_TRANSICIONES, #243)";
  }
  return null;
}

/** Corroborar una ficha exige declarar la instancia (refine #149). */
export function validarCambioFicha(
  estado: 'corroborada' | 'descartada',
  corroboracion: CorroboracionFicha | undefined
): string | null {
  if (estado === 'corroborada' && corroboracion === undefined) {
    return 'corroboracion es requerida para corroborar una ficha (individual|taller_comunitario)';
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Tipos del dominio A3 (espejo EXACTO de @delocalsoy/contracts)       */
/* Los tipos compartidos con A1 (ReportePublico, FichaPublica,          */
/* Oportunidad, KpiSnapshot, ProductoCatalogo, TransicionReporte)       */
/* viven en artefactoA1.ts — UNA sola fuente web de los contratos.      */
/* ------------------------------------------------------------------ */

export interface FuenteEspacial {
  key: string;
  organismo: string;
  nombre: string;
  url: string | null;
  tipo: string;
  licencia: string | null;
  estado: string;
  cautela: string;
}

export interface Ingesta {
  id: string;
  source_id: string;
  fuente_key: string;
  nodo_key: string;
  capa_servicio: string;
  fecha_acceso: string;
  fecha_corte: string;
  licencia: string | null;
  crs_origen: string;
  crs_normalizado: string;
  escala_precision: string;
  external_id: string | null;
  transformaciones: string | null;
  estado: EstadoIngesta;
}

/** IngestaAltaSchema (NC-EV-09): sin fuente/fecha de corte/precisión no hay ingesta. */
export interface NuevaIngesta {
  source_id: string;
  fuente_key: string;
  nodo_key: string;
  capa_servicio: string;
  fecha_acceso: string;
  fecha_corte: string;
  licencia?: string;
  crs_origen: string;
  crs_normalizado: string;
  escala_precision: string;
  external_id?: string;
  transformaciones?: string;
}

export type ProteccionNivel =
  | 'nacional_decreto'
  | 'nacional_ley'
  | 'provincial_ley'
  | 'municipal'
  | 'sin_declaratoria';

export type SensibleStatus = 'sin_relevamiento' | 'relevado_restringido';

export type VisibilidadActivo = 'public' | 'generalized' | 'restricted';

export interface ReglaAcceso {
  regla: string;
  fuente: string;
}

/** Ficha patrimonial PÚBLICA (PatrimonioFichaSchema): SIN sensible/sensible_nota (ADR-036). */
export interface FichaPatrimonio {
  activo_id: string;
  titulo: string;
  tipo: string;
  proteccion_nivel: ProteccionNivel | string;
  proteccion_norma: string;
  conservacion_estado: string | null;
  acceso_lat: number | null;
  acceso_lng: number | null;
  reglas_acceso: ReglaAcceso[];
  sensible_status: SensibleStatus | string;
  visibilidad: VisibilidadActivo | string;
}

/** PatrimonioCustodiaSchema: TODO opcional — solo las claves presentes viajan. */
export interface CambioCustodia {
  proteccion_nivel?: ProteccionNivel;
  proteccion_norma?: string;
  conservacion_estado?: string;
  acceso_lat?: number;
  acceso_lng?: number;
  reglas_acceso?: ReglaAcceso[];
  sensible?: Record<string, unknown>;
  sensible_status?: SensibleStatus;
  /** Solo canal de gestión (ADR-036): se escribe, JAMÁS vuelve por GET. */
  sensible_nota?: string;
  visibilidad?: VisibilidadActivo;
}

/* ------------------------------------------------------------------ */
/* Cliente puro                                                       */
/* ------------------------------------------------------------------ */

export type TransporteSesion = (
  ruta: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface ClienteA3 {
  // Bandeja de reportes (lectura pública SIN 'descartado' — hallazgo 4)
  reportesDeNodo(nodoKey: string): Promise<ReportePublico[]>;
  historialReporte(reporteId: string): Promise<TransicionReporte[]>;
  moderarReporte(reporteId: string, estado: EstadoReporte, justificacion: string): Promise<ReportePublico>;
  // Productos (moderador|admin)
  productosDeActivo(activoId: string): Promise<ProductoCatalogo[]>;
  moderarProducto(
    productoId: string,
    estado: 'aprobado' | 'rechazado' | 'archivado',
    motivo?: string
  ): Promise<ProductoCatalogo>;
  // Fichas de valoración (moderador|admin)
  fichas(filtros?: { nodo?: string; estado?: 'corroborada' | 'testimonio' }): Promise<FichaPublica[]>;
  moderarFicha(
    fichaId: string,
    estado: 'corroborada' | 'descartada',
    corroboracion?: CorroboracionFicha,
    motivo?: string
  ): Promise<FichaPublica>;
  // Oportunidades Bloque 9 (moderador|admin)
  oportunidades(filtros?: { nodo?: string; tipo?: string; estado?: string; subnodo?: string }): Promise<Oportunidad[]>;
  moderarOportunidad(oportunidadId: string, estado: EstadoOportunidad, motivo?: string): Promise<Oportunidad>;
  // Custodia patrimonial (moderador|admin)
  patrimonioFicha(activoId: string): Promise<FichaPatrimonio>;
  custodiarPatrimonio(activoId: string, cambio: CambioCustodia): Promise<FichaPatrimonio>;
  // Fuentes + pipeline de ingestas (alta/avance: SOLO admin)
  fuentes(): Promise<FuenteEspacial[]>;
  ingestasPublicadas(nodo?: string): Promise<Ingesta[]>;
  crearIngesta(nueva: NuevaIngesta): Promise<{ ingesta: Ingesta; idempotente: boolean }>;
  avanzarIngesta(ingestaId: string, estado: EstadoIngesta, motivo?: string): Promise<Ingesta>;
  // KPIs del nodo (público)
  kpis(nodoKey: string): Promise<KpiSnapshot[]>;
  // Cola unificada AR3 (#402): activos propuestos (lectura pública ?estado=propuesto)
  activosPropuestos(filtros?: { nodo?: string }): Promise<ActivoResumen[]>;
  moderarActivo(activoId: string, estado: 'aprobado' | 'rechazado' | 'archivado', motivo?: string): Promise<ActivoResumen>;
  // Comercios (MK-2 en main): moderación POR ID — los propuestos NO son listables
  moderarComercio(comercioId: string, estado: EstadoComercio, justificacion: string): Promise<{ id: string; estado: string }>;
}

export interface OpcionesClienteA3 {
  transporte: TransporteSesion;
  token: () => string | null;
  baseReportes?: string;
  baseNodos?: string;
  baseFichas?: string;
  baseOportunidades?: string;
  baseActivos?: string;
  baseProductos?: string;
  basePatrimonio?: string;
  baseFuentes?: string;
  baseComercios?: string;
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

/* ------------------------------------------------------------------ */
/* Parsers locales (los tipos compartidos viven en artefactoA1; los   */
/* parsers de A3 son propios para no acoplar los clientes entre sí)     */
/* ------------------------------------------------------------------ */

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

function parseFicha(crudo: Record<string, unknown>): FichaPublica {
  return {
    id: texto(crudo.id),
    nodo_key: texto(crudo.nodo_key),
    feature_id: texto(crudo.feature_id),
    version: texto(crudo.version),
    respuestas: (crudo.respuestas ?? {}) as Record<string, unknown>,
    estado: texto(crudo.estado),
    corroboracion:
      crudo.corroboracion === null || crudo.corroboracion === undefined
        ? null
        : texto(crudo.corroboracion),
    created_by_hash: texto(crudo.created_by_hash),
    created_at: texto(crudo.created_at),
    updated_at: texto(crudo.updated_at),
    feature_titulo:
      crudo.feature_titulo === null || crudo.feature_titulo === undefined
        ? null
        : texto(crudo.feature_titulo),
    feature_lat:
      crudo.feature_lat === null || crudo.feature_lat === undefined ? null : numeroOnulo(crudo.feature_lat),
    feature_lng:
      crudo.feature_lng === null || crudo.feature_lng === undefined ? null : numeroOnulo(crudo.feature_lng),
    feature_is_synthetic:
      crudo.feature_is_synthetic === null || crudo.feature_is_synthetic === undefined
        ? null
        : crudo.feature_is_synthetic === true,
    feature_fuente_label:
      crudo.feature_fuente_label === null || crudo.feature_fuente_label === undefined
        ? null
        : texto(crudo.feature_fuente_label),
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
    subnodo_key:
      crudo.subnodo_key === null || crudo.subnodo_key === undefined ? null : texto(crudo.subnodo_key),
    evidencia: (crudo.evidencia ?? {}) as Record<string, unknown>,
    actores: Array.isArray(crudo.actores) ? (crudo.actores as Array<Record<string, unknown>>) : [],
    tags: Array.isArray(crudo.tags)
      ? (crudo.tags as unknown[]).map((t) => texto(t)).filter((t) => t !== '')
      : [],
    created_by_hash: texto(crudo.created_by_hash),
    created_at: texto(crudo.created_at),
    updated_at: texto(crudo.updated_at),
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

function parseProducto(crudo: Record<string, unknown>): ProductoCatalogo {
  return {
    id: texto(crudo.id),
    activo_id: texto(crudo.activo_id),
    slug: texto(crudo.slug),
    nombre: texto(crudo.nombre),
    categoria: crudo.categoria === null || crudo.categoria === undefined ? null : texto(crudo.categoria),
    temporada_meses: Array.isArray(crudo.temporada_meses)
      ? (crudo.temporada_meses as unknown[]).map((m) => (typeof m === 'number' ? m : 0)).filter((m) => m >= 1 && m <= 12)
      : [],
    estado: texto(crudo.estado),
    created_by_hash: texto(crudo.created_by_hash),
    created_at: texto(crudo.created_at),
  };
}

function parseActivoResumen(crudo: Record<string, unknown>): ActivoResumen {
  return {
    id: texto(crudo.id),
    tipo: texto(crudo.tipo),
    titulo: texto(crudo.titulo),
    descripcion: textoOnulo(crudo.descripcion),
    estado: texto(crudo.estado),
    nodo_key: texto(crudo.nodo_key),
    subnodo_key: textoOnulo(crudo.subnodo_key),
    lat: numeroOnulo(crudo.lat),
    lng: numeroOnulo(crudo.lng),
    is_synthetic: crudo.is_synthetic === true,
    created_at: texto(crudo.created_at),
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

export function crearClienteA3(opts: OpcionesClienteA3): ClienteA3 {
  const baseReportes: string = opts.baseReportes ?? '/api/reportes';
  const baseNodos: string = opts.baseNodos ?? '/api/nodos';
  const baseFichas: string = opts.baseFichas ?? '/api/fichas-valoracion';
  const baseOportunidades: string = opts.baseOportunidades ?? '/api/oportunidades';
  const baseActivos: string = opts.baseActivos ?? '/api/activos';
  const baseProductos: string = opts.baseProductos ?? '/api/productos';
  const basePatrimonio: string = opts.basePatrimonio ?? '/api/patrimonio';
  const baseFuentes: string = opts.baseFuentes ?? '/api';
  const baseComercios: string = opts.baseComercios ?? '/api/comercios';

  const llamar = async (
    ruta: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ) => {
    try {
      return await opts.transporte(ruta, init);
    } catch {
      throw new ErrorA3('no_disponible', 'no se pudo contactar la plataforma');
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
      throw new ErrorA3('no_disponible', 'respuesta malformada de la plataforma');
    }
  };

  const headersToken = (): Record<string, string> => {
    const token = opts.token();
    if (!token) {
      throw new ErrorA3('credenciales', 'se requiere sesión iniciada para esta acción');
    }
    return { Authorization: 'Bearer ' + token };
  };

  /** Lectura pública: 200 -> data · 404/400/otro -> error tipado (R5). */
  const lectura = async (ruta: string): Promise<unknown> => {
    const res = await llamar(ruta);
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      if (cuerpo.data === undefined) {
        throw new ErrorA3('no_disponible', 'respuesta malformada (HTTP 200 sin data)');
      }
      return cuerpo.data;
    }
    const mensaje = texto(cuerpo.error);
    if (res.status === 404) {
      throw new ErrorA3('no_encontrado', mensaje || 'no encontrado');
    }
    if (res.status === 400) {
      throw new ErrorA3('datos', mensaje || 'datos inválidos');
    }
    if (res.status === 429) {
      throw new ErrorA3('no_disponible', 'demasiados intentos — esperá un momento (techo por rol)');
    }
    throw new ErrorA3('no_disponible', mensaje || 'HTTP ' + res.status);
  };

  const lista = (crudo: unknown): Array<Record<string, unknown>> => {
    if (Array.isArray(crudo)) {
      return crudo as Array<Record<string, unknown>>;
    }
    throw new ErrorA3('no_disponible', 'respuesta malformada (se esperaba una lista)');
  };

  /**
   * Mapeo honesto de la moderación (PATCH): 200 ok · 400 zod/PII/salto ·
   * 401 sin sesión · 403 rol insuficiente · 404 · 409 mismo estado · resto.
   */
  const moderar = async (ruta: string, body: unknown): Promise<Record<string, unknown>> => {
    const res = await llamar(ruta, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headersToken() },
      body: JSON.stringify(body),
    });
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      if (!cuerpo.data || typeof cuerpo.data !== 'object') {
        throw new ErrorA3('no_disponible', 'respuesta malformada del cambio de estado');
      }
      return cuerpo.data as Record<string, unknown>;
    }
    const mensaje = texto(cuerpo.error);
    if (res.status === 400) {
      if (mensaje.includes('datos personales identificables')) {
        throw new ErrorA3('pii', mensaje);
      }
      if (mensaje.includes('transición inválida')) {
        throw new ErrorA3('transicion', mensaje);
      }
      throw new ErrorA3('datos', mensaje || 'datos inválidos');
    }
    if (res.status === 401) {
      throw new ErrorA3('credenciales', 'sesión no válida — iniciá sesión de nuevo');
    }
    if (res.status === 403) {
      throw new ErrorA3('permiso', 'el rol no habilita esta moderación (API: moderador|admin)');
    }
    if (res.status === 404) {
      throw new ErrorA3('no_encontrado', mensaje || 'no encontrado');
    }
    if (res.status === 409) {
      throw new ErrorA3('ya_estado', mensaje || 'ya está en ese estado');
    }
    if (res.status === 429) {
      throw new ErrorA3('no_disponible', 'demasiados intentos — esperá un momento (techo por rol)');
    }
    throw new ErrorA3('no_disponible', mensaje || 'HTTP ' + res.status);
  };

  /** Alta de ingesta (admin): 201 nueva · 200 idempotente · resto error. */
  const altaIngesta = async (
    ruta: string,
    body: unknown
  ): Promise<{ ingesta: Record<string, unknown>; idempotente: boolean }> => {
    const res = await llamar(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headersToken() },
      body: JSON.stringify(body),
    });
    const cuerpo = await leerJson(res);
    if (res.status === 201 || res.status === 200) {
      if (!cuerpo.data || typeof cuerpo.data !== 'object') {
        throw new ErrorA3('no_disponible', 'respuesta malformada del alta');
      }
      return {
        ingesta: cuerpo.data as Record<string, unknown>,
        idempotente: res.status === 200 || cuerpo.idempotente === true,
      };
    }
    const mensaje = texto(cuerpo.error);
    if (res.status === 400) {
      if (mensaje.includes('datos personales identificables')) {
        throw new ErrorA3('pii', mensaje);
      }
      throw new ErrorA3('datos', mensaje || 'datos inválidos');
    }
    if (res.status === 401) {
      throw new ErrorA3('credenciales', 'sesión no válida — iniciá sesión de nuevo');
    }
    if (res.status === 403) {
      throw new ErrorA3('permiso', 'la ingesta curada exige rol admin (decisión DH 2026-10-15)');
    }
    if (res.status === 404) {
      throw new ErrorA3('no_encontrado', mensaje || 'fuente no encontrada en el catálogo de procedencia');
    }
    if (res.status === 429) {
      throw new ErrorA3('no_disponible', 'demasiados intentos — esperá un momento (techo por rol)');
    }
    throw new ErrorA3('no_disponible', mensaje || 'HTTP ' + res.status);
  };

  const reportesDeNodo = async (nodoKey: string): Promise<ReportePublico[]> => {
    const data = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/reportes');
    return lista(data).map(parseReporte);
  };

  const historialReporte = async (reporteId: string): Promise<TransicionReporte[]> => {
    const data = await lectura(baseReportes + '/' + encodeURIComponent(reporteId) + '/historial');
    const envuelto = data as Record<string, unknown>;
    return lista(envuelto.transiciones).map(parseTransicion);
  };

  const moderarReporte = async (
    reporteId: string,
    estado: EstadoReporte,
    justificacion: string
  ): Promise<ReportePublico> => {
    const crudo = await moderar(
      baseReportes + '/' + encodeURIComponent(reporteId) + '/estado',
      { estado, justificacion }
    );
    return parseReporte(crudo);
  };

  const productosDeActivo = async (activoId: string): Promise<ProductoCatalogo[]> => {
    const data = await lectura(baseActivos + '/' + encodeURIComponent(activoId) + '/productos');
    return lista(data).map(parseProducto);
  };

  const moderarProducto = async (
    productoId: string,
    estado: 'aprobado' | 'rechazado' | 'archivado',
    motivo?: string
  ): Promise<ProductoCatalogo> => {
    const cuerpo: Record<string, unknown> = { estado };
    if (motivo !== undefined && motivo.trim() !== '') {
      cuerpo.motivo = motivo.trim();
    }
    const crudo = await moderar(baseProductos + '/' + encodeURIComponent(productoId) + '/estado', cuerpo);
    return parseProducto(crudo);
  };

  const fichas = async (filtros?: {
    nodo?: string;
    estado?: 'corroborada' | 'testimonio';
  }): Promise<FichaPublica[]> => {
    const data = await lectura(baseFichas + query({ nodo: filtros?.nodo, estado: filtros?.estado }));
    return lista(data).map(parseFicha);
  };

  const moderarFicha = async (
    fichaId: string,
    estado: 'corroborada' | 'descartada',
    corroboracion?: CorroboracionFicha,
    motivo?: string
  ): Promise<FichaPublica> => {
    const cuerpo: Record<string, unknown> = { estado };
    if (corroboracion !== undefined) {
      cuerpo.corroboracion = corroboracion;
    }
    if (motivo !== undefined && motivo.trim() !== '') {
      cuerpo.motivo = motivo.trim();
    }
    const crudo = await moderar(baseFichas + '/' + encodeURIComponent(fichaId) + '/estado', cuerpo);
    return parseFicha(crudo);
  };

  const oportunidades = async (filtros?: {
    nodo?: string;
    tipo?: string;
    estado?: string;
    subnodo?: string;
  }): Promise<Oportunidad[]> => {
    const data = await lectura(
      baseOportunidades + query({ nodo: filtros?.nodo, tipo: filtros?.tipo, estado: filtros?.estado, subnodo: filtros?.subnodo })
    );
    return lista(data).map(parseOportunidad);
  };

  const moderarOportunidad = async (
    oportunidadId: string,
    estado: EstadoOportunidad,
    motivo?: string
  ): Promise<Oportunidad> => {
    const cuerpo: Record<string, unknown> = { estado };
    if (motivo !== undefined && motivo.trim() !== '') {
      cuerpo.motivo = motivo.trim();
    }
    const crudo = await moderar(
      baseOportunidades + '/' + encodeURIComponent(oportunidadId) + '/estado',
      cuerpo
    );
    return parseOportunidad(crudo);
  };

  const patrimonioFicha = async (activoId: string): Promise<FichaPatrimonio> => {
    const data = await lectura(basePatrimonio + '/' + encodeURIComponent(activoId));
    return parseFichaPatrimonio(data as Record<string, unknown>);
  };

  const custodiarPatrimonio = async (
    activoId: string,
    cambio: CambioCustodia
  ): Promise<FichaPatrimonio> => {
    // Solo las claves presentes viajan: el Zod de la API rechaza null
    // explícito en opcionales (misma lección de sesion.ts register).
    const cuerpo: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(cambio)) {
      if (valor !== undefined) {
        cuerpo[clave] = valor;
      }
    }
    const crudo = await moderar(basePatrimonio + '/' + encodeURIComponent(activoId), cuerpo);
    return parseFichaPatrimonio(crudo);
  };

  const fuentes = async (): Promise<FuenteEspacial[]> => {
    const data = await lectura(baseFuentes + '/fuentes');
    return lista(data).map(parseFuente);
  };

  const ingestasPublicadas = async (nodo?: string): Promise<Ingesta[]> => {
    const data = await lectura(baseFuentes + '/ingestas' + query({ nodo }));
    return lista(data).map(parseIngesta);
  };

  const crearIngesta = async (nueva: NuevaIngesta): Promise<{ ingesta: Ingesta; idempotente: boolean }> => {
    const { ingesta, idempotente } = await altaIngesta(baseFuentes + '/ingestas', nueva);
    return { ingesta: parseIngesta(ingesta), idempotente };
  };

  const avanzarIngesta = async (ingestaId: string, estado: EstadoIngesta, motivo?: string): Promise<Ingesta> => {
    const cuerpo: Record<string, unknown> = { estado };
    if (motivo !== undefined && motivo.trim() !== '') {
      cuerpo.motivo = motivo.trim();
    }
    const crudo = await moderar(
      baseFuentes + '/ingestas/' + encodeURIComponent(ingestaId) + '/estado',
      cuerpo
    );
    return parseIngesta(crudo);
  };

  const kpis = async (nodoKey: string): Promise<KpiSnapshot[]> => {
    const data = await lectura(baseNodos + '/' + encodeURIComponent(nodoKey) + '/kpis');
    return lista(data).map(parseKpi);
  };

  const activosPropuestos = async (filtros?: { nodo?: string }): Promise<ActivoResumen[]> => {
    const data = await lectura(baseActivos + query({ estado: 'propuesto', nodo: filtros?.nodo }));
    return lista(data).map(parseActivoResumen);
  };

  const moderarActivo = async (
    activoId: string,
    estado: 'aprobado' | 'rechazado' | 'archivado',
    motivo?: string
  ): Promise<ActivoResumen> => {
    const cuerpo: Record<string, unknown> = { estado };
    if (motivo !== undefined && motivo.trim() !== '') {
      cuerpo.motivo = motivo.trim();
    }
    const crudo = await moderar(baseActivos + '/' + encodeURIComponent(activoId) + '/estado', cuerpo);
    return parseActivoResumen(crudo);
  };

  const moderarComercio = async (
    comercioId: string,
    estado: EstadoComercio,
    justificacion: string
  ): Promise<{ id: string; estado: string }> => {
    const crudo = await moderar(baseComercios + '/' + encodeURIComponent(comercioId) + '/estado', {
      estado,
      justificacion,
    });
    return { id: texto(crudo.id), estado: texto(crudo.estado) };
  };

  return {
    reportesDeNodo,
    historialReporte,
    moderarReporte,
    productosDeActivo,
    moderarProducto,
    fichas,
    moderarFicha,
    oportunidades,
    moderarOportunidad,
    patrimonioFicha,
    custodiarPatrimonio,
    fuentes,
    ingestasPublicadas,
    crearIngesta,
    avanzarIngesta,
    kpis,
    activosPropuestos,
    moderarActivo,
    moderarComercio,
  };
}

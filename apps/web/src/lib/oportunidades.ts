// Vista del nodo Capital — normalización de los dominios de la cascada
// NODO-CAPITAL (NCAP-FE #163, ratificada DH 2026-11-05):
//  - oportunidades (NCAP-R6 #158 + ext #165, GET /api/oportunidades);
//  - corredores v0.1 (NCAP-R4 #156, GET /api/corredores);
//  - accesibilidad peatonal (NCAP-R5 #157, GET /api/nodos/:key/accesibilidad).
// R5: nada se inventa — null ≠ 0, el error es error y la lista vacía es un
// dato honesto. 'discarded' nunca llega: la API no lo publica (R15).
// La matriz de transiciones ES la canónica de la API (routes/oportunidades.ts,
// NCAP-R6 #158): copia citada para VISUALIZACIÓN de solo lectura — la
// escritura exige moderación autenticada (R8) y este módulo jamás simula
// persistencia del lado del cliente (R15).

export type OportunidadTipo =
  | 'human_capacity'
  | 'productive_capacity'
  | 'physical_asset'
  | 'institutional_asset'
  | 'cultural_asset'
  | 'detected_demand'
  | 'market_gap'
  | 'partnership_opportunity'
  | 'investment_opportunity'
  | 'policy_opportunity'
  | (string & {});

export type OportunidadEstado =
  | 'detected'
  | 'under_review'
  | 'validated'
  | 'prioritized'
  | 'in_development'
  | 'active'
  | 'implemented'
  | 'paused'
  | 'discarded'
  | 'archived'
  | (string & {});

export interface OportunidadEvidencia {
  evidence_type: string;
  descripcion: string;
  reference_url: string | null;
  validationStatus: string | null; // null = sin veredicto de moderación aún (R15)
}

export interface OportunidadActor {
  role: string;
  name: string | null; // null = rol sin nombre público (Ley 25.326, ADR-027)
  consent_confirmed: boolean;
}

export interface OportunidadScoring {
  territorial_impact: string;
  feasibility: string;
  urgency: string;
  metodo: string;
  fuente: string | null;
}

export interface OportunidadTerritorialContext {
  corridor_id: string;
  landmark_id: string | null;
  service_area_name: string | null;
}

export interface OportunidadItem {
  id: string;
  tipo: OportunidadTipo;
  titulo: string;
  descripcion: string;
  estado: OportunidadEstado;
  nodo_key: string;
  subnodo_key: string | null;
  evidencia: OportunidadEvidencia;
  actores: OportunidadActor[];
  tags: string[];
  scoring: OportunidadScoring | null; // null = sin interpretación declarada (R15)
  territorial_context: OportunidadTerritorialContext | null;
  created_at: string;
  updated_at: string;
}

export interface OportunidadesQuery {
  nodo?: string;
  tipo?: string;
  estado?: string;
  subnodo?: string;
  limit?: number;
  offset?: number;
}

export interface CorredorItem {
  key: string;
  label: string;
  proposito: string;
  status: string; // candidate | mapped | validated | retired (NCAP-R4)
  nodo_key: string;
  segmentos_count: number;
  hitos_count: number;
  continuidad: string; // ok | ruptura (criterio de cierre #156)
}

export interface ConteoPorEstado {
  capa: string;
  total: number;
  por_estado: Record<string, number>;
}

export interface ConteoFuente {
  fuente: string;
  total: number;
}

export interface ConteoCategoria {
  categoria: string;
  total: number;
}

export interface AccesibilidadTramos {
  priorizados: number;
  con_relevamiento: number;
  cobertura: string;
  fecha_corte: string | null;
  cautela: string;
}

export interface AccesibilidadObservaciones {
  ingresadas: number;
  revisadas: number;
  corroboradas: number;
  disputadas: number;
  ilustrativas: number;
  fecha_corte: string | null;
}

export interface AccesibilidadHito {
  key: string;
  label: string;
  tipo: string;
  con_ficha: boolean;
  ultima_revision: string | null;
}

export interface AccesibilidadResumen {
  nodo_key: string;
  generado_en: string;
  regla: string;
  features_por_capa: ConteoPorEstado[];
  features_por_fuente: ConteoFuente[];
  reportes_por_categoria: ConteoCategoria[];
  tramos_vereda: AccesibilidadTramos;
  observaciones: AccesibilidadObservaciones;
  hitos: AccesibilidadHito[];
}

// Etiquetas honestas (R15): un vocabulario futuro se muestra tal cual —
// jamás se recorta el vocabulario ni se inventa una etiqueta.
export const ETIQUETAS_TIPO: Record<string, string> = {
  human_capacity: 'Capacidad humana',
  productive_capacity: 'Capacidad productiva',
  physical_asset: 'Activo físico / espacio',
  institutional_asset: 'Activo institucional',
  cultural_asset: 'Activo cultural y patrimonial',
  detected_demand: 'Demanda comunitaria detectada',
  market_gap: 'Brecha de mercado local',
  partnership_opportunity: 'Oportunidad de alianza',
  investment_opportunity: 'Oportunidad de inversión',
  policy_opportunity: 'Iniciativa de política pública',
};

export const ETIQUETAS_ESTADO: Record<string, string> = {
  detected: 'Detectada',
  under_review: 'En revisión técnica',
  validated: 'Validada',
  prioritized: 'Priorizada',
  in_development: 'En desarrollo',
  active: 'Activa y operativa',
  implemented: 'Concretada',
  paused: 'Pausada',
  discarded: 'Descartada',
  archived: 'Archivada',
};

export const ETIQUETAS_EVIDENCIA: Record<string, string> = {
  community_input: 'Aporte comunitario',
  survey: 'Encuesta',
  platform_data: 'Datos de la plataforma',
  field_observation: 'Observación de campo',
  institutional_document: 'Documento institucional',
  news_source: 'Fuente periodística',
  statistical_source: 'Fuente estadística',
};

export const ETIQUETAS_VALIDACION: Record<string, string> = {
  pending: 'Pendiente de revisión',
  corroborated: 'Corroborada',
  reviewed: 'Revisada',
};

export const ETIQUETAS_ROL: Record<string, string> = {
  proposer: 'Proponente',
  beneficiary: 'Beneficiario',
  provider: 'Ofrece',
  partner: 'Aliado',
  validator: 'Validador',
  supporter: 'Adhesión',
};

export const ETIQUETAS_CONTINUIDAD: Record<string, string> = {
  ok: 'Continuidad revisada: ok',
  ruptura: 'Continuidad revisada: ruptura',
};

// Estados del ciclo de vida PUBLICABLES (NCAP-R6): 'discarded' nunca se
// publica ni se ofrece como filtro — la API lo excluye de la lectura pública.
export const ESTADOS_PUBLICOS: string[] = [
  'detected',
  'under_review',
  'validated',
  'prioritized',
  'in_development',
  'active',
  'implemented',
  'paused',
  'archived',
];

// Matriz de transiciones CANÓNICA de la API (apps/api/src/routes/
// oportunidades.ts, NCAP-R6 #158): copia citada para visualización de solo
// lectura — si la API la extiende, esta copia se actualiza en el mismo PR
// (no deriva en silencio). 'discarded' solo aparece como destino lateral
// que la moderación puede tomar; nunca como estado publicado.
export const OPORTUNIDAD_TRANSICIONES: Record<string, readonly string[]> = {
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

// Camino principal del ciclo de vida (Bloque 9): detected → … → implemented;
// paused/discarded/archived son estados laterales fuera del camino.
export const SECUENCIA_CICLO: string[] = [
  'detected',
  'under_review',
  'validated',
  'prioritized',
  'in_development',
  'active',
  'implemented',
];

export function etiquetaTipo(tipo: string): string {
  return ETIQUETAS_TIPO[tipo] ?? tipo;
}

export function etiquetaEstado(estado: string): string {
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

export function etiquetaEvidencia(tipo: string): string {
  return ETIQUETAS_EVIDENCIA[tipo] ?? tipo;
}

export function etiquetaValidacion(estado: string | null): string {
  if (estado === null) return 'Sin veredicto de moderación aún';
  return ETIQUETAS_VALIDACION[estado] ?? estado;
}

export function etiquetaRol(rol: string): string {
  return ETIQUETAS_ROL[rol] ?? rol;
}

export function etiquetaContinuidad(continuidad: string): string {
  return ETIQUETAS_CONTINUIDAD[continuidad] ?? continuidad;
}

// Origen de una oportunidad en la paridad sintética: el título lleva
// [SINTÉTICO] (R15: lo sintético jamás se disfraza de registro real).
export function esSinteticaOportunidad(o: OportunidadItem): boolean {
  return o.titulo.startsWith('[SINTÉTICO]');
}

// ─── Normalización (formas reales de la API) ───

function extraerData(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray((payload as Record<string, unknown>).data)
  ) {
    return (payload as Record<string, unknown>).data as unknown[];
  }
  return [];
}

function comoTexto(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  return String(value);
}

function comoTextoNulo(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : String(value);
}

function comoNumero(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function comoArreglo(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function comoConteos(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null) return {};
  const out: Record<string, number> = {};
  for (const entrada of Object.entries(value as Record<string, unknown>)) {
    out[entrada[0]] = comoNumero(entrada[1]);
  }
  return out;
}

function normalizarEvidencia(value: unknown): OportunidadEvidencia {
  const r = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    evidence_type: comoTexto(r.evidence_type),
    descripcion: comoTexto(r.descripcion),
    reference_url: comoTextoNulo(r.reference_url),
    validationStatus: comoTextoNulo(r.validationStatus),
  };
}

function normalizarActores(value: unknown): OportunidadActor[] {
  return comoArreglo(value).map((a) => {
    const r = (typeof a === 'object' && a !== null ? a : {}) as Record<string, unknown>;
    return {
      role: comoTexto(r.role),
      name: comoTextoNulo(r.name),
      consent_confirmed: r.consent_confirmed === true,
    };
  });
}

export function normalizarOportunidades(payload: unknown): OportunidadItem[] {
  return extraerData(payload)
    .map((o): OportunidadItem | null => {
      if (typeof o !== 'object' || o === null) return null;
      const r = o as Record<string, unknown>;
      const scoring: OportunidadScoring | null =
        typeof r.scoring === 'object' && r.scoring !== null
          ? (() => {
              const s = r.scoring as Record<string, unknown>;
              return {
                territorial_impact: comoTexto(s.territorial_impact),
                feasibility: comoTexto(s.feasibility),
                urgency: comoTexto(s.urgency),
                metodo: comoTexto(s.metodo),
                fuente: comoTextoNulo(s.fuente),
              };
            })()
          : null;
      const contexto: OportunidadTerritorialContext | null =
        typeof r.territorial_context === 'object' && r.territorial_context !== null
          ? (() => {
              const c = r.territorial_context as Record<string, unknown>;
              return {
                corridor_id: comoTexto(c.corridor_id),
                landmark_id: comoTextoNulo(c.landmark_id),
                service_area_name: comoTextoNulo(c.service_area_name),
              };
            })()
          : null;
      return {
        id: comoTexto(r.id),
        tipo: comoTexto(r.tipo) as OportunidadTipo,
        titulo: comoTexto(r.titulo),
        descripcion: comoTexto(r.descripcion),
        estado: comoTexto(r.estado) as OportunidadEstado,
        nodo_key: comoTexto(r.nodo_key),
        subnodo_key: comoTextoNulo(r.subnodo_key),
        evidencia: normalizarEvidencia(r.evidencia),
        actores: normalizarActores(r.actores),
        tags: comoArreglo(r.tags).map((t) => comoTexto(t)),
        scoring,
        territorial_context: contexto,
        created_at: comoTexto(r.created_at),
        updated_at: comoTexto(r.updated_at),
      };
    })
    .filter((o): o is OportunidadItem => o !== null);
}

export function normalizarCorredores(payload: unknown): CorredorItem[] {
  return extraerData(payload)
    .map((c): CorredorItem | null => {
      if (typeof c !== 'object' || c === null) return null;
      const r = c as Record<string, unknown>;
      return {
        key: comoTexto(r.key),
        label: comoTexto(r.label),
        proposito: comoTexto(r.proposito),
        status: comoTexto(r.status),
        nodo_key: comoTexto(r.nodo_key),
        segmentos_count: comoNumero(r.segmentos_count),
        hitos_count: comoNumero(r.hitos_count),
        continuidad: comoTexto(r.continuidad),
      };
    })
    .filter((c): c is CorredorItem => c !== null);
}

/**
 * Normaliza el objeto data de GET /api/nodos/:key/accesibilidad (NCAP-R5):
 * conteos CON cobertura y fecha — jamás puntajes globales (R5/ADR-036).
 * Recibe el objeto data (la validación de la envoltura success/data es del
 * ApiDataSource, R5); los arreglos ausentes se mapean a [] y los conteos a 0
 * SOLO porque la forma es contrato fijo de la misma ruta del propio repo.
 */
export function normalizarAccesibilidad(data: unknown): AccesibilidadResumen {
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const tramos = (typeof d.tramos_vereda === 'object' && d.tramos_vereda !== null ? d.tramos_vereda : {}) as Record<string, unknown>;
  const obs = (typeof d.observaciones === 'object' && d.observaciones !== null ? d.observaciones : {}) as Record<string, unknown>;
  return {
    nodo_key: comoTexto(d.nodo_key),
    generado_en: comoTexto(d.generado_en),
    regla: comoTexto(d.regla),
    features_por_capa: comoArreglo(d.features_por_capa).map((c) => {
      const r = (typeof c === 'object' && c !== null ? c : {}) as Record<string, unknown>;
      return { capa: comoTexto(r.capa), total: comoNumero(r.total), por_estado: comoConteos(r.por_estado) };
    }),
    features_por_fuente: comoArreglo(d.features_por_fuente).map((f) => {
      const r = (typeof f === 'object' && f !== null ? f : {}) as Record<string, unknown>;
      return { fuente: comoTexto(r.fuente), total: comoNumero(r.total) };
    }),
    reportes_por_categoria: comoArreglo(d.reportes_por_categoria).map((c) => {
      const r = (typeof c === 'object' && c !== null ? c : {}) as Record<string, unknown>;
      return { categoria: comoTexto(r.categoria), total: comoNumero(r.total) };
    }),
    tramos_vereda: {
      priorizados: comoNumero(tramos.priorizados),
      con_relevamiento: comoNumero(tramos.con_relevamiento),
      cobertura: comoTexto(tramos.cobertura),
      fecha_corte: comoTextoNulo(tramos.fecha_corte),
      cautela: comoTexto(tramos.cautela),
    },
    observaciones: {
      ingresadas: comoNumero(obs.ingresadas),
      revisadas: comoNumero(obs.revisadas),
      corroboradas: comoNumero(obs.corroboradas),
      disputadas: comoNumero(obs.disputadas),
      ilustrativas: comoNumero(obs.ilustrativas),
      fecha_corte: comoTextoNulo(obs.fecha_corte),
    },
    hitos: comoArreglo(d.hitos).map((h) => {
      const r = (typeof h === 'object' && h !== null ? h : {}) as Record<string, unknown>;
      return {
        key: comoTexto(r.key),
        label: comoTexto(r.label),
        tipo: comoTexto(r.tipo),
        con_ficha: r.con_ficha === true,
        ultima_revision: comoTextoNulo(r.ultima_revision),
      };
    }),
  };
}

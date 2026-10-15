// Servicio informativo ciudadano del nodo Caucete (NC-R5 #142, épica #137).
// Normalización del panel informativo: catálogo de fuentes espaciales
// (ADR-035, NODO-CAU R2 #147), procedencia por conjunto — ingestas publicadas
// (NC-EV-09: recibido → validado_tecnicamente → validado_territorialmente →
// publicado; la UI solo muestra lo publicado), capas v6 (#141) y features
// con estado honesto. R15: nada se inventa — 0 es "sin materializar aún",
// null ≠ 0, y lo sintético jamás se mezcla con lo real.

export type FuenteEspacialTipo = 'wms' | 'wfs' | 'descarga' | 'documento' | 'api' | (string & {});
export type FuenteEspacialEstado =
  | 'disponible'
  | 'requiere_credenciales'
  | 'requiere_solicitud'
  | 'no_disponible'
  | 'deprecado'
  | (string & {});
export type EstadoHonesto =
  | 'verified'
  | 'community_validated'
  | 'pending'
  | 'synthetic_demo'
  | (string & {});

export interface FuenteInformativa {
  id: string;
  key: string;
  organismo: string;
  nombre: string;
  url: string | null;
  tipo: FuenteEspacialTipo;
  licencia: string | null;
  estado: FuenteEspacialEstado;
  cautela: string;
  is_synthetic: boolean;
}

export interface IngestaPublicada {
  id: string;
  fuente_key: string;
  nodo_key: string;
  capa_servicio: string;
  fecha_acceso: string | null;
  fecha_corte: string | null;
  licencia: string | null;
  crs_origen: string | null;
  crs_normalizado: string | null;
  escala_precision: string | null;
  estado: string;
  is_synthetic: boolean;
}

export interface CapaInformativa {
  id: string;
  key: string;
  nombre: string;
  dominio: string;
  geometria: string;
  default_on: boolean;
}

export interface FeatureInformativa {
  id: string;
  layer: string;
  domain: string;
  titulo: string;
  tipo: string;
  estado: EstadoHonesto;
  fuente_label: string;
  observado_at: string | null;
  lat: number | null;
  lng: number | null;
  is_synthetic: boolean;
}

export const ETIQUETAS_ESTADO_HONESTO: Record<string, string> = {
  verified: 'Verificado',
  community_validated: 'Validado por la comunidad',
  pending: 'Pendiente de validación',
  synthetic_demo: 'Demo sintética',
};

export const ETIQUETAS_ESTADO_FUENTE: Record<string, string> = {
  disponible: 'Disponible',
  requiere_credenciales: 'Requiere credenciales',
  requiere_solicitud: 'Requiere solicitud formal',
  no_disponible: 'No disponible',
  deprecado: 'Deprecado',
};

export const ETIQUETAS_TIPO_FUENTE: Record<string, string> = {
  wms: 'WMS',
  wfs: 'WFS',
  descarga: 'Descarga',
  documento: 'Documento',
  api: 'API',
};

/** Capas v6 del nodo Caucete (NODO-CAU R1 #141): las 5 capas nuevas del vocabulario. */
export const CAPAS_V6_CAUCETE: readonly string[] = [
  'hydrology',
  'seismic_risk',
  'public_space',
  'accessibility',
  'sustainability',
];

/** Etiqueta dual R15 (#142): el material aún no acreditado por merge se rotula así. */
export const ETIQUETA_STAGING_R15 = 'En Staging — Pendiente de PR/Merge';

export function etiquetaEstadoHonesto(estado: string): string {
  return ETIQUETAS_ESTADO_HONESTO[estado] ?? estado;
}

export function etiquetaEstadoFuente(estado: string): string {
  return ETIQUETAS_ESTADO_FUENTE[estado] ?? estado;
}

export function etiquetaTipoFuente(tipo: string): string {
  return ETIQUETAS_TIPO_FUENTE[tipo] ?? tipo;
}

/**
 * Origen de una feature: lo sintético jamás se mezcla con lo real (#142, R15).
 * La demo sintética se declara con is_synthetic y fuente "Ilustrativa · …"
 * (ADR-035: ninguna fuente sintética nombra una organización real).
 */
export function esOrigenSintetico(feature: FeatureInformativa): boolean {
  return feature.is_synthetic === true || feature.fuente_label.startsWith('Ilustrativa');
}

/** Etiqueta dual de una feature: estado honesto + origen (real o sintético). */
export function etiquetaDualFeature(feature: FeatureInformativa): string {
  const estado = etiquetaEstadoHonesto(feature.estado);
  return esOrigenSintetico(feature) ? estado + ' · Sintético' : estado + ' · Real';
}

function extraerData(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload !== null && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

function comoTexto(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function comoTextoNulo(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}

/** Normaliza GET /api/fuentes (ADR-035): estados honestos y cautelas tal como llegan. */
export function normalizarFuentes(payload: unknown): FuenteInformativa[] {
  return extraerData(payload)
    .map((f): FuenteInformativa | null => {
      if (typeof f !== 'object' || f === null) return null;
      const r = f as Record<string, unknown>;
      return {
        id: comoTexto(r.id),
        key: comoTexto(r.key),
        organismo: comoTexto(r.organismo),
        nombre: comoTexto(r.nombre),
        url: comoTextoNulo(r.url),
        tipo: comoTexto(r.tipo) as FuenteEspacialTipo,
        licencia: comoTextoNulo(r.licencia),
        estado: comoTexto(r.estado) as FuenteEspacialEstado,
        cautela: comoTexto(r.cautela),
        is_synthetic: false,
      };
    })
    .filter((f): f is FuenteInformativa => f !== null);
}

/**
 * Normaliza GET /api/ingestas?nodo= (NC-EV-09): SOLO lo publicado llega a la UI;
 * el resto del pipeline de procedencia no es público. La API ya filtra y la
 * normalización re-verifica (defensa en profundidad, R15).
 */
export function normalizarIngestas(payload: unknown): IngestaPublicada[] {
  return extraerData(payload)
    .map((i): IngestaPublicada | null => {
      if (typeof i !== 'object' || i === null) return null;
      const r = i as Record<string, unknown>;
      if (comoTexto(r.estado) !== 'publicado') return null;
      return {
        id: comoTexto(r.id),
        fuente_key: comoTexto(r.fuente_key),
        nodo_key: comoTexto(r.nodo_key),
        capa_servicio: comoTexto(r.capa_servicio),
        fecha_acceso: comoTextoNulo(r.fecha_acceso),
        fecha_corte: comoTextoNulo(r.fecha_corte),
        licencia: comoTextoNulo(r.licencia),
        crs_origen: comoTextoNulo(r.crs_origen),
        crs_normalizado: comoTextoNulo(r.crs_normalizado),
        escala_precision: comoTextoNulo(r.escala_precision),
        estado: comoTexto(r.estado),
        is_synthetic: r.is_synthetic === true,
      };
    })
    .filter((i): i is IngestaPublicada => i !== null);
}

/** Normaliza GET /api/nodos/:key/capas: catálogo explícito, no inferido. */
export function normalizarCapas(payload: unknown): CapaInformativa[] {
  return extraerData(payload)
    .map((c): CapaInformativa | null => {
      if (typeof c !== 'object' || c === null) return null;
      const r = c as Record<string, unknown>;
      return {
        id: comoTexto(r.id),
        key: comoTexto(r.key),
        nombre: comoTexto(r.nombre),
        dominio: comoTexto(r.dominio),
        geometria: comoTexto(r.geometria),
        default_on: r.default_on === true,
      };
    })
    .filter((c): c is CapaInformativa => c !== null);
}

/** Normaliza GET /api/nodos/:key/features (estado honesto por feature, R15). */
export function normalizarFeatures(payload: unknown): FeatureInformativa[] {
  return extraerData(payload)
    .map((f): FeatureInformativa | null => {
      if (typeof f !== 'object' || f === null) return null;
      const r = f as Record<string, unknown>;
      const lat = typeof r.lat === 'number' && Number.isFinite(r.lat) ? r.lat : null;
      const lng = typeof r.lng === 'number' && Number.isFinite(r.lng) ? r.lng : null;
      return {
        id: comoTexto(r.id),
        layer: comoTexto(r.layer),
        domain: comoTexto(r.domain),
        titulo: comoTexto(r.titulo),
        tipo: comoTexto(r.tipo),
        estado: comoTexto(r.estado) as EstadoHonesto,
        fuente_label: comoTexto(r.fuente_label),
        observado_at: comoTextoNulo(r.observado_at),
        lat,
        lng,
        is_synthetic: r.is_synthetic === true,
      };
    })
    .filter((f): f is FeatureInformativa => f !== null);
}

export interface LeyendaEstado {
  estado: string;
  etiqueta: string;
  count: number;
  sinteticos: number;
}

/**
 * Leyenda de estados honestos con conteo real por estado (#142): cada estado
 * es una señal independiente y los sintéticos se cuentan aparte — sin mezclar.
 */
export function leyendaEstados(features: FeatureInformativa[]): LeyendaEstado[] {
  const ordenConocido = ['verified', 'community_validated', 'pending', 'synthetic_demo'];
  const conteo = new Map<string, LeyendaEstado>();
  for (const f of features) {
    const actual = conteo.get(f.estado) ?? {
      estado: f.estado,
      etiqueta: etiquetaEstadoHonesto(f.estado),
      count: 0,
      sinteticos: 0,
    };
    actual.count += 1;
    if (esOrigenSintetico(f)) actual.sinteticos += 1;
    conteo.set(f.estado, actual);
  }
  const conocidos = ordenConocido
    .filter((e) => conteo.has(e))
    .map((e) => conteo.get(e) as LeyendaEstado);
  const desconocidos = [...conteo.values()]
    .filter((l) => ordenConocido.includes(l.estado) === false)
    .sort((a, b) => a.estado.localeCompare(b.estado));
  return [...conocidos, ...desconocidos];
}

export interface CapasPorDominio {
  dominio: string;
  capas: CapaInformativa[];
}

/** Agrupa capas por dominio (dominios alfabéticos; capas por key dentro de cada grupo). */
export function agruparCapasPorDominio(capas: CapaInformativa[]): CapasPorDominio[] {
  const grupos = new Map<string, CapaInformativa[]>();
  for (const capa of capas) {
    const lista = grupos.get(capa.dominio) ?? [];
    lista.push(capa);
    grupos.set(capa.dominio, lista);
  }
  return [...grupos.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((par) => ({
      dominio: par[0],
      capas: [...par[1]].sort((x, y) => x.key.localeCompare(y.key)),
    }));
}

/**
 * Nota honesta del panel de ingestas: 0 = "sin materializar aún" (R15),
 * nunca un valor maquetado.
 */
export function notaIngestas(count: number): string {
  return count === 0
    ? 'Ingestas publicadas: 0 (sin materializar aún — R15: ninguna ingesta alcanzó estado publicado)'
    : 'Ingestas publicadas: ' + String(count);
}

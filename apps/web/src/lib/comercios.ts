// Mercado de Proximidad del nodo Capital (MARKET-CAP MK-1 #243, sub-épica #152).
// Normalización del directorio de comercios: ficha pública con estado honesto
// (4 estados epistémicos de UI), rubro por CÓDIGO (canon de 11 ratificado,
// TAXONOMIA_DIRECTORIO_CANONICA + legados cat-*) con label honesto (null =
// sin dato, R15: la UI nunca inventa una etiqueta de rubro), habilitación
// epistémica (ADR-035: 'verificada' SOLO con evidencia primaria completa;
// 'silencio_positivo' = ley 02-07-2026) y titularidad (reclamo verificado,
// identificador solo como hash — Ley 25.326).
// R15: nada se inventa — 0 es "el registro comunitario arranca vacío"
// (decisión DH: seed 0 comercios, patrón VIG-005), null ≠ 0, y lo sintético
// (estado_epistemico 'synthetic_demo') jamás se mezcla con lo real.
// v1 sin pagos (MK-5 = fase 2, ADR propio Ley 24.240) y sin PII de contacto
// (decisión DH: relay por plataforma, MK-4).

export type ComercioEstadoEpistemico =
  | 'verified'
  | 'community_validated'
  | 'pending'
  | 'synthetic_demo'
  | (string & {});

export type ComercioHabilitacionEstado =
  | 'verificada'
  | 'en_tramite'
  | 'silencio_positivo'
  | 'unknown'
  | 'sin_dato'
  | (string & {});

export type ComercioTitularidadEstado =
  | 'sin_reclamo'
  | 'reclamada'
  | 'verificada'
  | 'desistida'
  | (string & {});

export interface ComercioRubro {
  id: string;
  rama: string | null;
  label: string | null;
}

export interface ComercioItem {
  id: string;
  titulo: string;
  descripcion: string | null;
  nodo_key: string;
  subnodo_key: string | null;
  lat: number | null;
  lng: number | null;
  rubro: ComercioRubro;
  estado: string;
  habilitacion_estado: ComercioHabilitacionEstado;
  titularidad_estado: ComercioTitularidadEstado;
  estado_epistemico: ComercioEstadoEpistemico;
}

export interface ComercioProductoPublico {
  id: string;
  nombre: string | null;
  estado: string;
}

export interface ComercioDetalle {
  ficha: ComercioItem;
  operativa: Record<string, unknown> | null;
  productos: ComercioProductoPublico[];
  count_productos: number;
}

export interface ComerciosQuery {
  nodo?: string;
  rubro?: string;
  subnodo?: string;
  habilitacion?: string;
  bbox?: string;
}

export const ETIQUETAS_ESTADO_EPISTEMICO: Record<string, string> = {
  verified: 'Verificado',
  community_validated: 'Validado por la comunidad',
  pending: 'Pendiente de validación',
  synthetic_demo: 'Demo sintética',
};

export const ETIQUETAS_HABILITACION: Record<string, string> = {
  verificada: 'Habilitación verificada (evidencia primaria, ADR-035)',
  en_tramite: 'Habilitación en trámite',
  silencio_positivo: 'Silencio administrativo positivo (ley 02-07-2026)',
  unknown: 'Habilitación desconocida',
  sin_dato: 'Habilitación sin dato',
};

export const ETIQUETAS_TITULARIDAD: Record<string, string> = {
  sin_reclamo: 'Sin reclamo de titularidad',
  reclamada: 'Titularidad reclamada',
  verificada: 'Titularidad verificada',
  desistida: 'Reclamo desistido',
};

export function etiquetaEstadoEpistemico(estado: string): string {
  return ETIQUETAS_ESTADO_EPISTEMICO[estado] ?? estado;
}

export function etiquetaHabilitacion(estado: string): string {
  return ETIQUETAS_HABILITACION[estado] ?? estado;
}

export function etiquetaTitularidad(estado: string): string {
  return ETIQUETAS_TITULARIDAD[estado] ?? estado;
}

/**
 * Origen de un comercio: lo sintético jamás se mezcla con lo real (R15).
 * La ficha pública no expone is_synthetic: la señal honesta es el estado
 * epistémico 'synthetic_demo' (ComercioFichaPublicaSchema, #243) — en la
 * paridad sintética además el título lleva [SINTÉTICO].
 */
export function esOrigenSintetico(comercio: ComercioItem): boolean {
  return (
    comercio.estado_epistemico === 'synthetic_demo' ||
    comercio.titulo.startsWith('[SINTÉTICO]')
  );
}

/** Etiqueta dual de un comercio: estado honesto + origen (real o sintético). */
export function etiquetaDualComercio(comercio: ComercioItem): string {
  const estado = etiquetaEstadoEpistemico(comercio.estado_epistemico);
  return esOrigenSintetico(comercio) ? estado + ' · Sintético' : estado + ' · Real';
}

/**
 * Rubro honesto: label null = código sin etiqueta resuelta (R15) — la UI
 * muestra el código crudo antes que inventar una etiqueta.
 */
export function etiquetaRubro(comercio: ComercioItem): string {
  if (comercio.rubro.label !== null && comercio.rubro.label !== '') {
    return comercio.rubro.label;
  }
  return 'rubro sin dato (' + comercio.rubro.id + ')';
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

function comoNumeroNulo(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Normaliza GET /api/comercios (MARKET-CAP MK-1 #243): la API solo devuelve
 * comercios aprobados y públicos (moderación primero; ADR-036: restricted
 * nunca sale). La normalización re-verifica la forma sin maquetar estado
 * alguno (defensa en profundidad, R15).
 */
export function normalizarComercios(payload: unknown): ComercioItem[] {
  return extraerData(payload)
    .map((c): ComercioItem | null => {
      if (typeof c !== 'object' || c === null) return null;
      const r = c as Record<string, unknown>;
      const rubro = (r.rubro ?? {}) as Record<string, unknown>;
      const habilitacion = (r.habilitacion ?? {}) as Record<string, unknown>;
      const titularidad = (r.titularidad ?? {}) as Record<string, unknown>;
      return {
        id: comoTexto(r.id),
        titulo: comoTexto(r.titulo),
        descripcion: comoTextoNulo(r.descripcion),
        nodo_key: comoTexto(r.nodo_key),
        subnodo_key: comoTextoNulo(r.subnodo_key),
        lat: comoNumeroNulo(r.lat),
        lng: comoNumeroNulo(r.lng),
        rubro: {
          id: comoTexto(rubro.id),
          rama: comoTextoNulo(rubro.rama),
          label: comoTextoNulo(rubro.label),
        },
        estado: comoTexto(r.estado),
        habilitacion_estado: comoTexto(habilitacion.estado) as ComercioHabilitacionEstado,
        titularidad_estado: comoTexto(titularidad.estado) as ComercioTitularidadEstado,
        estado_epistemico: comoTexto(r.estado_epistemico) as ComercioEstadoEpistemico,
      };
    })
    .filter((c): c is ComercioItem => c !== null);
}

/**
 * Normaliza GET /api/comercios/:id: ficha + operativa (VIG-005) + productos
 * aprobados con count. operativa null es honesto (sin ficha operativa,
 * null ≠ 0); los productos se declaran tal como llegan (la API ya filtra a
 * aprobados).
 */
export function normalizarComercioDetalle(payload: unknown): ComercioDetalle {
  const origen =
    payload !== null && typeof payload === 'object'
      ? (payload as { data?: unknown }).data
      : payload;
  const r = (origen ?? {}) as Record<string, unknown>;
  const ficha = normalizarComercios({ data: [r] })[0] ?? null;
  if (ficha === null) {
    throw new Error('Respuesta malformada de la ficha de comercio: sin datos normalizables');
  }
  const productosCrudos = Array.isArray(r.productos) ? (r.productos as unknown[]) : [];
  const productos = productosCrudos
    .map((p): ComercioProductoPublico | null => {
      if (typeof p !== 'object' || p === null) return null;
      const pr = p as Record<string, unknown>;
      return {
        id: comoTexto(pr.id),
        nombre: comoTextoNulo(pr.nombre),
        estado: comoTexto(pr.estado),
      };
    })
    .filter((p): p is ComercioProductoPublico => p !== null);
  const operativa =
    r.operativa !== null && typeof r.operativa === 'object'
      ? (r.operativa as Record<string, unknown>)
      : null;
  return {
    ficha,
    operativa,
    productos,
    count_productos:
      typeof r.count_productos === 'number' ? r.count_productos : productos.length,
  };
}

/**
 * Nota honesta del directorio: 0 = el registro comunitario arranca vacío
 * (decisión DH: seed 0 comercios, patrón VIG-005 — R15, nunca maquetado).
 */
export function notaComercios(count: number): string {
  return count === 0
    ? 'Comercios publicados: 0 (el registro comunitario arranca vacío — decisión DH seed 0, patrón VIG-005, R15)'
    : 'Comercios publicados: ' + String(count);
}

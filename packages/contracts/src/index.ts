/**
 * packages/contracts/src/index.ts
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — Contratos Canónicos Maestro de la Plataforma Territorial
 * Serie Contracts NCAP-R2 & Compatibilidad Inline Canónica (PR #233 / ADR-021)
 * -----------------------------------------------------------------------------
 * Re-exporta los 12 módulos canónicos y preserva los 3 nodos federados ratificados (ADR-021).
 */

// 1. Re-exportaciones Modulares Canónicas (Lote 1 + Lote Complementario NCAP-R2)
export * from './nodoCapital.js';
export * from './ncap.js';
export * from './territorios.js';
export * from './evidencias.js';
export * from './health.js';
export * from './openapi.js';
export * from './plataformaTerritorial.js';
export * from './activos.js';
export * from './modeloFederado.js';
export * from './territorialModel.js';
export * from './directoryTaxonomy.js';
export * from './oportunidades.js';

// 2. Definiciones Canónicas Inline y Compatibilidad ADR-021
export const PROTOCOLO_ACTUAL = 'NCAP-R2';
export const SRID_CANONICO = 4326;
export const VERSION_CONTRACTS = '0.6.0-ncap.r2';

/**
 * Constantes de Paleta de Estados Honestos (WCAG AA & 4 Señales Canónicas)
 */
export const HONEST_EPISTEMIC_STATES_PALETTE = {
  validado: {
    label: 'Acreditado / Terreno',
    colorHex: '#00A86B',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-500 border-solid',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    glyph: '●',
    microcopy: 'Acreditado criptográficamente · R15',
    strokeWidth: 2,
    borderStyle: 'solid'
  },
  sintetico: {
    label: 'Sintético / Inferencia',
    colorHex: '#FFC72C',
    contrastColorHex: '#D97706',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderClass: 'border-amber-400 border-dashed',
    textClass: 'text-amber-800 dark:text-amber-300',
    glyph: '✦',
    microcopy: 'Inferencia heurística / Estimación',
    strokeWidth: 1.5,
    borderStyle: 'dashed'
  },
  comunitario: {
    label: 'Comunitario / Vecinal',
    colorHex: '#E06D53',
    bgClass: 'bg-orange-50 dark:bg-orange-950/40',
    borderClass: 'border-orange-500 border-dotted',
    textClass: 'text-orange-700 dark:text-orange-300',
    glyph: '◈',
    microcopy: 'Aporte territorial de asamblea',
    strokeWidth: 1.5,
    borderStyle: 'dotted'
  },
  pendiente: {
    label: 'Pendiente de Auditoría',
    colorHex: '#94A3B8',
    bgClass: 'bg-slate-50 dark:bg-slate-900/40',
    borderClass: 'border-slate-400 border-dashed',
    textClass: 'text-slate-700 dark:text-slate-300',
    glyph: '◐',
    microcopy: 'Relevo en curso · Acreditación R9',
    strokeWidth: 1,
    borderStyle: 'dashed'
  }
} as const;

/**
 * Los 3 Nodos Federados Canónicos de San Juan (ADR-021)
 */
export const NODOS_FEDERADOS_REGISTRO = [
  {
    id: 'nodo-capital-san-juan',
    nombre: 'Nodo San Juan Capital',
    region: 'Valle de Tulum',
    lat: -31.5375,
    lng: -68.5252,
    descripcion: 'Centro cívico, administrativo, comercial y universitario de la provincia',
    subnodosCount: 4,
    estadoHonesto: 'validado'
  },
  {
    id: 'nodo-valle-de-iglesia',
    nombre: 'Nodo Valle de Iglesia',
    region: 'Cordillera Central / Valles Andinos',
    lat: -30.3800,
    lng: -69.2000,
    descripcion: 'Agroecología de altura, cuenca del Río Blanco, termalismo Pismanta y patrimonio protegido',
    subnodosCount: 6,
    estadoHonesto: 'validado'
  },
  {
    id: 'nodo-caucete-este',
    nombre: 'Nodo Caucete Este',
    region: 'Valle Este & Oasis Irrigado',
    lat: -31.6510,
    lng: -68.2810,
    descripcion: 'Vitivinicultura histórica, Santuario Difunta Correa y corredor biocéanico este',
    subnodosCount: 5,
    estadoHonesto: 'comunitario'
  }
] as const;

export type NodoFederadoRegistro = (typeof NODOS_FEDERADOS_REGISTRO)[number];

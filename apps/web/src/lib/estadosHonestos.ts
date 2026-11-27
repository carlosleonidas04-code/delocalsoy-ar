// REF-R5 (#638, épica REF #633): estados honestos compartidos — base de
// DatoConFuente y de la Galería de estados. R5/R15: «sin dato» jamás se
// muestra como 0; cada estado se declara con texto (el color nunca es la
// única señal, WCAG 1.4.1).

export type EstadoHonesto = 'completo' | 'parcial' | 'cero_confirmado' | 'sin_dato';

/**
 * Clasifica un conteo en su estado honesto.
 * null/undefined/NaN → 'sin_dato' (ausencia declarada, no es un cero);
 * 0 → 'cero_confirmado' (dato real que dice «no hay»);
 * 0 < n < total → 'parcial' (cobertura incompleta declarada);
 * n === total (o sin total conocido) → 'completo'.
 */
export function estadoDesdeConteo(count: number | null | undefined, total?: number | null): EstadoHonesto {
  if (count === null || count === undefined || typeof count !== 'number' || Number.isNaN(count) || !Number.isFinite(count)) {
    return 'sin_dato';
  }
  if (count === 0) return 'cero_confirmado';
  if (typeof total === 'number' && Number.isFinite(total) && total > 0 && count < total) return 'parcial';
  return 'completo';
}

const ETIQUETAS: Record<EstadoHonesto, string> = {
  completo: 'Dato completo',
  parcial: 'Dato parcial (cobertura incompleta)',
  cero_confirmado: 'Cero confirmado',
  sin_dato: 'Sin dato aún (no es un cero)',
};

const DESCRIPCIONES: Record<EstadoHonesto, string> = {
  completo: 'Todas las fuentes del dato están acreditadas y cargadas.',
  parcial: 'Hay dato real, pero la cobertura de fuentes está incompleta.',
  cero_confirmado: 'La fuente fue consultada y no hay elementos: es un cero real, no una ausencia.',
  sin_dato: 'La fuente no reportó el dato: se declara la ausencia, no se inventa un cero.',
};

export function etiquetaEstadoHonesto(estado: EstadoHonesto): string {
  return ETIQUETAS[estado];
}

export function descripcionEstadoHonesto(estado: EstadoHonesto): string {
  return DESCRIPCIONES[estado];
}

export const ESTADOS_HONESTOS: readonly EstadoHonesto[] = ['completo', 'parcial', 'cero_confirmado', 'sin_dato'];

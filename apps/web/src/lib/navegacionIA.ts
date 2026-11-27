/**
 * DELocalSoy.AR — IA de navegación REF-R3 (#636, épica REF #633)
 * 5 destinos + 3 capas, hash-routing del patrón #nodo/:key (sin router nuevo,
 * sin dependencias). Reglas vivas: parseo ESTRICTO — un hash no reconocido
 * NUNCA cambia el destino (R15: jamás asume); anti-ranking (los 5 destinos
 * son equivalentes, orden fijo, sin métrica ni comparación, R5/ADR-036);
 * los títulos son lenguaje humano (insumo de REF-R4: sin códigos PIZ/EV/ADR).
 */

export type DestinoIA = 'inicio' | 'mapa' | 'reportar' | 'preguntar' | 'mas' | 'lab';

export interface DestinoIAInfo {
  id: DestinoIA;
  /** Hash canónico del destino ('' para Inicio: el producto abre sin hash). */
  hash: string;
  titulo: string;
  descripcion: string;
}

/* Los 5 destinos del producto, en orden fijo (equivalentes entre sí). */
export const DESTINOS_IA: readonly DestinoIAInfo[] = [
  { id: 'inicio', hash: '#inicio', titulo: 'Inicio', descripcion: 'qué es la plataforma y qué puedo hacer hoy' },
  { id: 'mapa', hash: '#mapa', titulo: 'Mapa', descripcion: 'cartografía del territorio, nodos e itinerarios' },
  { id: 'reportar', hash: '#reportar', titulo: 'Reportar', descripcion: 'contar un hecho observable del territorio' },
  { id: 'preguntar', hash: '#preguntar', titulo: 'Preguntar', descripcion: 'preguntar al nodo y leer la fuente' },
  { id: 'mas', hash: '#mas', titulo: 'Más', descripcion: 'módulos del nodo, observatorio y cuenta' },
] as const;

const RE_DESTINO = /^#(inicio|mapa|reportar|preguntar|mas|lab)$/;
const RE_NODO = /^#nodo\/([a-z0-9_-]+)$/;

/**
 * Parseo estricto del hash a destino:
 * - '' o '#' → 'inicio' (el producto abre sin hash, EV-075/#540).
 * - '#inicio'/'#mapa'/'#reportar'/'#preguntar'/'#mas' → su destino.
 * - '#lab' → 'lab' (Transparencia, guard isLabRoute #541).
 * - '#nodo/:key' → 'mapa' (el itinerario del nodo es superficie del destino Mapa, IT-R5).
 * - cualquier otro hash (#demo, anclas internas, mayúsculas, malformadas) → null:
 *   el destino NO cambia.
 */
export function destinoDesdeHash(hash: string): DestinoIA | null {
  if (hash === '' || hash === '#') return 'inicio';
  if (RE_DESTINO.test(hash)) return hash.slice(1) as DestinoIA;
  if (RE_NODO.test(hash)) return 'mapa';
  return null;
}

/** Hash canónico del destino (aria-current, enlaces). */
export function hashDeDestino(d: DestinoIA): string {
  return '#' + d;
}

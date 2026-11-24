/**
 * DELocalSoy.AR — Ruta de nodo (IT-R5 #614, épica INTER-TERR #607).
 *
 * Hash «#nodo/:key» (mismo patrón que «#lab» con hashchange en App.tsx):
 * funciona en hosting estático sin rewrites y sin dependencias nuevas.
 * El parseo es ESTRICTO: solo «#nodo/» + clave [a-z0-9_-]+; cualquier otro
 * hash (incluido «#lab»), vacío, mayúsculas o entrada malformada provoca null.
 * La EXISTENCIA del nodo se valida contra el directorio vivo de territorios
 * (t.key) en App — este módulo jamás asume el vocabulario canónico (R15).
 */

export const PREFIJO_RUTA_NODO = '#nodo/';

const PATRON_RUTA_NODO = /^#nodo\/([a-z0-9_-]+)$/;

/** Clave de nodo del hash «#nodo/:key», o null si el hash no es una ruta de nodo. */
export function nodoKeyDesdeRuta(hash: string | null | undefined): string | null {
  if (typeof hash !== 'string' || hash.length === 0) {
    return null;
  }
  const m = PATRON_RUTA_NODO.exec(hash);
  return m === null ? null : m[1];
}

/** Ruta hash canónica de un nodo (round-trip con nodoKeyDesdeRuta). */
export function rutaDeNodo(nodoKey: string): string {
  return PREFIJO_RUTA_NODO + encodeURIComponent(nodoKey);
}

/**
 * Estado de red - UX-003 (#226).
 * Dependencias inyectables (navigator.onLine + eventos en produccion)
 * para poder probarlo en node sin jsdom.
 */
export interface DependenciasRed {
  enLinea(): boolean;
  escuchar(enCambio: (enLinea: boolean) => void): () => void;
}

export function dependenciasNavegador(): DependenciasRed {
  return {
    enLinea(): boolean {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    },
    escuchar(enCambio): () => void {
      if (
        typeof window === 'undefined' ||
        typeof window.addEventListener !== 'function'
      ) {
        return () => undefined;
      }
      const online = () => enCambio(true);
      const offline = () => enCambio(false);
      window.addEventListener('online', online);
      window.addEventListener('offline', offline);
      return () => {
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offline);
      };
    },
  };
}

export function crearEstadoRed(deps: DependenciasRed): {
  enLinea(): boolean;
  suscribir(cb: (enLinea: boolean) => void): () => void;
  destruir(): void;
} {
  const suscriptores = new Set<(enLinea: boolean) => void>();
  const desuscribirEventos = deps.escuchar((enLinea) => {
    for (const cb of Array.from(suscriptores)) cb(enLinea);
  });
  return {
    enLinea(): boolean {
      return deps.enLinea();
    },
    suscribir(cb): () => void {
      suscriptores.add(cb);
      return () => {
        suscriptores.delete(cb);
      };
    },
    destruir(): void {
      suscriptores.clear();
      desuscribirEventos();
    },
  };
}

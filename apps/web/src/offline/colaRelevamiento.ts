/**
 * Cola de relevamiento diferido - UX-003 (#226), diseno P-8 del pedido
 * formal a agent.google.
 *
 * Honestidad (R15):
 * - Los items viven en el dispositivo (almacenamiento inyectable;
 *   localStorage en produccion) y se muestran como "pendiente de
 *   sincronizar".
 * - Un dato que NO pasa la validacion compartida (ErrorDeValidacion) se
 *   descarta en forma definitiva: reenviarlo seria reintentar algo invalido.
 * - Los errores de sesion/red dejan el item en cola con su ultimo error.
 * - JSON corrupto en el almacen NO se oculta: se expone como estado
 *   'corrupto' - sin exito simulado.
 */
import type { ActivoAltaInput } from '../activosApi';

export interface ItemColaRelevamiento {
  id: string;
  payload: ActivoAltaInput;
  creadoEn: string;
  intentos: number;
  ultimoError: string | null;
}

export interface AdaptadorAlmacen {
  leer(): string | null;
  escribir(valor: string): void;
}

export interface ResultadoSincronizacion {
  sincronizados: number;
  fallados: number;
  descartados: number;
  errores: string[];
}

export interface EstadoCola {
  total: number;
  items: ItemColaRelevamiento[];
  corrupto: boolean;
}

export interface DependenciasCola {
  generarId?: () => string;
  ahora?: () => string;
}

export type EnviarActivo = (input: ActivoAltaInput) => Promise<unknown>;

/** Duck-typing del error de validacion de activosApi (sin importarlo en runtime). */
export function esErrorDeValidacion(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'ErrorDeValidacion'
  );
}

function esItemValido(candidato: unknown): candidato is ItemColaRelevamiento {
  if (typeof candidato !== 'object' || candidato === null) return false;
  const c = candidato as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.payload === 'object' &&
    c.payload !== null &&
    typeof c.creadoEn === 'string' &&
    typeof c.intentos === 'number' &&
    (c.ultimoError === null || typeof c.ultimoError === 'string')
  );
}

/** Almacenamiento sobre localStorage (produccion) - seguro sin DOM. */
export function crearAlmacenLocalStorage(clave: string): AdaptadorAlmacen {
  return {
    leer(): string | null {
      try {
        const almacen = (globalThis as {
          localStorage?: { getItem(k: string): string | null };
        }).localStorage;
        return almacen ? almacen.getItem(clave) : null;
      } catch {
        return null;
      }
    },
    escribir(valor: string): void {
      try {
        const almacen = (globalThis as {
          localStorage?: { setItem(k: string, v: string): void };
        }).localStorage;
        if (almacen) almacen.setItem(clave, valor);
      } catch {
        // Cuota llena o storage bloqueado: la cola sigue viva en memoria.
      }
    },
  };
}

export function crearColaRelevamiento(
  almacen: AdaptadorAlmacen,
  enviar: EnviarActivo,
  deps: DependenciasCola = {}
): {
  encolar(payload: ActivoAltaInput): ItemColaRelevamiento;
  sincronizar(): Promise<ResultadoSincronizacion>;
  estado(): EstadoCola;
  vaciar(): void;
} {
  let contador = 0;
  const generarId =
    deps.generarId ?? (() => 'cola-' + Date.now() + '-' + (++contador));
  const ahora = deps.ahora ?? (() => new Date().toISOString());

  let corrupto = false;
  let items: ItemColaRelevamiento[] = [];
  let cargado = false;

  function cargar(): void {
    if (cargado) return;
    cargado = true;
    const crudo = almacen.leer();
    if (crudo === null) {
      items = [];
      corrupto = false;
      return;
    }
    try {
      const parseado: unknown = JSON.parse(crudo);
      if (Array.isArray(parseado)) {
        corrupto = false;
        items = parseado.filter(esItemValido);
      } else {
        corrupto = true;
        items = [];
      }
    } catch {
      corrupto = true;
      items = [];
    }
  }

  function persistir(): void {
    almacen.escribir(JSON.stringify(items));
  }

  return {
    encolar(payload: ActivoAltaInput): ItemColaRelevamiento {
      cargar();
      const item: ItemColaRelevamiento = {
        id: generarId(),
        payload,
        creadoEn: ahora(),
        intentos: 0,
        ultimoError: null,
      };
      items = items.concat([item]);
      persistir();
      return item;
    },

    async sincronizar(): Promise<ResultadoSincronizacion> {
      cargar();
      const resultado: ResultadoSincronizacion = {
        sincronizados: 0,
        fallados: 0,
        descartados: 0,
        errores: [],
      };
      const pendientes = items.slice();
      const quedan: ItemColaRelevamiento[] = [];
      for (const item of pendientes) {
        try {
          await enviar(item.payload);
          resultado.sincronizados += 1;
        } catch (err) {
          const mensaje =
            err instanceof Error ? err.message : 'fallo desconocido al sincronizar';
          resultado.errores.push(item.id + ': ' + mensaje);
          if (esErrorDeValidacion(err)) {
            // Dato invalido: descarte definitivo - reintentarlo no lo arregla.
            resultado.descartados += 1;
            continue;
          }
          resultado.fallados += 1;
          quedan.push({
            ...item,
            intentos: item.intentos + 1,
            ultimoError: mensaje,
          });
        }
      }
      if (pendientes.length > 0) {
        const idsQueQuedan = new Set(quedan.map((q) => q.id));
        items = items.filter((it) => idsQueQuedan.has(it.id));
        persistir();
      }
      return resultado;
    },

    estado(): EstadoCola {
      cargar();
      return { total: items.length, items: items.slice(), corrupto };
    },

    vaciar(): void {
      cargar();
      items = [];
      persistir();
    },
  };
}

/**
 * DELocalSoy.AR — Artefacto A1 (vecino, ciudadano y visitante): matriz de
 * permisos v0.1, capacidades por sesión y cliente HTTP puro para las
 * superficies REALES (ART-R1, #270, épica #268).
 *
 * Superficies contrastadas contra main @ 77500be (apps/api/src/routes):
 *   POST /api/reportes               (JWT) 201 reporte nacido 'received' | 200 idempotente
 *   GET  /api/reportes/mios          (JWT) reportes propios + transiciones selladas (ADR-038)
 *   GET  /api/reportes/:id/historial (público) ciclo de vida del reporte
 *   GET  /api/nodos/:key/reportes    (público) listado SIN 'descartado' (el servidor filtra)
 *   GET  /api/nodos/:key/categorias  (público) vocabulario real de categorías del nodo
 *
 * Reglas vivas:
 *   R5  — ningún error HTTP se transforma en []: siempre throw ErrorA1.
 *   R15 — sin simulación: el reporte nace 'received' y la moderación ES la
 *         validación comunitaria; nunca 'verified' por escribir.
 *   ADR-027/Ley 25.326 — el cliente jamás envía ni persiste PII; el
 *         pseudónimo (created_by_hash) lo calcula el servidor.
 */

import type { EstadoSesion, RolPlataforma, TransporteSesion } from './sesion';
import { RATE_LIMIT_POR_ROL, RATE_LIMIT_VISITANTE } from './sesion';

/* ------------------------------------------------------------------ */
/* Componentes del artefacto (serie docs/artefactos/ v0.1, PR #267)    */
/* ------------------------------------------------------------------ */

export type ComponenteA1Id =
  | 'mapa_territorio'
  | 'reporte_ciudadano'
  | 'ficha_valoracion'
  | 'banco_potencialidades'
  | 'observaciones_patrimoniales'
  | 'directorio_produccion'
  | 'comercios_lectura'
  | 'kpis_publicos'
  | 'asistente_territorial';

export type EstadoComponente = 'en_main' | 'en_rama' | 'propuesto';

export interface ComponenteA1 {
  id: ComponenteA1Id;
  titulo: string;
  estado: EstadoComponente;
  detalle: string;
}

/**
 * Estado honesto contrastado contra main @ 77500be y la cola de PRs abiertos.
 * Nota (contraste en vivo 2026-10-30): la spec v0.1 marcaba el asistente
 * territorial como propuesto, pero POST /api/nodos/:key/ask ya vive en main
 * (VIG-006, plantillas autorizadas sin LLM) — se declara 'en_main' por
 * realidad observada (R15); el cableado del panel llega en un slice posterior.
 */
export const COMPONENTES_A1: readonly ComponenteA1[] = [
  { id: 'mapa_territorio', titulo: 'Mapa y territorio', estado: 'en_main', detalle: 'nodos, capas y features con estado honesto (GET públicos, CORE-003)' },
  { id: 'reporte_ciudadano', titulo: 'Reporte ciudadano', estado: 'en_main', detalle: "POST nace 'received'; sugeridos por proximidad aún en rama (#219/#220)" },
  { id: 'ficha_valoracion', titulo: 'Ficha de valoración de espacio público', estado: 'en_main', detalle: '7 dimensiones, testimonio → corroborada | descartada (#196, EV-038)' },
  { id: 'banco_potencialidades', titulo: 'Banco de Potencialidades (Bloque 9)', estado: 'en_main', detalle: 'oportunidades con evidencia obligatoria y consentimiento (#160, EV-039)' },
  { id: 'observaciones_patrimoniales', titulo: 'Observaciones patrimoniales', estado: 'en_rama', detalle: 'PR #253 (VIG-009) en cola — sin merge aún' },
  { id: 'directorio_produccion', titulo: 'Directorio y producción', estado: 'en_main', detalle: 'activos, productos y operativa (solo aprobado+public, VIG-002/005)' },
  { id: 'comercios_lectura', titulo: 'Comercios (lectura)', estado: 'en_rama', detalle: 'MK-1 #246–#250 en cola de merge' },
  { id: 'kpis_publicos', titulo: 'KPIs públicos', estado: 'en_main', detalle: 'set honesto v1, count 0 honesto (VIG-003, EV-043)' },
  { id: 'asistente_territorial', titulo: 'Asistente territorial', estado: 'en_main', detalle: 'POST /api/nodos/:key/ask en main (VIG-006, sin LLM) — cableado del panel en slice posterior' },
];

/* ------------------------------------------------------------------ */
/* Matriz de permisos componente × rol (spec A1 v0.1 §3)               */
/* ------------------------------------------------------------------ */

export type PermisoA1 = 'leer' | 'escribir' | null;

export interface ColumnasPermiso {
  visitante: PermisoA1;
  ciudadano: PermisoA1;
  vecino: PermisoA1;
}

export const MATRIZ_PERMISOS_A1: Record<ComponenteA1Id, ColumnasPermiso> = {
  mapa_territorio: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
  reporte_ciudadano: { visitante: 'leer', ciudadano: 'escribir', vecino: 'escribir' },
  ficha_valoracion: { visitante: 'leer', ciudadano: 'escribir', vecino: 'escribir' },
  banco_potencialidades: { visitante: 'leer', ciudadano: 'escribir', vecino: 'escribir' },
  observaciones_patrimoniales: { visitante: 'leer', ciudadano: 'escribir', vecino: 'escribir' },
  directorio_produccion: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
  comercios_lectura: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
  kpis_publicos: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
  asistente_territorial: { visitante: 'leer', ciudadano: 'leer', vecino: 'leer' },
};

/* ------------------------------------------------------------------ */
/* Capacidades derivadas del estado de sesión                          */
/* ------------------------------------------------------------------ */

export interface CapacidadesA1 {
  esVisitante: boolean;
  /** Modo synthetic: demo SINTÉTICO declarada — las escrituras no se acreditan (R15). */
  esDemo: boolean;
  rol: RolPlataforma | null;
  techoReqsMin: number;
  /** La escritura ciudadana exige sesión JWT real (POST /api/reportes es requireJwt). */
  puedeEscribir: boolean;
  /** GET /api/reportes/mios exige sesión; el visitante no tiene 'míos'. */
  puedeVerMios: boolean;
}

export function capacidadesA1(estado: EstadoSesion): CapacidadesA1 {
  if (estado.tipo === 'demo_sintetico') {
    return {
      esVisitante: true,
      esDemo: true,
      rol: null,
      techoReqsMin: RATE_LIMIT_VISITANTE,
      puedeEscribir: false,
      puedeVerMios: false,
    };
  }
  if (estado.tipo === 'sesion') {
    const rol = estado.usuario.rol;
    return {
      esVisitante: false,
      esDemo: false,
      rol,
      techoReqsMin: RATE_LIMIT_POR_ROL[rol] ?? RATE_LIMIT_VISITANTE,
      puedeEscribir: true,
      puedeVerMios: true,
    };
  }
  return {
    esVisitante: true,
    esDemo: false,
    rol: null,
    techoReqsMin: RATE_LIMIT_VISITANTE,
    puedeEscribir: false,
    puedeVerMios: false,
  };
}

/**
 * Permiso visible en la matriz para el rol actual. Los roles de plataforma
 * con sesión distintos de ciudadano/vecino (moderador, gestor, auditor…)
 * leen la columna vecino: en v1 la escritura A1 con sesión es la misma
 * (requireJwt); la diferenciación por competencias vive en A3/A4.
 */
export function permisoVisible(
  componente: ComponenteA1Id,
  caps: CapacidadesA1
): PermisoA1 {
  const fila = MATRIZ_PERMISOS_A1[componente];
  if (!caps.puedeEscribir) {
    return fila.visitante;
  }
  return caps.rol === 'ciudadano' ? fila.ciudadano : fila.vecino;
}

/* ------------------------------------------------------------------ */
/* Cliente HTTP puro (transporte y token inyectables)                  */
/* ------------------------------------------------------------------ */

export type CodigoErrorA1 =
  | 'credenciales'
  | 'datos'
  | 'categoria'
  | 'pii'
  | 'nodo'
  | 'no_encontrado'
  | 'no_disponible';

export class ErrorA1 extends Error {
  codigo: CodigoErrorA1;
  constructor(codigo: CodigoErrorA1, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorA1';
    this.codigo = codigo;
  }
}

export interface CategoriaNodo {
  id: string;
  code: string;
  label: string;
  layer: string;
}

export interface ReportePublico {
  id: string;
  categoria: string;
  descripcion: string;
  estado: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  is_synthetic: boolean;
}

export interface TransicionReporte {
  estado_anterior: string;
  estado_nuevo: string;
  justificacion: string;
  moderador_hash: string;
  occurred_at: string;
}

export interface ReporteMio extends ReportePublico {
  nodo_key: string | null;
  transiciones: TransicionReporte[];
}

export interface NuevoReporte {
  nodo_key: string;
  categoria: string;
  descripcion: string;
  lat: number | null;
  lng: number | null;
}

export interface ClienteA1 {
  categorias(nodoKey: string): Promise<CategoriaNodo[]>;
  reportesPublicos(nodoKey: string): Promise<ReportePublico[]>;
  crearReporte(nuevo: NuevoReporte): Promise<{ reporte: ReportePublico; idempotente: boolean }>;
  mios(): Promise<ReporteMio[]>;
  historial(reporteId: string): Promise<TransicionReporte[]>;
}

export interface OpcionesClienteA1 {
  transporte: TransporteSesion;
  token: () => string | null;
  baseReportes?: string;
  baseNodos?: string;
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

function parseReporte(crudo: Record<string, unknown>): ReportePublico {
  return {
    id: texto(crudo.id),
    categoria: texto(crudo.categoria),
    descripcion: texto(crudo.descripcion),
    estado: texto(crudo.estado),
    lat: typeof crudo.lat === 'number' ? crudo.lat : null,
    lng: typeof crudo.lng === 'number' ? crudo.lng : null,
    created_at: typeof crudo.created_at === 'string' ? crudo.created_at : '',
    is_synthetic: crudo.is_synthetic === true,
  };
}

function parseTransicion(crudo: Record<string, unknown>): TransicionReporte {
  return {
    estado_anterior: texto(crudo.estado_anterior),
    estado_nuevo: texto(crudo.estado_nuevo),
    justificacion: texto(crudo.justificacion),
    moderador_hash: texto(crudo.moderador_hash),
    occurred_at: typeof crudo.occurred_at === 'string' ? crudo.occurred_at : '',
  };
}

export function crearClienteA1(opts: OpcionesClienteA1): ClienteA1 {
  const baseReportes: string = opts.baseReportes ?? '/api/reportes';
  const baseNodos: string = opts.baseNodos ?? '/api/nodos';

  const llamar = async (
    ruta: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ) => {
    try {
      return await opts.transporte(ruta, init);
    } catch {
      throw new ErrorA1('no_disponible', 'no se pudo contactar la plataforma');
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
      throw new ErrorA1('no_disponible', 'respuesta malformada de la plataforma');
    }
  };

  const headersToken = (): Record<string, string> => {
    const token = opts.token();
    if (!token) {
      throw new ErrorA1('credenciales', 'se requiere sesión iniciada para esta acción');
    }
    return { Authorization: 'Bearer ' + token };
  };

  const lista = (cuerpo: Envelope, status: number): unknown[] => {
    if (Array.isArray(cuerpo.data)) {
      return cuerpo.data;
    }
    throw new ErrorA1('no_disponible', 'respuesta malformada (HTTP ' + status + ')');
  };

  const categorias = async (nodoKey: string): Promise<CategoriaNodo[]> => {
    const res = await llamar(baseNodos + '/' + encodeURIComponent(nodoKey) + '/categorias');
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      return lista(cuerpo, res.status).map((c) => {
        const crudo = c as Record<string, unknown>;
        return {
          id: texto(crudo.id),
          code: texto(crudo.code),
          label: texto(crudo.label),
          layer: texto(crudo.layer),
        };
      });
    }
    if (res.status === 404) {
      throw new ErrorA1('nodo', 'nodo no encontrado');
    }
    throw new ErrorA1('no_disponible', texto(cuerpo.error) || 'HTTP ' + res.status);
  };

  const reportesPublicos = async (nodoKey: string): Promise<ReportePublico[]> => {
    const res = await llamar(baseNodos + '/' + encodeURIComponent(nodoKey) + '/reportes');
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      // El servidor excluye 'descartado' (ADR-038): lo público es lo público.
      return lista(cuerpo, res.status).map((r) => parseReporte(r as Record<string, unknown>));
    }
    if (res.status === 404) {
      throw new ErrorA1('nodo', 'nodo no encontrado');
    }
    throw new ErrorA1('no_disponible', texto(cuerpo.error) || 'HTTP ' + res.status);
  };

  const crearReporte = async (nuevo: NuevoReporte) => {
    const res = await llamar(baseReportes, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headersToken() },
      body: JSON.stringify({
        nodo_key: nuevo.nodo_key,
        categoria: nuevo.categoria,
        descripcion: nuevo.descripcion,
        lat: nuevo.lat,
        lng: nuevo.lng,
      }),
    });
    const cuerpo = await leerJson(res);
    if ((res.status === 201 || res.status === 200) && cuerpo.data) {
      const reporte = parseReporte(cuerpo.data as Record<string, unknown>);
      const idempotente = res.status === 200 || cuerpo.idempotente === true;
      return { reporte, idempotente };
    }
    const mensaje = texto(cuerpo.error);
    if (res.status === 400) {
      if (mensaje.includes('categoría inexistente')) {
        throw new ErrorA1('categoria', mensaje);
      }
      if (mensaje.includes('datos personales identificables')) {
        // Anti-PII del servidor (ADR-020 cond. 1): el rechazo es genérico, sin eco.
        throw new ErrorA1('pii', mensaje);
      }
      throw new ErrorA1('datos', mensaje || 'datos inválidos');
    }
    if (res.status === 401) {
      throw new ErrorA1('credenciales', 'sesión no válida — iniciá sesión de nuevo');
    }
    if (res.status === 404) {
      throw new ErrorA1('nodo', 'nodo no encontrado');
    }
    if (res.status === 429) {
      throw new ErrorA1('no_disponible', 'demasiados intentos — esperá un momento (techo por rol)');
    }
    throw new ErrorA1('no_disponible', mensaje || 'HTTP ' + res.status);
  };

  const mios = async (): Promise<ReporteMio[]> => {
    const res = await llamar(baseReportes + '/mios', { headers: headersToken() });
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      return lista(cuerpo, res.status).map((r) => {
        const crudo = r as Record<string, unknown>;
        const transiciones = Array.isArray(crudo.transiciones)
          ? crudo.transiciones.map((t) => parseTransicion(t as Record<string, unknown>))
          : [];
        return {
          ...parseReporte(crudo),
          nodo_key: typeof crudo.nodo_key === 'string' ? crudo.nodo_key : null,
          transiciones,
        };
      });
    }
    if (res.status === 401) {
      throw new ErrorA1('credenciales', 'sesión no válida — iniciá sesión de nuevo');
    }
    throw new ErrorA1('no_disponible', texto(cuerpo.error) || 'HTTP ' + res.status);
  };

  const historial = async (reporteId: string): Promise<TransicionReporte[]> => {
    const res = await llamar(baseReportes + '/' + encodeURIComponent(reporteId) + '/historial');
    const cuerpo = await leerJson(res);
    if (res.status === 200) {
      const data = cuerpo.data as Record<string, unknown> | undefined;
      const transiciones = data && Array.isArray(data.transiciones) ? data.transiciones : null;
      if (transiciones === null) {
        throw new ErrorA1('no_disponible', 'respuesta malformada del historial');
      }
      return transiciones.map((t) => parseTransicion(t as Record<string, unknown>));
    }
    if (res.status === 404) {
      // 'descartado' nunca es publicable (ADR-038): su historial es del reportero (/mios).
      throw new ErrorA1('no_encontrado', 'reporte no encontrado o no publicable');
    }
    throw new ErrorA1('no_disponible', texto(cuerpo.error) || 'HTTP ' + res.status);
  };

  return { categorias, reportesPublicos, crearReporte, mios, historial };
}

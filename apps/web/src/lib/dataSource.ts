/**
 * DELocalSoy.AR — Contrato Explícito de Origen de Datos Frontend (Pasos 4, 5, 6 y 7 · [agent: google])
 *
 * Cumple:
 *  - Regla R5 (Prohibición de fallbacks silenciosos): ningún error HTTP (503, 401, 404, 422, 500)
 *    se transforma jamás en `[]`.
 *  - Separación estricta entre `ApiDataSource` (/api/*) y `SyntheticDataSource` (solo con VITE_MOCK_API === '1').
 *  - Distinción explícita entre los 6 estados de UI: loading | ready | empty | degraded | synthetic | error.
 *  - Distinción sin ambigüedad entre los 4 orígenes operativos:
 *      "API real" | "API degradada" | "API sintética" | "Demo local".
 */

import { ApiDataSource, type ApiDataSourceOptions } from './ApiDataSource';
import type {
  CapaInformativa,
  FeatureInformativa,
  FuenteInformativa,
  IngestaPublicada,
} from './servicioInformativo';
import type {
  ComercioDetalle,
  ComercioHistorialEntrada,
  ComercioItem,
  ComerciosQuery,
} from './comercios';
import type {
  AccesibilidadResumen,
  CorredorItem,
  OportunidadesQuery,
  OportunidadItem,
} from './oportunidades';
import type {
  FeatureMapaVig,
  InfraestructuraMovilidad,
  MiReporte,
  PedidosTablero,
  ReporteAmcCreatePayload,
  ReporteAmcResultado,
  ReporteHistorial,
  SubnodoVig,
} from './vig014';

export type SanJuanFocalNodeKey = 'capital' | 'caucete' | 'iglesia';
export type Core004Role = 'ciudadano' | 'moderador' | 'admin';
export type ActivoEstado = 'pendiente' | 'aprobado' | 'rechazado';
export type ActivoCategoria =
  | 'productivo'
  | 'comunitario'
  | 'hidrico'
  | 'patrimonial'
  | 'abastecimiento'
  | 'espacio_publico';

const AR_PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'CUIT/CUIL', regex: /\b(?:20|23|24|27|30|33|34)-?\d{8}-?\d\b/ },
  {
    name: 'DNI',
    regex: /\b(?:dni|documento)\s*[:#-]?\s*\d{7,8}\b|\b\d{2}\.\d{3}\.\d{3}\b/i,
  },
  {
    name: 'Email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  },
  {
    name: 'Teléfono',
    regex:
      /\b(?:\+?54\s*(?:9\s*)?)?(?:0?(?:264|11|351|261)\s*)?(?:15\s*)?\d{3,4}[-\s]?\d{4}\b/,
  },
];

function detectActivoPiiPattern(text: string): string | null {
  for (const p of AR_PII_PATTERNS) {
    if (p.regex.test(text)) {
      return p.name;
    }
  }
  return null;
}

export const ActivoCreateSchema = {
  safeParse(input: ActivoCreatePayload):
    | {
        success: true;
        data: {
          nodo_key: SanJuanFocalNodeKey;
          nombre: string;
          categoria: ActivoCategoria;
          descripcion: string;
          lat: number;
          lng: number;
        };
      }
    | {
        success: false;
        error: { errors: Array<{ path: string[]; message: string }> };
      } {
    const errors: Array<{ path: string[]; message: string }> = [];
    const nombre = String(input?.nombre ?? '').trim();
    const descripcion = String(input?.descripcion ?? '').trim();
    if (nombre.length < 3 || nombre.length > 140) {
      errors.push({
        path: ['nombre'],
        message: 'El nombre del activo debe tener entre 3 y 140 caracteres',
      });
    }
    if (descripcion.length < 10 || descripcion.length > 500) {
      errors.push({
        path: ['descripcion'],
        message: 'La descripción verificable requiere entre 10 y 500 caracteres',
      });
    }
    const piiNombre = detectActivoPiiPattern(nombre);
    if (piiNombre) {
      errors.push({
        path: ['nombre'],
        message: `Guardia Anti-PII (Ley 25.326 / ADR-027): patrón ${piiNombre} no permitido`,
      });
    }
    const piiDesc = detectActivoPiiPattern(descripcion);
    if (piiDesc) {
      errors.push({
        path: ['descripcion'],
        message: `Guardia Anti-PII (Ley 25.326 / ADR-027): patrón ${piiDesc} no permitido`,
      });
    }
    if (errors.length > 0) {
      return { success: false, error: { errors } };
    }
    return {
      success: true,
      data: {
        nodo_key: input.nodo_key,
        nombre,
        categoria: input.categoria,
        descripcion,
        lat: Number(input.lat),
        lng: Number(input.lng),
      },
    };
  },
};

export type DataSourceMode = 'real' | 'synthetic' | 'degraded';

export type UiOperationalState =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'degraded'
  | 'synthetic'
  | 'error';

export type OperationalOriginLabel =
  | 'API real'
  | 'API degradada'
  | 'API sintética'
  | 'Demo local';

export const SYNTHETIC_MODE_WARNING_TEXT =
  'Modo sintético: los datos no provienen de la API real.';

export type DataSourceErrorCode =
  | 'DEGRADED_503'
  | 'UNAUTHORIZED_401'
  | 'ROUTE_MISSING_404'
  | 'VALIDATION_422'
  | 'BAD_REQUEST_400'
  | 'CONFLICT_409'
  | 'INTERNAL_500'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR';

export class DataSourceHttpError extends Error {
  public readonly status: number;
  public readonly endpoint: string;
  public readonly code: DataSourceErrorCode;
  public readonly details?: unknown;

  constructor(params: {
    status: number;
    endpoint: string;
    message: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'DataSourceHttpError';
    this.status = params.status;
    this.endpoint = params.endpoint;
    this.details = params.details;
    this.code = DataSourceHttpError.mapStatusToCode(params.status);
  }

  public static mapStatusToCode(status: number): DataSourceErrorCode {
    switch (status) {
      case 400:
        return 'BAD_REQUEST_400';
      case 401:
      case 403:
        return 'UNAUTHORIZED_401';
      case 404:
        return 'ROUTE_MISSING_404';
      case 409:
        return 'CONFLICT_409';
      case 422:
        return 'VALIDATION_422';
      case 503:
        return 'DEGRADED_503';
      case 500:
        return 'INTERNAL_500';
      case 0:
        return 'NETWORK_ERROR';
      default:
        return 'HTTP_ERROR';
    }
  }
}

export interface HealthResult {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  mode: DataSourceMode;
  modeSource?: 'events_raw' | 'process_memory' | 'env_default' | 'synthetic_explicit';
  dataSource: 'api' | 'synthetic';
  isSilentFallback: false;
  dbConnected: boolean;
  warning?: string;
  upstreamMainCommit?: string;
}

export interface TerritoriesQuery {
  activo?: boolean;
  bbox?: string;
  limit?: number;
  offset?: number;
}

export interface TerritoryItem {
  id: string;
  key: string;
  slug?: string | null;
  nombre: string;
  subtitulo?: string;
  provincia: string;
  foco?: string;
  focusLong?: string;
  poblacion?: number;
  color?: string;
  lat?: number | null;
  lng?: number | null;
  activo: boolean;
  syntheticOrigin?: boolean;
}

export interface EvidenceItem {
  id: string;
  code: string;
  title: string;
  status: 'pendiente' | 'ok' | 'fallido';
  horizon?: string;
  shaAnchor?: string;
  verified_at?: string | null;
  syntheticOrigin?: boolean;
}

export interface EventInput {
  type: string;
  nodeId?: string;
  payload: Record<string, unknown>;
  hash?: string;
  occurred_at?: string;
  apiKey?: string;
}

export interface EventResult {
  success: true;
  status: 'creado' | 'duplicado';
  idempotentReplay: boolean;
  id: string;
  hash: string;
  occurred_at: string;
  mode: DataSourceMode;
}

export interface ActivosQuery {
  nodo_key?: SanJuanFocalNodeKey;
  categoria?: ActivoCategoria;
  estado?: ActivoEstado;
  bbox?: string;
}

export interface ActivoCreatePayload {
  nodo_key: SanJuanFocalNodeKey;
  nombre: string;
  categoria: ActivoCategoria;
  descripcion: string;
  lat: number;
  lng: number;
  rol?: Core004Role;
  token?: string;
}

export interface ActivoItem {
  id: string;
  nodo_key: SanJuanFocalNodeKey;
  nombre: string;
  categoria: ActivoCategoria;
  descripcion: string;
  lat: number;
  lng: number;
  estado: ActivoEstado;
  creado_por_rol: Core004Role;
  event_hash: string;
  is_synthetic: boolean;
  created_at: string;
}

export interface DataSource<TContext = unknown> {
  readonly mode: DataSourceMode;
  readonly name: string;
  readonly context?: TContext;

  health(): Promise<HealthResult>;
  listTerritories(input?: TerritoriesQuery): Promise<TerritoryItem[]>;
  listEvidences(): Promise<EvidenceItem[]>;
  emitEvent(input: EventInput): Promise<EventResult>;
  listActivos?(input?: ActivosQuery): Promise<ActivoItem[]>;
  createActivo?(input: ActivoCreatePayload): Promise<ActivoItem>;
  // NC-R5 (#142, NODO-CAU): servicio informativo — acople por contrato (ADR-029).
  listFuentes?(): Promise<FuenteInformativa[]>;
  listIngestas?(nodoKey: SanJuanFocalNodeKey): Promise<IngestaPublicada[]>;
  listNodeCapas?(nodoKey: SanJuanFocalNodeKey): Promise<CapaInformativa[]>;
  listNodeFeatures?(nodoKey: SanJuanFocalNodeKey): Promise<FeatureInformativa[]>;
  // MARKET-CAP MK-1 (#243, sub-épica #152): Mercado de Proximidad — directorio
  // de comercios del nodo Capital, multinodo desde día 1 (decisión DH) y
  // acoplado por contrato DataSource (ADR-029). Opcional mientras ambas
  // implementaciones convergen (paridad sintética incluida).
  listComercios?(input?: ComerciosQuery): Promise<ComercioItem[]>;
  getComercio?(id: string): Promise<ComercioDetalle>;
  // MARKET-CAP MK-2 (#254, sub-épica #152): historial público F-3 —
  // bitácora derivada de sellos append-only (ADR-032), JAMÁS una tabla
  // mutable. Opcional por contrato (ADR-029); la paridad sintética marca
  // cada entrada sintetico: true y la UI la etiqueta [SINTÉTICO] (R15).
  getComercioHistorial?(id: string): Promise<ComercioHistorialEntrada[]>;
  // NCAP-FE #163 (cascada NODO-CAPITAL, ratificada DH 2026-11-05): vista del
  // nodo Capital — Banco de Potencialidades (NCAP-R6, GET /api/oportunidades),
  // corredores v0.1 (NCAP-R4, GET /api/corredores) y accesibilidad peatonal
  // (NCAP-R5, GET /api/nodos/:key/accesibilidad). Opcional por contrato
  // (ADR-029): las implementaciones convergen sin romperse; la paridad
  // sintética declara SIEMPRE su origen (R15).
  listOportunidades?(input?: OportunidadesQuery): Promise<OportunidadItem[]>;
  listCorredores?(): Promise<CorredorItem[]>;
  getAccesibilidad?(nodoKey: SanJuanFocalNodeKey): Promise<AccesibilidadResumen>;
  // NODO-VIG-3 VIG-014 (#380, épica #377 — cierra el módulo): frontend del
  // nodo iglesia — dashboard de infraestructura y movilidad (VIG-013), mapa
  // de capas y puntos críticos (GET /api/nodos/:key/features), tablero de
  // pedidos a DPV (VIG-012), subnodos VIG-001 y formulario + seguimiento
  // del reporte ciudadano AMC (VIG-011). Opcional por contrato (ADR-029):
  // las implementaciones convergen sin romperse; la paridad sintética
  // declara SIEMPRE su origen (R15) y en synthetic NO hay sesión JWT —
  // las escrituras del panel son demo declarada, nunca acreditada.
  listSubnodos?(nodoKey: SanJuanFocalNodeKey): Promise<SubnodoVig[]>;
  getInfraestructuraMovilidad?(nodoKey: SanJuanFocalNodeKey): Promise<InfraestructuraMovilidad>;
  getFeaturesMapa?(nodoKey: SanJuanFocalNodeKey): Promise<FeatureMapaVig[]>;
  getPedidosTablero?(nodoKey: SanJuanFocalNodeKey): Promise<PedidosTablero>;
  createReporteAmc?(input: ReporteAmcCreatePayload): Promise<ReporteAmcResultado>;
  listMisReportes?(token: string): Promise<MiReporte[]>;
  getReporteHistorial?(id: string): Promise<ReporteHistorial>;
}

export { ApiDataSource, type ApiDataSourceOptions };

export function normalizeTerritoryItem(
  raw: Partial<TerritoryItem> & { id: string; nombre: string; provincia: string; activo: boolean },
  isSynthetic = false,
): TerritoryItem {
  const fallbackKey = raw.nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-');
  return {
    id: raw.id,
    key: raw.key || raw.slug || fallbackKey,
    slug: raw.slug ?? fallbackKey,
    nombre: raw.nombre,
    subtitulo: raw.subtitulo ?? 'Nodo Departamental Federado',
    provincia: raw.provincia,
    foco: raw.foco ?? 'Relevamiento comunitario y activos locales',
    focusLong:
      raw.focusLong ??
      `Nodo federado en ${raw.provincia} integrado al núcleo común de DELocalSoy.AR.`,
    poblacion: raw.poblacion ?? 15000,
    color: raw.color ?? '#2e9e5b',
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    activo: raw.activo,
    syntheticOrigin: isSynthetic,
  };
}

/**
 * Paso 6: `SyntheticDataSource` — Fuente sintética explícita para `VITE_MOCK_API === '1'` o `/demo`.
 *
 * Responsabilidades:
 *  - Declarar siempre `mode: "synthetic"`.
 *  - Exponer datos claramente identificados como sintéticos (`[SINTÉTICO]`).
 *  - No ocultar jamás su origen e incluir la advertencia `SYNTHETIC_MODE_WARNING_TEXT`.
 *  - Ser seleccionada únicamente mediante configuración explícita (`VITE_MOCK_API === '1'`).
 *  - Mantener la misma interfaz e idempotencia determinista que `ApiDataSource`.
 */
export class SyntheticDataSource implements DataSource {
  public readonly mode: DataSourceMode = 'synthetic';
  public readonly name = 'SyntheticDataSource (VITE_MOCK_API=1)';
  private readonly eventsLedger = new Map<
    string,
    { id: string; hash: string; occurred_at: string; type: string }
  >();
  private readonly syntheticActivos: ActivoItem[] = [
    {
      id: 'syn-act-capital-01',
      nodo_key: 'capital',
      nombre: '[SINTÉTICO] Mercado Comunitario de Proximidad Desamparados',
      categoria: 'abastecimiento',
      descripcion:
        'Nodo de abastecimiento barrial de productores hortícolas y panificados locales en Distrito Desamparados.',
      lat: -31.5342,
      lng: -68.5518,
      estado: 'aprobado',
      creado_por_rol: 'moderador',
      event_hash: 'a109c001f4e8b211',
      is_synthetic: true,
      created_at: '2026-10-08T12:00:00.000Z',
    },
    {
      id: 'syn-act-capital-02',
      nodo_key: 'capital',
      nombre: '[SINTÉTICO] Corredor Cultural y Feria Cívica Plaza 25 de Mayo',
      categoria: 'espacio_publico',
      descripcion:
        'Espacio cívico y corredor peatonal de artesanos y emprendedores del Distrito Centro.',
      lat: -31.5375,
      lng: -68.5256,
      estado: 'aprobado',
      creado_por_rol: 'ciudadano',
      event_hash: 'a109c002d9b74122',
      is_synthetic: true,
      created_at: '2026-10-08T12:15:00.000Z',
    },
    {
      id: 'syn-act-caucete-01',
      nodo_key: 'caucete',
      nombre: '[SINTÉTICO] Cooperativa Agro-Hídrica y Empaque de Pasas Caucete',
      categoria: 'productivo',
      descripcion:
        'Planta cooperativa de secado solar y fraccionamiento vitivinícola con riego tecnificado.',
      lat: -31.6518,
      lng: -68.2811,
      estado: 'aprobado',
      creado_por_rol: 'moderador',
      event_hash: 'a109c003e5128a33',
      is_synthetic: true,
      created_at: '2026-10-08T12:30:00.000Z',
    },
    {
      id: 'syn-act-caucete-02',
      nodo_key: 'caucete',
      nombre: '[SINTÉTICO] Estación Comunitaria de Monitoreo de Canal Matriz',
      categoria: 'hidrico',
      descripcion:
        'Punto de aforo participativo de regantes del Oasis Oriental de Caucete.',
      lat: -31.6595,
      lng: -68.2704,
      estado: 'pendiente',
      creado_por_rol: 'ciudadano',
      event_hash: 'a109c004b8319c44',
      is_synthetic: true,
      created_at: '2026-10-08T12:45:00.000Z',
    },
    {
      id: 'syn-act-iglesia-01',
      nodo_key: 'iglesia',
      nombre: '[SINTÉTICO] Casa de Semillas Criollas y Telar Andino Rodeo',
      categoria: 'patrimonial',
      descripcion:
        'Banco comunitario de semillas de altura y taller de tejido artesanal del Valle de Iglesia.',
      lat: -30.2114,
      lng: -69.1392,
      estado: 'aprobado',
      creado_por_rol: 'admin',
      event_hash: 'a109c005c7240d55',
      is_synthetic: true,
      created_at: '2026-10-08T13:00:00.000Z',
    },
    {
      id: 'syn-act-iglesia-02',
      nodo_key: 'iglesia',
      nombre: '[SINTÉTICO] Refugio Comunitario de Cuenca Nivo-Glaciar Las Flores',
      categoria: 'comunitario',
      descripcion:
        'Nodo de apoyo logístico y vigilancia hídrica comunitaria en paso cordillerano de Iglesia.',
      lat: -30.35,
      lng: -69.2167,
      estado: 'pendiente',
      creado_por_rol: 'ciudadano',
      event_hash: 'a109c006f1903e66',
      is_synthetic: true,
      created_at: '2026-10-08T13:15:00.000Z',
    },
  ];

  private static computeDeterministicHash(input: string): string {
    let h1 = 0xdeadbeef ^ input.length;
    let h2 = 0x41c6ce57 ^ input.length;
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return `${hex1}${hex2}${hex1}${hex2}`;
  }

  public async health(): Promise<HealthResult> {
    return {
      status: 'ok',
      service: 'delocalsoy-ar-synthetic-datasource',
      version: '7.6.4-synthetic',
      mode: 'synthetic',
      modeSource: 'synthetic_explicit',
      dataSource: 'synthetic',
      isSilentFallback: false,
      dbConnected: false,
      warning: SYNTHETIC_MODE_WARNING_TEXT,
      upstreamMainCommit: 'e3616b5',
    };
  }

  public async listTerritories(input: TerritoriesQuery = {}): Promise<TerritoryItem[]> {
    const syntheticNodes: TerritoryItem[] = [
      normalizeTerritoryItem(
        {
          id: 'syn-sj-capital',
          key: 'capital',
          slug: 'san-juan-capital-sintetico',
          nombre: '[SINTÉTICO] San Juan Capital (Distrito Centro y Desamparados)',
          subtitulo: 'Datos Sintéticos Opt-In (VITE_MOCK_API=1)',
          provincia: 'San Juan',
          foco: 'Simulación local sin conexión a PostGIS real',
          poblacion: 109123,
          color: '#2e9e5b',
          lat: -31.5375,
          lng: -68.5364,
          activo: true,
        },
        true,
      ),
      normalizeTerritoryItem(
        {
          id: 'syn-sj-caucete',
          key: 'caucete',
          slug: 'caucete-sintetico',
          nombre: '[SINTÉTICO] Caucete (Oasis Oriental Agro-Hídrico)',
          subtitulo: 'Datos Sintéticos Opt-In (VITE_MOCK_API=1)',
          provincia: 'San Juan',
          foco: 'Simulación local de red de riego y cooperativas',
          poblacion: 44000,
          color: '#d97706',
          lat: -31.6518,
          lng: -68.2811,
          activo: true,
        },
        true,
      ),
      normalizeTerritoryItem(
        {
          id: 'syn-sj-iglesia',
          key: 'iglesia',
          slug: 'iglesia-sintetico',
          nombre: '[SINTÉTICO] Iglesia (Valle Cordillerano y Cuencas Nivo-Glaciares)',
          subtitulo: 'Datos Sintéticos Opt-In (VITE_MOCK_API=1)',
          provincia: 'San Juan',
          foco: 'Simulación local de alta montaña y pasos andinos',
          poblacion: 9800,
          color: '#2563eb',
          lat: -30.35,
          lng: -69.2167,
          activo: true,
        },
        true,
      ),
    ];

    if (input.activo !== undefined) {
      return syntheticNodes.filter((n) => n.activo === input.activo);
    }
    return syntheticNodes;
  }

  public async listEvidences(): Promise<EvidenceItem[]> {
    return [
      {
        id: 'syn-ev-001',
        code: 'EV-001',
        title: '[SINTÉTICO] PostGIS 16-3.4 healthy (Simulación local VITE_MOCK_API=1)',
        status: 'ok',
        horizon: 'CORE-001',
        shaAnchor: '2482f63d',
        verified_at: '2026-10-07T00:00:00.000Z',
        syntheticOrigin: true,
      },
      {
        id: 'syn-ev-005',
        code: 'EV-005',
        title: '[SINTÉTICO] Idempotencia UNIQUE(hash) en events_raw (Simulación local)',
        status: 'ok',
        horizon: 'CORE-001',
        shaAnchor: '5c3a7a3',
        verified_at: '2026-10-07T00:00:00.000Z',
        syntheticOrigin: true,
      },
      {
        id: 'syn-ev-025',
        code: 'EV-025',
        title: '[SINTÉTICO] Retiro de /health legado y binding conservador (#57)',
        status: 'ok',
        horizon: 'CORE-002 / #51',
        shaAnchor: '4f0de16',
        verified_at: '2026-10-07T00:00:00.000Z',
        syntheticOrigin: true,
      },
    ];
  }

  public async emitEvent(input: EventInput): Promise<EventResult> {
    if (input.apiKey === 'INVALID_KEY') {
      throw new DataSourceHttpError({
        status: 401,
        endpoint: '/api/events',
        message: 'No autorizado: clave API inválida (fail-closed R8)',
      });
    }

    const serialized = JSON.stringify(input.payload ?? {});
    const piiRegexes = [
      /\b(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})\b/,
      /\b(?:20|23|24|27|30|33|34)-\d{8}-\d\b/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
      /\b(?:\+?54\s?(?:9\s?)?)?(?:264|11|261)[\s-]?\d{3,4}[\s-]?\d{4}\b/,
    ];
    if (piiRegexes.some((rx) => rx.test(serialized))) {
      throw new DataSourceHttpError({
        status: 422,
        endpoint: '/api/events',
        message:
          'Ingesta bloqueada por filtro Anti-PII (Ley 25.326 · EV-023): el payload contiene patrones personales protegidos.',
      });
    }

    const canonical = JSON.stringify({
      type: input.type,
      nodeId: input.nodeId ?? 'nucleo-federado-ar',
      payload: input.payload,
    });
    const hash = input.hash ?? SyntheticDataSource.computeDeterministicHash(canonical);
    const existing = this.eventsLedger.get(hash);

    if (existing) {
      return {
        success: true,
        status: 'duplicado',
        idempotentReplay: true,
        id: existing.id,
        hash: existing.hash,
        occurred_at: existing.occurred_at,
        mode: 'synthetic',
      };
    }

    const created = {
      id: `syn-evt-${hash.slice(0, 10)}`,
      hash,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
      type: input.type,
    };
    this.eventsLedger.set(hash, created);

    return {
      success: true,
      status: 'creado',
      idempotentReplay: false,
      id: created.id,
      hash: created.hash,
      occurred_at: created.occurred_at,
      mode: 'synthetic',
    };
  }

  public async listActivos(input: ActivosQuery = {}): Promise<ActivoItem[]> {
    let items = [...this.syntheticActivos];
    if (input.nodo_key) {
      items = items.filter((a) => a.nodo_key === input.nodo_key);
    }
    if (input.categoria) {
      items = items.filter((a) => a.categoria === input.categoria);
    }
    if (input.estado) {
      items = items.filter((a) => a.estado === input.estado);
    }
    if (input.bbox) {
      const parts = input.bbox.split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        items = items.filter(
          (a) => a.lng >= minLng && a.lng <= maxLng && a.lat >= minLat && a.lat <= maxLat,
        );
      }
    }
    return items;
  }

  public async createActivo(input: ActivoCreatePayload): Promise<ActivoItem> {
    const parsed = ActivoCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DataSourceHttpError({
        status: 422,
        endpoint: '/api/activos',
        message: parsed.error.errors[0]?.message ?? 'Datos de activo inválidos (ActivoCreateSchema)',
        details: parsed.error.errors,
      });
    }

    const valid = parsed.data;
    const hash = SyntheticDataSource.computeDeterministicHash(
      JSON.stringify({
        nodo_key: valid.nodo_key,
        nombre: valid.nombre,
        categoria: valid.categoria,
        lat: valid.lat,
        lng: valid.lng,
      }),
    ).slice(0, 16);

    const existing = this.syntheticActivos.find((a) => a.event_hash === hash);
    if (existing) {
      return existing;
    }

    const rol: Core004Role = input.rol ?? 'ciudadano';
    const created: ActivoItem = {
      id: `syn-act-${valid.nodo_key}-${hash.slice(0, 8)}`,
      nodo_key: valid.nodo_key,
      nombre: valid.nombre.startsWith('[SINTÉTICO]')
        ? valid.nombre
        : `[SINTÉTICO] ${valid.nombre}`,
      categoria: valid.categoria,
      descripcion: valid.descripcion,
      lat: valid.lat,
      lng: valid.lng,
      estado: rol === 'moderador' || rol === 'admin' ? 'aprobado' : 'pendiente',
      creado_por_rol: rol,
      event_hash: hash,
      is_synthetic: true,
      created_at: new Date().toISOString(),
    };

    this.syntheticActivos.unshift(created);
    return created;
  }

  // ─── NC-R5 (#142): servicio informativo sintético en paridad (VITE_MOCK_API=1).
  // R15: declara SIEMPRE origen sintético — jamás se mezcla con datos reales,
  // y ningún organismo demo nombra una organización real. ───

  private readonly syntheticFuentes: FuenteInformativa[] = [
    {
      id: 'syn-fte-cau-01',
      key: 'syn_wms_demo',
      organismo: '[SINTÉTICO] Organismo cartográfico demo',
      nombre: '[SINTÉTICO] Cobertura vectorial demo',
      url: null,
      tipo: 'wms',
      licencia: null,
      estado: 'requiere_credenciales',
      cautela: 'Fuente demo sintética — no existe; en la vida real requiere credenciales.',
      is_synthetic: true,
    },
    {
      id: 'syn-fte-cau-02',
      key: 'syn_descarga_demo',
      organismo: '[SINTÉTICO] Organismo estadístico demo',
      nombre: '[SINTÉTICO] Localidades censales demo',
      url: null,
      tipo: 'descarga',
      licencia: 'Datos abiertos (demo)',
      estado: 'disponible',
      cautela: 'Fuente demo sintética — corte ficticio para paridad de la UI.',
      is_synthetic: true,
    },
    {
      id: 'syn-fte-cau-03',
      key: 'syn_documento_demo',
      organismo: '[SINTÉTICO] Organismo hidráulico demo',
      nombre: '[SINTÉTICO] Inventario de canales demo',
      url: null,
      tipo: 'documento',
      licencia: null,
      estado: 'requiere_solicitud',
      cautela: 'Fuente demo sintética — requiere solicitud formal en la vida real.',
      is_synthetic: true,
    },
  ];

  private readonly syntheticIngestasPublicadas: IngestaPublicada[] = [
    {
      id: 'syn-ing-cau-01',
      fuente_key: 'syn_wms_demo',
      nodo_key: 'caucete',
      capa_servicio: 'hydrology',
      fecha_acceso: '2026-10-08',
      fecha_corte: '2026-10-01',
      licencia: null,
      crs_origen: 'EPSG:4326',
      crs_normalizado: 'EPSG:4326',
      escala_precision: '1:25000 (demo sintética)',
      estado: 'publicado',
      is_synthetic: true,
    },
    {
      id: 'syn-ing-cau-02',
      fuente_key: 'syn_documento_demo',
      nodo_key: 'caucete',
      capa_servicio: 'sustainability',
      fecha_acceso: '2026-10-08',
      fecha_corte: '2026-10-01',
      licencia: null,
      crs_origen: 'EPSG:4326',
      crs_normalizado: 'EPSG:4326',
      escala_precision: null,
      estado: 'publicado',
      is_synthetic: true,
    },
  ];

  private readonly syntheticCapasCaucete: CapaInformativa[] = [
    { id: 'syn-capa-cau-01', key: 'health_facilities', nombre: 'Salud', dominio: 'health', geometria: 'Point', default_on: true },
    { id: 'syn-capa-cau-02', key: 'education', nombre: 'Educación', dominio: 'community', geometria: 'Point', default_on: true },
    { id: 'syn-capa-cau-03', key: 'community_spaces', nombre: 'Espacios y recursos comunitarios', dominio: 'community', geometria: 'Point', default_on: true },
    { id: 'syn-capa-cau-04', key: 'resilience_points', nombre: 'Puntos de resiliencia', dominio: 'health', geometria: 'Point', default_on: false },
    { id: 'syn-capa-cau-05', key: 'community_resources', nombre: 'Agua y recursos básicos', dominio: 'community', geometria: 'Point', default_on: false },
    { id: 'syn-capa-cau-06', key: 'hydrology', nombre: 'Hidrología: canales, acequias y drenaje', dominio: 'assets', geometria: 'LineString', default_on: true },
    { id: 'syn-capa-cau-07', key: 'seismic_risk', nombre: 'Riesgo sísmico y puntos de encuentro', dominio: 'health', geometria: 'Point', default_on: true },
    { id: 'syn-capa-cau-08', key: 'public_space', nombre: 'Espacio público y mejora del común', dominio: 'public_space', geometria: 'Point', default_on: true },
    { id: 'syn-capa-cau-09', key: 'accessibility', nombre: 'Accesibilidad: veredas, rampas y transporte', dominio: 'problems', geometria: 'Point', default_on: false },
    { id: 'syn-capa-cau-10', key: 'sustainability', nombre: 'Sustentabilidad: agua, arbolado, energía y residuos', dominio: 'community', geometria: 'Point', default_on: false },
  ];

  private readonly syntheticFeaturesCaucete: FeatureInformativa[] = [
    { id: 'syn-feat-cau-201', layer: 'hydrology', domain: 'assets', titulo: '[SINTÉTICO] Acequia obstruida — tramo crítico (demo)', tipo: 'problem', estado: 'community_validated', fuente_label: 'Ilustrativa · relevamiento comunitario', observado_at: '2026-10-05T12:00:00Z', lat: -31.383, lng: -68.291, is_synthetic: true },
    { id: 'syn-feat-cau-202', layer: 'hydrology', domain: 'assets', titulo: '[SINTÉTICO] Desagüe insuficiente — punto de riesgo hídrico (demo)', tipo: 'problem', estado: 'pending', fuente_label: 'Ilustrativa · reporte vecinal', observado_at: '2026-10-06T12:00:00Z', lat: -31.371, lng: -68.274, is_synthetic: true },
    { id: 'syn-feat-cau-203', layer: 'seismic_risk', domain: 'health', titulo: '[SINTÉTICO] Punto de encuentro comunitario señalado (demo)', tipo: 'asset', estado: 'verified', fuente_label: 'Ilustrativa · inventario institucional', observado_at: '2026-10-04T12:00:00Z', lat: -31.386, lng: -68.279, is_synthetic: true },
    { id: 'syn-feat-cau-204', layer: 'public_space', domain: 'public_space', titulo: '[SINTÉTICO] Plaza con mobiliario a mejorar (demo)', tipo: 'problem', estado: 'community_validated', fuente_label: 'Ilustrativa · relevamiento comunitario', observado_at: '2026-10-05T12:00:00Z', lat: -31.379, lng: -68.283, is_synthetic: true },
    { id: 'syn-feat-cau-205', layer: 'sustainability', domain: 'community', titulo: '[SINTÉTICO] Arbolado faltante en corredor cívico (demo)', tipo: 'problem', estado: 'pending', fuente_label: 'Ilustrativa · reporte vecinal', observado_at: '2026-10-06T12:00:00Z', lat: -31.388, lng: -68.276, is_synthetic: true },
  ];

  public async listFuentes(): Promise<FuenteInformativa[]> {
    return this.syntheticFuentes.map((f) => ({ ...f }));
  }

  public async listIngestas(nodoKey: SanJuanFocalNodeKey): Promise<IngestaPublicada[]> {
    if (nodoKey !== 'caucete') return [];
    return this.syntheticIngestasPublicadas.map((i) => ({ ...i }));
  }

  public async listNodeCapas(nodoKey: SanJuanFocalNodeKey): Promise<CapaInformativa[]> {
    if (nodoKey !== 'caucete') return [];
    return this.syntheticCapasCaucete.map((c) => ({ ...c }));
  }

  public async listNodeFeatures(nodoKey: SanJuanFocalNodeKey): Promise<FeatureInformativa[]> {
    if (nodoKey !== 'caucete') return [];
    return this.syntheticFeaturesCaucete.map((f) => ({ ...f }));
  }

  // MARKET-CAP MK-1 (#243, sub-épica #152): paridad sintética del Mercado de
  // Proximidad — la demo vive SOLO aquí (VITE_MOCK_API === '1'), con prefijo
  // [SINTÉTICO] y estado_epistemico 'synthetic_demo'. El seed real es 0
  // comercios (decisión DH, patrón VIG-005, R15: jamás se maqueta).
  private readonly syntheticComerciosCapital: ComercioItem[] = [
    {
      id: 'syn-com-capital-01',
      titulo: '[SINTÉTICO] Almacén y despensa de proximidad del microcentro (demo)',
      descripcion: 'Demo sintética del Mercado de Proximidad: ficha de ejemplo del rubro Alimentación y bebidas (canon de 11, #243).',
      nodo_key: 'capital',
      subnodo_key: 'sj_capital_centro',
      lat: -31.5372,
      lng: -68.5224,
      rubro: { id: 'food_drink', rama: 'comercios', label: 'Alimentación y bebidas' },
      estado: 'aprobado',
      habilitacion_estado: 'sin_dato',
      titularidad_estado: 'sin_reclamo',
      estado_epistemico: 'synthetic_demo',
    },
    {
      id: 'syn-com-capital-02',
      titulo: '[SINTÉTICO] Taller de oficios del corredor Libertador (demo)',
      descripcion: 'Demo sintética del Mercado de Proximidad: ficha de ejemplo del rubro Hogar y servicios técnicos (canon de 11, #243).',
      nodo_key: 'capital',
      subnodo_key: 'sj_capital_centro',
      lat: -31.5413,
      lng: -68.5361,
      rubro: { id: 'home_technical', rama: 'comercios', label: 'Hogar y servicios técnicos' },
      estado: 'aprobado',
      habilitacion_estado: 'sin_dato',
      titularidad_estado: 'sin_reclamo',
      estado_epistemico: 'synthetic_demo',
    },
  ];

  public async listComercios(input?: ComerciosQuery): Promise<ComercioItem[]> {
    let items = this.syntheticComerciosCapital.map((c) => ({ ...c }));
    if (typeof input?.nodo === 'string' && input.nodo !== '') {
      items = items.filter((c) => c.nodo_key === input.nodo);
    }
    if (typeof input?.rubro === 'string' && input.rubro !== '') {
      items = items.filter((c) => c.rubro.id === input.rubro);
    }
    if (typeof input?.subnodo === 'string' && input.subnodo !== '') {
      items = items.filter((c) => c.subnodo_key === input.subnodo);
    }
    if (typeof input?.habilitacion === 'string' && input.habilitacion !== '') {
      items = items.filter((c) => c.habilitacion_estado === input.habilitacion);
    }
    return items;
  }

  public async getComercio(id: string): Promise<ComercioDetalle> {
    const ficha = this.syntheticComerciosCapital.find((c) => c.id === id);
    if (ficha === undefined) {
      throw new DataSourceHttpError({
        status: 404,
        endpoint: '/api/comercios/' + id,
        message: 'Comercio no encontrado en la demo sintética (R5: sin fallback silencioso)',
      });
    }
    return { ficha: { ...ficha }, operativa: null, productos: [], count_productos: 0 };
  }

  // MARKET-CAP MK-2 (#254): paridad sintética del historial F-3 — ciclo
  // demo por ficha (H6: toda ficha viva tiene al menos 1 sello
  // comercio.ingestado). Cada entrada declara sintetico: true (R15: la
  // demo se declara SIEMPRE — el panel la etiqueta [SINTÉTICO], jamás se
  // disfraza de registro sellado real).
  private readonly syntheticHistorialComercios: Record<string, ComercioHistorialEntrada[]> = {
    'syn-com-capital-01': [
      { type: 'comercio.ingestado', occurred_at: '2026-10-08T12:00:00.000Z', sintetico: true },
      {
        type: 'comercio.titularidad_reclamada',
        metodo: 'documento_verificable',
        occurred_at: '2026-10-09T12:00:00.000Z',
        sintetico: true,
      },
      {
        type: 'comercio.titularidad_verificada',
        metodo: 'documento_verificable',
        verificado_por_hash: 'syn-hash-moderador-demo',
        occurred_at: '2026-10-09T13:00:00.000Z',
        sintetico: true,
      },
      {
        type: 'comercio.habilitacion_actualizada',
        estado_anterior: 'sin_dato',
        estado_nuevo: 'verificada',
        fuente_key: 'fuente_siic_web',
        justificacion: 'Certificado web SIIC presentado por el titular (demo sintética, ADR-035).',
        actualizado_por_hash: 'syn-hash-titular-demo',
        occurred_at: '2026-10-10T12:00:00.000Z',
        sintetico: true,
      },
    ],
    'syn-com-capital-02': [
      { type: 'comercio.ingestado', occurred_at: '2026-10-08T12:30:00.000Z', sintetico: true },
    ],
  };

  public async getComercioHistorial(id: string): Promise<ComercioHistorialEntrada[]> {
    const historial = this.syntheticHistorialComercios[id];
    if (historial === undefined) {
      throw new DataSourceHttpError({
        status: 404,
        endpoint: '/api/comercios/' + id + '/historial',
        message: 'Historial no disponible en la demo sintética (R5: sin fallback silencioso)',
      });
    }
    return historial.map((e) => ({ ...e }));
  }

  // NCAP-FE #163 (cascada NODO-CAPITAL, ratificada DH 2026-11-05): paridad
  // sintética de la vista del nodo Capital — la demo vive SOLO aquí
  // (VITE_MOCK_API === '1') con títulos [SINTÉTICO] (R15: lo sintético se
  // declara SIEMPRE). Los corredores sintéticos nacen 'candidate' (hipótesis
  // de diseño, NCAP-R4 #156) y la accesibilidad sintética declara cobertura
  // 0 de N honesta (NCAP-R5 #157: anuncio ≠ obra, jamás se maquilla).
  private readonly syntheticOportunidadesCapital: OportunidadItem[] = [
    {
      id: 'syn-opp-capital-01',
      tipo: 'human_capacity',
      titulo: '[SINTÉTICO] Taller cooperativo de oficios del microcentro (demo)',
      descripcion:
        'Demo sintética del Banco de Potencialidades: capacidad humana comunitaria en revisión técnica (canon de 10 tipos, NCAP-R6 #158).',
      estado: 'under_review',
      nodo_key: 'capital',
      subnodo_key: 'sj_capital_centro',
      evidencia: {
        evidence_type: 'community_input',
        descripcion: 'Aporte de asamblea vecinal (demo sintética).',
        reference_url: null,
        validationStatus: null,
      },
      actores: [{ role: 'proposer', name: 'Cooperativa de oficios (demo)', consent_confirmed: true }],
      tags: ['demo', 'oficios'],
      scoring: null,
      territorial_context: {
        corridor_id: 'cor_centro_micro_macro',
        landmark_id: null,
        service_area_name: 'Microcentro (demo)',
      },
      created_at: '2026-11-05T12:00:00.000Z',
      updated_at: '2026-11-05T12:00:00.000Z',
    },
    {
      id: 'syn-opp-capital-02',
      tipo: 'market_gap',
      titulo: '[SINTÉTICO] Brecha de abastecimiento en Desamparados (demo)',
      descripcion:
        'Demo sintética del Banco de Potencialidades: demanda comunitaria detectada, aún sin revisión técnica (estado honesto detected).',
      estado: 'detected',
      nodo_key: 'capital',
      subnodo_key: 'sj_capital_desamparados',
      evidencia: {
        evidence_type: 'field_observation',
        descripcion: 'Relevo vecinal de terreno (demo sintética).',
        reference_url: null,
        validationStatus: null,
      },
      actores: [{ role: 'proposer', name: 'Unión vecinal (demo)', consent_confirmed: true }],
      tags: ['demo', 'abastecimiento'],
      scoring: null,
      territorial_context: null,
      created_at: '2026-11-05T12:30:00.000Z',
      updated_at: '2026-11-05T12:30:00.000Z',
    },
  ];

  private readonly syntheticCorredoresCapital: CorredorItem[] = [
    {
      key: 'cor_centro_civico',
      label: '[SINTÉTICO] Corredor Cívico-Cultural (demo)',
      proposito: 'Demo sintética: hipótesis de articulación cívico-cultural del centro (NCAP-R4 #156).',
      status: 'candidate',
      nodo_key: 'capital',
      segmentos_count: 3,
      hitos_count: 3,
      continuidad: 'ok',
    },
    {
      key: 'cor_libertador_west',
      label: '[SINTÉTICO] Corredor Libertador Oeste (demo)',
      proposito: 'Demo sintética: eje universitario-oeste, hipótesis de diseño (NCAP-R4 #156).',
      status: 'candidate',
      nodo_key: 'capital',
      segmentos_count: 2,
      hitos_count: 2,
      continuidad: 'ok',
    },
  ];

  private readonly syntheticAccesibilidadCapital: AccesibilidadResumen = {
    nodo_key: 'capital',
    generado_en: '2026-11-05T12:00:00.000Z',
    regla: 'Conteos con cobertura y fecha — jamás puntajes globales (R5/ADR-036)',
    features_por_capa: [
      { capa: 'accessibility', total: 2, por_estado: { pending: 1, verified: 1 } },
      { capa: 'sidewalks', total: 2, por_estado: { declared: 2 } },
    ],
    features_por_fuente: [{ fuente: 'Ilustrativa · demo sintética del panel', total: 4 }],
    reportes_por_categoria: [{ categoria: 'accesibilidad', total: 1 }],
    tramos_vereda: {
      priorizados: 2,
      con_relevamiento: 0,
      cobertura: '0 de 2 tramos priorizados cuentan con relevamiento',
      fecha_corte: '2026-11-05T12:00:00.000Z',
      cautela: 'Demo sintética: anuncio ≠ obra (R15) — cobertura 0 honesta, sin maquillar.',
    },
    observaciones: {
      ingresadas: 1,
      revisadas: 0,
      corroboradas: 1,
      disputadas: 0,
      ilustrativas: 0,
      fecha_corte: '2026-11-05T12:00:00.000Z',
    },
    hitos: [
      {
        key: 'hit_demo_centro',
        label: '[SINTÉTICO] Hito demo del centro',
        tipo: 'plaza',
        con_ficha: true,
        ultima_revision: '2026-11-05T12:00:00.000Z',
      },
    ],
  };

  // VIG-014 (#380): paridad sintética del módulo de infraestructura y
  // movilidad del nodo iglesia — demo declarada ([SINTÉTICO], R15): km
  // null honesto, paradas VACÍAS, «0 de 15» pedidos y 0 KPIs sin corrida.
  private readonly syntheticSubnodosIglesia: SubnodoVig[] = [
    {
      key: 'sj_iglesia_rodeo',
      label: '[SINTÉTICO] Rodeo (demo declarada)',
      type: 'district',
      parent_key: null,
      lat: -30.2114,
      lng: -69.1392,
    },
    {
      key: 'sj_iglesia_villa_iglesia',
      label: '[SINTÉTICO] Villa Iglesia (demo declarada)',
      type: 'district',
      parent_key: null,
      lat: -30.0367,
      lng: -69.1669,
    },
    {
      key: 'sj_iglesia_p_las_flores',
      label: '[SINTÉTICO] Las Flores (demo declarada)',
      type: 'paraje',
      parent_key: 'sj_iglesia_rodeo',
      lat: -30.35,
      lng: -69.2167,
    },
  ];

  private readonly syntheticInfraestructuraMovilidadIglesia: InfraestructuraMovilidad = {
    nodo_key: 'iglesia',
    generado_en: '2026-11-06T12:00:00.000Z',
    regla: 'Conteos con cobertura y fecha — jamás puntajes globales (R5/ADR-036)',
    obras: {
      total: 2,
      por_estado: { declared: 2 },
      por_fuente: [{ fuente: 'Ilustrativa · demo sintética del panel', total: 2 }],
      km_ejecucion: null,
      km_nota: 'los km de los tramos en ejecución no están estructurados en fuente verificada — null honesto (R15)',
      fecha_corte: '2026-11-06',
      cautela: 'demo sintética: anuncio ≠ obra (R15) — el estado por tramo exige verificación',
    },
    puntos_criticos: {
      total: 1,
      por_estado: { community_validated: 1 },
      criticos: [
        {
          id: 'syn-pc-demo-01',
          titulo: '[SINTÉTICO] 3 reportes de 2 vecinos (demo declarada)',
          estado: 'community_validated',
          observado_at: '2026-11-06',
        },
      ],
      fecha_corte: '2026-11-06',
      cautela: 'demo sintética: la comunidad corrobora, NUNCA verifica (R15)',
    },
    paradas_transporte: {
      total: 0,
      por_estado: {},
      cobertura: '0 paradas registradas (sin padrón verificado — R15)',
      fuente: 'agregador de transporte (secundaria/provisional — ADR-035)',
      cautela: 'demo sintética: la capa parada_transporte nace VACÍA (R15)',
    },
    cobertura_sos: {
      red_por_estado: { verified: 1 },
      brechas_declaradas: [
        {
          tramo: '[SINTÉTICO] RN 150 tramo Las Flores–Colola (demo declarada)',
          estado: 'declarada',
          fuente: 'documento vecinal interno (procedencia declarada, sin firmantes — ADR-027)',
        },
      ],
      fecha_corte: '2026-11-06',
      cautela: 'demo sintética: brechas DECLARADAS por el trabajo territorial (R15)',
    },
    pedidos_dpv: {
      esperados_documento: 15,
      presentados: 0,
      respondidos: 0,
      cobertura: '0 de 15 presentados · 0 respondidos (corte 2026-11-06)',
      fecha_corte: '2026-11-06',
    },
    kpis: {
      total: 0,
      snapshots: [],
      fecha_corte: null,
      nota: 'demo sintética: sin corrida del consumidor vig003-kpi → 0 honesto (R15)',
    },
  };

  public async listSubnodos(nodoKey: SanJuanFocalNodeKey): Promise<SubnodoVig[]> {
    if (nodoKey !== 'iglesia') {
      throw new DataSourceHttpError({
        status: 404,
        endpoint: '/api/nodos/' + nodoKey + '/subnodos',
        message: 'Subnodos no disponibles en la demo sintética para el nodo ' + nodoKey + ' (R5: sin fallback silencioso)',
      });
    }
    return this.syntheticSubnodosIglesia.map((s) => ({ ...s }));
  }

  public async getInfraestructuraMovilidad(nodoKey: SanJuanFocalNodeKey): Promise<InfraestructuraMovilidad> {
    if (nodoKey !== 'iglesia') {
      throw new DataSourceHttpError({
        status: 404,
        endpoint: '/api/nodos/' + nodoKey + '/infraestructura-movilidad',
        message: 'Dashboard no disponible en la demo sintética para el nodo ' + nodoKey + ' (R5: sin fallback silencioso)',
      });
    }
    const base = this.syntheticInfraestructuraMovilidadIglesia;
    return {
      ...base,
      obras: { ...base.obras, por_estado: { ...base.obras.por_estado }, por_fuente: base.obras.por_fuente.map((f) => ({ ...f })) },
      puntos_criticos: {
        ...base.puntos_criticos,
        por_estado: { ...base.puntos_criticos.por_estado },
        criticos: base.puntos_criticos.criticos.map((c) => ({ ...c })),
      },
      paradas_transporte: { ...base.paradas_transporte, por_estado: { ...base.paradas_transporte.por_estado } },
      cobertura_sos: {
        ...base.cobertura_sos,
        red_por_estado: { ...base.cobertura_sos.red_por_estado },
        brechas_declaradas: base.cobertura_sos.brechas_declaradas.map((b) => ({ ...b })),
      },
      pedidos_dpv: { ...base.pedidos_dpv },
      kpis: { ...base.kpis, snapshots: base.kpis.snapshots.map((s) => ({ ...s, detalles: { ...s.detalles } })) },
    };
  }

  public async getFeaturesMapa(nodoKey: SanJuanFocalNodeKey): Promise<FeatureMapaVig[]> {
    if (nodoKey !== 'iglesia') {
      throw new DataSourceHttpError({
        status: 404,
        endpoint: '/api/nodos/' + nodoKey + '/features',
        message: 'Features no disponibles en la demo sintética para el nodo ' + nodoKey + ' (R5: sin fallback silencioso)',
      });
    }
    return [
      {
        id: 'syn-f-vig014-obra-demo',
        capa: 'obra_vial',
        titulo: '[SINTÉTICO] RN 150 tramo demo (demo declarada)',
        estado: 'declared',
        fuente_label: 'Ilustrativa · demo sintética del panel',
        lat: -30.28,
        lng: -69.19,
        is_synthetic: true,
      },
      {
        id: 'syn-f-vig014-critico-demo',
        capa: 'punto_critico',
        titulo: '[SINTÉTICO] Punto crítico demo (3 reportes de 2 vecinos)',
        estado: 'community_validated',
        fuente_label: 'Ilustrativa · demo sintética del panel',
        lat: -30.21,
        lng: -69.14,
        is_synthetic: true,
      },
    ];
  }

  public async getPedidosTablero(nodoKey: SanJuanFocalNodeKey): Promise<PedidosTablero> {
    if (nodoKey !== 'iglesia') {
      throw new DataSourceHttpError({
        status: 404,
        endpoint: '/api/pedidos?nodo=' + nodoKey,
        message: 'Tablero no disponible en la demo sintética para el nodo ' + nodoKey + ' (R5: sin fallback silencioso)',
      });
    }
    return {
      esperados_documento: 15,
      presentados: 0,
      respondidos: 0,
      respondidos_en_plazo: 0,
      respondidos_tardio: 0,
      sin_respuesta: 0,
      en_espera: 0,
      fecha_corte: '2026-11-06',
      cobertura: '0 de 15 presentados · 0 respondidos (corte 2026-11-06)',
      fuente: '[SINTÉTICO] demo declarada del tablero de pedidos (R15)',
      pedidos: [],
    };
  }

  // Demo declarada (R15): en synthetic NO hay sesión JWT ni persistencia —
  // el resultado se etiqueta y JAMÁS se presenta como acreditado.
  public async createReporteAmc(_input: ReporteAmcCreatePayload): Promise<ReporteAmcResultado> {
    return {
      id: 'syn-reporte-demo-01',
      categoria: _input.categoria,
      estado: 'received',
      creado: true,
      duplicados_sugeridos: [],
      duplicados_verificados: true,
      cluster: null,
      cluster_verificado: true,
      devolucion: '[SINTÉTICO] demo declarada: sin sesión JWT no hay escritura acreditada (R15) — iniciá sesión con la API real para reportar.',
    };
  }

  public async listMisReportes(_token: string): Promise<MiReporte[]> {
    return [
      {
        id: 'syn-reporte-demo-01',
        nodo_key: 'iglesia',
        categoria: 'road_surface',
        descripcion: '[SINTÉTICO] demo declarada del seguimiento — sin sesión no hay reportes propios.',
        estado: 'received',
        lat: -30.21,
        lng: -69.14,
        created_at: '2026-11-06T12:00:00.000Z',
        transiciones: [],
      },
    ];
  }

  public async getReporteHistorial(id: string): Promise<ReporteHistorial> {
    if (id !== 'syn-reporte-demo-01') {
      throw new DataSourceHttpError({
        status: 404,
        endpoint: '/api/reportes/' + id + '/historial',
        message: 'Historial no disponible en la demo sintética (R5: sin fallback silencioso)',
      });
    }
    return { reporte_id: id, transiciones: [] };
  }

  public async listOportunidades(input?: OportunidadesQuery): Promise<OportunidadItem[]> {
    let items = this.syntheticOportunidadesCapital.map((o) => ({
      ...o,
      evidencia: { ...o.evidencia },
      actores: o.actores.map((a) => ({ ...a })),
    }));
    const nodo = input?.nodo;
    if (typeof nodo === 'string' && nodo !== '') {
      items = items.filter((o) => o.nodo_key === nodo);
    }
    const tipo = input?.tipo;
    if (typeof tipo === 'string' && tipo !== '') {
      items = items.filter((o) => o.tipo === tipo);
    }
    const estado = input?.estado;
    if (typeof estado === 'string' && estado !== '') {
      items = items.filter((o) => o.estado === estado);
    }
    const subnodo = input?.subnodo;
    if (typeof subnodo === 'string' && subnodo !== '') {
      items = items.filter((o) => (o.subnodo_key ?? '') === subnodo);
    }
    return items;
  }

  public async listCorredores(): Promise<CorredorItem[]> {
    return this.syntheticCorredoresCapital.map((c) => ({ ...c }));
  }

  public async getAccesibilidad(nodoKey: SanJuanFocalNodeKey): Promise<AccesibilidadResumen> {
    if (nodoKey !== 'capital') {
      throw new DataSourceHttpError({
        status: 404,
        endpoint: '/api/nodos/' + nodoKey + '/accesibilidad',
        message: 'Accesibilidad no disponible en la demo sintética para el nodo ' + nodoKey + ' (R5: sin fallback silencioso)',
      });
    }
    const base = this.syntheticAccesibilidadCapital;
    return {
      ...base,
      features_por_capa: base.features_por_capa.map((c) => ({ ...c, por_estado: { ...c.por_estado } })),
      features_por_fuente: base.features_por_fuente.map((f) => ({ ...f })),
      reportes_por_categoria: base.reportes_por_categoria.map((c) => ({ ...c })),
      tramos_vereda: { ...base.tramos_vereda },
      observaciones: { ...base.observaciones },
      hitos: base.hitos.map((h) => ({ ...h })),
    };
  }
}

/**
 * Selección determinista del DataSource (Paso 6):
 * `VITE_MOCK_API === '1'` activa `SyntheticDataSource`; por defecto siempre utiliza `ApiDataSource`.
 */
export function createDataSource(options?: {
  viteMockApi?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}): DataSource {
  const mockFlag =
    options?.viteMockApi ??
    (typeof import.meta !== 'undefined' && (import.meta as any).env
      ? String((import.meta as any).env.VITE_MOCK_API ?? '')
      : '');

  if (mockFlag === '1') {
    return new SyntheticDataSource();
  }
  return new ApiDataSource({
    fetchImpl: options?.fetchImpl,
    baseUrl: options?.baseUrl,
  });
}

/**
 * Paso 7: Resolución sin ambigüedad de los 6 estados operativos de la UI
 * (`loading | ready | empty | degraded | synthetic | error`) y las 4 etiquetas de origen
 * (`API real | API degradada | API sintética | Demo local`).
 * Jamás trata `empty`, `degraded` y `error` como equivalentes.
 */
export function resolveUiOperationalState(params: {
  loading: boolean;
  error: Error | DataSourceHttpError | null;
  mode: DataSourceMode;
  itemCount: number;
}): UiOperationalState {
  if (params.loading) return 'loading';
  if (params.error) {
    if (
      params.error instanceof DataSourceHttpError &&
      params.error.status === 503
    ) {
      return 'degraded';
    }
    return 'error';
  }
  if (params.mode === 'degraded') return 'degraded';
  if (params.mode === 'synthetic') return 'synthetic';
  if (params.itemCount === 0) return 'empty';
  return 'ready';
}

export function resolveOperationalOriginLabel(params: {
  isDemoNamespace: boolean;
  mode: DataSourceMode;
}): OperationalOriginLabel {
  if (params.isDemoNamespace) return 'Demo local';
  if (params.mode === 'synthetic') return 'API sintética';
  if (params.mode === 'degraded') return 'API degradada';
  return 'API real';
}

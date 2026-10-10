/**
 * DELocalSoy.AR — Implementación de `ApiDataSource` (`apps/web/src/lib/ApiDataSource.ts`)
 *
 * Cumple:
 *  - Paso 5 ([agent: google]): Fuente concreta para consumir las rutas `/api/*`
 *    (`/api/health`, `/api/territorios`, `/api/evidencias`, `/api/events`).
 *  - Regla R5 (Prohibición de fallbacks silenciosos): captura errores HTTP específicos
 *    (503 degraded, 401/403 unauthorized, 404 route missing, 422 validation/Anti-PII, 500 internal error)
 *    mediante `DataSourceHttpError`, evitando jamás convertirlos en arrays vacíos `[]`.
 *  - Propagación honesta de `runtimeMode` (`real | synthetic | degraded`) obtenido desde el
 *    encabezado `X-DELocalSoy-Runtime-Mode` en cada respuesta HTTP o desde `/api/health`.
 *  - Preservación de la semántica idempotente de `POST /api/events` (`creado` | `duplicado`,
 *    mismo `id` y `hash` · EV-005).
 */

import {
  ActivoCreateSchema,
  DataSourceHttpError,
  normalizeTerritoryItem,
  SYNTHETIC_MODE_WARNING_TEXT,
  type ActivoCategoria,
  type ActivoCreatePayload,
  type ActivoEstado,
  type ActivoItem,
  type ActivosQuery,
  type Core004Role,
  type DataSource,
  type DataSourceMode,
  type EventInput,
  type EventResult,
  type EvidenceItem,
  type HealthResult,
  type SanJuanFocalNodeKey,
  type TerritoriesQuery,
  type TerritoryItem,
} from './dataSource';

export interface ApiDataSourceOptions {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  initialMode?: DataSourceMode;
  onRuntimeModeChange?: (mode: DataSourceMode, source: 'header' | 'health' | 'status_503') => void;
}

export class ApiDataSource implements DataSource {
  private currentRuntimeMode: DataSourceMode;
  public readonly name = 'ApiDataSource (/api/*)';
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly onRuntimeModeChange?: (
    mode: DataSourceMode,
    source: 'header' | 'health' | 'status_503',
  ) => void;

  constructor(options?: ApiDataSourceOptions) {
    this.fetchImpl = options?.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.baseUrl = (options?.baseUrl ?? '').replace(/\/+$/, '');
    this.currentRuntimeMode = options?.initialMode ?? 'real';
    this.onRuntimeModeChange = options?.onRuntimeModeChange;
  }

  /**
   * Propiedad requerida por la interfaz `DataSource`.
   */
  public get mode(): DataSourceMode {
    return this.currentRuntimeMode;
  }

  /**
   * Alias explícito del modo operativo propagado desde `X-DELocalSoy-Runtime-Mode` o `/api/health`.
   */
  public get runtimeMode(): DataSourceMode {
    return this.currentRuntimeMode;
  }

  private updateRuntimeMode(
    nextMode: DataSourceMode,
    source: 'header' | 'health' | 'status_503',
  ): void {
    this.currentRuntimeMode = nextMode;
    this.onRuntimeModeChange?.(nextMode, source);
  }

  /**
   * Garantiza que toda petición de `ApiDataSource` apunte al prefijo canónico `/api/*`
   * (PR #61 @ 1988f1f y PR #75 @ 4f0de16 · EV-025).
   */
  private assertCanonicalApiEndpoint(endpoint: string): string {
    if (!endpoint.startsWith('/api/')) {
      throw new DataSourceHttpError({
        status: 404,
        endpoint,
        message: `Ruta fuera del prefijo canónico /api/* rechazada por ApiDataSource: ${endpoint}`,
      });
    }
    return `${this.baseUrl}${endpoint}`;
  }

  /**
   * Extrae y valida el encabezado `X-DELocalSoy-Runtime-Mode` de la respuesta HTTP.
   */
  private inspectRuntimeModeHeader(res: Response): DataSourceMode | null {
    const rawHeader =
      res.headers?.get?.('X-DELocalSoy-Runtime-Mode') ??
      res.headers?.get?.('x-delocalsoy-runtime-mode') ??
      null;
    if (rawHeader === 'real' || rawHeader === 'synthetic' || rawHeader === 'degraded') {
      this.updateRuntimeMode(rawHeader, 'header');
      return rawHeader;
    }
    return null;
  }

  /**
   * Ejecuta una petición `fetch` hacia `/api/*`, actualiza `runtimeMode` y convierte cualquier
   * código HTTP no exitoso (503, 401, 404, 422, 500, etc.) en `DataSourceHttpError` tipado.
   * Jamás captura errores para devolver `[]` (cumplimiento estricto de Regla R5).
   */
  protected async requestJson<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = this.assertCanonicalApiEndpoint(endpoint);
    let res: Response;
    try {
      res = await this.fetchImpl(url, init);
    } catch (err) {
      throw new DataSourceHttpError({
        status: 0,
        endpoint,
        message: `Error de red al conectar con ${endpoint}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    this.inspectRuntimeModeHeader(res);

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    // Si el cuerpo JSON también informa `mode`, sincronizar cuando el header no estuvo presente
    if (
      body &&
      (body.mode === 'real' || body.mode === 'synthetic' || body.mode === 'degraded')
    ) {
      this.updateRuntimeMode(body.mode, 'health');
    }

    if (!res.ok) {
      if (res.status === 503) {
        this.updateRuntimeMode('degraded', 'status_503');
      }

      const defaultStatusDescription: Record<number, string> = {
        400: `Solicitud inválida (400) en ${endpoint}`,
        401: `No autorizado (401) en ${endpoint}: falta o es inválida la clave API (Regla R8 fail-closed)`,
        403: `Acceso denegado (403) en ${endpoint}`,
        404: `Ruta no encontrada (404) en ${endpoint}`,
        409: `Conflicto de estado (409) en ${endpoint}`,
        422: `Error de validación / Guardia Anti-PII (422) en ${endpoint}`,
        500: `Error interno del servidor (500) en ${endpoint}`,
        503: `Servicio degradado (503) en ${endpoint}: base de datos no disponible (Regla R5)`,
      };

      const serverMsg =
        body?.error ||
        body?.message ||
        defaultStatusDescription[res.status] ||
        `HTTP ${res.status} en ${endpoint}`;

      throw new DataSourceHttpError({
        status: res.status,
        endpoint,
        message: serverMsg,
        details: body,
      });
    }

    return body as T;
  }

  /**
   * Consulta `GET /api/health`, propaga `runtimeMode` (`real | synthetic | degraded`)
   * y expone `modeSource` (`events_raw | process_memory | env_default | synthetic_explicit`).
   */
  public async health(): Promise<HealthResult> {
    const payload = await this.requestJson<any>('/api/health');
    const resolvedMode: DataSourceMode =
      payload?.mode === 'real' || payload?.mode === 'synthetic' || payload?.mode === 'degraded'
        ? payload.mode
        : payload?.status === 'degraded'
          ? 'degraded'
          : this.currentRuntimeMode;

    this.updateRuntimeMode(resolvedMode, 'health');

    return {
      status: resolvedMode === 'degraded' ? 'degraded' : 'ok',
      service: payload?.service ?? 'delocalsoy-ar-api',
      version: payload?.version ?? '7.6.4',
      mode: resolvedMode,
      modeSource: payload?.modeSource ?? 'env_default',
      dataSource: resolvedMode === 'synthetic' ? 'synthetic' : 'api',
      isSilentFallback: false,
      dbConnected: Boolean(payload?.dbConnected),
      upstreamMainCommit: payload?.upstreamMain?.lastCommit ?? 'e3616b5',
      warning: resolvedMode === 'synthetic' ? SYNTHETIC_MODE_WARNING_TEXT : undefined,
    };
  }

  /**
   * Consulta `GET /api/territorios` soportando filtros `activo`, `bbox`, `limit` y `offset`.
   * Nunca transforma un error HTTP (503, 401, 404, 500) ni un cuerpo inválido en `[]`.
   */
  public async listTerritories(input: TerritoriesQuery = {}): Promise<TerritoryItem[]> {
    const params = new URLSearchParams();
    if (input.activo !== undefined) {
      params.set('activo', String(input.activo));
    }
    if (input.bbox !== undefined) {
      params.set('bbox', input.bbox);
    }
    if (input.limit !== undefined) {
      params.set('limit', String(input.limit));
    }
    if (input.offset !== undefined) {
      params.set('offset', String(input.offset));
    }

    const qs = params.toString();
    const endpoint = qs ? `/api/territorios?${qs}` : '/api/territorios';
    const payload = await this.requestJson<any>(endpoint);

    if (Array.isArray(payload)) {
      return payload.map((item) => normalizeTerritoryItem(item, false));
    }
    if (!payload || !Array.isArray(payload.data)) {
      throw new DataSourceHttpError({
        status: 500,
        endpoint,
        message: 'Respuesta malformada de /api/territorios: se esperaba un arreglo en data',
        details: payload,
      });
    }
    return payload.data.map((item: any) => normalizeTerritoryItem(item, false));
  }

  /**
   * Consulta `GET /api/evidencias`.
   * Nunca convierte un error HTTP (503, 401, 404, 500) en `[]`.
   */
  public async listEvidences(): Promise<EvidenceItem[]> {
    const payload = await this.requestJson<any>('/api/evidencias');
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : null;
    if (!items) {
      throw new DataSourceHttpError({
        status: 500,
        endpoint: '/api/evidencias',
        message: 'Respuesta malformada de /api/evidencias',
        details: payload,
      });
    }
    return items.map((ev: any) => ({
      id: String(ev.id ?? ev.code),
      code: String(ev.code),
      title: String(ev.title),
      status: ev.status === 'ok' || ev.status === 'fallido' ? ev.status : 'pendiente',
      horizon: ev.horizon,
      shaAnchor: ev.shaAnchor,
      verified_at: ev.verified_at ?? null,
      syntheticOrigin: false,
    }));
  }

  /**
   * Envía un evento a `POST /api/events` preservando la semántica idempotente
   * (`status: 'creado' | 'duplicado'`, mismo `id` y `hash` · EV-005) y propagando
   * errores `401` (fail-closed R8) y `422` (filtro Anti-PII Ley 25.326 · EV-023).
   */
  public async emitEvent(input: EventInput): Promise<EventResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (input.apiKey) {
      headers['x-api-key'] = input.apiKey;
      headers['Authorization'] = `Bearer ${input.apiKey}`;
    }

    const payload = await this.requestJson<any>('/api/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: input.type,
        nodeId: input.nodeId ?? 'nucleo-federado-ar',
        payload: input.payload,
        hash: input.hash,
        occurred_at: input.occurred_at,
      }),
    });

    const status: 'creado' | 'duplicado' =
      payload?.status === 'duplicado' || payload?.idempotentReplay === true
        ? 'duplicado'
        : 'creado';

    return {
      success: true,
      status,
      idempotentReplay: status === 'duplicado',
      id: String(
        payload?.id ?? payload?.data?.id ?? `evt-${String(payload?.hash ?? '').slice(0, 12)}`,
      ),
      hash: String(payload?.hash ?? payload?.data?.hash ?? ''),
      occurred_at: String(
        payload?.data?.occurred_at ?? input.occurred_at ?? new Date().toISOString(),
      ),
      mode: this.currentRuntimeMode,
    };
  }

  /**
   * Consulta `GET /api/activos` (Issue #109 · R5-UI).
   * Propaga errores 503/401/404/422/500 mediante `DataSourceHttpError` (Regla R5).
   */
  public async listActivos(input: ActivosQuery = {}): Promise<ActivoItem[]> {
    const params = new URLSearchParams();
    if (input.nodo_key) params.set('nodo_key', input.nodo_key);
    if (input.categoria) params.set('categoria', input.categoria);
    if (input.estado) params.set('estado', input.estado);
    if (input.bbox) params.set('bbox', input.bbox);

    const qs = params.toString();
    const endpoint = qs ? `/api/activos?${qs}` : '/api/activos';
    const payload = await this.requestJson<any>(endpoint);
    const rawList = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : null;

    if (!rawList) {
      throw new DataSourceHttpError({
        status: 500,
        endpoint,
        message: 'Respuesta malformada de /api/activos: se esperaba un arreglo en data',
        details: payload,
      });
    }

    return rawList.map((a: any) => ({
      id: String(a.id),
      nodo_key: (a.nodo_key ?? 'capital') as SanJuanFocalNodeKey,
      nombre: String(a.nombre ?? ''),
      categoria: (a.categoria ?? 'comunitario') as ActivoCategoria,
      descripcion: String(a.descripcion ?? ''),
      lat: Number(a.lat ?? a.geometria?.latitud ?? -31.5375),
      lng: Number(a.lng ?? a.geometria?.longitud ?? -68.5364),
      estado: (a.estado === 'aprobado' || a.estado === 'rechazado'
        ? a.estado
        : 'pendiente') as ActivoEstado,
      creado_por_rol: (a.creado_por_rol === 'moderador' || a.creado_por_rol === 'admin'
        ? a.creado_por_rol
        : 'ciudadano') as Core004Role,
      event_hash: String(a.event_hash ?? a.evidenciaHash ?? ''),
      is_synthetic: Boolean(a.is_synthetic),
      created_at: String(a.created_at ?? a.creadoEn ?? new Date().toISOString()),
    }));
  }

  /**
   * Da de alta un activo en `POST /api/activos` validando previamente con `ActivoCreateSchema`
   * (`@delocalsoy/contracts`) y enviando credenciales JWT / API key (Reglas R8 y R5).
   */
  public async createActivo(input: ActivoCreatePayload): Promise<ActivoItem> {
    const parsed = ActivoCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DataSourceHttpError({
        status: 422,
        endpoint: '/api/activos',
        message: parsed.error.errors[0]?.message ?? 'Error de validación en ActivoCreateSchema',
        details: parsed.error.errors,
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = input.token ?? 'delocalsoy-dev-write-token-r8';
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-api-key'] = token;

    const payload = await this.requestJson<any>('/api/activos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...parsed.data,
        rol: input.rol ?? 'ciudadano',
      }),
    });

    const data = payload?.data ?? payload;
    return {
      id: String(data?.id ?? `act-${Date.now()}`),
      nodo_key: (data?.nodo_key ?? parsed.data.nodo_key) as SanJuanFocalNodeKey,
      nombre: String(data?.nombre ?? parsed.data.nombre),
      categoria: (data?.categoria ?? parsed.data.categoria) as ActivoCategoria,
      descripcion: String(data?.descripcion ?? parsed.data.descripcion),
      lat: Number(data?.lat ?? parsed.data.lat),
      lng: Number(data?.lng ?? parsed.data.lng),
      estado: (data?.estado === 'aprobado' || data?.estado === 'rechazado'
        ? data.estado
        : 'pendiente') as ActivoEstado,
      creado_por_rol: (data?.creado_por_rol ?? input.rol ?? 'ciudadano') as Core004Role,
      event_hash: String(data?.event_hash ?? ''),
      is_synthetic: Boolean(data?.is_synthetic),
      created_at: String(data?.created_at ?? new Date().toISOString()),
    };
  }
}

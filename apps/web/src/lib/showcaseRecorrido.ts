// Recorrido del showcase (VIG-007, NVIG-R9 #193, épica #167) — tipos y
// normalización del payload de /api/showcase. R15: los counts se muestran
// tal como llegan — 0 es un dato honesto ("sin materializar aún"), nunca se
// rellena ni se maquilla; y null ≠ 0 (una métrica sin computar no es cero).

export type ShowcaseNodoKey = 'caucete' | 'capital' | 'iglesia';

export interface ShowcaseKpiDetalle {
  kpi_key: string;
  valor: number | null;
  detalles: Record<string, number>;
}

export interface ShowcaseNodoResumen {
  key: ShowcaseNodoKey;
  nombre: string;
  foco: string;
  poblacion: number;
  activo: boolean;
  subnodos: number;
  kpis: number;
  activos_aprobados: number;
  fichas_patrimoniales: number;
  operativas: number;
  productos_aprobados: number;
  rag_fragmentos: number;
  kpis_detalle: ShowcaseKpiDetalle[];
}

export interface ShowcaseResponse {
  recorrido: ShowcaseNodoKey[];
  nodos: ShowcaseNodoResumen[];
  guion: { doc: string; pasos: number };
}

function esNodoKey(value: unknown): value is ShowcaseNodoKey {
  return value === 'caucete' || value === 'capital' || value === 'iglesia';
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Normaliza el payload de /api/showcase SIN inventar nada (R15). */
export function normalizarShowcase(payload: unknown): ShowcaseResponse {
  const raw = (payload ?? {}) as { recorrido?: unknown; nodos?: unknown; guion?: { doc?: unknown; pasos?: unknown } };

  const recorrido = (Array.isArray(raw.recorrido) ? raw.recorrido : []).filter(esNodoKey);

  const nodos = (Array.isArray(raw.nodos) ? raw.nodos : [])
    .map((n): ShowcaseNodoResumen | null => {
      if (typeof n !== 'object' || n === null) return null;
      const r = n as Record<string, unknown>;
      if (!esNodoKey(r.key)) return null;
      return {
        key: r.key,
        nombre: typeof r.nombre === 'string' ? r.nombre : '',
        foco: typeof r.foco === 'string' ? r.foco : '',
        poblacion: count(r.poblacion),
        activo: r.activo === true,
        subnodos: count(r.subnodos),
        kpis: count(r.kpis),
        activos_aprobados: count(r.activos_aprobados),
        fichas_patrimoniales: count(r.fichas_patrimoniales),
        operativas: count(r.operativas),
        productos_aprobados: count(r.productos_aprobados),
        rag_fragmentos: count(r.rag_fragmentos),
        kpis_detalle: (Array.isArray(r.kpis_detalle) ? r.kpis_detalle : [])
          .map((k): ShowcaseKpiDetalle | null => {
            if (typeof k !== 'object' || k === null) return null;
            const kk = k as Record<string, unknown>;
            return {
              kpi_key: typeof kk.kpi_key === 'string' ? kk.kpi_key : '',
              // null se conserva null (R15): una métrica sin computar no es 0.
              valor: typeof kk.valor === 'number' ? kk.valor : null,
              detalles:
                typeof kk.detalles === 'object' && kk.detalles !== null
                  ? (kk.detalles as Record<string, number>)
                  : {},
            };
          })
          .filter((k): k is ShowcaseKpiDetalle => k !== null),
      };
    })
    .filter((n): n is ShowcaseNodoResumen => n !== null);

  return {
    recorrido,
    nodos,
    guion: {
      doc: typeof raw.guion?.doc === 'string' ? raw.guion.doc : '',
      pasos: count(raw.guion?.pasos),
    },
  };
}

/** Nota honesta de un count (R15): 0 no se esconde — se explica. */
export function notaCount(valor: number, label: string): string {
  return valor === 0
    ? label + ': 0 (sin materializar aún — R15)'
    : label + ': ' + String(valor);
}

import { useEffect, useMemo, useState } from 'react';
import { SYNTHETIC_MODE_WARNING_TEXT, type DataSource } from '../lib/dataSource';
import {
  ESTADOS_PUBLICOS,
  ETIQUETAS_TIPO,
  OPORTUNIDAD_TRANSICIONES,
  SECUENCIA_CICLO,
  esSinteticaOportunidad,
  etiquetaEstado,
  etiquetaEvidencia,
  etiquetaRol,
  etiquetaTipo,
  etiquetaValidacion,
  type OportunidadItem,
} from '../lib/oportunidades';

/**
 * DELocalSoy.AR — Banco de Potencialidades y Oportunidades (Bloque 9).
 * NCAP-FE #163 (cascada NODO-CAPITAL, ratificada DH 2026-11-05):
 * consume el registro público real por contrato DataSource (ADR-029,
 * GET /api/oportunidades — NCAP-R6 #158 + ext #165) — multinodo desde
 * día 1 (patrón MK-1). Deuda saldada: este rewrite elimina el alias
 * LocalOpportunity y la matriz de transiciones stage divergente; la
 * matriz mostrada ES la canónica de la API, en SOLO LECTURA — la
 * escritura exige moderación autenticada (R8) y este panel JAMÁS simula
 * persistencia (R15). El modal de creación local del stage se elimina
 * por esa misma razón (deuda: sprint de autenticación).
 */

type PanelState =
  | { estado: 'loading' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'ok'; oportunidades: OportunidadItem[] };

export function BancoPotencialidadesPanel({ dataSource }: { dataSource: DataSource }) {
  const [panel, setPanel] = useState<PanelState>({ estado: 'loading' });
  const [origen, setOrigen] = useState<'cargando' | 'api' | 'sin-metodo'>('cargando');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [filtroEstado, setFiltroEstado] = useState<string>('all');
  const [filtroSubnodo, setFiltroSubnodo] = useState<string>('all');
  const [busqueda, setBusqueda] = useState('');
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [transicionPara, setTransicionPara] = useState<OportunidadItem | null>(null);

  useEffect(() => {
    const listar = dataSource.listOportunidades?.bind(dataSource);
    if (!listar) {
      setOrigen('sin-metodo');
      setPanel({ estado: 'ok', oportunidades: [] });
      return;
    }
    let cancelado = false;
    setOrigen('cargando');
    listar({ limit: 100 })
      .then((oportunidades) => {
        if (cancelado) return;
        setOrigen('api');
        setPanel({ estado: 'ok', oportunidades });
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        setOrigen('api');
        const mensaje = error instanceof Error ? error.message : String(error);
        setPanel({ estado: 'error', mensaje });
      });
    return () => {
      cancelado = true;
    };
  }, [dataSource]);

  const oportunidades = panel.estado === 'ok' ? panel.oportunidades : [];
  const haySinteticas = oportunidades.some(esSinteticaOportunidad);

  const subnodosDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          oportunidades
            .map((o) => o.subnodo_key)
            .filter((s): s is string => s !== null),
        ),
      ).sort(),
    [panel],
  );

  const filtradas = useMemo(() => {
    if (panel.estado !== 'ok') return [];
    const q = busqueda.trim().toLowerCase();
    return panel.oportunidades.filter((o) => {
      if (filtroTipo !== 'all' && o.tipo !== filtroTipo) return false;
      if (filtroEstado !== 'all' && o.estado !== filtroEstado) return false;
      if (filtroSubnodo !== 'all' && (o.subnodo_key ?? '') !== filtroSubnodo) return false;
      if (q !== '' && !o.titulo.toLowerCase().includes(q) && !o.descripcion.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [panel, filtroTipo, filtroEstado, filtroSubnodo, busqueda]);

  const conteoPorEstado = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const o of oportunidades) {
      conteo.set(o.estado, (conteo.get(o.estado) ?? 0) + 1);
    }
    return conteo;
  }, [panel]);

  const detalle = oportunidades.find((o) => o.id === detalleId) ?? null;

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-slate-400">
              NCAP-R6 #158 + ext #165 · GET /api/oportunidades · ADR-029
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Banco de Potencialidades y Oportunidades
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            {oportunidades.length} publicadas · {filtradas.length} en vista
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Registro comunitario del ciclo de vida (Bloque 9): cada oportunidad declara su
          evidencia y su estado de revisión. Sin datos no hay ficha: nada se promedia ni se
          puntúa (R15). Lectura multinodo (patrón MK-1).
        </p>
        {origen === 'sin-metodo' && (
          <p className="text-xs font-mono text-amber-300">
            DataSource sin listOportunidades (contrato ADR-029): 0 oportunidades — sin
            fallback silencioso (R5).
          </p>
        )}
        {haySinteticas && (
          <p className="text-xs font-mono text-fuchsia-300">{SYNTHETIC_MODE_WARNING_TEXT}</p>
        )}
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos los tipos (10)</option>
            {Object.entries(ETIQUETAS_TIPO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados públicos (9)</option>
            {ESTADOS_PUBLICOS.map((estado) => (
              <option key={estado} value={estado}>
                {etiquetaEstado(estado)}
              </option>
            ))}
          </select>
          <select
            value={filtroSubnodo}
            onChange={(e) => setFiltroSubnodo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            aria-label="Filtrar por subnodo"
          >
            <option value="all">Todos los subnodos</option>
            {subnodosDisponibles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o descripción…"
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            aria-label="Búsqueda de oportunidades"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroEstado('all')}
            className={
              'text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ' +
              (filtroEstado === 'all'
                ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white')
            }
          >
            Todos ({oportunidades.length})
          </button>
          {ESTADOS_PUBLICOS.filter((estado) => conteoPorEstado.has(estado)).map((estado) => (
            <button
              key={estado}
              type="button"
              onClick={() => setFiltroEstado(estado)}
              className={
                'text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ' +
                (filtroEstado === estado
                  ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white')
              }
            >
              {etiquetaEstado(estado)} ({conteoPorEstado.get(estado) ?? 0})
            </button>
          ))}
        </div>
      </div>

      {panel.estado === 'loading' && (
        <p className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
          Cargando oportunidades de la API…
        </p>
      )}
      {panel.estado === 'error' && (
        <p className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-rose-400">
          Error al cargar oportunidades: {panel.mensaje} — R5: sin fallback silencioso, no se
          muestra nada maquillado.
        </p>
      )}
      {panel.estado === 'ok' && oportunidades.length === 0 && (
        <p className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300">
          0 oportunidades publicadas — el registro comunitario arranca vacío (dato honesto,
          no un error).
        </p>
      )}
      {panel.estado === 'ok' && oportunidades.length > 0 && filtradas.length === 0 && (
        <p className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300">
          0 oportunidades coinciden con los filtros (R15: lista vacía es dato honesto).
        </p>
      )}
      {panel.estado === 'ok' && filtradas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtradas.map((o) => (
            <div key={o.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 uppercase">
                  {etiquetaTipo(o.tipo)}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{etiquetaEstado(o.estado)}</span>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug">
                {o.titulo}
                {esSinteticaOportunidad(o) && (
                  <span className="ml-2 text-[10px] font-mono px-1.5 py-0.2 bg-fuchsia-400/15 text-fuchsia-300 rounded align-middle">
                    [SINTÉTICO]
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">{o.descripcion}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-slate-400">
                <span>nodo: {o.nodo_key}</span>
                {o.subnodo_key !== null && <span>· subnodo: {o.subnodo_key}</span>}
                <span>· evidencia: {etiquetaEvidencia(o.evidencia.evidence_type)}</span>
                <span>· {etiquetaValidacion(o.evidencia.validationStatus)}</span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDetalleId(o.id)}
                  className="text-xs font-semibold text-amber-300 hover:text-amber-200"
                >
                  Ver ficha
                </button>
                <button
                  type="button"
                  onClick={() => setTransicionPara(o)}
                  className="text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Ciclo de vida (solo lectura)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detalle !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 uppercase">
                  {etiquetaTipo(detalle.tipo)}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">{detalle.titulo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetalleId(null)}
                className="text-slate-400 hover:text-white text-xl leading-none shrink-0"
                aria-label="Cerrar ficha"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-300">{detalle.descripcion}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <p className="font-semibold text-slate-300 text-xs">Estado</p>
                <p className="text-white text-sm">{etiquetaEstado(detalle.estado)}</p>
                <p className="text-slate-400 font-mono text-[11px]">
                  {detalle.nodo_key}
                  {detalle.subnodo_key !== null ? ' / ' + detalle.subnodo_key : ''}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <p className="font-semibold text-slate-300 text-xs">Evidencia</p>
                <p className="text-white text-sm">{etiquetaEvidencia(detalle.evidencia.evidence_type)}</p>
                <p className="text-slate-400 text-[11px]">{etiquetaValidacion(detalle.evidencia.validationStatus)}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
              <p className="font-semibold text-slate-300 text-xs">Descripción de la evidencia</p>
              <p className="text-xs text-slate-300">{detalle.evidencia.descripcion}</p>
              {detalle.evidencia.reference_url !== null && (
                <a
                  href={detalle.evidencia.reference_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-300 underline break-all"
                >
                  Referencia declarada
                </a>
              )}
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
              <p className="font-semibold text-slate-300 text-xs">Actores declarados</p>
              {detalle.actores.length === 0 && (
                <p className="text-xs text-slate-400">Sin actores declarados.</p>
              )}
              {detalle.actores.map((a, i) => (
                <p key={i} className="text-xs text-slate-300">
                  {etiquetaRol(a.role)}: {a.name ?? 'rol sin nombre público (Ley 25.326)'}
                  {a.consent_confirmed
                    ? ' · consentimiento confirmado'
                    : ' · sin consentimiento confirmado'}
                </p>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
              <p className="font-semibold text-slate-300 text-xs">
                Interpretación declarada (scoring)
              </p>
              {detalle.scoring === null ? (
                <p className="text-xs text-slate-400">
                  Sin scoring declarado — la plataforma no interpreta por su cuenta (R15).
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                    impacto territorial: {detalle.scoring.territorial_impact}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                    factibilidad: {detalle.scoring.feasibility}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                    urgencia: {detalle.scoring.urgency}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                    método: {detalle.scoring.metodo}
                  </span>
                  {detalle.scoring.fuente !== null && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                      fuente: {detalle.scoring.fuente}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
              <p className="font-semibold text-slate-300 text-xs">Contexto territorial</p>
              {detalle.territorial_context === null ? (
                <p className="text-xs text-slate-400">
                  Sin contexto territorial declarado (R15).
                </p>
              ) : (
                <p className="text-xs text-slate-300 font-mono">
                  corredor: {detalle.territorial_context.corridor_id}
                  {detalle.territorial_context.landmark_id !== null
                    ? ' · hito: ' + detalle.territorial_context.landmark_id
                    : ''}
                  {detalle.territorial_context.service_area_name !== null
                    ? ' · área: ' + detalle.territorial_context.service_area_name
                    : ''}
                </p>
              )}
            </div>
            {detalle.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {detalle.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-slate-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] font-mono text-slate-500">
              id: {detalle.id} · registrada: {detalle.created_at} · última actualización:{' '}
              {detalle.updated_at}
            </p>
          </div>
        </div>
      )}

      {transicionPara !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-white">
                Ciclo de vida — matriz canónica de la API (solo lectura)
              </h3>
              <button
                type="button"
                onClick={() => setTransicionPara(null)}
                className="text-slate-400 hover:text-white text-xl leading-none shrink-0"
                aria-label="Cerrar ciclo de vida"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Copia citada de la matriz de transiciones del backend (NCAP-R6 #158). Este panel
              no simula persistencia: la escritura exige moderación autenticada (R8) — aquí
              solo se consulta (R15).
            </p>
            <div className="space-y-1.5">
              {SECUENCIA_CICLO.map((estado) => {
                const actual = transicionPara.estado === estado;
                const destinos = OPORTUNIDAD_TRANSICIONES[estado] ?? [];
                return (
                  <div
                    key={estado}
                    className={
                      'flex items-center justify-between gap-2 p-2 rounded-lg border text-xs ' +
                      (actual
                        ? 'bg-amber-400/10 border-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800')
                    }
                  >
                    <span className="font-semibold text-white">
                      {actual ? '▶ ' : ''}
                      {etiquetaEstado(estado)}
                      {actual ? ' (estado actual)' : ''}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      → {destinos.length > 0 ? destinos.join(', ') : '—'}
                    </span>
                  </div>
                );
              })}
              {OPORTUNIDAD_TRANSICIONES[transicionPara.estado] === undefined && (
                <p className="text-[11px] text-amber-300 font-mono">
                  Estado actual fuera del camino principal: {transicionPara.estado}
                </p>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-500">
              Estados laterales (paused/discarded/archived) existen en la matriz canónica, pero
              'discarded' nunca se publica (R15).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

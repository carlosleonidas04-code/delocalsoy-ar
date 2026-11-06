import { useEffect, useMemo, useState } from 'react';
import type { DataSource } from '../lib/dataSource';
import {
  AMC_CATEGORIAS_POR_DOMINIO,
  AMC_DOMINIOS,
  ETIQUETA_CANAL,
  ETIQUETA_DOMINIO,
  ETIQUETA_ESTADO_FEATURE,
  ETIQUETA_ESTADO_REPORTE,
  ETIQUETA_PRECISION,
  calcularBboxVig,
  validarReporteAmc,
  type FeatureMapaVig,
  type InfraestructuraMovilidad,
  type MiReporte,
  type PedidosTablero,
  type ReporteAmcForm,
  type ReporteAmcResultado,
  type SubnodoVig,
} from '../lib/vig014';
import {
  crearSesion,
  puedeEscribir,
  type AlmacenSesion,
  type EstadoSesion,
  type TransporteSesion,
} from '../lib/sesion';

// NODO-VIG-3 VIG-014 (#380, épica #377 — cierra el módulo): panel del módulo
// de infraestructura y movilidad del nodo iglesia. Acople por contrato
// DataSource (ADR-029, patrón NCAP-FE #163): la vista consume la API real
// (dashboard VIG-013, features, tablero VIG-012, subnodos VIG-001, AMC
// VIG-011) y la degradación synthetic está SIEMPRE etiquetada (R15).
// R5: el error es error, 0 es un dato honesto y jamás [] silencioso.

type Vig014Tab = 'dashboard' | 'mapa' | 'reportar' | 'mis_reportes' | 'planilla';

type CargaEstado = 'idle' | 'loading' | 'error' | 'ok';

const CAPAS_MAPA = [
  { key: 'obra_vial', label: 'Obras viales (VIG-010)' },
  { key: 'punto_critico', label: 'Puntos críticos AMC (VIG-011)' },
  { key: 'parada_transporte', label: 'Paradas de transporte' },
  { key: 'cobertura_sos', label: 'Cobertura SOS (Paso Agua Negra)' },
];

function BadgeEstado({ estado }: { estado: string }) {
  const etiqueta = ETIQUETA_ESTADO_FEATURE[estado] ?? estado;
  return (
    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-950/60 border border-stone-800 text-stone-300">
      {etiqueta}
    </span>
  );
}

export function VialidadMovilidadPanel({ dataSource }: { dataSource: DataSource }) {
  const [tab, setTab] = useState<Vig014Tab>('dashboard');

  const [dashboard, setDashboard] = useState<InfraestructuraMovilidad | null>(null);
  const [dashboardEstado, setDashboardEstado] = useState<CargaEstado>('idle');
  const [tablero, setTablero] = useState<PedidosTablero | null>(null);
  const [tableroEstado, setTableroEstado] = useState<CargaEstado>('idle');
  const [features, setFeatures] = useState<FeatureMapaVig[] | null>(null);
  const [featuresEstado, setFeaturesEstado] = useState<CargaEstado>('idle');
  const [subnodos, setSubnodos] = useState<SubnodoVig[] | null>(null);
  const [subnodosEstado, setSubnodosEstado] = useState<CargaEstado>('idle');
  const [capasVisibles, setCapasVisibles] = useState<string[]>(CAPAS_MAPA.map((c) => c.key));

  // Sesión de plataforma (patrón artefactos A1–A4): en synthetic NO hay
  // sesión JWT — las escrituras del panel son demo declarada (R15).
  const esSynthetic = dataSource.mode === 'synthetic';
  const sesion = useMemo(() => {
    const transporte: TransporteSesion = async (ruta, init) => {
      const res = await fetch(ruta, init);
      return { ok: res.ok, status: res.status, json: () => res.json() };
    };
    const almacen: AlmacenSesion = {
      getItem: (clave) =>
        typeof localStorage !== 'undefined' ? localStorage.getItem(clave) : null,
      setItem: (clave, valor) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem(clave, valor);
      },
      removeItem: (clave) => {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(clave);
      },
    };
    return crearSesion({ transporte, almacen, modo: esSynthetic ? 'synthetic' : 'jwt' });
  }, [esSynthetic]);

  const [estadoSesion, setEstadoSesion] = useState<EstadoSesion>({ tipo: 'sin_sesion' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Formulario AMC (VIG-011).
  const [dominio, setDominio] = useState('infraestructura_vial');
  const [categoria, setCategoria] = useState('road_surface');
  const [subnodoKey, setSubnodoKey] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [precision, setPrecision] = useState<ReporteAmcForm['precision']>('referencial');
  const [canal, setCanal] = useState<ReporteAmcForm['canal_ingreso']>('web');
  const [riesgoInmediato, setRiesgoInmediato] = useState(false);
  const [alias, setAlias] = useState('');
  const [mediadorRef, setMediadorRef] = useState('');
  const [aceptaDevolucion, setAceptaDevolucion] = useState(false);
  const [guardaAlias, setGuardaAlias] = useState(false);
  const [observadoEn, setObservadoEn] = useState('');
  const [tipoN3, setTipoN3] = useState('');
  const [erroresForm, setErroresForm] = useState<string[]>([]);
  const [resultadoAmc, setResultadoAmc] = useState<ReporteAmcResultado | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [misReportes, setMisReportes] = useState<MiReporte[] | null>(null);
  const [misReportesEstado, setMisReportesEstado] = useState<CargaEstado>('idle');

  // Carga perezosa por pestaña (patrón 6e): una sola vez, R5 sin fallback.
  useEffect(() => {
    if (tab !== 'dashboard' || dashboardEstado !== 'idle') return;
    const obtener = dataSource.getInfraestructuraMovilidad?.bind(dataSource);
    if (!obtener) return;
    let cancelado = false;
    setDashboardEstado('loading');
    obtener('iglesia')
      .then((res) => {
        if (cancelado) return;
        setDashboard(res);
        setDashboardEstado('ok');
      })
      .catch(() => {
        if (!cancelado) setDashboardEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [tab, dashboardEstado, dataSource]);

  useEffect(() => {
    if (tab !== 'dashboard' || tableroEstado !== 'idle') return;
    const obtener = dataSource.getPedidosTablero?.bind(dataSource);
    if (!obtener) return;
    let cancelado = false;
    setTableroEstado('loading');
    obtener('iglesia')
      .then((res) => {
        if (cancelado) return;
        setTablero(res);
        setTableroEstado('ok');
      })
      .catch(() => {
        if (!cancelado) setTableroEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [tab, tableroEstado, dataSource]);

  useEffect(() => {
    if (tab !== 'mapa' || featuresEstado !== 'idle') return;
    const obtener = dataSource.getFeaturesMapa?.bind(dataSource);
    if (!obtener) return;
    let cancelado = false;
    setFeaturesEstado('loading');
    obtener('iglesia')
      .then((res) => {
        if (cancelado) return;
        setFeatures(res);
        setFeaturesEstado('ok');
      })
      .catch(() => {
        if (!cancelado) setFeaturesEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [tab, featuresEstado, dataSource]);

  useEffect(() => {
    if (tab !== 'reportar' || subnodosEstado !== 'idle') return;
    const listar = dataSource.listSubnodos?.bind(dataSource);
    if (!listar) return;
    let cancelado = false;
    setSubnodosEstado('loading');
    listar('iglesia')
      .then((res) => {
        if (cancelado) return;
        setSubnodos(res);
        setSubnodosEstado('ok');
      })
      .catch(() => {
        if (!cancelado) setSubnodosEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [tab, subnodosEstado, dataSource]);

  useEffect(() => {
    if (tab !== 'reportar' && tab !== 'mis_reportes') return;
    if (estadoSesion.tipo !== 'sin_sesion') return;
    let cancelado = false;
    sesion
      .quienSoy()
      .then((estado) => {
        if (!cancelado) setEstadoSesion(estado);
      })
      .catch(() => {
        if (!cancelado) setEstadoSesion({ tipo: 'sin_sesion' });
      });
    return () => {
      cancelado = true;
    };
  }, [tab, estadoSesion.tipo, sesion]);

  useEffect(() => {
    if (tab !== 'mis_reportes' || misReportesEstado !== 'idle') return;
    if (estadoSesion.tipo === 'sin_sesion' && !esSynthetic) return;
    // En synthetic NO hay token (demo declarada): el dataSource sintético
    // ignora el token y devuelve su demo etiquetada (R15).
    const token = esSynthetic ? 'synthetic-demo' : sesion.tokenActual();
    const listar = dataSource.listMisReportes?.bind(dataSource);
    if (!listar || !token) return;
    let cancelado = false;
    setMisReportesEstado('loading');
    listar(token)
      .then((res) => {
        if (cancelado) return;
        setMisReportes(res);
        setMisReportesEstado('ok');
      })
      .catch(() => {
        if (!cancelado) setMisReportesEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [tab, misReportesEstado, estadoSesion, esSynthetic, sesion, dataSource]);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const usuario = await sesion.iniciar(email, password);
      setEstadoSesion({ tipo: 'sesion', usuario });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'no se pudo iniciar sesión');
    }
  };

  const cerrarSesion = () => {
    sesion.cerrarSesion();
    setEstadoSesion({ tipo: 'sin_sesion' });
    setMisReportes(null);
    setMisReportesEstado('idle');
  };

  const canalMediado = canal === 'papel' || canal === 'whatsapp';

  const enviarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroresForm([]);
    setResultadoAmc(null);
    const form: ReporteAmcForm = {
      nodo_key: 'iglesia',
      categoria,
      descripcion,
      lat: Number(lat),
      lng: Number(lng),
      subnodo_key: subnodoKey,
      dominio,
      ...(tipoN3.trim() !== '' ? { tipo: tipoN3.trim() } : {}),
      canal_ingreso: canal,
      precision,
      riesgo_inmediato: riesgoInmediato,
      ...(alias.trim() !== '' ? { reportado_por: alias.trim() } : {}),
      ...(mediadorRef.trim() !== '' ? { mediador_ref: mediadorRef.trim() } : {}),
      ...(aceptaDevolucion || guardaAlias
        ? { consentimiento: { acepta_devolucion_contacto: aceptaDevolucion, guarda_alias: guardaAlias } }
        : {}),
      ...(canal === 'papel' && observadoEn !== '' ? { observado_en: observadoEn } : {}),
    };
    const validacion = validarReporteAmc(form);
    if (!validacion.ok) {
      setErroresForm(validacion.errores);
      return;
    }
    const token = sesion.tokenActual();
    const crear = dataSource.createReporteAmc?.bind(dataSource);
    if (!crear || !token || !puedeEscribir(estadoSesion)) {
      setErroresForm([
        'la escritura AMC exige sesión JWT real (ADR-031) — en modo synthetic es demo declarada (R15)',
      ]);
      return;
    }
    setEnviando(true);
    try {
      const res = await crear({ ...form, token });
      setResultadoAmc(res);
    } catch (err) {
      setErroresForm([err instanceof Error ? err.message : 'fallo el envío del reporte']);
    } finally {
      setEnviando(false);
    }
  };

  const featuresVisibles = (features ?? []).filter((f) => capasVisibles.includes(f.capa));
  const bbox = calcularBboxVig(featuresVisibles);
  const ANCHO = 560;
  const ALTO = 340;
  const xDe = (lng: number) => ANCHO * ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng || 1));
  const yDe = (lat: number) => ALTO * (1 - (lat - bbox.minLat) / (bbox.maxLat - bbox.minLat || 1));

  return (
    <div className="space-y-6">
      {/* Encabezado del módulo */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-400">
              <span className="text-amber-400 font-bold">NODO IGLESIA · MÓDULO VIG-014</span>
              <span>·</span>
              <span>INFRAESTRUCTURA Y MOVILIDAD</span>
              <span>·</span>
              <span className="text-emerald-400">#380 · ÉPICA #377</span>
              <span>·</span>
              <span>ACOPLE POR CONTRATO ADR-029</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white mt-1">
              Vialidad, puntos críticos y reclamos del Valle de Iglesia
            </h2>
            <p className="text-xs text-stone-300 max-w-3xl mt-1 leading-relaxed">
              Obras viales (anuncio ≠ obra — R15), puntos críticos del AMC (la comunidad corrobora,
              nunca verifica), paradas sin padrón verificado, brechas SOS declaradas y el tablero de
              pedidos formales ante DPV («X de 15»). El formulario AMC y su seguimiento consumen la
              API real por contrato DataSource.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono uppercase text-stone-500 block">
              Origen de datos
            </span>
            <span
              className={
                'font-mono font-bold text-xs ' +
                (esSynthetic ? 'text-fuchsia-300' : 'text-emerald-400')
              }
            >
              {esSynthetic ? 'API SINTÉTICA (DEMO DECLARADA — R15)' : 'API REAL'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-800 pt-4">
          {([
            ['dashboard', 'Dashboard y pedidos'],
            ['mapa', 'Mapa de capas'],
            ['reportar', 'Reportar (AMC)'],
            ['mis_reportes', 'Mis reportes'],
            ['planilla', 'Planilla de papel'],
          ] as Array<[Vig014Tab, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                'px-4 py-2 text-xs font-semibold rounded-lg transition-colors ' +
                (tab === key
                  ? 'bg-stone-950 text-amber-300 border border-amber-400/40'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/60')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB DASHBOARD ─── */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          {dashboardEstado === 'loading' && (
            <p className="text-xs font-mono text-stone-400 p-5 rounded-xl bg-white border border-stone-200">
              Cargando dashboard de infraestructura y movilidad…
            </p>
          )}
          {dashboardEstado === 'error' && (
            <p className="text-xs font-mono text-rose-600 p-5 rounded-xl bg-white border border-rose-200">
              Error al cargar el dashboard (R5: sin fallback silencioso — sin datos no se muestra nada).
            </p>
          )}
          {dashboardEstado === 'ok' && dashboard !== null && (
            <>
              <p className="text-[11px] font-mono text-stone-500">{dashboard.regla}</p>

              {/* Obras viales */}
              <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">Obras viales del nodo</h3>
                  <span className="text-2xl font-black text-amber-600">{dashboard.obras.total}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(dashboard.obras.por_estado).map(([estado, total]) => (
                    <span
                      key={estado}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-50 border border-stone-200 text-stone-700"
                    >
                      {ETIQUETA_ESTADO_FEATURE[estado] ?? estado}: {total}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-stone-600 space-y-1">
                  {dashboard.obras.por_fuente.map((f) => (
                    <div key={f.fuente} className="flex justify-between gap-2">
                      <span>{f.fuente}</span>
                      <span className="font-mono text-stone-500">{f.total}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-mono text-stone-500">
                  km en ejecución: {dashboard.obras.km_ejecucion === null ? 'null (sin dato — R15)' : dashboard.obras.km_ejecucion}
                </p>
                <p className="text-[11px] text-stone-500">{dashboard.obras.km_nota}</p>
                <p className="text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠ {dashboard.obras.cautela}
                </p>
              </div>

              {/* Puntos críticos */}
              <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">Puntos críticos del AMC (VIG-011)</h3>
                  <span className="text-2xl font-black text-amber-600">
                    {dashboard.puntos_criticos.total}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(dashboard.puntos_criticos.por_estado).map(([estado, total]) => (
                    <span
                      key={estado}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-50 border border-stone-200 text-stone-700"
                    >
                      {ETIQUETA_ESTADO_FEATURE[estado] ?? estado}: {total}
                    </span>
                  ))}
                </div>
                {dashboard.puntos_criticos.criticos.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                    <div>
                      <p className="text-xs font-semibold text-stone-800">{c.titulo}</p>
                      <p className="text-[10px] font-mono text-stone-500">
                        observado {c.observado_at} — sin geometría publicada (ADR-036)
                      </p>
                    </div>
                    <BadgeEstado estado={c.estado} />
                  </div>
                ))}
                <p className="text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠ {dashboard.puntos_criticos.cautela}
                </p>
              </div>

              {/* Paradas + brechas SOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-2">
                  <h3 className="text-sm font-bold text-stone-900">Paradas de transporte</h3>
                  <p className="text-2xl font-black text-stone-400">{dashboard.paradas_transporte.total}</p>
                  <p className="text-xs text-stone-600">{dashboard.paradas_transporte.cobertura}</p>
                  <p className="text-[11px] text-stone-500">{dashboard.paradas_transporte.fuente}</p>
                  <p className="text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    ⚠ {dashboard.paradas_transporte.cautela}
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-2">
                  <h3 className="text-sm font-bold text-stone-900">Cobertura SOS — brechas declaradas</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(dashboard.cobertura_sos.red_por_estado).map(([estado, total]) => (
                      <span key={estado} className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-50 border border-stone-200 text-stone-700">
                        {ETIQUETA_ESTADO_FEATURE[estado] ?? estado}: {total}
                      </span>
                    ))}
                  </div>
                  {dashboard.cobertura_sos.brechas_declaradas.map((b) => (
                    <div key={b.tramo} className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                      <p className="text-xs font-semibold text-stone-800">{b.tramo}</p>
                      <p className="text-[10px] text-stone-500">{b.fuente}</p>
                    </div>
                  ))}
                  <p className="text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    ⚠ {dashboard.cobertura_sos.cautela}
                  </p>
                </div>
              </div>

              {/* Tablero de pedidos DPV */}
              <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
                <h3 className="text-sm font-bold text-stone-900">
                  Pedidos formales ante DPV (VIG-012)
                </h3>
                {tableroEstado === 'loading' && (
                  <p className="text-xs font-mono text-stone-400">Cargando tablero de pedidos…</p>
                )}
                {tableroEstado === 'error' && (
                  <p className="text-xs font-mono text-rose-600">
                    Error al cargar el tablero (R5: sin fallback silencioso).
                  </p>
                )}
                {tableroEstado === 'ok' && tablero !== null && (
                  <>
                    <p className="text-lg font-black text-amber-600">{tablero.cobertura}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                        <p className="text-lg font-black text-stone-800">{tablero.presentados}</p>
                        <p className="text-[10px] text-stone-500">Presentados de {tablero.esperados_documento}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                        <p className="text-lg font-black text-emerald-600">{tablero.respondidos_en_plazo}</p>
                        <p className="text-[10px] text-stone-500">Respondidos en plazo</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                        <p className="text-lg font-black text-rose-500">{tablero.respondidos_tardio}</p>
                        <p className="text-[10px] text-stone-500">Respondidos tarde</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                        <p className="text-lg font-black text-stone-500">{tablero.sin_respuesta}</p>
                        <p className="text-[10px] text-stone-500">Sin respuesta (derivado)</p>
                      </div>
                    </div>
                    {tablero.pedidos.length === 0 && (
                      <p className="text-[11px] text-stone-500">
                        0 pedidos presentados — preparar la nota ≠ presentarla (R15): cada pedido se
                        registra cuando se presenta, con fecha real.
                      </p>
                    )}
                    {tablero.pedidos.map((p) => (
                      <div key={p.key} className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-stone-800">
                            Bloque {p.bloque} · {p.tema}
                          </p>
                          <span className="text-[11px] font-mono text-stone-600">{p.estado_efectivo}</span>
                        </div>
                        <p className="text-[10px] font-mono text-stone-500">
                          a {p.destinatario} · presentado {p.fecha_presentacion} · plazo {p.plazo_dias} días
                          {p.respondido_en !== null ? ' · respondido ' + p.respondido_en : ''}
                        </p>
                        {p.nota_respuesta !== null && (
                          <p className="text-[11px] text-stone-600 mt-1">{p.nota_respuesta}</p>
                        )}
                      </div>
                    ))}
                    <p className="text-[10px] text-stone-500">Fuente: {tablero.fuente}</p>
                  </>
                )}
              </div>

              {/* KPIs VIG-013 */}
              <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">KPIs del módulo (VIG-013)</h3>
                  <span className="text-xl font-black text-amber-600">{dashboard.kpis.total}</span>
                </div>
                {dashboard.kpis.snapshots.length === 0 && (
                  <p className="text-[11px] text-stone-500">{dashboard.kpis.nota}</p>
                )}
                {dashboard.kpis.snapshots.map((k) => (
                  <div key={k.kpi_key} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-xs font-mono text-stone-700">{k.kpi_key}</span>
                    <span className="text-xs font-black text-stone-800">
                      {k.valor === null ? 'null (sin cómputo — R15)' : k.valor}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB MAPA ─── */}
      {tab === 'mapa' && (
        <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Mapa de capas del nodo iglesia</h3>
            <p className="text-[11px] text-stone-500">
              Proyección de los features publicados por el nodo (WGS-84). Cada feature sintética
              se etiqueta «Ilustrativa» (R15) — el dashboard cuenta; el mapa dibuja lo publicado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CAPAS_MAPA.map((c) => (
              <label key={c.key} className="flex items-center gap-1.5 text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={capasVisibles.includes(c.key)}
                  onChange={(e) => {
                    setCapasVisibles((prev) =>
                      e.target.checked ? [...prev, c.key] : prev.filter((k) => k !== c.key),
                    );
                  }}
                />
                {c.label}
              </label>
            ))}
          </div>
          {featuresEstado === 'loading' && (
            <p className="text-xs font-mono text-stone-400">Cargando features del nodo…</p>
          )}
          {featuresEstado === 'error' && (
            <p className="text-xs font-mono text-rose-600">
              Error al cargar features (R5: sin fallback silencioso).
            </p>
          )}
          {featuresEstado === 'ok' && features !== null && (
            <>
              <svg
                viewBox={'0 0 ' + ANCHO + ' ' + ALTO}
                className="w-full rounded-lg bg-stone-50 border border-stone-200"
                role="img"
                aria-label="Mapa de capas del nodo iglesia"
              >
                <rect x="0" y="0" width={ANCHO} height={ALTO} fill="#fafaf9" />
                {featuresVisibles.map((f) => (
                  <g key={f.id}>
                    <circle
                      cx={xDe(f.lng)}
                      cy={yDe(f.lat)}
                      r={f.capa === 'punto_critico' ? 6 : 5}
                      fill={
                        f.capa === 'obra_vial'
                          ? '#b45309'
                          : f.capa === 'punto_critico'
                            ? '#b91c1c'
                            : f.capa === 'parada_transporte'
                              ? '#0369a1'
                              : '#15803d'
                      }
                      fillOpacity={f.is_synthetic ? 0.45 : 0.9}
                      stroke="#1c1917"
                      strokeWidth="1"
                    />
                    <title>
                      {f.titulo} · {ETIQUETA_ESTADO_FEATURE[f.estado] ?? f.estado}
                      {f.is_synthetic ? ' · Ilustrativa (R15)' : ''}
                    </title>
                  </g>
                ))}
                {featuresVisibles.length === 0 && (
                  <text x={ANCHO / 2} y={ALTO / 2} textAnchor="middle" className="fill-stone-400" fontSize="13">
                    0 features en las capas seleccionadas — dato honesto (R15)
                  </text>
                )}
              </svg>
              <div className="space-y-1.5">
                {featuresVisibles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200">
                    <div>
                      <p className="text-xs font-semibold text-stone-800">
                        {f.titulo}
                        {f.is_synthetic && (
                          <span className="ml-1.5 text-[10px] font-mono text-fuchsia-600">Ilustrativa (R15)</span>
                        )}
                      </p>
                      <p className="text-[10px] font-mono text-stone-500">{f.fuente_label}</p>
                    </div>
                    <BadgeEstado estado={f.estado} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB REPORTAR (AMC) ─── */}
      {tab === 'reportar' && (
        <div className="space-y-4">
          {/* Estado de sesión */}
          <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-3">
            {esSynthetic && (
              <p className="text-xs font-mono text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 rounded p-2">
                [SINTÉTICO] demo declarada: en modo synthetic no hay sesión JWT — las escrituras del
                panel son demo, nunca acreditadas (R15).
              </p>
            )}
            {estadoSesion.tipo === 'sesion' && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-stone-700">
                  Sesión activa: <strong>{estadoSesion.usuario.email}</strong> (rol{' '}
                  {estadoSesion.usuario.rol}) — la escritura AMC queda a tu nombre por pseudónimo
                  sha256 (ADR-027, sin PII).
                </p>
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
            {estadoSesion.tipo === 'sin_sesion' && (
              <form onSubmit={iniciarSesion} className="space-y-2">
                <p className="text-xs text-stone-600">
                  Para reportar hace falta sesión (ADR-031): el alta es ciudadana y autenticada; tu
                  identidad queda como pseudónimo, nunca expuesta.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    placeholder="email de la cuenta"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                  />
                  <input
                    type="password"
                    required
                    placeholder="contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-700"
                  >
                    Iniciar sesión
                  </button>
                </div>
                {loginError !== null && (
                  <p className="text-xs text-rose-600">{loginError}</p>
                )}
              </form>
            )}
          </div>

          {/* Formulario AMC */}
          <form onSubmit={enviarReporte} className="p-5 rounded-xl bg-white border border-stone-200 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Formulario AMC (VIG-011)</h3>
              <p className="text-[11px] text-stone-500">
                Boca única de reporte del nodo. El dominio y la categoría siguen el canon VIG-010;
                el distrito/paraje es un subnodo real del Valle (VIG-001). La API valida SIEMPRE —
                este formulario solo anticipa los rechazos obvios.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-stone-700 space-y-1">
                <span className="font-semibold">Dominio</span>
                <select
                  value={dominio}
                  onChange={(e) => {
                    setDominio(e.target.value);
                    const primera = AMC_CATEGORIAS_POR_DOMINIO[e.target.value]?.[0] ?? '';
                    setCategoria(primera);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                >
                  {AMC_DOMINIOS.map((d) => (
                    <option key={d} value={d}>
                      {ETIQUETA_DOMINIO[d] ?? d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-stone-700 space-y-1">
                <span className="font-semibold">Categoría (canon VIG-010)</span>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                >
                  {(AMC_CATEGORIAS_POR_DOMINIO[dominio] ?? []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="text-xs text-stone-700 space-y-1 block">
              <span className="font-semibold">Distrito o paraje (subnodo VIG-001)</span>
              {subnodosEstado === 'error' && (
                <p className="text-[11px] font-mono text-rose-600">
                  Error al cargar los subnodos del Valle (R5: sin fallback silencioso) — el
                  reporte no se envía sin ancla territorial real.
                </p>
              )}
              <select
                value={subnodoKey}
                onChange={(e) => setSubnodoKey(e.target.value)}
                required
                disabled={subnodosEstado !== 'ok'}
                className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200 disabled:text-stone-400"
              >
                <option value="">
                  {subnodosEstado === 'loading'
                    ? '— cargando el Valle… —'
                    : subnodosEstado === 'error'
                      ? '— sin subnodos (error) —'
                      : '— elegir el ancla territorial —'}
                </option>
                {(subnodos ?? []).map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.type})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-stone-700 space-y-1 block">
              <span className="font-semibold">Descripción (10 a 2000 caracteres, sin datos personales)</span>
              <textarea
                required
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describí el problema observado: qué, dónde (con referente), desde cuándo."
                className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <label className="text-xs text-stone-700 space-y-1">
                <span className="font-semibold">Latitud</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-30.2"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                />
              </label>
              <label className="text-xs text-stone-700 space-y-1">
                <span className="font-semibold">Longitud</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-69.1"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                />
              </label>
              <label className="text-xs text-stone-700 space-y-1">
                <span className="font-semibold">Precisión declarada</span>
                <select
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value as ReporteAmcForm['precision'])}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                >
                  {(['gps', 'referencial', 'aproximado'] as const).map((p) => (
                    <option key={p} value={p}>
                      {ETIQUETA_PRECISION[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-stone-700 space-y-1">
                <span className="font-semibold">Canal de origen</span>
                <select
                  value={canal}
                  onChange={(e) => setCanal(e.target.value as ReporteAmcForm['canal_ingreso'])}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                >
                  {(['web', 'papel', 'whatsapp', 'presencial'] as const).map((c) => (
                    <option key={c} value={c}>
                      {ETIQUETA_CANAL[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {canalMediado && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-stone-50 border border-stone-200">
                <p className="text-[11px] text-stone-600 sm:col-span-2">
                  Canal mediado (R15 — ingesta humana, sin bot): exige el mediador con aval del
                  registro comunitario (VIG-011) y el alias del vecino — NUNCA el nombre de la
                  planilla.
                </p>
                <label className="text-xs text-stone-700 space-y-1">
                  <span className="font-semibold">Mediador con aval (mediador_ref)</span>
                  <input
                    value={mediadorRef}
                    onChange={(e) => setMediadorRef(e.target.value)}
                    placeholder="key del registro de mediadores"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-stone-200"
                  />
                </label>
                <label className="text-xs text-stone-700 space-y-1">
                  <span className="font-semibold">Alias comunitario del vecino</span>
                  <input
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="alias elegido por el vecino"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-stone-200"
                  />
                </label>
                {canal === 'papel' && (
                  <label className="text-xs text-stone-700 space-y-1">
                    <span className="font-semibold">Fecha del testimonio (carga diferida)</span>
                    <input
                      type="date"
                      value={observadoEn}
                      onChange={(e) => setObservadoEn(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-stone-200"
                    />
                  </label>
                )}
              </div>
            )}

            {!canalMediado && (
              <label className="text-xs text-stone-700 space-y-1 block">
                <span className="font-semibold">
                  Alias comunitario (opcional — solo si el vecino quiere quedar identificado)
                </span>
                <input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="alias elegido — sin PII"
                  className="w-full sm:max-w-sm px-3 py-2 text-xs rounded-lg bg-stone-50 border border-stone-200"
                />
              </label>
            )}

            <div className="space-y-1.5 p-3 rounded-lg bg-stone-50 border border-stone-200">
              <p className="text-[11px] font-semibold text-stone-700">
                Consentimiento granular (ADR-027, Ley 25.326) y anonimato explícito
              </p>
              <label className="flex items-start gap-2 text-[11px] text-stone-600">
                <input
                  type="checkbox"
                  checked={riesgoInmediato}
                  onChange={(e) => setRiesgoInmediato(e.target.checked)}
                />
                <span>Riesgo inmediato declarado (prioriza la revisión — VIG-011)</span>
              </label>
              <label className="flex items-start gap-2 text-[11px] text-stone-600">
                <input
                  type="checkbox"
                  checked={aceptaDevolucion}
                  onChange={(e) => setAceptaDevolucion(e.target.checked)}
                />
                <span>
                  Acepta devolución por contacto: la respuesta del nodo le llega por el canal de
                  origen ({canal === 'web' ? 'su cuenta web' : canal === 'presencial' ? 'asamblea presencial' : 'el mediador'}).
                </span>
              </label>
              <label className="flex items-start gap-2 text-[11px] text-stone-600">
                <input
                  type="checkbox"
                  checked={guardaAlias}
                  onChange={(e) => setGuardaAlias(e.target.checked)}
                />
                <span>
                  Guardar mi alias comunitario (opt-in explícito — sin esto no se guarda ningún
                  identificador; el reporte queda anónimo con pseudónimo sha256).
                </span>
              </label>
            </div>

            {erroresForm.length > 0 && (
              <ul className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-1 list-disc list-inside">
                {erroresForm.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              disabled={enviando || estadoSesion.tipo !== 'sesion'}
              className={
                'px-5 py-2.5 text-xs font-semibold rounded-lg transition-colors ' +
                (estadoSesion.tipo === 'sesion' && !enviando
                  ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed')
              }
            >
              {enviando ? 'Enviando…' : 'Enviar reporte AMC'}
            </button>

            {resultadoAmc !== null && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                <p className="text-xs font-bold text-emerald-800">
                  {resultadoAmc.creado
                    ? '✓ Reporte registrado (' + resultadoAmc.id + ') — quedó a tu nombre por pseudónimo sha256 (ADR-027).'
                    : '✓ Reintento idempotente: el reporte ya estaba registrado (' + resultadoAmc.id + ') — una escritura, un evento (R4).'}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Estado: {ETIQUETA_ESTADO_REPORTE[resultadoAmc.estado] ?? resultadoAmc.estado} ·
                  devolución por el canal de origen:{' '}
                  {canal === 'web'
                    ? 'tu cuenta web (pestaña «Mis reportes»)'
                    : canal === 'presencial'
                      ? 'próxima asamblea del nodo'
                      : 'el mediador con aval te devuelve la respuesta por el mismo canal'}
                </p>
                {resultadoAmc.duplicados_sugeridos.length > 0 && (
                  <div className="text-[11px] text-emerald-800">
                    <p className="font-semibold">Reportes abiertos cercanos (R5/ADR-039):</p>
                    <ul className="list-disc list-inside">
                      {resultadoAmc.duplicados_sugeridos.map((d) => (
                        <li key={d.id}>
                          {d.id} · {d.categoria} · {ETIQUETA_ESTADO_REPORTE[d.estado] ?? d.estado}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {resultadoAmc.cluster !== null && (
                  <p className="text-[11px] text-emerald-700">
                    Cluster de convergencia AMC:{' '}
                    {resultadoAmc.cluster.cluster_key ?? 'sin cluster (primer reporte de la zona)'}
                    {resultadoAmc.cluster_verificado ? '' : ' — cómputo no verificado (R15 honesto)'}
                  </p>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {/* ─── TAB MIS REPORTES ─── */}
      {tab === 'mis_reportes' && (
        <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Seguimiento de mis reportes (ciclo de vida — ADR-038)
            </h3>
            <p className="text-[11px] text-stone-500">
              Los reportes de tu autoría (pseudónimo sha256, sin PII) con cada transición sellada y
              su justificación pública: la línea de tiempo ES la acreditación.
            </p>
          </div>
          {esSynthetic && (
            <p className="text-xs font-mono text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 rounded p-2">
              [SINTÉTICO] demo declarada del seguimiento (R15): sin sesión JWT no hay reportes
              propios — iniciá sesión con la API real.
            </p>
          )}
          {estadoSesion.tipo !== 'sesion' && !esSynthetic && (
            <p className="text-xs text-stone-600">
              Sin sesión activa — iniciá sesión en la pestaña «Reportar (AMC)» para ver el
              seguimiento de tus reportes.
            </p>
          )}
          {estadoSesion.tipo === 'sesion' && misReportesEstado === 'loading' && (
            <p className="text-xs font-mono text-stone-400">Cargando tus reportes…</p>
          )}
          {misReportesEstado === 'error' && (
            <p className="text-xs font-mono text-rose-600">
              Error al cargar tus reportes (R5: sin fallback silencioso).
            </p>
          )}
          {misReportes !== null && misReportes.length === 0 && (
            <p className="text-xs text-stone-500">0 reportes propios — dato honesto (R15).</p>
          )}
          {misReportes !== null &&
            misReportes.map((m) => (
              <div key={m.id} className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-stone-800">
                    {m.categoria} · {m.nodo_key ?? 'sin nodo'}
                  </p>
                  <BadgeEstado estado={m.estado} />
                </div>
                <p className="text-xs text-stone-600">{m.descripcion}</p>
                <p className="text-[10px] font-mono text-stone-500">
                  creado {m.created_at} · {m.lat}, {m.lng}
                </p>
                {m.transiciones.length === 0 && (
                  <p className="text-[11px] text-stone-500">
                    Sin transiciones todavía — el reporte espera revisión (R15).
                  </p>
                )}
                {m.transiciones.map((t, i) => (
                  <div key={i} className="text-[11px] text-stone-600 border-l-2 border-amber-300 pl-2">
                    <span className="font-mono">
                      {ETIQUETA_ESTADO_REPORTE[t.estado_anterior] ?? t.estado_anterior} →{' '}
                      {ETIQUETA_ESTADO_REPORTE[t.estado_nuevo] ?? t.estado_nuevo}
                    </span>{' '}
                    · {t.occurred_at}
                    <p className="text-stone-500">«{t.justificacion}» — moderador {t.moderador_hash.slice(0, 8)}…</p>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      {/* ─── TAB PLANILLA PAPEL ─── */}
      {tab === 'planilla' && (
        <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Planilla de papel del AMC — formato oficial imprimible
            </h3>
            <p className="text-[11px] text-stone-500">
              El canal papel funciona sin conectividad: el vecino completa la planilla y un mediador
              con aval (VIG-011) la carga después con la fecha real del testimonio (modo offline
              diferido — observado_en, R15). En la planilla NUNCA va el nombre: el vecino elige su
              alias y el consentimiento se marca con firma.
            </p>
          </div>
          <div className="p-5 rounded-lg border-2 border-stone-800 bg-stone-50 space-y-3 print:border-stone-400">
            <div className="border-b border-stone-400 pb-2">
              <p className="text-sm font-black text-stone-900 uppercase">
                DELocalSoy.AR — Nodo Valle de Iglesia
              </p>
              <p className="text-[11px] font-mono text-stone-600">
                Planilla de reporte comunitario AMC (VIG-011 #378) · formato oficial v1
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-800">
              <p>Dominio (marcar uno): _ espacio público _ vial _ movilidad _ agua _ clima _ conectividad _ servicios _ producción rural _ patrimonio</p>
              <p>Categoría observada: ______________________________</p>
              <p>Distrito / paraje: ______________________________</p>
              <p>Ubicación (referente + precisión): ______________________________</p>
              <p>Coordenadas (si las tiene): lat ________ lng ________ precisión _ GPS _ referencial _ aproximado</p>
              <p>Fecha del testimonio: ____ / ____ / ________</p>
              <p className="sm:col-span-2">Descripción del problema observado (sin datos personales): ______________________________________________</p>
              <p className="sm:col-span-2">________________________________________________________________________________</p>
              <p className="sm:col-span-2">Riesgo inmediato: _ sí _ no</p>
              <p>Alias comunitario elegido (opcional): ______________________________</p>
              <p>Firma del vecino: ______________________________</p>
              <p>Consentimiento: _ acepta devolución por contacto _ guarda alias</p>
              <p>Firma del mediador con aval: ______________________________</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-700"
            >
              Imprimir planilla
            </button>
            <p className="text-[11px] text-stone-500">
              La carga diferida del mediador usa «Reportar (AMC)» con canal papel: exige mediador_ref
              y alias, y la fecha real del testimonio (R15).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

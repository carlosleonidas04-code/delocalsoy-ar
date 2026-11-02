/**
 * DELocalSoy.AR — Panel del Artefacto A4: auditor y datos abiertos
 * (ART-R3, #272, épica #268). Consume useSesion (ART-R0) y el cliente puro
 * lib/artefactoA4.ts contra las superficies REALES de lectura.
 *
 * Reglas vivas: R5 (errores visibles, jamás []) · R15 (sin simulación: el
 * auditor NO muta — este panel no tiene NI UNA escritura; el libro contable
 * no tiene GET público y se observa solo por derivados; lo no publicado no
 * se inventa) · ADR-035 (datos abiertos = accesible + procedente + auditable)
 * · ADR-036 (el auditor tampoco ve sensible) · Ley 25.326/ADR-027 (solo
 * hashes y pseudónimos) · techo por rol real (carga perezosa por sección:
 * visitante 10 req/min — no quemarlos al montar es diseño honesto).
 *
 * Hallazgo 1 declarado: el rol 'auditor' vive en la tabla RBAC del frontend
 * (techo 500) pero la API no lo emite (RolSchema real {ciudadano, moderador,
 * admin}; el registro público solo crea 'ciudadano'). Toda la lectura A4 es
 * pública: la sesión no agrega datos, solo techo.
 *
 * Montaje único en ART-R5 (ArtefactosRoot): este archivo NO toca App.tsx
 * ni main.tsx (regla M0).
 */
import { useMemo, useState } from 'react';
import { useSesion } from './SesionProvider';
import {
  COMPONENTES_A4,
  capacidadesA4,
  permisoVisibleA4,
  crearClienteA4,
  canonizar,
  huellaSha256,
  ErrorA4,
  type CapacidadesA4,
  type ClienteA4,
  type Evidencia,
  type FichaPatrimonio,
  type FuenteEspacial,
  type HealthSnapshot,
  type Ingesta,
  type KpiSnapshot,
  type ReportePublico,
  type TransicionReporte,
} from '../../lib/artefactoA4';

const NODOS = ['capital', 'caucete', 'iglesia'] as const;

const ETIQUETA_ESTADO_REPORTE: Record<string, string> = {
  received: 'recibido',
  evaluating: 'en evaluación',
  in_progress: 'en progreso',
  resolved: 'resuelto',
  descartado: 'descartado',
};

const ETIQUETA_EVIDENCIA: Record<string, string> = {
  pendiente: 'pendiente',
  ok: 'ok',
  fallido: 'fallido',
};

function mensajeError(e: unknown): string {
  if (e instanceof ErrorA4) {
    return e.message;
  }
  return 'error inesperado';
}

interface PropsSeccion {
  cliente: ClienteA4;
}

function A4AuditorDatosAbiertos() {
  const { estado } = useSesion();
  const caps = useMemo<CapacidadesA4>(() => capacidadesA4(estado), [estado]);

  // Datos abiertos: SIN token. El cliente no acepta credenciales por diseño.
  const cliente = useMemo(() => crearClienteA4({ transporte: (ruta, init) => fetch(ruta, init) }), []);

  return (
    <section aria-label="Artefacto A4 — auditor y datos abiertos">
      <h2>Artefacto A4 — Auditor y datos abiertos</h2>

      <header>
        <p>
          Sesión:{' '}
          {caps.esVisitante
            ? caps.esDemo
              ? 'demo SINTÉTICO declarada — nada se acredita (R15)'
              : 'sin sesión (datos abiertos: lectura completa igual)'
            : caps.esAuditor
              ? 'auditor (rol declarativo — la API aún no lo emite, hallazgo 1)'
              : 'rol ' + caps.rol}{' '}
          · techo {caps.techoReqsMin} req/min
          {caps.esAuditor ? ' · verificación de consistencia habilitada' : ''}
        </p>
        <p>
          <strong>Qué ve:</strong> todo lo publicado con procedencia, historiales sellados con
          justificaciones y moderador_hash, KPIs con estados honestos, la cadena de acreditación
          EV-xxx. <strong>Qué jamás ve:</strong> PII en claro (los sellos viven sin PII),
          sensible/sensible_nota (ADR-036), geometría exacta de sitios protegidos, registros
          descartados de terceros, identidades detrás de los pseudónimos. Y{' '}
          <strong>jamás escribe</strong>: el auditor no muta (sus hallazgos van a GitHub, R12).
        </p>
      </header>

      <ul>
        {COMPONENTES_A4.map((c) => {
          const permiso = permisoVisibleA4(c.id, caps);
          return (
            <li key={c.id}>
              <strong>{c.titulo}</strong> — {c.resumen} (
              {c.estado === 'en_main' ? '🟢' : c.estado === 'en_rama' ? '🟡' : '◇'} {c.traza};
              permiso: {permiso ?? '—'})
            </li>
          );
        })}
      </ul>

      <SaludSistema cliente={cliente} />
      <CadenaAcreditacion cliente={cliente} />
      <HistorialesPublicos cliente={cliente} />
      <FuentesEIngestas cliente={cliente} />
      <KpisPublicos cliente={cliente} />
      <FichaPatrimonial cliente={cliente} />
      <VerificacionHuella cliente={cliente} />

      <section aria-label="Sin cablear aún">
        <h3>Sin cablear aún (honesto, R15)</h3>
        <ul>
          <li>
            libro contable directo: events_raw NO tiene GET público — solo se observa por
            derivados (health modeSource, historiales, KPIs). No se simula un listado.
          </li>
          <li>historial de comercios (MK-2, F-3): PR #254 en cola de merge — sin cablear.</li>
          <li>
            tamiz de 13 dimensiones (P-10) + historial de acreditación (P-09): ◇ por diseñar
            como checklist operativo.
          </li>
        </ul>
      </section>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: salud del sistema (pieza de auditoría R7)                   */
/* ------------------------------------------------------------------ */

function SaludSistema({ cliente }: PropsSeccion) {
  const [salud, setSalud] = useState<HealthSnapshot | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      setSalud(await cliente.salud());
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Salud del sistema">
      <h3>Salud del sistema (libro contable, derivado 0)</h3>
      <p>
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'consultando…' : 'ver estado honesto'}
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {salud !== null && (
        <ul>
          <li>
            status <strong>{salud.status}</strong> · modo efectivo {salud.mode} (declarado{' '}
            {salud.modeDeclared} el {salud.modeDeclaredAt})
          </li>
          <li>
            modo resuelto desde <strong>{salud.modeSource}</strong>{' '}
            {salud.modeSource === 'events_raw'
              ? '(el último sello system.mode_change manda — R7)'
              : '(fallback del proceso: sin sello o sin base)'}
          </li>
          <li>
            dataSource {salud.dataSource} · redis {salud.redis} (transporte, fail-open) · versión{' '}
            {salud.version}
          </li>
          <li>
            branchProtection {String(salud.branchProtection)} (honesto: false hasta que exista la
            regla de rama, issue #25) · evidencias{' '}
            {salud.evidencias === null ? 'null (sin base no se puede contar)' : salud.evidencias}
          </li>
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: cadena de acreditación EV-xxx                               */
/* ------------------------------------------------------------------ */

function CadenaAcreditacion({ cliente }: PropsSeccion) {
  const [registro, setRegistro] = useState<{ count: number; evidencias: Evidencia[] } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      setRegistro(await cliente.evidencias());
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Cadena de acreditación">
      <h3>Cadena de acreditación (EV-xxx)</h3>
      <p>
        GitHub acredita (R9): issue ↔ PR ↔ EV ↔ SHA ↔ docs, con compuerta EVIDENCIA.md y label{' '}
        <code>r9-ratificado</code>.
      </p>
      <p>
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'consultando…' : 'ver registro de evidencias'}
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {registro !== null &&
        (registro.count === 0 ? (
          <p>sin evidencias registradas (count 0 honesto).</p>
        ) : (
          <details>
            <summary>
              {registro.count} evidencia(s) — código, estado y verificación
            </summary>
            <ul>
              {registro.evidencias.map((ev) => (
                <li key={ev.id}>
                  <strong>{ev.code}</strong> — {ev.title} ·{' '}
                  {ETIQUETA_EVIDENCIA[ev.status] ?? ev.status} ·{' '}
                  {ev.verified_at === null
                    ? 'sin fecha de verificación'
                    : 'verificada ' + ev.verified_at}
                </li>
              ))}
            </ul>
          </details>
        ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: historiales públicos derivados de sellos                    */
/* ------------------------------------------------------------------ */

function HistorialesPublicos({ cliente }: PropsSeccion) {
  const [nodo, setNodo] = useState<string>('capital');
  const [reportes, setReportes] = useState<ReportePublico[] | null>(null);
  const [reporteId, setReporteId] = useState('');
  const [transiciones, setTransiciones] = useState<TransicionReporte[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarBandeja = async () => {
    setCargando(true);
    setError(null);
    try {
      setReportes(await cliente.reportesDeNodo(nodo));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  const verHistorial = async (id: string) => {
    setCargando(true);
    setError(null);
    try {
      setTransiciones(await cliente.historialReporte(id));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Historiales públicos">
      <h3>Historiales públicos (derivados de sellos, ADR-038)</h3>
      <p>
        <select value={nodo} onChange={(e) => setNodo(e.target.value)} aria-label="nodo">
          {NODOS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => void cargarBandeja()} disabled={cargando}>
          {cargando ? 'consultando…' : 'ver bandeja pública'}
        </button>{' '}
        <input
          value={reporteId}
          onChange={(e) => setReporteId(e.target.value)}
          placeholder="id de reporte"
          aria-label="id de reporte"
        />{' '}
        <button
          type="button"
          onClick={() => reporteId.trim() !== '' && void verHistorial(reporteId.trim())}
          disabled={cargando}
        >
          ver historial sellado
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {reportes !== null &&
        (reportes.length === 0 ? (
          <p>sin reportes visibles en {nodo} (los descartados no se listan).</p>
        ) : (
          <ul>
            {reportes.map((r) => (
              <li key={r.id}>
                <strong>{r.id}</strong> — {r.categoria} ·{' '}
                {ETIQUETA_ESTADO_REPORTE[r.estado] ?? r.estado}
                {r.is_synthetic ? ' · SINTÉTICO' : ''}{' '}
                <button type="button" onClick={() => void verHistorial(r.id)}>
                  historial
                </button>
              </li>
            ))}
          </ul>
        ))}
      {transiciones !== null &&
        (transiciones.length === 0 ? (
          <p>sin transiciones registradas para ese id.</p>
        ) : (
          <details open>
            <summary>ciclo del reporte ({transiciones.length} transición(es))</summary>
            <ul>
              {transiciones.map((t, i) => (
                <li key={i}>
                  {ETIQUETA_ESTADO_REPORTE[t.estado_anterior] ?? t.estado_anterior} →{' '}
                  {ETIQUETA_ESTADO_REPORTE[t.estado_nuevo] ?? t.estado_nuevo} · {t.justificacion} ·
                  moderador {t.moderador_hash} <small>({t.occurred_at})</small>
                </li>
              ))}
            </ul>
          </details>
        ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: fuentes e ingestas publicadas (procedencia ADR-035)         */
/* ------------------------------------------------------------------ */

function FuentesEIngestas({ cliente }: PropsSeccion) {
  const [fuentes, setFuentes] = useState<FuenteEspacial[] | null>(null);
  const [ingestas, setIngestas] = useState<Ingesta[] | null>(null);
  const [nodo, setNodo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const [fs, ins] = await Promise.allSettled([
        cliente.fuentes(),
        cliente.ingestasPublicadas(nodo === '' ? undefined : nodo),
      ]);
      if (fs.status === 'fulfilled') setFuentes(fs.value);
      else setError('fuentes: ' + mensajeError(fs.reason));
      if (ins.status === 'fulfilled') setIngestas(ins.value);
      else setError((previo) => (previo === null ? '' : previo + ' · ') + 'ingestas: ' + mensajeError(ins.reason));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Fuentes e ingestas publicadas">
      <h3>Fuentes e ingestas publicadas</h3>
      <p>
        <select value={nodo} onChange={(e) => setNodo(e.target.value)} aria-label="nodo de las ingestas">
          <option value="">todos los nodos</option>
          {NODOS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'consultando…' : 'ver procedencia publicada'}
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {fuentes !== null &&
        (fuentes.length === 0 ? (
          <p>catálogo vacío (honesto).</p>
        ) : (
          <details>
            <summary>catálogo de fuentes ({fuentes.length}) con cautelas</summary>
            <ul>
              {fuentes.map((f) => (
                <li key={f.key}>
                  <strong>{f.key}</strong> — {f.organismo} · {f.nombre} · estado {f.estado} ·
                  cautela: {f.cautela}
                  {f.licencia === null ? ' · sin licencia declarada aún' : ' · licencia ' + f.licencia}
                </li>
              ))}
            </ul>
          </details>
        ))}
      {ingestas !== null && (
        <p>
          ingestas <strong>publicadas</strong>: {ingestas.length}. El pipeline en curso NO es
          listable (GET público solo expone publicado): la auditoría de lo en curso se hace por
          id, cuando el admin lo publica (R15).
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: KPIs públicos                                               */
/* ------------------------------------------------------------------ */

function KpisPublicos({ cliente }: PropsSeccion) {
  const [nodo, setNodo] = useState<string>('capital');
  const [kpis, setKpis] = useState<KpiSnapshot[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      setKpis(await cliente.kpis(nodo));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="KPIs públicos">
      <h3>KPIs públicos del nodo</h3>
      <p>
        <select value={nodo} onChange={(e) => setNodo(e.target.value)} aria-label="nodo de los KPIs">
          {NODOS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'consultando…' : 'ver KPIs'}
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {kpis !== null &&
        (kpis.length === 0 ? (
          <p>sin KPIs para {nodo} (honesto).</p>
        ) : (
          <ul>
            {kpis.map((k) => (
              <li key={k.kpi_key}>
                <strong>{k.kpi_key}</strong>:{' '}
                {k.valor === null
                  ? 'null (métrica sin computar — NO es 0, R15)'
                  : k.valor + ' ' + JSON.stringify(k.detalles)}{' '}
                <small>(calculado {k.computed_at})</small>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: ficha patrimonial pública                                   */
/* ------------------------------------------------------------------ */

function FichaPatrimonial({ cliente }: PropsSeccion) {
  const [activoId, setActivoId] = useState('');
  const [ficha, setFicha] = useState<FichaPatrimonio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    if (activoId.trim() === '') {
      setError('indicá el id del activo patrimonial');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      setFicha(await cliente.fichaPatrimonio(activoId.trim()));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Ficha patrimonial pública">
      <h3>Ficha patrimonial pública (VIG-004)</h3>
      <p>
        <input
          value={activoId}
          onChange={(e) => setActivoId(e.target.value)}
          placeholder="id del activo patrimonial"
          aria-label="id del activo patrimonial"
        />{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'consultando…' : 'ver ficha pública'}
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {ficha !== null && (
        <ul>
          <li>
            <strong>{ficha.titulo}</strong> — tipo {ficha.tipo} · visibilidad {ficha.visibilidad}
          </li>
          <li>
            protección {ficha.proteccion_nivel} ({ficha.proteccion_norma}) · conservación{' '}
            {ficha.conservacion_estado ?? 'sin dato'}
          </li>
          <li>
            reglas de acceso:{' '}
            {ficha.reglas_acceso.length === 0
              ? 'sin reglas registradas'
              : ficha.reglas_acceso.map((r) => r.regla + ' (fuente: ' + r.fuente + ')').join('; ')}
          </li>
          <li>
            sensible_status {ficha.sensible_status} — el contenido de custodia{' '}
            <strong>jamás sale</strong> en lectura pública (ADR-036).
          </li>
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: verificación por huella (export/verificación por hashes)    */
/* ------------------------------------------------------------------ */

function VerificacionHuella({ cliente }: PropsSeccion) {
  const [salud, setSalud] = useState<HealthSnapshot | null>(null);
  const [huella, setHuella] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verificar = async () => {
    setCargando(true);
    setError(null);
    try {
      const snapshot = await cliente.salud();
      setSalud(snapshot);
      // La huella se calcula sobre el canónico del snapshot: cualquier tercero
      // puede reproducirla sobre los mismos datos y comparar byte a byte.
      setHuella(await huellaSha256(canonizar(snapshot)));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Verificación por huella">
      <h3>Verificación por huella (SHA-256)</h3>
      <p>
        <button type="button" onClick={() => void verificar()} disabled={cargando}>
          {cargando ? 'calculando…' : 'sellar snapshot de salud con huella'}
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {salud !== null && huella !== null && (
        <p>
          snapshot del {salud.timestamp} (modo {salud.mode}, dataSource {salud.dataSource}) ·
          huella <code>{huella}</code>
        </p>
      )}
    </section>
  );
}

export default A4AuditorDatosAbiertos;

/**
 * DELocalSoy.AR — Panel del Artefacto A3: gestor y admin de nodo
 * (ART-R2, #271, épica #268). Consume useSesion (ART-R0) y el cliente puro
 * lib/artefactoA3.ts contra las superficies REALES de moderación y gestión.
 *
 * Reglas vivas: R5 (errores visibles, jamás []) · R15 (sin simulación: la
 * moderación ES la validación comunitaria; el pipeline en curso NO es
 * listable y no se inventa una bandeja de pendientes) · ADR-038
 * (justificación pública >=10 por transición de reporte) · ADR-036
 * (sensible_nota se escribe pero JAMÁS vuelve por GET) · Ley 25.326/
 * ADR-027 (el gestor opera sobre hashes, nunca identidades) · techo por
 * rol real (carga perezosa por sección: moderador 100 req/min, visitante
 * 10 — no quemarlos al montar es diseño honesto).
 *
 * Montaje único en ART-R5 (ArtefactosRoot): este archivo NO toca App.tsx
 * ni main.tsx (regla M0).
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useSesion } from './SesionProvider';
import { CLAVE_TOKEN_SESION } from '../../lib/sesion';
import {
  COMPONENTES_A3,
  capacidadesA3,
  permisoVisibleA3,
  crearClienteA3,
  validarJustificacion,
  validarMotivo,
  validarTransicionReporte,
  validarTransicionOportunidad,
  validarTransicionIngesta,
  validarCambioFicha,
  REPORTE_TRANSICIONES_A3,
  OPORTUNIDAD_TRANSICIONES_A3,
  INGESTA_TRANSICIONES_A3,
  ErrorA3,
  type CapacidadesA3,
  type ClienteA3,
  type EstadoReporte,
  type EstadoOportunidad,
  type EstadoIngesta,
  type CambioCustodia,
  type CorroboracionFicha,
  type FichaPatrimonio,
  type FuenteEspacial,
  type Ingesta,
  type KpiSnapshot,
  type FichaPublica,
  type Oportunidad,
  type ProductoCatalogo,
  type ProteccionNivel,
  type SensibleStatus,
  type ReportePublico,
  type TransicionReporte,
  type VisibilidadActivo,
} from '../../lib/artefactoA3';

const NODOS = ['capital', 'caucete', 'iglesia'] as const;

const ETIQUETA_ESTADO_REPORTE: Record<string, string> = {
  received: 'recibido',
  evaluating: 'en evaluación',
  in_progress: 'en progreso',
  resolved: 'resuelto',
  descartado: 'descartado',
};

const ETIQUETA_ESTADO_OPORTUNIDAD: Record<string, string> = {
  detected: 'detectado',
  under_review: 'en revisión',
  validated: 'validado',
  prioritized: 'priorizado',
  in_development: 'en desarrollo',
  active: 'activo',
  implemented: 'implementado',
  paused: 'en pausa',
  discarded: 'descartado',
  archived: 'archivado',
};

function mensajeError(e: unknown): string {
  if (e instanceof ErrorA3) {
    return e.message;
  }
  return 'error inesperado';
}

function A3GestorAdmin() {
  const { estado } = useSesion();
  const caps = useMemo<CapacidadesA3>(() => capacidadesA3(estado), [estado]);

  const cliente = useMemo(
    () =>
      crearClienteA3({
        transporte: (ruta, init) => fetch(ruta, init),
        token: () => window.localStorage.getItem(CLAVE_TOKEN_SESION),
      }),
    []
  );

  return (
    <section aria-label="Artefacto A3 — gestor y admin de nodo">
      <h2>Artefacto A3 — Gestor y admin de nodo</h2>

      <header>
        <p>
          Sesión:{' '}
          {caps.esVisitante
            ? caps.esDemo
              ? 'demo SINTÉTICO declarada — la gestión NO se acredita (R15)'
              : 'sin sesión (lectura pública)'
            : 'rol ' + caps.rol}{' '}
          · techo {caps.techoReqsMin} req/min
          {caps.puedeModerar ? ' · moderación habilitada' : ' · sin moderación'}
          {caps.puedeAdministrarIngestas ? ' · publicador de ingestas' : ''}
        </p>
        <p>
          <strong>Qué jamás ve:</strong> identidades en claro (todo hash, Ley 25.326), PII de
          escritores, moderación sin sello (técnicamente imposible), ingestas sin pasar el pipeline.
        </p>
      </header>

      <ul>
        {COMPONENTES_A3.map((c) => {
          const permiso = permisoVisibleA3(c.id, caps);
          return (
            <li key={c.id}>
              <strong>{c.titulo}</strong> — {c.resumen} (
              {c.estado === 'en_main' ? '🟢' : c.estado === 'en_rama' ? '🟡' : '◇'} {c.traza};
              permiso: {permiso ?? '—'})
            </li>
          );
        })}
      </ul>

      <BandejaReportes cliente={cliente} caps={caps} />
      <ModeracionProductos cliente={cliente} caps={caps} />
      <CorroboracionFichas cliente={cliente} caps={caps} />
      <ModeracionOportunidades cliente={cliente} caps={caps} />
      <CustodiaPatrimonial cliente={cliente} caps={caps} />
      <FuentesEIngestas cliente={cliente} caps={caps} />
      <KpisNodo cliente={cliente} />

      <h3>Sin cablear aún (honesto, R15)</h3>
      <ul>
        <li>
          moderación de comercios — MK-1 #246–#250 y MK-2 #251/#254 en cola de merge: no se simula
        </li>
        <li>
          alcance por nodo (NODE_SCOPE_FORBIDDEN) — ◇ diseño lote-2 / #136 (trabado), a ratificar
        </li>
        <li>
          roles granulares gestor/custodio_territorial — la API real solo reconoce
          ciudadano|moderador|admin (ADR-031); la normalización de 'admin' vivió en artefactoA3
          (propuesta de corrección de sesion.puedeModerar a decisión DH)
        </li>
        <li>
          bandeja del pipeline de ingestas en curso — no existe superficie de lectura (GET
          /api/ingestas solo publica); el panel administra por id devuelto por el POST, sin simular
          pendientes
        </li>
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: bandeja de moderación de reportes (ADR-038)                */
/* ------------------------------------------------------------------ */

interface PropsSeccion {
  cliente: ClienteA3;
  caps: CapacidadesA3;
}

function FilaReporte({
  reporte,
  cliente,
  puedeModerar,
}: {
  reporte: ReportePublico;
  cliente: ClienteA3;
  puedeModerar: boolean;
}) {
  const [destino, setDestino] = useState<EstadoReporte | ''>('');
  const [justificacion, setJustificacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [historial, setHistorial] = useState<TransicionReporte[] | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const siguientes = REPORTE_TRANSICIONES_A3[reporte.estado as EstadoReporte] ?? [];

  const transicionar = async () => {
    setError(null);
    setExito(null);
    if (!puedeModerar) {
      setError('la moderación exige rol moderador o admin con sesión iniciada');
      return;
    }
    if (destino === '') {
      setError('elegí el estado destino');
      return;
    }
    const justificacionError = validarJustificacion(justificacion);
    if (justificacionError !== null) {
      setError(justificacionError);
      return;
    }
    const saltoError = validarTransicionReporte(reporte.estado as EstadoReporte, destino);
    if (saltoError !== null) {
      setError(saltoError);
      return;
    }
    setTrabajando(true);
    try {
      const actualizado = await cliente.moderarReporte(reporte.id, destino, justificacion.trim());
      setExito('transición sellada → ' + (ETIQUETA_ESTADO_REPORTE[actualizado.estado] ?? actualizado.estado));
      setDestino('');
      setJustificacion('');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setTrabajando(false);
    }
  };

  const verHistorial = async () => {
    setError(null);
    try {
      setHistorial(await cliente.historialReporte(reporte.id));
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  return (
    <li>
      <strong>{reporte.id}</strong> — {reporte.categoria} ·{' '}
      {ETIQUETA_ESTADO_REPORTE[reporte.estado] ?? reporte.estado}
      {reporte.is_synthetic ? ' · SINTÉTICO' : ''} <small>({reporte.created_at})</small>
      <p>{reporte.descripcion}</p>
      {!puedeModerar && <p>lectura pública — la moderación exige sesión de moderador/admin.</p>}
      {puedeModerar && (
        siguientes.length === 0 ? (
          <p>estado terminal: sin transiciones permitidas desde acá.</p>
        ) : (
          <p>
            <select value={destino} onChange={(e) => setDestino(e.target.value as EstadoReporte | '')}>
              <option value="">destino…</option>
              {siguientes.map((s) => (
                <option key={s} value={s}>
                  {ETIQUETA_ESTADO_REPORTE[s] ?? s}
                </option>
              ))}
            </select>{' '}
            <input
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="justificación pública (>=10 caracteres, ADR-038)"
              aria-label={'justificación para ' + reporte.id}
            />{' '}
            <button type="button" onClick={() => void transicionar()} disabled={trabajando}>
              {trabajando ? 'sellando…' : 'transicionar'}
            </button>{' '}
            <button type="button" onClick={() => void verHistorial()}>
              historial
            </button>
          </p>
        )
      )}
      {exito !== null && <p role="status">{exito}</p>}
      {error !== null && <p role="alert">{error}</p>}
      {historial !== null && (
        <details>
          <summary>historial ({historial.length} transición(es))</summary>
          <ul>
            {historial.map((t, i) => (
              <li key={i}>
                {ETIQUETA_ESTADO_REPORTE[t.estado_anterior] ?? t.estado_anterior} →{' '}
                {ETIQUETA_ESTADO_REPORTE[t.estado_nuevo] ?? t.estado_nuevo} · {t.justificacion} ·
                moderador {t.moderador_hash} <small>({t.occurred_at})</small>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function BandejaReportes({ cliente, caps }: PropsSeccion) {
  const [nodo, setNodo] = useState<string>('capital');
  const [reportes, setReportes] = useState<ReportePublico[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      // Lectura pública SIN Authorization (la bandeja no gasta cuota de
      // moderador) y SIN 'descartado' — hallazgo 4: lo descartado no existe
      // para la lectura pública.
      setReportes(await cliente.reportesDeNodo(nodo));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Bandeja de moderación de reportes">
      <h3>Bandeja de moderación de reportes</h3>
      <p>
        <select value={nodo} onChange={(e) => setNodo(e.target.value)} aria-label="nodo">
          {NODOS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'cargando…' : 'cargar bandeja'}
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {reportes !== null &&
        (reportes.length === 0 ? (
          <p>sin reportes visibles en {nodo} (count 0 honesto — y los descartados no se listan).</p>
        ) : (
          <ul>
            {reportes.map((r) => (
              <FilaReporte key={r.id} reporte={r} cliente={cliente} puedeModerar={caps.puedeModerar} />
            ))}
          </ul>
        ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: moderación de productos (VIG-005)                           */
/* ------------------------------------------------------------------ */

function ModeracionProductos({ cliente, caps }: PropsSeccion) {
  const [activoId, setActivoId] = useState('');
  const [productos, setProductos] = useState<ProductoCatalogo[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = async () => {
    if (activoId.trim() === '') {
      setError('indicá el id del activo productivo');
      return;
    }
    setCargando(true);
    setError(null);
    setExito(null);
    try {
      // El restricted NO existe para la lectura (404 sin eco, ADR-036).
      setProductos(await cliente.productosDeActivo(activoId.trim()));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  const transitar = async (productoId: string, estado: 'aprobado' | 'rechazado' | 'archivado', motivo: string) => {
    setError(null);
    setExito(null);
    if (!caps.puedeModerar) {
      setError('la moderación de productos exige rol moderador o admin');
      return;
    }
    const motivoError = validarMotivo(motivo);
    if (motivoError !== null) {
      setError(motivoError);
      return;
    }
    try {
      // Sin matriz: el motivo es opcional (<=500); la clave 'motivo' solo
      // viaja si el moderador escribió algo.
      const actualizado =
        motivo.trim() === ''
          ? await cliente.moderarProducto(productoId, estado)
          : await cliente.moderarProducto(productoId, estado, motivo.trim());
      setExito('producto ' + productoId + ' → ' + estado + ' (ahora ' + actualizado.estado + ')');
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  return (
    <section aria-label="Moderación de productos">
      <h3>Moderación de productos</h3>
      <p>
        <input
          value={activoId}
          onChange={(e) => setActivoId(e.target.value)}
          placeholder="id del activo productivo"
          aria-label="id del activo"
        />{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'cargando…' : 'ver productos propuestos'}
        </button>
      </p>
      {exito !== null && <p role="status">{exito}</p>}
      {error !== null && <p role="alert">{error}</p>}
      {productos !== null &&
        (productos.length === 0 ? (
          <p>sin productos visibles para ese activo (propuesto|aprobado; restricted → 404 sin eco).</p>
        ) : (
          <ul>
            {productos.map((p) => (
              <li key={p.id}>
                <strong>{p.id}</strong> — {p.nombre} · estado {p.estado}
                {caps.puedeModerar && p.estado !== 'aprobado' && p.estado !== 'archivado' && (
                  <span>
                    {' '}
                    <button type="button" onClick={() => void transitar(p.id, 'aprobado', '')}>
                      aprobar
                    </button>{' '}
                    <button type="button" onClick={() => void transitar(p.id, 'rechazado', '')}>
                      rechazar
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: corroboración de fichas de valoración (#149)                */
/* ------------------------------------------------------------------ */

function CorroboracionFichas({ cliente, caps }: PropsSeccion) {
  const [nodo, setNodo] = useState<string>('');
  const [estado, setEstado] = useState<'testimonio' | 'corroborada' | ''>('');
  const [fichas, setFichas] = useState<FichaPublica[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    setExito(null);
    try {
      // 'descartada' JAMÁS se lista: la lectura pública la excluye por diseño.
      setFichas(
        await cliente.fichas({
          nodo: nodo === '' ? undefined : nodo,
          estado: estado === '' ? undefined : estado,
        })
      );
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  const aplicar = async (fichaId: string, accion: 'corroborar' | 'descartar', corroboracion: CorroboracionFicha) => {
    setError(null);
    setExito(null);
    if (!caps.puedeModerar) {
      setError('la corroboración exige rol moderador o admin');
      return;
    }
    const validacion = validarCambioFicha(accion === 'corroborar' ? 'corroborada' : 'descartada', corroboracion);
    if (validacion !== null) {
      setError(validacion);
      return;
    }
    try {
      const actualizada =
        accion === 'corroborar'
          ? await cliente.moderarFicha(fichaId, 'corroborada', corroboracion)
          : await cliente.moderarFicha(fichaId, 'descartada');
      setExito('ficha ' + fichaId + ' → ' + actualizada.estado_publico);
      void cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  return (
    <section aria-label="Corroboración de fichas de valoración">
      <h3>Corroboración de fichas de valoración</h3>
      <p>
        <select value={nodo} onChange={(e) => setNodo(e.target.value)} aria-label="nodo de las fichas">
          <option value="">todos los nodos</option>
          {NODOS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{' '}
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as 'testimonio' | 'corroborada' | '')}
          aria-label="estado de las fichas"
        >
          <option value="">cualquier estado visible</option>
          <option value="testimonio">testimonio (pendiente de corroborar)</option>
          <option value="corroborada">corroborada</option>
        </select>{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'cargando…' : 'cargar fichas'}
        </button>
      </p>
      {exito !== null && <p role="status">{exito}</p>}
      {error !== null && <p role="alert">{error}</p>}
      {fichas !== null &&
        (fichas.length === 0 ? (
          <p>sin fichas visibles con esos filtros (las descartadas no se listan).</p>
        ) : (
          <ul>
            {fichas.map((f) => (
              <li key={f.id}>
                <strong>{f.id}</strong> — {f.feature_titulo ?? f.feature_id} · {f.estado_publico}
                {f.feature_is_synthetic === true ? ' · SINTÉTICO' : ''}
                {caps.puedeModerar && f.estado_publico === 'testimonio' && (
                  <span>
                    {' '}
                    <button type="button" onClick={() => void aplicar(f.id, 'corroborar', 'individual')}>
                      corroborar (individual)
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() => void aplicar(f.id, 'corroborar', 'taller_comunitario')}
                    >
                      corroborar (taller comunitario)
                    </button>{' '}
                    <button type="button" onClick={() => void aplicar(f.id, 'descartar', 'individual')}>
                      descartar
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: moderación de oportunidades (Bloque 9)                      */
/* ------------------------------------------------------------------ */

function FilaOportunidad({
  oportunidad,
  cliente,
  puedeModerar,
}: {
  oportunidad: Oportunidad;
  cliente: ClienteA3;
  puedeModerar: boolean;
}) {
  const [destino, setDestino] = useState<EstadoOportunidad | ''>('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const estado = oportunidad.estado as EstadoOportunidad;
  const siguientes = OPORTUNIDAD_TRANSICIONES_A3[estado] ?? [];

  const transicionar = async () => {
    setError(null);
    setExito(null);
    if (!puedeModerar) {
      setError('la moderación de oportunidades exige rol moderador o admin');
      return;
    }
    if (destino === '') {
      setError('elegí el estado destino');
      return;
    }
    const motivoError = validarMotivo(motivo);
    if (motivoError !== null) {
      setError(motivoError);
      return;
    }
    const saltoError = validarTransicionOportunidad(estado, destino);
    if (saltoError !== null) {
      setError(saltoError);
      return;
    }
    setTrabajando(true);
    try {
      const actualizada =
        motivo.trim() === ''
          ? await cliente.moderarOportunidad(oportunidad.id, destino)
          : await cliente.moderarOportunidad(oportunidad.id, destino, motivo.trim());
      setExito(
        'oportunidad ' + oportunidad.id + ' → ' + (ETIQUETA_ESTADO_OPORTUNIDAD[actualizada.estado] ?? actualizada.estado)
      );
      setDestino('');
      setMotivo('');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <li>
      <strong>{oportunidad.id}</strong> — {oportunidad.titulo} · {oportunidad.tipo} ·{' '}
      {ETIQUETA_ESTADO_OPORTUNIDAD[oportunidad.estado] ?? oportunidad.estado}
      {!puedeModerar && <p>lectura pública (sin 'discarded') — la moderación exige sesión.</p>}
      {puedeModerar && (
        siguientes.length === 0 ? (
          <p>estado terminal (archived).</p>
        ) : (
          <p>
            <select value={destino} onChange={(e) => setDestino(e.target.value as EstadoOportunidad | '')}>
              <option value="">destino…</option>
              {siguientes.map((s) => (
                <option key={s} value={s}>
                  {ETIQUETA_ESTADO_OPORTUNIDAD[s] ?? s}
                </option>
              ))}
            </select>{' '}
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="motivo (opcional, <=500)"
              aria-label={'motivo para ' + oportunidad.id}
            />{' '}
            <button type="button" onClick={() => void transicionar()} disabled={trabajando}>
              {trabajando ? 'aplicando…' : 'transicionar'}
            </button>
          </p>
        )
      )}
      {exito !== null && <p role="status">{exito}</p>}
      {error !== null && <p role="alert">{error}</p>}
    </li>
  );
}

function ModeracionOportunidades({ cliente, caps }: PropsSeccion) {
  const [nodo, setNodo] = useState<string>('');
  const [oportunidades, setOportunidades] = useState<Oportunidad[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      // 'discarded' nunca vuelve del listado público.
      setOportunidades(await cliente.oportunidades({ nodo: nodo === '' ? undefined : nodo }));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Moderación de oportunidades">
      <h3>Moderación de oportunidades (Banco de Potencialidades)</h3>
      <p>
        <select value={nodo} onChange={(e) => setNodo(e.target.value)} aria-label="nodo de las oportunidades">
          <option value="">todos los nodos</option>
          {NODOS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'cargando…' : 'cargar oportunidades'}
        </button>
      </p>
      {error !== null && <p role="alert">{error}</p>}
      {oportunidades !== null &&
        (oportunidades.length === 0 ? (
          <p>sin oportunidades visibles (las discarded no se listan).</p>
        ) : (
          <ul>
            {oportunidades.map((o) => (
              <FilaOportunidad key={o.id} oportunidad={o} cliente={cliente} puedeModerar={caps.puedeModerar} />
            ))}
          </ul>
        ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: custodia patrimonial (ADR-036, ADR-027)                     */
/* ------------------------------------------------------------------ */

const NIVELES_PROTECCION: ReadonlyArray<{ valor: ProteccionNivel; etiqueta: string }> = [
  { valor: 'nacional_decreto', etiqueta: 'nacional (decreto)' },
  { valor: 'nacional_ley', etiqueta: 'nacional (ley)' },
  { valor: 'provincial_ley', etiqueta: 'provincial (ley)' },
  { valor: 'municipal', etiqueta: 'municipal' },
  { valor: 'sin_declaratoria', etiqueta: 'sin declaratoria' },
];

const VISIBILIDADES: ReadonlyArray<VisibilidadActivo> = ['public', 'generalized', 'restricted'];

const SENSIBLE_STATUS: ReadonlyArray<SensibleStatus> = ['sin_relevamiento', 'relevado_restringido'];

function CustodiaPatrimonial({ cliente, caps }: PropsSeccion) {
  const [activoId, setActivoId] = useState('');
  const [ficha, setFicha] = useState<FichaPatrimonio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Formulario de cambio (TODO opcional: solo las claves llenas viajan).
  const [proteccionNivel, setProteccionNivel] = useState('');
  const [proteccionNorma, setProteccionNorma] = useState('');
  const [conservacionEstado, setConservacionEstado] = useState('');
  const [visibilidad, setVisibilidad] = useState('');
  const [sensibleStatus, setSensibleStatus] = useState('');
  const [sensibleNota, setSensibleNota] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const cargar = async () => {
    if (activoId.trim() === '') {
      setError('indicá el id del activo patrimonial');
      return;
    }
    setCargando(true);
    setError(null);
    setExito(null);
    try {
      // Lectura PÚBLICA: sin sensible/sensible_nota por diseño (ADR-036).
      setFicha(await cliente.patrimonioFicha(activoId.trim()));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  const custodiar = async () => {
    setError(null);
    setExito(null);
    if (!caps.puedeModerar) {
      setError('la custodia patrimonial exige rol moderador o admin');
      return;
    }
    if (activoId.trim() === '') {
      setError('indicá el id del activo patrimonial');
      return;
    }
    // Solo las claves con valor viajan: el PATCH es upsert de lo declarado.
    const cambio: CambioCustodia = {};
    if (proteccionNivel !== '') cambio.proteccion_nivel = proteccionNivel as ProteccionNivel;
    if (proteccionNorma.trim() !== '') cambio.proteccion_norma = proteccionNorma.trim();
    if (conservacionEstado.trim() !== '') cambio.conservacion_estado = conservacionEstado.trim();
    if (visibilidad !== '') cambio.visibilidad = visibilidad as VisibilidadActivo;
    if (sensibleStatus !== '') cambio.sensible_status = sensibleStatus as SensibleStatus;
    if (sensibleNota.trim() !== '') cambio.sensible_nota = sensibleNota.trim();
    if (Object.keys(cambio).length === 0) {
      setError('completá al menos un campo del cambio de custodia');
      return;
    }
    setTrabajando(true);
    try {
      const actualizada = await cliente.custodiarPatrimonio(activoId.trim(), cambio);
      setExito('custodia sellada (patrimonio.custodiado) — visibilidad ' + actualizada.visibilidad);
      setSensibleNota('');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <section aria-label="Custodia patrimonial">
      <h3>Custodia patrimonial</h3>
      <p>
        <input
          value={activoId}
          onChange={(e) => setActivoId(e.target.value)}
          placeholder="id del activo patrimonial"
          aria-label="id del activo patrimonial"
        />{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'cargando…' : 'ver ficha pública'}
        </button>
      </p>
      {ficha !== null && (
        <p>
          <strong>{ficha.titulo}</strong> — visibilidad {ficha.visibilidad}
          {ficha.proteccion_nivel !== '' ? ' · protección ' + ficha.proteccion_nivel : ''}
          {ficha.conservacion_estado !== null && ficha.conservacion_estado !== '' ? ' · conservación ' + ficha.conservacion_estado : ''}
          . La ficha pública NUNCA incluye sensible/sensible_nota (ADR-036).
        </p>
      )}
      {caps.puedeModerar ? (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void custodiar();
          }}
        >
          <p>
            <select
              value={proteccionNivel}
              onChange={(e) => setProteccionNivel(e.target.value)}
              aria-label="nivel de protección"
            >
              <option value="">protección: sin cambio</option>
              {NIVELES_PROTECCION.map((n) => (
                <option key={n.valor} value={n.valor}>
                  {n.etiqueta}
                </option>
              ))}
            </select>{' '}
            <input
              value={proteccionNorma}
              onChange={(e) => setProteccionNorma(e.target.value)}
              placeholder="norma (opcional)"
              aria-label="norma de protección"
            />{' '}
            <input
              value={conservacionEstado}
              onChange={(e) => setConservacionEstado(e.target.value)}
              placeholder="estado de conservación (opcional)"
              aria-label="estado de conservación"
            />
          </p>
          <p>
            <select value={visibilidad} onChange={(e) => setVisibilidad(e.target.value)} aria-label="visibilidad">
              <option value="">visibilidad: sin cambio</option>
              {VISIBILIDADES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>{' '}
            <select
              value={sensibleStatus}
              onChange={(e) => setSensibleStatus(e.target.value)}
              aria-label="estado del relevamiento sensible"
            >
              <option value="">sensible: sin cambio</option>
              {SENSIBLE_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </p>
          <p>
            <textarea
              value={sensibleNota}
              onChange={(e) => setSensibleNota(e.target.value)}
              placeholder="nota sensible (canal de gestión: se escribe pero JAMÁS vuelve por GET — ADR-036)"
              aria-label="nota sensible"
              rows={2}
            />
          </p>
          <button type="submit" disabled={trabajando}>
            {trabajando ? 'sellando custodia…' : 'aplicar cambio de custodia'}
          </button>
        </form>
      ) : (
        <p>la escritura de custodia exige sesión de moderador/admin (la lectura es pública).</p>
      )}
      {exito !== null && <p role="status">{exito}</p>}
      {error !== null && <p role="alert">{error}</p>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: fuentes y pipeline de ingestas (#200)                       */
/* ------------------------------------------------------------------ */

function FuentesEIngestas({ cliente, caps }: PropsSeccion) {
  const [fuentes, setFuentes] = useState<FuenteEspacial[] | null>(null);
  const [ingestas, setIngestas] = useState<Ingesta[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Alta de ingesta (SOLO admin).
  const [sourceId, setSourceId] = useState('');
  const [fuenteKey, setFuenteKey] = useState('');
  const [nodoKey, setNodoKey] = useState('capital');
  const [capaServicio, setCapaServicio] = useState('');
  const [fechaAcceso, setFechaAcceso] = useState('');
  const [fechaCorte, setFechaCorte] = useState('');
  const [crsOrigen, setCrsOrigen] = useState('');
  const [crsNormalizado, setCrsNormalizado] = useState('EPSG:4326');
  const [escalaPrecision, setEscalaPrecision] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Avance del pipeline por id (el pipeline en curso NO es listable).
  const [ingestaId, setIngestaId] = useState('');
  const [estadoActual, setEstadoActual] = useState<EstadoIngesta>('recibido');
  const [destino, setDestino] = useState<EstadoIngesta | ''>('');
  const [avanzando, setAvanzando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const [fs, ins] = await Promise.allSettled([cliente.fuentes(), cliente.ingestasPublicadas()]);
      if (fs.status === 'fulfilled') setFuentes(fs.value);
      else setError('fuentes: ' + mensajeError(fs.reason));
      if (ins.status === 'fulfilled') setIngestas(ins.value);
      else setError('ingestas: ' + mensajeError(ins.reason));
    } finally {
      setCargando(false);
    }
  };

  const crear = async () => {
    setError(null);
    setExito(null);
    if (!caps.puedeAdministrarIngestas) {
      setError('el pipeline de ingestas es decisión del admin de plataforma (DH 2026-10-15)');
      return;
    }
    if (
      sourceId.trim().length < 3 ||
      fuenteKey.trim() === '' ||
      capaServicio.trim().length < 3 ||
      fechaAcceso === '' ||
      fechaCorte === '' ||
      crsOrigen.trim().length < 4 ||
      crsNormalizado.trim().length < 4 ||
      escalaPrecision.trim().length < 3
    ) {
      setError('faltan campos obligatorios de la ingesta (source_id, fuente, capa, fechas, CRS, escala)');
      return;
    }
    setEnviando(true);
    try {
      const { ingesta, idempotente } = await cliente.crearIngesta({
        source_id: sourceId.trim(),
        fuente_key: fuenteKey.trim(),
        nodo_key: nodoKey,
        capa_servicio: capaServicio.trim(),
        fecha_acceso: fechaAcceso,
        fecha_corte: fechaCorte,
        crs_origen: crsOrigen.trim(),
        crs_normalizado: crsNormalizado.trim(),
        escala_precision: escalaPrecision.trim(),
      });
      setExito(
        'ingesta ' + ingesta.id + ' creada en estado ' + ingesta.estado + (idempotente ? ' (idempotente: ya existía)' : '')
      );
      setIngestaId(ingesta.id);
      setEstadoActual(ingesta.estado);
      setDestino('');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const avanzar = async () => {
    setError(null);
    setExito(null);
    if (!caps.puedeAdministrarIngestas) {
      setError('el avance del pipeline es decisión del admin de plataforma');
      return;
    }
    if (ingestaId.trim() === '' || destino === '') {
      setError('indicá el id de la ingesta y el estado destino');
      return;
    }
    const saltoError = validarTransicionIngesta(estadoActual, destino);
    if (saltoError !== null) {
      setError(saltoError);
      return;
    }
    setAvanzando(true);
    try {
      const actualizada = await cliente.avanzarIngesta(ingestaId.trim(), destino);
      setExito('ingesta ' + actualizada.id + ' → ' + actualizada.estado);
      setEstadoActual(actualizada.estado);
      setDestino('');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setAvanzando(false);
    }
  };

  const siguientesIngesta = INGESTA_TRANSICIONES_A3[estadoActual] ?? [];

  return (
    <section aria-label="Fuentes y pipeline de ingestas">
      <h3>Fuentes espaciales y pipeline de ingestas</h3>
      <p>
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'cargando…' : 'cargar catálogo e ingestas publicadas'}
        </button>
      </p>
      {fuentes !== null &&
        (fuentes.length === 0 ? (
          <p>catálogo vacío (honesto).</p>
        ) : (
          <details>
            <summary>catálogo de fuentes ({fuentes.length})</summary>
            <ul>
              {fuentes.map((f) => (
                <li key={f.key}>
                  <strong>{f.key}</strong> — {f.organismo} · {f.nombre} · estado {f.estado} · cautela {f.cautela}
                </li>
              ))}
            </ul>
          </details>
        ))}
      {ingestas !== null && (
        <p>
          ingestas <strong>publicadas</strong>: {ingestas.length}. El pipeline en curso NO es
          listable (GET público solo expone publicado): se administra por id, sin simular
          pendientes (R15).
        </p>
      )}
      {caps.puedeAdministrarIngestas ? (
        <>
          <h4>Nueva ingesta (SOLO admin)</h4>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void crear();
            }}
          >
            <p>
              <input value={sourceId} onChange={(e) => setSourceId(e.target.value)} placeholder="source_id (>=3)" aria-label="source id" />{' '}
              <input
                value={fuenteKey}
                onChange={(e) => setFuenteKey(e.target.value)}
                placeholder="fuente_key (del catálogo)"
                aria-label="clave de la fuente"
                list="fuentes-clave"
              />{' '}
              <select value={nodoKey} onChange={(e) => setNodoKey(e.target.value)} aria-label="nodo de la ingesta">
                {NODOS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </p>
            {fuentes !== null && (
              <datalist id="fuentes-clave">
                {fuentes.map((f) => (
                  <option key={f.key} value={f.key} />
                ))}
              </datalist>
            )}
            <p>
              <input value={capaServicio} onChange={(e) => setCapaServicio(e.target.value)} placeholder="capa/servicio (>=3)" aria-label="capa o servicio" />{' '}
              <input type="date" value={fechaAcceso} onChange={(e) => setFechaAcceso(e.target.value)} aria-label="fecha de acceso" />{' '}
              <input
                value={fechaCorte}
                onChange={(e) => setFechaCorte(e.target.value)}
                placeholder="fecha de corte (YYYY o YYYY-MM-DD)"
                aria-label="fecha de corte"
              />
            </p>
            <p>
              <input value={crsOrigen} onChange={(e) => setCrsOrigen(e.target.value)} placeholder="CRS origen (>=4)" aria-label="crs origen" />{' '}
              <input value={crsNormalizado} onChange={(e) => setCrsNormalizado(e.target.value)} aria-label="crs normalizado" />{' '}
              <input
                value={escalaPrecision}
                onChange={(e) => setEscalaPrecision(e.target.value)}
                placeholder="escala/precisión (>=3)"
                aria-label="escala y precisión"
              />
            </p>
            <button type="submit" disabled={enviando}>
              {enviando ? 'registrando…' : 'registrar ingesta (nace recibido)'}
            </button>
          </form>
          <h4>Avanzar pipeline (forward-only)</h4>
          <p>
            <input
              value={ingestaId}
              onChange={(e) => setIngestaId(e.target.value)}
              placeholder="id de ingesta"
              aria-label="id de la ingesta"
            />{' '}
            <select
              value={estadoActual}
              onChange={(e) => {
                setEstadoActual(e.target.value as EstadoIngesta);
                setDestino('');
              }}
              aria-label="estado actual declarado"
            >
              {(Object.keys(INGESTA_TRANSICIONES_A3) as EstadoIngesta[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>{' '}
            <select value={destino} onChange={(e) => setDestino(e.target.value as EstadoIngesta | '')} aria-label="estado destino">
              <option value="">destino…</option>
              {siguientesIngesta.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>{' '}
            <button type="button" onClick={() => void avanzar()} disabled={avanzando}>
              {avanzando ? 'avanzando…' : 'avanzar'}
            </button>
          </p>
        </>
      ) : (
        <p>alta y avance del pipeline de ingestas: SOLO admin (decisión DH 2026-10-15).</p>
      )}
      {exito !== null && <p role="status">{exito}</p>}
      {error !== null && <p role="alert">{error}</p>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección: KPIs del nodo (VIG-003)                                     */
/* ------------------------------------------------------------------ */

function KpisNodo({ cliente }: PropsSeccion) {
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
    <section aria-label="KPIs del nodo">
      <h3>KPIs del nodo</h3>
      <p>
        <select value={nodo} onChange={(e) => setNodo(e.target.value)} aria-label="nodo de los KPIs">
          {NODOS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'cargando…' : 'cargar KPIs'}
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
                  ? 'null (sin datos — NO es 0, R15)'
                  : k.valor + ' ' + JSON.stringify(k.detalles)}{' '}
                <small>(calculado {k.computed_at})</small>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

export default A3GestorAdmin;

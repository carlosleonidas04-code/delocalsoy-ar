/**
 * DELocalSoy.AR — Panel del Artefacto A2: comerciante y titular verificado
 * (ART-R4 cableado exhaustivo, #273, épica #268). Consume useSesion (ART-R0)
 * y el cliente puro lib/artefactoA2.ts contra las superficies reales del
 * Mercado de Proximidad (MK-1/MK-2 ya en main).
 *
 * Reglas vivas: R5 (errores visibles, jamás []) · R15 (sin simulación: el alta
 * nace propuesto y la moderación ES la validación; el identificador del
 * reclamo viaja una sola vez y vuelve SOLO como hash — Ley 25.326) · ADR-027
 * (consentimiento nunca pre-marcado) · ADR-035 (habilitación verificada SOLO
 * con evidencia primaria) · ADR-038 (justificación pública >=10) · techo por
 * rol real (carga perezosa: el visitante tiene 10 req/min — no quemarlos al
 * montar es diseño honesto).
 *
 * Hallazgo honesto del panel: «titular verificado» es estado de la ficha, no
 * rol de sesión — el panel NO puede saber quién es titular; la API es la
 * compuerta (403 real). Las acciones de titular se ofrecen con sesión JWT y
 * el rechazo se declara, nunca se simula.
 *
 * Montaje único en ART-R5 (ArtefactosRoot): este archivo NO toca App.tsx ni
 * main.tsx (regla M0).
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSesion } from './SesionProvider';
import { CLAVE_TOKEN_SESION } from '../../lib/sesion';
import {
  COMPONENTES_A2,
  capacidadesA2,
  permisoVisibleA2,
  crearClienteA2,
  validarAltaComercio,
  validarAtributosComercio,
  validarHabilitacionComercio,
  validarJustificacion,
  validarReclamoTitularidad,
  NODOS_COMERCIO,
  TIPOS_COMERCIO,
  METODOS_TITULARIDAD,
  PAGOS_COMERCIO,
  ACCESIBILIDAD_COMERCIO,
  ESTADOS_HABILITACION_COMERCIO,
  TIPOS_HABILITACION_COMERCIO,
  ErrorA2,
  type AccesibilidadComercio,
  type AtributosComercio,
  type CapacidadesA2,
  type EstadoHabilitacionComercio,
  type HabilitacionComercio,
  type MedioPago,
  type MetodoTitularidad,
  type NodoKeyComercio,
  type TipoComercio,
  type TipoHabilitacionComercio,
} from '../../lib/artefactoA2';
import {
  etiquetaDualComercio,
  etiquetaHabilitacion,
  etiquetaRubro,
  etiquetaSelloHistorial,
  etiquetaTitularidad,
  notaComercios,
  type ComercioDetalle,
  type ComercioHistorialEntrada,
  type ComercioItem,
} from '../../lib/comercios';

const ETIQUETA_ESTADO: Record<string, string> = {
  en_main: 'en main',
  en_rama: 'en rama (PR en cola)',
  propuesto: 'propuesto',
};

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof ErrorA2 ? e.message : e instanceof Error ? e.message : porDefecto;
}

const ATRIBUTOS_BASE: AtributosComercio = {
  venta_directa: false,
  delivery: false,
  pagos: [],
  accesibilidad: 'unknown',
};

const HABILITACION_BASE: HabilitacionComercio = { estado: 'sin_dato' };

/* ------------------------------------------------------------------ */
/* Formulario de atributos (compartido por alta y edición)             */
/* ------------------------------------------------------------------ */

function FormularioAtributos({
  valor,
  alCambiar,
}: {
  valor: AtributosComercio;
  alCambiar: (siguiente: AtributosComercio) => void;
}) {
  const cambiarPago = (pago: MedioPago) => {
    const pagos = valor.pagos.includes(pago)
      ? valor.pagos.filter((p) => p !== pago)
      : [...valor.pagos, pago];
    alCambiar({ ...valor, pagos });
  };
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={valor.venta_directa}
          onChange={(e) => alCambiar({ ...valor, venta_directa: e.target.checked })}
        />{' '}
        venta directa
      </label>{' '}
      <label>
        <input
          type="checkbox"
          checked={valor.delivery}
          onChange={(e) => alCambiar({ ...valor, delivery: e.target.checked })}
        />{' '}
        delivery
      </label>{' '}
      <label>
        accesibilidad{' '}
        <select
          value={valor.accesibilidad}
          onChange={(e) => alCambiar({ ...valor, accesibilidad: e.target.value as AccesibilidadComercio })}
        >
          {ACCESIBILIDAD_COMERCIO.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>{' '}
      medios de pago:{' '}
      {PAGOS_COMERCIO.map((p) => (
        <label key={p}>
          <input type="checkbox" checked={valor.pagos.includes(p)} onChange={() => cambiarPago(p)} /> {p}
        </label>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Formulario de habilitación (ADR-035: verificada exige evidencia)    */
/* ------------------------------------------------------------------ */

function FormularioHabilitacion({
  valor,
  alCambiar,
}: {
  valor: HabilitacionComercio;
  alCambiar: (siguiente: HabilitacionComercio) => void;
}) {
  const verificada = valor.estado === 'verificada';
  const silencio = valor.estado === 'silencio_positivo';
  return (
    <>
      <label>
        estado{' '}
        <select
          value={valor.estado}
          onChange={(e) => alCambiar({ ...HABILITACION_BASE, estado: e.target.value as EstadoHabilitacionComercio })}
        >
          {ESTADOS_HABILITACION_COMERCIO.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>{' '}
      {verificada && (
        <>
          <label>
            tipo{' '}
            <select
              value={valor.tipo ?? 'municipal'}
              onChange={(e) => alCambiar({ ...valor, tipo: e.target.value as TipoHabilitacionComercio })}
            >
              {TIPOS_HABILITACION_COMERCIO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>{' '}
          <label>
            número{' '}
            <input value={valor.numero ?? ''} onChange={(e) => alCambiar({ ...valor, numero: e.target.value })} />
          </label>{' '}
          <label>
            fuente_key{' '}
            <input
              value={valor.fuente_key ?? ''}
              onChange={(e) => alCambiar({ ...valor, fuente_key: e.target.value })}
            />
          </label>{' '}
          <label>
            url evidencia{' '}
            <input value={valor.url ?? ''} onChange={(e) => alCambiar({ ...valor, url: e.target.value })} />
          </label>{' '}
          <label>
            fecha_verificacion{' '}
            <input
              type="date"
              value={valor.fecha_verificacion ?? ''}
              onChange={(e) => alCambiar({ ...valor, fecha_verificacion: e.target.value })}
            />
          </label>
        </>
      )}
      {silencio && (
        <label>
          fecha_presentacion{' '}
          <input
            type="date"
            value={valor.fecha_presentacion ?? ''}
            onChange={(e) => alCambiar({ ...valor, fecha_presentacion: e.target.value })}
          />
        </label>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function A2Comerciante() {
  const { estado, modo, refrescar } = useSesion();
  const caps: CapacidadesA2 = useMemo(() => capacidadesA2(estado), [estado]);

  const cliente = useMemo(
    () =>
      crearClienteA2({
        transporte: (ruta, init) => fetch(ruta, init),
        token: () => window.localStorage.getItem(CLAVE_TOKEN_SESION),
      }),
    []
  );

  useEffect(() => {
    if (modo === 'jwt') {
      void refrescar();
    }
  }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- carga perezosa: cada sección declara SU estado ---------- */

  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conCarga = useCallback(async (clave: string, fn: () => Promise<void>) => {
    setCargando(clave);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(mensajeDe(e, 'no se pudo cargar la sección'));
    } finally {
      setCargando(null);
    }
  }, []);

  /* ---------- directorio público ---------- */

  const [comercios, setComercios] = useState<ComercioItem[] | null>(null);

  const cargarDirectorio = useCallback(() => {
    return conCarga('directorio', async () => {
      setComercios(await cliente.directorio());
    });
  }, [cliente, conCarga]);

  /* ---------- ficha de un comercio (por id, carga perezosa) ---------- */

  const [fichaId, setFichaId] = useState('');
  const [detalle, setDetalle] = useState<ComercioDetalle | null>(null);
  const [historial, setHistorial] = useState<ComercioHistorialEntrada[] | null>(null);
  const [errorFicha, setErrorFicha] = useState<string | null>(null);

  const verFicha = useCallback(
    (idOverride?: string) => {
      return conCarga('ficha', async () => {
        setErrorFicha(null);
        setDetalle(null);
        setHistorial(null);
        const id = (idOverride ?? fichaId).trim();
        if (id === '') {
          setErrorFicha('escribí el id del comercio (el id llega con el alta o desde el directorio)');
          return;
        }
        const [f, h] = await Promise.allSettled([cliente.ficha(id), cliente.historial(id)]);
        if (f.status === 'fulfilled') setDetalle(f.value);
        else setErrorFicha('ficha: ' + mensajeDe(f.reason, 'no se pudo cargar'));
        if (h.status === 'fulfilled') setHistorial(h.value);
        else setErrorFicha('historial: ' + mensajeDe(h.reason, 'no se pudo cargar'));
      });
    },
    [cliente, conCarga, fichaId]
  );

  /* ---------- alta de comercio (testimonio ciudadano) ---------- */

  const [altaNodo, setAltaNodo] = useState<NodoKeyComercio>('capital');
  const [altaTitulo, setAltaTitulo] = useState('');
  const [altaDescripcion, setAltaDescripcion] = useState('');
  const [altaRubro, setAltaRubro] = useState('');
  const [altaTipo, setAltaTipo] = useState<TipoComercio>('local');
  const [altaLat, setAltaLat] = useState('');
  const [altaLng, setAltaLng] = useState('');
  const [altaAtributos, setAltaAtributos] = useState<AtributosComercio>(ATRIBUTOS_BASE);
  const [altaHabilitacion, setAltaHabilitacion] = useState<HabilitacionComercio>(HABILITACION_BASE);
  const [exitoAlta, setExitoAlta] = useState<{ id: string; idempotente: boolean } | null>(null);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [enviandoAlta, setEnviandoAlta] = useState(false);

  const enviarAlta = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorAlta(null);
      setExitoAlta(null);
      if (!caps.puedeEscribir) {
        setErrorAlta('el alta exige sesión iniciada — en modo synthetic la escritura no se acredita (R15)');
        return;
      }
      const nueva = {
        nodo_key: altaNodo,
        titulo: altaTitulo,
        descripcion: altaDescripcion.trim() === '' ? undefined : altaDescripcion,
        rubro_id: altaRubro.trim(),
        tipo: altaTipo,
        lat: altaLat.trim() === '' ? undefined : Number(altaLat),
        lng: altaLng.trim() === '' ? undefined : Number(altaLng),
        atributos: altaAtributos,
        habilitacion: altaHabilitacion,
      };
      const errValidacion = validarAltaComercio(nueva);
      if (errValidacion !== null) {
        setErrorAlta(errValidacion);
        return;
      }
      setEnviandoAlta(true);
      try {
        const { ficha, idempotente } = await cliente.alta(nueva);
        setExitoAlta({ id: ficha.id, idempotente });
        setFichaId(ficha.id);
        void cargarDirectorio();
      } catch (err) {
        setErrorAlta(mensajeDe(err, 'no se pudo proponer el comercio'));
      } finally {
        setEnviandoAlta(false);
      }
    },
    [
      altaAtributos,
      altaDescripcion,
      altaHabilitacion,
      altaLat,
      altaLng,
      altaNodo,
      altaRubro,
      altaTipo,
      altaTitulo,
      caps.puedeEscribir,
      cliente,
      conCarga,
      cargarDirectorio,
    ]
  );

  /* ---------- reclamo de titularidad ---------- */

  const [reclamoId, setReclamoId] = useState('');
  const [reclamoMetodo, setReclamoMetodo] = useState<MetodoTitularidad>('cuit');
  const [reclamoIdentificador, setReclamoIdentificador] = useState('');
  const [reclamoConsentimiento, setReclamoConsentimiento] = useState(false);
  const [exitoReclamo, setExitoReclamo] = useState<string | null>(null);
  const [errorReclamo, setErrorReclamo] = useState<string | null>(null);
  const [enviandoReclamo, setEnviandoReclamo] = useState(false);

  const enviarReclamo = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorReclamo(null);
      setExitoReclamo(null);
      if (!caps.puedeEscribir) {
        setErrorReclamo('el reclamo exige sesión iniciada — es un acto con consentimiento, no una demo (R15)');
        return;
      }
      const errValidacion = validarReclamoTitularidad(reclamoMetodo, reclamoIdentificador, reclamoConsentimiento);
      if (errValidacion !== null) {
        setErrorReclamo(errValidacion);
        return;
      }
      setEnviandoReclamo(true);
      try {
        const r = await cliente.reclamar(reclamoId.trim(), {
          metodo: reclamoMetodo,
          identificador: reclamoIdentificador,
          declaracion_consentimiento: true,
        });
        setExitoReclamo(
          'titularidad ' + r.estado + ' del comercio ' + r.activo_id +
            ' — el identificador se guardó SOLO como hash: ni vos lo volvés a ver en claro (Ley 25.326); moderación lo verifica'
        );
        setReclamoIdentificador('');
        setReclamoConsentimiento(false);
      } catch (err) {
        setErrorReclamo(mensajeDe(err, 'no se pudo reclamar la titularidad'));
      } finally {
        setEnviandoReclamo(false);
      }
    },
    [caps.puedeEscribir, cliente, reclamoConsentimiento, reclamoId, reclamoIdentificador, reclamoMetodo]
  );

  /* ---------- desistimiento del reclamo ---------- */

  const [desistirId, setDesistirId] = useState('');
  const [desistirConsentimiento, setDesistirConsentimiento] = useState(false);
  const [exitoDesistir, setExitoDesistir] = useState<string | null>(null);
  const [errorDesistir, setErrorDesistir] = useState<string | null>(null);
  const [enviandoDesistir, setEnviandoDesistir] = useState(false);

  const enviarDesistir = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorDesistir(null);
      setExitoDesistir(null);
      if (!caps.puedeEscribir) {
        setErrorDesistir('el desistimiento exige sesión iniciada — solo quien reclamó puede desistir (R15)');
        return;
      }
      if (!desistirConsentimiento) {
        setErrorDesistir('la declaración de consentimiento es explícita y obligatoria — nunca pre-marcada (ADR-027)');
        return;
      }
      setEnviandoDesistir(true);
      try {
        const r = await cliente.desistir(desistirId.trim());
        setExitoDesistir('reclamo desistido del comercio ' + r.activo_id + ' — la respuesta pública es saneada (sin hashes)');
        setDesistirConsentimiento(false);
      } catch (err) {
        setErrorDesistir(mensajeDe(err, 'no se pudo desistir'));
      } finally {
        setEnviandoDesistir(false);
      }
    },
    [caps.puedeEscribir, cliente, desistirConsentimiento, desistirId]
  );

  /* ---------- verificación de titularidad (moderación) ---------- */

  const [verificarId, setVerificarId] = useState('');
  const [exitoVerificar, setExitoVerificar] = useState<string | null>(null);
  const [errorVerificar, setErrorVerificar] = useState<string | null>(null);
  const [enviandoVerificar, setEnviandoVerificar] = useState(false);

  const enviarVerificar = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorVerificar(null);
      setExitoVerificar(null);
      if (!caps.puedeModerar) {
        setErrorVerificar('la verificación de titularidad es moderación — la API exige rol moderador o admin (403 real)');
        return;
      }
      setEnviandoVerificar(true);
      try {
        const r = await cliente.verificarTitularidad(verificarId.trim());
        setExitoVerificar('titularidad ' + r.estado + ' del comercio ' + r.activo_id + ' — habilita la edición del titular');
      } catch (err) {
        setErrorVerificar(mensajeDe(err, 'no se pudo verificar la titularidad'));
      } finally {
        setEnviandoVerificar(false);
      }
    },
    [caps.puedeModerar, cliente, verificarId]
  );

  /* ---------- edición de atributos (titular verificado) ---------- */

  const [editarId, setEditarId] = useState('');
  const [editarAtributos, setEditarAtributos] = useState<AtributosComercio>(ATRIBUTOS_BASE);
  const [exitoEditar, setExitoEditar] = useState<string | null>(null);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  const [enviandoEditar, setEnviandoEditar] = useState(false);

  const enviarEditar = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorEditar(null);
      setExitoEditar(null);
      if (!caps.puedeEscribir) {
        setErrorEditar('la edición exige sesión iniciada — y ser el titular verificado de la ficha');
        return;
      }
      const errValidacion = validarAtributosComercio(editarAtributos);
      if (errValidacion !== null) {
        setErrorEditar(errValidacion);
        return;
      }
      setEnviandoEditar(true);
      try {
        await cliente.editarAtributos(editarId.trim(), editarAtributos);
        setExitoEditar('atributos actualizados del comercio ' + editarId.trim() + ' — sello comercio.atributos_editados en el historial F-3');
      } catch (err) {
        setErrorEditar(mensajeDe(err, 'no se pudieron editar los atributos'));
      } finally {
        setEnviandoEditar(false);
      }
    },
    [caps.puedeEscribir, cliente, editarAtributos, editarId]
  );

  /* ---------- habilitación SIIC (titular verificado o moderación) ---------- */

  const [habId, setHabId] = useState('');
  const [habValor, setHabValor] = useState<HabilitacionComercio>(HABILITACION_BASE);
  const [habJustificacion, setHabJustificacion] = useState('');
  const [exitoHab, setExitoHab] = useState<string | null>(null);
  const [errorHab, setErrorHab] = useState<string | null>(null);
  const [enviandoHab, setEnviandoHab] = useState(false);

  const enviarHab = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorHab(null);
      setExitoHab(null);
      if (!caps.puedeEscribir && !caps.puedeModerar) {
        setErrorHab('el cambio de habilitación exige sesión (titular verificado con evidencia o moderación)');
        return;
      }
      const errValidacion = validarHabilitacionComercio(habValor);
      if (errValidacion !== null) {
        setErrorHab(errValidacion);
        return;
      }
      const errJustificacion = validarJustificacion(habJustificacion);
      if (errJustificacion !== null) {
        setErrorHab(errJustificacion);
        return;
      }
      setEnviandoHab(true);
      try {
        const h = await cliente.cambiarHabilitacion(habId.trim(), habValor, habJustificacion);
        setExitoHab('habilitación ' + h.estado + ' del comercio ' + habId.trim() + ' — sello comercio.habilitacion_actualizada (justificación pública)');
        setHabJustificacion('');
      } catch (err) {
        setErrorHab(mensajeDe(err, 'no se pudo cambiar la habilitación'));
      } finally {
        setEnviandoHab(false);
      }
    },
    [caps.puedeEscribir, caps.puedeModerar, cliente, habId, habJustificacion, habValor]
  );

  /* ---------- render ---------- */

  return (
    <section aria-labelledby="a2-titulo" className="artefacto-a2">
      <header>
        <h2 id="a2-titulo">Artefacto A2 — Comerciante y titular verificado · Mercado de Proximidad</h2>
        <p>
          {caps.esVisitante ? 'Visitante' : 'Con sesión'} · techo {caps.techoReqsMin} req/min ·{' '}
          {caps.esDemo
            ? 'modo SINTÉTICO: demo declarada — las escrituras no se acreditan (R15)'
            : modo === 'jwt'
              ? 'origen: API real'
              : 'origen: API sintética'}
          {caps.rol !== null ? ' · rol: ' + caps.rol : ''}
          {caps.puedeModerar ? ' · moderación habilitada' : ''}
        </p>
        <p>
          <small>
            la titularidad es un ESTADO de la ficha (sin_reclamo → reclamada → verificada), no un rol de
            sesión: el panel ofrece la acción y la API es la compuerta (403 real, Ley 25.326) — nada se simula.
          </small>
        </p>
      </header>

      <h3>Componentes y estado honesto</h3>
      <ul>
        {COMPONENTES_A2.map((c) => {
          const permiso = permisoVisibleA2(c.id, caps);
          return (
            <li key={c.id}>
              <strong>{c.titulo}</strong> — {ETIQUETA_ESTADO[c.estado] ?? c.estado} ·{' '}
              {permiso === null ? 'sin acceso' : permiso === 'leer' ? 'lectura' : permiso === 'escribir' ? 'escritura' : 'moderación'} ·{' '}
              <span>{c.resumen}</span>{' '}
              <small>({c.traza})</small>
            </li>
          );
        })}
      </ul>

      <h3>Directorio público (solo aprobado y público, ADR-036)</h3>
      {error !== null && <p role="alert">{error}</p>}
      <p>
        <button type="button" onClick={() => void cargarDirectorio()} disabled={cargando === 'directorio'}>
          {cargando === 'directorio' ? 'cargando…' : comercios === null ? 'cargar directorio' : 'recargar'}
        </button>{' '}
        <small>carga perezosa: 1 req — el visitante tiene techo 10 req/min</small>
      </p>
      {comercios !== null && <p>{notaComercios(comercios.length)}</p>}
      {comercios !== null && comercios.length > 0 && (
        <ul>
          {comercios.map((c) => (
            <li key={c.id}>
              <strong>{c.titulo}</strong> · {etiquetaDualComercio(c)} · rubro: {etiquetaRubro(c)} ·{' '}
              {etiquetaHabilitacion(c.habilitacion_estado)} · {etiquetaTitularidad(c.titularidad_estado)}{' '}
              <button type="button" onClick={() => { setFichaId(c.id); void verFicha(c.id); }}>
                ver ficha
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>Ficha de un comercio (por id)</h3>
      <p>
        <label>
          id{' '}
          <input value={fichaId} onChange={(e) => setFichaId(e.target.value)} />
        </label>{' '}
        <button type="button" onClick={() => void verFicha()} disabled={cargando === 'ficha'}>
          {cargando === 'ficha' ? 'cargando…' : 'ver ficha e historial (2 req)'}
        </button>
      </p>
      {errorFicha !== null && <p role="alert">{errorFicha}</p>}
      {detalle !== null && (
        <div>
          <h4>{detalle.ficha.titulo}</h4>
          <p>
            {etiquetaDualComercio(detalle.ficha)} · rubro: {etiquetaRubro(detalle.ficha)} · nodo {detalle.ficha.nodo_key}
            {detalle.ficha.subnodo_key !== null ? ' / ' + detalle.ficha.subnodo_key : ''} ·{' '}
            {etiquetaHabilitacion(detalle.ficha.habilitacion_estado)} ·{' '}
            {etiquetaTitularidad(detalle.ficha.titularidad_estado)}
            {detalle.ficha.lat !== null && detalle.ficha.lng !== null
              ? ' · lat ' + detalle.ficha.lat + ' lng ' + detalle.ficha.lng
              : ' · sin punto (R15: punto propio solo con fuente)'}
          </p>
          <p>
            productos aprobados: {detalle.count_productos}
            {detalle.productos.length > 0 && ' — ' + detalle.productos.map((p) => p.nombre ?? p.id).join(', ')}
            {' · operativa: '}
            {detalle.operativa === null ? 'sin ficha operativa (null ≠ 0, frontera Ley 2400-T de VIG-005)' : 'presente'}
          </p>
        </div>
      )}
      {historial !== null && (
        <div>
          <h4>Historial de confianza (F-3, sellos comercio.*)</h4>
          {historial.length === 0 ? (
            <p>sin sellos aún — el historial es append-only: nace con el primer sello (R15)</p>
          ) : (
            <ul>
              {historial.map((h, i) => (
                <li key={i}>
                  {etiquetaSelloHistorial(h.type)} · {h.occurred_at}
                  {'justificacion' in h && h.justificacion !== '' ? ' — «' + h.justificacion + '»' : ''}
                </li>
              ))}
            </ul>
          )}
          <p>
            <small>identificador_hash jamás viaja en la salida pública (Ley 25.326, DH §7.2).</small>
          </p>
        </div>
      )}

      <h3>Proponer un comercio (testimonio — nace propuesto)</h3>
      {!caps.puedeEscribir && (
        <p role="note">
          {caps.esDemo
            ? 'modo SINTÉTICO: la escritura no se ofrece — demo declarada, no acreditada (R15).'
            : 'el alta exige sesión iniciada (la escritura ciudadana es testimonio con autor, no anónima).'}
        </p>
      )}
      {caps.puedeEscribir && (
        <form onSubmit={enviarAlta}>
          <label>
            nodo{' '}
            <select value={altaNodo} onChange={(e) => setAltaNodo(e.target.value as NodoKeyComercio)}>
              {NODOS_COMERCIO.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>{' '}
          <label>
            título <input value={altaTitulo} onChange={(e) => setAltaTitulo(e.target.value)} required />
          </label>{' '}
          <label>
            rubro (código){' '}
            <input
              value={altaRubro}
              onChange={(e) => setAltaRubro(e.target.value)}
              placeholder="food_drink o cat-alimentos"
              required
            />
          </label>{' '}
          <label>
            tipo{' '}
            <select value={altaTipo} onChange={(e) => setAltaTipo(e.target.value as TipoComercio)}>
              {TIPOS_COMERCIO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>{' '}
          <label>
            descripción (opcional, sin PII){' '}
            <input value={altaDescripcion} onChange={(e) => setAltaDescripcion(e.target.value)} />
          </label>{' '}
          <label>
            lat (opcional) <input value={altaLat} onChange={(e) => setAltaLat(e.target.value)} />
          </label>{' '}
          <label>
            lng (opcional) <input value={altaLng} onChange={(e) => setAltaLng(e.target.value)} />
          </label>
          <p>
            <FormularioAtributos valor={altaAtributos} alCambiar={setAltaAtributos} />
          </p>
          <p>
            <FormularioHabilitacion valor={altaHabilitacion} alCambiar={setAltaHabilitacion} />
          </p>
          <p>
            <button type="submit" disabled={enviandoAlta}>
              {enviandoAlta ? 'proponiendo…' : 'proponer comercio'}
            </button>
          </p>
          {errorAlta !== null && <p role="alert">{errorAlta}</p>}
          {exitoAlta !== null && (
            <p role="status">
              comercio propuesto (id {exitoAlta.id})
              {exitoAlta.idempotente
                ? ' — reintento idempotente: ya estaba propuesto (P2002 → 200, sin duplicado)'
                : ''}
              . Moderación lo aprueba con justificación pública (ADR-038): propuesto no es aprobado.
            </p>
          )}
        </form>
      )}

      <h3>Reclamar titularidad (CUIT o expediente SIIC)</h3>
      {!caps.puedeEscribir && <p role="note">el reclamo exige sesión iniciada — es un acto con consentimiento.</p>}
      {caps.puedeEscribir && (
        <form onSubmit={enviarReclamo}>
          <label>
            id del comercio <input value={reclamoId} onChange={(e) => setReclamoId(e.target.value)} required />
          </label>{' '}
          <label>
            método{' '}
            <select value={reclamoMetodo} onChange={(e) => setReclamoMetodo(e.target.value as MetodoTitularidad)}>
              {METODOS_TITULARIDAD.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>{' '}
          <label>
            identificador (viaja SOLO como hash){' '}
            <input
              type="password"
              value={reclamoIdentificador}
              onChange={(e) => setReclamoIdentificador(e.target.value)}
              required
            />
          </label>{' '}
          <label>
            <input
              type="checkbox"
              checked={reclamoConsentimiento}
              onChange={(e) => setReclamoConsentimiento(e.target.checked)}
            />{' '}
            declaro ser el titular y consiento el tratamiento (ADR-027 — nunca pre-marcado)
          </label>{' '}
          <button type="submit" disabled={enviandoReclamo}>
            {enviandoReclamo ? 'reclamando…' : 'reclamar titularidad'}
          </button>
          {errorReclamo !== null && <p role="alert">{errorReclamo}</p>}
          {exitoReclamo !== null && <p role="status">{exitoReclamo}</p>}
        </form>
      )}

      <h3>Desistir mi reclamo</h3>
      {!caps.puedeEscribir && <p role="note">el desistimiento exige sesión — solo quien reclamó puede desistir.</p>}
      {caps.puedeEscribir && (
        <form onSubmit={enviarDesistir}>
          <label>
            id del comercio <input value={desistirId} onChange={(e) => setDesistirId(e.target.value)} required />
          </label>{' '}
          <label>
            <input
              type="checkbox"
              checked={desistirConsentimiento}
              onChange={(e) => setDesistirConsentimiento(e.target.checked)}
            />{' '}
            declaro desistir el reclamo de titularidad (ADR-027)
          </label>{' '}
          <button type="submit" disabled={enviandoDesistir}>
            {enviandoDesistir ? 'desistiendo…' : 'desistir'}
          </button>
          {errorDesistir !== null && <p role="alert">{errorDesistir}</p>}
          {exitoDesistir !== null && <p role="status">{exitoDesistir}</p>}
        </form>
      )}

      <h3>Verificar titularidad (moderación)</h3>
      {!caps.puedeModerar && (
        <p role="note">
          la verificación es moderación — sin el rol la API responde 403 real (R15). La verificación habilita
          la edición del titular.
        </p>
      )}
      {caps.puedeModerar && (
        <form onSubmit={enviarVerificar}>
          <label>
            id del comercio <input value={verificarId} onChange={(e) => setVerificarId(e.target.value)} required />
          </label>{' '}
          <button type="submit" disabled={enviandoVerificar}>
            {enviandoVerificar ? 'verificando…' : 'verificar titularidad reclamada'}
          </button>
          {errorVerificar !== null && <p role="alert">{errorVerificar}</p>}
          {exitoVerificar !== null && <p role="status">{exitoVerificar}</p>}
        </form>
      )}

      <h3>Editar atributos (solo el titular verificado)</h3>
      {!caps.puedeEscribir && <p role="note">la edición exige sesión iniciada — y ser el titular verificado.</p>}
      {caps.puedeEscribir && (
        <form onSubmit={enviarEditar}>
          <label>
            id del comercio <input value={editarId} onChange={(e) => setEditarId(e.target.value)} required />
          </label>
          <p>
            <FormularioAtributos valor={editarAtributos} alCambiar={setEditarAtributos} />
          </p>
          <p>
            <button type="submit" disabled={enviandoEditar}>
              {enviandoEditar ? 'editando…' : 'editar atributos'}
            </button>
          </p>
          {errorEditar !== null && <p role="alert">{errorEditar}</p>}
          {exitoEditar !== null && <p role="status">{exitoEditar}</p>}
          <p>
            <small>
              si NO sos el titular verificado, la API responde 403 real sin eco (Ley 25.326) — el panel no
              simula el permiso.
            </small>
          </p>
        </form>
      )}

      <h3>Habilitación comercial (Ley 104-A / SIIC, ADR-035)</h3>
      {!caps.puedeEscribir && !caps.puedeModerar && (
        <p role="note">el cambio exige sesión: titular verificado con evidencia primaria, o moderación.</p>
      )}
      {(caps.puedeEscribir || caps.puedeModerar) && (
        <form onSubmit={enviarHab}>
          <label>
            id del comercio <input value={habId} onChange={(e) => setHabId(e.target.value)} required />
          </label>
          <p>
            <FormularioHabilitacion valor={habValor} alCambiar={setHabValor} />
          </p>
          <p>
            <label>
              justificación pública ({'>='}10, ADR-038){' '}
              <input value={habJustificacion} onChange={(e) => setHabJustificacion(e.target.value)} required />
            </label>
          </p>
          <p>
            <button type="submit" disabled={enviandoHab}>
              {enviandoHab ? 'cambiando…' : 'cambiar habilitación'}
            </button>
          </p>
          {errorHab !== null && <p role="alert">{errorHab}</p>}
          {exitoHab !== null && <p role="status">{exitoHab}</p>}
          <p>
            <small>
              «verificada» SOLO con evidencia primaria completa (tipo, número, fuente, url, fecha — ADR-035);
              «silencio_positivo» = ley 02-07-2026 (30 días hábiles); «sin_dato» no es clandestino.
            </small>
          </p>
        </form>
      )}

      <h3>Sin cablear aún (honesto, R15)</h3>
      <ul>
        <li>marketplace — deliberadamente Fase 2 (roadmap §5.6): sin pagos, sin promesas (MK-5 con ADR propio)</li>
        <li>PII de contacto — sin datos en v1 (decisión DH: relay por plataforma, MK-4 evaluará bandejas)</li>
        <li>
          consentimiento granular por campo — vive en activos.consentimiento (VIG-002), el panel declara el
          alto nivel; el detalle por campo no se duplica
        </li>
        <li>cambio de estado del comercio (aprobado, rechazado) — es moderación del A3, no del titular</li>
      </ul>
    </section>
  );
}

export default A2Comerciante;

/**
 * DELocalSoy.AR — Panel del Artefacto A2: comerciante y titular verificado
 * (ART-R4 cableado exhaustivo, #273, épica #268). Consume useSesion (ART-R0)
 * y el cliente puro lib/artefactoA2.ts contra las superficies reales del
 * Mercado de Proximidad (MK-1/MK-2 ya en main).
 *
 * ARTEFACTOS-ROLES AR2 (#401, épica #399 — 2026-11-07): la vista comerciante
 * del sprint: búsqueda por facetas reales del directorio (?nodo ?rubro
 * ?subnodo ?habilitacion — rubro y subnodo por CÓDIGO, nunca por nombre;
 * faceta subnodo MK-3b #426), camino completo
 * buscar → ver ficha → reclamar / editar / cambiar habilitación con un click,
 * y frontera honesta de la edición v0.2 verificada en vivo: los atributos
 * SÍ se editan (PATCH /:id), la descripción solo en el alta, el horario
 * declarado NO existe en el contrato MK-1 — sin campo no hay vista (R15).
 *
 * MK-3c (#426, épica #422 — EV-096, adoptables C1–C4 del canvas
 * delocalsoy-a2-comercio v0.2 ratificados por la DH 2026-11-07): frontend
 * puro SIN cambio de API. C1 directorio WCAG 2.2 (facetas como fieldset con
 * legend y counts reales, chips quitar-filtro >=24px SC 2.5.8 con foco a la
 * región de estado, role=status SC 4.1.3). C2 las facetas viven en la URL
 * (window.location.search + history.pushState + popstate — sin react-router:
 * el botón atrás RESTAURA la búsqueda). C3 JSON-LD honesto en la ficha
 * (jsonLdComercio: JAMÁS telephone/address/aggregateRating/review, geo solo
 * con punto público ADR-036, sin openingHours ni url R15). C4 diccionario
 * T_DIRECTORIO (preparación i18n — los textos nuevos viven ahí).
 *
 * PROT-A2 R3 (#425, épica #418 — 2026-11-08): el prototipo A2 es artefacto
 * real — mini-router interno de 7 vistas (Opción A de #419 ratificada: la
 * vista ES el estado, pliegue al M0 sin react-router), detalle de ficha con
 * botón volver y WCAG 2.2 (nav con aria-current, botones >=24px SC 2.5.8,
 * región role=status con foco al navegar — patrón MK-3c). Frontend puro:
 * sin cambio de API.
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
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSesion } from './SesionProvider';
import { CLAVE_TOKEN_SESION } from '../../lib/sesion';
import {
  COMPONENTES_A2,
  VISTAS_A2,
  capacidadesA2,
  permisoVisibleA2,
  crearClienteA2,
  validarAltaComercio,
  validarAtributosComercio,
  validarHabilitacionComercio,
  validarJustificacion,
  validarReclamoTitularidad,
  validarBusquedaComercio,
  type BusquedaComercio,
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
  type VistaA2,
} from '../../lib/artefactoA2';
import {
  etiquetaDualComercio,
  etiquetaHabilitacion,
  etiquetaRubro,
  etiquetaSelloHistorial,
  etiquetaTitularidad,
  jsonLdComercio,
  facetasDesdeQuery,
  queryDesdeFacetas,
  notaComercios,
  type ComercioDetalle,
  type ComercioHistorialEntrada,
  type ComercioItem,
  type FacetasDirectorio,
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

/**
 * MK-3c C4 (#426): diccionario de textos del directorio — los strings
 * agregados en MK-3c viven agrupados aquí (preparación i18n futura, sin
 * dependencia nueva). R15: los textos existentes NO se reescriben en este
 * sprint — el diccionario es aditivo.
 */
const T_DIRECTORIO = {
  legend: 'facetas del directorio — búsqueda real contra la API (GET /api/comercios)',
  notaCounts:
    'counts por faceta derivados del directorio cargado (hasta 100, take MK-0 §2.5) — facetado de presentación; la búsqueda SIEMPRE va a la API',
  quitarFiltro: 'quitar filtro',
  jsonLdTitulo: 'Descubribilidad ética — JSON-LD (MK-3c C3, EV-096)',
  jsonLdNota:
    'schema.org/LocalBusiness — SOLO campos que esta ficha ya publica. JAMÁS telephone/address (la ficha no publica contacto directo — Ley 25.326; el canal es el relay MK-4), JAMÁS aggregateRating/review (sin estrellas v1: fabricar confianza estructurada es peor que no tenerla), geo solo si existe punto público (ADR-036), sin openingHours ni url (R15: sin dato ratificado no hay campo).',
} as const;

/**
 * MK-3c C1 (#426): un comercio cumple UNA faceta — comparación por código,
 * jamás por label. Función pura (testeable por patrón del repo).
 */
function cumpleFaceta(c: ComercioItem, clave: keyof FacetasDirectorio, valor: string): boolean {
  switch (clave) {
    case 'nodo':
      return c.nodo_key === valor;
    case 'rubro':
      return c.rubro.id === valor;
    case 'subnodo':
      return c.subnodo_key === valor;
    case 'habilitacion':
      return c.habilitacion_estado === valor;
    default:
      return false;
  }
}

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

/** PROT-A2 R3 (#425): detalle abierto del mini-router — solo ficha de comercio en v1. */
type DetalleA2 = { tipo: 'ficha'; id: string };

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

  /* ---------- PROT-A2 R3 (#425): mini-router — la vista ES el estado ---------- */

  const [vista, setVista] = useState<VistaA2>('inicio');
  const [detalleAbierto, setDetalleAbierto] = useState<DetalleA2 | null>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const notaVistaRef = useRef<HTMLParagraphElement>(null);

  const irA = useCallback((v: VistaA2) => {
    setVista(v);
    setDetalleAbierto(null);
    regionRef.current?.focus();
  }, []);

  const volverDeDetalle = useCallback(() => {
    setDetalleAbierto(null);
    regionRef.current?.focus();
  }, []);

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
  // MK-3c C1 (#426): base sin filtros para los counts por faceta (facetado
  // de presentación — la búsqueda SIEMPRE va a la API).
  const [baseComercios, setBaseComercios] = useState<ComercioItem[] | null>(null);

  const cargarDirectorio = useCallback(() => {
    return conCarga('directorio', async () => {
      const rows = await cliente.directorio();
      setComercios(rows);
      setBaseComercios(rows);
    });
  }, [cliente, conCarga]);

  /* ---------- búsqueda del directorio (AR2 #401: buscar → ver → reclamar) ---------- */

  const [busquedaNodo, setBusquedaNodo] = useState<NodoKeyComercio | ''>('');
  const [busquedaRubro, setBusquedaRubro] = useState('');
  // MK-3b (#426): faceta subnodo junto a las existentes (decisión DH 2026-11-07)
  const [busquedaSubnodo, setBusquedaSubnodo] = useState('');
  const [busquedaHabilitacion, setBusquedaHabilitacion] = useState<EstadoHabilitacionComercio | ''>('');
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  // MK-3c C1 (SC 4.1.3): región de estado del directorio — el foco de los
  // chips quitar-filtro aterriza aquí tras cada cambio (WCAG 2.2).
  const estadoRef = useRef<HTMLParagraphElement>(null);

  // MK-3c C2 (#426): las facetas viven en la URL — el botón atrás restaura
  // la búsqueda. Sin react-router (no existe en el repo web): History API.
  // MK-3c C1: facetas activas derivadas del estado (fuente única de verdad).
  const facetasActivas = useMemo<FacetasDirectorio>(() => {
    const f: FacetasDirectorio = {};
    if (busquedaNodo !== '') {
      f.nodo = busquedaNodo;
    }
    if (busquedaRubro.trim() !== '') {
      f.rubro = busquedaRubro.trim();
    }
    if (busquedaSubnodo.trim() !== '') {
      f.subnodo = busquedaSubnodo.trim();
    }
    if (busquedaHabilitacion !== '') {
      f.habilitacion = busquedaHabilitacion;
    }
    return f;
  }, [busquedaNodo, busquedaRubro, busquedaSubnodo, busquedaHabilitacion]);

  const aplicarFacetas = useCallback(
    (f: FacetasDirectorio, push: boolean) => {
      setBusquedaNodo((f.nodo ?? '') as NodoKeyComercio | '');
      setBusquedaRubro(f.rubro ?? '');
      setBusquedaSubnodo(f.subnodo ?? '');
      setBusquedaHabilitacion((f.habilitacion ?? '') as EstadoHabilitacionComercio | '');
      setErrorBusqueda(null);
      const filtros: BusquedaComercio = {};
      if (f.nodo !== undefined && f.nodo !== '') {
        filtros.nodo = f.nodo as NodoKeyComercio;
      }
      if (f.rubro !== undefined && f.rubro !== '') {
        filtros.rubro = f.rubro;
      }
      if (f.subnodo !== undefined && f.subnodo !== '') {
        filtros.subnodo = f.subnodo;
      }
      if (f.habilitacion !== undefined && f.habilitacion !== '') {
        filtros.habilitacion = f.habilitacion as EstadoHabilitacionComercio;
      }
      const errValidacion = validarBusquedaComercio(filtros);
      if (errValidacion !== null) {
        setErrorBusqueda(errValidacion);
        return;
      }
      if (push) {
        window.history.pushState(null, '', window.location.pathname + queryDesdeFacetas(f));
      }
      return conCarga('directorio', async () => {
        const rows = await cliente.directorio(filtros);
        setComercios(rows);
        if (Object.keys(filtros).length === 0) {
          setBaseComercios(rows);
        }
      });
    },
    [cliente, conCarga]
  );

  // ref al último aplicarFacetas: el listener popstate vive una sola vez.
  const aplicarFacetasRef = useRef<(f: FacetasDirectorio, push: boolean) => void>(() => {});
  useEffect(() => {
    aplicarFacetasRef.current = aplicarFacetas;
  }, [aplicarFacetas]);

  useEffect(() => {
    // C2: restaurar facetas de la URL al montar (link compartible) y en cada
    // popstate (botón atrás/adelante). SIN búsqueda automática sin facetas:
    // la carga perezosa es diseño honesto (techo 10 req/min del visitante).
    const facetas = facetasDesdeQuery(window.location.search);
    if (Object.keys(facetas).length > 0) {
      aplicarFacetasRef.current(facetas, false);
    }
    const enPopstate = () => {
      aplicarFacetasRef.current(facetasDesdeQuery(window.location.search), false);
    };
    window.addEventListener('popstate', enPopstate);
    return () => window.removeEventListener('popstate', enPopstate);
  }, []);

  // C1: counts por faceta sobre la base cargada, aplicando las DEMÁS facetas
  // activas (facetado estándar). null = sin base cargada: no se inventa.
  const cuentaFaceta = useCallback(
    (clave: keyof FacetasDirectorio, valor: string): number | null => {
      if (baseComercios === null) {
        return null;
      }
      return baseComercios.filter((c) => {
        for (const k of ['nodo', 'rubro', 'subnodo', 'habilitacion'] as const) {
          const v = facetasActivas[k];
          if (k !== clave && v !== undefined && !cumpleFaceta(c, k, v)) {
            return false;
          }
        }
        return cumpleFaceta(c, clave, valor);
      }).length;
    },
    [baseComercios, facetasActivas]
  );

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
        // PROT-A2 R3 (#425): la ficha vive en el detalle del mini-router.
        setDetalleAbierto({ tipo: 'ficha', id });
        regionRef.current?.focus();
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

      {/* PROT-A2 R3 (#425, épica #418): mini-router interno — la vista ES el
          estado (Opción A de #419 ratificada: pliegue al M0, sin react-router). */}
      <nav aria-label="Vistas del artefacto A2">
        {VISTAS_A2.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => irA(v.id)}
            aria-current={vista === v.id ? 'page' : undefined}
            style={{ minWidth: '24px', minHeight: '24px' }}
          >
            {v.titulo}
          </button>
        ))}
      </nav>
      <p ref={notaVistaRef} tabIndex={-1} role="status" aria-live="polite" style={{ outline: 'none' }}>
        vista: {VISTAS_A2.find((v) => v.id === vista)?.titulo ?? vista}
        {detalleAbierto !== null ? ' · detalle abierto' : ''}
      </p>
      <div ref={regionRef} tabIndex={-1} style={{ outline: 'none' }}>
        {detalleAbierto === null ? (
        <>
          {vista === 'inicio' && (
            <div>
              <h3>Inicio</h3>
              <p>
                artefacto del comerciante y titular verificado — techo honesto {caps.techoReqsMin} req/min ·{' '}
                {caps.esDemo ? 'modo SINTÉTICO: demo declarada (R15)' : 'API real'} · {VISTAS_A2.length} vistas · detalle de ficha con volver
              </p>
              <ul>
                {VISTAS_A2.map((v) => (
                  <li key={v.id}>
                    <strong>{v.titulo}</strong> — {v.descripcion}
                    {v.escritura ? ' (exige sesión iniciada)' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {vista === 'componentes' && (
          <>
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

          </>
          )}
          {vista === 'directorio' && (
          <>
      <h3>Directorio público (solo aprobado y público, ADR-036)</h3>
      {error !== null && <p role="alert">{error}</p>}
      <p>
        <button type="button" onClick={() => void cargarDirectorio()} disabled={cargando === 'directorio'}>
          {cargando === 'directorio' ? 'cargando…' : comercios === null ? 'cargar directorio' : 'recargar'}
        </button>{' '}
        <small>carga perezosa: 1 req — el visitante tiene techo 10 req/min</small>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void aplicarFacetas(facetasActivas, true);
        }}
      >
        {/* MK-3c C1 (WCAG 2.2): facetas agrupadas como fieldset con legend —
            los inputs de texto (rubro/subnodo) viajan por submit; los selects
            disparan faceta + URL (C2) al cambiar. */}
        <fieldset>
          <legend>{T_DIRECTORIO.legend}</legend>
          <label>
            nodo{' '}
            <select
              value={busquedaNodo}
              onChange={(e) => {
                const v = e.target.value as NodoKeyComercio | '';
                const f: FacetasDirectorio = { ...facetasActivas };
                if (v === '') {
                  delete f.nodo;
                } else {
                  f.nodo = v;
                }
                void aplicarFacetas(f, true);
              }}
            >
              <option value="">todos</option>
              {NODOS_COMERCIO.map((n) => {
                const count = cuentaFaceta('nodo', n);
                return (
                  <option key={n} value={n}>
                    {n}
                    {count !== null ? ' (' + count + ')' : ''}
                  </option>
                );
              })}
            </select>
          </label>{' '}
          <label>
            rubro (código){' '}
            <input
              value={busquedaRubro}
              onChange={(e) => setBusquedaRubro(e.target.value)}
              placeholder="food_drink"
            />
          </label>{' '}
          <label>
            subnodo (código){' '}
            <input
              value={busquedaSubnodo}
              onChange={(e) => setBusquedaSubnodo(e.target.value)}
              placeholder="sj_iglesia_..."
            />
          </label>{' '}
          <label>
            habilitación{' '}
            <select
              value={busquedaHabilitacion}
              onChange={(e) => {
                const v = e.target.value as EstadoHabilitacionComercio | '';
                const f: FacetasDirectorio = { ...facetasActivas };
                if (v === '') {
                  delete f.habilitacion;
                } else {
                  f.habilitacion = v;
                }
                void aplicarFacetas(f, true);
              }}
            >
              <option value="">todas</option>
              {ESTADOS_HABILITACION_COMERCIO.map((h) => {
                const count = cuentaFaceta('habilitacion', h);
                return (
                  <option key={h} value={h}>
                    {h}
                    {count !== null ? ' (' + count + ')' : ''}
                  </option>
                );
              })}
            </select>
          </label>{' '}
          <button type="submit" disabled={cargando === 'directorio'}>
            {cargando === 'directorio' ? 'buscando…' : 'buscar en el directorio'}
          </button>
        </fieldset>
      </form>
      {/* MK-3c C1 (SC 2.5.8): chips quitar-filtro >=24px con foco a la región
          de estado al quitar (SC 4.1.3) — el foco NO se pierde. */}
      {Object.keys(facetasActivas).length > 0 && (
        <p>
          {(['nodo', 'rubro', 'subnodo', 'habilitacion'] as const)
            .filter((k) => facetasActivas[k] !== undefined)
            .map((k) => {
              const v = facetasActivas[k];
              if (v === undefined) {
                return null;
              }
              return (
                <button
                  key={k}
                  type="button"
                  style={{ minHeight: 24, minWidth: 24, marginRight: 6 }}
                  aria-label={T_DIRECTORIO.quitarFiltro + ': ' + k + ' ' + v}
                  onClick={() => {
                    const resto: FacetasDirectorio = { ...facetasActivas };
                    delete resto[k];
                    void aplicarFacetas(resto, true);
                    estadoRef.current?.focus();
                  }}
                >
                  {k}: {v} ✕
                </button>
              );
            })}
        </p>
      )}
      {errorBusqueda !== null && <p role="alert">{errorBusqueda}</p>}
      <p>
        <small>
          búsqueda = facetas reales de GET /api/comercios (?nodo ?subnodo ?rubro ?habilitacion), el
          rubro y el subnodo viajan por CÓDIGO, nunca por nombre; la búsqueda por título NO existe en
          la superficie MK-1 v1 — sin campo no hay filtro (R15, no se filtra en el cliente: sería maqueta).
        </small>
      </p>
      {/* MK-3c C1 (SC 4.1.3): región de estado del directorio — vive desde el
          montaje para que los cambios se anuncien (WCAG 2.2). */}
      <p ref={estadoRef} tabIndex={-1} role="status" aria-live="polite" style={{ outline: 'none' }}>
        {comercios !== null ? notaComercios(comercios.length) : ' '}
        {baseComercios !== null ? ' — ' + T_DIRECTORIO.notaCounts : ''}
      </p>
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
          </>
          )}
          {vista === 'alta' && (
          <>

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

          </>
          )}
          {vista === 'titularidad' && (
          <>
      <h3>Reclamar titularidad (CUIT o expediente SIIC)</h3>
      {!caps.puedeEscribir && <p role="note">el reclamo exige sesión iniciada — es un acto con consentimiento.</p>}
      <p>
        <small>
          transparencia del reclamo (AR2): el estado es público en la ficha (sin_reclamo → reclamada →
          verificada), cada paso queda en el historial F-3 (sellos comercio.titularidad_*) y la
          moderación justifica en público (ADR-038) — después de reclamar, volvé a «ver ficha» para
          seguir el estado.
        </small>
      </p>
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

          </>
          )}
          {vista === 'edicion' && (
          <>
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
          <p>
            <small>
              frontera honesta de la edición v0.2 (AR2, verificada en vivo contra PATCH /api/comercios/:id):
              las categorías operativas (venta directa, delivery, pagos, accesibilidad, feria) SÍ se editan;
              la descripción NO se edita — vive en el alta y cambiarla exige extensión de contrato sellada;
              el horario declarado NO existe en el contrato MK-1 — sin campo no hay vista (R15).
            </small>
          </p>
        </form>
      )}

          </>
          )}
          {vista === 'habilitacion' && (
          <>
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

          </>
          )}
        </>
        ) : (
        <>
          <p>
            <button type="button" onClick={volverDeDetalle} style={{ minWidth: '24px', minHeight: '24px' }}>
              ← volver
            </button>
          </p>
          <h3>Ficha del comercio{detalleAbierto !== null ? ' · ' + detalleAbierto.id : ''}</h3>
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
          {/* MK-3c C3 (#426, EV-096): descubribilidad ética — JSON-LD honesto
              de ESTA ficha: solo campos que la ficha ya publica. */}
          <div>
            <h4>{T_DIRECTORIO.jsonLdTitulo}</h4>
            <p>
              <small>{T_DIRECTORIO.jsonLdNota}</small>
            </p>
            <pre>{JSON.stringify(jsonLdComercio(detalle.ficha), null, 2)}</pre>
            <script type="application/ld+json">{JSON.stringify(jsonLdComercio(detalle.ficha))}</script>
          </div>
          <p>
            <button type="button" onClick={() => { setReclamoId(detalle.ficha.id); irA('titularidad'); }}>
              reclamar titularidad de esta ficha
            </button>{' '}
            <button type="button" onClick={() => { setEditarId(detalle.ficha.id); irA('edicion'); }}>
              editar atributos de esta ficha
            </button>{' '}
            <button type="button" onClick={() => { setHabId(detalle.ficha.id); irA('habilitacion'); }}>
              cambiar habilitación de esta ficha
            </button>
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
          {detalle === null && (
            <p>
              {errorFicha === null
                ? 'cargando ficha e historial… (2 req)'
                : 'la ficha no quedó cargada — corregí el id o volvé al directorio (R15: nada se simula).'}
            </p>
          )}
        </>
        )}
      </div>
      <h3>Sin cablear aún (honesto, R15)</h3>
      <ul>
        <li>marketplace — deliberadamente Fase 2 (roadmap §5.6): sin pagos, sin promesas (MK-5 con ADR propio)</li>
        <li>bandeja del relay MK-4a — la API ya la expone (POST/GET /api/comercios/:id/relay, EV-098); la vista del titular en este panel es el slice siguiente con issue propio — sin PII de contacto jamás (Ley 25.326)</li>
        <li>
          consentimiento granular por campo — vive en activos.consentimiento (VIG-002), el panel declara el
          alto nivel; el detalle por campo no se duplica
        </li>
        <li>cambio de estado del comercio (aprobado, rechazado) — es moderación del A3, no del titular</li>
        <li>
          horario declarado — NO existe en el contrato MK-1 v0.2: sin campo no hay vista (R15); extensión
          de contrato con sello propio si la DH la pide
        </li>
        <li>
          edición de la descripción — solo en el alta v0.2 (AR2 verificado en vivo): cambiar el texto del
          activo exige extensión sellada de PATCH /api/comercios/:id
        </li>
      </ul>
    </section>
  );
}

export default A2Comerciante;

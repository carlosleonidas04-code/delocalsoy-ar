/**
 * DELocalSoy.AR — Panel del Artefacto A1: vecino, ciudadano y visitante
 * (ART-R1 cableado exhaustivo, #270, épica #268). Consume useSesion
 * (ART-R0) y el cliente puro lib/artefactoA1.ts contra las superficies
 * reales de la API.
 *
 * Reglas vivas: R5 (errores visibles, jamás []) · R15 (sin simulación:
 * received/testimonio/detected al nacer; la moderación ES la validación
 * comunitaria) · ADR-027/Ley 25.326 (sin PII; consentimiento nunca
 * pre-marcado) · techo por rol real (carga perezosa por sección: el
 * visitante tiene 10 req/min — no quemarlos al montar es diseño honesto).
 *
 * Montaje único en ART-R5 (ArtefactosRoot): este archivo NO toca App.tsx
 * ni main.tsx (regla M0).
 *
 * PROT-A1 R3 (#420, épica #418): navegación por vistas — la vista ES el
 * estado (mini-router interno, Opción A de #419 ratificada: pliegue al M0,
 * sin react-router ni URL global). WCAG 2.2: botones >=24px (SC 2.5.8),
 * aria-current y foco a la región al navegar (patrón MK-3c).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSesion } from './SesionProvider';
import { CLAVE_TOKEN_SESION } from '../../lib/sesion';
import {
  COMPONENTES_A1,
  VISTAS_A1,
  capacidadesA1,
  permisoVisible,
  crearClienteA1,
  validarActorA1,
  TIPOS_OPORTUNIDAD,
  TIPOS_EVIDENCIA,
  ErrorA1,
  ESTADOS_ABIERTOS_REPORTE,
  RADIO_PRE_CHEQUEO_M,
  distanciaMetrosLatLon,
  type ActivoDirectorio,
  type CapacidadesA1,
  type CategoriaNodo,
  type DuplicadoSugerido,
  type FeatureNodo,
  type FichaPublica,
  type FichaRespuestasV1,
  type ObservatorioNodo,
  type Oportunidad,
  type PaginaOportunidades,
  type PreguntaAsk,
  type ProductoCatalogo,
  type ReporteMio,
  type ReportePublico,
  type RespuestaAsk,
  type SubnodoNodo,
  type TransicionReporte,
  type VistaA1,
} from '../../lib/artefactoA1';

const ETIQUETA_ESTADO: Record<string, string> = {
  en_main: 'en main',
  en_rama: 'en rama (PR en cola)',
  propuesto: 'propuesto',
};

/* PIZ-R3 (#546, épica #543): rótulos humanos sobre rótulos crudos.
   Los valores (n1, dominio) y el confidence viven tal como los emite la
   API — A1 no los reescribe (R15), los PRESENTA con su significado y
   conserva el valor crudo entre paréntesis para trazabilidad. */
const ETIQUETA_N1: Record<NonNullable<PreguntaAsk['n1']>, string> = {
  productivo_rural: 'capital productivo rural',
  turistico: 'capital turística',
  patrimonial: 'capital patrimonial',
  civico_social: 'capital cívico social/ambiental',
};

const ETIQUETA_DOMINIO: Record<string, string> = {
  productivo_rural: 'productivo rural',
  turistico: 'turístico',
  patrimonial: 'patrimonial',
  territorial: 'estructura territorial y KPIs del nodo',
};

function etiquetaN1(valor: string): string {
  if (valor === '') return 'sin filtro';
  return ETIQUETA_N1[valor as NonNullable<PreguntaAsk['n1']>] ?? valor;
}

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof ErrorA1 ? e.message : e instanceof Error ? e.message : porDefecto;
}

/* ------------------------------------------------------------------ */
/* Formularios internos (estado local puro)                            */
/* ------------------------------------------------------------------ */

const RESPUESTAS_INICIALES: FichaRespuestasV1 = {
  usos_vitalidad: { usos_detectados: [], nivel_actividad: 'media' },
  accesibilidad: { rampa_acceso: 'desconocido', estado_vereda: 'desconocido', obstaculos: false },
  sombra_arbolado: { arbolado_presente: false, sombra_horario_central: 'desconocido' },
  agua_xerojardin: { riego: 'desconocido', perdidas_visibles: false, especies_apto_clima: 'desconocido' },
  seguridad_disenio: { iluminacion: 'desconocido', visibilidad: 'desconocido', mantenimiento: 'desconocido', destinos_activos_cercanos: false },
  equipamiento: { bancos: false, juegos_infantiles: false, canchas: false, basureros: false, bebedero: false },
  custodia: { custodia_presente: false, tipo_acuerdo: 'ninguno' },
};

const USOS_POSIBLES = ['recreo', 'deporte', 'reunion', 'descanso', 'feria', 'cultura', 'transito'] as const;

type CampoEquipamiento = 'bancos' | 'juegos_infantiles' | 'canchas' | 'basureros' | 'bebedero';

/* PIZ-R4 (#547, épica #543): el detalle de ficha muestra las 7 dimensiones
   del contrato con sus estados honestos. La lista de campos casta el
   universo del contrato ((v1|v1.1); un campo del contrato sin relevar se
   anuncia como tal, nunca desaparece (R15). */
const DIMENSIONES_FICHA: ReadonlyArray<{ clave: string; titulo: string; campos: readonly string[] }> = [
  { clave: 'usos_vitalidad', titulo: '1. Usos y vitalidad', campos: ['usos_detectados', 'nivel_actividad', 'observaciones'] },
  { clave: 'accesibilidad', titulo: '2. Accesibilidad', campos: ['rampa_acceso', 'estado_vereda', 'obstaculos'] },
  { clave: 'sombra_arbolado', titulo: '3. Sombra y arbolado', campos: ['arbolado_presente', 'sombra_horario_central', 'lectura_3_30_300'] },
  { clave: 'agua_xerojardin', titulo: '4. Agua y xerojardin', campos: ['riego', 'perdidas_visibles', 'especies_apto_clima'] },
  { clave: 'seguridad_disenio', titulo: '5. Seguridad de diseño', campos: ['iluminacion', 'visibilidad', 'mantenimiento', 'destinos_activos_cercanos'] },
  { clave: 'equipamiento', titulo: '6. Equipamiento', campos: ['bancos', 'juegos_infantiles', 'canchas', 'basureros', 'bebedero', 'otro'] },
  { clave: 'custodia', titulo: '7. Custodia', campos: ['custodia_presente', 'tipo_acuerdo'] },
];

const ETIQUETAS_CAMPO_FICHA: Record<string, string> = {
  usos_detectados: 'usos detectados',
  nivel_actividad: 'nivel de actividad',
  observaciones: 'observaciones',
  rampa_acceso: 'rampa de acceso',
  estado_vereda: 'estado de la vereda',
  obstaculos: 'obstáculos',
  arbolado_presente: 'arbolado presente',
  sombra_horario_central: 'sombra al mediodía',
  lectura_3_30_300: 'lectura 3-30-300 (texto con método)',
  riego: 'riego',
  perdidas_visibles: 'pérdidas de agua visibles',
  especies_apto_clima: 'especies aptas al clima',
  iluminacion: 'iluminación',
  visibilidad: 'visibilidad',
  mantenimiento: 'mantenimiento',
  destinos_activos_cercanos: 'destinos activos cercanos',
  bancos: 'bancos',
  juegos_infantiles: 'juegos infantiles',
  canchas: 'canchas',
  basureros: 'basureros',
  bebedero: 'bebedero',
  otro: 'otro',
  custodia_presente: 'custodia presente',
  tipo_acuerdo: 'tipo de acuerdo',
};

/* Presentación del valor relevado, R15: los strings de la API se muestran
   TAL CUAL (desconocido, no_sabe, buenos, …); los booleanos se leen sí|no;
   un array vacío o un texto vacío se declara [vacío declarado]. */
function valorFichaLegible(valor: unknown): string {
  if (Array.isArray(valor)) return valor.length > 0 ? valor.map(String).join(', ') : '[vacío declarado]';
  if (typeof valor === 'boolean') return valor ? 'sí' : 'no';
  if (valor === null || valor === undefined) return 'sin dato (no es un cero)';
  const s = String(valor).trim();
  return s === '' ? '[vacío declarado]' : s;
}


/** Detalle navegable (PROT-A1 R3, #420): historial/ficha/oportunidad abiertos. */
type DetalleA1 =
  | { tipo: 'historial' }
  | { tipo: 'ficha'; id: string }
  | { tipo: 'oportunidad'; id: string };

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export interface PropsA1 {
  /** Nodo del territorio (vocabulario real: capital | caucete | iglesia). */
  nodoKey?: 'capital' | 'caucete' | 'iglesia';
}

export function A1VecinoCiudadano({ nodoKey = 'capital' }: PropsA1) {
  const { estado, modo, refrescar } = useSesion();
  const caps: CapacidadesA1 = useMemo(() => capacidadesA1(estado), [estado]);

  const cliente = useMemo(
    () =>
      crearClienteA1({
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


  /* ---------- mini-router interno (PROT-A1 R3, #420): la vista ES el estado ---------- */

  const [vista, setVista] = useState<VistaA1>('inicio');
  const [detalle, setDetalle] = useState<DetalleA1 | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);

  const enfocarRegion = useCallback(() => {
    window.scrollTo(0, 0); // scroll-top al navegar (prototipo v0.5)
    regionRef.current?.focus();
  }, []);

  const irA = useCallback(
    (destino: VistaA1) => {
      setDetalle(null);
      setVista(destino);
      enfocarRegion();
    },
    [enfocarRegion]
  );

  const verDetalle = useCallback(
    (d: DetalleA1) => {
      setDetalle(d);
      enfocarRegion();
    },
    [enfocarRegion]
  );

  const volverDeDetalle = useCallback(() => {
    setDetalle(null);
    enfocarRegion();
  }, [enfocarRegion]);

  /* ---------- carga perezosa: cada sección declara SU estado ---------- */

  const [cargando, setCargando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
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

  const BotonCargar = ({ id, texto, alCargar }: { id: string; texto: string; alCargar: () => void }) => (
    <button type="button" onClick={alCargar} disabled={cargando === id}>
      {cargando === id ? 'cargando…' : texto}
    </button>
  );

  /* ---------- reportes (auto-carga: 2 req, dentro del techo) ---------- */

  const [categorias, setCategorias] = useState<CategoriaNodo[] | null>(null);
  const [reportes, setReportes] = useState<ReportePublico[] | null>(null);

  const cargarLecturaReportes = useCallback(() => {
    return conCarga('reportes', async () => {
      setAviso(null);
      const [cats, reps] = await Promise.allSettled([
        cliente.categorias(nodoKey),
        cliente.reportesPublicos(nodoKey),
      ]);
      // R5: cada error se muestra por su cuenta — jamás [] silencioso.
      if (cats.status === 'fulfilled') setCategorias(cats.value);
      else setError('categorías: ' + mensajeDe(cats.reason, 'no se pudieron cargar'));
      if (reps.status === 'fulfilled') setReportes(reps.value);
      else setError('reportes: ' + mensajeDe(reps.reason, 'no se pudieron cargar'));
    });
  }, [cliente, nodoKey, conCarga]);

  useEffect(() => {
    void cargarLecturaReportes();
  }, [cargarLecturaReportes]);

  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [exitoReporte, setExitoReporte] = useState<{
    id: string;
    idempotente: boolean;
    duplicados_sugeridos: DuplicadoSugerido[];
    duplicados_verificados: boolean;
  } | null>(null);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  /* PIZ-R6 (#549, épica #543): duplicados como corroboración (ADR-039).
     PRE-chequeo de LECTURA: compara el punto declarado contra los reportes
     públicos YA cargados (haversine local, misma regla del radio default
     100 m y tope de 5 de la API — presentación sobre lo ya cargado, MK-3c;
     la sugerencia AUTORITATIVA llega en la respuesta del alta vía PostGIS).
     El vecino elige: corrobora un reporte abierto (un reportante distinto
     = un peso, R15) o declara su hecho nuevo. «usar mi ubicación» rellena
     lat/lng SIN enviar nada por sí solo: geolocalización sensible,
     ADR-036 — punto público del hecho, NUNCA el domicilio. */
  const [sugeridosPrevios, setSugeridosPrevios] = useState<Array<DuplicadoSugerido & { distancia_m: number }> | null>(null);
  const [errorSugeridosPrevios, setErrorSugeridosPrevios] = useState<string | null>(null);
  const [corroborando, setCorroborando] = useState<string | null>(null);
  const [exitoCorroborar, setExitoCorroborar] = useState<{ id: string; peso: boolean; idempotente: boolean } | null>(null);
  const [errorCorroborar, setErrorCorroborar] = useState<string | null>(null);
  const [geoCargando, setGeoCargando] = useState(false);
  const [geoAviso, setGeoAviso] = useState<string | null>(null);

  const usarMiUbicacion = useCallback(() => {
    setGeoAviso(null);
    if (!caps.puedeEscribir) {
      setGeoAviso('la escritura exige sesión iniciada');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoAviso('este navegador no expone geolocalización — declará el punto a mano (lat/lng)');
      return;
    }
    setGeoCargando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoCargando(false);
        setGeoAviso(
          'punto tomado del navegador (precisión ≈ ' + Math.round(pos.coords.accuracy) + ' m): ajustalo al LUGAR público del hecho — el punto que enviás es del hecho observable, jamás tu domicilio; nada se envió todavía.'
        );
      },
      (err) => {
        setGeoCargando(false);
        setGeoAviso('geolocalización no disponible (' + err.message + '): declará el punto a mano — las coordenadas siguen siendo obligatorias.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [caps.puedeEscribir]);

  const buscarDuplicadosPrevios = useCallback(() => {
    setErrorSugeridosPrevios(null);
    setExitoCorroborar(null);
    setErrorCorroborar(null);
    const latNum = Number(lat.trim());
    const lngNum = Number(lng.trim());
    if (lat.trim() === '' || lng.trim() === '' || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setErrorSugeridosPrevios('declará un punto (lat/lng) válido para buscar duplicados sugeridos');
      return;
    }
    const base = reportes ?? [];
    const candidatos = base
      .filter((r) => !r.is_synthetic && ESTADOS_ABIERTOS_REPORTE.includes(r.estado) && r.lat !== null && r.lng !== null)
      .map((r) => ({
        id: r.id,
        categoria: r.categoria,
        estado: r.estado,
        lat: r.lat as number,
        lng: r.lng as number,
        distancia_m: distanciaMetrosLatLon(latNum, lngNum, r.lat as number, r.lng as number),
        created_at: r.created_at,
      }));
    const sugeridos = candidatos
      .filter((s) => s.distancia_m <= RADIO_PRE_CHEQUEO_M)
      .sort((a, b) => a.distancia_m - b.distancia_m)
      .slice(0, 5);
    setSugeridosPrevios(sugeridos);
  }, [lat, lng, reportes]);

  const corroborarReporte = useCallback(
    (id: string) => {
      setErrorCorroborar(null);
      setExitoCorroborar(null);
      setCorroborando(id);
      void (async () => {
        try {
          const r = await cliente.corroborar(id);
          setExitoCorroborar({ id, peso: r.peso, idempotente: r.idempotente });
        } catch (err) {
          setErrorCorroborar(mensajeDe(err, 'no se pudo corroborar'));
        } finally {
          setCorroborando(null);
        }
      })();
    },
    [cliente]
  );

  const enviarReporte = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorReporte(null);
      if (!caps.puedeEscribir) {
        setErrorReporte('la escritura ciudadana exige sesión iniciada — honestidad, no fricción');
        return;
      }
      if (categoria === '' || descripcion.trim() === '' || lat.trim() === '' || lng.trim() === '') {
        // lat/lng EXIGIDOS (ReporteAltaSchema): sin punto no hay reporte cartografiable.
        setErrorReporte('categoría, descripción y punto (lat/lng) son obligatorios — un reporte sin punto no es cartografiable');
        return;
      }
      setEnviandoReporte(true);
      try {
        const respuesta = await cliente.crearReporte({
          nodo_key: nodoKey,
          categoria,
          descripcion: descripcion.trim(),
          lat: Number(lat),
          lng: Number(lng),
        });
        setExitoReporte({
          id: respuesta.reporte.id,
          idempotente: respuesta.idempotente,
          duplicados_sugeridos: respuesta.duplicados_sugeridos,
          duplicados_verificados: respuesta.duplicados_verificados,
        });
        setDescripcion('');
        setSugeridosPrevios([]); // ya se creó el reporte: el pre-chequeo pierde sentido
        void cargarLecturaReportes();
      } catch (err) {
        setErrorReporte(mensajeDe(err, 'no se pudo enviar el reporte'));
      } finally {
        setEnviandoReporte(false);
      }
    },
    [caps.puedeEscribir, categoria, cliente, descripcion, lat, lng, nodoKey, cargarLecturaReportes]
  );

  const [mios, setMios] = useState<ReporteMio[] | null>(null);
  const [errorMios, setErrorMios] = useState<string | null>(null);

  const cargarMios = useCallback(() => {
    return conCarga('mios', async () => {
      setErrorMios(null);
      setMios(await cliente.mios());
    });
  }, [cliente, conCarga]);

  const [historial, setHistorial] = useState<{ id: string; transiciones: TransicionReporte[] } | null>(null);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);
  const verHistorial = useCallback(
    (id: string) => {
      return conCarga('historial-' + id, async () => {
        setErrorHistorial(null);
        setHistorial({ id, transiciones: await cliente.historial(id) });
      });
    },
    [cliente, conCarga]
  );

  /* ---------- mapa y territorio ---------- */

  const [features, setFeatures] = useState<FeatureNodo[] | null>(null);
  const [subnodos, setSubnodos] = useState<SubnodoNodo[] | null>(null);

  const cargarTerritorio = useCallback(() => {
    return conCarga('territorio', async () => {
      const [feats, subs] = await Promise.allSettled([cliente.features(nodoKey), cliente.subnodos(nodoKey)]);
      if (feats.status === 'fulfilled') setFeatures(feats.value);
      else setError('features: ' + mensajeDe(feats.reason, 'no se pudieron cargar'));
      if (subs.status === 'fulfilled') setSubnodos(subs.value);
      else setError('subnodos: ' + mensajeDe(subs.reason, 'no se pudieron cargar'));
    });
  }, [cliente, nodoKey, conCarga]);

  /* ---------- fichas de valoración ---------- */

  const [fichas, setFichas] = useState<FichaPublica[] | null>(null);
  const [espacios, setEspacios] = useState<FeatureNodo[] | null>(null);

  const cargarFichas = useCallback(() => {
    return conCarga('fichas', async () => {
      const [fics, feats] = await Promise.allSettled([cliente.fichas({ nodo: nodoKey }), cliente.features(nodoKey)]);
      if (fics.status === 'fulfilled') setFichas(fics.value);
      else setError('fichas: ' + mensajeDe(fics.reason, 'no se pudieron cargar'));
      if (feats.status === 'fulfilled') {
        // La ficha se ancla SOLO a features de la capa public_space (#149).
        setEspacios(feats.value.filter((f) => f.layer === 'public_space'));
      }
    });
  }, [cliente, nodoKey, conCarga]);

  // PIZ-R4 #547 (criterio 2): la lista de fichas y espacios se carga AL
  // ABRIR la vista, no tras un clic extra. Un solo intento automático por
  // montaje: si falla, queda el botón como reintento honesto (R5/R15).
  const fichasIntentadas = useRef(false);
  useEffect(() => {
    if (vista === 'fichas' && fichas === null && !fichasIntentadas.current) {
      fichasIntentadas.current = true;
      void cargarFichas();
    }
  }, [vista, fichas, cargarFichas]);

  const [fichaFeature, setFichaFeature] = useState('');
  const [respuestas, setRespuestas] = useState<FichaRespuestasV1>(RESPUESTAS_INICIALES);
  const [exitoFicha, setExitoFicha] = useState<{ id: string; idempotente: boolean } | null>(null);
  const [errorFicha, setErrorFicha] = useState<string | null>(null);
  const [enviandoFicha, setEnviandoFicha] = useState(false);

  const enviarFicha = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorFicha(null);
      if (!caps.puedeEscribir) {
        setErrorFicha('la ficha de valoración exige sesión iniciada');
        return;
      }
      if (fichaFeature === '') {
        setErrorFicha('elegí el espacio público a valorar — la ficha se ancla al espacio, no inventa geometría');
        return;
      }
      if (respuestas.usos_vitalidad.usos_detectados.length === 0) {
        setErrorFicha('detectá al menos un uso del espacio (7 dimensiones, mínimo 1 uso)');
        return;
      }
      setEnviandoFicha(true);
      try {
        const { ficha, idempotente } = await cliente.crearFicha({
          nodo_key: nodoKey,
          feature_id: fichaFeature,
          version: 'v1.1', // PIZ-R4 #547: el instrumento v1.1 registra el no_sabe declarado (R15)
          respuestas,
        });
        setExitoFicha({ id: ficha.id, idempotente });
        setRespuestas(RESPUESTAS_INICIALES);
        /* PIZ-R9 (#552): 0 consultas al enviar — la ficha creada entra a la
           lista ya cargada (lo más reciente al tope); la recarga completa
           (fichas + features: 2 consultas extra al techo del rol) ya no
           corre. idempotente (HTTP 200): la ficha ya estaba en la lista —
           no se duplica (key de React). Si la lista nunca se cargó, no hay
           nada donde insertar: queda el mensaje de éxito declarado (R5). */
        if (!idempotente) {
          setFichas((fs) => (fs === null ? fs : [ficha, ...fs]));
        }
      } catch (err) {
        setErrorFicha(mensajeDe(err, 'no se pudo enviar la ficha'));
      } finally {
        setEnviandoFicha(false);
      }
    },
    [caps.puedeEscribir, cliente, fichaFeature, nodoKey, respuestas]
  );

  /* ---------- Banco de Potencialidades (Bloque 9) ---------- */

  /* PIZ-R5 (#548, épica #543): el Banco PAGINA — API default 20 (limit
     1-100 / offset ≥ 0, EV-076) con total del servidor. Lo que no entró
     en la página se declara y se pagina: nada se asume completo. */
  const [paginaOp, setPaginaOp] = useState<PaginaOportunidades | null>(null);
  const [offsetOp, setOffsetOp] = useState(0);

  const cargarOportunidades = useCallback((desde = 0) => {
    return conCarga('oportunidades', async () => {
      setPaginaOp(await cliente.oportunidadesPagina({ nodo: nodoKey, offset: desde }));
      setOffsetOp(desde);
    });
  }, [cliente, nodoKey, conCarga]);

  /* Detalle por id (GET /api/oportunidades/:id, PIZ-R5): evidencia, etapa
     y etiquetas tal como la API las devuelve — el A1 presenta, no
     reescribe (R15). Sin eco del id en el 404 (ADR-036/R15). */
  const [detalleOp, setDetalleOp] = useState<Oportunidad | null>(null);
  const [errorDetalleOp, setErrorDetalleOp] = useState<string | null>(null);
  const [cargandoDetalleOp, setCargandoDetalleOp] = useState(false);

  const abrirDetalleOp = useCallback(
    (id: string) => {
      verDetalle({ tipo: 'oportunidad', id });
      setDetalleOp(null);
      setErrorDetalleOp(null);
      setCargandoDetalleOp(true);
      void (async () => {
        try {
          setDetalleOp(await cliente.oportunidadDetalle(id));
        } catch (err) {
          setErrorDetalleOp(mensajeDe(err, 'no se pudo cargar el detalle'));
        } finally {
          setCargandoDetalleOp(false);
        }
      })();
    },
    [cliente, verDetalle]
  );

  const [opTipo, setOpTipo] = useState('human_capacity');
  const [opTitulo, setOpTitulo] = useState('');
  const [opDescripcion, setOpDescripcion] = useState('');
  const [opEvidenciaTipo, setOpEvidenciaTipo] = useState('community_input');
  const [opEvidenciaDesc, setOpEvidenciaDesc] = useState('');
  const [opTags, setOpTags] = useState('');
  const [opActorNombre, setOpActorNombre] = useState('');
  const [opActorConsent, setOpActorConsent] = useState(false); // ADR-027: nunca pre-marcado
  const [exitoOp, setExitoOp] = useState<{ id: string; idempotente: boolean } | null>(null);
  const [errorOp, setErrorOp] = useState<string | null>(null);
  const [enviandoOp, setEnviandoOp] = useState(false);

  const enviarOportunidad = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorOp(null);
      if (!caps.puedeEscribir) {
        setErrorOp('la postulación exige sesión iniciada');
        return;
      }
      if (opEvidenciaDesc.trim() === '') {
        setErrorOp('sin evidencia no hay oportunidad, solo una señal (Bloque 9) — describí la evidencia');
        return;
      }
      const actor = opActorNombre.trim() === ''
        ? undefined
        : { role: 'partner' as const, name: opActorNombre.trim(), consent_confirmed: opActorConsent };
      const problemaActor = actor !== undefined ? validarActorA1(actor) : null;
      if (problemaActor !== null) {
        setErrorOp(problemaActor);
        return;
      }
      setEnviandoOp(true);
      try {
        const { oportunidad, idempotente } = await cliente.postularOportunidad({
          tipo: opTipo as (typeof TIPOS_OPORTUNIDAD)[number]['valor'],
          titulo: opTitulo.trim(),
          descripcion: opDescripcion.trim(),
          nodo_key: nodoKey,
          evidencia: {
            evidence_type: opEvidenciaTipo as (typeof TIPOS_EVIDENCIA)[number]['valor'],
            descripcion: opEvidenciaDesc.trim(),
          },
          ...(actor !== undefined ? { actores: [actor] } : {}),
          ...(opTags.trim() !== ''
            ? { tags: opTags.split(',').map((t) => t.trim()).filter((t) => t !== '').slice(0, 8) }
            : {}),
        });
        setExitoOp({ id: oportunidad.id, idempotente });
        setOpTitulo('');
        setOpDescripcion('');
        setOpEvidenciaDesc('');
        setOpActorNombre('');
        setOpActorConsent(false);
        setOpTags('');
        /* PIZ-R9 (#552): 0 consultas al enviar — en la primera página la
           oportunidad creada entra a la lista ya cargada (lo más reciente
           al tope) con el total del servidor +1 si lo trajo (total null
           queda null, R15); en páginas posteriores (offset > 0) NO se
           toca: la oportunidad figura en la página 1 y la nota honesta lo
           declara — sin recarga completa (techo del rol). idempotente
           (HTTP 200): la oportunidad ya estaba en la lista — no se duplica. */
        if (!idempotente && paginaOp !== null && offsetOp === 0) {
          setPaginaOp((p) => {
            if (p === null) return p;
            const items = [oportunidad, ...p.items];
            return { items, count: items.length, total: p.total !== null ? p.total + 1 : null, offset: p.offset };
          });
        }
      } catch (err) {
        setErrorOp(mensajeDe(err, 'no se pudo postular la oportunidad'));
      } finally {
        setEnviandoOp(false);
      }
    },
    [caps.puedeEscribir, cliente, nodoKey, opTipo, opTitulo, opDescripcion, opEvidenciaTipo, opEvidenciaDesc, opActorNombre, opActorConsent, opTags, paginaOp, offsetOp]
  );

  /* ---------- directorio y producción ---------- */

  const [activos, setActivos] = useState<ActivoDirectorio[] | null>(null);
  const [productos, setProductos] = useState<ProductoCatalogo[] | null>(null);
  const [operativaTexto, setOperativaTexto] = useState<string | null>(null);
  const [errorDirectorio, setErrorDirectorio] = useState<string | null>(null);

  // PIZ-R2 (#545): el directorio LISTA (GET /api/activos, lectura anónima)
  // — nunca pide el id a mano. Una consulta a la API con nodo+estado;
  // el facetado es presentación sobre lo ya cargado (patrón MK-3c).
  const cargarDirectorio = useCallback(() => {
    return conCarga('directorio', async () => {
      setErrorDirectorio(null);
      setProductos(null);
      setOperativaTexto(null);
      setActivos(await cliente.listarActivos({ nodo: nodoKey, estado: 'aprobado' }));
    });
  }, [cliente, nodoKey, conCarga]);

  // Detalle del activo elegido del listado (productos + operativa).
  // ADR-036: restricted responde 404 SIN ECO — el mensaje jamás repite
  // el id del activo consultado.
  const consultarActivo = useCallback((id: string) => {
    return conCarga('directorio', async () => {
      setErrorDirectorio(null);
      const [prods, oper] = await Promise.allSettled([cliente.productos(id), cliente.operativa(id)]);
      if (prods.status === 'fulfilled') setProductos(prods.value);
      else setErrorDirectorio('productos: ' + mensajeDe(prods.reason, 'no se pudieron cargar'));
      if (oper.status === 'fulfilled') {
        const o = oper.value;
        setOperativaTexto(
          'horario: ' + (o.horario ?? 'sin dato') +
          ' · temporada: ' + (o.temporada_meses.length > 0 ? o.temporada_meses.join('/') : 'sin dato') +
          ' · capacidad: ' + o.capacity_status +
          (o.capacidad_plazas !== null ? ' (' + o.capacidad_plazas + ' plazas)' : '') +
          ' · seguridad: ' + (o.seguridad ?? 'sin dato')
        );
      } else {
        setErrorDirectorio('operativa: ' + mensajeDe(oper.reason, 'no se pudo cargar'));
      }
    });
  }, [cliente, conCarga]);

  // Facetado por tipo: cuenta y filtrado son presentación sobre la página
  // ya cargada (patrón MK-3c) — NO dispara otra consulta a la API.
  const [tipoFaceta, setTipoFaceta] = useState('');

  const conteoTipos = useMemo(() => {
    const conteos = new Map<string, number>();
    for (const a of activos ?? []) {
      conteos.set(a.tipo, (conteos.get(a.tipo) ?? 0) + 1);
    }
    return [...conteos.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, [activos]);

  /* ---------- Observatorio del nodo (PIZ-R1 #544: LIC-01/LIC-02, épica #543) ---------- */

  const [observatorio, setObservatorio] = useState<ObservatorioNodo | null>(null);

  const cargarObservatorio = useCallback(() => {
    return conCarga('observatorio', async () => {
      setObservatorio(await cliente.observatorio(nodoKey));
    });
  }, [cliente, nodoKey, conCarga]);

  /* ---------- asistente territorial (VIG-006) ---------- */

  const [pregunta, setPregunta] = useState('');
  const [filtroN1, setFiltroN1] = useState('');
  const [respuestaAsk, setRespuestaAsk] = useState<RespuestaAsk | null>(null);
  const [errorAsk, setErrorAsk] = useState<string | null>(null);

  // PIZ-R3 (#546, épica #543): el filtro n1 de la API SIEMPRE existió —
  // hoy el A1 lo envía (AskPreguntaSchema: productivo_rural | turistico |
  // patrimonial | civico_social; vacío = sin filtro, como la pizarra pide).
  const preguntar = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      return conCarga('ask', async () => {
        setErrorAsk(null);
        setRespuestaAsk(
          await cliente.ask(nodoKey, {
            pregunta: pregunta.trim(),
            ...(filtroN1 !== '' ? { n1: filtroN1 as PreguntaAsk['n1'] } : {}),
          })
        );
      });
    },
    [cliente, nodoKey, pregunta, filtroN1, conCarga]
  );

  const conFuenteAsk = useMemo(() => {
    const dato = respuestaAsk?.dato ?? [];
    return dato.filter((f) => f.fuentes.length > 0).length;
  }, [respuestaAsk]);

  /* ---------- render ---------- */

  return (
    <section aria-labelledby="a1-titulo" className="artefacto-a1">
      <header>
        <h2 id="a1-titulo">Artefacto A1 — Vecino, ciudadano y visitante · nodo «{nodoKey}»</h2>
        <p>
          {caps.esVisitante ? 'Visitante' : 'Con sesión'} · techo {caps.techoReqsMin} req/min ·{' '}
          {caps.esDemo
            ? 'modo demo: los cambios no se acreditan'
            : modo === 'jwt'
              ? 'origen: API real'
              : 'origen: API sintética'}
          {caps.rol !== null ? ' · rol: ' + caps.rol : ''}
        </p>
        {aviso !== null && <p>{aviso}</p>}
      </header>

      {/* PROT-A1 R3 (#420, épica #418): navegación por vistas — la vista ES el estado.
          WCAG 2.2: botones >=24px (SC 2.5.8), aria-current en la activa (SC 2.4.8),
          indicador role=status (SC 4.1.3) y foco a la región al navegar (patrón MK-3c). */}
      <nav aria-label="vistas del artefacto A1">
        <ul>
          {VISTAS_A1.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => irA(v.id)}
                aria-current={vista === v.id ? 'page' : undefined}
                style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}
              >
                {v.titulo}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p role="status" aria-live="polite">
        vista: {VISTAS_A1.find((v) => v.id === vista)?.titulo ?? vista}
        {detalle !== null ? ' · detalle abierto' : ''}
      </p>

      <div ref={regionRef} tabIndex={-1} role="region" aria-label="contenido de la vista activa">
        {detalle === null ? (
          <>
        {vista === 'inicio' && (
          <div>
            <h3>Inicio — qué puedo hacer acá</h3>
            <ul>
              {VISTAS_A1.filter((v) => v.id !== 'inicio').map((v) => (
                <li key={v.id}>
                  <strong>{v.titulo}</strong> — {v.descripcion}
                  {v.escritura ? ' · escritura: exige sesión iniciada' : ''}
                </li>
              ))}
            </ul>
            <p>
              techo real {caps.techoReqsMin} req/min — la carga es perezosa por vista: navegar
              no gasta lecturas, cargar datos sí (diseño honesto del visitante).
            </p>
          </div>
        )}
        {vista === 'estado' && (
        <>
      <h3>Componentes y estado honesto</h3>
      <ul>
        {COMPONENTES_A1.map((c) => {
          const permiso = permisoVisible(c.id, caps);
          return (
            <li key={c.id}>
              <strong>{c.titulo}</strong> — {ETIQUETA_ESTADO[c.estado] ?? c.estado} ·{' '}
              {permiso === null ? 'sin acceso' : permiso === 'leer' ? 'lectura' : 'escritura'} ·{' '}
              <span>{c.detalle}</span>
            </li>
          );
        })}
      </ul>

        </>
      )}
      {vista === 'reportes' && (
        <>
      <h3>Reportes del nodo (lectura pública)</h3>
      {error !== null && <p role="alert" aria-live="polite">{error}</p>}
      {reportes === null && cargando === 'reportes' && <p role="status" aria-live="polite">cargando…</p>}
      {categorias !== null && categorias.length === 0 && (
        <p>el nodo aún no publica categorías en su vocabulario (count 0 honesto)</p>
      )}
      {reportes !== null && reportes.length === 0 && (
        <p>sin reportes públicos aún — el silencio también es un dato honesto</p>
      )}
      {reportes !== null && reportes.length > 0 && (
        <ul>
          {reportes.map((r) => (
            <li key={r.id}>
              <strong>{r.categoria}</strong> · estado: {r.estado}
              {r.is_synthetic ? ' · SINTÉTICO' : ''} · {r.descripcion}{' '}
              <button type="button" onClick={() => { void verHistorial(r.id); verDetalle({ tipo: 'historial' }); }} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>ver historial</button>
            </li>
          ))}
        </ul>
      )}
      <h3>Reportar un hecho observable</h3>
      {!caps.puedeEscribir && (
        <p role="note">
          {caps.esDemo
            ? 'demo SINTÉTICO: en este modo el reporte no se acredita — iniciá la plataforma con la API real para escribir.'
            : 'la escritura ciudadana exige sesión iniciada: todo reporte nace «received» con pseudónimo (sin PII).'}
        </p>
      )}
      <form onSubmit={enviarReporte}>
        <label>
          categoría
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={!caps.puedeEscribir}>
            <option value="">elegí del vocabulario del nodo…</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </label>
        <br />
        <label>
          descripción (sin datos personales — Ley 25.326)
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={!caps.puedeEscribir} rows={3} placeholder="qué se observa, dónde, desde cuándo…" />
        </label>
        <br />
        <label>
          lat (EXIGIDA — sin punto no hay reporte)
          <input value={lat} onChange={(e) => setLat(e.target.value)} disabled={!caps.puedeEscribir} inputMode="decimal" placeholder="-31.5379" />
        </label>{' '}
        <label>
          lng (EXIGIDA)
          <input value={lng} onChange={(e) => setLng(e.target.value)} disabled={!caps.puedeEscribir} inputMode="decimal" placeholder="-68.5374" />
        </label>{' '}
        <button type="button" onClick={usarMiUbicacion} disabled={!caps.puedeEscribir || geoCargando} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>
          {geoCargando ? 'buscando punto…' : 'usar mi ubicación'}
        </button>
        <br />
        <small>
          geolocalización sensible: el punto que enviás es el del hecho observable en un LUGAR público —
          nunca tu domicilio. El botón solo rellena los campos: no envía nada. Sin permiso, se avisa y se declara a mano.
        </small>
        {geoAviso !== null && <p><small>{geoAviso}</small></p>}
        <br />
        <button type="button" onClick={buscarDuplicadosPrevios} disabled={enviandoReporte} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>
          chequear duplicados sugeridos antes de confirmar
        </button>{' '}
        <small>corroborar no es duplicar: la decisión es tuya, nada se fusiona</small>
        {errorSugeridosPrevios !== null && <p role="alert" aria-live="polite">{errorSugeridosPrevios}</p>}
        {sugeridosPrevios !== null &&
          (sugeridosPrevios.length === 0 ? (
            <p>sin reportes abiertos públicos dentro de {RADIO_PRE_CHEQUEO_M} m en la bandeja ya cargada (pre-chequeo local — la sugerencia autoritativa llega con la respuesta del alta)</p>
          ) : (
            <ul>
              {sugeridosPrevios.map((s) => (
                <li key={s.id}>
                  <strong>{s.categoria}</strong> · estado: {s.estado} · a {Math.round(s.distancia_m)} m del punto declarado{' '}
                  <button type="button" onClick={() => corroborarReporte(s.id)} disabled={!caps.puedeEscribir || corroborando !== null} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>
                    {corroborando === s.id ? 'corroborando…' : 'corroboro este (no duplico)'}
                  </button>
                </li>
              ))}
            </ul>
          ))}
        {exitoCorroborar !== null && (
          <p role="status" aria-live="polite">
            corroboración registrada ({exitoCorroborar.id}):{' '}
            {exitoCorroborar.peso
              ? 'tu peso quedó sellado — cada reportante aporta un peso'
              : 'sin peso nuevo'}
            {exitoCorroborar.idempotente ? ' · ya habías corroborado este reporte (idempotente)' : ''}
          </p>
        )}
        {errorCorroborar !== null && <p role="alert" aria-live="polite">{errorCorroborar}</p>}
        <br />
        <button type="submit" disabled={!caps.puedeEscribir || enviandoReporte}>
          {enviandoReporte ? 'enviando…' : 'enviar reporte'}
        </button>
      </form>
      {exitoReporte !== null && (
        <p>
          reporte {exitoReporte.id} recibido — nace «received»:{' '}
          {exitoReporte.idempotente
            ? 'ya lo habías enviado (idempotente, sin duplicar).'
            : 'la moderación comunitaria decidirá su ciclo con justificación pública.'}
        </p>
      )}
      {exitoReporte !== null && !exitoReporte.duplicados_verificados && (
        <p>
          el servidor NO pudo verificar la búsqueda de duplicados: no se declara «sin duplicados»; la moderación los revisará.
        </p>
      )}
      {exitoReporte !== null && exitoReporte.duplicados_verificados && exitoReporte.duplicados_sugeridos.length === 0 && (
        <p>búsqueda de duplicados verificada por la API: sin reportes abiertos públicos cercanos al punto declarado</p>
      )}
      {exitoReporte !== null && exitoReporte.duplicados_verificados && exitoReporte.duplicados_sugeridos.length > 0 && (
        <div>
          <p role="status" aria-live="polite">duplicados sugeridos (solo sugerencia de lectura: nada se fusiona; corroborar no es duplicar):</p>
          <ul>
            {exitoReporte.duplicados_sugeridos.map((s) => (
              <li key={s.id}>
                <strong>{s.categoria}</strong> · estado: {s.estado}
                {s.distancia_m !== null ? ' · a ' + Math.round(s.distancia_m) + ' m' : ''}{' '}
                <button type="button" onClick={() => corroborarReporte(s.id)} disabled={corroborando !== null} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>
                  {corroborando === s.id ? 'corroborando…' : 'corroboro este (no duplico)'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {errorReporte !== null && <p role="alert" aria-live="polite">{errorReporte}</p>}

      <h3>Mis reportes</h3>
      {!caps.puedeVerMios ? (
        <p>«mis reportes» es la suscripción del reportero: disponible con sesión iniciada.</p>
      ) : (
        <>
          <BotonCargar id="mios" texto="cargar mis reportes" alCargar={() => void cargarMios()} />
          {errorMios !== null && <p role="alert" aria-live="polite">{errorMios}</p>}
          {mios !== null && mios.length === 0 && <p>no enviaste reportes aún (count 0 honesto)</p>}
          {mios !== null && mios.length > 0 && (
            <ul>
              {mios.map((r) => (
                <li key={r.id}>
                  <strong>{r.categoria}</strong> · estado: {r.estado}
                  <ul>
                    {r.transiciones.map((t, i) => (
                      <li key={i}>
                        {t.estado_anterior} → {t.estado_nuevo}: «{t.justificacion}» (moderador {t.moderador_hash.slice(0, 8)}…)
                      </li>
                    ))}
                    {r.transiciones.length === 0 && <li>sin transiciones aún</li>}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

        </>
      )}
      {vista === 'territorio' && (
        <>
      <h3>Mapa y territorio (carga perezosa: 2 req)</h3>
      {features === null && subnodos === null && (
        <BotonCargar id="territorio" texto="cargar features y subnodos del nodo" alCargar={() => void cargarTerritorio()} />
      )}
      {subnodos !== null && (
        <p>
          subnodos: {subnodos.length === 0 ? '0 honesto' : subnodos.map((s) => s.key + ' (' + s.type + (s.boundary_status !== null ? ', ' + s.boundary_status : '') + ')').join(' · ')}
        </p>
      )}
      {features !== null && features.length === 0 && <p>el nodo no publica features aún (count 0 honesto)</p>}
      {features !== null && features.length > 0 && (
        <ul>
          {features.map((f) => (
            <li key={f.id}>
              <strong>{f.titulo}</strong> · {f.layer} · estado: {f.estado}
              {f.is_synthetic ? ' · SINTÉTICO' : ' · fuente: ' + f.fuente_label}
            </li>
          ))}
        </ul>
      )}

        </>
      )}
      {vista === 'fichas' && (
        <>
      <h3>Fichas de valoración de espacio público</h3>
      {fichas === null && (
        <BotonCargar id="fichas" texto="cargar fichas y espacios públicos" alCargar={() => void cargarFichas()} />
      )}
      {fichas !== null && fichas.length === 0 && (
        <p>sin fichas publicadas aún — cada testimonio comunitario nace «testimonio» y la moderación lo recorre</p>
      )}
      {fichas !== null && fichas.length > 0 && (
        <ul>
          {fichas.map((f) => (
            <li key={f.id}>
              {f.feature_titulo ?? 'espacio ' + f.feature_id} · {f.estado_publico}
              {f.corroboracion !== null ? ' (' + f.corroboracion + ')' : ''} · versión {f.version}{' '}
              <button type="button" onClick={() => verDetalle({ tipo: 'ficha', id: f.id })} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>ver detalle</button>
            </li>
          ))}
        </ul>
      )}
      <h4>Valorar un espacio (7 dimensiones, testimonio)</h4>
      {!caps.puedeEscribir && <p role="note">la ficha exige sesión iniciada — nace «testimonio», nunca corroborada por escribir.</p>}
      <form onSubmit={enviarFicha}>
        <label>
          espacio público (capa public_space)
          <select value={fichaFeature} onChange={(e) => setFichaFeature(e.target.value)} disabled={!caps.puedeEscribir}>
            <option value="">elegí el espacio…</option>
            {(espacios ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.titulo}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>usos y vitalidad (mínimo 1 uso)</legend>
          {USOS_POSIBLES.map((u) => (
            <label key={u}>
              <input
                type="checkbox"
                checked={respuestas.usos_vitalidad.usos_detectados.includes(u)}
                onChange={(e) =>
                  setRespuestas((r) => ({
                    ...r,
                    usos_vitalidad: {
                      ...r.usos_vitalidad,
                      usos_detectados: e.target.checked
                        ? [...r.usos_vitalidad.usos_detectados, u]
                        : r.usos_vitalidad.usos_detectados.filter((x) => x !== u),
                    },
                  }))
                }
                disabled={!caps.puedeEscribir}
              />{' '}
              {u}
            </label>
          ))}
          <br />
          <label>
            nivel de actividad
            <select
              value={respuestas.usos_vitalidad.nivel_actividad}
              onChange={(e) => setRespuestas((r) => ({ ...r, usos_vitalidad: { ...r.usos_vitalidad, nivel_actividad: e.target.value as FichaRespuestasV1['usos_vitalidad']['nivel_actividad'] } }))}
              disabled={!caps.puedeEscribir}
            >
              <option value="baja">baja</option>
              <option value="media">media</option>
              <option value="alta">alta</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>accesibilidad · sombra · agua · seguridad (observables del ESPACIO, nunca personas)</legend>
          <label>
            rampa de acceso
            <select value={respuestas.accesibilidad.rampa_acceso} onChange={(e) => setRespuestas((r) => ({ ...r, accesibilidad: { ...r.accesibilidad, rampa_acceso: e.target.value as FichaRespuestasV1['accesibilidad']['rampa_acceso'] } }))} disabled={!caps.puedeEscribir}>
              <option value="si">sí</option>
              <option value="parcial">parcial</option>
              <option value="no">no</option>
              <option value="desconocido">desconocido</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>{' '}
          <label>
            veredas
            <select value={respuestas.accesibilidad.estado_vereda} onChange={(e) => setRespuestas((r) => ({ ...r, accesibilidad: { ...r.accesibilidad, estado_vereda: e.target.value as FichaRespuestasV1['accesibilidad']['estado_vereda'] } }))} disabled={!caps.puedeEscribir}>
              <option value="bueno">bueno</option>
              <option value="regular">regular</option>
              <option value="malo">malo</option>
              <option value="desconocido">desconocido</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>{' '}
          <label>
            <input type="checkbox" checked={respuestas.accesibilidad.obstaculos} onChange={(e) => setRespuestas((r) => ({ ...r, accesibilidad: { ...r.accesibilidad, obstaculos: e.target.checked } }))} disabled={!caps.puedeEscribir} />{' '}
            obstáculos
          </label>
          <br />
          <label>
            arbolado presente
            <input type="checkbox" checked={respuestas.sombra_arbolado.arbolado_presente} onChange={(e) => setRespuestas((r) => ({ ...r, sombra_arbolado: { ...r.sombra_arbolado, arbolado_presente: e.target.checked } }))} disabled={!caps.puedeEscribir} />
          </label>{' '}
          <label>
            sombra al mediodía
            <select value={respuestas.sombra_arbolado.sombra_horario_central} onChange={(e) => setRespuestas((r) => ({ ...r, sombra_arbolado: { ...r.sombra_arbolado, sombra_horario_central: e.target.value as FichaRespuestasV1['sombra_arbolado']['sombra_horario_central'] } }))} disabled={!caps.puedeEscribir}>
              <option value="abundante">abundante</option>
              <option value="parcial">parcial</option>
              <option value="escasa">escasa</option>
              <option value="nula">nula</option>
              <option value="desconocido">desconocido</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>{' '}
          <label>
            riego
            <select value={respuestas.agua_xerojardin.riego} onChange={(e) => setRespuestas((r) => ({ ...r, agua_xerojardin: { ...r.agua_xerojardin, riego: e.target.value as FichaRespuestasV1['agua_xerojardin']['riego'] } }))} disabled={!caps.puedeEscribir}>
              <option value="si">sí</option>
              <option value="no">no</option>
              <option value="desconocido">desconocido</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>{' '}
          <label>
            <input type="checkbox" checked={respuestas.agua_xerojardin.perdidas_visibles} onChange={(e) => setRespuestas((r) => ({ ...r, agua_xerojardin: { ...r.agua_xerojardin, perdidas_visibles: e.target.checked } }))} disabled={!caps.puedeEscribir} />{' '}
            pérdidas de agua visibles
          </label>{' '}
<label>
            especies aptas al clima
            <select value={respuestas.agua_xerojardin.especies_apto_clima} onChange={(e) => setRespuestas((r) => ({ ...r, agua_xerojardin: { ...r.agua_xerojardin, especies_apto_clima: e.target.value as FichaRespuestasV1[('agua_xerojardin')]['especies_apto_clima'] } }))} disabled={!caps.puedeEscribir}>
              <option value="si">sí</option>
              <option value="no">no</option>
              <option value="desconocido">desconocido</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>{' '}
          <label>
            iluminación
            <select value={respuestas.seguridad_disenio.iluminacion} onChange={(e) => setRespuestas((r) => ({ ...r, seguridad_disenio: { ...r.seguridad_disenio, iluminacion: e.target.value as FichaRespuestasV1['seguridad_disenio']['iluminacion'] } }))} disabled={!caps.puedeEscribir}>
              <option value="buena">buena</option>
              <option value="regular">regular</option>
              <option value="mala">mala</option>
              <option value="desconocido">desconocido</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>{' '}
          <label>
            visibilidad
            <select value={respuestas.seguridad_disenio.visibilidad} onChange={(e) => setRespuestas((r) => ({ ...r, seguridad_disenio: { ...r.seguridad_disenio, visibilidad: e.target.value as FichaRespuestasV1['seguridad_disenio']['visibilidad'] } }))} disabled={!caps.puedeEscribir}>
              <option value="buena">buena</option>
              <option value="regular">regular</option>
              <option value="mala">mala</option>
              <option value="desconocido">desconocido</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>{' '}
          <label>
            mantenimiento
            <select value={respuestas.seguridad_disenio.mantenimiento} onChange={(e) => setRespuestas((r) => ({ ...r, seguridad_disenio: { ...r.seguridad_disenio, mantenimiento: e.target.value as FichaRespuestasV1['seguridad_disenio']['mantenimiento'] } }))} disabled={!caps.puedeEscribir}>
              <option value="buena">buena</option>
              <option value="regular">regular</option>
              <option value="mala">mala</option>
              <option value="desconocido">desconocido</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>{' '}
          <label>
            <input type="checkbox" checked={respuestas.seguridad_disenio.destinos_activos_cercanos} onChange={(e) => setRespuestas((r) => ({ ...r, seguridad_disenio: { ...r.seguridad_disenio, destinos_activos_cercanos: e.target.checked } }))} disabled={!caps.puedeEscribir} />{' '}
            destinos activos cercanos
          </label>
        </fieldset>
        <fieldset>
          <legend>equipamiento</legend>
          {(['bancos', 'juegos_infantiles', 'canchas', 'basureros', 'bebedero'] as const).map((campo) => (
            <label key={campo}>
              <input
                type="checkbox"
                checked={respuestas.equipamiento[campo]}
                onChange={(e) =>
                  setRespuestas((r) => {
                    const equipamiento = { ...r.equipamiento };
                    equipamiento[campo as CampoEquipamiento] = e.target.checked;
                    return { ...r, equipamiento };
                  })
                }
                disabled={!caps.puedeEscribir}
              />{' '}
              {campo.replace('_', ' ')}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>custodia del espacio (anclada al espacio, sin nombres)</legend>
          <label>
            <input type="checkbox" checked={respuestas.custodia.custodia_presente} onChange={(e) => setRespuestas((r) => ({ ...r, custodia: { ...r.custodia, custodia_presente: e.target.checked } }))} disabled={!caps.puedeEscribir} />{" "}
            custodia presente
          </label>{' '}
          <label>
            tipo de acuerdo
            <select value={respuestas.custodia.tipo_acuerdo} onChange={(e) => setRespuestas((r) => ({ ...r, custodia: { ...r.custodia, tipo_acuerdo: e.target.value as FichaRespuestasV1['custodia']['tipo_acuerdo'] } }))} disabled={!caps.puedeEscribir}>
              <option value="vecinal">vecinal</option>
              <option value="escolar">escolar</option>
              <option value="club">club</option>
              <option value="otro">otro</option>
              <option value="ninguno">ninguno</option>
              <option value="no_sabe">No lo sé (no_sabe)</option>
            </select>
          </label>
        </fieldset>
        <br />
        <button type="submit" disabled={!caps.puedeEscribir || enviandoFicha}>
          {enviandoFicha ? 'enviando…' : 'enviar testimonio'}
        </button>
      </form>
      {exitoFicha !== null && (
        <p>
          ficha {exitoFicha.id} registrada — nace «testimonio»:{' '}
          {exitoFicha.idempotente ? 'ya la habías enviado (idempotente).' : 'la moderación la corroborará o descartará con justificación.'}
        </p>
      )}
      {errorFicha !== null && <p role="alert" aria-live="polite">{errorFicha}</p>}

        </>
      )}
      {vista === 'oportunidades' && (
        <>
      <h3>Banco de Potencialidades (Bloque 9)</h3>
      {paginaOp === null && (
        <BotonCargar id="oportunidades" texto="cargar oportunidades del nodo" alCargar={() => void cargarOportunidades()} />
      )}
      {paginaOp !== null && paginaOp.items.length === 0 && (
        <p>sin oportunidades publicadas aún — lo descartado nunca se publica</p>
      )}
      {paginaOp !== null && paginaOp.items.length > 0 && (
        <ul>
          {paginaOp.items.map((o) => (
            <li key={o.id}>
              <strong>{o.titulo}</strong> · {o.tipo} · etapa: {o.estado} · {o.descripcion}{' '}
              <button type="button" onClick={() => abrirDetalleOp(o.id)} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>ver detalle</button>
            </li>
          ))}
        </ul>
      )}
      {paginaOp !== null && (
        <p>
          <small>
            {'página del Banco: ' + paginaOp.items.length + ' en esta página · ' + (paginaOp.total !== null ? paginaOp.total + ' publicadas en total' : 'total: sin dato en la respuesta') + ' · offset: ' + paginaOp.offset}
          </small>
        </p>
      )}
      {paginaOp !== null && paginaOp.items.length > 0 && (
        <p>
          <button type="button" onClick={() => void cargarOportunidades(Math.max(0, offsetOp - 20))} disabled={offsetOp === 0} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>← anteriores 20</button>{' '}
          <button type="button" onClick={() => void cargarOportunidades(offsetOp + 20)} disabled={paginaOp.items.length < 20 || (paginaOp.total !== null && offsetOp + 20 >= paginaOp.total)} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>siguientes 20 →</button>
        </p>
      )}
      <h4>Postular una oportunidad (evidencia OBLIGATORIA)</h4>
      {!caps.puedeEscribir && <p role="note">la postulación exige sesión iniciada — nace «detected», nunca validada por autodeclaración.</p>}
      <form onSubmit={enviarOportunidad}>
        <label>
          tipo
          <select value={opTipo} onChange={(e) => setOpTipo(e.target.value)} disabled={!caps.puedeEscribir}>
            {TIPOS_OPORTUNIDAD.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.valor} — {t.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <br />
        <label>
          título
          <input value={opTitulo} onChange={(e) => setOpTitulo(e.target.value)} disabled={!caps.puedeEscribir} />
        </label>
        <br />
        <label>
          descripción
          <textarea value={opDescripcion} onChange={(e) => setOpDescripcion(e.target.value)} disabled={!caps.puedeEscribir} rows={2} />
        </label>
        <br />
        <label>
          evidencia (tipo)
          <select value={opEvidenciaTipo} onChange={(e) => setOpEvidenciaTipo(e.target.value)} disabled={!caps.puedeEscribir}>
            {TIPOS_EVIDENCIA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.valor} — {t.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <br />
        <label>
          evidencia (descripción — sin ella no hay oportunidad)
          <textarea value={opEvidenciaDesc} onChange={(e) => setOpEvidenciaDesc(e.target.value)} disabled={!caps.puedeEscribir} rows={2} />
        </label>
        <br />
        <label>
          tags (separados por coma, máx. 8)
          <input value={opTags} onChange={(e) => setOpTags(e.target.value)} disabled={!caps.puedeEscribir} />
        </label>
        <br />
        <label>
          actor (nombre OPCIONAL — solo si confirma consentimiento, nunca pre-marcado)
          <input value={opActorNombre} onChange={(e) => setOpActorNombre(e.target.value)} disabled={!caps.puedeEscribir} placeholder="vacío = sin actor nombrado" />
        </label>{' '}
        <label>
          <input type="checkbox" checked={opActorConsent} onChange={(e) => setOpActorConsent(e.target.checked)} disabled={!caps.puedeEscribir || opActorNombre.trim() === ''} />{' '}
          consentimiento confirmado (nunca pre-marcado)
        </label>
        <br />
        <button type="submit" disabled={!caps.puedeEscribir || enviandoOp}>
          {enviandoOp ? 'enviando…' : 'postular'}
        </button>
      </form>
      {exitoOp !== null && (
        <p>
          oportunidad {exitoOp.id} registrada — nace «detected»:{' '}
          {exitoOp.idempotente ? 'ya la habías postulado (idempotente).' : 'la moderación recorre su ciclo de vida (detected → … → implemented).'}
        </p>
      )}
      {exitoOp !== null && !exitoOp.idempotente && offsetOp !== 0 && (
        <p role="status" aria-live="polite">
          envío sin recarga (0 consultas): la oportunidad creada figura en la primera
          página del Banco (offset 0) — esta vista muestra la página {offsetOp}; «← anteriores 20»
          te acerca a ella. La lista NO se recargó al enviar (techo del rol).
        </p>
      )}
      {errorOp !== null && <p role="alert" aria-live="polite">{errorOp}</p>}

        </>
      )}
      {vista === 'directorio' && (
        <>
      <h3>Directorio y producción (lectura)</h3>
      <p>listado real de activos aprobados del nodo (lectura anónima); elegí uno para ver sus productos y operativa (solo lo aprobado y publicado; lo restringido no se publica).</p>
      {activos === null && (
        <BotonCargar id="directorio" texto="cargar directorio del nodo" alCargar={() => void cargarDirectorio()} />
      )}
      {errorDirectorio !== null && <p role="alert" aria-live="polite">{errorDirectorio}</p>}
      {activos !== null && activos.length === 0 && (
        <p>el nodo aún no publica activos aprobados (solo se publica lo verificado)</p>
      )}
      {conteoTipos.length > 0 && (
        <>
          <p><small>facetado por tipo — presentación sobre lo ya cargado: no vuelve a consultar la plataforma</small></p>
          <button type="button" aria-pressed={tipoFaceta === ''} onClick={() => setTipoFaceta('')} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>todos ({activos?.length ?? 0})</button>{' '}
          {conteoTipos.map(([tipo, n]) => (
            <button key={tipo} type="button" aria-pressed={tipoFaceta === tipo} onClick={() => setTipoFaceta(tipo)} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>{tipo} ({n})</button>
          ))}
        </>
      )}
      {activos !== null && activos.length > 0 && (
        <ul>
          {activos.filter((a) => tipoFaceta === '' || a.tipo === tipoFaceta).map((a) => (
            <li key={a.id}>
              <strong>{a.titulo}</strong> · {a.tipo}
              {a.subnodo_key !== null ? ' · ' + a.subnodo_key : ''}
              {a.is_synthetic ? ' ✦ demo declarada' : ''}
              <button type="button" onClick={() => void consultarActivo(a.id)} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>productos y operativa</button>
            </li>
          ))}
        </ul>
      )}
      {errorDirectorio !== null && <p role="alert" aria-live="polite">{errorDirectorio}</p>}
      {productos !== null && productos.length === 0 && <p>el activo no publica productos aún ([] declarado: solo se publica lo verificado)</p>}
      {productos !== null && productos.length > 0 && (
        <ul>
          {productos.map((p) => (
            <li key={p.id}>
              <strong>{p.nombre}</strong> · {p.estado}
              {p.temporada_meses.length > 0 ? ' · temporada: ' + p.temporada_meses.join('/') : ' · temporada: sin dato'}
            </li>
          ))}
        </ul>
      )}
      {operativaTexto !== null && <p>{operativaTexto}</p>}

        </>
      )}
      {vista === 'kpis' && (
        <>
      <h3>Observatorio del nodo (conteo con cobertura y fecha, jamás puntaje global)</h3>
      {observatorio === null && (
        <BotonCargar id="observatorio" texto="cargar observatorio del nodo" alCargar={() => void cargarObservatorio()} />
      )}
      {observatorio !== null && (
        <>
          {observatorio.kpis.total === 0 ? (
            <p>
              el nodo aún no tiene snapshots — no es un cero: el cálculo aún no corrió.
            </p>
          ) : (
            <p>
              {observatorio.kpis.total} KPIs con snapshot · fecha de corte:{' '}
              {observatorio.kpis.fecha_corte ?? 'sin fecha aún'}
            </p>
          )}
          <ul>
            {observatorio.kpis.snapshots.map((k) => (
              <li key={k.kpi_key}>
                <strong>{k.kpi_key}</strong> ={' '}
                {k.valor === null ? 'sin métrica computada (no es un cero)' : String(k.valor)}
                {Object.keys(k.detalles).length > 0
                  ? ' · ' + Object.entries(k.detalles).map(([clave, valor]) => clave + ': ' + valor).join(', ')
                  : ''}
              </li>
            ))}
          </ul>
          {observatorio.kpis.nota !== '' && <p><small>{observatorio.kpis.nota}</small></p>}
          <h4>Fichas metodológicas (fórmula + fuente + cobertura)</h4>
          <ul>
            {observatorio.fichas_metodologicas.map((f) => (
              <li key={f.clave}>
                <strong>{f.nombre}</strong> ({f.clave}) · fórmula: {f.formula} · fuente: {f.fuente} · cobertura: {f.cobertura}
              </li>
            ))}
          </ul>
          {observatorio.familias_sin_fuente_ingestada.length > 0 && (
            <>
              <h4>Familias del temario aún sin fuente (no es un cero)</h4>
              <ul>
                {observatorio.familias_sin_fuente_ingestada.map((f) => (
                  <li key={f.familia}>
                    <strong>{f.familia}</strong> · {f.estado} · valor: {f.valor === null ? 'null honesto' : String(f.valor)} · {f.cautela}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

        </>
      )}
      {vista === 'asistente' && (
        <>
      <h3>Asistente territorial (sin LLM — plantillas autorizadas)</h3>
      <form onSubmit={preguntar}>
        <label>
          pregunta (3–300 caracteres; solo contenido autorizado)
          <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} maxLength={300} />
        </label>{' '}
        <label>
          capital (N1) — acota la búsqueda a activos de esa capital
          <select value={filtroN1} onChange={(e) => setFiltroN1(e.target.value)}>
            <option value="">todas las capitales (sin filtro)</option>
            {(Object.entries(ETIQUETA_N1) as Array<[NonNullable<PreguntaAsk['n1']>, string]>).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>{' '}
        <button type="submit" disabled={cargando === 'ask'}>
          {cargando === 'ask' ? 'consultando…' : 'preguntar'}
        </button>
      </form>
      {filtroN1 !== '' && (
        <p><small>filtro aplicado: {etiquetaN1(filtroN1)} — la plataforma recupera solo fragmentos de activos con esa temática primaria (aprobados, sin lo restringido)</small></p>
      )}
      {errorAsk !== null && <p role="alert" aria-live="polite">{errorAsk}</p>}
      {respuestaAsk !== null && (
        <div>
          {respuestaAsk.recovered === 0 ? (
            <p>sin fragmentos recuperados: interpretación y sugerencia: sin dato aún — probá con otros términos.</p>
          ) : (
            <>
              <h4>
                Dato ({respuestaAsk.recovered} fragmento(s)
                {respuestaAsk.dominio !== null
                  ? ', dominio ' + (ETIQUETA_DOMINIO[respuestaAsk.dominio] ?? respuestaAsk.dominio)
                  : ''})
              </h4>
              <ul>
                {respuestaAsk.dato.map((f, i) => (
                  <li key={i}>
                    {f.texto}{' '}
                    <small>
                      (fuentes: {f.fuentes.map((x) => x.fuente + (x.fecha !== undefined ? ' ' + x.fecha : '')).join('; ')})
                    </small>
                  </li>
                ))}
              </ul>
              <p>
                <strong>Interpretación (plantilla autorizada):</strong>{' '}
                {respuestaAsk.interpretacion ?? 'null honesto'}
              </p>
              <p>
                <strong>Sugerencia (plantilla autorizada):</strong> {respuestaAsk.sugerencia ?? 'null honesto'}
              </p>
            </>
          )}
          <p>
            Cobertura de fuentes: {conFuenteAsk} de {respuestaAsk.recovered} fragmentos con fuente citada ·
            revisión humana: pendiente
            <small>
              {' '}(confianza del cálculo: {respuestaAsk.confidence}, derivado de la cobertura de fuentes · revisión humana: {respuestaAsk.human_review})
            </small>
          </p>
        </div>
      )}

        </>
      )}
          </>
        ) : (
          <>
            {detalle.tipo === 'historial' && (
              <div>
                <button type="button" onClick={volverDeDetalle} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>← volver a reportes</button>
                <h3>Historial público del reporte {historial !== null ? historial.id : '…'}</h3>
                {historial === null ? (
                  <p role="status" aria-live="polite">cargando historial…</p>
                ) : historial.transiciones.length === 0 ? (
                  <p>sin transiciones aún — nació recibido y nadie lo movió</p>
                ) : (
                  <ul>
                    {historial.transiciones.map((t, i) => (
                      <li key={i}>
                        {t.estado_anterior} → {t.estado_nuevo}: «{t.justificacion}» (moderador {t.moderador_hash.slice(0, 8)}…)
                      </li>
                    ))}
                  </ul>
                )}
                {errorHistorial !== null && <p role="alert" aria-live="polite">{errorHistorial}</p>}
              </div>
            )}
            {detalle.tipo === 'ficha' && (
              <div>
                <button type="button" onClick={volverDeDetalle} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>← volver a fichas</button>
                {(() => {
                  const f = (fichas ?? []).find((x) => x.id === detalle.id);
                  if (f === undefined) {
                    return <p>la ficha {detalle.id} no está en la lista cargada — volvé y cargá de nuevo.</p>;
                  }
                  return (
                    <div>
                      <h3>Ficha de {f.feature_titulo ?? 'espacio ' + f.feature_id}</h3>
                      <p>
                        id: {f.id} · estado público: {f.estado_publico}
                        {f.corroboracion !== null ? ' · corroboración: ' + f.corroboracion : ''} · versión {f.version}
                        {' '}· nodo {f.nodo_key} · relevada: {f.created_at} · autor pseudónimo: {f.created_by_hash.slice(0, 8)}…
                      </p>
                      <p><small>
                        Las 7 dimensiones se muestran tal como quedaron relevadas (valores tal como se relevan).
                        «no_sabe» = «No lo sé» declarado por quien relevó; «desconocido» = estado del espacio no observado;
                        un campo del contrato no relevado se anuncia como tal, nunca se maquilla.
                      </small></p>
                      {DIMENSIONES_FICHA.map((d) => {
                        const bloque = (f.respuestas as Record<string, unknown>)[d.clave];
                        const campos = (bloque !== null && bloque !== undefined && typeof bloque === 'object' ? bloque : {}) as Record<string, unknown>;
                        const presentes = d.campos.filter((c2) => campos[c2] !== undefined);
                        const ausentes = d.campos.filter((c2) => campos[c2] === undefined);
                        return (
                          <section key={d.clave}>
                            <h4>{d.titulo}</h4>
                            <ul>
                              {presentes.map((c2) => (
                                <li key={c2}>
                                  <strong>{ETIQUETAS_CAMPO_FICHA[c2] ?? c2}</strong>: {valorFichaLegible(campos[c2])}
                                </li>
                              ))}
                              {presentes.length === 0 && <li>sin campos relevados en esta dimensión</li>}
                            </ul>
                            {ausentes.length > 0 && (
                              <small>campos del contrato no relevados: {ausentes.map((c2) => ETIQUETAS_CAMPO_FICHA[c2] ?? c2).join(", ")}</small>
                            )}
                          </section>
                        );
                      })}
                      {typeof (f.respuestas as Record<string, unknown>).notas === 'string' && String((f.respuestas as Record<string, unknown>).notas).trim() !== '' && (
                        <p><strong>notas:</strong> {String((f.respuestas as Record<string, unknown>).notas)}</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {detalle.tipo === 'oportunidad' && (
              <div>
                <button type="button" onClick={volverDeDetalle} style={{ minHeight: 'var(--touch-target-min)', minWidth: 'var(--touch-target-min)' }}>← volver al Banco de Potencialidades</button>
                {cargandoDetalleOp && <p role="status" aria-live="polite">cargando detalle de la oportunidad…</p>}
                {errorDetalleOp !== null && <p role="alert" aria-live="polite">{errorDetalleOp}</p>}
                {detalleOp !== null && (
                  <div>
                    <h3>{detalleOp.titulo}</h3>
                    <p>tipo: {detalleOp.tipo} · etapa del ciclo de vida: {detalleOp.estado}</p>
                    <p>{detalleOp.descripcion}</p>
                    {/* PIZ-R5 (#548): evidencia, etapa y etiquetas tal como la
                        API las devuelve — el A1 presenta, no reescribe (R15). */}
                    {(() => {
                      const ev = (detalleOp.evidencia ?? {}) as Record<string, unknown>;
                      const evTipo = typeof ev.evidence_type === 'string' ? ev.evidence_type as string : '';
                      const evEtiqueta = TIPOS_EVIDENCIA.find((t) => t.valor === evTipo)?.etiqueta ?? evTipo;
                      const evDesc = typeof ev.descripcion === 'string' ? ev.descripcion as string : '';
                      const evUrl = typeof ev.reference_url === 'string' && (ev.reference_url as string) !== '' ? ev.reference_url as string : null;
                      const evEstado = typeof ev.validationStatus === 'string' ? ev.validationStatus as string : null;
                      return (
                        <div>
                          <p>
                            <strong>evidencia:</strong>{' '}
                            {evTipo === ''
                              ? 'sin evidencia declarada en la respuesta'
                              : evEtiqueta + " (crudo: " + evTipo + ") — " + (evDesc !== "" ? evDesc : "[vacío declarado]")}
                          </p>
                          {evUrl !== null && <p><small>referencia declarada de la evidencia: {evUrl}</small></p>}
                          {evEstado !== null && <p><small>validación de la evidencia (moderación): {evEstado} — el autor nunca auto-corrobora</small></p>}
                        </div>
                      );
                    })()}
                    <p>
                      <strong>etiquetas:</strong>{' '}
                      {detalleOp.tags.length > 0 ? detalleOp.tags.join(', ') : 'sin etiquetas declaradas'}
                    </p>
                    <p>
                      <strong>actores declarados:</strong>{' '}
                      {detalleOp.actores.length > 0
                        ? detalleOp.actores.length + ' (roles y consentimiento; los nombres no se repiten acá — Ley 25.326)'
                        : 'sin actores nombrados'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <h3>Sin conectar aún</h3>
      <ul>
        <li>observaciones patrimoniales — en cola, sin acreditar todavía: no se simula</li>
        <li>comercios (lectura) — aún sin conectar: no se simula</li>
      </ul>
    </section>
  );
}

export default A1VecinoCiudadano;

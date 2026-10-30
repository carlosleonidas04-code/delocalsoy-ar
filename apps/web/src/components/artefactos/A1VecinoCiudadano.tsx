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
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSesion } from './SesionProvider';
import { CLAVE_TOKEN_SESION } from '../../lib/sesion';
import {
  COMPONENTES_A1,
  capacidadesA1,
  permisoVisible,
  crearClienteA1,
  validarActorA1,
  TIPOS_OPORTUNIDAD,
  TIPOS_EVIDENCIA,
  ErrorA1,
  type CapacidadesA1,
  type CategoriaNodo,
  type FeatureNodo,
  type FichaPublica,
  type FichaRespuestasV1,
  type KpiSnapshot,
  type Oportunidad,
  type ProductoCatalogo,
  type ReporteMio,
  type ReportePublico,
  type RespuestaAsk,
  type SubnodoNodo,
  type TransicionReporte,
} from '../../lib/artefactoA1';

const ETIQUETA_ESTADO: Record<string, string> = {
  en_main: 'en main',
  en_rama: 'en rama (PR en cola)',
  propuesto: 'propuesto',
};

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
  const [exitoReporte, setExitoReporte] = useState<{ id: string; idempotente: boolean } | null>(null);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const [enviandoReporte, setEnviandoReporte] = useState(false);

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
        const { reporte, idempotente } = await cliente.crearReporte({
          nodo_key: nodoKey,
          categoria,
          descripcion: descripcion.trim(),
          lat: Number(lat),
          lng: Number(lng),
        });
        setExitoReporte({ id: reporte.id, idempotente });
        setDescripcion('');
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
          version: 'v1',
          respuestas,
        });
        setExitoFicha({ id: ficha.id, idempotente });
        setRespuestas(RESPUESTAS_INICIALES);
        void cargarFichas();
      } catch (err) {
        setErrorFicha(mensajeDe(err, 'no se pudo enviar la ficha'));
      } finally {
        setEnviandoFicha(false);
      }
    },
    [caps.puedeEscribir, cliente, fichaFeature, nodoKey, respuestas, cargarFichas]
  );

  /* ---------- Banco de Potencialidades (Bloque 9) ---------- */

  const [oportunidades, setOportunidades] = useState<Oportunidad[] | null>(null);

  const cargarOportunidades = useCallback(() => {
    return conCarga('oportunidades', async () => {
      setOportunidades(await cliente.oportunidades({ nodo: nodoKey }));
    });
  }, [cliente, nodoKey, conCarga]);

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
        void cargarOportunidades();
      } catch (err) {
        setErrorOp(mensajeDe(err, 'no se pudo postular la oportunidad'));
      } finally {
        setEnviandoOp(false);
      }
    },
    [caps.puedeEscribir, cliente, nodoKey, opTipo, opTitulo, opDescripcion, opEvidenciaTipo, opEvidenciaDesc, opActorNombre, opActorConsent, opTags, cargarOportunidades]
  );

  /* ---------- directorio y producción ---------- */

  const [productos, setProductos] = useState<ProductoCatalogo[] | null>(null);
  const [operativaTexto, setOperativaTexto] = useState<string | null>(null);
  const [activoConsulta, setActivoConsulta] = useState('');
  const [errorDirectorio, setErrorDirectorio] = useState<string | null>(null);

  const consultarActivo = useCallback(() => {
    return conCarga('directorio', async () => {
      setErrorDirectorio(null);
      const id = activoConsulta.trim();
      if (id === '') {
        setErrorDirectorio('escribí el id de un activo del catálogo (el montaje R5 provee el listado navegable)');
        return;
      }
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
  }, [activoConsulta, cliente, conCarga]);

  /* ---------- KPIs públicos ---------- */

  const [kpis, setKpis] = useState<KpiSnapshot[] | null>(null);

  const cargarKpis = useCallback(() => {
    return conCarga('kpis', async () => {
      setKpis(await cliente.kpis(nodoKey));
    });
  }, [cliente, nodoKey, conCarga]);

  /* ---------- asistente territorial (VIG-006) ---------- */

  const [pregunta, setPregunta] = useState('');
  const [respuestaAsk, setRespuestaAsk] = useState<RespuestaAsk | null>(null);
  const [errorAsk, setErrorAsk] = useState<string | null>(null);

  const preguntar = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      return conCarga('ask', async () => {
        setErrorAsk(null);
        setRespuestaAsk(await cliente.ask(nodoKey, { pregunta: pregunta.trim() }));
      });
    },
    [cliente, nodoKey, pregunta, conCarga]
  );

  /* ---------- render ---------- */

  return (
    <section aria-labelledby="a1-titulo" className="artefacto-a1">
      <header>
        <h2 id="a1-titulo">Artefacto A1 — Vecino, ciudadano y visitante · nodo «{nodoKey}»</h2>
        <p>
          {caps.esVisitante ? 'Visitante' : 'Con sesión'} · techo {caps.techoReqsMin} req/min ·{' '}
          {caps.esDemo
            ? 'modo SINTÉTICO: demo declarada — las escrituras no se acreditan (R15)'
            : modo === 'jwt'
              ? 'origen: API real'
              : 'origen: API sintética'}
          {caps.rol !== null ? ' · rol: ' + caps.rol : ''}
        </p>
        {aviso !== null && <p>{aviso}</p>}
      </header>

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

      <h3>Reportes del nodo (lectura pública)</h3>
      {error !== null && <p role="alert">{error}</p>}
      {reportes === null && cargando === 'reportes' && <p>cargando…</p>}
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
              <button type="button" onClick={() => void verHistorial(r.id)}>ver historial</button>
            </li>
          ))}
        </ul>
      )}
      {historial !== null && (
        <div>
          <h4>Historial público del reporte {historial.id}</h4>
          {historial.transiciones.length === 0 ? (
            <p>sin transiciones aún — nació recibido y nadie lo movió: honesto (R15)</p>
          ) : (
            <ul>
              {historial.transiciones.map((t, i) => (
                <li key={i}>
                  {t.estado_anterior} → {t.estado_nuevo}: «{t.justificacion}» (moderador {t.moderador_hash.slice(0, 8)}…)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {errorHistorial !== null && <p role="alert">{errorHistorial}</p>}

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
        </label>
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
      {errorReporte !== null && <p role="alert">{errorReporte}</p>}

      <h3>Mis reportes</h3>
      {!caps.puedeVerMios ? (
        <p>«mis reportes» es la suscripción del reportero: disponible con sesión iniciada.</p>
      ) : (
        <>
          <BotonCargar id="mios" texto="cargar mis reportes" alCargar={() => void cargarMios()} />
          {errorMios !== null && <p role="alert">{errorMios}</p>}
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
                    {r.transiciones.length === 0 && <li>sin transiciones aún — honesto (R15)</li>}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

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
              {f.corroboracion !== null ? ' (' + f.corroboracion + ')' : ''} · versión {f.version}
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
            </select>
          </label>{' '}
          <label>
            veredas
            <select value={respuestas.accesibilidad.estado_vereda} onChange={(e) => setRespuestas((r) => ({ ...r, accesibilidad: { ...r.accesibilidad, estado_vereda: e.target.value as FichaRespuestasV1['accesibilidad']['estado_vereda'] } }))} disabled={!caps.puedeEscribir}>
              <option value="bueno">bueno</option>
              <option value="regular">regular</option>
              <option value="malo">malo</option>
              <option value="desconocido">desconocido</option>
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
            </select>
          </label>{' '}
          <label>
            riego
            <select value={respuestas.agua_xerojardin.riego} onChange={(e) => setRespuestas((r) => ({ ...r, agua_xerojardin: { ...r.agua_xerojardin, riego: e.target.value as FichaRespuestasV1['agua_xerojardin']['riego'] } }))} disabled={!caps.puedeEscribir}>
              <option value="si">sí</option>
              <option value="no">no</option>
              <option value="desconocido">desconocido</option>
            </select>
          </label>{' '}
          <label>
            <input type="checkbox" checked={respuestas.agua_xerojardin.perdidas_visibles} onChange={(e) => setRespuestas((r) => ({ ...r, agua_xerojardin: { ...r.agua_xerojardin, perdidas_visibles: e.target.checked } }))} disabled={!caps.puedeEscribir} />{' '}
            pérdidas de agua visibles
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
      {errorFicha !== null && <p role="alert">{errorFicha}</p>}

      <h3>Banco de Potencialidades (Bloque 9)</h3>
      {oportunidades === null && (
        <BotonCargar id="oportunidades" texto="cargar oportunidades del nodo" alCargar={() => void cargarOportunidades()} />
      )}
      {oportunidades !== null && oportunidades.length === 0 && (
        <p>sin oportunidades publicadas aún — «discarded» nunca se publica (R15)</p>
      )}
      {oportunidades !== null && oportunidades.length > 0 && (
        <ul>
          {oportunidades.map((o) => (
            <li key={o.id}>
              <strong>{o.titulo}</strong> · {o.tipo} · estado: {o.estado} · {o.descripcion}
            </li>
          ))}
        </ul>
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
          actor (nombre OPCIONAL — solo si confirma consentimiento, ADR-027)
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
      {errorOp !== null && <p role="alert">{errorOp}</p>}

      <h3>Directorio y producción (lectura)</h3>
      <p>consultá productos y operativa de un activo del catálogo (solo lo aprobado+public; restricted = 404 sin eco).</p>
      <label>
        id del activo
        <input value={activoConsulta} onChange={(e) => setActivoConsulta(e.target.value)} placeholder="activo-id del catálogo" />
      </label>{' '}
      <BotonCargar id="directorio" texto="consultar" alCargar={() => void consultarActivo()} />
      {errorDirectorio !== null && <p role="alert">{errorDirectorio}</p>}
      {productos !== null && productos.length === 0 && <p>el activo no publica productos aún ([] declarado: solo se publica lo verificado)</p>}
      {productos !== null && productos.length > 0 && (
        <ul>
          {productos.map((p) => (
            <li key={p.id}>
              <strong>{p.nombre}</strong> · {p.estado}
              {p.temporada_meses.length > 0 ? ' · temporada: ' + p.temporada_meses.join('/') : ' · temporada: sin dato (R15)'}
            </li>
          ))}
        </ul>
      )}
      {operativaTexto !== null && <p>{operativaTexto}</p>}

      <h3>KPIs públicos (set honesto v1)</h3>
      {kpis === null && <BotonCargar id="kpis" texto="cargar KPIs del nodo" alCargar={() => void cargarKpis()} />}
      {kpis !== null && kpis.length === 0 && <p>el nodo aún no tiene snapshots — count 0 honesto (R15)</p>}
      {kpis !== null && kpis.length > 0 && (
        <ul>
          {kpis.map((k) => (
            <li key={k.kpi_key}>
              <strong>{k.kpi_key}</strong> ={' '}
              {k.valor === null ? 'null (sin métrica computada en v1 — null ≠ 0, R15)' : String(k.valor)}
              {Object.keys(k.detalles).length > 0
                ? ' · ' + Object.entries(k.detalles).map(([clave, valor]) => clave + ': ' + valor).join(', ')
                : ''}
            </li>
          ))}
        </ul>
      )}

      <h3>Asistente territorial (sin LLM — plantillas autorizadas)</h3>
      <form onSubmit={preguntar}>
        <label>
          pregunta (3–300 caracteres; solo contenido autorizado)
          <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} maxLength={300} />
        </label>{' '}
        <button type="submit" disabled={cargando === 'ask'}>
          {cargando === 'ask' ? 'consultando…' : 'preguntar'}
        </button>
      </form>
      {errorAsk !== null && <p role="alert">{errorAsk}</p>}
      {respuestaAsk !== null && (
        <div>
          {respuestaAsk.recovered === 0 ? (
            <p>sin fragmentos recuperados: interpretación y sugerencia son null honesto (R15) — probá con otros términos.</p>
          ) : (
            <>
              <h4>Dato ({respuestaAsk.recovered} fragmento(s), dominio {respuestaAsk.dominio ?? '—'})</h4>
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
            confidence {respuestaAsk.confidence} (derivado de cobertura de fuentes) · human_review: {respuestaAsk.human_review}
          </p>
        </div>
      )}

      <h3>Sin cablear aún (honesto, R15)</h3>
      <ul>
        <li>observaciones patrimoniales — PR #253 (VIG-009) en cola, sin merge: no se simula</li>
        <li>comercios (lectura) — MK-1 #246–#250 en cola de merge: no se simula</li>
      </ul>
    </section>
  );
}

export default A1VecinoCiudadano;

/**
 * DELocalSoy.AR — Destino Reportar (REF-R8 #641, épica REF #633): wizard de
 * 3 pasos que reencuadra el flujo ciudadano ya acreditado (PIZ-R6/EV-120).
 *
 * REENCUADRE, no reinvención: la lógica vive en lib/artefactoA1.ts
 * (crearReporte → AltaReporte, corroborar ADR-039, RADIO_PRE_CHEQUEO_M =
 * 100, distanciaMetrosLatLon) y la sesión en useSesion (ART-R0). Este
 * archivo NO toca App.tsx (App agrega 1 import + 1 mount, regla M0),
 * lib/artefactoA1.ts ni ArtefactosRoot.
 *
 * Pasos: 1 Qué pasó (categoría + descripción) · 2 Dónde (punto con «usar
 * mi ubicación», aviso ADR-036 punto público jamás domicilio) · 3 Revisar
 * (resumen + pre-chequeo local de duplicados + envío + 3 estados honestos
 * de duplicados_verificados + CTA «lo corroboro (no duplico)»).
 *
 * Reglas vivas: R5 (errores visibles, jamás []) · R15 (nada simulado: el
 * flag fail-open del servidor NUNCA se lee como «sin duplicados»; sin
 * sesión el envío declara el requisito, jamás lo finge) · ADR-036/Ley
 * 25.326 (sin PII: punto público, el email jamás) · WCAG 2.2 AA (touch
 * 44 px, aria-live SC 4.1.3, texto mínimo 0.875 rem — regla REF-R4).
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSesion } from './SesionProvider';
import { CLAVE_TOKEN_SESION } from '../../lib/sesion';
import {
  crearClienteA1,
  capacidadesA1,
  ErrorA1,
  ESTADOS_ABIERTOS_REPORTE,
  RADIO_PRE_CHEQUEO_M,
  distanciaMetrosLatLon,
  type AltaReporte,
  type CapacidadesA1,
  type DuplicadoSugerido,
  type ReportePublico,
} from '../../lib/artefactoA1';

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof ErrorA1 ? e.message : e instanceof Error ? e.message : porDefecto;
}

/** Pre-chequeo local de duplicados (PIZ-R6/EV-120, MK-3c): candidatos
 * abiertos, no sintéticos y con punto, a menos de RADIO_PRE_CHEQUEO_M,
 * ordenados por distancia y con tope 5. Es ayuda para decidir, no
 * autoridad: la sugerencia real llega en la respuesta del alta. */
export function sugeridosDeBandeja(
  bandeja: ReportePublico[] | null,
  lat: number,
  lng: number
): Array<DuplicadoSugerido & { distancia_m: number }> {
  if (bandeja === null) return [];
  return bandeja
    .filter((r) => !r.is_synthetic && ESTADOS_ABIERTOS_REPORTE.includes(r.estado) && r.lat !== null && r.lng !== null)
    .map((r) => ({
      id: r.id,
      categoria: r.categoria,
      estado: r.estado,
      lat: r.lat as number,
      lng: r.lng as number,
      distancia_m: distanciaMetrosLatLon(lat, lng, r.lat as number, r.lng as number),
      created_at: r.created_at,
    }))
    .filter((s) => s.distancia_m <= RADIO_PRE_CHEQUEO_M)
    .sort((a, b) => a.distancia_m - b.distancia_m)
    .slice(0, 5);
}

/** REF-R8: los 3 estados honestos de duplicados_verificados (R15).
 * true = búsqueda corrida · false = fail-open del servidor (NUNCA «sin
 * duplicados») · null = la búsqueda no se ejecutó (sin dato ≠ 0). */
export function estadoDuplicadosTexto(flag: boolean | null, n: number): string {
  if (flag === true) {
    return n === 0
      ? 'la plataforma buscó reportes parecidos a menos de 100 m y no encontró ninguno'
      : 'la plataforma buscó reportes parecidos a menos de 100 m: ' + n + ' sugeridos — revisalos y corroborá si corresponde';
  }
  if (flag === false) {
    return 'el servidor no pudo correr la búsqueda de parecidos en este alta — no significa que no haya duplicados';
  }
  return 'sin dato: la búsqueda de parecidos no se ejecutó';
}

export interface PropsReportarDestino {
  /** Nodo del territorio (viene del directorio vivo de App; default capital). */
  nodoKey?: string;
}

export function ReportarDestino({ nodoKey = 'capital' }: PropsReportarDestino) {
  const { estado } = useSesion();
  const caps: CapacidadesA1 = useMemo(() => capacidadesA1(estado), [estado]);

  const cliente = useMemo(
    () =>
      crearClienteA1({
        transporte: (ruta, init) => fetch(ruta, init),
        token: () => window.localStorage.getItem(CLAVE_TOKEN_SESION),
      }),
    []
  );

  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [ubicando, setUbicando] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);

  const [bandeja, setBandeja] = useState<ReportePublico[] | null>(null);
  const [cargandoBandeja, setCargandoBandeja] = useState(false);
  const [errorBandeja, setErrorBandeja] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [alta, setAlta] = useState<AltaReporte | null>(null);

  const [corroborando, setCorroborando] = useState<string | null>(null);
  const [exitoCorroborar, setExitoCorroborar] = useState<string | null>(null);
  const [errorCorroborar, setErrorCorroborar] = useState<string | null>(null);

  /* Bandeja de lectura pública del nodo: 1 intento al montar + botón
     reintentar (patrón EV-118). Sin bandeja el pre-chequeo local se
     DECLARA no disponible — el servidor vuelve a buscar en el alta (R15). */
  const cargarBandeja = useCallback(() => {
    setCargandoBandeja(true);
    setErrorBandeja(null);
    void (async () => {
      try {
        setBandeja(await cliente.reportesPublicos(nodoKey));
      } catch (err) {
        setErrorBandeja(mensajeDe(err, 'no se pudo cargar la bandeja de reportes del nodo'));
        setBandeja(null);
      } finally {
        setCargandoBandeja(false);
      }
    })();
  }, [cliente, nodoKey]);

  useEffect(() => {
    cargarBandeja();
  }, [cargarBandeja]);

  const usarMiUbicacion = useCallback(() => {
    setAvisoUbicacion(null);
    if (!navigator.geolocation) {
      setAvisoUbicacion('tu navegador no ofrece geolocalización — declará el punto a mano');
      return;
    }
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setUbicando(false);
        setAvisoUbicacion('punto cargado desde tu ubicación: usá un punto PÚBLICO de referencia — la plataforma jamás registra tu domicilio (ADR-036)');
      },
      () => {
        setUbicando(false);
        setAvisoUbicacion('no se pudo leer tu ubicación (permiso o señal) — declará el punto a mano');
      }
    );
  }, []);

  const sugeridos = useMemo(
    () => (lat.trim() === '' || lng.trim() === '' ? [] : sugeridosDeBandeja(bandeja, Number(lat), Number(lng))),
    [bandeja, lat, lng]
  );

  const paso1Valido = categoria.trim() !== '' && descripcion.trim() !== '';
  const puntoValido = lat.trim() !== '' && lng.trim() !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  const enviar = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setErrorEnvio(null);
      if (!caps.puedeEscribir) {
        setErrorEnvio('la escritura ciudadana exige sesión iniciada — iniciá sesión desde Mi cuenta (destino Más)');
        return;
      }
      if (!paso1Valido || !puntoValido) {
        setErrorEnvio('categoría, descripción y punto (lat/lng) son obligatorios — un reporte sin punto no es cartografiable');
        return;
      }
      setEnviando(true);
      try {
        const respuesta = await cliente.crearReporte({
          nodo_key: nodoKey,
          categoria: categoria.trim(),
          descripcion: descripcion.trim(),
          lat: Number(lat),
          lng: Number(lng),
        });
        setAlta(respuesta);
      } catch (err) {
        setErrorEnvio(mensajeDe(err, 'no se pudo enviar el reporte'));
      } finally {
        setEnviando(false);
      }
    },
    [caps.puedeEscribir, categoria, cliente, descripcion, lat, lng, nodoKey, paso1Valido, puntoValido]
  );

  const corroborar = useCallback(
    (id: string) => {
      setErrorCorroborar(null);
      setExitoCorroborar(null);
      setCorroborando(id);
      void (async () => {
        try {
          const r = await cliente.corroborar(id);
          setExitoCorroborar('corroboración registrada (peso: ' + (r.peso ? 'cuenta' : 'no cuenta') + ') — corroborar no es duplicar (ADR-039)');
        } catch (err) {
          setErrorCorroborar(mensajeDe(err, 'no se pudo corroborar'));
        } finally {
          setCorroborando(null);
        }
      })();
    },
    [cliente]
  );

  const reiniciar = useCallback(() => {
    setCategoria('');
    setDescripcion('');
    setLat('');
    setLng('');
    setAvisoUbicacion(null);
    setAlta(null);
    setErrorEnvio(null);
    setExitoCorroborar(null);
    setErrorCorroborar(null);
    setPaso(1);
  }, []);

  return (
    <section className="reportar-destino" aria-labelledby="reportar-destino-titulo">
      <h2 id="reportar-destino-titulo">Reportar un problema — 3 pasos</h2>
      <ol className="reportar-destino__pasos">
        <li aria-current={paso === 1 ? 'step' : undefined}>1 · Qué pasó</li>
        <li aria-current={paso === 2 ? 'step' : undefined}>2 · Dónde</li>
        <li aria-current={paso === 3 ? 'step' : undefined}>3 · Revisar</li>
      </ol>

      {paso === 1 && (
        <div className="reportar-destino__cuerpo">
          <label htmlFor="reportar-categoria">Categoría del problema</label>
          <input id="reportar-categoria" type="text" value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="ej.: vereda rota, luminaria apagada, basural" />
          <label htmlFor="reportar-descripcion">Contanos qué pasó</label>
          <textarea id="reportar-descripcion" value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)} rows={4}
            placeholder="describí el problema con detalles que ayuden a verificarlo" />
          <div className="reportar-destino__acciones">
            <button type="button" className="reportar-destino__boton" disabled={!paso1Valido}
              onClick={() => setPaso(2)}>Continuar al paso 2</button>
            {!paso1Valido && <p className="reportar-destino__nota">categoría y descripción son obligatorias</p>}
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="reportar-destino__cuerpo">
          <p className="reportar-destino__nota">nodo: {nodoKey}</p>
          <label htmlFor="reportar-lat">Latitud</label>
          <input id="reportar-lat" type="text" inputMode="decimal" value={lat}
            onChange={(e) => setLat(e.target.value)} />
          <label htmlFor="reportar-lng">Longitud</label>
          <input id="reportar-lng" type="text" inputMode="decimal" value={lng}
            onChange={(e) => setLng(e.target.value)} />
          <button type="button" className="reportar-destino__boton" onClick={usarMiUbicacion} disabled={ubicando}>
            {ubicando ? "leyendo tu ubicación…" : "usar mi ubicación"}
          </button>
          <p role="status" aria-live="polite" className="reportar-destino__aviso">
            {avisoUbicacion ??
              "usá un punto PÚBLICO de referencia (esquina, plaza, frente del lugar): la plataforma jamás registra tu domicilio (ADR-036)"}
          </p>
          <div className="reportar-destino__acciones">
            <button type="button" className="reportar-destino__boton" onClick={() => setPaso(1)}>Volver</button>
            <button type="button" className="reportar-destino__boton" disabled={!puntoValido}
              onClick={() => setPaso(3)}>Continuar al paso 3</button>
            {!puntoValido && <p className="reportar-destino__nota">un reporte sin punto no es cartografiable</p>}
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="reportar-destino__cuerpo">
          <h3>Revisar antes de enviar</h3>
          <ul className="reportar-destino__resumen">
            <li>categoría: {categoria}</li>
            <li>descripción: {descripcion}</li>
            <li>punto: {lat}, {lng} (nodo {nodoKey})</li>
          </ul>

          {cargandoBandeja && <p role="status" aria-live="polite">cargando reportes del nodo…</p>}
          {errorBandeja && (
            <p role="alert" aria-live="polite">
              {errorBandeja} — el pre-chequeo local no está disponible; el servidor volverá a buscar parecidos al enviar.
            </p>
          )}
          <button type="button" className="reportar-destino__boton" onClick={cargarBandeja} disabled={cargandoBandeja}>
            Reintentar bandeja del nodo
          </button>

          {sugeridos.length > 0 ? (
            <div>
              <h4>Reportes parecidos ya abiertos (menos de 100 m)</h4>
              <ul className="reportar-destino__sugeridos">
                {sugeridos.map((s) => (
                  <li key={s.id}>{s.categoria} · {s.estado} · a {Math.round(s.distancia_m)} m (creado {s.created_at.slice(0, 10)})</li>
                ))}
              </ul>
              <p className="reportar-destino__nota">si tu problema es el mismo, NO dupliques: al enviar vas a poder corroborar el existente</p>
            </div>
          ) : (
            <p className="reportar-destino__nota">
              {bandeja === null ? "sin bandeja cargada: el pre-chequeo local se declara no disponible (R15)" : "sin reportes abiertos parecidos a menos de 100 m en la bandeja del nodo"}
            </p>
          )}

          {!caps.puedeEscribir && (
            <p role="alert" aria-live="polite">
              la escritura ciudadana exige sesión iniciada — iniciá sesión desde Mi cuenta (destino Más)
            </p>
          )}
          <form onSubmit={enviar}>
            <button type="submit" className="reportar-destino__boton" disabled={enviando || !caps.puedeEscribir}>
              {enviando ? "enviando…" : "enviar reporte"}
            </button>
          </form>
          {errorEnvio && <p role="alert" aria-live="polite">{errorEnvio}</p>}
          <div className="reportar-destino__acciones">
            <button type="button" className="reportar-destino__boton" onClick={() => setPaso(2)} disabled={enviando}>Volver</button>
          </div>

          {alta && (
            <div className="reportar-destino__exito" role="status" aria-live="polite">
              <h4>Reporte enviado (id {alta.reporte.id}{alta.idempotente ? ' · reenvío sin duplicar' : ''})</h4>
              <p>{estadoDuplicadosTexto(alta.duplicados_verificados ? true : false, alta.duplicados_sugeridos.length)}</p>
              {alta.duplicados_sugeridos.length > 0 && (
                <ul>
                  {alta.duplicados_sugeridos.map((d) => (
                    <li key={d.id}>
                      {d.categoria} · {d.estado}
                      {d.distancia_m !== null ? ' · a ' + Math.round(d.distancia_m) + ' m' : ''}
                      {caps.puedeEscribir && (
                        <button type="button" className="reportar-destino__boton"
                          onClick={() => corroborar(d.id)} disabled={corroborando === d.id}>
                          {corroborando === d.id ? "corroborando…" : "lo corroboro (no duplico)"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {exitoCorroborar && <p role="status" aria-live="polite">{exitoCorroborar}</p>}
              {errorCorroborar && <p role="alert" aria-live="polite">{errorCorroborar}</p>}
              <p className="reportar-destino__nota">el reporte nace en revisión: la moderación ES la validación comunitaria (R15)</p>
              <button type="button" className="reportar-destino__boton" onClick={reiniciar}>Reportar otro problema</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ReportarDestino;

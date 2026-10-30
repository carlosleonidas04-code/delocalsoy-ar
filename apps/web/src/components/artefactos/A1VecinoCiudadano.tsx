/**
 * DELocalSoy.AR — Panel del Artefacto A1: vecino, ciudadano y visitante
 * (ART-R1, #270, épica #268). Consume useSesion (ART-R0) y el cliente puro
 * lib/artefactoA1.ts contra las superficies reales de la API.
 *
 * Reglas vivas: R5 (errores visibles, jamás []), R15 (sin simulación — el
 * reporte nace 'received' y la moderación ES la validación comunitaria),
 * ADR-027/Ley 25.326 (sin PII en el cliente). Montaje único en ART-R5
 * (ArtefactosRoot): este archivo NO toca App.tsx ni main.tsx.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSesion } from './SesionProvider';
import { CLAVE_TOKEN_SESION } from '../../lib/sesion';
import {
  COMPONENTES_A1,
  capacidadesA1,
  permisoVisible,
  crearClienteA1,
  ErrorA1,
  type CategoriaNodo,
  type ReporteMio,
  type ReportePublico,
} from '../../lib/artefactoA1';

const ETIQUETA_ESTADO: Record<string, string> = {
  en_main: 'en main',
  en_rama: 'en rama (PR en cola)',
  propuesto: 'propuesto',
};

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof ErrorA1 ? e.message : e instanceof Error ? e.message : porDefecto;
}

export interface PropsA1 {
  /** Nodo del territorio (vocabulario real: capital | caucete | iglesia). */
  nodoKey?: 'capital' | 'caucete' | 'iglesia';
}

export function A1VecinoCiudadano({ nodoKey = 'capital' }: PropsA1) {
  const { estado, modo, refrescar } = useSesion();
  const caps = useMemo(() => capacidadesA1(estado), [estado]);

  const cliente = useMemo(
    () =>
      crearClienteA1({
        transporte: (ruta, init) => fetch(ruta, init),
        token: () => window.localStorage.getItem(CLAVE_TOKEN_SESION),
      }),
    []
  );

  // Lectura pública (visitante incluido): categorías del vocabulario real
  // del nodo + reportes públicos (el servidor excluye 'descartado').
  const [categorias, setCategorias] = useState<CategoriaNodo[] | null>(null);
  const [errorCategorias, setErrorCategorias] = useState<string | null>(null);
  const [reportes, setReportes] = useState<ReportePublico[] | null>(null);
  const [errorReportes, setErrorReportes] = useState<string | null>(null);
  const [cargandoLectura, setCargandoLectura] = useState<boolean>(false);

  const cargarLectura = useCallback(async () => {
    setCargandoLectura(true);
    setErrorCategorias(null);
    setErrorReportes(null);
    const [cats, reps] = await Promise.allSettled([
      cliente.categorias(nodoKey),
      cliente.reportesPublicos(nodoKey),
    ]);
    // R5: cada error se muestra por su cuenta — jamás [] silencioso.
    if (cats.status === 'fulfilled') setCategorias(cats.value);
    else setErrorCategorias(mensajeDe(cats.reason, 'no se pudieron cargar las categorías'));
    if (reps.status === 'fulfilled') setReportes(reps.value);
    else setErrorReportes(mensajeDe(reps.reason, 'no se pudieron cargar los reportes'));
    setCargandoLectura(false);
  }, [cliente, nodoKey]);

  useEffect(() => {
    void cargarLectura();
  }, [cargarLectura]);

  // Identidad: al montar, refrescar quién soy (en modo jwt). En synthetic
  // quienSoy responde demo_sintetico sin transporte — honesto por diseño.
  useEffect(() => {
    if (modo === 'jwt') {
      void refrescar();
    }
    // refrescar es estable (useCallback sobre sesion estable en el provider).
  }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Formulario de reporte (escritura ciudadana).
  const [categoria, setCategoria] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);
  const [exito, setExito] = useState<{ id: string; idempotente: boolean } | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const enviarReporte = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!caps.puedeEscribir) {
        setErrorEnvio('la escritura ciudadana exige sesión iniciada — esto es honestidad, no fricción');
        return;
      }
      if (categoria === '' || descripcion.trim().length === 0) {
        setErrorEnvio('elegí categoría y describí el hecho observable (sin datos personales)');
        return;
      }
      setEnviando(true);
      setErrorEnvio(null);
      setExito(null);
      try {
        const { reporte, idempotente } = await cliente.crearReporte({
          nodo_key: nodoKey,
          categoria,
          descripcion: descripcion.trim(),
          lat: lat.trim() === '' ? null : Number(lat),
          lng: lng.trim() === '' ? null : Number(lng),
        });
        setExito({ id: reporte.id, idempotente });
        setDescripcion('');
        setLat('');
        setLng('');
        void cargarLectura();
      } catch (err) {
        setErrorEnvio(mensajeDe(err, 'no se pudo enviar el reporte'));
      } finally {
        setEnviando(false);
      }
    },
    [caps.puedeEscribir, categoria, cliente, descripcion, lat, lng, nodoKey, cargarLectura]
  );

  // Mis reportes (requiere sesión): suscripción del reportero con las
  // justificaciones públicas de cada transición (ADR-038).
  const [mios, setMios] = useState<ReporteMio[] | null>(null);
  const [errorMios, setErrorMios] = useState<string | null>(null);
  const [cargandoMios, setCargandoMios] = useState<boolean>(false);

  const cargarMios = useCallback(async () => {
    if (!caps.puedeVerMios) {
      setMios(null);
      setErrorMios('«mis reportes» es una suscripción del reportero — iniciá sesión');
      return;
    }
    setCargandoMios(true);
    setErrorMios(null);
    try {
      setMios(await cliente.mios());
    } catch (err) {
      setErrorMios(mensajeDe(err, 'no se pudieron cargar tus reportes'));
    } finally {
      setCargandoMios(false);
    }
  }, [caps.puedeVerMios, cliente]);

  return (
    <section aria-labelledby="a1-titulo" className="artefacto-a1">
      <header>
        <h2 id="a1-titulo">Artefacto A1 — Vecino, ciudadano y visitante</h2>
        <p>
          {caps.esVisitante ? 'Visitante' : 'Con sesión'} · techo {caps.techoReqsMin} req/min ·{' '}
          {caps.esDemo
            ? 'modo SINTÉTICO: demo declarada — las escrituras no se acreditan (R15)'
            : modo === 'jwt'
              ? 'origen: API real'
              : 'origen: API sintética'}
          {caps.rol !== null ? ' · rol: ' + caps.rol : ''}
        </p>
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
      {cargandoLectura && <p>cargando…</p>}
      {errorCategorias && <p role="alert">categorías: {errorCategorias}</p>}
      {errorReportes && <p role="alert">reportes: {errorReportes}</p>}
      {categorias !== null && categorias.length === 0 && !errorCategorias && (
        <p>el nodo aún no publica categorías en su vocabulario (count 0 honesto)</p>
      )}
      {reportes !== null && reportes.length === 0 && !errorReportes && (
        <p>sin reportes públicos aún — el silencio también es un dato honesto</p>
      )}
      {reportes !== null && reportes.length > 0 && (
        <ul>
          {reportes.map((r) => (
            <li key={r.id}>
              <strong>{r.categoria}</strong> · estado: {r.estado}
              {r.is_synthetic ? ' · SINTÉTICO' : ''} · {r.descripcion}
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
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={!caps.puedeEscribir}
            rows={3}
            placeholder="qué se observa, dónde, desde cuándo…"
          />
        </label>
        <br />
        <label>
          lat (opcional)
          <input value={lat} onChange={(e) => setLat(e.target.value)} disabled={!caps.puedeEscribir} inputMode="decimal" />
        </label>{' '}
        <label>
          lng (opcional)
          <input value={lng} onChange={(e) => setLng(e.target.value)} disabled={!caps.puedeEscribir} inputMode="decimal" />
        </label>
        <br />
        <button type="submit" disabled={!caps.puedeEscribir || enviando}>
          {enviando ? 'enviando…' : 'enviar reporte'}
        </button>
      </form>
      {exito && (
        <p>
          reporte {exito.id} recibido — nace «received»:{' '}
          {exito.idempotente
            ? 'ya lo habías enviado (idempotente, sin duplicar).'
            : 'la moderación comunitaria decidirá su ciclo con justificación pública.'}
        </p>
      )}
      {errorEnvio && <p role="alert">{errorEnvio}</p>}

      <h3>Mis reportes</h3>
      {!caps.puedeVerMios ? (
        <p>«mis reportes» es la suscripción del reportero: disponible con sesión iniciada.</p>
      ) : (
        <>
          <button type="button" onClick={() => void cargarMios()} disabled={cargandoMios}>
            {cargandoMios ? 'cargando…' : 'cargar mis reportes'}
          </button>
          {errorMios && <p role="alert">{errorMios}</p>}
          {mios !== null && mios.length === 0 && <p>no enviaste reportes aún (count 0 honesto)</p>}
          {mios !== null && mios.length > 0 && (
            <ul>
              {mios.map((r) => (
                <li key={r.id}>
                  <strong>{r.categoria}</strong> · estado: {r.estado}
                  {r.is_synthetic === true ? ' · SINTÉTICO' : ''}
                  <ul>
                    {r.transiciones.map((t, i) => (
                      <li key={i}>
                        {t.estado_anterior} → {t.estado_nuevo}: «{t.justificacion}» (moderador{' '}
                        {t.moderador_hash.slice(0, 8)}…)
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
    </section>
  );
}

export default A1VecinoCiudadano;

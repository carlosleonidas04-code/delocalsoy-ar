/**
 * DELocalSoy.AR — Destino Preguntar (REF-R9 #642, épica REF #633): panel
 * propio del asistente territorial (sin LLM — plantillas autorizadas),
 * con filtro por tema (AskPreguntaSchema: 4 valores reales) y envío de
 * n1 (PIZ-R3/EV-117).
 *
 * REENCUADRE, no reinvención: la consulta vive en lib/artefactoA1.ts
 * (ask, lectura pública) y los rótulos humanos PIZ-R3 se EXPORTAN desde
 * A1VecinoCiudadano (fuente única, sin duplicación). Este archivo NO toca
 * ArtefactosRoot ni el A1 (App agrega 1 import + 1 mount, regla M0).
 *
 * Reglas vivas: R5 (errores visibles, jamás []) · R15 (dominio y
 * confidence crudos preservados; recovered 0 = sin dato honesto, null ≠ 0) ·
 * ADR-084 (solo lectura: la escritura vive en A1) · WCAG 2.2 AA (touch
 * 44 px, aria-live SC 4.1.3, texto ≥ 0.875 rem — regla REF-R4) · ADR-027
 * (sin PII en la pregunta).
 */
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { CLAVE_TOKEN_SESION } from '../../lib/sesion';
import {
  crearClienteA1,
  type PreguntaAsk,
  type RespuestaAsk,
} from '../../lib/artefactoA1';
import { ETIQUETA_DOMINIO, ETIQUETA_N1, etiquetaN1 } from './A1VecinoCiudadano';

/** PIZ-R3: etiqueta humana del dominio con el valor crudo preservado
 * entre paréntesis (R15: el dato del servidor no se reescribe). */
export function dominioHumano(dominio: string | null): string | null {
  if (dominio === null) return null;
  return (ETIQUETA_DOMINIO[dominio] ?? dominio) + ' (dominio crudo: ' + dominio + ')';
}

/** Cobertura de fuentes: conteo CON cobertura (LIC-01), jamás puntaje.
 * El confidence viaja crudo entre paréntesis (R15, patrón PIZ-R3). */
export function textoCobertura(conFuente: number, recovered: number, confidence: number, humanReview: string): string {
  return 'Cobertura de fuentes: ' + conFuente + ' de ' + recovered + ' fragmentos con fuente citada · revisión humana: ' + humanReview + ' (confianza del cálculo: ' + confidence + ', derivado de la cobertura de fuentes)';
}

/** recovered 0 = sin dato honesto, null ≠ 0 (R15): la ausencia se declara.
 * La interpretación y sugerencia NO se fabrican (no hay fragmentos que
 * sustenten plantilla alguna). */
export function textoSinFragmentos(): string {
  return 'sin fragmentos recuperados: interpretación y sugerencia sin dato aún — probá con otros términos.';
}

export interface PropsPreguntarDestino {
  /** Nodo del territorio (viene del directorio vivo de App; default capital). */
  nodoKey?: string;
}

export function PreguntarDestino({ nodoKey = 'capital' }: PropsPreguntarDestino) {
  const cliente = useMemo(
    () =>
      crearClienteA1({
        transporte: (ruta, init) => fetch(ruta, init),
        token: () => window.localStorage.getItem(CLAVE_TOKEN_SESION),
      }),
    []
  );

  const [pregunta, setPregunta] = useState('');
  const [filtroN1, setFiltroN1] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorAsk, setErrorAsk] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaAsk | null>(null);

  const preguntar = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const texto = pregunta.trim();
      if (texto.length < 3 || texto.length > 300) {
        setErrorAsk('la pregunta necesita entre 3 y 300 caracteres');
        return;
      }
      setCargando(true);
      setErrorAsk(null);
      void (async () => {
        try {
          setRespuesta(
            await cliente.ask(nodoKey, {
              pregunta: texto,
              ...(filtroN1 !== '' ? { n1: filtroN1 as PreguntaAsk['n1'] } : {}),
            })
          );
        } catch (err) {
          setRespuesta(null);
          setErrorAsk(err instanceof Error ? err.message : 'no se pudo consultar el asistente del nodo');
        } finally {
          setCargando(false);
        }
      })();
    },
    [cliente, filtroN1, nodoKey, pregunta]
  );

  const conFuente = useMemo(() => {
    const dato = respuesta?.dato ?? [];
    return dato.filter((f) => f.fuentes.length > 0).length;
  }, [respuesta]);

  const dominioTexto = dominioHumano(respuesta?.dominio ?? null);

  return (
    <section className='preguntar-destino' aria-labelledby='preguntar-destino-titulo'>
      <h2 id='preguntar-destino-titulo'>Asistente territorial — preguntá al nodo</h2>
      <p className='preguntar-destino__nota'>
        sin LLM: responde con plantillas autorizadas y su fuente — solo contenido aprobado del nodo {nodoKey}
      </p>
      <form onSubmit={preguntar} className='preguntar-destino__form'>
        <label htmlFor='preguntar-pregunta'>Tu pregunta (3–300 caracteres; solo contenido autorizado)</label>
        <input id='preguntar-pregunta' type='text' value={pregunta} maxLength={300}
          onChange={(e) => setPregunta(e.target.value)} />
        <label htmlFor='preguntar-tema'>Tema — acota la búsqueda a activos de esa capital</label>
        <select id='preguntar-tema' value={filtroN1} onChange={(e) => setFiltroN1(e.target.value)}>
          <option value=''>todas las capitales (sin filtro)</option>
          {(Object.entries(ETIQUETA_N1) as Array<[NonNullable<PreguntaAsk['n1']>, string]>).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
        <button type='submit' className='preguntar-destino__boton' disabled={cargando || pregunta.trim().length < 3}>
          {cargando ? 'consultando…' : 'preguntar'}
        </button>
      </form>
      {filtroN1 !== '' && (
        <p role='status' aria-live='polite' className='preguntar-destino__nota'>
          filtro aplicado: {etiquetaN1(filtroN1)} — la plataforma recupera solo fragmentos de activos con esa temática primaria (aprobados, sin lo restringido)
        </p>
      )}
      {errorAsk !== null && <p role='alert' aria-live='polite'>{errorAsk}</p>}
      {respuesta !== null && (
        <div className='preguntar-destino__respuesta'>
          {respuesta.recovered === 0 ? (
            <p className='preguntar-destino__nota'>{textoSinFragmentos()}</p>
          ) : (
            <>
              <h3>
                Dato ({respuesta.recovered} fragmento(s)
                {dominioTexto !== null ? ', dominio ' + dominioTexto : ''})
              </h3>
              <ul className='preguntar-destino__fragmentos'>
                {respuesta.dato.map((f, i) => (
                  <li key={i}>
                    {f.texto}{' '}
                    <small>
                      (fuentes: {f.fuentes.map((x) => x.fuente + (x.fecha !== undefined ? ' ' + x.fecha : '')).join('; ')})
                    </small>
                  </li>
                ))}
              </ul>
              <p>
                <strong>Interpretación (plantilla autorizada):</strong> {respuesta.interpretacion ?? 'null honesto'}
              </p>
              <p>
                <strong>Sugerencia (plantilla autorizada):</strong> {respuesta.sugerencia ?? 'null honesto'}
              </p>
            </>
          )}
          <p className='preguntar-destino__nota'>
            {textoCobertura(conFuente, respuesta.recovered, respuesta.confidence, respuesta.human_review)}
          </p>
        </div>
      )}
    </section>
  );
}

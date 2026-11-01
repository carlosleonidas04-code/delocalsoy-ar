import { useEffect, useState } from 'react';
import { SYNTHETIC_MODE_WARNING_TEXT, type DataSource } from '../lib/dataSource';
import {
  esOrigenSintetico,
  etiquetaDualComercio,
  etiquetaEstadoEpistemico,
  etiquetaHabilitacion,
  etiquetaRubro,
  etiquetaTitularidad,
  notaComercios,
  type ComercioItem,
} from '../lib/comercios';

/**
 * Mercado de Proximidad — nodo Capital (MARKET-CAP MK-1 #243, sub-épica #152).
 *
 * Directorio público de comercios con estados epistémicos honestos: solo lo
 * aprobado y público llega desde la API (moderación primero; ADR-036:
 * restricted nunca sale). Multinodo desde día 1 (decisión DH): el panel
 * agrupa por nodo sin hardcodear Capital. v1 sin pagos (MK-5 = fase 2, ADR
 * propio Ley 24.240) y sin PII de contacto (decisión DH: relay por
 * plataforma, Ley 25.326). Consumo por contrato DataSource (ADR-029):
 * ApiDataSource en modo real, SyntheticDataSource en paridad. R15: 0 es
 * "el registro comunitario arranca vacío" (seed 0, decisión DH, patrón
 * VIG-005), lo sintético se declara siempre y el error se muestra — no se
 * traga. UI funcional con tokens.css (ADR-034); el refinamiento estético va
 * por el flujo agent-google aparte.
 */

const ORDEN_ESTADOS = ['verified', 'community_validated', 'pending', 'synthetic_demo'];

interface LeyendaEstadoComercio {
  estado: string;
  count: number;
  sinteticos: number;
}

type PanelState =
  | { status: 'loading' }
  | { status: 'ok'; comercios: ComercioItem[] }
  | { status: 'error'; message: string };

export function ComerciosPanel({ dataSource }: { dataSource: DataSource }) {
  const [state, setState] = useState<PanelState>({ status: 'loading' });

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        if (!dataSource.listComercios) {
          throw new Error(
            'El DataSource actual no implementa el Mercado de Proximidad (listComercios).',
          );
        }
        // Sin filtro de nodo: el directorio es multinodo desde día 1 (decisión
        // DH) y la API solo devuelve lo aprobado y público (take 100, MK-0 §2.5).
        const comercios = await dataSource.listComercios();
        if (!cancelado) {
          setState({ status: 'ok', comercios });
        }
      } catch (err) {
        if (!cancelado) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    };
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [dataSource]);

  const comerciosOk = state.status === 'ok' ? state.comercios : [];
  const comerciosReales = comerciosOk.filter((c) => esOrigenSintetico(c) === false);
  const comerciosSinteticos = comerciosOk.filter((c) => esOrigenSintetico(c));

  // Agrupación multinodo por nodo_key (nodos alfabéticos, R15: nada hardcodeado).
  const porNodo = new Map<string, ComercioItem[]>();
  for (const comercio of comerciosOk) {
    const lista = porNodo.get(comercio.nodo_key) ?? [];
    lista.push(comercio);
    porNodo.set(comercio.nodo_key, lista);
  }
  const gruposNodo = [...porNodo.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Leyenda de estados honestos: cada estado es una señal independiente y
  // los sintéticos se cuentan aparte — sin mezclar (patrón #142).
  const conteoEstados = new Map<string, LeyendaEstadoComercio>();
  for (const comercio of comerciosOk) {
    const actual = conteoEstados.get(comercio.estado_epistemico) ?? {
      estado: comercio.estado_epistemico,
      count: 0,
      sinteticos: 0,
    };
    actual.count += 1;
    if (esOrigenSintetico(comercio)) actual.sinteticos += 1;
    conteoEstados.set(comercio.estado_epistemico, actual);
  }
  const leyenda: LeyendaEstadoComercio[] = [
    ...ORDEN_ESTADOS.filter((e) => conteoEstados.has(e)).map(
      (e) => conteoEstados.get(e) as LeyendaEstadoComercio,
    ),
    ...[...conteoEstados.values()]
      .filter((l) => ORDEN_ESTADOS.includes(l.estado) === false)
      .sort((a, b) => a.estado.localeCompare(b.estado)),
  ];

  return (
    <section
      id="mercado-proximidad"
      className="card"
      data-state={state.status}
      aria-labelledby="mercado-proximidad-titulo"
    >
      <div className="section-header">
        <div>
          <span className="kicker-text">NODO-CAPITAL · MARKET-CAP MK-1 (#243)</span>
          <h3 id="mercado-proximidad-titulo">
            Mercado de Proximidad — directorio de comercios
          </h3>
        </div>
      </div>
      <p className="territory-meta">
        Directorio comunitario del nodo Capital y de toda la red federada: cada comercio
        se muestra con su estado epistémico honesto. Lenguaje claro: Verificado ≠
        Validado por la comunidad ≠ Pendiente. v1 sin pagos y con contacto por relay
        de plataforma (Ley 25.326) — sin datos de contacto expuestos.
      </p>
      {state.status === 'loading' && (
        <p role="status" className="territory-meta">
          Cargando el directorio del Mercado de Proximidad…
        </p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="territory-meta">
          Error al obtener el Mercado de Proximidad: {state.message}
        </p>
      )}
      {state.status === 'ok' && (
        <>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
            Leyenda de estados honestos
          </h4>
          <ul
            aria-label="Leyenda de estados honestos de los comercios publicados"
            style={{ margin: '0.25rem 0 0.75rem', paddingLeft: '1.1rem', fontSize: '0.78rem' }}
          >
            {leyenda.map((l) => (
              <li key={l.estado}>
                {etiquetaEstadoEpistemico(l.estado)}: {String(l.count)} — de los cuales{' '}
                {String(l.sinteticos)} sintético(s)
              </li>
            ))}
          </ul>

          <h4 style={{ fontSize: '0.85rem', margin: '0.75rem 0 0.3rem' }}>
            Comercios reales publicados ({String(comerciosReales.length)})
          </h4>
          <p role="status" className="territory-meta" style={{ fontSize: '0.78rem' }}>
            {notaComercios(comerciosReales.length)}
          </p>
          {comerciosReales.length === 0 ? (
            <p className="territory-meta" style={{ fontSize: '0.75rem' }}>
              Sin comercios reales publicados aún — 0 es un dato honesto (R15), no un
              error. El alta ciudadana y la moderación son los próximos slices (MK-1).
            </p>
          ) : (
            gruposNodo.map(([nodoKey, comerciosDelNodo]) => {
              const realesDelNodo = comerciosDelNodo.filter(
                (c) => esOrigenSintetico(c) === false,
              );
              if (realesDelNodo.length === 0) return null;
              return (
                <div key={nodoKey} style={{ margin: '0.3rem 0' }}>
                  <p className="territory-meta" style={{ fontSize: '0.74rem', margin: '0.15rem 0' }}>
                    <strong>nodo {nodoKey}</strong> — {String(realesDelNodo.length)} comercio(s)
                  </p>
                  <ul
                    aria-label={'Comercios reales del nodo ' + nodoKey}
                    style={{ margin: '0.15rem 0', paddingLeft: '1.1rem', fontSize: '0.75rem' }}
                  >
                    {realesDelNodo.map((c) => (
                      <li key={c.id}>
                        {c.titulo} — {etiquetaDualComercio(c)} — {etiquetaRubro(c)} ·{' '}
                        {etiquetaHabilitacion(c.habilitacion_estado)} ·{' '}
                        {etiquetaTitularidad(c.titularidad_estado)}
                        {c.subnodo_key ? ' · subnodo ' + c.subnodo_key : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}

          <h4 style={{ fontSize: '0.85rem', margin: '0.75rem 0 0.3rem' }}>
            Comercios sintéticos de la demo (R15) — {String(comerciosSinteticos.length)}
          </h4>
          {comerciosSinteticos.length === 0 ? (
            <p className="territory-meta" style={{ fontSize: '0.75rem' }}>
              Sin comercios sintéticos en esta fuente de datos — el directorio real
              arranca vacío (seed 0, decisión DH).
            </p>
          ) : (
            <ul
              aria-label="Comercios sintéticos de la demo del Mercado de Proximidad"
              style={{ margin: '0.25rem 0', paddingLeft: '1.1rem', fontSize: '0.75rem' }}
            >
              {comerciosSinteticos.map((c) => (
                <li key={c.id}>
                  {c.titulo} — {etiquetaDualComercio(c)} — {etiquetaRubro(c)} ·{' '}
                  {etiquetaHabilitacion(c.habilitacion_estado)}
                  {c.subnodo_key ? ' · subnodo ' + c.subnodo_key : ''}
                </li>
              ))}
            </ul>
          )}
          {dataSource.mode === 'synthetic' && (
            <p className="territory-meta" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
              {SYNTHETIC_MODE_WARNING_TEXT}
            </p>
          )}
        </>
      )}
    </section>
  );
}

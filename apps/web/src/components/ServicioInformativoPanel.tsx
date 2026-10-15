import { useEffect, useState } from 'react';
import { SYNTHETIC_MODE_WARNING_TEXT, type DataSource } from '../lib/dataSource';
import {
  agruparCapasPorDominio,
  CAPAS_V6_CAUCETE,
  esOrigenSintetico,
  ETIQUETA_STAGING_R15,
  etiquetaDualFeature,
  etiquetaEstadoFuente,
  etiquetaTipoFuente,
  leyendaEstados,
  notaIngestas,
  type CapaInformativa,
  type FeatureInformativa,
  type FuenteInformativa,
  type IngestaPublicada,
} from '../lib/servicioInformativo';

/**
 * Servicio informativo ciudadano — NODO-CAU NC-R5 (#142, épica #137).
 *
 * Panel del nodo Caucete: capas v6 (#141) con leyenda de fuentes y estados
 * honestos, catálogo de fuentes espaciales (ADR-035) y procedencia publicada
 * (ingesta en estado publicado, NC-EV-09). Consumo por contrato DataSource
 * (ADR-029): ApiDataSource en modo real, SyntheticDataSource en paridad.
 * R15: lo sintético nunca se mezcla con lo real, 0 es "sin materializar aún"
 * y el error se muestra — no se traga. UI funcional con tokens.css (ADR-034);
 * el refinamiento estético va por el flujo agent-google aparte.
 */
const NODO_CAUCETE = 'caucete' as const;

type PanelState =
  | { status: 'loading' }
  | {
      status: 'ok';
      fuentes: FuenteInformativa[];
      ingestas: IngestaPublicada[];
      capas: CapaInformativa[];
      features: FeatureInformativa[];
    }
  | { status: 'error'; message: string };

export function ServicioInformativoPanel({ dataSource }: { dataSource: DataSource }) {
  const [state, setState] = useState<PanelState>({ status: 'loading' });

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        if (
          !dataSource.listFuentes ||
          !dataSource.listIngestas ||
          !dataSource.listNodeCapas ||
          !dataSource.listNodeFeatures
        ) {
          throw new Error(
            'El DataSource actual no implementa el servicio informativo (listFuentes, listIngestas, listNodeCapas, listNodeFeatures).',
          );
        }
        const [fuentes, ingestas, capas, features] = await Promise.all([
          dataSource.listFuentes(),
          dataSource.listIngestas(NODO_CAUCETE),
          dataSource.listNodeCapas(NODO_CAUCETE),
          dataSource.listNodeFeatures(NODO_CAUCETE),
        ]);
        if (!cancelado) {
          setState({ status: 'ok', fuentes, ingestas, capas, features });
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

  const featuresOk = state.status === 'ok' ? state.features : [];
  const featuresReales = featuresOk.filter((f) => esOrigenSintetico(f) === false);
  const featuresSinteticas = featuresOk.filter((f) => esOrigenSintetico(f));

  return (
    <section
      id="servicio-informativo-caucete"
      className="card"
      data-state={state.status}
      aria-labelledby="servicio-informativo-caucete-titulo"
    >
      <div className="section-header">
        <div>
          <span className="kicker-text">NODO-CAU · NC-R5 (#142)</span>
          <h3 id="servicio-informativo-caucete-titulo">
            Servicio informativo ciudadano — nodo Caucete
          </h3>
        </div>
      </div>
      <p className="territory-meta">
        Qué hay en el territorio y en qué estado está cada dato: capas del vocabulario v6,
        catálogo de fuentes espaciales (ADR-035) y procedencia publicada por conjunto
        (NC-EV-09). Lenguaje claro: Verificado ≠ Validado por la comunidad ≠ Pendiente.
      </p>
      <p className="territory-meta" style={{ fontSize: '0.7rem' }}>
        Etiqueta dual R15: el material que aún no acreditó GitHub se rotula
        «{ETIQUETA_STAGING_R15}». Los datos sintéticos de la demo se declaran siempre —
        nunca se mezclan con los reales.
      </p>
      {state.status === 'loading' && (
        <p role="status" className="territory-meta">
          Cargando el servicio informativo del nodo Caucete…
        </p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="territory-meta">
          Error al obtener el servicio informativo: {state.message}
        </p>
      )}
      {state.status === 'ok' && (
        <>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
            Leyenda de estados honestos
          </h4>
          <ul
            aria-label="Leyenda de estados honestos de las features del nodo Caucete"
            style={{ margin: '0.25rem 0 0.75rem', paddingLeft: '1.1rem', fontSize: '0.78rem' }}
          >
            {leyendaEstados(state.features).map((l) => (
              <li key={l.estado}>
                {l.etiqueta}: {String(l.count)} — de los cuales {String(l.sinteticos)} sintético(s)
              </li>
            ))}
          </ul>

          <h4 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
            Procedencia publicada (solo ingestas en estado publicado)
          </h4>
          <p role="status" className="territory-meta" style={{ fontSize: '0.78rem' }}>
            {notaIngestas(state.ingestas.length)}
          </p>
          {state.ingestas.length > 0 && (
            <ul
              aria-label="Ingestas publicadas del nodo Caucete"
              style={{ margin: '0.25rem 0 0.75rem', paddingLeft: '1.1rem', fontSize: '0.78rem' }}
            >
              {state.ingestas.map((i) => (
                <li key={i.id}>
                  {i.fuente_key} → capa {i.capa_servicio}
                  {i.fecha_corte ? ' · corte ' + i.fecha_corte : ''}
                  {i.licencia ? ' · licencia ' + i.licencia : ' · licencia no declarada'}
                  {i.is_synthetic ? ' · [SINTÉTICO]' : ''}
                </li>
              ))}
            </ul>
          )}

          <h4 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
            Catálogo de fuentes espaciales ({String(state.fuentes.length)})
          </h4>
          <table
            aria-label="Catálogo de fuentes espaciales del nodo Caucete (ADR-035)"
            style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse' }}
          >
            <caption className="territory-meta" style={{ textAlign: 'left', fontSize: '0.68rem' }}>
              Estados honestos: disponible, requiere credenciales, requiere solicitud, no
              disponible o deprecado — con cautela textual de cada fuente.
            </caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left' }}>Fuente</th>
                <th scope="col" style={{ textAlign: 'left' }}>Tipo</th>
                <th scope="col" style={{ textAlign: 'left' }}>Estado</th>
                <th scope="col" style={{ textAlign: 'left' }}>Cautela</th>
              </tr>
            </thead>
            <tbody>
              {state.fuentes.map((f) => (
                <tr key={f.id} style={{ borderTop: '1px solid var(--color-border-hairline, #444)' }}>
                  <td>
                    {f.nombre}
                    <br />
                    <span style={{ opacity: 0.75 }}>{f.organismo}</span>
                  </td>
                  <td>{etiquetaTipoFuente(String(f.tipo))}</td>
                  <td>{etiquetaEstadoFuente(String(f.estado))}</td>
                  <td>{f.cautela}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ fontSize: '0.85rem', margin: '0.75rem 0 0.3rem' }}>
            Capas del nodo por dominio ({String(state.capas.length)})
          </h4>
          {agruparCapasPorDominio(state.capas).map((g) => (
            <div key={g.dominio} style={{ margin: '0.3rem 0' }}>
              <p className="territory-meta" style={{ fontSize: '0.74rem', margin: '0.15rem 0' }}>
                <strong>{g.dominio}</strong> — {String(g.capas.length)} capa(s)
              </p>
              <ul style={{ margin: '0.15rem 0', paddingLeft: '1.1rem', fontSize: '0.75rem' }}>
                {g.capas.map((c) => (
                  <li key={c.id}>
                    {c.nombre} ({c.key}) · geometría {c.geometria}
                    {CAPAS_V6_CAUCETE.includes(c.key) ? ' · capa v6 (#141)' : ''}
                    {' · ' + (c.default_on ? 'visible por defecto' : 'apagada por defecto')}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <h4 style={{ fontSize: '0.85rem', margin: '0.75rem 0 0.3rem' }}>
            Features reales publicadas ({String(featuresReales.length)})
          </h4>
          {featuresReales.length === 0 ? (
            <p className="territory-meta" style={{ fontSize: '0.75rem' }}>
              Sin features reales publicadas aún — 0 es un dato honesto (R15), no un error.
            </p>
          ) : (
            <ul
              aria-label="Features reales del nodo Caucete"
              style={{ margin: '0.25rem 0', paddingLeft: '1.1rem', fontSize: '0.75rem' }}
            >
              {featuresReales.map((f) => (
                <li key={f.id}>
                  {f.titulo} — {etiquetaDualFeature(f)} — {f.fuente_label}
                </li>
              ))}
            </ul>
          )}

          <h4 style={{ fontSize: '0.85rem', margin: '0.75rem 0 0.3rem' }}>
            Features sintéticas de la demo (R15) — {String(featuresSinteticas.length)}
          </h4>
          {featuresSinteticas.length === 0 ? (
            <p className="territory-meta" style={{ fontSize: '0.75rem' }}>
              Sin features sintéticas en esta fuente de datos.
            </p>
          ) : (
            <ul
              aria-label="Features sintéticas de la demo del nodo Caucete"
              style={{ margin: '0.25rem 0', paddingLeft: '1.1rem', fontSize: '0.75rem' }}
            >
              {featuresSinteticas.map((f) => (
                <li key={f.id}>
                  {f.titulo} — {etiquetaDualFeature(f)} — {f.fuente_label}
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

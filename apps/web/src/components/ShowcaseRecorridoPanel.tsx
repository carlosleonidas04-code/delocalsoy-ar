import { useEffect, useState } from 'react';
import {
  normalizarShowcase,
  type ShowcaseNodoResumen,
  type ShowcaseResponse,
} from '../lib/showcaseRecorrido';

/**
 * Recorrido del Showcase — NODO-VIG VIG-007 (NVIG-R9 #193, épica #167).
 *
 * Vista de la demo final: Caucete → Capital → Valle de Iglesia con el
 * estado REAL de cada nodo (GET /api/showcase). R15: un 0 es un dato
 * honesto ("sin materializar aún"), nunca un valor maquillado; el error
 * de red tampoco se traga — se muestra.
 */
type ShowcaseState =
  | { status: 'loading' }
  | { status: 'ok'; data: ShowcaseResponse }
  | { status: 'error'; message: string };

interface FilaCount {
  campo:
    | 'subnodos'
    | 'kpis'
    | 'activos_aprobados'
    | 'fichas_patrimoniales'
    | 'operativas'
    | 'productos_aprobados'
    | 'rag_fragmentos';
  label: string;
}

const FILAS: FilaCount[] = [
  { campo: 'subnodos', label: 'Subnodos' },
  { campo: 'kpis', label: 'KPIs materializados' },
  { campo: 'activos_aprobados', label: 'Activos aprobados' },
  { campo: 'fichas_patrimoniales', label: 'Fichas patrimoniales' },
  { campo: 'operativas', label: 'Operativas' },
  { campo: 'productos_aprobados', label: 'Productos aprobados' },
  { campo: 'rag_fragmentos', label: 'Fragmentos RAG' },
];

export function ShowcaseRecorridoPanel() {
  const [state, setState] = useState<ShowcaseState>({ status: 'loading' });

  useEffect(() => {
    let cancelado = false;
    fetch('/api/showcase')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('HTTP ' + String(res.status));
        }
        const json = (await res.json()) as { success?: boolean; data?: unknown };
        if (json.success !== true || json.data === undefined) {
          throw new Error('respuesta sin datos del recorrido');
        }
        if (!cancelado) {
          setState({ status: 'ok', data: normalizarShowcase(json.data) });
        }
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <section id="showcase-recorrido" className="card" data-state={state.status}>
      <h3>Recorrido del Showcase — Demo final (VIG-007)</h3>
      <p className="territory-meta">
        Caucete → Capital → Valle de Iglesia. Estado REAL de cada nodo: un 0 es un dato
        honesto — sin materializar aún (R15), nunca fabricado.
      </p>
      {state.status === 'loading' && (
        <p className="territory-meta">Cargando el recorrido del showcase…</p>
      )}
      {state.status === 'error' && (
        <p className="territory-meta">Error al obtener el recorrido: {state.message}</p>
      )}
      {state.status === 'ok' && (
        <>
          <div
            style={{
              display: 'grid',
              gap: '0.75rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            {state.data.nodos.map((nodo: ShowcaseNodoResumen) => (
              <div
                key={nodo.key}
                style={{
                  border: '1px solid var(--color-border-hairline, #444)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  padding: '0.6rem',
                }}
              >
                <div className="event-row-top">
                  <strong style={{ fontSize: '0.85rem' }}>{nodo.nombre}</strong>
                  <span className="r5-state-badge r5-state-publicado">{nodo.key}</span>
                </div>
                <p className="territory-meta" style={{ fontSize: '0.72rem', margin: '0.25rem 0' }}>
                  {nodo.foco}
                </p>
                <ul style={{ margin: '0.35rem 0', paddingLeft: '1.1rem', fontSize: '0.75rem' }}>
                  {FILAS.map((fila) => {
                    const valor = nodo[fila.campo];
                    return (
                      <li key={fila.campo}>
                        {fila.label}: {String(valor)}
                        {valor === 0 ? ' — sin materializar aún (R15)' : ''}
                      </li>
                    );
                  })}
                </ul>
                {nodo.kpis_detalle.length > 0 && (
                  <p className="territory-meta" style={{ fontSize: '0.68rem' }}>
                    KPIs: {nodo.kpis_detalle.map((k) => k.kpi_key).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="territory-meta" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
            Guion ejecutable ({String(state.data.guion.pasos)} pasos): {state.data.guion.doc}
          </p>
        </>
      )}
    </section>
  );
}

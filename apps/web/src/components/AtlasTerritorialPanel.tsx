import { useEffect, useState } from 'react';
import type { DataSource } from '../lib/dataSource';
import {
  descripcionAccesibleBloque,
  etiquetaEstadoBloque,
  METADATOS_BLOQUE,
  NODOS_ATLAS,
  type AtlasNodoUI,
  type NodoAtlasKey,
} from '../lib/atlasTerritorial';

/**
 * Atlas Territorial por nodo — MVP-1 (RFC-021, #532, épica OBJE-CAMPUS #531).
 *
 * Panel de SOLO-LECTURA (ADR-084): compone las superficies ya acreditadas
 * (vocabulario CORE-002, kpis LIC-R1, amenazas LIC-R4, convenios LIC-R9,
 * matriz curricular MVP-1) bajo una única vista por nodo, consumida por
 * contrato DataSource (ADR-040). R15: cada bloque declara su estado honesto
 * con TEXTO visible — publicado | sin fuente ingerida | en custodia — jamás
 * solo color (WCAG 2.2 AA, ADR-061); nada se fabrica y el error se muestra,
 * no se traga (R5). Anti-ranking (R5/ADR-036): el panel no compara nodos ni
 * puntúa — la selección de nodo es navegación, jamás competición.
 */

type PanelState =
  | { status: 'loading' }
  | { status: 'ok'; atlas: AtlasNodoUI }
  | { status: 'error'; message: string };

const CLASE_ESTADO: Record<string, string> = {
  publicado: 'atlas-estado atlas-estado--publicado',
  sin_fuente_ingestada: 'atlas-estado atlas-estado--sin-fuente',
  en_custodia: 'atlas-estado atlas-estado--en-custodia',
};

export function AtlasTerritorialPanel({ dataSource }: { dataSource: DataSource }) {
  const [nodoKey, setNodoKey] = useState<NodoAtlasKey>('capital');
  const [state, setState] = useState<PanelState>({ status: 'loading' });

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setState({ status: 'loading' });
      try {
        if (!dataSource.getAtlasNodo) {
          throw new Error('El DataSource actual no implementa el Atlas Territorial (getAtlasNodo).');
        }
        const atlas = await dataSource.getAtlasNodo(nodoKey);
        if (!cancelado) setState({ status: 'ok', atlas });
      } catch (err) {
        if (!cancelado) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    };
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [dataSource, nodoKey]);

  const nodoNombre = NODOS_ATLAS.find((n) => n.key === nodoKey)?.nombre ?? nodoKey;

  return (
    <section className="card" data-state={state.status === 'ok' ? 'ok' : state.status} id="atlas-territorial-mvp1">
      <h2>Atlas Territorial — MVP-1 «Atlas Territorial» [RFC-021 · composición solo-lectura, ADR-084]</h2>
      <p>
        Composición de superficies ya acreditadas bajo una única vista por nodo (ADR-084): sin nueva
        escritura territorial, sin geometrías de dominios sensibles (patrón Iglesia) y jamás ranking
        entre nodos (R5/ADR-036). Cada bloque declara su estado honesto — si la fuente no tiene datos,
        el bloque se declara vacío, nada se fabrica (R15).
      </p>

      <div className="atlas-selector">
        <label htmlFor="atlas-nodo-select">Nodo territorial</label>
        <select
          id="atlas-nodo-select"
          value={nodoKey}
          onChange={(e) => setNodoKey(e.target.value as NodoAtlasKey)}
          aria-describedby="atlas-nodo-ayuda"
        >
          {NODOS_ATLAS.map((n) => (
            <option key={n.key} value={n.key}>
              {n.nombre}
            </option>
          ))}
        </select>
        <p id="atlas-nodo-ayuda" className="atlas-ayuda">
          Elegí el nodo del vocabulario canónico (capital, caucete o iglesia). La selección navega la
          vista: no compara ni puntúa nodos (R5/ADR-036).
        </p>
      </div>

      {state.status === 'loading' && (
        <p role="status">Cargando el atlas del nodo {nodoNombre}…</p>
      )}

      {state.status === 'error' && (
        <p role="alert" data-state="error">
          No se pudo armar el atlas del nodo {nodoNombre}: {state.message}
        </p>
      )}

      {state.status === 'ok' && (
        <ul className="atlas-bloques" aria-label={`Bloques del atlas del nodo ${nodoNombre}`}>
          {state.atlas.bloques.map((b) => {
            const meta = METADATOS_BLOQUE[b.bloque];
            return (
              <li key={b.bloque} className="atlas-bloque" data-estado={b.estado}>
                <h3>{meta.titulo}</h3>
                <p className="atlas-bloque-descripcion">{meta.descripcion}</p>
                <p className={CLASE_ESTADO[b.estado]}>
                  <strong>Estado: {etiquetaEstadoBloque(b.estado)}</strong>
                  {b.detalle ? <span> — {b.detalle}</span> : null}
                </p>
                <span className="sr-only">{descripcionAccesibleBloque(b)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// REF-R7 (#640, épica REF #633): lectura del mapa en texto (lista equivalente
// accesible del PDF, WCAG 1.4.1 persistente — ya no solo en la rama sin API
// key) + bloque «Fuente de esta capa» por capa (corte + cobertura + fuente
// exacta, con DatoConFuente/PieDeFuente de REF-R5). Presentación pura: sin
// fetch, sin escritura (ADR-040/ADR-084). Anti-ranking R5/ADR-036:
// territorios en orden del dataset, capas en orden fijo de la fuente única.
// R15: sin dato ingerido se declara la ausencia (null ≠ 0). aria-live polite
// (patrón EV-122).

import { MAP_GEOMETRY_LAYER_GROUPS } from './TerritoriosMap';
import { conteosTerritoriales, type ConteoPorCapa, type ConteoPorNodo } from './conteosTerritoriales';
import { fuenteCapas, FUENTE_CAPAS } from './fuenteCapas';
import { STATUS_META } from '../data/federatedModel';
import type { SpatialGeometryRecord } from '../data/federatedModel';
import type { Territorio } from '../App';
import { DatoConFuente } from './base/DatoConFuente';
import { PieDeFuente } from './base/PieDeFuente';

interface MapaLecturaPanelProps {
  territorios: Territorio[];
  spatialGeometries: SpatialGeometryRecord[];
}

// Fila textual de un territorio: capas en orden fijo con conteo, sin ranking.
export function textoFilaTerritorio(t: Territorio, nodo: ConteoPorNodo | null): string {
  const partes = MAP_GEOMETRY_LAYER_GROUPS.map((g) => {
    const c = nodo ? nodo.porCapa[g.key] : null;
    return g.shortLabel + ': ' + (c ? String(c.total) : 'sin dato');
  });
  return t.nombre + ' (' + t.provincia + ') — ' + partes.join(' · ');
}

// Cobertura declarada por capa (patrón EV-131): estados epistémicos con label
// de STATUS_META + crudos declarados + corte honesto. Nada inventado (R15).
export function coberturaCapa(c: ConteoPorCapa): string {
  if (c.total === 0) return 'sin geometrías ingeridas en esta capa: ausencia declarada (R15: null ≠ 0)';
  const partes: string[] = [];
  for (const [estado, n] of Object.entries(c.porEstado)) {
    const meta = STATUS_META[estado];
    partes.push(((meta && meta.label) || estado) + ' ' + n);
  }
  for (const crudo of c.estadoOtroCrudo) partes.push('estado crudo sin categoría: ' + crudo);
  const fecha = c.ultimoQuarter ? ' · corte multitemporal: mayor trimestre presente = ' + c.ultimoQuarter : '';
  return partes.join(' · ') + fecha;
}

export function MapaLecturaPanel({ territorios, spatialGeometries }: MapaLecturaPanelProps) {
  const conteo = conteosTerritoriales(spatialGeometries);
  const porNodo = new Map(conteo.nodos.map((n) => [n.nodeKey, n]));
  const capas = fuenteCapas(spatialGeometries);
  const labelCapa = (key: string) => {
    const g = MAP_GEOMETRY_LAYER_GROUPS.find((x) => x.key === key);
    return g ? g.label : key;
  };

  return (
    <section className="mapa-lectura" aria-labelledby="mapa-lectura-titulo">
      <h3 id="mapa-lectura-titulo">Lectura del mapa en texto (equivalente accesible)</h3>
      <p className="section-caption" role="status" aria-live="polite">
        Equivalente textual del mapa (WCAG 1.4.1): territorios en el orden del dataset con sus capas y conteos. Jamás ranking entre territorios (R5/ADR-036); sin dato ingerido se declara la ausencia (R15: null ≠ 0).
      </p>
      {territorios.length === 0 ? (
        <p role="status" aria-live="polite">
          Directorio de territorios sin dato cargado todavía: ausencia declarada, no un cero (R15).
        </p>
      ) : (
        <ul className="mapa-lectura__lista">
          {territorios.map((t) => (
            <li key={t.key}>
              {textoFilaTerritorio(t, porNodo.get(t.key) ?? null)}{' '}
              <a className="mapa-lectura__enlace" href={'#nodo/' + t.key}>
                Ver todos los datos del nodo
              </a>
            </li>
          ))}
        </ul>
      )}

      <h4>Fuente de esta capa</h4>
      {capas.capas.map((c) => {
        const grupo = MAP_GEOMETRY_LAYER_GROUPS.find((g) => g.key === c.capa);
        const regimen = grupo && grupo.boundaryStatus === 'provisional' ? ' · Capa provisional (hipótesis v0.1, IT-R3): jamás traza oficial.' : '';
        return (
          <div key={c.capa} className="mapa-lectura__capa">
            <DatoConFuente
              etiqueta={labelCapa(c.capa)}
              valor={c.total === 0 ? null : c.total}
              unidad="geometría(s)"
              pie={FUENTE_CAPAS + ' · cobertura: ' + coberturaCapa(c) + regimen}
            />
          </div>
        );
      })}
      <PieDeFuente texto={'Fuente única de capas y clasificación: MAP_GEOMETRY_LAYER_GROUPS + classifySpatialGeometryLayer (TerritoriosMap). Datos: ' + FUENTE_CAPAS + '.'} />
    </section>
  );
}

import { MAP_GEOMETRY_LAYER_GROUPS } from './TerritoriosMap';
import { conteosTerritoriales, FUENTE_CONTEOS_TERRITORIALES } from './conteosTerritoriales';
import { STATUS_META } from '../data/federatedModel';
import type { SpatialGeometryRecord } from '../data/federatedModel';
import type { Territorio } from '../App';

/**
 * INTER-TERR IT-R4 (#613, épica #607 / NCAP-R5): conteos territoriales honestos
 * por nodo y capa con cobertura (estado epistémico) y fecha (trimestre mayor
 * presente en los datos — regla LIC-01/LIC-02). Jamás puntaje global ni
 * comparación entre nodos (R5/ADR-036); nodos en el orden del dataset.
 * WCAG 2.2 AA (ADR-061): el panel es texto y vive en las dos ramas del mapa
 * (alternativa textual sin API key y mapa digital), aria-live polite (EV-122).
 */

interface ConteosTerritorialesPanelProps {
  spatialGeometries: SpatialGeometryRecord[];
  territorios: Territorio[];
}

export function ConteosTerritorialesPanel({
  spatialGeometries,
  territorios,
}: ConteosTerritorialesPanelProps) {
  const conteo = conteosTerritoriales(spatialGeometries);

  const nombreNodo = (nodeKey: string) => {
    const t = territorios.find((x) => x.key === nodeKey);
    return t ? t.nombre + ' (' + t.provincia + ')' : nodeKey;
  };

  const coberturaLa = (c: { total: number; porEstado: Record<string, number>; estadoOtroCrudo: string[]; ultimoQuarter: string | null }) => {
    if (c.total === 0) return "0 — sin geometrías ingeridas en esta capa y nodo (ausencia declarada, R15)";
    const partes: string[] = [];
    for (const [estado, n] of Object.entries(c.porEstado)) {
      const meta = STATUS_META[estado];
      partes.push((meta?.label ?? estado) + ' ' + n);
    }
    for (const crudo of c.estadoOtroCrudo) {
      partes.push('estado crudo sin categoría: ' + crudo);
    }
    const fecha = c.ultimoQuarter ? ' · corte multitemporal: mayor trimestre presente en los datos = ' + c.ultimoQuarter : '';
    return partes.join(" · ") + fecha;
  };

  return (
    <div className="conteos-territoriales" style={{ marginTop: "0.85rem" }}>
      <h3>Conteos territoriales por nodo y capa</h3>
      <p className="section-caption" role="status" aria-live="polite">
        Regla LIC-01/LIC-02: cada conteo declara cobertura (estado epistémico de cada geometría) y fecha (mayor trimestre presente en los datos, nunca fabricada). Jamás puntaje global ni comparación entre nodos (R5/ADR-036): los nodos se listan en el orden del dataset. Fuente: <code>{conteo.fuente}</code>.
      </p>
      {conteo.nodos.length === 0 ? (
        <p>
          Sin geometrías territoriales ingeridas todavía: el conteo 0 por capa y nodo es el
          estado REAL del corpus (R15) — es ausencia declarada de dato ingerido, no un
          «cero completo» con cobertura.
        </p>
      ) : (
        conteo.nodos.map((n) => (
          <div key={n.nodeKey} className="conteo-nodo" style={{ marginTop: "0.5rem" }}>
            <strong>Nodo: {nombreNodo(n.nodeKey)}</strong> — {n.total} geometría(s) en total
            <ul>
              {MAP_GEOMETRY_LAYER_GROUPS.map((group) => {
                const c = n.porCapa[group.key];
                return (
                  <li key={group.key}>
                    {group.label}: {coberturaLa(c)}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

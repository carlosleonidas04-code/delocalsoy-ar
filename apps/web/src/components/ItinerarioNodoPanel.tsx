import { useEffect, useState } from 'react';
import { crearClienteA1, ErrorA1, type ObservatorioNodo } from '../lib/artefactoA1';
import type { Territorio } from '../lib/territorioTypes';

/** Cliente de LECTURA PÚBLICA sin sesión: todos los GET del itinerario son
 * públicos (observatorio EV-115, reportes CORE-003, fichas #149). */
const cliente = crearClienteA1({
  transporte: (ruta, init) => fetch(ruta, init as RequestInit | undefined),
  token: () => null,
});

type EstadoSuperficie = 'cargando' | 'ok' | 'vacias' | 'noencontrado' | 'sinconexion';

const MENSAJES_SUPERFICIE: Record<EstadoSuperficie, string> = {
  cargando: 'cargando…',
  ok: '',
  vacias: 'la superficie no devolvió datos aún (ausencia declarada, null ≠ 0 — R15)',
  noencontrado: 'el nodo no fue encontrado en esta superficie (HTTP 404)',
  sinconexion: 'sin conexión a la plataforma en este momento',
};

export interface ItinerarioNodoPanelProps {
  /** Clave pedida en el hash «#nodo/:key» (el string crudo se declara, jamás se inventa). */
  nodoKey: string;
  /** Nodo del directorio vivo (territorios con key === nodoKey), o null. */
  nodo: Territorio | null;
  /** El directorio aún está cargando: estado honesto mientras tanto (R15). */
  cargandoDirectorio: boolean;
  /** Foco + scroll al mapa de entrada (#cartografia-entrada), handler existente de App. */
  onEnfocarSobreMapa: (territorioId: string) => void;
}

/**
 * IT-R5 (#614, épica INTER-TERR #607): itinerario por nodo — compone mapa +
 * observatorio + reportes + fichas de UN nodo. Navegación, no comparación
 * (R5/ADR-036: la superficie lista el nodo, jamás ranking entre nodos);
 * lectura 100 % pública (la escritura exige sesión y sigue en A1, ADR-084);
 * WCAG 2.2 AA: 1.4.1 textual + aria-live por sección (patrón EV-122) +
 * touch targets 44 px (token --touch-target-min).
 */
export function ItinerarioNodoPanel(props: ItinerarioNodoPanelProps) {
  const { nodoKey, nodo, cargandoDirectorio, onEnfocarSobreMapa } = props;
  const [observatorio, setObservatorio] = useState<ObservatorioNodo | null>(null);
  const [estadoObs, setEstadoObs] = useState<EstadoSuperficie>('cargando');
  const [totalReportes, setTotalReportes] = useState<number | null>(null);
  const [estadoReportes, setEstadoReportes] = useState<EstadoSuperficie>('cargando');
  const [totalFichas, setTotalFichas] = useState<number | null>(null);
  const [estadoFichas, setEstadoFichas] = useState<EstadoSuperficie>('cargando');

  useEffect(() => {
    let vivo = true;
    setEstadoObs('cargando');
    setObservatorio(null);
    cliente
      .observatorio(nodoKey)
      .then((obs) => {
        if (vivo) {
          setObservatorio(obs);
          setEstadoObs(obs.kpis.snapshots.length === 0 ? 'vacias' : 'ok');
        }
      })
      .catch((e: unknown) => {
        if (vivo) {
          setEstadoObs(e instanceof ErrorA1 && e.codigo === 'nodo' ? 'noencontrado' : 'sinconexion');
        }
      });
    return () => {
      vivo = false;
    };
  }, [nodoKey]);

  useEffect(() => {
    let vivo = true;
    setEstadoReportes('cargando');
    setTotalReportes(null);
    cliente
      .reportesPublicos(nodoKey)
      .then((r) => {
        if (vivo) {
          setTotalReportes(r.length);
          setEstadoReportes(r.length === 0 ? 'vacias' : 'ok');
        }
      })
      .catch((e: unknown) => {
        if (vivo) {
          setEstadoReportes(e instanceof ErrorA1 && e.codigo === 'nodo' ? 'noencontrado' : 'sinconexion');
        }
      });
    return () => {
      vivo = false;
    };
  }, [nodoKey]);

  useEffect(() => {
    let vivo = true;
    setEstadoFichas('cargando');
    setTotalFichas(null);
    cliente
      .fichas({ nodo: nodoKey })
      .then((fs) => {
        if (vivo) {
          setTotalFichas(fs.length);
          setEstadoFichas(fs.length === 0 ? 'vacias' : 'ok');
        }
      })
      .catch(() => {
        if (vivo) {
          setEstadoFichas('sinconexion');
        }
      });
    return () => {
      vivo = false;
    };
  }, [nodoKey]);

  const textoReportes = estadoReportes === 'ok' ? String(totalReportes ?? 0) : MENSAJES_SUPERFICIE[estadoReportes];
  const textoFichas = estadoFichas === 'ok' ? String(totalFichas ?? 0) : MENSAJES_SUPERFICIE[estadoFichas];

  return (
    <section className="card" data-state="ok">
      <h2>Itinerario del nodo</h2>

      {cargandoDirectorio && (
        <p role="status" aria-live="polite">
          El directorio de territorios está cargando… la clave «{nodoKey}» se resuelve contra el directorio vivo.
        </p>
      )}

      {!cargandoDirectorio && nodo === null && (
        <p role="alert" aria-live="polite">
          No hay nodo «{nodoKey}» en el directorio vivo: la clave pedida en el vínculo se declara, jamás se inventa. Volvé a la entrada del mapa.
        </p>
      )}

      {!cargandoDirectorio && nodo !== null && (
        <p>
          <strong>{nodo.nombre}</strong> ({nodo.provincia}) — {nodo.activo ? "Activo" : "Inactivo"} · clave <code>{nodo.key}</code>
        </p>
      )}

      {nodo !== null && (
        <p>
          <button
            type="button"
            style={{ minHeight: "var(--touch-target-min)", minWidth: "var(--touch-target-min)" }}
            onClick={() => onEnfocarSobreMapa(nodo.id)}
          >
            Foco en el mapa de {nodo.nombre}
          </button>
          {" "}— el foco hace scroll a la entrada territorial (#cartografia-entrada, IT-R1).
        </p>
      )}

      <h3>Observatorio del nodo — valor con cobertura y fecha (LIC-01/LIC-02: null ≠ 0, jamás puntaje)</h3>
      {estadoObs === "ok" && observatorio !== null ? (
        <div>
          <p>{observatorio.kpis.nota}</p>
          <ul>
            {observatorio.kpis.snapshots.map((s) => (
              <li key={s.kpi_key}>
                <code>{s.kpi_key}</code>: {s.valor === null ? "sin dato (null ≠ 0)" : s.valor} · computado {s.computed_at === "" ? "sin fecha declarada" : s.computed_at}
                {" "}· detalles: {Object.keys(s.detalles).length === 0 ? "sin detalles" : JSON.stringify(s.detalles)}
              </li>
            ))}
          </ul>
          <p>
            Fecha de corte: {observatorio.kpis.fecha_corte === null ? "sin dato" : observatorio.kpis.fecha_corte} · regla: {observatorio.regla}
          </p>
          <p>
            Familias sin fuente ingestado: {observatorio.familias_sin_fuente_ingestada.length} — la ausencia se declara, jamás se estima.
          </p>
        </div>
      ) : (
        <p role={estadoObs === "cargando" ? "status" : "alert"} aria-live="polite">{MENSAJES_SUPERFICIE[estadoObs]}</p>
      )}

      <h3>Reportes y fichas del nodo (lectura pública; reportar exige sesión y vive en A1 — ADR-084)</h3>
      <ul>
        <li>Reportes públicos: {textoReportes}</li>
        <li>Fichas de valoración: {textoFichas}</li>
      </ul>
    </section>
  );
}

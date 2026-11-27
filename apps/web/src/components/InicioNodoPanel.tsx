// REF-R6 (#639, épica REF #633): Inicio como puerta del nodo — nodo actual
// (monograma de identidad), 3 acciones equivalentes (R5/ADR-036: sin acción
// primaria, sin ranking) y datos del nodo vía GET /api/nodos/{key}/observatorio
// (PIZ-R1/EV-115, LIC-01/LIC-02) con DatoConFuente (REF-R5). Solo lectura
// pública (la escritura sigue solo en A1 — ADR-084); R15: null ≠ 0 y 0 honesto
// sin corrida del worker; WCAG 2.2 AA: 1.4.1 textual + aria-live 4.1.3
// (patrón EV-122) + touch targets 44 px (ADR-061).

import { useEffect, useState } from 'react';
import { crearClienteA1, ErrorA1, type ObservatorioNodo } from '../lib/artefactoA1';
import { DelocalSoyNetworkLogoSvg } from '../lib/DelocalSoyBrand';
import { DatoConFuente } from './base/DatoConFuente';
import { PieDeFuente } from './base/PieDeFuente';
import type { Territorio } from '../lib/territorioTypes';

/** Cliente de LECTURA PÚBLICA sin sesión (mismo patrón de ItinerarioNodoPanel). */
const cliente = crearClienteA1({
  transporte: (ruta, init) => fetch(ruta, init as RequestInit | undefined),
  token: () => null,
});

type EstadoSuperficie = 'cargando' | 'ok' | 'vacias' | 'noencontrado' | 'sinconexion';

const MENSAJES_SUPERFICIE: Record<EstadoSuperficie, string> = {
  cargando: 'cargando datos del nodo…',
  ok: '',
  vacias: 'el observatorio no devolvió indicadores aún (ausencia declarada, null ≠ 0)',
  noencontrado: 'el nodo no fue encontrado en el observatorio (HTTP 404)',
  sinconexion: 'sin conexión a la plataforma en este momento',
};

/** Unidad humana por clave de KPI (el código de la clave nunca se muestra — REF-R4). */
const UNIDADES: Record<string, string> = {
  reportes_por_estado: 'reportes',
  fuentes_ingestadas_por_nodo: 'fuentes',
  capas_con_metadatos: 'capas',
  cobertura_reportes_distrito: 'reportes',
  tramos_con_relevamiento: 'tramos',
};

/** Etiqueta humana por clave de KPI (sin códigos en el texto visible — REF-R4). */
const ETIQUETAS_KPI: Record<string, string> = {
  reportes_por_estado: 'Reportes por estado',
  fuentes_ingestadas_por_nodo: 'Fuentes ingestadas',
  capas_con_metadatos: 'Capas con metadatos',
  cobertura_reportes_distrito: 'Cobertura de reportes del distrito',
  tramos_con_relevamiento: 'Tramos con relevamiento',
};

/** Las 3 acciones de la puerta, equivalentes entre sí (R5/ADR-036). */
const ACCIONES = [
  { hash: '#reportar', titulo: 'Reportar un problema', descripcion: 'contar un hecho observable del territorio' },
  { hash: '#mapa', titulo: 'Ver el mapa', descripcion: 'cartografía del territorio, nodos e itinerarios' },
  { hash: '#preguntar', titulo: 'Preguntarle al asistente', descripcion: 'preguntar al nodo y leer la fuente' },
] as const;

export interface InicioNodoPanelProps {
  /** Clave del nodo actual (estado de navegación de App, no sesión). */
  nodoKey: string;
  /** Nodo del directorio vivo, o null mientras carga (R15: se declara, no se inventa). */
  nodo: Territorio | null;
}

/** Cobertura honesta desde los detalles del snapshot: solo si la fuente declara con/total. */
export function coberturaDeDetalles(detalles: Record<string, number>): { con: number; total: number } | null {
  const con = detalles['con'];
  const total = detalles['total'];
  return typeof con === 'number' && typeof total === 'number' && Number.isFinite(con) && Number.isFinite(total)
    ? { con, total }
    : null;
}

export function InicioNodoPanel({ nodoKey, nodo }: InicioNodoPanelProps) {
  const [observatorio, setObservatorio] = useState<ObservatorioNodo | null>(null);
  const [estadoObs, setEstadoObs] = useState<EstadoSuperficie>('cargando');

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

  const fichaDe = (clave: string) => observatorio?.fichas_metodologicas.find((f) => f.clave === clave) ?? null;
  const nombreNodo = nodo?.nombre ?? 'nodo en carga (el directorio aún no lo reporta)';

  return (
    <section className="inicio-nodo card" id="inicio-nodo" aria-labelledby="inicio-nodo-titulo">
      <h2 id="inicio-nodo-titulo">Tu nodo</h2>

      {/* Nodo actual: monograma de identidad + nombre (solo lectura; el cambio
          de nodo vive en el destino Mapa — navegación, no comparación, R5). */}
      <div className="inicio-nodo__identidad">
        <DelocalSoyNetworkLogoSvg size={56} />
        <div>
          <p className="inicio-nodo__nombre">{nombreNodo}</p>
          <p className="inicio-nodo__rotulo">nodo actual</p>
        </div>
      </div>

      {/* 3 acciones equivalentes (sin acción primaria, R5/ADR-036). */}
      <nav className="inicio-nodo__acciones" aria-label="Acciones del nodo">
        {ACCIONES.map((a) => (
          <a key={a.hash} href={a.hash} className="inicio-nodo__accion">
            <strong>{a.titulo}</strong>
            <span>{a.descripcion}</span>
          </a>
        ))}
      </nav>

      {/* Datos del nodo: observatorio público con DatoConFuente (REF-R5). */}
      <h3>Datos del nodo</h3>
      {estadoObs === 'ok' && observatorio !== null ? (
        <div className="inicio-nodo__datos">
          <p>{observatorio.kpis.nota}</p>
          <div className="inicio-nodo__grilla">
            {observatorio.kpis.snapshots.map((s) => (
              <DatoConFuente
                key={s.kpi_key}
                etiqueta={ETIQUETAS_KPI[s.kpi_key] ?? s.kpi_key}
                valor={s.valor}
                unidad={UNIDADES[s.kpi_key]}
                fuenteLabel={fichaDe(s.kpi_key)?.fuente ?? 'observatorio del nodo'}
                fechaCorte={s.computed_at === '' ? null : s.computed_at}
                cobertura={coberturaDeDetalles(s.detalles)}
              />
            ))}
          </div>
          {observatorio.familias_sin_fuente_ingestada.length > 0 && (
            <p className="inicio-nodo__familias">
              {observatorio.familias_sin_fuente_ingestada.length} familias del temario aún no tienen fuente ingestado — la
              ausencia se declara, jamás se estima.
            </p>
          )}
          <PieDeFuente
            texto={`Observatorio del nodo · corte: ${observatorio.kpis.fecha_corte === null ? 'sin fecha declarada' : observatorio.kpis.fecha_corte} · regla: ${observatorio.regla}`}
          />
          <p>
            <a href={`#nodo/${nodoKey}`}>Ver todos los datos del nodo</a> — itinerario completo con mapa, observatorio,
            reportes y fichas.
          </p>
        </div>
      ) : (
        <p role={estadoObs === 'cargando' ? 'status' : 'alert'} aria-live="polite">
          {MENSAJES_SUPERFICIE[estadoObs]}
        </p>
      )}
    </section>
  );
}

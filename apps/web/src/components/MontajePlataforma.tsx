/**
 * apps/web/src/components/MontajePlataforma.tsx
 * -----------------------------------------------------------------------------
 * DELocalSoy.AR — MONTAR-2 (#445): vista consolidadora del montaje de la
 * plataforma — la vista definitiva que APILA todo el artefacto: superficie
 * real, nodos federados con su montaje ratificado, artefactos A1–A4, stages
 * armonizados y acreditación de compilación. Catálogo declarativo y suite de
 * invariantes en src/lib/montajePlataforma(.test).ts (fuente única).
 */
import {
  agruparPorCapa,
  ETIQUETA_ESTADO,
  MONTAJE_PLATAFORMA,
} from '../lib/montajePlataforma';

const irA = (ancla: string): void => {
  const destino = document.getElementById(ancla);
  if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function BotonIr({ ancla }: { ancla: string }) {
  return (
    <button type="button" onClick={() => irA(ancla)} style={{ minHeight: 24, minWidth: 24 }}>
      ir →
    </button>
  );
}

export function MontajePlataforma() {
  const capas = agruparPorCapa(MONTAJE_PLATAFORMA);
  return (
    <section className="card" id="montaje-plataforma">
      <h2>Montaje de la plataforma — vista definitiva (MONTAR-2 #445)</h2>
      <p>
        La vista consolidadora que APILA todo el montaje del artefacto: la superficie real de la
        plataforma, los nodos federados con su montaje ratificado, los artefactos A1–A4, los
        stages armonizados y la acreditación de compilación. Cada bloque declara su estado
        epistémico y su fuente (R15: nada se declara sin ancla).
      </p>
      <p role="status">
        {MONTAJE_PLATAFORMA.length} bloques apilados en {capas.length} capas.
      </p>
      {capas.map((capa) => (
        <div key={capa.capa}>
          <h3>{capa.titulo}</h3>
          <p>
            <small>{capa.descripcion}</small>
          </p>
          <ul>
            {capa.bloques.map((b) => (
              <li key={b.id}>
                <strong>{b.titulo}</strong> — <span>{ETIQUETA_ESTADO[b.estado]}</span>
                <br />
                <small>{b.detalle}</small>
                <br />
                <small>
                  <code>{b.fuente}</code>
                  {b.ancla ? <BotonIr ancla={b.ancla} /> : null}
                </small>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p>
        <small>
          R15: los stages son material ilustrativo de diseño (jamás acreditado) y la
          acreditación full-stack queda pending hasta la corrida real en Codespaces con el
          checklist del README — EV-102 al pegar la salida en #445.
        </small>
      </p>
    </section>
  );
}

export default MontajePlataforma;

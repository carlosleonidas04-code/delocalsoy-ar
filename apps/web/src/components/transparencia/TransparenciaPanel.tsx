// REF-R11 (#644, épica REF #633): panel organizador de la Capa Transparencia
// bajo #lab — registro de aterrizajes, reglas y decisiones, y galería de
// estados honestos (los componentes base de REF-R5 se quedan tal cual; ahora
// viven dentro de este panel, mismo id galeria-estados-demo). Presentación
// pura: 0 pedidos de red, 0 escritura (ADR-084); datos del lib declarado.

import { DatoConFuente } from '../base/DatoConFuente';
import { GaleriaEstados } from '../base/GaleriaEstados';
import { PieDeFuente } from '../base/PieDeFuente';
import {
  DATOS_CONTRATO,
  DECISIONES_TRANSPARENCIA,
  NOTA_REGISTRO_EV,
  REGLAS_TRANSPARENCIA,
  REGISTRO_EV,
} from '../../lib/transparencia';

export function TransparenciaPanel() {
  return (
    <section className="transparencia" aria-labelledby="transparencia-titulo">
      <h2 id="transparencia-titulo">Transparencia: registro, reglas y estados</h2>
      <p>
        Superficie para el equipo y la auditoría. Los códigos de ingeniería viven acá por
        diseño (decisión de la interfaz refundada): este es su domicilio.
      </p>

      <section className="card" aria-labelledby="transparencia-registro-titulo">
        <h3 id="transparencia-registro-titulo">Registro de aterrizajes (EV-114 → EV-144)</h3>
        <table className="transparencia-tabla">
          <thead>
            <tr>
              <th scope="col">Aterrizaje</th>
              <th scope="col">Contenido</th>
              <th scope="col">Cuestión</th>
              <th scope="col">PR</th>
            </tr>
          </thead>
          <tbody>
            {REGISTRO_EV.map((entrada) => (
              <tr key={entrada.ev}>
                <td>EV-{entrada.ev}</td>
                <td>{entrada.titulo}</td>
                <td>
                  <a href={'https://github.com/carlosleonidas04-code/delocalsoy-ar/issues/' + entrada.issue}>
                    #{entrada.issue}
                  </a>
                </td>
                <td>
                  <a href={'https://github.com/carlosleonidas04-code/delocalsoy-ar/pull/' + entrada.pr}>
                    PR #{entrada.pr}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><small>{NOTA_REGISTRO_EV}</small></p>
      </section>

      <section className="card" aria-labelledby="transparencia-reglas-titulo">
        <h3 id="transparencia-reglas-titulo">Reglas del método</h3>
        <dl className="transparencia-reglas">
          {REGLAS_TRANSPARENCIA.map((regla) => (
            <div key={regla.clave}>
              <dt>{regla.clave}</dt>
              <dd>{regla.texto}</dd>
            </div>
          ))}
        </dl>
        <h3>Decisiones registradas</h3>
        <dl className="transparencia-reglas">
          {DECISIONES_TRANSPARENCIA.map((decision) => (
            <div key={decision.ref}>
              <dt>{decision.ref}</dt>
              <dd>{decision.texto}</dd>
            </div>
          ))}
        </dl>
        <p>
          <small>
            Contrato abierto declarado: openapi v{DATOS_CONTRATO.openapiVersion} con {DATOS_CONTRATO.paths} rutas ·
            matriz de sellos: {DATOS_CONTRATO.matrizSellos} sellos.
          </small>
        </p>
      </section>

      <section className="card" id="galeria-estados-demo" aria-labelledby="galeria-estados-demo-titulo">
        <h3 id="galeria-estados-demo-titulo">Estados honestos: galería (componentes base REF-R5)</h3>
        <GaleriaEstados />
        <div className="dato-con-fuente-demo">
          <DatoConFuente
            etiqueta="Ejemplo completo"
            valor={12}
            unidad="familias"
            fuenteLabel="datos de ejemplo (demostración)"
            fechaCorte="2026-11-27"
            cobertura={{ con: 12, total: 12 }}
          />
          <DatoConFuente
            etiqueta="Ejemplo parcial"
            valor={5}
            unidad="familias"
            fuenteLabel="datos de ejemplo (demostración)"
            fechaCorte="2026-11-27"
            cobertura={{ con: 5, total: 12 }}
          />
          <DatoConFuente
            etiqueta="Ejemplo sin dato"
            valor={null}
            fuenteLabel="demostración honesta: la ausencia se declara"
            fechaCorte={null}
            cobertura={null}
          />
        </div>
        <PieDeFuente texto="Demo de REF-R5 (#638, épica #633): nada de esto se mide, es la superficie de prueba de los componentes base." />
      </section>
    </section>
  );
}

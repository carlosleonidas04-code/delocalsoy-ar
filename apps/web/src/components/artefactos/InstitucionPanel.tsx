/**
 * DELocalSoy.AR — InstitucionPanel (INSTITUCION-1, #628): manifestación
 * funcional de la institución de la plataforma como desarrollo territorial
 * íntegro (decisión DH 2026-11-27: montaje en ArtefactosRoot, sin tocar
 * App.tsx / M0). 0 rutas nuevas: el contenido es declarado por
 * lib/institucion.ts (fuente única, R15). Accesibilidad: patrón
 * EV-122/EV-133 (aria-labelledby, región role=status aria-live=polite,
 * texto plano WCAG 1.4.1, contraste por tokens, sin controles:
 * 0 touch targets requeridos).
 */
import {
  DECLARACION,
  ESTADO_ACTO,
  FASES_SIGUIENTES,
  FUNDAMENTO_EPICAS,
  REGLAS_INNEGOCIABLES,
  VACIOS_HONESTOS,
  resumenInstitucion,
} from '../../lib/institucion';

export function InstitucionPanel() {
  const resumen = resumenInstitucion();
  return (
    <section id="institucion" aria-labelledby="institucion-titulo">
      <h2 id="institucion-titulo">La plataforma instituida</h2>
      <p role="status" aria-live="polite">
        {ESTADO_ACTO}
      </p>
      <p>{DECLARACION}</p>
      <h3>Fundamento acreditado ({resumen.epicas} épicas)</h3>
      <ul>
        {FUNDAMENTO_EPICAS.map((e) => (
          <li key={'epica-' + e.epica}>
            <a href={e.enlace}>épica #{e.epica}: {e.titulo}</a> ({e.registro})
          </li>
        ))}
      </ul>
      <h3>Vacíos honestos declarados (R15: un vacío se declara, nunca se disimula)</h3>
      <ul>
        {VACIOS_HONESTOS.map((v) => (
          <li key={'vacio-' + v.tema}>
            <strong>{v.tema}</strong> ({v.estado}): {v.detalle}
          </li>
        ))}
      </ul>
      <h3>Reglas innegociables ({resumen.reglas})</h3>
      <ul>
        {REGLAS_INNEGOCIABLES.map((r, i) => (
          <li key={'regla-' + i}>{r}</li>
        ))}
      </ul>
      <h3>Fases siguientes ({resumen.fases})</h3>
      <ul>
        {FASES_SIGUIENTES.map((f) => (
          <li key={'fase-' + f.fase}>
            <strong>{f.fase}</strong>: {f.detalle}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default InstitucionPanel;

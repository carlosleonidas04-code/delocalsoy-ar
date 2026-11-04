/**
 * Header del Estudio de Diseño Heurístico y Recursivo Frontend (ADR-034 · v7.7).
 * Extraído 1:1 desde App.tsx (FE-DEUDA-02 #293, corte 23): JSX verbatim,
 * cero dependencias de estado de App — componente estático sin props.
 */
export function DesignStudioHeader() {
  return (
    <div className="section-header">
      <div>
        <span className="kicker-text">
          Arquitectura Visual &amp; Heurística Internacional · Proceso Recursivo Modelo Base → Píxel (ADR-034 · v7.7)
        </span>
        <h2>
          Estudio Formal de Diseño Frontend y Lentes Cognitivas del Ecosistema
        </h2>
        <p className="section-caption">
          Cada decisión estética y de interacción responde recursivamente a los{' '}
          <strong>19 modelos Prisma</strong>, los{' '}
          <strong>13 módulos de dominio</strong>, los contratos{' '}
          <code>@delocalsoy/contracts</code> y la identidad de los{' '}
          <strong>3 departamentos de San Juan</strong>. Usá las{' '}
          <strong>Lentes Cognitivas</strong> para enfocar el área de trabajo o mantener la vista integral.
        </p>
      </div>
    </div>
  );
}

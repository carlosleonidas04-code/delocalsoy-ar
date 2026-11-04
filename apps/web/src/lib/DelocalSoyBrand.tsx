/**
 * DELocalSoy.AR — Marca (isologo + wordmark) — módulo de PRODUCTO.
 *
 * Extracción 1:1 (refactor /lab, PR-1) desde components/BaseConsolidadaPrototype.tsx:
 * COLORS, DelocalSoyNetworkLogoSvg y DelocalSoyWordmark son verbatim; solo mudan de
 * módulo para que TopBarHeader (producto) no importe el archivo lab de ~177 KB.
 */
export const COLORS = {
  bg: '#0D0B08',
  bgCard: '#181410',
  bgCardHover: '#1F1A14',
  border: '#332C22',
  celeste: '#75AADB',
  dorado: '#FFC72C',
  ambar: '#F2A71B',
  texto: '#F5F1E8',
  textoSuave: '#B8AFA0',
  textoTenue: '#7A7264',
  verde: '#4ADE80',
} as const;

export function DelocalSoyNetworkLogoSvg({
  size = 110,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Isologo Red Federada DELocalSoy.AR"
      style={{ flexShrink: 0 }}
    >
      {/* Líneas de conexión perimetrales y radiales de la red federada */}
      <g stroke="#F5F1E8" strokeOpacity="0.22" strokeWidth="1.25">
        {/* Conexiones desde el nodo central dorado (58, 56) hacia los 5 nodos */}
        <line x1="58" y1="56" x2="25" y2="24" />
        <line x1="58" y1="56" x2="92" y2="21" />
        <line x1="58" y1="56" x2="99" y2="67" />
        <line x1="58" y1="56" x2="31" y2="94" />
        <line x1="58" y1="56" x2="74" y2="102" />
        {/* Conexiones perimetrales de la constelación */}
        <line x1="25" y1="24" x2="92" y2="21" strokeOpacity="0.14" />
        <line x1="92" y1="21" x2="99" y2="67" strokeOpacity="0.14" />
        <line x1="99" y1="67" x2="74" y2="102" strokeOpacity="0.16" />
        <line x1="31" y1="94" x2="74" y2="102" strokeOpacity="0.16" />
      </g>

      {/* Nodo superior izquierdo — Celeste #75AADB */}
      <circle cx="25" cy="24" r="10.5" fill={COLORS.celeste} />

      {/* Nodo superior derecho — Marfil #F5F1E8 */}
      <circle cx="92" cy="21" r="9" fill={COLORS.texto} />

      {/* Nodo central principal — Dorado #FFC72C */}
      <circle cx="58" cy="56" r="17.5" fill={COLORS.dorado} />

      {/* Nodo medio derecho — Celeste #75AADB */}
      <circle cx="99" cy="67" r="12" fill={COLORS.celeste} />

      {/* Nodo inferior izquierdo — Marfil #F5F1E8 */}
      <circle cx="31" cy="94" r="10" fill={COLORS.texto} />

      {/* Nodo inferior derecho — Celeste #75AADB */}
      <circle cx="74" cy="102" r="7" fill={COLORS.celeste} />
    </svg>
  );
}

export function DelocalSoyWordmark({
  fontSize = '26px',
}: {
  fontSize?: string;
}) {
  return (
    <span
      style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontWeight: 800,
        fontSize,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
    >
      <span style={{ color: COLORS.celeste }}>DE</span>
      <span style={{ color: COLORS.texto }}>Local</span>
      <span style={{ color: COLORS.celeste }}>Soy</span>
      <span style={{ color: COLORS.dorado }}>.AR</span>
    </span>
  );
}

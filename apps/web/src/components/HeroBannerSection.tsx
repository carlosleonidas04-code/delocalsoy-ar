/**
 * DELocalSoy.AR — Hero / Síntesis Ejecutiva de Horizontes 1, 2, 3 y 4 en la
 * Provincia de San Juan — FE-DEUDA-02 #293 (corte 5 de desmonolitización de
 * App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): mismo
 * kicker HITUB, mismo titular, misma síntesis H1–H4 y misma franja de métricas.
 * Los conteos provienen de estado/memos de App y se acoplan por props.
 */
export interface HeroBannerSectionProps {
  territoriosCount: number;
  spatialGeometriesCount: number;
  lineageChainCount: number;
  evidenciasOkCount: number;
}

export function HeroBannerSection({
  territoriosCount,
  spatialGeometriesCount,
  lineageChainCount,
  evidenciasOkCount,
}: HeroBannerSectionProps) {
  return (
    <section className="hero-banner">
      <div className="kicker-text">
        Hub de Transformación e Innovación Territorial (HITUB) · Provincia de San Juan (Capital · Caucete · Iglesia)
      </div>
      <h1>
        El Modelo Territorial como Innovación · El Software como Producto Ejecutable
      </h1>
      <p className="subtitle">
        Proceso heurístico integral desplegado sobre tres departamentos de la <strong>Provincia de San Juan</strong>:{' '}
        <strong>Capital (Distrito Centro y Distrito Desamparados)</strong>, <strong>Caucete</strong> e{' '}
        <strong>Iglesia</strong>, articulando Soberanía Semántica (H1), Morfología PostGIS{' '}
        <code>SRID=4326</code> (H2), Linaje <code>SHA-256</code> y Observatorio Federado (H3), y Operación en
        Terreno con <code>ST_Intersects</code>, Campo Offline-First, Firmas <code>Ed25519</code> y Telemetría
        Hídrica (H4) — con arquitectura abierta para su pronta extensión futura a nuevos departamentos.
      </p>

      <div className="hero-metrics-strip tabular-nums">
        <div>
          <strong>{territoriosCount}</strong>
          <span>Departamentos San Juan (H1)</span>
        </div>
        <div>
          <strong>{spatialGeometriesCount}</strong>
          <span>Geometrías PostGIS (H2)</span>
        </div>
        <div>
          <strong>{lineageChainCount}</strong>
          <span>Eslabones SHA-256 (H3)</span>
        </div>
        <div>
          <strong>6/6 + 6/6</strong>
          <span>CORE-001 y CORE-002 (main @ e3616b5)</span>
        </div>
        <div>
          <strong>
            13/13 main · {evidenciasOkCount}/18 staging
          </strong>
          <span>EV-001..006 + EV-019..025 en main</span>
        </div>
      </div>
    </section>
  );
}

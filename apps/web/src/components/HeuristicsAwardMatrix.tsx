/**
 * DELocalSoy.AR — Matriz de las 6 Heurísticas de Premiación Internacional en
 * Innovación Territorial (H-TER-01 a H-TER-06) — FE-DEUDA-02 #293 (corte 13 de
 * desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento):
 * las 6 heurísticas H-TER con su botón "Inspeccionar en UI →" que conmuta el
 * lente cognitivo activo y hace scroll al ancla. Único acople por props:
 * onSelectDesignLens.
 */
import type { DesignLensKey } from './CognitiveLensSelector';

export interface HeuristicsAwardMatrixProps {
  onSelectDesignLens: (lens: DesignLensKey) => void;
}

export function HeuristicsAwardMatrix({
  onSelectDesignLens,
}: HeuristicsAwardMatrixProps) {
  return (
    <div className="coco-baba-triage-grid" style={{ marginTop: '0.85rem' }}>
      {[
        {
          code: 'H-TER-01',
          title: 'Materialidad Geológica 60-30-10',
          summary:
            '60% Lienzo Mineral (#F7F5F0 / #0B111E), 30% Superficie 1px hairline sin barras laterales decorativas, 10% Acento por departamento (Capital, Caucete, Iglesia).',
          lens: 'lens_atlas_coco_baba' as const,
          anchor: 'nodos-federados',
        },
        {
          code: 'H-TER-02',
          title: 'Tipografía 2+1 & Precisión Tabular',
          summary:
            'Fraunces (Display Editorial) + Plus Jakarta Sans (UI) + JetBrains Mono (tabular-nums) en coordenadas SRID=4326, SHA-256 y conteos.',
          lens: 'lens_vertical_r5ui' as const,
          anchor: 'plataforma-territorial-real',
        },
        {
          code: 'H-TER-03',
          title: 'Arquitectura por Lentes Cognitivas',
          summary:
            'Elimina la fatiga de desplazamiento lineal articulando el monorepo en 4 lentes de trabajo focalizado y 1 vista integral.',
          lens: 'all' as const,
          anchor: 'estudio-diseno-heuristico-frontend',
        },
        {
          code: 'H-TER-04',
          title: 'Dualidad Simbólico-Geodésica',
          summary:
            'Conexión en 1 clic entre el lienzo esquemático local (x, y) del Demo Base y la cartografía real PostGIS SRID=4326 en Google Maps.',
          lens: 'lens_atlas_coco_baba' as const,
          anchor: 'cartografia-workspace',
        },
        {
          code: 'H-TER-05',
          title: 'Honestidad Epistémica Visible (R5/R15)',
          summary:
            'Cero fallbacks silenciosos a [] ante errores HTTP; separación explícita de los 4 orígenes operativos y los 5 estados R5-UI.',
          lens: 'lens_epistemic_contracts' as const,
          anchor: 'demo-datasource-audit',
        },
        {
          code: 'H-TER-06',
          title: 'Soberanía & Push FCM en 1 Clic',
          summary:
            'Visibilidad permanente del custodio tripartito y despacho trazable de alertas Push FCM / Firestore ante cambios de soberanía.',
          lens: 'lens_sovereignty_fcm' as const,
          anchor: 'consola-admin-soberania',
        },
      ].map((h) => (
        <div key={h.code} className="coco-baba-triage-card">
          <div className="event-row-top">
            <code>{h.code}</code>
            <button
              type="button"
              className="btn-toggle"
              style={{ fontSize: '0.72rem', padding: '0.18rem 0.5rem' }}
              onClick={() => {
                onSelectDesignLens(h.lens);
                setTimeout(() => {
                  document
                    .getElementById(h.anchor)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 40);
              }}
            >
              Inspeccionar en UI →
            </button>
          </div>
          <strong style={{ display: 'block', marginTop: '0.25rem' }}>
            {h.title}
          </strong>
          <p className="territory-meta" style={{ marginTop: '0.25rem', marginBottom: 0 }}>
            {h.summary}
          </p>
        </div>
      ))}
    </div>
  );
}

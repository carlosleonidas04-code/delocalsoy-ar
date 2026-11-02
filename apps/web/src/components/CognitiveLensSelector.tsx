/**
 * DELocalSoy.AR — Selector Ejecutivo de Lentes Cognitivas del Estudio de Diseño
 * Heurístico y Recursivo (ADR-034) — FE-DEUDA-02 #293 (corte 7 de
 * desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): mismo
 * tablist H-TER-03 (Reducción de fatiga lineal) con las 5 lentes cognitivas de
 * lectura territorial. La lente activa y su setter permanecen en App y se
 * acoplan por props.
 */
export type DesignLensKey =
  | 'all'
  | 'lens_atlas_coco_baba'
  | 'lens_vertical_r5ui'
  | 'lens_sovereignty_fcm'
  | 'lens_epistemic_contracts';

export interface CognitiveLensSelectorProps {
  activeDesignLens: DesignLensKey;
  onSelectLens: (lens: DesignLensKey) => void;
}

export function CognitiveLensSelector({
  activeDesignLens,
  onSelectLens,
}: CognitiveLensSelectorProps) {
  return (
    <div
      className="cockpit-macro-tabs"
      role="tablist"
      aria-label="Lentes cognitivas de lectura territorial"
    >
      {(
        [
          {
            key: 'all',
            kicker: 'Lente 00 · Monorepo Completo',
            title: 'Vista Integral del Ecosistema',
          },
          {
            key: 'lens_atlas_coco_baba',
            kicker: 'Lente I · Demo Base + Cartografía',
            title: 'Atlas & Cockpit «Coco-Baba»',
          },
          {
            key: 'lens_vertical_r5ui',
            kicker: 'Lente II · 13 Módulos + 11 Eslabones',
            title: 'Flujo Vertical & Estados R5-UI',
          },
          {
            key: 'lens_sovereignty_fcm',
            kicker: 'Lente III · Admin + H2–H4 + Push FCM',
            title: 'Soberanía, PostGIS & Custodios',
          },
          {
            key: 'lens_epistemic_contracts',
            kicker: 'Lente IV · HITUB + C1–C5 + Copiloto IA',
            title: 'Epistemología & Contratos',
          },
        ] as const
      ).map((lens) => (
        <button
          key={lens.key}
          type="button"
          role="tab"
          aria-selected={activeDesignLens === lens.key}
          className={
            activeDesignLens === lens.key
              ? 'cockpit-macro-tab active'
              : 'cockpit-macro-tab'
          }
          onClick={() => onSelectLens(lens.key)}
        >
          <span className="tiny-label">{lens.kicker}</span>
          <strong>{lens.title}</strong>
        </button>
      ))}
    </div>
  );
}

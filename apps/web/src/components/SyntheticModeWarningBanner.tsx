/**
 * DELocalSoy.AR — Banner obligatorio Paso 6 cuando opera la fuente sintética
 * (VITE_MOCK_API=1 o modo synthetic) — FE-DEUDA-02 #293 (corte 3 de
 * desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro): mismo rol="alert", mismo
 * data-testid="synthetic-mode-warning-banner" y mismo texto de advertencia
 * (SYNTHETIC_MODE_WARNING_TEXT). El estado compartido vive en App; la
 * visibilidad (runtimeMode === 'synthetic' || useSyntheticInDemo) queda en App.
 */
import { SYNTHETIC_MODE_WARNING_TEXT } from '../lib/dataSource';

export interface SyntheticModeWarningBannerProps {
  activeDataSourceName: string;
}

export function SyntheticModeWarningBanner({
  activeDataSourceName,
}: SyntheticModeWarningBannerProps) {
  return (
    <div
      role="alert"
      data-testid="synthetic-mode-warning-banner"
      className="bg-amber-950/90 border-b border-amber-500/60 px-4 py-2.5 text-amber-100 text-xs flex flex-wrap items-center justify-between gap-2"
    >
      <span className="font-semibold">
        ⚠️ {SYNTHETIC_MODE_WARNING_TEXT}
      </span>
      <span className="font-mono text-[11px] text-amber-200">
        DataSource={activeDataSourceName} · mode=&quot;synthetic&quot; · VITE_MOCK_API=1 opt-in
      </span>
    </div>
  );
}

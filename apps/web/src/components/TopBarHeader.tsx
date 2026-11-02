/**
 * DELocalSoy.AR — Top Bar Contract: 3 zonas (Brand | 5 Nav links | 1 Primary
 * Action) — FE-DEUDA-02 #293 (corte 6 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro, sin cambio de comportamiento): misma
 * marca (logo + wordmark), mismos 5 anchors de navegación y misma acción
 * primaria de sincronización del núcleo. El logo y el wordmark migran a este
 * módulo (solo se consumían aquí); el handler vive en App y se acopla por props.
 */
import {
  DelocalSoyNetworkLogoSvg,
  DelocalSoyWordmark,
} from './BaseConsolidadaPrototype';

export interface TopBarHeaderProps {
  onSyncCore: () => void | Promise<void>;
}

export function TopBarHeader({ onSyncCore }: TopBarHeaderProps) {
  return (
    <header className="top-bar">
      <a href="#prototipo-base-consolidada" className="brand-wordmark">
        <DelocalSoyNetworkLogoSvg size={28} />
        <DelocalSoyWordmark fontSize="1.22rem" />
      </a>

      <nav className="top-nav" aria-label="Navegación principal">
        <a href="#prototipo-base-consolidada" style={{ color: '#FFC72C', fontWeight: 700 }}>
          Base Consolidada
        </a>
        <a href="#plataforma-territorial-real">Flujo Vertical</a>
        <a href="#nodos-federados">Nodos San Juan</a>
        <a href="#horizonte-2">Horizontes H2–H4</a>
        <a href="#cartografia-workspace">Cartografía &amp; Docs</a>
      </nav>

      <div className="top-actions">
        <button
          type="button"
          className="btn-confirm whitespace-nowrap"
          onClick={() => void onSyncCore()}
        >
          Sincronizar núcleo
        </button>
      </div>
    </header>
  );
}

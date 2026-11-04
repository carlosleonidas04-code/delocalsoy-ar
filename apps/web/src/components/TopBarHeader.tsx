/**
 * DELocalSoy.AR — Top Bar Contract: 3 zonas (Brand | Nav links | 1 Primary
 * Action) — FE-DEUDA-02 #293 (corte 6 de desmonolitización de App.tsx).
 *
 * Extraída 1:1 de App.tsx (refactor puro): misma marca (logo + wordmark) y
 * misma acción primaria de sincronización del núcleo; el handler vive en App y
 * se acopla por props.
 *
 * Refactor /lab PR-2: el laboratorio se monta bajo la ruta apartada #lab y la
 * navegación de producto deja de referenciarlo — el wordmark apunta al inicio
 * del documento y se retira el link «Base Consolidada» del nav.
 */
import { DelocalSoyNetworkLogoSvg, DelocalSoyWordmark } from '../lib/DelocalSoyBrand';

export interface TopBarHeaderProps {
  onSyncCore: () => void | Promise<void>;
}

export function TopBarHeader({ onSyncCore }: TopBarHeaderProps) {
  return (
    <header className="top-bar">
      <a href="#top" className="brand-wordmark">
        <DelocalSoyNetworkLogoSvg size={28} />
        <DelocalSoyWordmark fontSize="1.22rem" />
      </a>

      <nav className="top-nav" aria-label="Navegación principal">
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

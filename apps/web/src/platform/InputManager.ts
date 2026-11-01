/**
 * UX-002 (#223): InputManager: gestion de entrada multiplataforma.
 *
 * - Flechas: navegacion espacial (solo plataformas sin puntero fino: tv y
 *   vehicle; en desktop/mobile el navegador conserva su comportamiento nativo).
 * - Back / Escape / GoBack: retorno (el host define que hacer; por defecto nada).
 * Dependencias 100% inyectadas: testeable en node sin jsdom (R5).
 */

import type { PlatformKind } from './detectPlatform';
import { pickSpatialCandidate, type SpatialDir, type SpatialItem, type SpatialRect } from './spatialNavigation';

export interface MinimalKeyboardEvent {
  key: string;
  preventDefault(): void;
}

export interface InputManagerDeps<T> {
  /** Plataforma activa (se consulta en cada evento: permite cambios en caliente). */
  platform(): PlatformKind;
  /** Focusables visibles con geometria, en orden de documento. */
  focusables(): SpatialItem<T>[];
  /** Rect del elemento con foco (null si no hay foco en el conjunto). */
  focusedRect(): SpatialRect | null;
  /** Mueve el foco al objetivo elegido. */
  focus(target: T): void;
  /** Retorno (Boton Back de TV/gamepad, Escape). Opcional. */
  onBack?(): void;
}

export type KeyHandling = 'moved' | 'back' | 'ignored';

const KEY_TO_DIR: Readonly<Record<string, SpatialDir>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const BACK_KEYS: ReadonlySet<string> = new Set(['Escape', 'Back', 'GoBack']);

export class InputManager<T> {
  private readonly deps: InputManagerDeps<T>;

  constructor(deps: InputManagerDeps<T>) {
    this.deps = deps;
  }

  /** La navegacion espacial activa solo en plataformas de foco D-pad. */
  spatialActive(): boolean {
    const p = this.deps.platform();
    return p === 'tv' || p === 'vehicle';
  }

  handleKeyDown(ev: MinimalKeyboardEvent): KeyHandling {
    const dir: SpatialDir | undefined = KEY_TO_DIR[ev.key];
    if (dir !== undefined && this.spatialActive()) {
      const target = pickSpatialCandidate(this.deps.focusedRect(), this.deps.focusables(), dir);
      if (target === null) {
        return 'ignored';
      }
      ev.preventDefault();
      this.deps.focus(target.el);
      return 'moved';
    }
    if (BACK_KEYS.has(ev.key)) {
      ev.preventDefault();
      if (this.deps.onBack !== undefined) {
        this.deps.onBack();
      }
      return 'back';
    }
    return 'ignored';
  }
}

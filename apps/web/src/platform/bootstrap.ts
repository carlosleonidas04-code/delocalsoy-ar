/**
 * UX-002 (#223): arranque de la capa de plataforma.
 * Aplica data-platform (perfiles del UX-001) y registra el listener keydown
 * del InputManager. Guard idempotente: iniciar dos veces es un error
 * explicito (detectable), nunca un doble registro silencioso.
 */

import { applyPlatform, readPlatformEnv, type PlatformKind } from './detectPlatform';
import { InputManager } from './InputManager';
import { collectFocusables, rectOf } from './spatialDom';

export interface PlatformBootstrap {
  platform: PlatformKind;
  manager: InputManager<HTMLElement>;
}

let started = false;

export function startPlatform(
  docEl: HTMLElement = document.documentElement,
  doc: Document = document,
): PlatformBootstrap {
  if (started) {
    throw new Error('startPlatform: ya iniciado (guard idempotente)');
  }
  started = true;
  const platform = applyPlatform(docEl, readPlatformEnv());
  const manager = new InputManager<HTMLElement>({
    platform: () => platform,
    focusables: () => collectFocusables(doc),
    focusedRect: () => {
      const active = doc.activeElement;
      return rectOf(active instanceof HTMLElement ? active : null);
    },
    focus: (el) => el.focus(),
  });
  doc.addEventListener('keydown', (ev: KeyboardEvent) => {
    manager.handleKeyDown(ev);
  });
  return { platform, manager };
}

/* Arranque automatico SOLO en entorno navegador (main.tsx importa este modulo). */
if (
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof document.documentElement !== 'undefined'
) {
  startPlatform();
}

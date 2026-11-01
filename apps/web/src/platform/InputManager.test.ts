/**
 * UX-002 (#223): suite del InputManager (dependencias inyectadas, sin jsdom).
 */
import { describe, expect, it, vi } from 'vitest';
import { InputManager, type InputManagerDeps } from './InputManager';
import type { SpatialItem, SpatialRect } from './spatialNavigation';

interface Boton {
  id: string;
}

const rect = (left: number, top: number, w: number, h: number): SpatialRect => ({
  left,
  top,
  right: left + w,
  bottom: top + h,
});

function managerDe(
  platform: 'tv' | 'vehicle' | 'desktop' | 'mobile',
  items: SpatialItem<Boton>[],
  focused: SpatialRect | null,
) {
  const focus = vi.fn();
  const onBack = vi.fn();
  const deps: InputManagerDeps<Boton> = {
    platform: () => platform,
    focusables: () => items,
    focusedRect: () => focused,
    focus,
    onBack,
  };
  return { manager: new InputManager<Boton>(deps), focus, onBack };
}

function tecla(key: string) {
  let prevented = false;
  return {
    ev: { key, preventDefault: () => { prevented = true; } },
    prevented: () => prevented,
  };
}

describe('InputManager (UX-002)', () => {
  const a: SpatialItem<Boton> = { el: { id: 'A' }, rect: rect(0, 0, 100, 50) };
  const b: SpatialItem<Boton> = { el: { id: 'B' }, rect: rect(0, 80, 100, 50) };

  it('TV: flecha abajo mueve el foco espacialmente y cancela el scroll nativo', () => {
    const { manager, focus } = managerDe('tv', [a, b], a.rect);
    const e = tecla('ArrowDown');
    expect(manager.handleKeyDown(e.ev)).toBe('moved');
    expect(focus).toHaveBeenCalledWith({ id: 'B' });
    expect(e.prevented()).toBe(true);
  });

  it('TV: flecha arriba sin candidato encima -> ignorado (bordes honestos)', () => {
    const { manager, focus } = managerDe('tv', [a, b], a.rect);
    const e = tecla('ArrowUp');
    expect(manager.handleKeyDown(e.ev)).toBe('ignored');
    expect(focus).not.toHaveBeenCalled();
    expect(e.prevented()).toBe(false);
  });

  it('Escritorio: las flechas NO se interceptan (comportamiento nativo)', () => {
    const { manager, focus } = managerDe('desktop', [a, b], a.rect);
    const e = tecla('ArrowDown');
    expect(manager.handleKeyDown(e.ev)).toBe('ignored');
    expect(focus).not.toHaveBeenCalled();
    expect(e.prevented()).toBe(false);
  });

  it('Vehiculo: navegacion espacial activa (glanceable)', () => {
    const { manager } = managerDe('vehicle', [a, b], a.rect);
    expect(manager.spatialActive()).toBe(true);
    expect(manager.handleKeyDown(tecla('ArrowDown').ev)).toBe('moved');
  });

  it('Back: invoca onBack y cancela el default (el host define el retorno)', () => {
    const { manager, onBack } = managerDe('tv', [a, b], a.rect);
    const e = tecla('Back');
    expect(manager.handleKeyDown(e.ev)).toBe('back');
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(e.prevented()).toBe(true);
  });

  it('Tecla irrelevante: ignorada sin efectos', () => {
    const { manager, focus, onBack } = managerDe('tv', [a, b], a.rect);
    expect(manager.handleKeyDown(tecla('x').ev)).toBe('ignored');
    expect(focus).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });
});

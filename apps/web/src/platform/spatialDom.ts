/**
 * UX-002 (#223): adaptador DOM de la navegacion espacial.
 * Recolecta focusables con geometria REAL (getBoundingClientRect) y filtra
 * los no visibles (area cero) y aria-hidden. Selector alineado con las
 * primitivas de foco del UX-001 (.delocal-focusable) mas los nativos.
 */

import type { SpatialItem, SpatialRect } from './spatialNavigation';

export const FOCUSABLE_SELECTOR = [
  '.delocal-focusable',
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function collectFocusables(root: Document | HTMLElement): SpatialItem<HTMLElement>[] {
  if (typeof root.querySelectorAll !== 'function') {
    return [];
  }
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const out: SpatialItem<HTMLElement>[] = [];
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      continue; // no visible: area cero
    }
    if (el.getAttribute('aria-hidden') === 'true') {
      continue;
    }
    out.push({ el, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } });
  }
  return out;
}

export function rectOf(el: HTMLElement | null): SpatialRect | null {
  if (el === null) {
    return null;
  }
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

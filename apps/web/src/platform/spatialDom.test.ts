/**
 * UX-002 (#223): suite del adaptador DOM (fakes inyectados, sin jsdom).
 */
import { describe, expect, it } from 'vitest';
import { collectFocusables } from './spatialDom';

interface Spec {
  w: number;
  h: number;
  ariaHidden?: boolean;
}

function fakeRoot(specs: Spec[]): Document {
  const nodes = specs.map((s) => ({
    getBoundingClientRect: () => ({ left: 0, top: 0, right: s.w, bottom: s.h, width: s.w, height: s.h }),
    getAttribute: (name: string) => (s.ariaHidden === true && name === 'aria-hidden' ? 'true' : null),
  }));
  const iterable = {
    [Symbol.iterator]: () => nodes[Symbol.iterator](),
  };
  return {
    querySelectorAll: () => iterable,
  } as unknown as Document;
}

describe('collectFocusables (UX-002)', () => {
  it('filtra area cero y aria-hidden; conserva visibles con su rect', () => {
    const items = collectFocusables(
      fakeRoot([
        { w: 100, h: 50 },
        { w: 0, h: 50 },
        { w: 100, h: 0 },
        { w: 100, h: 50, ariaHidden: true },
      ]),
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.rect).toEqual({ left: 0, top: 0, right: 100, bottom: 50 });
  });

  it('root sin querySelectorAll: lista vacia honesta', () => {
    expect(collectFocusables({} as unknown as Document)).toEqual([]);
  });
});

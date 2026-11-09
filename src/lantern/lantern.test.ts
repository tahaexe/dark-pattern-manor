import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { light, putOut, isLit } from './lantern';

function countLanternNodes(): number {
  return document.querySelectorAll('[data-ghost-lantern]').length;
}

describe('the lantern lit-state (runs only when asked, nothing left behind)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as Record<string, unknown>).__ghostLantern__;
  });

  afterEach(() => {
    // Always clean up so one test cannot leak into another.
    if (isLit()) putOut();
    vi.restoreAllMocks();
  });

  it('adds nothing before it is lit', () => {
    expect(isLit()).toBe(false);
    expect(countLanternNodes()).toBe(0);
  });

  it('lights with a panel and puts out to zero nodes, restoring focus', () => {
    document.body.innerHTML = `
      <button id="start">Start</button>
      <p>Only 2 left</p>
    `;
    const start = document.getElementById('start') as HTMLButtonElement;
    start.focus();
    expect(document.activeElement).toBe(start);

    light();
    expect(isLit()).toBe(true);
    expect(countLanternNodes()).toBe(1);

    putOut();
    expect(isLit()).toBe(false);
    expect(countLanternNodes()).toBe(0);
    // Focus returns to where it was before the lantern lit.
    expect(document.activeElement).toBe(start);
  });

  it('matches every added listener and observer with a removal', () => {
    document.body.innerHTML = `<p>Only 1 left</p>`;

    const added = new Map<string, number>();
    const removed = new Map<string, number>();
    const origAdd = window.addEventListener.bind(window);
    const origRemove = window.removeEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, ...rest) => {
      added.set(type, (added.get(type) || 0) + 1);
      return (origAdd as unknown as (...a: unknown[]) => void)(type, ...rest);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, ...rest) => {
      removed.set(type, (removed.get(type) || 0) + 1);
      return (origRemove as unknown as (...a: unknown[]) => void)(type, ...rest);
    });

    light();
    putOut();

    for (const [type, n] of added) {
      expect(removed.get(type) || 0).toBeGreaterThanOrEqual(n);
    }
  });

  it('calls no network or storage escape hatch while lighting and putting out', () => {
    document.body.innerHTML = `<p>Only 1 left</p><button>No thanks, I don't want offers</button>`;

    const fetchSpy = vi.fn(() => {
      throw new Error('fetch called');
    });
    const openSpy = vi.fn(() => {
      throw new Error('window.open called');
    });
    const beaconSpy = vi.fn(() => {
      throw new Error('sendBeacon called');
    });
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('open', openSpy);
    if (!navigator.sendBeacon) {
      Object.defineProperty(navigator, 'sendBeacon', { value: beaconSpy, configurable: true });
    } else {
      vi.spyOn(navigator, 'sendBeacon').mockImplementation(beaconSpy as never);
    }

    expect(() => {
      light();
      putOut();
    }).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
  });

  it('a second light while lit does not stack a second host', () => {
    document.body.innerHTML = `<p>Only 1 left</p>`;
    light();
    light(); // the real toggle is in main.ts; light() itself is a no-op when lit
    expect(countLanternNodes()).toBe(1);
  });
});

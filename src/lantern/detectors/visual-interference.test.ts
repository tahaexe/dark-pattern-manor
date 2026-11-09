import { describe, it, expect } from 'vitest';
import detectVisualInterference, { detectVisualInterferenceWith } from './visual-interference';
import type { ControlStyle, Measure, Style } from '../types';

function dom(html: string): Element {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

/** A measure stub keyed by a size attribute `data-size="WxH"`. */
const sized: Measure = (el) => {
  const s = el.getAttribute('data-size');
  if (!s) return { width: 100, height: 40 };
  const [w, h] = s.split('x').map(Number);
  return { width: w, height: h };
};

/** A fully solid (filled) button look. */
const FILLED: ControlStyle = {
  backgroundColor: 'rgb(240, 190, 119)',
  backgroundImage: 'none',
  borderTopWidth: '0px',
  borderTopStyle: 'none',
  borderTopColor: 'rgba(0, 0, 0, 0)',
};

/** A faint, borderless link look (transparent fill, no border). */
const FAINT: ControlStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundImage: 'none',
  borderTopWidth: '0px',
  borderTopStyle: 'none',
  borderTopColor: 'rgba(0, 0, 0, 0)',
};

/**
 * A style stub keyed by `data-look`: "filled" reads as a solid button,
 * "faint" reads as a transparent borderless link. Anything else is faint.
 */
const looked: Style = (el) => (el.getAttribute('data-look') === 'filled' ? FILLED : FAINT);

describe('visual-interference detector', () => {
  it('marks a plain-link refuse beside a button accept', () => {
    const root = dom(`
      <div class="cookie-banner">
        <p>We value your privacy. We use cookies.</p>
        <button>Accept all</button>
        <a href="#">Reject all</a>
      </div>
    `);
    const found = detectVisualInterference(root);
    expect(found).toHaveLength(1);
    expect(found[0].pattern).toBe('Visual interference');
    expect(found[0].room).toBe(1);
    expect((found[0].element as HTMLElement).tagName.toLowerCase()).toBe('a');
  });

  it('marks a transparent borderless refuse BUTTON beside a filled accept (look rule)', () => {
    // The Foyer form: "Reject all" is a <button> dressed as a link (no fill, no
    // border) next to a solid "Accept all" button. The tag-based link rule
    // misses it; the look rule catches it.
    const root = dom(`
      <div class="cookie-banner">
        <p>We value your privacy. We use cookies.</p>
        <button data-look="filled">Accept all</button>
        <button data-look="faint" aria-label="Reject all">Reject all</button>
      </div>
    `);
    const found = detectVisualInterferenceWith(root, sized, looked);
    expect(found).toHaveLength(1);
    expect(found[0].pattern).toBe('Visual interference');
    expect(found[0].room).toBe(1);
    expect(found[0].sign).toMatch(/dressed as a faint link/);
    expect((found[0].element as HTMLElement).tagName.toLowerCase()).toBe('button');
  });

  it('does not mark when both accept and refuse look like solid buttons', () => {
    const root = dom(`
      <div class="cookie-banner">
        <p>We use cookies. Your privacy matters.</p>
        <button data-look="filled" data-size="160x44">Accept all</button>
        <button data-look="filled" data-size="160x44">Reject all</button>
      </div>
    `);
    expect(detectVisualInterferenceWith(root, sized, looked)).toHaveLength(0);
  });

  it('does not mark when both accept and refuse look like faint links of equal size', () => {
    const root = dom(`
      <div class="cookie-banner">
        <p>We use cookies. Your privacy matters.</p>
        <button data-look="faint" data-size="120x40">Accept all</button>
        <button data-look="faint" data-size="120x40">Reject all</button>
      </div>
    `);
    expect(detectVisualInterferenceWith(root, sized, looked)).toHaveLength(0);
  });

  it('marks a refuse button far smaller than accept (injected sizes)', () => {
    const root = dom(`
      <div class="cookie-banner">
        <p>We use cookies for consent.</p>
        <button data-look="filled" data-size="200x50">Accept all</button>
        <button data-look="filled" data-size="60x20" aria-label="Reject all">Reject all</button>
      </div>
    `);
    const found = detectVisualInterferenceWith(root, sized, looked);
    expect(found).toHaveLength(1);
    expect(found[0].sign).toMatch(/smaller/);
  });

  it('marks the box when there is no refuse, only Manage options', () => {
    const root = dom(`
      <div class="cookie-banner">
        <p>We value your privacy — cookies.</p>
        <button>Accept all</button>
        <button>Manage options</button>
      </div>
    `);
    const found = detectVisualInterference(root);
    expect(found).toHaveLength(1);
    expect(found[0].sign).toMatch(/no plain refuse|Manage|Settings/i);
  });

  it('does not mark the honest twin (two equal buttons)', () => {
    const root = dom(`
      <div class="cookie-banner">
        <p>We use cookies. Your privacy matters.</p>
        <button data-look="filled" data-size="160x44">Accept all</button>
        <button data-look="filled" data-size="160x44">Reject all</button>
      </div>
    `);
    expect(detectVisualInterferenceWith(root, sized, looked)).toHaveLength(0);
  });

  it('does not mark a box with no accept-everything control', () => {
    const root = dom(`
      <div class="cookie-banner">
        <p>We use cookies.</p>
        <button>Reject all</button>
      </div>
    `);
    expect(detectVisualInterference(root)).toHaveLength(0);
  });
});

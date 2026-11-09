import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import LanternPractice from './LanternPractice';
import { runAllDetectors } from '../lantern/detect';
import type { Measure } from '../lantern/types';

/** jsdom has no layout; size the practice cookie controls for the rule. */
const measure: Measure = (el) => {
  const cls = String(el.className || '');
  if (/reject/.test(cls)) return { width: 50, height: 18 };
  return { width: 180, height: 44 };
};

describe('the lantern practice page (Hollowmere Goods)', () => {
  afterEach(() => cleanup());

  it('renders seven planted patterns beside seven honest twins', () => {
    const { container } = render(<LanternPractice />);
    expect(container.querySelectorAll('.practice-pattern')).toHaveLength(7);
    expect(container.querySelectorAll('.practice-haunted')).toHaveLength(7);
    expect(container.querySelectorAll('.practice-honest')).toHaveLength(7);
  });

  it('marks exactly the seven planted patterns and no honest twin', () => {
    const { container } = render(<LanternPractice />);
    const found = runAllDetectors(container, undefined, {
      measure,
      // The page's countdown ticks live; treat the watched countdown as changed.
      changed: (el) => /\d{1,2}:\d{2}/.test(el.textContent || ''),
    });
    const patterns = found.map((s) => s.pattern).sort();
    expect(patterns).toEqual(
      [
        'Confirmshaming',
        'Fake scarcity',
        'Fake social proof',
        'Fake urgency',
        'Preselection',
        'Trick wording',
        'Visual interference',
      ].sort(),
    );

    // Every marked element sits on the haunted side, never the honest side.
    for (const s of found) {
      const honest = s.element.closest('.practice-honest');
      expect(honest, `${s.pattern} was marked on the honest side`).toBeNull();
    }
  });

  it('names no real company, product, person or price', () => {
    const { container } = render(<LanternPractice />);
    const text = container.textContent || '';
    // Only the fictional shop name appears; a small guard against obvious leaks.
    expect(text).toContain('Hollowmere Goods');
    expect(text).not.toMatch(/amazon|google|facebook|apple|netflix|\$\d/i);
  });
});

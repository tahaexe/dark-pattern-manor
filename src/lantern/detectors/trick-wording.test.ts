import { describe, it, expect } from 'vitest';
import detectTrickWording, { negationCount } from './trick-wording';

function dom(html: string): Element {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('trick-wording detector', () => {
  it('counts the negations in a label', () => {
    expect(
      negationCount('untick this box if you do not want to not receive offers'),
    ).toBeGreaterThanOrEqual(2);
    expect(negationCount('email me offers')).toBe(0);
  });

  it('marks a checkbox whose label stacks two negatives', () => {
    const root = dom(`
      <label><input type="checkbox"> Untick this box if you do not want to not receive offers</label>
    `);
    const found = detectTrickWording(root);
    expect(found).toHaveLength(1);
    expect(found[0].pattern).toBe('Trick wording');
    expect(found[0].room).toBe(2);
  });

  it('does not mark a plain, single-sense label (honest twin)', () => {
    const root = dom(`
      <label><input type="checkbox"> Email me offers</label>
    `);
    expect(detectTrickWording(root)).toHaveLength(0);
  });
});

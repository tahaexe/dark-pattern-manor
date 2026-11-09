import { describe, it, expect } from 'vitest';
import detectPreselection from './preselection';

function dom(html: string): Element {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('preselection detector', () => {
  it('marks a checked offer checkbox', () => {
    const root = dom(`
      <label><input type="checkbox" checked> Yes, send me offers and partner deals</label>
    `);
    const found = detectPreselection(root);
    expect(found).toHaveLength(1);
    expect(found[0].pattern).toBe('Preselection');
    expect(found[0].room).toBe(11);
    expect(found[0].sign.length).toBeGreaterThan(0);
  });

  it('marks a checked newsletter switch', () => {
    const root = dom(`
      <div><span id="nl">Subscribe to the newsletter</span>
      <span role="switch" aria-checked="true" aria-labelledby="nl"></span></div>
    `);
    expect(detectPreselection(root)).toHaveLength(1);
  });

  it('does not mark the honest twin (unchecked offer box)', () => {
    const root = dom(`
      <label><input type="checkbox"> Email me offers</label>
    `);
    expect(detectPreselection(root)).toHaveLength(0);
  });

  it('does not mark a checked terms gate', () => {
    const root = dom(`
      <label><input type="checkbox" checked> I accept the terms and conditions</label>
    `);
    expect(detectPreselection(root)).toHaveLength(0);
  });

  it('does not mark a checked box with no offer words', () => {
    const root = dom(`
      <label><input type="checkbox" checked> Remember this device</label>
    `);
    expect(detectPreselection(root)).toHaveLength(0);
  });
});

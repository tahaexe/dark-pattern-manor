import { describe, it, expect } from 'vitest';
import detectFakeScarcity from './fake-scarcity';

function dom(html: string): Element {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('fake-scarcity detector', () => {
  it('marks "Only 2 left"', () => {
    const root = dom(`<p class="stock">Only 2 left!</p>`);
    const found = detectFakeScarcity(root);
    expect(found).toHaveLength(1);
    expect(found[0].pattern).toBe('Fake scarcity');
    expect(found[0].room).toBe(6);
    expect(found[0].sign).toMatch(/cannot know the real stock/);
  });

  it('marks "selling fast", "almost gone", "in high demand"', () => {
    expect(detectFakeScarcity(dom(`<span>Selling fast</span>`))).toHaveLength(1);
    expect(detectFakeScarcity(dom(`<span>Almost gone</span>`))).toHaveLength(1);
    expect(detectFakeScarcity(dom(`<span>In high demand</span>`))).toHaveLength(1);
  });

  it('does not mark the honest twin ("In stock")', () => {
    expect(detectFakeScarcity(dom(`<p>In stock, ships tomorrow</p>`))).toHaveLength(0);
  });

  it('marks the tightest element, not every ancestor', () => {
    const root = dom(`<div><section><p>Only 3 left</p></section></div>`);
    const found = detectFakeScarcity(root);
    expect(found).toHaveLength(1);
    expect((found[0].element as HTMLElement).tagName.toLowerCase()).toBe('p');
  });
});

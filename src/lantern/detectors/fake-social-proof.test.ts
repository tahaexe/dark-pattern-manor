import { describe, it, expect } from 'vitest';
import detectFakeSocialProof from './fake-social-proof';

function dom(html: string): Element {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('fake-social-proof detector', () => {
  it('marks "17 people are viewing this"', () => {
    const root = dom(`<p class="watchers">17 people are viewing this right now</p>`);
    const found = detectFakeSocialProof(root);
    expect(found).toHaveLength(1);
    expect(found[0].pattern).toBe('Fake social proof');
    expect(found[0].room).toBe(7);
    expect(found[0].sign).toMatch(/cannot know the real numbers/);
  });

  it('marks "32 bought today"', () => {
    expect(detectFakeSocialProof(dom(`<span>32 bought today</span>`))).toHaveLength(1);
  });

  it('does not mark a dated, honest review count', () => {
    expect(detectFakeSocialProof(dom(`<p>Rated 4.6 from 212 reviews since 2021</p>`))).toHaveLength(
      0,
    );
  });
});

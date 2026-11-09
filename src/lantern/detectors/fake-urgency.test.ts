import { describe, it, expect } from 'vitest';
import detectFakeUrgency, { detectFakeUrgencyWith, findCountdownCandidates } from './fake-urgency';

function dom(html: string): Element {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('fake-urgency detector', () => {
  it('finds a countdown near selling words as a candidate', () => {
    const root = dom(`<p>Offer ends in <span class="c">04:59</span></p>`);
    const candidates = findCountdownCandidates(root);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].textContent).toContain('04:59');
  });

  it('marks a countdown that changed while watched', () => {
    const root = dom(`<p>Offer ends in <span class="c">04:59</span></p>`);
    const found = detectFakeUrgencyWith(root, () => true);
    expect(found).toHaveLength(1);
    expect(found[0].pattern).toBe('Fake urgency');
    expect(found[0].room).toBe(5);
  });

  it('does not mark a countdown that did not change', () => {
    const root = dom(`<p>Offer ends in <span class="c">04:59</span></p>`);
    expect(detectFakeUrgencyWith(root, () => false)).toHaveLength(0);
    // The default export never marks without a change observer.
    expect(detectFakeUrgency(root)).toHaveLength(0);
  });

  it('does not treat a clock with no selling words as a candidate', () => {
    const root = dom(`<p>Current time <span>14:30</span></p>`);
    expect(findCountdownCandidates(root)).toHaveLength(0);
  });

  it('accepts hh:mm:ss shapes', () => {
    const root = dom(`<p>Sale expires in <span>01:04:59</span></p>`);
    expect(findCountdownCandidates(root)).toHaveLength(1);
  });
});

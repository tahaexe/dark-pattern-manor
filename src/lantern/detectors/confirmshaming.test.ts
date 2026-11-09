import { describe, it, expect } from 'vitest';
import detectConfirmshaming from './confirmshaming';

function dom(html: string): Element {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('confirmshaming detector', () => {
  it('marks "No thanks, I like paying full price"', () => {
    const root = dom(`<button>No thanks, I like paying full price</button>`);
    const found = detectConfirmshaming(root);
    expect(found).toHaveLength(1);
    expect(found[0].pattern).toBe('Confirmshaming');
    expect(found[0].room).toBe(3);
  });

  it('marks "I\'d rather pay full price"', () => {
    expect(detectConfirmshaming(dom(`<a href="#">I'd rather pay full price</a>`))).toHaveLength(1);
  });

  it('marks "No, I don\'t like saving money"', () => {
    expect(
      detectConfirmshaming(dom(`<button>No, I don't like saving money</button>`)),
    ).toHaveLength(1);
  });

  it('does not mark a plain "No thanks"', () => {
    expect(detectConfirmshaming(dom(`<button>No thanks</button>`))).toHaveLength(0);
  });

  it('does not mark "Decline" or "Cancel"', () => {
    expect(detectConfirmshaming(dom(`<button>Decline</button>`))).toHaveLength(0);
    expect(detectConfirmshaming(dom(`<button>Cancel</button>`))).toHaveLength(0);
  });
});

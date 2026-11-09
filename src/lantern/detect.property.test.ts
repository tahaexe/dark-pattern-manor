import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { runAllDetectors } from './detect';

/** Build a small random DOM tree from a compact description. */
interface Node {
  tag: string;
  text: string;
  children: Node[];
}

const leaf = fc.record({
  tag: fc.constantFrom('span', 'p', 'button', 'a', 'label', 'div'),
  text: fc.stringOf(
    fc.constantFrom(...'abc 0123:left only reject accept cookie offer '.split('')),
    {
      maxLength: 24,
    },
  ),
  children: fc.constant([] as Node[]),
});

const tree: fc.Arbitrary<Node> = fc.letrec<{ node: Node }>((rec) => ({
  node: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    leaf,
    fc.record({
      tag: fc.constantFrom('div', 'section', 'ul', 'li', 'form'),
      text: fc.constant(''),
      children: fc.array(rec('node'), { maxLength: 3 }),
    }),
  ),
})).node;

function build(node: Node, doc: Document): Element {
  const el = doc.createElement(node.tag);
  if (node.text) el.appendChild(doc.createTextNode(node.text));
  for (const c of node.children) el.appendChild(build(c, doc));
  return el;
}

describe('detectors over generated markup', () => {
  it('never throws and never marks a node inside the lantern host', () => {
    fc.assert(
      fc.property(tree, (node) => {
        const root = document.createElement('div');
        root.appendChild(build(node, document));

        // Inject a lantern host containing a would-be suspect.
        const host = document.createElement('div');
        host.setAttribute('data-ghost-lantern', '');
        host.innerHTML = `
          <button>No thanks, I don't want to save</button>
          <p>Only 1 left</p>
          <label><input type="checkbox" checked> offers</label>
        `;
        root.appendChild(host);

        let suspects: ReturnType<typeof runAllDetectors> = [];
        expect(() => {
          suspects = runAllDetectors(root, host);
        }).not.toThrow();

        for (const s of suspects) {
          expect(host.contains(s.element)).toBe(false);
          expect(s.element === host).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });
});

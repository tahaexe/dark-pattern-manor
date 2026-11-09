import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import axe from 'axe-core';
import Haunted from './Haunted';
import Honest from './Honest';
import room from './room';
import Room from '../../engine/Room';
import { __resetForTests, doneCount } from '../../engine/progress';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'room.css'), 'utf8');
const identityRng = () => 0;

/** The possessed number-1 card's visible text is also its accessible name. */
const POSSESSED_NAME = /Editor's choice/i;

/**
 * The engine lantern's exact accessible name. This room's cards name real
 * lanterns ("Marshglow Hand Lantern"), so a loose /Lantern/ would match those
 * too — the full name targets only the engine control.
 */
const LANTERN_NAME = /Lantern: show me the trick/;

describe('The Map Room — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "find the best-reviewed lantern for a night walk" in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // The genuine top-rated lantern — one click finishes the task.
    fireEvent.click(screen.getByRole('button', { name: /Marshglow Hand Lantern/i }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: LANTERN_NAME }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Disguised ads' }));
    await screen.findByRole('heading', { level: 2, name: 'Disguised ads' });
    fireEvent.click(screen.getByRole('button', { name: /Marshglow Hand Lantern/i }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });
});

describe('The Map Room — the possessed element', () => {
  it('is found by its id "maproom-top-pick"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#maproom-top-pick');
    expect(possessed).not.toBeNull();
    expect(possessed!.id).toBe(room.possessedId);
  });

  it('is keyboard-reachable with a non-empty accessible name (its visible text)', () => {
    render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = screen.getByRole('button', { name: POSSESSED_NAME });
    expect(possessed.tagName).toBe('BUTTON');
    // Label in Name (WCAG 2.5.3): no aria-label overrides the visible text.
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('renders the ghost SVG at about 120 x 140 px inside the possessed card', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#maproom-top-pick')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });
});

describe('The Map Room — pattern rule (passes on honest, fails on haunted)', () => {
  it('on the haunted side the number-1 card sits in the ranked list with only a "partner" tag, no ad marking', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#maproom-top-pick')!;
    const text = possessed.textContent || '';
    // The paid placement's only sign is the small "partner" tag.
    expect(/partner/i.test(text)).toBe(true);
    // It carries NO ad marking: it reads as an impartial editorial pick.
    expect(/advertisement|sponsored|\bad\b/i.test(text)).toBe(false);
    // It lives inside the editorial ranking (number 1 of the top 5).
    expect(container.querySelector('.fogmarsh-list')).not.toBeNull();
    expect(container.querySelector('#maproom-top-pick .fogmarsh-rank')!.textContent).toBe('1');
    // No clearly-marked advertisement box exists on the haunted side.
    expect(container.querySelector('.fogmarsh-ad')).toBeNull();
  });

  it('on the honest side the paid placement is a clearly-marked ad box, separate from a criterion-stated ranking', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    const ad = container.querySelector('.fogmarsh-ad');
    expect(ad).not.toBeNull();
    expect(/Advertisement · paid by Wickmere Lamps/i.test(ad!.textContent || '')).toBe(true);
    // The ranking states its criterion.
    const criteria = container.querySelector('.fogmarsh-criteria');
    expect(criteria).not.toBeNull();
    expect(
      /verified owner reviews; no brand pays for a place/i.test(criteria!.textContent || ''),
    ).toBe(true);
    // There is no possessed paid-placement-in-the-ranking on the honest side.
    expect(container.querySelector('#maproom-top-pick')).toBeNull();
  });

  it('the pattern rule is variant-specific: an unmarked paid pick in the ranking vs a marked ad box cannot both hold', () => {
    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedHasAdBox = haunted.container.querySelector('.fogmarsh-ad') !== null;

    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestHasAdBox = honest.container.querySelector('.fogmarsh-ad') !== null;

    expect(hauntedHasAdBox).toBe(false);
    expect(honestHasAdBox).toBe(true);
    expect(hauntedHasAdBox).not.toBe(honestHasAdBox);
  });
});

describe('The Map Room — the ghost act (Disguised ads performed)', () => {
  it('renders the lift and tuck overlays in the haunted view, all aria-hidden', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#maproom-top-pick')!;
    const lift = possessed.querySelector('.act-lift');
    const tuck = possessed.querySelector('.act-tuck');
    expect(lift).not.toBeNull();
    expect(tuck).not.toBeNull();
    expect(lift!.getAttribute('aria-hidden')).toBe('true');
    expect(tuck!.getAttribute('aria-hidden')).toBe('true');
  });

  it('the act is non-interactive and runs one cycle of at least 4 s with transforms/opacity only', () => {
    expect(css).toMatch(/\.act-lift\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.act-tuck\s*\{[^}]*pointer-events:\s*none/);
    const seconds = (sel: string) => {
      const m = css.match(new RegExp(`${sel}\\s*\\{[^}]*animation:\\s*[a-z-]+\\s*([\\d.]+)s`));
      return m ? parseFloat(m[1]) : 0;
    };
    expect(seconds('\\.act-lift')).toBeGreaterThanOrEqual(4);
    expect(seconds('\\.act-tuck')).toBeGreaterThanOrEqual(4);
    // The keyframes move transform/opacity only — no layout-shifting props.
    const keyframeBody = (name: string): string => {
      const start = css.search(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
      expect(start).toBeGreaterThanOrEqual(0);
      const open = css.indexOf('{', start);
      let depth = 0;
      for (let i = open; i < css.length; i++) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') {
          depth--;
          if (depth === 0) return css.slice(open + 1, i);
        }
      }
      return '';
    };
    for (const name of ['fogmarsh-lift', 'fogmarsh-tuck']) {
      const body = keyframeBody(name);
      const props = Array.from(body.matchAll(/(?:^|[{;])\s*([a-z-]+)\s*:/g)).map((m) => m[1]);
      expect(props.length).toBeGreaterThan(0);
      for (const prop of props) {
        expect(['transform', 'opacity']).toContain(prop);
      }
    }
  });

  it('the act is absent in preview and in the honest twin', () => {
    const preview = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
        preview
      />,
    );
    expect(preview.container.querySelector('.act-lift')).toBeNull();
    expect(preview.container.querySelector('.ghost-signs')).toBeNull();

    const honest = render(<Honest onCompleteTask={() => {}} />);
    expect(honest.container.querySelector('.act-lift')).toBeNull();
    expect(honest.container.querySelector('.ghost-wrap')).toBeNull();
  });

  it('stops the act when the ghost is named, so the shared unwind takes over', () => {
    expect(css).toMatch(
      /\.room-scene\[data-moment='right'\][^{]*\.act-lift[\s\S]*?animation:\s*none/,
    );
    // The room adds no flee of its own on .ghost-wrap (the shared layer owns it).
    expect(css).not.toMatch(/\.ghost-wrap\s*\{[^}]*animation:\s*[^;]*flee/);
  });
});

describe('The Map Room — the Ghost Guide sources', () => {
  it('carries an https ftc.gov US source and an https eur-lex EU source', () => {
    expect(room.guide.us.url.startsWith('https://')).toBe(true);
    expect(room.guide.us.url).toContain('ftc.gov');
    expect(room.guide.eu.url.startsWith('https://')).toBe(true);
    expect(room.guide.eu.url).toContain('eur-lex.europa.eu');
    expect(room.guide.us.sourceLabel.trim()).not.toBe('');
    expect(room.guide.eu.sourceLabel.trim()).not.toBe('');
  });
});

describe('The Map Room — contrast and axe on both variants', () => {
  async function noViolations(container: HTMLElement) {
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: true } },
    });
    if (results.violations.length > 0) {
      console.log('axe violations:', JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toHaveLength(0);
  }

  it('haunted variant: zero axe violations with color-contrast enabled', async () => {
    const { container } = render(
      <div class="manor-frame">
        <Haunted
          onSelectPossessed={() => {}}
          onSelectOther={() => {}}
          signsActive
          reducedMotion={false}
        />
      </div>,
    );
    await noViolations(container);
  });

  it('honest variant: zero axe violations with color-contrast enabled', async () => {
    const { container } = render(
      <div class="manor-frame">
        <Honest onCompleteTask={() => {}} />
      </div>,
    );
    await noViolations(container);
  });
});

describe('The Map Room — reduced motion static indicator', () => {
  let matchMediaSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    __resetForTests();
    matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => {
    matchMediaSpy?.mockRestore();
  });

  it('the possessed card shows a static indicator and the act caption, no animation', () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    const possessed = container.querySelector('#maproom-top-pick')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(screen.getByText("the advert wears the review's coat")).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: LANTERN_NAME }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    const wrong = await screen.findByRole('button', { name: 'Visual interference' });
    fireEvent.click(wrong);
    expect(await screen.findByText(/it is what it pretends to be that lies/i)).toBeDefined();
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

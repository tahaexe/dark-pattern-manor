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

/** The possessed small print's visible text, which is also its accessible name. */
const POSSESSED_NAME = /Then £9\.99 a month from 13 November/i;

/** The recurring price the trial rolls into. */
const RECURRING_PRICE = /£9\.99 a month/i;

/**
 * The three material facts a trial must disclose up front: the price after,
 * the date billing starts, and the way to cancel. Returns how many are present
 * in a given block of text.
 */
function materialFacts(text: string): number {
  const t = text.toLowerCase();
  let found = 0;
  if (/£9\.99 a month/.test(t)) found += 1; // price after
  if (/13 november/.test(t)) found += 1; // billing start date
  if (/cancel/.test(t)) found += 1; // the way to cancel
  return found;
}

describe('The Parlour — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "start the free trial, knowing what comes after" in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One click on the button — which already names the recurring price — starts
    // the trial as a knowing choice.
    fireEvent.click(
      screen.getByRole('button', { name: /Start free trial, then £9\.99 a month/i }),
    );
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={() => 0} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hidden subscription' }));
    await screen.findByRole('heading', { level: 2, name: 'Hidden subscription' });
    fireEvent.click(
      screen.getByRole('button', { name: /Start free trial, then £9\.99 a month/i }),
    );
    await waitFor(() => expect(doneCount()).toBe(1));
  });
});

describe('The Parlour — the possessed element', () => {
  it('is found by its id "parlour-smallprint"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#parlour-smallprint');
    expect(possessed).not.toBeNull();
    expect(possessed!.id).toBe(room.possessedId);
  });

  it('is keyboard-reachable with a non-empty accessible name', () => {
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
    // Label in Name (WCAG 2.5.3): no aria-label overrides the visible text, so
    // the accessible name IS the visible small-print text.
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('has no aria-label, so its accessible name starts with its visible text', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#parlour-smallprint') as HTMLButtonElement;
    expect(possessed.getAttribute('aria-label')).toBeNull();
    const visible = possessed.querySelector('.trial-smallprint-label')!.textContent || '';
    expect(visible).toMatch(/^Then £9\.99 a month from 13 November/);
  });
});

describe('The Parlour — the ghost size and anchor', () => {
  it('renders the ghost SVG at about 120 x 140 px inside the possessed small print', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#parlour-smallprint')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost to the possessed small print itself (.trial-smallprint-label)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the small print's label, so the ghost
    // peeks beside the paragraph (at its height), not over the button, the
    // headline or the inputs.
    const signs = container.querySelector('.trial-smallprint-label > .ghost-signs');
    expect(signs).not.toBeNull();
  });

  it('caps the paragraph at a max width so the ghost has its own space, and a reserved strip under 600px', () => {
    // At 1920 the paragraph is capped (~60ch) so the 120 x 140 ghost sits just
    // right of its end; under 600px a smaller ghost rises from a reserved strip
    // under the paragraph, so there is no horizontal overflow at 412px.
    expect(css).toMatch(/\.trial-smallprint-label\s*\{[^}]*max-width:\s*60ch/);
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
  });

  it('places the small print far below the button (placement is the trick)', () => {
    // The small print carries a large top margin so the terms sit far from the
    // bright offer button — the trick is size, weight and placement.
    expect(css).toMatch(/\.trial-smallprint\s*\{[^}]*margin:\s*var\(--spacing-xl\)/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.trial-card\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.gloamline\s*\{[^}]*(min-height|height)\s*:/);
  });
});

describe('The Parlour — pattern rule (passes on honest, fails on haunted)', () => {
  it('on the haunted side the three facts live ONLY in the small print, and the button does not name the price', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The three material facts all sit inside the possessed small print.
    const smallPrint =
      container.querySelector('#parlour-smallprint .trial-smallprint-label')!.textContent || '';
    expect(materialFacts(smallPrint)).toBe(3);

    // The bright offer button names only the "free" part — not the recurring
    // price. Hidden subscription: the charge is hidden from the primary action.
    const startBtn = screen.getByRole('button', { name: 'Start my free trial' });
    expect(RECURRING_PRICE.test(startBtn.textContent || '')).toBe(false);

    // Styled small and light, not at body size — quiet by size/weight/placement.
    expect(css).toMatch(/\.trial-smallprint-label\s*\{[^}]*font-size:\s*0\.75rem/);
  });

  it('on the honest side the three facts sit beside the button at body size, and the button names the price', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // The three facts appear in a plain list beside the button (body size).
    const terms = container.querySelector('.trial-terms-honest')!.textContent || '';
    expect(materialFacts(terms)).toBe(3);
    // The button itself names the recurring price.
    const startBtn = screen.getByRole('button', {
      name: /Start free trial, then £9\.99 a month/i,
    });
    expect(RECURRING_PRICE.test(startBtn.textContent || '')).toBe(true);
    // There is no small-print possessed element on the honest side.
    expect(container.querySelector('#parlour-smallprint')).toBeNull();
    expect(container.querySelector('.trial-smallprint')).toBeNull();
  });

  it('the pattern rule is variant-specific: hidden-in-small-print and named-on-button cannot both hold', () => {
    // Haunted: the recurring price is absent from the primary button and buried
    // in the small print. Honest: the recurring price is named on the button
    // and shown beside it at body size. If the haunted button ever named the
    // price (or the honest one hid it), one of the assertions above would fail,
    // so this detects Hidden subscription, not a variant-agnostic rule.
    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestBtn = honest.getByRole('button', {
      name: /Start free trial, then £9\.99 a month/i,
    });
    const honestButtonNamesPrice = RECURRING_PRICE.test(honestBtn.textContent || '');

    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedBtn = haunted.getByRole('button', { name: 'Start my free trial' });
    const hauntedButtonNamesPrice = RECURRING_PRICE.test(hauntedBtn.textContent || '');

    expect(honestButtonNamesPrice).toBe(true);
    expect(hauntedButtonNamesPrice).toBe(false);
    expect(honestButtonNamesPrice).not.toBe(hauntedButtonNamesPrice);
  });
});

describe('The Parlour — the ghost act (Hidden subscription performed)', () => {
  it('renders the dragging hook (.act-hook) in the haunted view, aria-hidden', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The act lives inside the ghost-wrap, beside the possessed small print.
    const wrap = container.querySelector('.trial-smallprint .ghost-wrap .act-hook-wrap');
    expect(wrap).not.toBeNull();
    // Decorative: aria-hidden, so it adds nothing to the accessible name.
    expect(wrap!.getAttribute('aria-hidden')).toBe('true');
    const hook = wrap!.querySelector('.act-hook');
    expect(hook).not.toBeNull();
    expect(hook!.querySelector('.act-hook-line')).not.toBeNull();
    // Non-interactive in CSS: never blocks input to the small print.
    expect(css).toMatch(/\.act-hook-wrap\s*\{[^}]*pointer-events:\s*none/);
    // The drag cycle is at least 4 s (here 5 s).
    expect(css).toMatch(/\.act-hook-wrap\s*\{[^}]*animation:\s*parlour-hook-drag\s*5s/);
    // Transforms only — no layout-shifting properties in the keyframes.
    const frames = css.match(/@keyframes parlour-hook-drag\s*\{[^]*?\n\}/);
    expect(frames).not.toBeNull();
    expect(frames![0]).toMatch(/transform:\s*translateY/);
    expect(frames![0]).not.toMatch(/\b(margin|top|height|width|bottom)\s*:/);
    // The act never adds to the possessed element's accessible name.
    const possessed = container.querySelector('#parlour-smallprint') as HTMLButtonElement;
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect(possessed.textContent).not.toMatch(/the price is hiding below/i);
  });

  it('reserves the hook\u2019s space on a wrapper so the act causes no layout shift', () => {
    // The box is reserved on .act-hook-wrap (absolute, sized), and only its
    // transform changes in the keyframes — nothing reflows.
    expect(css).toMatch(/\.act-hook-wrap\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(/\.act-hook-wrap\s*\{[^}]*width:\s*40px/);
    expect(css).toMatch(/\.act-hook-wrap\s*\{[^}]*height:\s*96px/);
  });

  it('the act is absent in preview mode (the split\u2019s before side)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
        preview
      />,
    );
    // Preview shows no ghost signs at all, so no act element.
    expect(container.querySelector('.act-hook-wrap')).toBeNull();
    expect(container.querySelector('.ghost-signs')).toBeNull();
  });

  it('the act is absent in the honest twin', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('.act-hook-wrap')).toBeNull();
    expect(container.querySelector('.ghost-wrap')).toBeNull();
  });

  it('the hook sits beside the small print, never over its label text', () => {
    // The ghost-signs anchor is at left:100% of the label, and the act-hook-wrap
    // is inside the ghost-wrap — so the hook is clear of the label (z-index 3)
    // and its focus ring.
    expect(css).toMatch(/\.ghost-signs\s*\{[^}]*left:\s*100%/);
    expect(css).toMatch(/\.trial-smallprint-label\s*\{[^}]*z-index:\s*3/);
  });

  it('stops the act when the ghost is named, so the shared unwind takes over', () => {
    // The engine sets data-moment='right' on .room-scene from `named` onward;
    // this room halts the hook's own drag then, without touching the shared
    // flee (which still owns .ghost-wrap).
    expect(css).toMatch(
      /\.room-scene\[data-moment='right'\]\s+\.act-hook-wrap\s*\{[^}]*animation:\s*none/,
    );
    // The room adds no flee of its own on .ghost-wrap (shared layer owns it).
    expect(css).not.toMatch(/\.ghost-wrap\s*\{[^}]*animation:\s*[^;]*flee/);
  });
});

describe('The Parlour — contrast and axe on both variants', () => {
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

describe('The Parlour — reduced motion static indicator', () => {
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

  it('the possessed ghost signs show a static indicator and do not animate', () => {
    const { container } = render(<Room room={room} rng={() => 0} />);
    const possessed = container.querySelector('#parlour-smallprint')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('under reduced motion the still hook pose and the "the price is hiding below" caption render', () => {
    const { container } = render(<Room room={room} rng={() => 0} />);
    // The still hook pose is present (no animation).
    expect(container.querySelector('.act-hook-wrap')).not.toBeNull();
    // Both the caption and the stirs label show.
    expect(screen.getByText('the price is hiding below')).toBeDefined();
    expect(screen.getByText('Something stirs here')).toBeDefined();
    // The reduced-motion rule holds the hook still.
    expect(css).toMatch(
      /\.trial-smallprint\.reduced-motion\s+\.act-hook-wrap\s*\{[^}]*animation:\s*none/,
    );
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={() => 0} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    const wrong = await screen.findByRole('button', { name: 'Hidden costs' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/charge that starts later/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

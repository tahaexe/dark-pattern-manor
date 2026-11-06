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
const manorCss = readFileSync(join(here, '../../styles/manor.css'), 'utf8');
const identityRng = () => 0;

/** The possessed decline link's visible text, which is also its accessible name. */
const POSSESSED_NAME = /No thanks, I.?d rather pay full price/i;

/**
 * Count the guilt / shame markers in a decline wording. A plain "No thanks"
 * has zero; the haunted decline is written to shame ("rather pay full price",
 * "eat cold soup alone"). This is the structural signal of Confirmshaming for
 * this room: the trick lives in how the "no" is worded, not in the offer.
 */
function shameCount(text: string): number {
  const markers =
    text
      .toLowerCase()
      .match(/\b(rather pay full price|cold soup|alone|foolish|miss out|pay full price)\b/g) || [];
  return markers.length;
}

describe('The Dining Room — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "close the discount pop-up" in one click (the close button)', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One click on the visible close button closes the pop-up.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('completes the task with the plain "No thanks" choice in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('Escape closes the honest pop-up (a real dialog) in one keystroke', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmshaming' }));
    await screen.findByRole('heading', { level: 2, name: 'Confirmshaming' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });
});

describe('The Dining Room — the possessed element', () => {
  it('is found by its id "dining-decline"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#dining-decline');
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
    // the accessible name IS the visible shaming sentence.
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
    const possessed = container.querySelector('#dining-decline') as HTMLButtonElement;
    expect(possessed.getAttribute('aria-label')).toBeNull();
    const visible = possessed.querySelector('.discount-decline-label')!.textContent || '';
    expect(visible).toMatch(/^No thanks, I.?d rather pay full price/);
  });
});

describe('The Dining Room — the pop-up is a real overlay dialog', () => {
  it('the haunted pop-up is a modal dialog labelled by its heading', () => {
    render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const dialog = screen.getByRole('dialog');
    // A real modal dialog: role, aria-modal and a label (its heading).
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('dining-pop-title');
    expect(document.getElementById('dining-pop-title')!.textContent).toMatch(/15% off/);
  });

  it('the haunted pop-up has NO close button (only the shaming link closes it — the trap)', () => {
    render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // No "Close" affordance at all: the decline link is the only way out.
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
  });

  it('renders the shop page underneath and a dim backdrop over it, with the pop-up centred', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The shop page (masthead + menu cards) sits in flow underneath.
    const shopPage = container.querySelector('.grimsupper-shop-page');
    expect(shopPage).not.toBeNull();
    expect(shopPage!.querySelector('.grimsupper-masthead')).not.toBeNull();
    expect(shopPage!.querySelectorAll('.dish-card')).toHaveLength(2);
    // A real overlay: backdrop + the pop-up both live inside .discount-overlay.
    const overlay = container.querySelector('.discount-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.querySelector('.discount-backdrop')).not.toBeNull();
    expect(overlay!.querySelector('.discount-pop')).not.toBeNull();
    // The overlay is absolutely positioned and the backdrop is the manor ink.
    expect(css).toMatch(/\.discount-overlay\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(/\.discount-backdrop\s*\{[^}]*--manor-night/);
    // No fixed or minimum heights on the shop page or its cards.
    expect(css).not.toMatch(/\.grimsupper-shop-page\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.dish-card\s*\{[^}]*(min-height|height)\s*:/);
  });

  it('the honest pop-up is a modal dialog with a visible close button', () => {
    render(<Honest onCompleteTask={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('dining-pop-title-honest');
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
  });

  it('the honest pop-up also uses the overlay + backdrop', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    const overlay = container.querySelector('.discount-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.querySelector('.discount-backdrop')).not.toBeNull();
    expect(overlay!.querySelector('.discount-pop')).not.toBeNull();
    expect(container.querySelector('.grimsupper-shop-page')).not.toBeNull();
  });
});

describe('The Dining Room — the ghost size and anchor', () => {
  it('renders the ghost SVG at about 120 x 140 px inside the possessed link', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#dining-decline')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost to the possessed decline link itself (.discount-decline-label)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the decline link's label, so the ghost
    // peeks beside the link (at the link's height), not over the offer button,
    // the heading or the body.
    const signs = container.querySelector('.discount-decline-label > .ghost-signs');
    expect(signs).not.toBeNull();
  });

  it('reserves bottom room in the pop-up so the whole ghost is drawn, uncut', () => {
    // At 1920 the 120 x 140 ghost sits just right of the capped link's end; the
    // pop-up reserves extra bottom padding so the ghost's lower part is not cut
    // by the pop-up's bottom edge. Under 600px a smaller ghost rises from a
    // reserved strip under the link, so there is no horizontal overflow.
    expect(css).toMatch(/\.discount-decline-label\s*\{[^}]*max-width:\s*60ch/);
    expect(css).toMatch(/\.discount-pop\s*\{[^}]*padding-bottom:\s*90px/);
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
  });
});

describe('The shared task bar — two rows under 600px', () => {
  it('under 600px the task bar lays the title+lantern on row one and the task on row two', () => {
    // A single 600px breakpoint turns the bar into a two-row grid: the title
    // and lantern on the first row, the task spanning the full width on the
    // second. Above 600px it keeps its one-row flex layout.
    expect(manorCss).toMatch(/@media[^{]*max-width:\s*600px/);
    // The task bar becomes a grid under the breakpoint.
    expect(manorCss).toMatch(
      /@media[^{]*max-width:\s*600px[^]*?\.task-bar\s*\{[^}]*display:\s*grid/,
    );
    // The task spans the full width on the second row.
    expect(manorCss).toMatch(/\.task-bar-task\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
    expect(manorCss).toMatch(/\.task-bar-task\s*\{[^}]*grid-row:\s*2/);
  });
});

describe('The Dining Room — pattern rule (passes on honest, fails on haunted)', () => {
  it('on the haunted side the decline is a dim text link whose wording shames you', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#dining-decline')!;
    const label = possessed.querySelector('.discount-decline-label')!;
    // Confirmshaming: the "no" is written to shame (one or more guilt markers).
    expect(shameCount(label.textContent || '')).toBeGreaterThanOrEqual(1);
    // Styled as a quiet, underlined text link, not a full button (size, weight,
    // placement make it hard to pick — not low contrast).
    expect(possessed.className).toContain('discount-decline');
    expect(css).toMatch(/\.discount-decline\s*\{[^}]*text-decoration:\s*underline/);
  });

  it('on the honest side the decline is a plain, equal choice with no shame', () => {
    render(<Honest onCompleteTask={() => {}} />);
    const decline = screen.getByRole('button', { name: 'No thanks' });
    // Zero guilt markers: a plain "No thanks".
    expect(shameCount(decline.textContent || '')).toBe(0);
    // Both choices are the same kind of button (equal class), not a dim link.
    const offer = screen.getByRole('button', { name: 'Get 15% off' });
    expect(decline.className).toContain('discount-button-equal');
    expect(offer.className).toContain('discount-button-equal');
    expect(decline.className).toBe(offer.className);
  });

  it('the pattern rule is variant-specific: haunted shame and honest plainness cannot both hold', () => {
    // Honest decline has zero shame markers; haunted has one or more. If the
    // haunted side were ever rewritten as a plain "No thanks", the test above
    // would fail — so this detects Confirmshaming, not a variant-agnostic rule.
    render(<Honest onCompleteTask={() => {}} />);
    const honestText = screen.getByRole('button', { name: 'No thanks' }).textContent || '';

    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedText =
      container.querySelector('#dining-decline .discount-decline-label')!.textContent || '';

    expect(shameCount(honestText)).toBe(0);
    expect(shameCount(hauntedText)).toBeGreaterThanOrEqual(1);
    expect(shameCount(honestText)).not.toBe(shameCount(hauntedText));
  });
});

describe('The Dining Room — contrast and axe on both variants', () => {
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

describe('The Dining Room — reduced motion static indicator', () => {
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
    const { container } = render(<Room room={room} rng={identityRng} />);
    const possessed = container.querySelector('#dining-decline')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    const wrong = await screen.findByRole('button', { name: 'Nagging' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/talks to you/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

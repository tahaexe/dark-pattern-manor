import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/preact';
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

/**
 * The possessed sneaked line's visible text, which is also its accessible name.
 * The price is included so this never also matches the "Remove Ghost
 * Protection" button beside it.
 */
const POSSESSED_NAME = /Ghost Protection \u00a32\.99/i;
/** The sneaked line's own Remove button (aria-label). */
const REMOVE_NAME = /^Remove Ghost Protection$/i;

describe('The Pantry — honest variant', () => {
  beforeEach(() => __resetForTests());
  afterEach(() => cleanup());

  it('completes "pay only for what you picked" in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One calm click on "Pay £3.60" — nothing sneaked into the basket.
    fireEvent.click(screen.getByRole('button', { name: /Pay \u00a33\.60/ }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sneaking' }));
    await screen.findByRole('heading', { level: 2, name: 'Sneaking' });
    // The split renders the haunted preview (aria-hidden) and the honest twin;
    // only the honest "Pay £3.60" is reachable by role.
    fireEvent.click(screen.getByRole('button', { name: /Pay \u00a33\.60/ }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });

  it('the basket totals £3.60 with only the two picked items', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // Only the two picked lines are in the basket (no sneaked third line).
    const lines = container.querySelectorAll('.basket-lines .basket-line');
    expect(lines.length).toBe(2);
    expect(container.querySelector('#pantry-sneaked-line')).toBeNull();
    expect(container.querySelector('.basket-line-sneaked')).toBeNull();
    // The total is £3.60 — only what was picked.
    const total = container.querySelector('.basket-total-amount')!.textContent || '';
    expect(total).toBe('\u00a33.60');
    expect(screen.getByRole('button', { name: /Pay \u00a33\.60/ })).toBeDefined();
  });

  it('offers Ghost Protection as an unticked option OUTSIDE the basket', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // The add-on is offered outside the basket card.
    const addon = container.querySelector('.addon-offer');
    expect(addon).not.toBeNull();
    expect(container.querySelector('.basket-card .addon-offer')).toBeNull();
    // It is a real checkbox and it is unticked.
    const checkbox = addon!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);
    // Its price is shown plainly.
    expect(addon!.textContent || '').toMatch(/\u00a32\.99/);
  });
});

describe('The Pantry — the possessed element', () => {
  afterEach(() => cleanup());

  it('is found by its id "pantry-sneaked-line"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#pantry-sneaked-line');
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
    // the accessible name IS the visible line text.
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('has its Remove button as a SIBLING, never a button inside a button', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#pantry-sneaked-line') as HTMLButtonElement;
    // No nested button inside the possessed line button.
    expect(possessed.querySelector('button')).toBeNull();
    // The Remove button exists and is a sibling in the same row.
    const remove = screen.getByRole('button', { name: REMOVE_NAME }) as HTMLButtonElement;
    expect(remove.tagName).toBe('BUTTON');
    expect(possessed.parentElement).toBe(remove.parentElement);
  });

  it('is NOT a live region: the total has no aria-live and no announcing role', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const total = container.querySelector('.basket-total') as HTMLElement;
    expect(total.getAttribute('aria-live')).toBeNull();
    expect(total.getAttribute('role')).not.toBe('status');
    expect(total.getAttribute('role')).not.toBe('alert');
    // Nothing anywhere in the basket turns the total into a live region.
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    // The total uses tabular figures so it never changes width.
    expect(css).toMatch(/\.basket-total-amount\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
  });
});

describe('The Pantry — the sneaked line returns and the total follows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  function totalText(container: HTMLElement): string {
    return container.querySelector('.basket-total-amount')!.textContent || '';
  }

  it('starts with the sneaked line in the basket and a total of £6.59', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    expect(container.querySelector('#pantry-sneaked-line')).not.toBeNull();
    expect(totalText(container)).toBe('\u00a36.59');
  });

  it('comes back about 1.5 s after Remove, with the total following (6.59 → 3.60 → 6.59)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // Removing the sneaked line drops it and the total immediately.
    fireEvent.click(screen.getByRole('button', { name: REMOVE_NAME }));
    expect(container.querySelector('#pantry-sneaked-line')).toBeNull();
    expect(totalText(container)).toBe('\u00a33.60');
    // Just before 1.5 s it is still gone.
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(container.querySelector('#pantry-sneaked-line')).toBeNull();
    expect(totalText(container)).toBe('\u00a33.60');
    // At ~1.5 s the line quietly comes back and the total returns to £6.59.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(container.querySelector('#pantry-sneaked-line')).not.toBeNull();
    expect(totalText(container)).toBe('\u00a36.59');
  });

  it('clears its one timer on unmount (no return fires after the room is gone)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { container, unmount } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // Start the return timer, then leave before it fires.
    fireEvent.click(screen.getByRole('button', { name: REMOVE_NAME }));
    expect(container.querySelector('#pantry-sneaked-line')).toBeNull();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    // The cleanup cleared the pending timer on unmount.
    expect(clearSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    clearSpy.mockRestore();
  });

  it('under reduced motion the line still comes back after ~1.5 s (no fade or movement)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: REMOVE_NAME }));
    expect(container.querySelector('#pantry-sneaked-line')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // It comes back by a state change; the CSS disables animation under
    // reduced motion.
    expect(container.querySelector('#pantry-sneaked-line')).not.toBeNull();
    expect(container.querySelector('.basket-total-amount')!.textContent).toBe('\u00a36.59');
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });
});

describe('The Pantry — the ghost size and anchor', () => {
  afterEach(() => cleanup());

  it('renders the ghost SVG at about 120 x 140 px inside the possessed line', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#pantry-sneaked-line')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost to the possessed line itself (.basket-sneaked-text)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the line's text, so the ghost peeks
    // beside the line (at its height), not over a price or the Remove button.
    const signs = container.querySelector('.basket-sneaked-text > .ghost-signs');
    expect(signs).not.toBeNull();
  });

  it('reserves a strip under the line under 600px so the ghost never overlaps text', () => {
    // At 1920 the 120 x 140 ghost sits just right of the line; under 600px a
    // smaller ghost (about 72 x 84) rises from a reserved strip under the
    // line's text, so there is no horizontal overflow at 412px.
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
    expect(css).toMatch(/\.basket-sneaked-text\s*\{[^}]*padding-bottom:\s*88px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*width:\s*72px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*height:\s*84px/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.basket-card\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.mothmilk\s*\{[^}]*(min-height|height)\s*:/);
  });
});

describe('The Pantry — the ghost act (Sneaking performed)', () => {
  afterEach(() => cleanup());

  it('the act element exists in the haunted view, beside the ghost, and is aria-hidden', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The carried token lives inside the ghost-wrap, acting out the line
    // slipping back in.
    const carry = container.querySelector('.ghost-wrap > .act-carry');
    expect(carry).not.toBeNull();
    // It is decorative: aria-hidden and non-interactive, so it adds nothing to
    // the accessible name or to any live announcement.
    expect(carry!.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.act-carry button')).toBeNull();
    expect(container.querySelector('.act-carry[aria-live]')).toBeNull();
    // Transforms/opacity only, pointer-events none, one cycle >= 4 s, and it
    // freezes when the ghost is named.
    expect(css).toMatch(/\.act-carry\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/animation:\s*pantry-carry\s*5s/);
    expect(css).toMatch(/\.room-scene\[data-moment='right'\]\s*\.act-carry/);
  });

  it('the act is absent from the preview (comparison before side) and the honest twin', () => {
    const preview = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
        preview
      />,
    );
    // Preview is the static "before" side: no ghost signs, so no act either.
    expect(preview.container.querySelector('.act-carry')).toBeNull();
    cleanup();

    const honest = render(<Honest onCompleteTask={() => {}} />);
    expect(honest.container.querySelector('.act-carry')).toBeNull();
  });

  it('with reduced motion renders the still pose and the caption "it slips back in" plus the stirs label', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion
      />,
    );
    // The still pose: the carried token is present (held, not drifting).
    expect(container.querySelector('.act-carry')).not.toBeNull();
    // The caption names the act, beside the existing "Something stirs here".
    expect(screen.getByText('it slips back in')).toBeDefined();
    expect(screen.getByText('Something stirs here')).toBeDefined();
    // Under reduced motion every act animation is off.
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/\.basket-sneaked\.reduced-motion\s*\.act-carry\s*\{[^}]*animation:\s*none/);
  });
});

describe('The Pantry — pattern rule (passes on honest, fails on haunted)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('on the haunted side a sneaked line is present, the total includes it, and it returns after removal', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // Sneaking: a line nobody picked, already in the basket, in the total.
    expect(container.querySelector('#pantry-sneaked-line')).not.toBeNull();
    const total = () => container.querySelector('.basket-total-amount')!.textContent || '';
    expect(total()).toBe('\u00a36.59');
    // Remove it: gone for a moment, then it walks back in.
    fireEvent.click(screen.getByRole('button', { name: REMOVE_NAME }));
    expect(container.querySelector('#pantry-sneaked-line')).toBeNull();
    expect(total()).toBe('\u00a33.60');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(container.querySelector('#pantry-sneaked-line')).not.toBeNull();
    expect(total()).toBe('\u00a36.59');
  });

  it('on the honest side there is no sneaked line; the total is £3.60', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('#pantry-sneaked-line')).toBeNull();
    expect(container.querySelector('.basket-line-sneaked')).toBeNull();
    expect(container.querySelector('.basket-total-amount')!.textContent).toBe('\u00a33.60');
    // Ghost Protection is still offered, but as an unticked option outside the
    // basket — the visitor chooses it.
    const checkbox = container.querySelector(
      '.addon-offer input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('the pattern rule is variant-specific: a returning sneaked line vs none cannot both hold', () => {
    // Haunted has a sneaked line and a total that includes it; honest has
    // neither. If the haunted side ever lost its sneaked line (or the honest
    // side gained one in the basket), one of the assertions above would fail —
    // so this detects Sneaking, not a variant-agnostic rule.
    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestHasSneaked = honest.container.querySelector('#pantry-sneaked-line') !== null;
    cleanup();

    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedHasSneaked = haunted.container.querySelector('#pantry-sneaked-line') !== null;

    expect(hauntedHasSneaked).toBe(true);
    expect(honestHasSneaked).toBe(false);
    expect(hauntedHasSneaked).not.toBe(honestHasSneaked);
  });
});

describe('The Pantry — contrast and axe on both variants', () => {
  afterEach(() => cleanup());

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

describe('The Pantry — reduced motion static indicator', () => {
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
    cleanup();
    matchMediaSpy?.mockRestore();
  });

  it('the possessed ghost signs show a static indicator and do not animate', () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    const possessed = container.querySelector('#pantry-sneaked-line')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    // "Confirmshaming" is a wrong card here (correct is Sneaking).
    const wrong = await screen.findByRole('button', { name: 'Confirmshaming' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/no one is insulting you/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

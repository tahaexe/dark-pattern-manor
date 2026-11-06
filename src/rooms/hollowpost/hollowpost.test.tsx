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

/** The possessed banner's visible text, which is also its accessible name. */
const POSSESSED_NAME = /Offer ends in/i;

describe('The Conservatory — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "buy the ticket without rushing" in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One calm click on the Buy button — there is no countdown pushing you.
    fireEvent.click(screen.getByRole('button', { name: 'Buy ticket' }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Fake urgency' }));
    await screen.findByRole('heading', { level: 2, name: 'Fake urgency' });
    // The split renders the haunted preview (aria-hidden) and the honest twin;
    // only the honest "Buy ticket" is reachable by role.
    fireEvent.click(screen.getByRole('button', { name: 'Buy ticket' }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });

  it('shows the real deadline as a fixed calendar date, with no countdown', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(screen.getByText('Tickets on sale until 31 October')).toBeDefined();
    // No countdown banner, no clock, on the honest side.
    expect(container.querySelector('#conservatory-countdown')).toBeNull();
    expect(container.querySelector('.ticket-countdown')).toBeNull();
    expect(container.querySelector('.ticket-countdown-clock')).toBeNull();
  });
});

describe('The Conservatory — the possessed element', () => {
  it('is found by its id "conservatory-countdown"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#conservatory-countdown');
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
    // the accessible name IS the visible banner text.
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
    const possessed = container.querySelector('#conservatory-countdown') as HTMLButtonElement;
    expect(possessed.getAttribute('aria-label')).toBeNull();
    const visible = possessed.querySelector('.ticket-countdown-label')!.textContent || '';
    expect(visible).toMatch(/^Offer ends in/);
  });

  it('is NOT a live region: no aria-live and no role="timer"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#conservatory-countdown') as HTMLButtonElement;
    // The countdown does not announce every second: no aria-live, no timer role.
    expect(possessed.getAttribute('aria-live')).toBeNull();
    expect(possessed.getAttribute('role')).not.toBe('timer');
    // Nor does any descendant turn it into a live region.
    expect(possessed.querySelector('[aria-live]')).toBeNull();
    expect(possessed.querySelector('[role="timer"]')).toBeNull();
    // The clock uses tabular figures so the banner never changes width.
    expect(css).toMatch(/\.ticket-countdown-clock\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
  });
});

describe('The Conservatory — the countdown timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  function clockText(container: HTMLElement): string {
    return container.querySelector('.ticket-countdown-clock')!.textContent || '';
  }

  it('ticks down second by second from 04:59', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    expect(clockText(container)).toBe('04:59');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(clockText(container)).toBe('04:58');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(clockText(container)).toBe('04:56');
  });

  it('quietly resets from 00:00 back to 04:59 when it runs out (the fake)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // Start is 04:59 = 299 seconds. Run down to 00:00 (299 ticks).
    act(() => {
      vi.advanceTimersByTime(299 * 1000);
    });
    expect(clockText(container)).toBe('00:00');
    // One more second: the deadline never arrives — it starts again at 04:59.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(clockText(container)).toBe('04:59');
  });

  it('clears its one timer on unmount (no further ticks after the room is gone)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { container, unmount } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(clockText(container)).toBe('04:58');
    unmount();
    // The effect's cleanup cleared the interval on unmount.
    expect(clearSpy).toHaveBeenCalled();
    // No pending timers remain to fire after unmount.
    expect(vi.getTimerCount()).toBe(0);
    clearSpy.mockRestore();
  });

  it('does not tick under reduced motion (the clock stays still at 04:59)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion
      />,
    );
    expect(clockText(container)).toBe('04:59');
    // No interval is started under reduced motion, so time passing changes
    // nothing.
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(clockText(container)).toBe('04:59');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('The Conservatory — the ghost size and anchor', () => {
  it('renders the ghost SVG at about 120 x 140 px inside the possessed banner', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#conservatory-countdown')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost to the possessed banner itself (.ticket-countdown-label)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the banner's label, so the ghost peeks
    // beside the banner (at its height), not over the price or the button.
    const signs = container.querySelector('.ticket-countdown-label > .ghost-signs');
    expect(signs).not.toBeNull();
  });

  it('reserves a strip under the banner under 600px so the ghost never overlaps text', () => {
    // At 1920 the 120 x 140 ghost sits just right of the banner; under 600px a
    // smaller ghost rises from a reserved strip under the banner label, so
    // there is no horizontal overflow at 412px.
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
    expect(css).toMatch(/\.ticket-countdown-label\s*\{[^}]*padding-bottom:\s*88px/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.ticket-card\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.hollowpost\s*\{[^}]*(min-height|height)\s*:/);
  });
});

describe('The Conservatory — pattern rule (passes on honest, fails on haunted)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('on the haunted side a countdown banner is present and resets from 00:00 to 04:59', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // Fake urgency: a counting-down banner whose deadline resets, never arrives.
    const banner = container.querySelector('#conservatory-countdown');
    expect(banner).not.toBeNull();
    const clock = () => container.querySelector('.ticket-countdown-clock')!.textContent || '';
    act(() => {
      vi.advanceTimersByTime(299 * 1000);
    });
    expect(clock()).toBe('00:00');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(clock()).toBe('04:59');
  });

  it('on the honest side there is no countdown; the deadline is a fixed date', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // No countdown banner and no clock.
    expect(container.querySelector('#conservatory-countdown')).toBeNull();
    expect(container.querySelector('.ticket-countdown')).toBeNull();
    expect(container.querySelector('.ticket-countdown-clock')).toBeNull();
    // The deadline is a fixed calendar date, plain text.
    expect(screen.getByText('Tickets on sale until 31 October')).toBeDefined();
  });

  it('the pattern rule is variant-specific: a resetting clock and no clock cannot both hold', () => {
    // Haunted has a countdown banner that resets; honest has none. If the
    // haunted side ever lost its resetting clock (or the honest side gained
    // one), one of the assertions above would fail — so this detects Fake
    // urgency, not a variant-agnostic rule.
    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestHasCountdown =
      honest.container.querySelector('.ticket-countdown') !== null;

    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedHasCountdown =
      haunted.container.querySelector('#conservatory-countdown') !== null;

    expect(hauntedHasCountdown).toBe(true);
    expect(honestHasCountdown).toBe(false);
    expect(hauntedHasCountdown).not.toBe(honestHasCountdown);
  });
});

describe('The Conservatory — contrast and axe on both variants', () => {
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

describe('The Conservatory — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#conservatory-countdown')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    const wrong = await screen.findByRole('button', { name: 'Fake scarcity' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/about the clock/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

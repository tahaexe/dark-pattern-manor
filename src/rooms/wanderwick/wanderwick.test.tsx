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

/** The possessed pop-up question's visible text — also its accessible name. */
const POSSESSED_NAME = /Enjoying Wanderwick\? Turn on notifications!/i;
/** The haunted pop-up's two choices. */
const YES_NAME = /^Yes$/;
const NOT_NOW_NAME = /^Not now$/;
/** The honest prompt's real way out. */
const NO_MORE_NAME = /^No, don't ask again$/;
const TURN_ON_NAME = /^Turn on$/;

describe('The Nursery — honest variant', () => {
  beforeEach(() => __resetForTests());
  afterEach(() => cleanup());

  it('completes "keep playing" in one click with "No, don\'t ask again"', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One click on the real "No, don't ask again" ends the nagging for good.
    fireEvent.click(screen.getByRole('button', { name: NO_MORE_NAME }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('completes "keep playing" in one click with "Turn on" too', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    fireEvent.click(screen.getByRole('button', { name: TURN_ON_NAME }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nagging' }));
    await screen.findByRole('heading', { level: 2, name: 'Nagging' });
    // The split renders the haunted preview (aria-hidden) and the honest twin;
    // only the honest choices are reachable by role.
    fireEvent.click(screen.getByRole('button', { name: NO_MORE_NAME }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });

  it('offers a real "No, don\'t ask again" and ends the prompt for good', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // Both choices exist; "No, don't ask again" is a real way out.
    expect(screen.getByRole('button', { name: TURN_ON_NAME })).toBeDefined();
    const noMore = screen.getByRole('button', { name: NO_MORE_NAME });
    // Once answered, the prompt is gone for good — no returning #nursery-prompt.
    fireEvent.click(noMore);
    expect(container.querySelector('.nag-popup')).toBeNull();
    expect(container.querySelector('#nursery-prompt')).toBeNull();
    expect(screen.queryByRole('button', { name: NO_MORE_NAME })).toBeNull();
  });
});

describe('The Nursery — the possessed element', () => {
  afterEach(() => cleanup());

  it('is found by its id "nursery-prompt"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#nursery-prompt');
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
    // the accessible name IS the visible question text.
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('has "Yes" and "Not now" as SIBLINGS, never buttons inside a button', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#nursery-prompt') as HTMLButtonElement;
    // No nested button inside the possessed question button.
    expect(possessed.querySelector('button')).toBeNull();
    // Both choices are real sibling buttons within the same pop-up card.
    const yes = screen.getByRole('button', { name: YES_NAME }) as HTMLButtonElement;
    const notNow = screen.getByRole('button', { name: NOT_NOW_NAME }) as HTMLButtonElement;
    expect(yes.tagName).toBe('BUTTON');
    expect(notNow.tagName).toBe('BUTTON');
    // They share the actions row, which is a sibling of the question button.
    expect(yes.parentElement).toBe(notNow.parentElement);
    expect(yes.closest('#nursery-prompt')).toBeNull();
    expect(notNow.closest('#nursery-prompt')).toBeNull();
  });

  it('is a NON-MODAL dialog: role="dialog", aria-labelledby, no aria-modal', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const dialog = container.querySelector('.nag-popup') as HTMLElement;
    expect(dialog.getAttribute('role')).toBe('dialog');
    // Labelled by the question, with no aria-modal (it is non-modal).
    const labelledby = dialog.getAttribute('aria-labelledby');
    expect(labelledby).toBe('nursery-prompt-question');
    expect(container.querySelector(`#${labelledby}`)).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBeNull();
  });

  it('is NOT a live region: nothing announces the pop-up or the counter', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // No aria-live or announcing role anywhere in the haunted screen.
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    // The counter uses tabular, lining figures so it never changes width.
    expect(css).toMatch(/\.nag-counter-num\s*\{[^}]*font-variant-numeric:\s*tabular-nums lining-nums/);
  });
});

describe('The Nursery — the pop-up nags again and counts up', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('starts with the pop-up open and no counter yet', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    expect(container.querySelector('#nursery-prompt')).not.toBeNull();
    // First ask: the counter row is not shown yet.
    expect(container.querySelector('.nag-counter')).toBeNull();
  });

  it('closes on "Not now" and comes back ~3 s later with the counter up', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // "Not now" closes the pop-up.
    fireEvent.click(screen.getByRole('button', { name: NOT_NOW_NAME }));
    expect(container.querySelector('#nursery-prompt')).toBeNull();
    expect(container.querySelector('.nag-popup')).toBeNull();
    // Just before 3 s it is still closed.
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(container.querySelector('#nursery-prompt')).toBeNull();
    // At ~3 s it nags again, now with "Asked 2 times".
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(container.querySelector('#nursery-prompt')).not.toBeNull();
    const counter = container.querySelector('.nag-counter');
    expect(counter).not.toBeNull();
    expect((counter!.textContent || '').replace(/\s+/g, ' ').trim()).toBe('Asked 2 times');
  });

  it('keeps counting up every time ("Asked 3 times" after a second "Not now")', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: NOT_NOW_NAME }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect((container.querySelector('.nag-counter')!.textContent || '').replace(/\s+/g, ' ').trim()).toBe(
      'Asked 2 times',
    );
    // Dismiss again: it returns a third time.
    fireEvent.click(screen.getByRole('button', { name: NOT_NOW_NAME }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect((container.querySelector('.nag-counter')!.textContent || '').replace(/\s+/g, ' ').trim()).toBe(
      'Asked 3 times',
    );
  });

  it('does not move focus by itself when the pop-up comes back', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // Put focus somewhere outside the pop-up, then dismiss and wait for return.
    const outside = document.createElement('button');
    outside.textContent = 'elsewhere';
    document.body.appendChild(outside);
    fireEvent.click(screen.getByRole('button', { name: NOT_NOW_NAME }));
    outside.focus();
    expect(document.activeElement).toBe(outside);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // The pop-up is back, but focus has NOT jumped to it.
    expect(container.querySelector('#nursery-prompt')).not.toBeNull();
    expect(document.activeElement).toBe(outside);
    outside.remove();
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
    fireEvent.click(screen.getByRole('button', { name: NOT_NOW_NAME }));
    expect(container.querySelector('#nursery-prompt')).toBeNull();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    // The cleanup cleared the pending timer on unmount.
    expect(clearSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    clearSpy.mockRestore();
  });

  it('under reduced motion the pop-up still comes back after ~3 s (no fade or movement)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: NOT_NOW_NAME }));
    expect(container.querySelector('#nursery-prompt')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // It comes back by a state change; the CSS disables animation under
    // reduced motion.
    expect(container.querySelector('#nursery-prompt')).not.toBeNull();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });
});

describe('The Nursery — the ghost size and anchor', () => {
  afterEach(() => cleanup());

  it('renders the ghost SVG at about 120 x 140 px inside the possessed question', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#nursery-prompt')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost inside the room panel, beside the possessed question', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the possessed question (in the panel),
    // not out in the frame's border (Room 9's lesson).
    const signs = container.querySelector('#nursery-prompt > .ghost-signs');
    expect(signs).not.toBeNull();
    // And the whole screen sits in the room panel.
    expect(container.querySelector('.game-screen #nursery-prompt')).not.toBeNull();
  });

  it('reserves a strip under the question under 600px so the ghost never overlaps text', () => {
    // At 1920 the 120 x 140 ghost sits beside the question; under 600px a
    // smaller ghost (about 72 x 84) rises from a reserved strip under the
    // question, so there is no horizontal overflow at 412px.
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
    expect(css).toMatch(/\.nag-question\s*\{[^}]*padding-bottom:\s*96px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*width:\s*72px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*height:\s*84px/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.game-screen\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.wanderwick\s*\{[^}]*(min-height|height)\s*:/);
  });

  it('wraps the counter row under 600px instead of overlapping', () => {
    expect(css).toMatch(/\.nag-counter\s*\{[^}]*(display:\s*block|white-space:\s*normal)/);
  });
});

describe('The Nursery — the ghost knocks again (the act)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders the knocking knuckle in the haunted view, aria-hidden', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const knock = container.querySelector('.act-knock');
    expect(knock).not.toBeNull();
    // Decorative: aria-hidden, inside the ghost (itself aria-hidden), adding
    // nothing to any accessible name or announcement.
    expect(knock!.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(knock!.closest('.ghost-wrap')).not.toBeNull();
    // The knock is only on/beside the possessed pop-up, never elsewhere.
    expect(knock!.closest('#nursery-prompt')).not.toBeNull();
  });

  it('is absent in preview (the split\'s before side)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
        preview
      />,
    );
    expect(container.querySelector('.act-knock')).toBeNull();
    // Preview also omits the possessed id and the whole ghost signs.
    expect(container.querySelector('#nursery-prompt')).toBeNull();
    expect(container.querySelector('.ghost-signs')).toBeNull();
  });

  it('is absent in the honest twin', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('.act-knock')).toBeNull();
    expect(container.querySelector('.ghost-signs')).toBeNull();
  });

  it('the pop-up bumps only once it has nagged back (askCount > 1)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // First ask: no bump class yet.
    expect(container.querySelector('.nag-popup')!.className).not.toContain('nag-popup-bump');
    // After "Not now" it returns ~3 s later with the bump.
    fireEvent.click(screen.getByRole('button', { name: NOT_NOW_NAME }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(container.querySelector('.nag-popup')!.className).toContain('nag-popup-bump');
  });

  it('the act stops when named: the CSS stills the knock and bump on data-moment right', () => {
    expect(css).toMatch(
      /\.room-scene\[data-moment='right'\]\s+\.act-knock[\s\S]*animation:\s*none/,
    );
    expect(css).toMatch(/\.nag-popup-bump/);
    // One cycle lasts 4 s or more (never a flash).
    expect(css).toMatch(/\.act-knock\s*\{[\s\S]*animation:\s*nursery-knock\s+4s/);
  });

  it('under reduced motion the knock holds a still pose and shows the caption', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion
      />,
    );
    // The still pose: the knock element exists, the "Something stirs here"
    // label and the act caption both render beside the ghost.
    expect(container.querySelector('.act-knock')).not.toBeNull();
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(screen.getByText('it will ask again')).toBeDefined();
    // The caption is decorative text, not a live region or announcement.
    const caption = container.querySelector('.act-caption')!;
    expect(caption.getAttribute('aria-live')).toBeNull();
    expect(caption.getAttribute('role')).toBeNull();
    // The CSS holds the still pose with no animation under reduced motion.
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*\.act-knock[\s\S]*animation:\s*none/);
  });
});

describe('The Nursery — pattern rule (passes on honest, fails on haunted)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('on the haunted side only "Yes"/"Not now" are offered and it returns after "Not now"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // Nagging: a pop-up with only "Yes" and "Not now" — no real "No".
    expect(screen.getByRole('button', { name: YES_NAME })).toBeDefined();
    expect(screen.getByRole('button', { name: NOT_NOW_NAME })).toBeDefined();
    expect(screen.queryByRole('button', { name: NO_MORE_NAME })).toBeNull();
    // Dismiss it: it comes back, counting up — it never truly ends.
    fireEvent.click(screen.getByRole('button', { name: NOT_NOW_NAME }));
    expect(container.querySelector('#nursery-prompt')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(container.querySelector('#nursery-prompt')).not.toBeNull();
    expect((container.querySelector('.nag-counter')!.textContent || '').replace(/\s+/g, ' ').trim()).toBe(
      'Asked 2 times',
    );
  });

  it('on the honest side a real "No, don\'t ask again" ends it and it never returns', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // A real way out exists.
    expect(screen.getByRole('button', { name: NO_MORE_NAME })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: NO_MORE_NAME }));
    // Gone for good — wait well past the haunted return delay: still gone.
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(container.querySelector('.nag-popup')).toBeNull();
    expect(container.querySelector('#nursery-prompt')).toBeNull();
  });

  it('the pattern rule is variant-specific: an endless pop-up vs a real "No" cannot both hold', () => {
    // Haunted offers only "Yes"/"Not now" and returns; honest offers a real
    // "No, don't ask again" and ends for good. If the haunted side ever gained
    // a real "No" (or the honest side lost it), one assertion above would fail,
    // so this detects Nagging, not a variant-agnostic rule.
    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestHasRealNo =
      honest.container.querySelector('.nag-nomore') !== null;
    cleanup();

    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedHasRealNo =
      haunted.container.querySelector('.nag-nomore') !== null;

    expect(honestHasRealNo).toBe(true);
    expect(hauntedHasRealNo).toBe(false);
    expect(hauntedHasRealNo).not.toBe(honestHasRealNo);
  });
});

describe('The Nursery — contrast and axe on both variants', () => {
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

describe('The Nursery — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#nursery-prompt')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    // "Hidden subscription" is a wrong card here (correct is Nagging).
    const wrong = await screen.findByRole('button', { name: 'Hidden subscription' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/no trial is turning into a bill/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

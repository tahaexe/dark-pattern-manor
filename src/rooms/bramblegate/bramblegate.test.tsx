import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact';
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

/** The possessed cancel line's visible text — also its accessible name. */
const POSSESSED_NAME = /To cancel, complete our 7-step exit survey/i;
/** The honest one-click cancel button. */
const CANCEL = /^Cancel membership$/;
/** The confirmation shown after cancelling. */
const CONFIRMATION = /Membership cancelled\. A confirmation is on its way to your inbox\./i;

/** The haunted "before" props the component needs. */
const hauntedProps = {
  onSelectPossessed: () => {},
  onSelectOther: () => {},
  signsActive: true,
  reducedMotion: false,
};

describe('The Cellar — honest variant', () => {
  beforeEach(() => __resetForTests());
  afterEach(() => cleanup());

  it('cancels "cancel the membership" in one click and shows the confirmation', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One click of the plain "Cancel membership" button.
    fireEvent.click(screen.getByRole('button', { name: CANCEL }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    // ...and the confirmation appears.
    expect(screen.getByText(CONFIRMATION)).toBeDefined();
  });

  it('has a single, plain "Cancel membership" button beside the others', () => {
    render(<Honest onCompleteTask={() => {}} />);
    expect(screen.getByRole('button', { name: CANCEL })).toBeDefined();
    expect(screen.getByRole('button', { name: /Upgrade to Gold/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Pause instead/ })).toBeDefined();
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hard to cancel' }));
    await screen.findByRole('heading', { level: 2, name: 'Hard to cancel' });
    // The split renders the haunted preview (aria-hidden) and the honest twin;
    // only the honest "Cancel membership" is reachable by role.
    fireEvent.click(screen.getByRole('button', { name: CANCEL }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });

  it('has no possessed #cellar-cancel on the honest side', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('#cellar-cancel')).toBeNull();
  });
});

describe('The Cellar — the possessed element', () => {
  afterEach(() => cleanup());

  it('is found by its id "cellar-cancel"', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const possessed = container.querySelector('#cellar-cancel');
    expect(possessed).not.toBeNull();
    expect(possessed!.id).toBe(room.possessedId);
  });

  it('is keyboard-reachable with a non-empty accessible name', () => {
    render(<Haunted {...hauntedProps} />);
    const possessed = screen.getByRole('button', { name: POSSESSED_NAME });
    expect(possessed.tagName).toBe('BUTTON');
    // Label in Name (WCAG 2.5.3): no aria-label overrides the visible text.
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('names the 7 steps and the 3-4 a.m. window in the possessed line', () => {
    render(<Haunted {...hauntedProps} />);
    const possessed = screen.getByRole('button', { name: POSSESSED_NAME });
    const text = (possessed.textContent || '').replace(/\s+/g, ' ').trim();
    expect(text).toMatch(/7-step exit survey/i);
    expect(text).toMatch(/between 3 and 4 a\.m\./i);
    expect(text).toMatch(/0800 000 000/);
  });

  it('keeps the Upgrade and Pause buttons as real buttons OUTSIDE the possessed line', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const possessed = container.querySelector('#cellar-cancel') as HTMLButtonElement;
    // No control of any kind lives inside the possessed button.
    expect(possessed.querySelector('button')).toBeNull();
    expect(possessed.querySelector('input')).toBeNull();
    // The Upgrade and Pause buttons are real buttons, neither inside the line.
    const upgrade = screen.getByRole('button', { name: /Upgrade to Gold/ });
    const pause = screen.getByRole('button', { name: /Pause instead/ });
    expect(upgrade.tagName).toBe('BUTTON');
    expect(pause.tagName).toBe('BUTTON');
    expect(upgrade.closest('#cellar-cancel')).toBeNull();
    expect(pause.closest('#cellar-cancel')).toBeNull();
  });

  it('is NOT a live region: nothing announces the cancel line', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    // The price uses tabular, lining figures so the column never changes width.
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums lining-nums/);
  });
});

describe('The Cellar — the haunted page has no cancel button', () => {
  afterEach(() => cleanup());

  it('offers no one-click cancel: there is no "Cancel membership" button', () => {
    render(<Haunted {...hauntedProps} />);
    expect(screen.queryByRole('button', { name: CANCEL })).toBeNull();
    // The only cancel affordance is the possessed maze line.
    expect(screen.getByRole('button', { name: POSSESSED_NAME })).toBeDefined();
  });
});

describe('The Cellar — the ghost size and anchor', () => {
  afterEach(() => cleanup());

  it('renders the ghost SVG at about 120 x 140 px inside the possessed line', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const possessed = container.querySelector('#cellar-cancel')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost inside the room panel, beside the possessed line', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    // The ghost-signs anchor sits INSIDE the possessed cancel line (in the
    // panel), not out in the frame's border (Room 9's lesson).
    const signs = container.querySelector('#cellar-cancel > .ghost-signs');
    expect(signs).not.toBeNull();
    expect(container.querySelector('.account-card #cellar-cancel')).not.toBeNull();
  });

  it('reserves a strip under the line under 600px so the ghost never overlaps', () => {
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
    expect(css).toMatch(/\.cancel-line\s*\{[^}]*padding-bottom:\s*96px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*width:\s*72px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*height:\s*84px/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.account-card\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.bramblegate\s*\{[^}]*(min-height|height)\s*:/);
  });

  it('wraps the label-and-value rows under 600px instead of overlapping', () => {
    expect(css).toMatch(/\.account-actions\s*\{[^}]*flex-direction:\s*column/);
    expect(css).toMatch(/\.membership-line\s*\{[^}]*flex-direction:\s*column/);
  });
});

describe('The Cellar — pattern rule (passes on honest, fails on haunted)', () => {
  afterEach(() => cleanup());

  it('on the haunted side there is no cancel button and the maze line names the steps', () => {
    render(<Haunted {...hauntedProps} />);
    expect(screen.queryByRole('button', { name: CANCEL })).toBeNull();
    const possessed = screen.getByRole('button', { name: POSSESSED_NAME });
    const text = (possessed.textContent || '').replace(/\s+/g, ' ').trim();
    expect(text).toMatch(/7-step exit survey/i);
    expect(text).toMatch(/between 3 and 4 a\.m\./i);
  });

  it('on the honest side one click of "Cancel membership" cancels and confirms', () => {
    render(<Honest onCompleteTask={() => {}} />);
    // Before the click there is a cancel button and no maze line.
    expect(screen.getByRole('button', { name: CANCEL })).toBeDefined();
    expect(screen.queryByRole('button', { name: POSSESSED_NAME })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: CANCEL }));
    expect(screen.getByText(CONFIRMATION)).toBeDefined();
  });

  it('the pattern rule is variant-specific: no-cancel maze vs one-click cancel cannot both hold', () => {
    const haunted = render(<Haunted {...hauntedProps} />);
    const hauntedHasOneClickCancel =
      haunted.queryByRole('button', { name: CANCEL }) !== null;
    cleanup();

    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestHasOneClickCancel =
      honest.queryByRole('button', { name: CANCEL }) !== null;
    void honest;

    // Haunted has NO one-click cancel (only the maze line); honest has one.
    // If the haunted side ever gained a cancel button (or honest lost it), one
    // assertion above would fail, so this detects Hard to cancel, not a
    // variant-agnostic rule.
    expect(hauntedHasOneClickCancel).toBe(false);
    expect(honestHasOneClickCancel).toBe(true);
    expect(hauntedHasOneClickCancel).not.toBe(honestHasOneClickCancel);
  });
});

describe('The Cellar — the ghost act (Hard to cancel)', () => {
  afterEach(() => cleanup());

  it('renders the maze act inside the possessed line and marks it aria-hidden', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const possessed = container.querySelector('#cellar-cancel')!;
    const maze = possessed.querySelector('.maze');
    expect(maze).not.toBeNull();
    // Three slamming doors and the dragged cancel line make up the act.
    expect(possessed.querySelectorAll('.maze-door').length).toBe(3);
    expect(possessed.querySelector('.maze-line')).not.toBeNull();
    // The act is decorative: it lives inside the aria-hidden .ghost-signs and
    // adds nothing to the accessible name or to any live announcement.
    const signs = possessed.querySelector('.ghost-signs')!;
    expect(signs.getAttribute('aria-hidden')).toBe('true');
    expect(signs.contains(maze)).toBe(true);
    // The maze text never leaks into the possessed element's accessible name.
    expect(possessed.getAttribute('aria-label')).toBeNull();
  });

  it('the CSS gives the act one cycle of 4s or more and stops it when named', () => {
    // One full cycle is 8s (>= the 4s floor) for both the doors and the line.
    expect(css).toMatch(/\.maze-door\s*\{[^}]*animation:\s*maze-slam\s+8s/);
    expect(css).toMatch(/\.maze-line\s*\{[^}]*animation:\s*maze-drag\s+8s/);
    // When the ghost is named the engine sets data-moment='right'; every act
    // element must go still (no mask kept moving through the flee).
    expect(css).toMatch(
      /\.room-scene\[data-moment='right'\][^{]*\.maze[^{]*\{[^}]*animation:\s*none/,
    );
  });

  it('shows no act in preview (the comparison\'s haunted side)', () => {
    const { container } = render(<Haunted {...hauntedProps} preview />);
    expect(container.querySelector('.maze')).toBeNull();
    expect(container.querySelector('.ghost-signs')).toBeNull();
    expect(container.querySelector('#cellar-cancel')).toBeNull();
  });

  it('shows no act in the honest twin', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('.maze')).toBeNull();
    expect(container.querySelector('.ghost-signs')).toBeNull();
  });

  it('keeps the cancel line text readable and reachable while the act plays', () => {
    render(<Haunted {...hauntedProps} />);
    const possessed = screen.getByRole('button', { name: POSSESSED_NAME });
    // The possessed line is still a focusable button with its full text as its
    // accessible name — the act never covers or renames it.
    expect(possessed.tagName).toBe('BUTTON');
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
    const text = (possessed.textContent || '').replace(/\s+/g, ' ').trim();
    expect(text).toMatch(/To cancel, complete our 7-step exit survey/i);
  });
});

describe('The Cellar — contrast and axe on both variants', () => {
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
        <Haunted {...hauntedProps} />
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

describe('The Cellar — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#cellar-cancel')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('shows the act still pose and its caption with reduced motion', () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    const possessed = container.querySelector('#cellar-cancel')!;
    // The maze renders in its still-pose variant (frozen behind one shut door).
    const maze = possessed.querySelector('.maze.maze-still');
    expect(maze).not.toBeNull();
    expect(maze!.querySelectorAll('.maze-door').length).toBe(3);
    // The still pose names itself beside the ghost: the way out is hidden.
    const caption = possessed.querySelector('.act-caption');
    expect(caption).not.toBeNull();
    expect((caption!.textContent || '').trim()).toBe('the way out is hidden');
    expect(caption!.getAttribute('aria-hidden')).toBe('true');
    // Both the "Something stirs here" label and the caption are present.
    expect(screen.getByText('Something stirs here')).toBeDefined();
    // The CSS freezes the act under reduced motion (no running animation).
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.maze[\s\S]*animation:\s*none/,
    );
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    // "Fake urgency" is a wrong card here (correct is Hard to cancel).
    const wrong = await screen.findByRole('button', { name: 'Fake urgency' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/count the doors between you/i)).toBeDefined();
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

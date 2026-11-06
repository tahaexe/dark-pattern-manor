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

/** The possessed summary line's visible text — also its accessible name. */
const POSSESSED_NAME = /3 extras added for your trip/i;
/** The three extras, by their labels. */
const INSURANCE = /Travel insurance/i;
const PRIORITY = /Priority boarding/i;
const CHARM = /Lucky charm/i;

/** The haunted "before" props the component needs. */
const hauntedProps = {
  onSelectPossessed: () => {},
  onSelectOther: () => {},
  signsActive: true,
  reducedMotion: false,
};

describe('The Attic — honest variant', () => {
  beforeEach(() => __resetForTests());
  afterEach(() => cleanup());

  it('completes "buy only the ticket" in one click with "Pay £95"', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // The extras start unticked, so buying only the ticket is one click.
    fireEvent.click(screen.getByRole('button', { name: /Pay \u00a395/ }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('starts with every extra UNTICKED and the total at £95', () => {
    render(<Honest onCompleteTask={() => {}} />);
    for (const box of screen.getAllByRole('checkbox')) {
      expect((box as HTMLInputElement).checked).toBe(false);
    }
    expect(screen.getByRole('button', { name: /Pay \u00a395/ })).toBeDefined();
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preselection' }));
    await screen.findByRole('heading', { level: 2, name: 'Preselection' });
    // The split renders the haunted preview (aria-hidden) and the honest twin;
    // only the honest "Pay £95" is reachable by role.
    fireEvent.click(screen.getByRole('button', { name: /Pay \u00a395/ }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });

  it('has no possessed #attic-preselect on the honest side', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('#attic-preselect')).toBeNull();
  });
});

describe('The Attic — the possessed element', () => {
  afterEach(() => cleanup());

  it('is found by its id "attic-preselect"', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const possessed = container.querySelector('#attic-preselect');
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

  it('keeps the checkboxes as real inputs OUTSIDE the possessed button', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const possessed = container.querySelector('#attic-preselect') as HTMLButtonElement;
    // No control of any kind lives inside the possessed button.
    expect(possessed.querySelector('input')).toBeNull();
    expect(possessed.querySelector('button')).toBeNull();
    // The three checkboxes are real inputs, and none is inside the button.
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      expect(box.tagName).toBe('INPUT');
      expect(box.closest('#attic-preselect')).toBeNull();
    }
  });

  it('is NOT a live region: nothing announces the summary or the total', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    // Prices use tabular, lining figures so the column never changes width.
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums lining-nums/);
  });
});

describe('The Attic — every checkbox has its label and is big enough', () => {
  afterEach(() => cleanup());

  it('gives each checkbox a non-empty accessible name (its label text)', () => {
    render(<Haunted {...hauntedProps} />);
    // Each checkbox is reachable by its label text — the whole label is the
    // control's accessible name.
    expect(screen.getByRole('checkbox', { name: INSURANCE })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: PRIORITY })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: CHARM })).toBeDefined();
  });

  it('wraps each checkbox in a label so the whole row is clickable', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const boxes = container.querySelectorAll('.extra-checkbox');
    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      // The box lives inside its own <label> (box plus text), so clicking the
      // text toggles the box.
      expect(box.closest('label')).not.toBeNull();
    }
  });

  it('sizes each checkbox at least 24×24 px in CSS', () => {
    expect(css).toMatch(/\.extra-checkbox\s*\{[^}]*width:\s*24px/);
    expect(css).toMatch(/\.extra-checkbox\s*\{[^}]*height:\s*24px/);
  });
});

describe('The Attic — the haunted extras start ticked and the total follows', () => {
  afterEach(() => cleanup());

  it('starts with all three extras TICKED and the total at £118', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(3);
    for (const box of boxes) expect(box.checked).toBe(true);
    // Total and Pay both read £118 (95 + 12 + 8 + 3).
    expect((container.querySelector('.booking-total-amount')!.textContent || '').trim()).toBe('\u00a3118');
    expect(screen.getByRole('button', { name: /Pay \u00a3118/ })).toBeDefined();
  });

  it('follows the total down to £95 when all three are unticked', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    // Untick each extra; the total follows every tick.
    fireEvent.click(screen.getByRole('checkbox', { name: INSURANCE }));
    expect((container.querySelector('.booking-total-amount')!.textContent || '').trim()).toBe('\u00a3106');
    fireEvent.click(screen.getByRole('checkbox', { name: PRIORITY }));
    expect((container.querySelector('.booking-total-amount')!.textContent || '').trim()).toBe('\u00a398');
    fireEvent.click(screen.getByRole('checkbox', { name: CHARM }));
    // All three off: only the £95 fare remains.
    expect((container.querySelector('.booking-total-amount')!.textContent || '').trim()).toBe('\u00a395');
    expect(screen.getByRole('button', { name: /Pay \u00a395/ })).toBeDefined();
  });
});

describe('The Attic — the ghost size and anchor', () => {
  afterEach(() => cleanup());

  it('renders the ghost SVG at about 120 x 140 px inside the possessed line', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const possessed = container.querySelector('#attic-preselect')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost inside the room panel, beside the possessed line', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    // The ghost-signs anchor sits INSIDE the possessed summary line (in the
    // panel), not out in the frame's border (Room 9's lesson).
    const signs = container.querySelector('#attic-preselect > .ghost-signs');
    expect(signs).not.toBeNull();
    expect(container.querySelector('.booking-card #attic-preselect')).not.toBeNull();
  });

  it('reserves a strip under the summary under 600px so the ghost never overlaps', () => {
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
    expect(css).toMatch(/\.preselect-summary\s*\{[^}]*padding-bottom:\s*96px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*width:\s*72px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*height:\s*84px/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.booking-card\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.rookery\s*\{[^}]*(min-height|height)\s*:/);
  });

  it('wraps the label-and-price rows under 600px instead of overlapping', () => {
    expect(css).toMatch(/\.extra-label\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.ticket-line,\s*\.booking-total\s*\{[^}]*flex-direction:\s*column/);
  });
});

describe('The Attic — pattern rule (passes on honest, fails on haunted)', () => {
  afterEach(() => cleanup());

  it('on the haunted side all three extras are ticked and the total is £118', () => {
    const { container } = render(<Haunted {...hauntedProps} />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes.every((b) => b.checked)).toBe(true);
    expect((container.querySelector('.booking-total-amount')!.textContent || '').trim()).toBe('\u00a3118');
    expect(screen.getByRole('button', { name: /Pay \u00a3118/ })).toBeDefined();
  });

  it('on the honest side all three extras are unticked and the total is £95', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes.every((b) => !b.checked)).toBe(true);
    expect((container.querySelector('.booking-total-amount')!.textContent || '').trim()).toBe('\u00a395');
    expect(screen.getByRole('button', { name: /Pay \u00a395/ })).toBeDefined();
  });

  it('the pattern rule is variant-specific: ticked £118 vs unticked £95 cannot both hold', () => {
    const haunted = render(<Haunted {...hauntedProps} />);
    const hauntedAllTicked = (screen.getAllByRole('checkbox') as HTMLInputElement[]).every((b) => b.checked);
    cleanup();

    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestAllTicked = (screen.getAllByRole('checkbox') as HTMLInputElement[]).every((b) => b.checked);
    void honest;

    // Haunted preselects every extra; honest preselects none. If the haunted
    // side ever arrived unticked (or honest ticked), one assertion above would
    // fail, so this detects Preselection, not a variant-agnostic rule.
    expect(hauntedAllTicked).toBe(true);
    expect(honestAllTicked).toBe(false);
    expect(hauntedAllTicked).not.toBe(honestAllTicked);
  });
});

describe('The Attic — contrast and axe on both variants', () => {
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

describe('The Attic — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#attic-preselect')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    // "Fake social proof" is a wrong card here (correct is Preselection).
    const wrong = await screen.findByRole('button', { name: 'Fake social proof' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/no crowd is watching you here/i)).toBeDefined();
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

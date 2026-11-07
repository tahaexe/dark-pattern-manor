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

/** The possessed sentence's visible text, which is also its accessible name. */
const POSSESSED_NAME = /Tick this box if you would/i;

/**
 * Count the negation markers in a sentence. A plain opt-in has zero; the
 * haunted double-negative has two or more. This is the structural signal of
 * Trick wording for this room.
 */
function negationCount(text: string): number {
  const markers = text.toLowerCase().match(/\b(not|don['\u2019]?t|never|prefer not)\b/g) || [];
  return markers.length;
}

describe('The Library — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "sign up without the newsletter" in one click (box left alone)', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // The newsletter checkbox starts unticked; leave it alone.
    const box = screen.getByRole('checkbox');
    expect((box as HTMLInputElement).checked).toBe(false);
    // One click on "Create account" signs up without the newsletter.
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Trick wording' }));
    await screen.findByRole('heading', { level: 2, name: 'Trick wording' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });
});

describe('The Library — the possessed element', () => {
  it('is found by its id "library-newsletter"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#library-newsletter');
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
    // the accessible name IS the visible sentence (as Room 1's possessed link).
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
    const possessed = container.querySelector('#library-newsletter') as HTMLButtonElement;
    expect(possessed.getAttribute('aria-label')).toBeNull();
    // The visible sentence is the full accessible name (no mismatch).
    const visible = possessed.querySelector('.newsletter-text')!.textContent || '';
    expect(visible).toMatch(/^Tick this box if you would/);
  });
});

describe('The Library — the ghost\u2019s act (traces the double negative)', () => {
  it('renders both "not"s as glow/trace targets in the haunted view', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The two "not"s carry the act's glow/trace class; the second is
    // distinguished so it can light after the first.
    const nots = container.querySelectorAll('.newsletter-text .trick-not');
    expect(nots.length).toBe(2);
    expect(container.querySelector('.trick-not-2')).not.toBeNull();
  });

  it('the act is decorative: it is pure CSS and adds nothing to the accessible name', () => {
    render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The accessible name is still the sentence itself — no act text leaks in,
    // and there is no aria-label overriding it.
    const possessed = screen.getByRole('button', { name: POSSESSED_NAME });
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect(possessed.textContent).not.toMatch(/two nots hide here/i);
    // The tracing stroke is a ::after pseudo-element (no extra DOM node).
    expect(css).toMatch(/\.trick-not::after\s*\{[^}]*content:\s*''/);
  });

  it('the act names the trick through motion: the two "not"s glow and trace in sequence over a >= 4 s cycle', () => {
    // The second "not" lights after the first (an animation-delay on
    // .trick-not-2 and its ::after), and both the glow and the trace run on a
    // 6 s cycle (>= 4 s). The trace is an ink stroke under each "not".
    expect(css).toMatch(/\.trick-not-2[^{]*\{[^}]*animation-delay/);
    expect(css).toMatch(/@keyframes library-not-glow/);
    expect(css).toMatch(/@keyframes library-trace/);
    expect(css).toMatch(/\.trick-not\s*\{[^}]*animation:\s*library-not-glow\s+6s/);
    expect(css).toMatch(/\.trick-not::after\s*\{[^}]*animation:\s*library-trace\s+6s/);
    // The stroke sits under the glyphs so it never covers the word's text.
    expect(css).toMatch(/\.trick-not::after\s*\{[^}]*z-index:\s*-1/);
  });

  it('the act is absent from the comparison\u2019s haunted preview (static, non-interactive)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
        preview
      />,
    );
    // In preview the signs (and so the glowing/tracing act) do not run: there
    // is no signs-active class and no ghost.
    expect(container.querySelector('.ghost-signs')).toBeNull();
    expect(container.querySelector('.newsletter-line.signs-active')).toBeNull();
  });

  it('the act is absent from the honest twin', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('.trick-not')).toBeNull();
    expect(container.querySelector('.ghost-signs')).toBeNull();
  });
});

describe('The Library — the ghost size and anchor', () => {
  it('renders the ghost SVG at about 120 x 140 px inside the possessed line', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#library-newsletter')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost to the possessed sentence itself (.newsletter-text)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the sentence element, so the ghost
    // peeks beside the sentence (at the sentence's height), not over the whole
    // line, an input, a label or the button.
    const signs = container.querySelector('.newsletter-text > .ghost-signs');
    expect(signs).not.toBeNull();
  });

  it('caps the sentence at a max width so the ghost has its own space to the right', () => {
    // At 1920 the sentence is capped (~60ch) so the 120 x 140 ghost sits just
    // right of the sentence's end, and the sentence shrinks to leave room for
    // a smaller ghost under 600px (right padding reserved).
    expect(css).toMatch(/\.newsletter-text\s*\{[^}]*max-width:\s*60ch/);
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
  });
});

describe('The Library — pattern rule (passes on honest, fails on haunted)', () => {
  it('on the honest side the newsletter line is one plain opt-in with no double negative', () => {
    render(<Honest onCompleteTask={() => {}} />);
    const text = screen.getByText(/Send me the Inkbone newsletter/i);
    // A single plain opt-in: zero negation markers.
    expect(negationCount(text.textContent || '')).toBe(0);
    // Nothing is pre-ticked.
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.checked).toBe(false);
  });

  it('on the haunted side the newsletter sentence is a double negative (two or more flips)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#library-newsletter')!;
    const textEl = possessed.querySelector('.newsletter-text')!;
    // Trick wording: two or more negation markers that flip the meaning, so
    // leaving the box alone subscribes you.
    expect(negationCount(textEl.textContent || '')).toBeGreaterThanOrEqual(2);
    // Nothing is pre-ticked on the haunted side either — the trick is the
    // wording, not a ticked state (this is what makes it Trick wording and not
    // Preselection).
    const box = possessed.querySelector('.newsletter-box');
    expect(box).not.toBeNull();
    expect(box!.getAttribute('aria-hidden')).toBe('true');
  });

  it('the pattern rule is variant-specific: honest plainness and haunted double negative cannot both hold', () => {
    // Honest sentence has zero negations; haunted has two or more. If the
    // haunted side were ever rewritten as a plain opt-in, the test above would
    // fail — so this detects Trick wording rather than passing on both variants.
    render(<Honest onCompleteTask={() => {}} />);
    const honestText = screen.getByText(/Send me the Inkbone newsletter/i).textContent || '';

    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedText =
      container.querySelector('#library-newsletter .newsletter-text')!.textContent || '';

    expect(negationCount(honestText)).toBe(0);
    expect(negationCount(hauntedText)).toBeGreaterThanOrEqual(2);
    expect(negationCount(honestText)).not.toBe(negationCount(hauntedText));
  });
});

describe('The Library — contrast and axe on both variants', () => {
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

describe('The Library — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#library-newsletter')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('the act shows its still pose: the two "not"s rest underlined in ink, the caption names them, and no trace or glow animates', () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    // The still caption sits beside the ghost, alongside the kept "Something
    // stirs here" label.
    expect(screen.getByText('two nots hide here')).toBeDefined();
    expect(screen.getByText('Something stirs here')).toBeDefined();
    // The tracing stroke (a ::after on each "not") is hidden under reduced
    // motion; the two "not"s are still present as the still pose, underlined in
    // ink by the reduced-motion rule, and their glow animation is turned off.
    expect(container.querySelectorAll('.trick-not').length).toBe(2);
    expect(css).toMatch(/\.newsletter-line\.reduced-motion\s+\.trick-not::after\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.newsletter-line\.reduced-motion\s+\.trick-not[^:{]*\{[^}]*text-decoration:\s*underline/);
    expect(css).toMatch(/\.newsletter-line\.reduced-motion\s+\.trick-not[^:{]*\{[^}]*animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    const wrong = await screen.findByRole('button', { name: 'Preselection' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/the sentence that flips/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

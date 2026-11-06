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

/**
 * Read the declared value of a property inside a CSS rule block for a given
 * selector from the room's stylesheet source. jsdom does not apply imported
 * CSS to getComputedStyle, so the pattern rule is proven against the authored
 * stylesheet, which is where the Visual-interference trick lives.
 */
function declared(selector: string, prop: string): string | null {
  // Find the selector's first rule block.
  const re = new RegExp(
    `(?:^|[},])\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
    'm',
  );
  const m = css.match(re);
  if (!m) return null;
  const body = m[1];
  const pre = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i');
  const pm = body.match(pre);
  return pm ? pm[1].trim() : null;
}

describe('The Foyer — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "reject the cookies" in one click', async () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    const reject = screen.getByRole('button', { name: 'Reject all' });
    fireEvent.click(reject);
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });
});

describe('The Foyer — the possessed element', () => {
  it('is found by its id "foyer-reject"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#foyer-reject');
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
    const possessed = screen.getByRole('button', { name: 'Reject all' });
    expect(possessed.tagName).toBe('BUTTON');
    // A real button is focusable by keyboard and has a non-empty name.
    expect(possessed.getAttribute('aria-label')).toBe('Reject all');
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });
});

describe('The Foyer — pattern rule (passes on honest, fails on haunted)', () => {
  it('on the honest side both controls are equal buttons (size, padding, fill)', () => {
    render(<Honest onCompleteTask={() => {}} />);
    const buttons = screen.getAllByRole('button', { name: /Reject all|Accept all/ });
    expect(buttons).toHaveLength(2);
    // Both honest controls carry the same class, so their declared size,
    // padding and fill are identical by construction.
    for (const b of buttons) {
      expect(b.tagName).toBe('BUTTON');
      expect(b.className).toContain('cookie-button-equal');
    }
    const fontSize = declared('.cookie-button-equal', 'font-size');
    const padding = declared('.cookie-button-equal', 'padding');
    const bg = declared('.cookie-button-equal', 'background');
    expect(fontSize).not.toBeNull();
    expect(padding).not.toBeNull();
    expect(bg).not.toBeNull();
  });

  it('on the haunted side "Reject all" is a small plain link, unequal to the "Accept all" button', () => {
    render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const accept = screen.getByRole('button', { name: 'Accept all' });
    const reject = screen.getByRole('button', { name: 'Reject all' });

    // Different classes => different styling.
    expect(accept.className).toContain('cookie-accept');
    expect(reject.className).toContain('cookie-reject');
    expect(accept.className).not.toBe(reject.className);

    // The declared styles differ: font size, weight, padding and the
    // link-vs-button look (underline, transparent fill on reject).
    const acceptSize = declared('.cookie-accept', 'font-size');
    const rejectSize = declared('.cookie-reject', 'font-size');
    const acceptWeight = declared('.cookie-accept', 'font-weight');
    const rejectWeight = declared('.cookie-reject', 'font-weight');
    const acceptPad = declared('.cookie-accept', 'padding');
    const rejectPad = declared('.cookie-reject', 'padding');

    expect(rejectSize).not.toBe(acceptSize);
    expect(rejectWeight).not.toBe(acceptWeight);
    expect(rejectPad).not.toBe(acceptPad);
    expect(rejectPad).toBe('0');
    expect(declared('.cookie-reject', 'text-decoration')).toBe('underline');
    expect(declared('.cookie-reject', 'background')).toBe('transparent');
  });

  it('the pattern rule is variant-specific: honest symmetry and haunted asymmetry cannot both hold', () => {
    // Honest controls share a class (symmetric); haunted controls do not
    // (asymmetric). If the haunted side were ever made symmetric, the test
    // above would fail — so this test detects the pattern rather than passing
    // on both variants.
    expect(declared('.cookie-button-equal', 'padding')).not.toBe(
      declared('.cookie-reject', 'padding'),
    );
  });
});

describe('The Foyer — contrast and axe on both variants', () => {
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

describe('The Foyer — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#foyer-reject')!;
    // The reduced-motion class is applied, which disables animation in CSS.
    expect(possessed.className).toContain('reduced-motion');
    // The static "Something stirs here" label is present.
    expect(screen.getByText('Something stirs here')).toBeDefined();
    // CSS confirms animations are turned off under reduced motion.
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    const wrong = await screen.findByRole('button', { name: 'Trick wording' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/it is the look that lies/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    // Base stylesheet disables all animation under reduced motion.
    expect(css).toMatch(/animation:\s*none/);
  });
});

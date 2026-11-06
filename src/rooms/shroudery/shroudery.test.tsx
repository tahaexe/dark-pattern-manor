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

/** The possessed stock line's visible text, which is also its accessible name. */
const POSSESSED_NAME = /Only 1 left/i;
/** The five cloak sizes, in order. */
const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;

afterEach(() => cleanup());

describe('The Ballroom — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "pick the right size" in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One calm click on a size button — no "only 1 left" pressure pushing you.
    fireEvent.click(screen.getByRole('button', { name: 'XL' }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Fake scarcity' }));
    await screen.findByRole('heading', { level: 2, name: 'Fake scarcity' });
    // The split renders the haunted preview (aria-hidden) and the honest twin;
    // only the honest size buttons are reachable by role.
    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });

  it('tells the stock truth in plain text — "In stock" for every size, "3 left" only on XL', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // No "Only 1 left" anywhere on the honest side.
    expect(container.textContent).not.toMatch(/Only 1 left/i);
    // The honest truths are shown instead.
    const stock = container.querySelector('.cloak-stock-honest')!;
    const text = stock.textContent || '';
    // "In stock" for XS, S, M, L; "3 left" only on XL.
    expect((text.match(/In stock/g) || []).length).toBe(4);
    expect((text.match(/3 left/g) || []).length).toBe(1);
    expect(text).toMatch(/XL\s*—\s*3 left/);
    // There is no possessed stock line on the honest side.
    expect(container.querySelector('#ballroom-stock')).toBeNull();
  });
});

describe('The Ballroom — the possessed element', () => {
  it('is found by its id "ballroom-stock"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#ballroom-stock');
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
    // the accessible name IS the visible stock-line text.
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
    const possessed = container.querySelector('#ballroom-stock') as HTMLButtonElement;
    expect(possessed.getAttribute('aria-label')).toBeNull();
    const visible = possessed.querySelector('.cloak-stock-label')!.textContent || '';
    expect(visible).toMatch(/^Only 1 left/);
  });

  it('is NOT a live region: no aria-live and no announcing role', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#ballroom-stock') as HTMLButtonElement;
    // The stock line does not announce each change: no aria-live, no status role.
    expect(possessed.getAttribute('aria-live')).toBeNull();
    expect(possessed.getAttribute('role')).not.toBe('status');
    expect(possessed.getAttribute('role')).not.toBe('alert');
    // Nor does any descendant turn it into a live region.
    expect(possessed.querySelector('[aria-live]')).toBeNull();
    expect(possessed.querySelector('[role="status"]')).toBeNull();
    expect(possessed.querySelector('[role="alert"]')).toBeNull();
  });
});

describe('The Ballroom — size buttons and aria-pressed', () => {
  it('renders five real size buttons, each at least 44 x 44 px', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    for (const size of SIZES) {
      const btn = screen.getByRole('button', { name: size });
      expect(btn.tagName).toBe('BUTTON');
    }
    // The CSS gives each size button at least a 44 x 44 px target.
    expect(css).toMatch(/\.cloak-size\s*\{[^}]*min-width:\s*44px/);
    expect(css).toMatch(/\.cloak-size\s*\{[^}]*min-height:\s*44px/);
    // There are exactly five size buttons in the size group.
    const group = container.querySelector('.cloak-sizes')!;
    expect(group.querySelectorAll('button.cloak-size').length).toBe(5);
  });

  it('aria-pressed follows the picked size (exactly one pressed at a time)', () => {
    render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    // Before any pick, no size button is pressed.
    for (const size of SIZES) {
      expect(
        screen.getByRole('button', { name: size }).getAttribute('aria-pressed'),
      ).toBe('false');
    }
    // Pick "M": only M is now pressed.
    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    for (const size of SIZES) {
      expect(
        screen.getByRole('button', { name: size }).getAttribute('aria-pressed'),
      ).toBe(size === 'M' ? 'true' : 'false');
    }
    // Pick "L": the pressed state moves to L, M is no longer pressed.
    fireEvent.click(screen.getByRole('button', { name: 'L' }));
    for (const size of SIZES) {
      expect(
        screen.getByRole('button', { name: size }).getAttribute('aria-pressed'),
      ).toBe(size === 'L' ? 'true' : 'false');
    }
  });
});

describe('The Ballroom — pattern rule (passes on honest, fails on haunted)', () => {
  function stockLineText(container: HTMLElement): string {
    return container.querySelector('#ballroom-stock .cloak-stock-label')!.textContent || '';
  }

  it('on the haunted side the stock line reads "Only 1 left" for every size', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    // Before any pick, the lie already shows.
    expect(stockLineText(container)).toMatch(/^Only 1 left! Order soon\./);
    // Picking each size in turn leaves the stock line still claiming "Only 1
    // left" — the same false scarcity on every size, whatever the real stock.
    for (const size of SIZES) {
      fireEvent.click(screen.getByRole('button', { name: size }));
      const text = stockLineText(container);
      expect(text).toMatch(/Only 1 left/);
      expect(text).toContain(`Only 1 left in ${size}! Order soon.`);
    }
  });

  it('on the honest side there is no "Only 1 left" line at all', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('#ballroom-stock')).toBeNull();
    expect(container.textContent).not.toMatch(/Only 1 left/i);
    // The honest truths are shown instead: "In stock" and "3 left".
    expect(container.textContent).toMatch(/In stock/);
    expect(container.textContent).toMatch(/3 left/);
  });

  it('the pattern rule is variant-specific: "Only 1 left" everywhere vs nowhere cannot both hold', () => {
    // Haunted: the stock line says "Only 1 left" for every size. Honest: it
    // says so for none. If the haunted side ever told the truth (or the honest
    // side gained a false low-stock line), one assertion above would fail — so
    // this detects Fake scarcity, not a variant-agnostic rule.
    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestHasFalseScarcity = /Only 1 left/i.test(honest.container.textContent || '');

    cleanup();

    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    // Walk every size; on the haunted side each one shows "Only 1 left".
    let hauntedAlwaysFalseScarcity = /Only 1 left/i.test(
      haunted.container.querySelector('#ballroom-stock')!.textContent || '',
    );
    for (const size of SIZES) {
      fireEvent.click(screen.getByRole('button', { name: size }));
      hauntedAlwaysFalseScarcity =
        hauntedAlwaysFalseScarcity &&
        /Only 1 left/i.test(
          haunted.container.querySelector('#ballroom-stock')!.textContent || '',
        );
    }

    expect(hauntedAlwaysFalseScarcity).toBe(true);
    expect(honestHasFalseScarcity).toBe(false);
    expect(hauntedAlwaysFalseScarcity).not.toBe(honestHasFalseScarcity);
  });
});

describe('The Ballroom — the ghost size and anchor', () => {
  it('renders the ghost SVG at about 120 x 140 px inside the possessed stock line', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#ballroom-stock')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost to the possessed stock line itself (.cloak-stock-label)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the stock line's label, so the ghost
    // peeks beside the line (at its height), not over a size button or price.
    const signs = container.querySelector('.cloak-stock-label > .ghost-signs');
    expect(signs).not.toBeNull();
  });

  it('reserves a strip under the stock line under 600px so the ghost never overlaps text', () => {
    // At 1920 the 120 x 140 ghost sits just right of the stock line; under
    // 600px a smaller ghost rises from a reserved strip under the line, so
    // there is no horizontal overflow at 412px.
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
    expect(css).toMatch(/\.cloak-stock-label\s*\{[^}]*padding-bottom:\s*88px/);
    // The smaller ghost under 600px is about 72 x 84.
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*width:\s*72px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*height:\s*84px/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.cloak-card\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.shroudery\s*\{[^}]*(min-height|height)\s*:/);
  });
});

describe('The Ballroom — contrast and axe on both variants', () => {
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

describe('The Ballroom — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#ballroom-stock')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    // "Visual interference" is a wrong card here (correct is Fake scarcity).
    const wrong = await screen.findByRole('button', { name: 'Visual interference' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/the buttons look fair/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

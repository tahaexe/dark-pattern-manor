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

/**
 * The possessed fee block's accessible name is the concatenation of its fee
 * lines; "Service fee" is unique to it and never matches the Pay button or any
 * honest control.
 */
const POSSESSED_NAME = /Service fee/i;
/** The honest single task action — finding the real price in one click. */
const HONEST_PAY_NAME = /See the full price/i;
/** The haunted Pay button. */
const HAUNTED_PAY_NAME = /Pay \u00a39\.49 today/i;

/** Pull all amounts like £N.NN out of a string. */
function pounds(text: string): number[] {
  return [...text.matchAll(/\u00a3(\d+(?:\.\d{2})?)/g)].map((m) => Number(m[1]));
}

describe('The Study — honest variant', () => {
  beforeEach(() => __resetForTests());
  afterEach(() => cleanup());

  it('completes "find the real price" in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // The real price is already in front of you at step 1 — one calm click.
    fireEvent.click(screen.getByRole('button', { name: HONEST_PAY_NAME }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hidden costs' }));
    await screen.findByRole('heading', { level: 2, name: 'Hidden costs' });
    // The split renders the haunted preview (aria-hidden) and the honest twin;
    // only the honest "See the full price" action is reachable by role.
    fireEvent.click(screen.getByRole('button', { name: HONEST_PAY_NAME }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });

  it('shows the same whole price up front at step 1 with the same fee lines', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // No late-reveal possessed block on the honest side.
    expect(container.querySelector('#study-fee-lines')).toBeNull();
    // The up-front headline carries the real total: £4.50/month + £4.99 setup.
    const headline = container.querySelector('.plan-realprice')!.textContent || '';
    expect(headline).toMatch(/\u00a34\.50\/month/);
    expect(headline).toMatch(/\u00a34\.99 setup/);
    // The same three fee lines are listed up front.
    const lines = container.querySelectorAll('.fee-lines-honest .fee-line');
    const names = [...lines].map((l) => l.querySelector('.fee-line-name')!.textContent);
    expect(names).toContain('Service fee');
    expect(names).toContain('Required backup add-on');
    expect(names).toContain('Setup fee');
  });
});

describe('The Study — the possessed element', () => {
  afterEach(() => cleanup());

  function renderHaunted() {
    return render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
  }

  it('is found by its id "study-fee-lines"', () => {
    const { container } = renderHaunted();
    const possessed = container.querySelector('#study-fee-lines');
    expect(possessed).not.toBeNull();
    expect(possessed!.id).toBe(room.possessedId);
  });

  it('is keyboard-reachable with a non-empty accessible name', () => {
    renderHaunted();
    const possessed = screen.getByRole('button', { name: POSSESSED_NAME });
    expect(possessed.tagName).toBe('BUTTON');
    // Label in Name (WCAG 2.5.3): no aria-label overrides the visible text, so
    // the accessible name IS the visible fee text.
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('does not nest the Pay button inside the possessed fee block', () => {
    const { container } = renderHaunted();
    const possessed = container.querySelector('#study-fee-lines') as HTMLButtonElement;
    expect(possessed.querySelector('button')).toBeNull();
    // The Pay button is a sibling below the block, not inside it.
    const pay = screen.getByRole('button', { name: HAUNTED_PAY_NAME });
    expect(possessed.contains(pay)).toBe(false);
  });

  it('is NOT a live region: the fee block has no aria-live and no announcing role', () => {
    const { container } = renderHaunted();
    const possessed = container.querySelector('#study-fee-lines') as HTMLElement;
    expect(possessed.getAttribute('aria-live')).toBeNull();
    expect(possessed.getAttribute('role')).not.toBe('status');
    expect(possessed.getAttribute('role')).not.toBe('alert');
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    // Prices use tabular figures so the total never changes width.
    expect(css).toMatch(/\.fee-line-price\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
  });
});

describe('The Study — the haunted total equals the sum of its lines', () => {
  afterEach(() => cleanup());

  it('the fee lines sum to £4.50/month and £9.49 today', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    // The advertised "From £1/month" is the base; the fees add on top.
    const base = 1.0; // "From £1/month"
    const serviceFee = 1.5; // Service fee £1.50/month
    const backupAddon = 2.0; // Required backup add-on £2.00/month
    const setupFee = 4.99; // Setup fee £4.99 (one-off, today)

    const monthly = base + serviceFee + backupAddon;
    const today = monthly + setupFee;
    expect(monthly).toBeCloseTo(4.5, 2);
    expect(today).toBeCloseTo(9.49, 2);

    // The possessed block's own "Real total" line shows exactly this.
    const totalLine = container.querySelector('#study-fee-lines .fee-line-total')!.textContent || '';
    expect(totalLine).toMatch(/\u00a34\.50\/month/);
    expect(totalLine).toMatch(/\u00a34\.99 today/);

    // And the Pay button shows the £9.49 today total.
    const pay = screen.getByRole('button', { name: HAUNTED_PAY_NAME });
    expect(pounds(pay.textContent || '')).toContain(9.49);
  });

  it('the fee lines printed in the possessed block are exactly the three fees', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const feeLines = container.querySelectorAll('#study-fee-lines .fee-line:not(.fee-line-total)');
    const amounts = [...feeLines].flatMap((l) => pounds(l.textContent || ''));
    expect(amounts).toEqual([1.5, 2.0, 4.99]);
  });
});

describe('The Study — aria-current marks the step', () => {
  afterEach(() => cleanup());

  it('the haunted side marks step 3 (Pay) as the current step', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current.length).toBe(1);
    expect(current[0].textContent).toMatch(/3\s*Pay/);
  });

  it('the honest side marks step 1 (Plan) as the current step', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current.length).toBe(1);
    expect(current[0].textContent).toMatch(/1\s*Plan/);
  });
});

describe('The Study — the ghost size and anchor', () => {
  afterEach(() => cleanup());

  it('renders the ghost SVG at about 120 x 140 px inside the possessed block', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#study-fee-lines')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost inside the possessed fee block (.fee-lines-inner)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the fee block's inner column, so the
    // ghost peeks beside the lines (at their height), never over a price, a fee
    // line or the Pay button.
    const signs = container.querySelector('.fee-lines-inner > .ghost-signs');
    expect(signs).not.toBeNull();
  });

  it('reserves a strip under the block under 600px so the ghost never overlaps text', () => {
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
    expect(css).toMatch(/\.fee-lines-inner\s*\{[^}]*padding-bottom:\s*88px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*width:\s*72px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*height:\s*84px/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.plan-card\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.mildew\s*\{[^}]*(min-height|height)\s*:/);
  });
});

describe("The Study — the ghost's act (receipt unrolls fee by fee)", () => {
  afterEach(() => cleanup());

  function renderHaunted(extra: Partial<{ preview: boolean; reducedMotion: boolean }> = {}) {
    return render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={extra.reducedMotion ?? false}
        preview={extra.preview}
      />,
    );
  }

  it('renders the unrolling receipt inside the possessed block, aria-hidden', () => {
    const { container } = renderHaunted();
    const possessed = container.querySelector('#study-fee-lines')!;
    const receipt = possessed.querySelector('.act-receipt');
    expect(receipt).not.toBeNull();
    // Decorative: aria-hidden, so it adds nothing to the accessible name.
    expect(receipt!.getAttribute('aria-hidden')).toBe('true');
    // The paper and the fee stubs that pay out one by one.
    expect(possessed.querySelector('.act-receipt-paper')).not.toBeNull();
    expect(possessed.querySelectorAll('.act-receipt-fee').length).toBeGreaterThanOrEqual(3);
  });

  it('keeps the act decorative and non-blocking (pointer-events: none, transforms only, >= 4s cycle)', () => {
    // The act never blocks input and never shifts layout.
    expect(css).toMatch(/\.act-receipt\s*\{[^}]*pointer-events:\s*none/);
    // One cycle is 6s (>= 4s).
    expect(css).toMatch(/\.act-receipt-paper\s*\{[^}]*animation:\s*study-receipt-unroll\s*6s/);
    // The unroll uses transforms/opacity only (scaleY), never layout size.
    expect(css).toMatch(/@keyframes study-receipt-unroll[^}]*transform:\s*scaleY/);
    // The act freezes when the ghost is named (data-moment='right').
    expect(css).toMatch(/\.room-scene\[data-moment='right'\]\s*\.act-receipt-paper/);
  });

  it('is absent from the comparison preview (the static "before" side)', () => {
    const { container } = renderHaunted({ preview: true });
    // Preview omits the possessed id and all ghost signs, so no act either.
    expect(container.querySelector('#study-fee-lines')).toBeNull();
    expect(container.querySelector('.act-receipt')).toBeNull();
  });

  it('is absent from the honest twin', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('.act-receipt')).toBeNull();
  });

  it('under reduced motion holds a still pose with the caption "the fees come last"', () => {
    const { container } = renderHaunted({ reducedMotion: true });
    const possessed = container.querySelector('#study-fee-lines')!;
    // The act element still renders, still decorative.
    expect(possessed.querySelector('.act-receipt')).not.toBeNull();
    // The caption names the gesture; the "Something stirs here" label stays too.
    expect(screen.getByText('the fees come last')).toBeDefined();
    expect(screen.getByText('Something stirs here')).toBeDefined();
    // The caption is not a live region and adds nothing to announcements.
    expect(container.querySelector('[aria-live]')).toBeNull();
    // No movement: the reduced-motion rule freezes the act and holds a pose.
    expect(css).toMatch(/\.fee-lines\.reduced-motion\s*\.act-receipt-paper[\s\S]*?animation:\s*none/);
    expect(css).toMatch(/\.fee-lines\.reduced-motion\s*\.act-receipt-paper\s*\{[^}]*transform:\s*scaleY\(0\.5\)/);
  });
});

describe('The Study — pattern rule (passes on honest, fails on haunted)', () => {
  afterEach(() => cleanup());

  it('on the haunted side the fees are hidden until the last step (step 3), total £9.49 today', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    // Hidden costs: the possessed fee block appears only now, at step 3.
    expect(container.querySelector('#study-fee-lines')).not.toBeNull();
    const current = container.querySelector('[aria-current="step"]')!;
    expect(current.textContent).toMatch(/3\s*Pay/);
    // The plan still shouts "From £1/month" far from the real £9.49 today.
    expect(container.querySelector('.plan-shout')!.textContent).toMatch(/From\s*\u00a31/);
    const pay = screen.getByRole('button', { name: HAUNTED_PAY_NAME });
    expect(pounds(pay.textContent || '')).toContain(9.49);
  });

  it('on the honest side the whole price is shown up front at step 1', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // No late-reveal block; the real price is on the plan card at step 1.
    expect(container.querySelector('#study-fee-lines')).toBeNull();
    const current = container.querySelector('[aria-current="step"]')!;
    expect(current.textContent).toMatch(/1\s*Plan/);
    expect(container.querySelector('.plan-realprice')!.textContent).toMatch(
      /\u00a34\.50\/month, all fees included/,
    );
  });

  it('the pattern rule is variant-specific: late fees at step 3 vs up front at step 1 cannot both hold', () => {
    // Haunted hides the fees until step 3 and marks step 3 current; honest
    // shows them up front and marks step 1 current. If the haunted side ever
    // stopped hiding the fees (or the honest side gained a late-reveal block),
    // one of the assertions above would fail — so this detects Hidden costs,
    // not a variant-agnostic rule.
    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestHasLate = honest.container.querySelector('#study-fee-lines') !== null;
    const honestCurrent = honest.container.querySelector('[aria-current="step"]')!.textContent || '';
    cleanup();

    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedHasLate = haunted.container.querySelector('#study-fee-lines') !== null;
    const hauntedCurrent = haunted.container.querySelector('[aria-current="step"]')!.textContent || '';

    expect(hauntedHasLate).toBe(true);
    expect(honestHasLate).toBe(false);
    expect(hauntedHasLate).not.toBe(honestHasLate);
    expect(hauntedCurrent).toMatch(/3\s*Pay/);
    expect(honestCurrent).toMatch(/1\s*Plan/);
  });
});

describe('The Study — contrast and axe on both variants', () => {
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

describe('The Study — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#study-fee-lines')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    // "Nagging" is a wrong card here (correct is Hidden costs).
    const wrong = await screen.findByRole('button', { name: 'Nagging' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/nothing keeps asking you/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

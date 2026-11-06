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

/** The possessed watchers badge's visible text, which is also its accessible name. */
const POSSESSED_NAME = /38 people are looking at this room right now/i;

afterEach(() => cleanup());

describe('The Portrait Gallery — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "choose a room by real reviews" in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One calm click on a "Choose" button — no fake crowd pushing you.
    fireEvent.click(screen.getByRole('button', { name: 'Choose the Ivy Room' }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Fake social proof' }));
    await screen.findByRole('heading', { level: 2, name: 'Fake social proof' });
    // The split renders the haunted preview (aria-hidden) and the honest twin;
    // only the honest "Choose" buttons are reachable by role.
    fireEvent.click(screen.getByRole('button', { name: 'Choose the Moonlit Suite' }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });

  it('has no watchers counter and every review carries a date', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // No watchers badge on the honest side.
    expect(container.querySelector('#gallery-watchers')).toBeNull();
    expect(container.textContent).not.toMatch(/people are looking/i);
    // Every review is dated and marked with its stay.
    const reviews = container.querySelectorAll('.inn-review');
    expect(reviews.length).toBeGreaterThan(0);
    for (const review of Array.from(reviews)) {
      const stay = review.querySelector('.inn-review-stay');
      expect(stay).not.toBeNull();
      expect(stay!.textContent || '').toMatch(/Stayed in \w+ \d{4}/);
    }
  });
});

describe('The Portrait Gallery — the possessed element', () => {
  it('is found by its id "gallery-watchers"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#gallery-watchers');
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
    // the accessible name IS the visible badge text.
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('is a STATIC number and NOT a live region: no aria-live and no announcing role', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#gallery-watchers') as HTMLButtonElement;
    // The badge does not announce each change: no aria-live, no status role.
    expect(possessed.getAttribute('aria-live')).toBeNull();
    expect(possessed.getAttribute('role')).not.toBe('status');
    expect(possessed.getAttribute('role')).not.toBe('alert');
    expect(possessed.getAttribute('role')).not.toBe('timer');
    // Nor does any descendant turn it into a live region.
    expect(possessed.querySelector('[aria-live]')).toBeNull();
    expect(possessed.querySelector('[role="status"]')).toBeNull();
    expect(possessed.querySelector('[role="alert"]')).toBeNull();
    // Its visible text is the static number — it never ticks.
    const visible = possessed.querySelector('.inn-watchers-label')!.textContent || '';
    expect(visible).toMatch(/^38 people are looking at this room right now/);
  });
});

describe('The Portrait Gallery — accessible star ratings', () => {
  it('haunted: star ratings are text plus an accessible "N out of 5 stars" label', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const stars = container.querySelectorAll('.stars');
    expect(stars.length).toBeGreaterThan(0);
    for (const s of Array.from(stars)) {
      // The glyphs are decorative; the accessible label carries the rating.
      expect(s.querySelector('.stars-glyphs')!.getAttribute('aria-hidden')).toBe('true');
      const label = s.querySelector('.visually-hidden');
      expect(label).not.toBeNull();
      expect(label!.textContent || '').toMatch(/^\d out of 5 stars$/);
    }
    // The accessible text appears in the DOM (not an image alone).
    expect(screen.getAllByText(/\d out of 5 stars/).length).toBeGreaterThan(0);
  });

  it('honest: star ratings keep their accessible "N out of 5 stars" label', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    const stars = container.querySelectorAll('.stars');
    expect(stars.length).toBeGreaterThan(0);
    for (const s of Array.from(stars)) {
      expect(s.querySelector('.stars-glyphs')!.getAttribute('aria-hidden')).toBe('true');
      const label = s.querySelector('.visually-hidden');
      expect(label).not.toBeNull();
      expect(label!.textContent || '').toMatch(/^\d out of 5 stars$/);
    }
  });
});

describe('The Portrait Gallery — pattern rule (passes on honest, fails on haunted)', () => {
  it('on the haunted side: the fake crowd badge is present and the first card has undated reviews', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    // The possessed watchers badge is present with the fake crowd.
    const badge = container.querySelector('#gallery-watchers');
    expect(badge).not.toBeNull();
    expect(badge!.textContent || '').toMatch(/38 people are looking/);
    // The first card's three five-star reviews carry NO date (first names only).
    const firstCard = container.querySelectorAll('.inn-card')[0];
    const firstReviews = firstCard.querySelectorAll('.inn-review');
    expect(firstReviews.length).toBe(3);
    for (const review of Array.from(firstReviews)) {
      expect(review.querySelector('.inn-review-stay')).toBeNull();
    }
  });

  it('on the honest side: there is no badge and every review is dated', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    expect(container.querySelector('#gallery-watchers')).toBeNull();
    expect(container.textContent).not.toMatch(/people are looking/i);
    for (const review of Array.from(container.querySelectorAll('.inn-review'))) {
      expect(review.querySelector('.inn-review-stay')).not.toBeNull();
    }
  });

  it('the pattern rule is variant-specific: fake-crowd-and-undated-praise vs none cannot both hold', () => {
    // Haunted: a watchers badge plus undated five-star reviews. Honest: no
    // badge and every review dated. If the haunted side ever dropped the fake
    // social proof (or the honest side gained a badge or an undated review),
    // one assertion above would fail — so this detects Fake social proof, not
    // a variant-agnostic rule.
    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestHasFakeSocialProof =
      honest.container.querySelector('#gallery-watchers') !== null ||
      Array.from(honest.container.querySelectorAll('.inn-review')).some(
        (r) => r.querySelector('.inn-review-stay') === null,
      );

    cleanup();

    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const badgePresent = haunted.container.querySelector('#gallery-watchers') !== null;
    const firstCard = haunted.container.querySelectorAll('.inn-card')[0];
    const firstReviewsUndated = Array.from(
      firstCard.querySelectorAll('.inn-review'),
    ).every((r) => r.querySelector('.inn-review-stay') === null);
    const hauntedHasFakeSocialProof = badgePresent && firstReviewsUndated;

    expect(hauntedHasFakeSocialProof).toBe(true);
    expect(honestHasFakeSocialProof).toBe(false);
    expect(hauntedHasFakeSocialProof).not.toBe(honestHasFakeSocialProof);
  });
});

describe('The Portrait Gallery — the ghost size and anchor', () => {
  it('renders the ghost SVG at about 120 x 140 px inside the possessed badge', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#gallery-watchers')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });

  it('anchors the ghost to the possessed badge itself (.inn-watchers-label)', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // The ghost-signs anchor sits INSIDE the badge's label, so the ghost peeks
    // beside the badge (at its height), not over a review or a button.
    const signs = container.querySelector('.inn-watchers-label > .ghost-signs');
    expect(signs).not.toBeNull();
  });

  it('reserves a strip under the badge under 600px and stacks the two cards', () => {
    // At 1920 the 120 x 140 ghost sits just right of the badge; under 600px
    // the two cards stack and a smaller ghost rises from a reserved strip
    // under the badge, so there is no horizontal overflow at 412px.
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/);
    expect(css).toMatch(/\.inn-watchers-label\s*\{[^}]*padding-bottom:\s*88px/);
    expect(css).toMatch(/\.inn-rooms\s*\{[^}]*flex-direction:\s*column/);
    // The smaller ghost under 600px is about 72 x 84.
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*width:\s*72px/);
    expect(css).toMatch(/\.ghost-wrap\s*\{[^}]*height:\s*84px/);
  });

  it('uses no fixed or minimum heights that would leave empty boxes on mobile', () => {
    expect(css).not.toMatch(/\.inn-card\s*\{[^}]*(min-height|height)\s*:/);
    expect(css).not.toMatch(/\.lanternstay\s*\{[^}]*(min-height|height)\s*:/);
  });
});

describe('The Portrait Gallery — contrast and axe on both variants', () => {
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

describe('The Portrait Gallery — reduced motion static indicator', () => {
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
    const possessed = container.querySelector('#gallery-watchers')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    // "Disguised ads" is a wrong card here (correct is Fake social proof).
    const wrong = await screen.findByRole('button', { name: 'Disguised ads' });
    fireEvent.click(wrong);
    // The whisper hint is announced (the no-fail feedback).
    expect(await screen.findByText(/ads dressed as news/i)).toBeDefined();
    // The spell cards carry the flicker class, but under reduced motion the
    // flicker animation is disabled by the base reduced-motion rule.
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});

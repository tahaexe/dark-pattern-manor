import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import axe from 'axe-core';
import TitleScreen from './TitleScreen';
import { __resetForTests, completeRoom } from '../engine/progress';
import { roomSlugs } from '../engine/registry';
import { TITLE_STEPS } from './howToPlay';

const SLUGS = roomSlugs();

/** Complete the first `n` rooms in product order. */
function complete(n: number) {
  for (let i = 0; i < n; i++) completeRoom(SLUGS[i]);
}

describe('TitleScreen', () => {
  beforeEach(() => __resetForTests());
  afterEach(() => __resetForTests());

  it('shows the heading, tagline, and facts line word for word', () => {
    render(<TitleScreen />);
    expect(screen.getByRole('heading', { name: 'Dark Pattern Manor' })).toBeDefined();
    expect(
      screen.getByText('Every trick is a ghost. Name it to set the page free.'),
    ).toBeDefined();
    expect(
      screen.getByText(
        '12 haunted rooms · No account, nothing tracked · Plays by keyboard and screen reader',
      ),
    ).toBeDefined();
  });

  it('with no room done: primary "Enter the manor" → #/room/1, no secondary link', () => {
    render(<TitleScreen />);
    const primary = screen.getByText('Enter the manor') as HTMLAnchorElement;
    expect(primary.tagName).toBe('A');
    expect(primary.getAttribute('href')).toBe('#/room/1');
    expect(screen.queryByText('Start from the Foyer')).toBeNull();
    expect(screen.queryByText('Walk the rooms again')).toBeNull();
  });

  it('with 3 rooms done: "Continue: The Parlour" → #/room/4, secondary "Start from the Foyer" → #/room/1', () => {
    complete(3);
    render(<TitleScreen />);
    const primary = screen.getByText('Continue: The Parlour') as HTMLAnchorElement;
    expect(primary.tagName).toBe('A');
    expect(primary.getAttribute('href')).toBe('#/room/4');
    const secondary = screen.getByText('Start from the Foyer') as HTMLAnchorElement;
    expect(secondary.tagName).toBe('A');
    expect(secondary.getAttribute('href')).toBe('#/room/1');
  });

  it('with all 12 done: primary "The manor is quiet" → #/end, secondary "Walk the rooms again" → #/room/1', () => {
    complete(12);
    render(<TitleScreen />);
    const primary = screen.getByText('The manor is quiet') as HTMLAnchorElement;
    expect(primary.tagName).toBe('A');
    expect(primary.getAttribute('href')).toBe('#/end');
    const secondary = screen.getByText('Walk the rooms again') as HTMLAnchorElement;
    expect(secondary.tagName).toBe('A');
    expect(secondary.getAttribute('href')).toBe('#/room/1');
    // The "Enter the manor" wording is gone once the manor is complete.
    expect(screen.queryByText('Enter the manor')).toBeNull();
  });

  it('carries a small footer link for teachers to #/teach', () => {
    render(<TitleScreen />);
    const link = screen.getByRole('link', { name: 'For teachers' }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/teach');
  });

  it('the ghost is aria-hidden', () => {
    const { container } = render(<TitleScreen />);
    const ghost = container.querySelector('.title-ghost');
    expect(ghost).not.toBeNull();
    expect(ghost!.getAttribute('aria-hidden')).toBe('true');
    const svg = ghost!.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
  });

  it('the heading is programmatically focusable (tabindex -1) and takes focus', () => {
    render(<TitleScreen />);
    const heading = screen.getByRole('heading', { name: 'Dark Pattern Manor' }) as HTMLHeadingElement;
    expect(heading.tabIndex).toBe(-1);
    heading.focus();
    expect(document.activeElement).toBe(heading);
  });

  describe('the three steps of play', () => {
    it('shows the three steps in order, each with its title and line', () => {
      const { container } = render(<TitleScreen />);
      const items = container.querySelectorAll('.title-steps .title-step');
      expect(items.length).toBe(3);
      TITLE_STEPS.forEach((step, i) => {
        const el = items[i];
        expect(el.querySelector('.title-step-title')!.textContent).toBe(step.title);
        // Raw textContent keeps the non-breaking space the source carries.
        expect(el.querySelector('.title-step-line')!.textContent).toBe(step.line);
      });
    });

    it('each step line carries a non-breaking space before its last word (no widow)', () => {
      const { container } = render(<TitleScreen />);
      const lines = container.querySelectorAll('.title-step-line');
      expect(lines.length).toBe(3);
      lines.forEach((el) => {
        const text = el.textContent || '';
        const lastNbsp = text.lastIndexOf('\u00A0');
        expect(lastNbsp).toBeGreaterThan(-1);
        // No plain space after the last non-breaking space, so the final word
        // can never wrap onto a line of its own.
        expect(text.slice(lastNbsp + 1)).not.toContain(' ');
      });
    });

    it('shows the exact step titles and lines word for word', () => {
      render(<TitleScreen />);
      // @testing-library normalizes the rendered non-breaking spaces to plain
      // spaces, so the visible words match these plain-space strings.
      expect(screen.getByText('Spot the trick')).toBeDefined();
      expect(screen.getByText('One part of the page is haunted. Tap it.')).toBeDefined();
      expect(screen.getByText('Name it')).toBeDefined();
      expect(screen.getByText('Pick the card that names the trick.')).toBeDefined();
      expect(screen.getByText('Set the page free')).toBeDefined();
      expect(screen.getByText('See the honest page and finish your task.')).toBeDefined();
    });

    it('each step drawing is aria-hidden (decorative)', () => {
      const { container } = render(<TitleScreen />);
      const glyphs = container.querySelectorAll('.title-step-glyph');
      expect(glyphs.length).toBe(3);
      glyphs.forEach((g) => {
        expect(g.getAttribute('aria-hidden')).toBe('true');
        expect(g.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('the steps show alongside the "Enter the manor" button, which still starts in one tap', () => {
      const { container } = render(<TitleScreen />);
      expect(container.querySelector('.title-steps')).not.toBeNull();
      const primary = screen.getByText('Enter the manor') as HTMLAnchorElement;
      expect(primary.getAttribute('href')).toBe('#/room/1');
    });

    it('the steps still show in the in-progress state without removing the controls', () => {
      complete(3);
      const { container } = render(<TitleScreen />);
      expect(container.querySelectorAll('.title-step').length).toBe(3);
      expect(screen.getByText('Continue: The Parlour')).toBeDefined();
      expect(screen.getByText('Start from the Foyer')).toBeDefined();
    });

    it('the steps still show in the complete state without removing the controls', () => {
      complete(12);
      const { container } = render(<TitleScreen />);
      expect(container.querySelectorAll('.title-step').length).toBe(3);
      expect(screen.getByText('The manor is quiet')).toBeDefined();
      expect(screen.getByText('Walk the rooms again')).toBeDefined();
    });
  });

  async function expectNoViolations(container: HTMLElement) {
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: true } },
    });
    if (results.violations.length > 0) {
      console.log('axe violations:', JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toHaveLength(0);
  }

  it('axe-core: zero violations with no room done', async () => {
    const { container } = render(<TitleScreen />);
    await expectNoViolations(container);
  });

  it('axe-core: zero violations with 3 rooms done', async () => {
    complete(3);
    const { container } = render(<TitleScreen />);
    await expectNoViolations(container);
  });

  it('axe-core: zero violations with all 12 done', async () => {
    complete(12);
    const { container } = render(<TitleScreen />);
    await expectNoViolations(container);
  });
});

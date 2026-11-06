import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import axe from 'axe-core';
import TitleScreen from './TitleScreen';
import { __resetForTests, completeRoom } from '../engine/progress';
import { roomSlugs } from '../engine/registry';

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

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import axe from 'axe-core';
import EndingPage from './EndingPage';
import { __resetForTests, completeRoom } from '../engine/progress';

/** The twelve room slugs, in order; completing all of them opens the ending. */
const ALL_SLUGS = [
  'gravemoor-gazette',
  'inkbone-books',
  'grimsupper',
  'gloamline',
  'hollowpost',
  'shroudery',
  'lanternstay',
  'mothmilk',
  'mildew',
  'wanderwick',
  'rookery',
  'bramblegate',
];

function completeAll() {
  for (const slug of ALL_SLUGS) completeRoom(slug);
}

/** The twelve checklist lines, word for word, in order. */
const CHECKLIST_LINES = [
  'On a cookie banner, find "Reject all" before you click anything.',
  'Read every checkbox sentence twice: what happens if I leave it alone?',
  'When the "no" button insults you, click it anyway.',
  'Before a free trial: the price after, the start date, the way to cancel.',
  'A countdown that resets is a costume. Reload and see.',
  '"Only 1 left" on everything means nothing.',
  'Trust dated, verified reviews; ignore "people are looking".',
  'Read the basket line by line before paying.',
  'Compare final totals, never "from" prices.',
  'Find "Don\'t ask again", or switch the prompt off in settings.',
  "Untick every box you didn't tick.",
  'Find the cancel path before you subscribe; keep the confirmation.',
];

const ROOM_TITLES = [
  'The Foyer',
  'The Library',
  'The Dining Room',
  'The Parlour',
  'The Conservatory',
  'The Ballroom',
  'The Portrait Gallery',
  'The Pantry',
  'The Study',
  'The Nursery',
  'The Attic',
  'The Cellar',
];

/** The six wandering-ghost lines, word for word. */
const WANDERING_LINES = [
  'Disguised ads: ads dressed as news, reviews or neutral rankings.',
  'Forced action: you must create an account or share data to finish a simple task.',
  'Obstruction: the path you want is made long and tiring on purpose.',
  'Comparison prevention: bundles, odd units or per-week prices that make prices hard to compare.',
  'Addictive design: endless feeds, autoplay and streaks that keep you there.',
  'Currency confusion: gems and coins that hide the real price.',
];

describe('EndingPage — the gate before completion', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('shows "Name all twelve ghosts first" and not the checklist when fewer than twelve are done', () => {
    render(<EndingPage />);
    expect(screen.getByText('Name all twelve ghosts first.')).toBeDefined();
    // The checklist heading must not appear.
    expect(screen.queryByText('Ghost hunt in your own browser')).toBeNull();
    // Nor any checklist line.
    expect(screen.queryByText(CHECKLIST_LINES[0])).toBeNull();
  });

  it('still gates when only eleven of twelve are done', () => {
    for (const slug of ALL_SLUGS.slice(0, 11)) completeRoom(slug);
    render(<EndingPage />);
    expect(screen.getByText('Name all twelve ghosts first.')).toBeDefined();
    expect(screen.queryByText('Ghost hunt in your own browser')).toBeNull();
  });
});

describe('EndingPage — the completed ending', () => {
  beforeEach(() => {
    __resetForTests();
    completeAll();
  });

  it('renders the heading and the closing line', () => {
    render(<EndingPage />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('The manor is quiet');
    expect(screen.getByText('You named all twelve ghosts.')).toBeDefined();
  });

  it('renders the twelve checklist lines word for word, in order', () => {
    const { container } = render(<EndingPage />);
    const items = container.querySelectorAll('.ending-checklist-line');
    expect(items).toHaveLength(12);
    CHECKLIST_LINES.forEach((line, i) => {
      expect(items[i].textContent).toBe(line);
    });
  });

  it('links each checklist line to its room, named by the room title', () => {
    const { container } = render(<EndingPage />);
    const links = container.querySelectorAll('.ending-room-link');
    expect(links).toHaveLength(12);
    links.forEach((link, i) => {
      expect(link.getAttribute('href')).toBe(`#/room/${i + 1}`);
      const label = link.getAttribute('aria-label') ?? '';
      // The accessible description names the room's display title.
      expect(label).toContain(ROOM_TITLES[i]);
      expect(link.textContent).toContain(ROOM_TITLES[i]);
    });
  });

  it('renders the six wandering-ghost lines word for word', () => {
    const { container } = render(<EndingPage />);
    const items = container.querySelectorAll('.ending-wandering-item');
    expect(items).toHaveLength(6);
    WANDERING_LINES.forEach((line, i) => {
      // Collapse whitespace so the "name: desc" text compares cleanly.
      const text = (items[i].textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(text).toBe(line);
    });
  });

  it('keeps a clean heading outline with exactly one h1', () => {
    render(<EndingPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // The section headings are present at level 2.
    expect(screen.getByRole('heading', { level: 2, name: 'Ghost hunt in your own browser' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Six ghosts still wander' })).toBeDefined();
  });

  it('reports zero axe-core violations', async () => {
    const { container } = render(<EndingPage />);
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});

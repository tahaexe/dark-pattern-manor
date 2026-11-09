import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import axe from 'axe-core';
import EndingPage from './EndingPage';
import { roomSlugs, ROOM_COUNT } from '../engine/registry';
import { CHECKLIST, WANDERING } from './checklist';
import { __resetForTests, completeRoom } from '../engine/progress';

/** Every registered room slug, in order; completing all opens the ending. */
const ALL_SLUGS = roomSlugs();

function completeAll() {
  for (const slug of ALL_SLUGS) completeRoom(slug);
}

/** The checklist lines, word for word, in order — the one shared source. */
const CHECKLIST_LINES = CHECKLIST.map((c) => c.line);

/** The room titles, in order — the one shared source. */
const ROOM_TITLES = CHECKLIST.map((c) => c.title);

/** The wandering-ghost lines, word for word — the one shared source. */
const WANDERING_LINES = WANDERING.map((g) => `${g.name}: ${g.desc}`);

describe('EndingPage — the gate before completion', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('shows "Name all fourteen ghosts first" and not the checklist when fewer than every room is done', () => {
    render(<EndingPage />);
    expect(screen.getByText('Name all fourteen ghosts first.')).toBeDefined();
    // The checklist heading must not appear.
    expect(screen.queryByText('Ghost hunt in your own browser')).toBeNull();
    // Nor any checklist line.
    expect(screen.queryByText(CHECKLIST_LINES[0])).toBeNull();
  });

  it('still gates when only one short of every room is done', () => {
    for (const slug of ALL_SLUGS.slice(0, ROOM_COUNT - 1)) completeRoom(slug);
    render(<EndingPage />);
    expect(screen.getByText('Name all fourteen ghosts first.')).toBeDefined();
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
    expect(screen.getByText('You named all fourteen ghosts.')).toBeDefined();
  });

  it('renders every checklist line word for word, in order', () => {
    const { container } = render(<EndingPage />);
    const items = container.querySelectorAll('.ending-checklist-line');
    expect(items).toHaveLength(CHECKLIST_LINES.length);
    CHECKLIST_LINES.forEach((line, i) => {
      expect(items[i].textContent).toBe(line);
    });
  });

  it('links each checklist line to its room, named by the room title', () => {
    const { container } = render(<EndingPage />);
    const links = container.querySelectorAll('.ending-room-link');
    expect(links).toHaveLength(CHECKLIST.length);
    links.forEach((link, i) => {
      expect(link.getAttribute('href')).toBe(`#/room/${i + 1}`);
      const label = link.getAttribute('aria-label') ?? '';
      // The accessible description names the room's display title.
      expect(label).toContain(ROOM_TITLES[i]);
      expect(link.textContent).toContain(ROOM_TITLES[i]);
    });
  });

  it('renders the wandering-ghost lines word for word', () => {
    const { container } = render(<EndingPage />);
    const items = container.querySelectorAll('.ending-wandering-item');
    expect(items).toHaveLength(WANDERING_LINES.length);
    WANDERING_LINES.forEach((line, i) => {
      // Collapse whitespace so the "name: desc" text compares cleanly.
      const text = (items[i].textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(text).toBe(line);
    });
  });

  it('now has four wandering ghosts (Disguised ads and Forced action became rooms)', () => {
    expect(WANDERING).toHaveLength(4);
    const names = WANDERING.map((g) => g.name);
    expect(names).not.toContain('Disguised ads');
    expect(names).not.toContain('Forced action');
  });

  it('keeps a clean heading outline with exactly one h1', () => {
    render(<EndingPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // The section headings are present at level 2.
    expect(screen.getByRole('heading', { level: 2, name: 'Ghost hunt in your own browser' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Four ghosts still wander' })).toBeDefined();
  });

  it('reports zero axe-core violations', async () => {
    const { container } = render(<EndingPage />);
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});

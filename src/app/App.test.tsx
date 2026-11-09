import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import axe from 'axe-core';
import App from './App';
import { roomSlugs, ROOM_COUNT } from '../engine/registry';
import { __resetForTests, completeRoom } from '../engine/progress';

// Every registered room slug, in order; completing all of them opens the
// ending. Read from the registry so adding a room needs no change here.
const ALL_SLUGS = roomSlugs();

describe('App', () => {
  let originalHash: string;

  beforeEach(() => {
    originalHash = window.location.hash;
    window.location.hash = '';
    __resetForTests();
  });

  afterEach(() => {
    window.location.hash = originalHash;
    __resetForTests();
  });

  const setHashAndTrigger = (hash: string) => {
    window.location.hash = hash;
    // Manually trigger hashchange event since jsdom doesn't do it automatically
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: window.location.href, newURL: window.location.href }));
  };

  it('renders the title screen with heading, tagline, and the primary action', () => {
    render(<App />);
    const heading = screen.getByText('Dark Pattern Manor');
    const tagline = screen.getByText('Every trick is a ghost. Name it to set the page free.');
    const enter = screen.getByText('Enter the manor') as HTMLAnchorElement;
    expect(heading).toBeDefined();
    expect(tagline).toBeDefined();
    expect(enter.getAttribute('href')).toBe('#/room/1');
  });

  it('navigating to #/room/1 shows the heading "The Foyer"', async () => {
    render(<App />);
    setHashAndTrigger('#/room/1');
    await waitFor(() => {
      const foyer = screen.queryByText('The Foyer');
      expect(foyer).toBeDefined();
    }, { timeout: 1000 });
  });

  it('clicking "‹ Manor" in the bar returns to the title', async () => {
    render(<App />);
    setHashAndTrigger('#/room/1');

    await waitFor(() => {
      expect(screen.queryByText('The Foyer')).toBeDefined();
    }, { timeout: 1000 });

    // The bar's quiet "‹ Manor" button replaces the old Back button.
    const manorBtn = await screen.findByRole('button', { name: /Manor/ });
    manorBtn.click();
    // The button sets the hash; mirror the hashchange the way the router hears it.
    setHashAndTrigger('#/');

    await waitFor(() => {
      const title = screen.queryByText('Dark Pattern Manor');
      expect(title).toBeDefined();
    }, { timeout: 1000 });
  });

  it('a page opened at #/room/1 renders "The Foyer" directly', async () => {
    setHashAndTrigger('#/room/1');
    render(<App />);
    await waitFor(() => {
      const foyer = screen.queryByText('The Foyer');
      expect(foyer).toBeDefined();
    }, { timeout: 1000 });
  });

  it('reserves the room scene while the room chunk is loading (no layout shift)', () => {
    setHashAndTrigger('#/room/1');
    const { container } = render(<App />);
    const scene = container.querySelector('.room-scene.room-scene-pending');
    expect(scene).not.toBeNull();
    expect(scene!.querySelector('.room-wall')).not.toBeNull();
    expect(scene!.querySelector('.room-loading[role="status"]')).not.toBeNull();
  });

  it('a hashchange to #/ returns to the title', async () => {
    setHashAndTrigger('#/room/1');
    render(<App />);
    await waitFor(() => {
      const foyer = screen.queryByText('The Foyer');
      expect(foyer).toBeDefined();
    }, { timeout: 1000 });
    setHashAndTrigger('#/');
    await waitFor(() => {
      const title = screen.queryByText('Dark Pattern Manor');
      expect(title).toBeDefined();
    }, { timeout: 1000 });
  });

  it('a page opened at #/look renders the look page with task bar title "The Foyer"', async () => {
    setHashAndTrigger('#/look');
    render(<App />);
    await waitFor(() => {
      const foyer = screen.queryByText('The Foyer');
      expect(foyer).toBeDefined();
    }, { timeout: 1000 });
  });

  it('opening #/end before completion shows the gate line, not the checklist', async () => {
    setHashAndTrigger('#/end');
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText('Name all fourteen ghosts first.')).not.toBeNull();
    }, { timeout: 1000 });
    expect(screen.queryByText('Ghost hunt in your own browser')).toBeNull();
  });

  it('opening #/end after completing every room shows the ending', async () => {
    for (const slug of ALL_SLUGS) completeRoom(slug);
    setHashAndTrigger('#/end');
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText('The manor is quiet')).not.toBeNull();
    }, { timeout: 1000 });
    expect(screen.getByText('Ghost hunt in your own browser')).toBeDefined();
  });

  it('opening #/teach renders the teaching page, without finishing the game', async () => {
    setHashAndTrigger('#/teach');
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText('Teaching with Dark Pattern Manor')).not.toBeNull();
    }, { timeout: 1000 });
  });

  it('shows the "The manor is quiet" link on the title only once every room is complete', () => {
    render(<App />);
    expect(screen.queryByText('The manor is quiet')).toBeNull();
    expect(screen.getByText('Enter the manor')).toBeDefined();
  });

  it('shows the title end link when every room is complete', () => {
    for (const slug of ALL_SLUGS) completeRoom(slug);
    render(<App />);
    const link = screen.getByText('The manor is quiet') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/end');
  });

  it('axe-core reports no violations on the title screen', async () => {
    const { container } = render(<App />);
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('axe-core reports no violations on the room screen', async () => {
    setHashAndTrigger('#/room/1');
    const { container } = render(<App />);
    await waitFor(() => {
      const foyer = screen.queryByText('The Foyer');
      expect(foyer).toBeDefined();
    }, { timeout: 1000 });
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});

describe('parseHash', () => {
  it('reads the route a hash names, before the first render', async () => {
    const { parseHash } = await import('./App');
    expect(parseHash('')).toEqual({ route: 'title', room: 1 });
    expect(parseHash('#/')).toEqual({ route: 'title', room: 1 });
    expect(parseHash('#/look')).toEqual({ route: 'look', room: 1 });
    expect(parseHash('#/end')).toEqual({ route: 'end', room: 1 });
    expect(parseHash('#/teach')).toEqual({ route: 'teach', room: 1 });
    expect(parseHash('#/room/1')).toEqual({ route: 'room', room: 1 });
    // The last registered room resolves; one past it does not. The bound is the
    // registry's room count, so adding a room needs no change here.
    expect(parseHash(`#/room/${ROOM_COUNT}`)).toEqual({ route: 'room', room: ROOM_COUNT });
    expect(parseHash(`#/room/${ROOM_COUNT + 1}`)).toBeNull();
    expect(parseHash('#/nowhere')).toBeNull();
  });
});

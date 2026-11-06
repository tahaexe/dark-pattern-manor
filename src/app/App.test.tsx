import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import axe from 'axe-core';
import App from './App';

describe('App', () => {
  let originalHash: string;

  beforeEach(() => {
    originalHash = window.location.hash;
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  const setHashAndTrigger = (hash: string) => {
    window.location.hash = hash;
    // Manually trigger hashchange event since jsdom doesn't do it automatically
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: window.location.href, newURL: window.location.href }));
  };

  it('renders the title screen with heading, subtitle, and Start button', () => {
    render(<App />);
    const heading = screen.getByText('Dark Pattern Manor');
    const subtitle = screen.getByText('Every trick is a ghost. Name it to set the page free.');
    const startBtn = screen.getByText('Start');
    expect(heading).toBeDefined();
    expect(subtitle).toBeDefined();
    expect(startBtn).toBeDefined();
  });

  it('clicking Start shows the heading "The Foyer"', async () => {
    render(<App />);
    const startBtn = screen.getByText('Start');
    startBtn.click();
    await waitFor(() => {
      const foyer = screen.queryByText('The Foyer');
      expect(foyer).toBeDefined();
    }, { timeout: 1000 });
  });

  it('clicking Back returns to the title', async () => {
    render(<App />);
    const startBtn = screen.getByText('Start');
    startBtn.click();
    
    await waitFor(() => {
      const foyer = screen.queryByText('The Foyer');
      expect(foyer).toBeDefined();
    }, { timeout: 1000 });
    
    const backBtn = screen.getByText('Back');
    backBtn.click();
    
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
    // Before the lazily-loaded room chunk resolves, the loading state must live
    // inside the same `room-scene` box (with the backdrop) as the loaded room,
    // so swapping in the room adds no layout shift (CLS). We assert the pending
    // scene and its backdrop render synchronously, before the chunk arrives.
    setHashAndTrigger('#/room/1');
    const { container } = render(<App />);
    const scene = container.querySelector('.room-scene.room-scene-pending');
    expect(scene).not.toBeNull();
    // The backdrop wall is reserved behind the loading message.
    expect(scene!.querySelector('.room-wall')).not.toBeNull();
    // The loading message is the status region, inside the reserved scene.
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

  it('axe-core reports no violations on the title screen', async () => {
    const { container } = render(<App />);
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('axe-core reports no violations on the room screen', async () => {
    const { container } = render(<App />);
    const startBtn = screen.getByText('Start');
    startBtn.click();
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
    expect(parseHash('#/room/1')).toEqual({ route: 'room', room: 1 });
    expect(parseHash('#/room/12')).toEqual({ route: 'room', room: 12 });
    expect(parseHash('#/room/13')).toBeNull();
    expect(parseHash('#/nowhere')).toBeNull();
  });
});

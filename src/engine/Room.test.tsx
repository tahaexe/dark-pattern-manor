import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import Room from './Room';
import { loadRoom, roomSlugs } from './registry';
import { __resetForTests, doneCount } from './progress';
import type { RoomData } from './types';

/** A deterministic card order: no shuffling. */
const identityRng = () => 0;

async function foyer(): Promise<RoomData> {
  return loadRoom('gravemoor-gazette');
}

/** Mock matchMedia so `prefers-reduced-motion: reduce` is on (deterministic). */
function mockReducedMotion() {
  return vi.spyOn(window, 'matchMedia').mockImplementation(
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
}

describe('registry (on-demand loading)', () => {
  it('loads a room by slug through dynamic import', async () => {
    const room = await loadRoom('gravemoor-gazette');
    expect(room.slug).toBe('gravemoor-gazette');
    expect(room.name).toBe('The Foyer');
  });

  it('exposes room slugs through lazy loader thunks', () => {
    expect(roomSlugs()).toContain('gravemoor-gazette');
    expect(typeof roomSlugs).toBe('function');
  });
});

describe('Room component — full loop', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('runs lantern -> inspecting -> pick possessed -> picking -> correct -> honest -> done', async () => {
    const room = await foyer();
    render(<Room room={room} nextSlug="inkbone-books" rng={identityRng} />);

    // Raise the lantern.
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    // Select the possessed element.
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    // Now in picking: three spell cards appear.
    const correct = await screen.findByRole('button', { name: 'Visual interference' });
    expect(correct).toBeDefined();

    // Pick the correct card → named → (ghost flees) → auto advance → honest.
    fireEvent.click(correct);

    // The honest twin and guide appear.
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });

    // Complete the task on the honest side (one click). The preview haunted
    // copy is aria-hidden, so the honest "Reject all" is the only one exposed.
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    await waitFor(() => {
      expect(doneCount()).toBe(1);
    });
  });

  it('moves focus to the room heading on each state change', async () => {
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    const heading = screen.getByRole('heading', { level: 1, name: 'The Foyer' });
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    await waitFor(() => {
      expect(document.activeElement).toBe(heading);
    });
  });
});

describe('Room component — the ghost flees before the honest twin appears', () => {
  let spy: ReturnType<typeof mockReducedMotion> | undefined;

  beforeEach(() => {
    __resetForTests();
    // Reduced motion keeps the hold short and deterministic (no rAF), so the
    // room still advances named → honest with no player input.
    spy = mockReducedMotion();
  });

  afterEach(() => {
    spy?.mockRestore();
  });

  it('keeps the ghost in the document during named, then gone once honest', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    const correct = await screen.findByRole('button', { name: 'Visual interference' });

    // Picking the correct card enters `named` synchronously. The haunted page
    // and its ghost are still mounted so the flee can play; the scene is marked
    // fleeing for the shared flee animation.
    fireEvent.click(correct);
    const scene = container.querySelector('.room-scene') as HTMLElement;
    expect(scene.getAttribute('data-fleeing')).toBe('true');
    expect(container.querySelector('.ghost-wrap')).not.toBeNull();

    // After the hold the room advances to honest with no further input; the
    // live haunted view (and its ghost) are gone.
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
    expect(scene.hasAttribute('data-fleeing')).toBe(false);
    const liveGhost = container.querySelector('.manor-frame:not(.manor-frame-preview) .ghost-wrap');
    expect(liveGhost).toBeNull();
  });
});

describe('Room component — the continue affordance', () => {
  beforeEach(() => {
    __resetForTests();
  });

  async function reachHonest(nextHash: string) {
    const room = await foyer();
    render(<Room room={room} nextHash={nextHash} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
  }

  it('renders a continue link to the given nextHash once honest', async () => {
    await reachHonest('#/room/2');
    const link = screen.getByRole('link', { name: 'Leave this room' }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/room/2');
  });

  it('for the last room, the continue link leads to #/end', async () => {
    await reachHonest('#/end');
    const link = screen.getByRole('link', { name: 'Leave the manor' }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/end');
  });

  it('shows no continue link before the honest step', async () => {
    const room = await foyer();
    render(<Room room={room} nextHash="#/room/2" rng={identityRng} />);
    expect(screen.queryByRole('link', { name: /Leave/ })).toBeNull();
  });
});

describe('Room component — wrong-pick whisper', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('a single wrong pick fires the whisper exactly once in the one polite live region', async () => {
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    // Pick a wrong card.
    const wrong = await screen.findByRole('button', { name: 'Trick wording' });
    fireEvent.click(wrong);

    // Exactly one polite live region.
    const regions = screen.getAllByRole('status', { name: /Spell card feedback/i });
    expect(regions).toHaveLength(1);

    // The whisper appears once.
    const whisper = await screen.findByText(/it is the look that lies/i);
    expect(whisper).toBeDefined();
    expect(screen.getAllByText(/it is the look that lies/i)).toHaveLength(1);

    // All cards still selectable.
    for (const name of ['Visual interference', 'Trick wording', 'Nagging']) {
      const btn = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    }
  });

  it('a correct pick after a wrong one still reaches honest (no penalty)', async () => {
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nagging' }));
    fireEvent.click(screen.getByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
  });
});

describe('Room component — the Before/After comparison wipe', () => {
  let spy: ReturnType<typeof mockReducedMotion> | undefined;

  beforeEach(() => {
    __resetForTests();
    // Reduced motion on: the opening sweep is skipped, so the reveal rests at
    // 50 synchronously — a deterministic starting point for every assertion.
    spy = mockReducedMotion();
  });

  afterEach(() => {
    spy?.mockRestore();
  });

  async function reachHonest() {
    const room = await foyer();
    const view = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
    return view;
  }

  it('renders one comparison box, role=group, with both versions stacked', async () => {
    const { container } = await reachHonest();
    const box = screen.getByRole('group', { name: 'Haunted and honest versions' });
    expect(box).toBeDefined();
    // Both versions live inside the one box.
    expect(box.querySelector('.comparison-haunted')).not.toBeNull();
    expect(box.querySelector('.comparison-honest')).not.toBeNull();
    // Exactly one comparison box.
    expect(container.querySelectorAll('.comparison')).toHaveLength(1);
  });

  it('under reduced motion the slider starts at 50 and the honest layer carries --split: 50%', async () => {
    const { container } = await reachHonest();
    const slider = screen.getByRole('slider', {
      name: 'Before and After slider',
    }) as HTMLInputElement;
    expect(slider.value).toBe('50');
    const honest = container.querySelector('.comparison-honest') as HTMLElement;
    expect(honest.style.getPropertyValue('--split')).toBe('50%');
  });

  it('arrow keys move by 5, Page Up/Down by 25, Home/End to 0/100 (clamped)', async () => {
    const { container } = await reachHonest();
    const slider = screen.getByRole('slider', {
      name: 'Before and After slider',
    }) as HTMLInputElement;
    const split = () =>
      (container.querySelector('.comparison-honest') as HTMLElement).style.getPropertyValue(
        '--split',
      );

    expect(slider.value).toBe('50');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    await waitFor(() => expect(slider.value).toBe('55'));
    expect(split()).toBe('55%');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    await waitFor(() => expect(slider.value).toBe('50'));

    fireEvent.keyDown(slider, { key: 'PageUp' });
    await waitFor(() => expect(slider.value).toBe('75'));

    fireEvent.keyDown(slider, { key: 'PageDown' });
    fireEvent.keyDown(slider, { key: 'PageDown' });
    await waitFor(() => expect(slider.value).toBe('25'));

    fireEvent.keyDown(slider, { key: 'End' });
    await waitFor(() => expect(slider.value).toBe('100'));

    fireEvent.keyDown(slider, { key: 'Home' });
    await waitFor(() => expect(slider.value).toBe('0'));

    // Clamped: another ArrowLeft at 0 does not go negative.
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    await waitFor(() => expect(slider.value).toBe('0'));
  });

  it('focusing the honest twin task button snaps the reveal fully to honest (100)', async () => {
    const { container } = await reachHonest();
    const slider = screen.getByRole('slider', {
      name: 'Before and After slider',
    }) as HTMLInputElement;
    // Start it anywhere but 100.
    fireEvent.keyDown(slider, { key: 'Home' });
    await waitFor(() => expect(slider.value).toBe('0'));

    // The honest twin's task button lives inside the honest layer.
    const honest = container.querySelector('.comparison-honest') as HTMLElement;
    const taskButton = honest.querySelector('button') as HTMLButtonElement;
    fireEvent.focusIn(taskButton);

    await waitFor(() => expect(slider.value).toBe('100'));
    expect(honest.style.getPropertyValue('--split')).toBe('100%');
  });

  it('the one-click task completes the room (reaches done) at any slider value', async () => {
    await reachHonest();
    const slider = screen.getByRole('slider', {
      name: 'Before and After slider',
    }) as HTMLInputElement;
    // Move the reveal to a partial value; the task must still complete.
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    await waitFor(() => expect(slider.value).toBe('45'));

    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
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

    // Pick the correct card → named → auto advance → honest.
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

describe('Room component — Before/After slider', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('the slider moves with the arrow keys and with Home and End', async () => {
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));

    const slider = (await screen.findByRole('slider', {
      name: 'Before and After slider',
    })) as HTMLInputElement;

    // Starts fully haunted.
    expect(slider.value).toBe('0');

    fireEvent.keyDown(slider, { key: 'End' });
    await waitFor(() => expect(slider.value).toBe('100'));

    fireEvent.keyDown(slider, { key: 'Home' });
    await waitFor(() => expect(slider.value).toBe('0'));

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    await waitFor(() => expect(slider.value).toBe('1'));
  });
});

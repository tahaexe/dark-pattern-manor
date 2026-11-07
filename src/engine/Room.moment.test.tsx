import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import Room from './Room';
import { loadRoom } from './registry';
import { __resetForTests } from './progress';
import type { RoomData } from './types';

/** A deterministic card order: no shuffling. */
const identityRng = () => 0;

async function foyer(): Promise<RoomData> {
  return loadRoom('gravemoor-gazette');
}

/** The one `.room-scene` element the engine marks with the moment attribute. */
function scene(container: HTMLElement): HTMLElement {
  return container.querySelector('.room-scene') as HTMLElement;
}

describe('Room — the common moment attribute (P5)', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('has no moment while haunted/inspecting/picking before any wrong pick', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    expect(scene(container).hasAttribute('data-moment')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    expect(scene(container).getAttribute('data-moment')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    // Now picking, but no wrong pick yet → still no moment.
    await screen.findByRole('button', { name: 'Visual interference' });
    expect(scene(container).getAttribute('data-moment')).toBeNull();
  });

  it('a wrong pick sets data-moment="wrong" with a key; a second wrong pick changes the key', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    // First wrong pick.
    fireEvent.click(await screen.findByRole('button', { name: 'Trick wording' }));
    await waitFor(() => expect(scene(container).getAttribute('data-moment')).toBe('wrong'));
    const key1 = scene(container).getAttribute('data-moment-key');
    expect(key1).toBeTruthy();

    // Second wrong pick → the key changes so the CSS animation restarts.
    fireEvent.click(screen.getByRole('button', { name: 'Nagging' }));
    await waitFor(() => {
      const key2 = scene(container).getAttribute('data-moment-key');
      expect(scene(container).getAttribute('data-moment')).toBe('wrong');
      expect(key2).not.toBe(key1);
    });
  });

  it('the right card clears the wrong moment and leaves data-moment="right"', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    // A wrong pick first.
    fireEvent.click(await screen.findByRole('button', { name: 'Nagging' }));
    await waitFor(() => expect(scene(container).getAttribute('data-moment')).toBe('wrong'));

    // Then the correct card → named → honest.
    fireEvent.click(screen.getByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
    expect(scene(container).getAttribute('data-moment')).toBe('right');
  });
});

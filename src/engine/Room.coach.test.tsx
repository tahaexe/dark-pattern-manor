import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import Room from './Room';
import { loadRoom } from './registry';
import { __resetForTests, completeRoom, areTipsSkipped } from './progress';
import type { RoomData } from './types';

const identityRng = () => 0;

async function foyer(): Promise<RoomData> {
  return loadRoom('gravemoor-gazette');
}

/** A room with no coach field (room 2), to prove other rooms never coach. */
async function library(): Promise<RoomData> {
  return loadRoom('inkbone-books');
}

/**
 * jsdom has no layout: getBoundingClientRect returns zeros, so the coach mark
 * would never place and `.coach-mark` would not render. Stub it so the scene
 * and the coach targets report usable boxes, letting the mark place. The exact
 * geometry is checked in the walk (a real browser); here we test the gating,
 * the skip/persist rules and the announcement.
 */
function stubLayout() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Element,
  ) {
    if (this.classList.contains('room-scene')) {
      return { left: 0, top: 0, right: 600, bottom: 900, width: 600, height: 900 } as DOMRect;
    }
    // Any target (the possessed element, the cards, the comparison).
    return { left: 100, top: 200, right: 300, bottom: 244, width: 200, height: 44 } as DOMRect;
  });
}

describe('Room — first-minute coach marks (room 1 only)', () => {
  let layoutSpy: ReturnType<typeof stubLayout>;

  beforeEach(() => {
    __resetForTests();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    layoutSpy = stubLayout();
  });

  afterEach(() => {
    layoutSpy.mockRestore();
    __resetForTests();
  });

  it('shows the spot coach mark on entry (haunted), pointing at the possessed element', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} roomNum={1} rng={identityRng} />);
    await waitFor(() => {
      const mark = container.querySelector('.coach-mark');
      expect(mark).not.toBeNull();
      expect(mark!.getAttribute('data-step')).toBe('spot');
    });
    expect(container.querySelector('.coach-mark-body')!.textContent).toMatch(
      /This part is tricking you\. Tap it\./,
    );
  });

  it('moves to the name mark at picking, then the free mark once honest', async () => {
    const room = await foyer();
    const { container } = render(
      <Room room={room} roomNum={1} nextHash="#/room/2" rng={identityRng} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await waitFor(() => {
      const mark = container.querySelector('.coach-mark');
      expect(mark?.getAttribute('data-step')).toBe('name');
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await waitFor(() => {
      const mark = container.querySelector('.coach-mark');
      expect(mark?.getAttribute('data-step')).toBe('free');
    });
  });

  it('shows no coach mark in a room that has no coach field (room 2)', async () => {
    const room = await library();
    const { container } = render(<Room room={room} roomNum={2} rng={identityRng} />);
    // Give effects a chance to run.
    await waitFor(() => {
      expect(container.querySelector('.room-step')).not.toBeNull();
    });
    expect(container.querySelector('.coach-mark')).toBeNull();
  });

  it('shows no coach mark once room 1 is already completed on entry', async () => {
    completeRoom('gravemoor-gazette', 'inkbone-books');
    const room = await foyer();
    const { container } = render(<Room room={room} roomNum={1} rng={identityRng} />);
    await waitFor(() => {
      expect(container.querySelector('.room-step')).not.toBeNull();
    });
    expect(container.querySelector('.coach-mark')).toBeNull();
  });

  it('"Skip the tips" hides the marks and persists the choice', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} roomNum={1} rng={identityRng} />);
    await waitFor(() => expect(container.querySelector('.coach-mark')).not.toBeNull());
    fireEvent.click(container.querySelector('.coach-mark-skip')!);
    await waitFor(() => expect(container.querySelector('.coach-mark')).toBeNull());
    expect(areTipsSkipped()).toBe(true);
  });

  it('shows no coach mark when the tips were skipped before (re-entry)', async () => {
    const room = await foyer();
    // First visit: skip.
    const first = render(<Room room={room} roomNum={1} rng={identityRng} />);
    await waitFor(() => expect(first.container.querySelector('.coach-mark')).not.toBeNull());
    fireEvent.click(first.container.querySelector('.coach-mark-skip')!);
    first.unmount();
    // Second visit: no marks, because the choice is persisted.
    const second = render(<Room room={room} roomNum={1} rng={identityRng} />);
    await waitFor(() => expect(second.container.querySelector('.room-step')).not.toBeNull());
    expect(second.container.querySelector('.coach-mark')).toBeNull();
  });

  it('Escape hides the marks and persists the choice', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} roomNum={1} rng={identityRng} />);
    await waitFor(() => expect(container.querySelector('.coach-mark')).not.toBeNull());
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(container.querySelector('.coach-mark')).toBeNull());
    expect(areTipsSkipped()).toBe(true);
  });

  it('announces the current step coach text through the polite live region', async () => {
    const room = await foyer();
    render(<Room room={room} roomNum={1} rng={identityRng} />);
    const region = screen.getByRole('status', { name: /Spell card feedback/i });
    await waitFor(() => expect(region.textContent).toMatch(/This part is tricking you\. Tap it\./));
    // The coach line sits beside the step line in the same region.
    expect(region.textContent).toMatch(/Step 1 of 3/);
  });
});

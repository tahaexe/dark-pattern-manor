import { describe, it, expect } from 'vitest';
import { loadRoom, prefetch, rooms, roomSlugs, ROOM_NAMES, ROOM_COUNT } from './registry';

describe('registry prefetch', () => {
  it('prefetch and loadRoom resolve to the same RoomData object (one shared promise)', async () => {
    const slug = 'grimsupper';
    prefetch(slug);
    const a = await loadRoom(slug);
    const b = await loadRoom(slug);
    expect(a).toBe(b);
    expect(a.slug).toBe(slug);
  });

  it('prefetch is a no-op for an unknown or missing slug (never throws)', () => {
    expect(() => prefetch(undefined)).not.toThrow();
    expect(() => prefetch('not-a-room')).not.toThrow();
  });

  it('loadRoom rejects for an unknown slug', async () => {
    await expect(loadRoom('not-a-room')).rejects.toThrow(/Unknown room slug/);
  });

  it('there are fourteen room slugs and fourteen names, aligned', () => {
    expect(ROOM_COUNT).toBe(14);
    expect(roomSlugs()).toHaveLength(ROOM_COUNT);
    expect(ROOM_NAMES).toHaveLength(ROOM_COUNT);
    expect(Object.keys(rooms)).toHaveLength(ROOM_COUNT);
    expect(ROOM_NAMES[0]).toBe('The Foyer');
    expect(ROOM_NAMES[ROOM_COUNT - 1]).toBe('The Music Room');
  });
});

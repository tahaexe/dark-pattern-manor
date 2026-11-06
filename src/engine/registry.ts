import type { RoomData } from './types';

/**
 * The room manifest. Maps each room slug to a lazy loader so that no room's
 * data, components, or CSS is imported eagerly — each arrives through a
 * dynamic `import()` only when the player enters that room, keeping the
 * initial bundle to the engine and shared UI.
 */
export const rooms: Record<string, () => Promise<{ default: RoomData }>> = {
  'gravemoor-gazette': () => import('../rooms/gravemoor-gazette/room'),
  'inkbone-books': () => import('../rooms/inkbone-books/room'),
  grimsupper: () => import('../rooms/grimsupper/room'),
  gloamline: () => import('../rooms/gloamline/room'),
  hollowpost: () => import('../rooms/hollowpost/room'),
  shroudery: () => import('../rooms/shroudery/room'),
  // The other 6 rooms are added here as they are built, keyed by brand slug.
};

/** Every registered room slug. */
export function roomSlugs(): string[] {
  return Object.keys(rooms);
}

/** Load one room's data on demand by slug. */
export async function loadRoom(slug: string): Promise<RoomData> {
  const loader = rooms[slug];
  if (!loader) throw new Error(`Unknown room slug: ${slug}`);
  const mod = await loader();
  return mod.default;
}

/** Load every registered room's data (used by tests and the check script). */
export async function loadAllRooms(): Promise<RoomData[]> {
  return Promise.all(roomSlugs().map((slug) => loadRoom(slug)));
}

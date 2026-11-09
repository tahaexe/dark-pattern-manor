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
  lanternstay: () => import('../rooms/lanternstay/room'),
  mothmilk: () => import('../rooms/mothmilk/room'),
  mildew: () => import('../rooms/mildew/room'),
  wanderwick: () => import('../rooms/wanderwick/room'),
  rookery: () => import('../rooms/rookery/room'),
  bramblegate: () => import('../rooms/bramblegate/room'),
  'fogmarsh-finds': () => import('../rooms/fogmarsh-finds/room'),
  dirgewell: () => import('../rooms/dirgewell/room'),
};

/**
 * Room display names in product order, where index `i` is room number `i + 1`.
 * These are static strings (the same titles the ending's checklist shows), so
 * the title screen and the Rooms dialog can name a room without loading any
 * room chunk. The order matches `roomSlugs()`.
 */
export const ROOM_NAMES: readonly string[] = [
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
  'The Map Room',
  'The Music Room',
];

/**
 * The number of rooms in the manor, derived from the registry so adding a room
 * here is the only change the count needs. Every "how many rooms" decision —
 * the room route's upper bound, the ending's completion gate, the title's
 * "all done" state — reads this, never a hard-coded literal.
 */
export const ROOM_COUNT: number = Object.keys(rooms).length;

/**
 * One cached promise per slug, so a prefetch on reaching the honest step and
 * the App's own loader share a single dynamic import — the next room's chunk is
 * fetched once, and following the continue link resolves instantly.
 */
const memo: Record<string, Promise<RoomData>> = {};

function load(slug: string): Promise<RoomData> {
  return (memo[slug] ??= rooms[slug]().then((mod) => mod.default));
}

/** Every registered room slug. */
export function roomSlugs(): string[] {
  return Object.keys(rooms);
}

/**
 * Warm the next room's chunk early. A no-op for an unknown or missing slug, or
 * when the chunk is already in flight or loaded (the memo dedupes). Failures
 * are swallowed; the App's loader will retry and surface its own retry UI.
 */
export function prefetch(slug?: string): void {
  if (!slug || !rooms[slug]) return;
  void load(slug).catch(() => {
    // Drop the rejected promise so a later loadRoom can try again.
    delete memo[slug];
  });
}

/** Load one room's data on demand by slug, reusing any prefetched promise. */
export async function loadRoom(slug: string): Promise<RoomData> {
  if (!rooms[slug]) throw new Error(`Unknown room slug: ${slug}`);
  try {
    return await load(slug);
  } catch (err) {
    // Drop the rejected promise so a retry re-issues the import.
    delete memo[slug];
    throw err;
  }
}

/** Load every registered room's data (used by tests and the check script). */
export async function loadAllRooms(): Promise<RoomData[]> {
  return Promise.all(roomSlugs().map((slug) => loadRoom(slug)));
}

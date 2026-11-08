/**
 * Progress store. The only persisted state, kept in a single localStorage key
 * on the player's device: no cookies, no network, no timer, no score, no
 * strike counter, and no reset mechanism. Monotonic: `completeRoom` only ever
 * adds to `completed`/`unlocked`, so the done count never decreases, and
 * `skipTips` only ever turns the tips flag on. Degrades to an in-memory
 * fallback when localStorage is unavailable, so the game never dead-ends.
 */

export interface Progress {
  completed: string[];
  unlocked: string[];
  /**
   * First-minute tutorial: once true, room 1's coach marks are hidden for good.
   * Set by `skipTips` (the "Skip the tips" link or Escape on a coach mark).
   */
  tipsSkipped?: boolean;
}

const KEY = 'dpm:progress';

/** In-memory fallback used when localStorage throws or is absent. */
let memory: Progress = { completed: [], unlocked: [] };

function storage(): Storage | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    // Probe: some environments expose localStorage but throw on access.
    const probe = '__dpm_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

function read(): Progress {
  const ls = storage();
  if (!ls) {
    return {
      completed: [...memory.completed],
      unlocked: [...memory.unlocked],
      tipsSkipped: memory.tipsSkipped === true,
    };
  }
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return { completed: [], unlocked: [], tipsSkipped: false };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed.slice() : [],
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked.slice() : [],
      tipsSkipped: parsed.tipsSkipped === true,
    };
  } catch {
    return { completed: [], unlocked: [], tipsSkipped: false };
  }
}

function write(p: Progress): void {
  memory = {
    completed: [...p.completed],
    unlocked: [...p.unlocked],
    tipsSkipped: p.tipsSkipped === true,
  };
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Keep the in-memory copy; never throw into the render path.
  }
}

/** Current progress. */
export function loadProgress(): Progress {
  return read();
}

/**
 * Mark a room complete and, if given, unlock the next. Monotonic: adds only,
 * never removes, so the done count cannot decrease. Completing the same room
 * twice is a no-op on the count. Leaves the tips flag unchanged.
 */
export function completeRoom(slug: string, nextSlug?: string): Progress {
  const p = read();
  const completed = p.completed.includes(slug) ? p.completed : [...p.completed, slug];
  let unlocked = p.unlocked;
  if (nextSlug && !unlocked.includes(nextSlug)) {
    unlocked = [...unlocked, nextSlug];
  }
  const next: Progress = { completed, unlocked, tipsSkipped: p.tipsSkipped === true };
  write(next);
  return next;
}

/** The number of completed rooms. */
export function doneCount(): number {
  return read().completed.length;
}

/** True once the player has skipped the first-minute coach marks. */
export function areTipsSkipped(): boolean {
  return read().tipsSkipped === true;
}

/**
 * Hide room 1's coach marks for good. Monotonic (only ever turns on) and leaves
 * `completed`/`unlocked` untouched. Degrades to the in-memory fallback like the
 * rest of the store.
 */
export function skipTips(): void {
  const p = read();
  if (p.tipsSkipped === true) return;
  write({ ...p, tipsSkipped: true });
}

/** Test-only: reset both the persisted and in-memory stores. */
export function __resetForTests(): void {
  memory = { completed: [], unlocked: [] };
  const ls = storage();
  if (ls) {
    try {
      ls.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

// Pure room-range parser for the walk_rooms and contrast_scan tools.
//
// Accepts a range ("1-12"), a single number ("3"), a list ("1,4,7") and any
// comma-separated mix of those. Returns a sorted, de-duplicated array of
// integers clamped to [min, max]. Throws a clear Error on a non-numeric or
// reversed token so a caller's typo is reported, not silently dropped.

/**
 * @param {string} spec
 * @param {{ min?: number, max?: number }} [opts]
 * @returns {number[]}
 */
export function parseRooms(spec, { min = 1, max = 12 } = {}) {
  if (typeof spec !== 'string') {
    throw new Error('rooms must be a string like "1-12", "3" or "1,4,7"');
  }
  const text = spec.trim();
  if (text === '') {
    throw new Error('rooms is empty');
  }

  const out = new Set();

  for (const rawPart of text.split(',')) {
    const part = rawPart.trim();
    if (part === '') continue;

    if (part.includes('-')) {
      const bits = part.split('-');
      if (bits.length !== 2) {
        throw new Error(`bad range "${part}"`);
      }
      const a = toInt(bits[0], part);
      const b = toInt(bits[1], part);
      if (b < a) {
        throw new Error(`reversed range "${part}" (start after end)`);
      }
      for (let n = a; n <= b; n++) addInRange(out, n, min, max);
    } else {
      addInRange(out, toInt(part, part), min, max);
    }
  }

  if (out.size === 0) {
    throw new Error(`no rooms in "${spec}" within ${min}-${max}`);
  }

  return [...out].sort((x, y) => x - y);
}

function toInt(token, context) {
  const t = token.trim();
  if (!/^\d+$/.test(t)) {
    throw new Error(`"${t}" in "${context}" is not a whole number`);
  }
  return Number.parseInt(t, 10);
}

function addInRange(set, n, min, max) {
  if (n >= min && n <= max) set.add(n);
}

/**
 * Whether room `n` is on the page after a navigation, from a snapshot of the
 * page the walk reads in the browser. 'ready' once the hash names room `n`,
 * the loading placeholder is gone and the task bar shows a lantern and a title
 * other than the previous room's (the old room can stay rendered for a moment
 * under the new hash); 'error' when the app shows its load-error panel;
 * otherwise 'waiting'. The walk polls this instead of a fixed pause, since the
 * room's chunk arrives by dynamic import() and a busy machine can take longer
 * than any fixed sleep (the room-12-at-412 finding, 7 Nov).
 *
 * @param {{ hash?: string, loading?: boolean, error?: boolean, title?: string | null, lantern?: boolean } | null | undefined} state
 * @param {number} n
 * @param {string} prevTitle the task-bar title before the navigation ('' if none)
 * @returns {'ready' | 'error' | 'waiting'}
 */
export function roomReadiness(state, n, prevTitle) {
  if (!state || typeof state !== 'object') return 'waiting';
  if (state.error) return 'error';
  if (state.hash !== `#/room/${n}`) return 'waiting';
  if (state.loading || !state.lantern) return 'waiting';
  const title = typeof state.title === 'string' ? state.title.trim() : '';
  if (title === '') return 'waiting';
  if (prevTitle && title === prevTitle.trim()) return 'waiting';
  return 'ready';
}

// Room-checks hook for Dark Pattern Manor.
//
// Runs as a PostToolUse hook on the file-writing tool. When the agent writes a
// file under src/rooms/, this runs the same room-data validation as
// `npm run check:rooms` (every room has an honest variant, exactly three spell
// cards with one correct, a possessed element, and the Ghost Guide's sources
// on the allowlist) by spawning `node scripts/check-rooms.mjs`. It relays that
// script's per-room lines ("room N ok" or what failed) and exits with its exit
// code so the agent sees a non-zero exit on failure. It stays fast (one
// validation pass, no test suite) and uses Node built-ins only.

import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Decide whether a written path is a room source file, i.e. lives under
 * src/rooms/. Accepts absolute or relative paths and both slash styles.
 * @param {unknown} path
 * @returns {boolean}
 */
export function isRoomFile(path) {
  if (typeof path !== 'string' || path.trim() === '') return false;
  // Normalize Windows backslashes to forward slashes, then look for a
  // src/rooms/ segment with something after it.
  const normalized = path.replace(/\\/g, '/');
  return /(?:^|\/)src\/rooms\/.+/.test(normalized);
}

/**
 * Recursively search a decoded hook-input object for the written file path.
 * The file-writing tool nests its target path under a field named `path`,
 * `file_path`, `filePath`, `targetFile` or `target_file`; we return the first
 * string we find.
 * @param {*} obj
 * @returns {string | null}
 */
export function findWrittenPath(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') return null;
  const KEYS = ['path', 'file_path', 'filePath', 'targetFile', 'target_file'];
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findWrittenPath(item);
      if (found !== null) return found;
    }
    return null;
  }
  for (const key of KEYS) {
    if (typeof obj[key] === 'string' && obj[key].trim() !== '') return obj[key];
  }
  for (const key of Object.keys(obj)) {
    const found = findWrittenPath(obj[key]);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Format the summary the hook prints for a non-room write (nothing to do).
 * @param {string | null} path
 * @returns {string}
 */
export function formatSkip(path) {
  return path
    ? `room-checks: ${path} is not under src/rooms/ — skipped`
    : 'room-checks: no written path found — skipped';
}

/**
 * Read stdin with a timeout.
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      resolve(data);
    }, timeoutMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Run the stdin logic only when executed directly.
const isMain =
  resolvePath(process.argv[1] || '') === resolvePath(fileURLToPath(import.meta.url));

if (isMain) {
  void (async () => {
    const input = await readStdin(2000);
    let path = null;
    try {
      path = findWrittenPath(JSON.parse(input));
    } catch {
      // Invalid or empty JSON — treat as no path.
    }

    if (!isRoomFile(path)) {
      // Not a room file: nothing to check. Succeed quietly.
      console.log(formatSkip(path));
      process.exit(0);
    }

    // Run the same validation as `npm run check:rooms`, kept to a single pass
    // (no test suite) so the hook stays fast. This command is on the
    // command-guard allow-list, so the agent can run it unblocked.
    const result = spawnSync('node', ['scripts/check-rooms.mjs'], {
      stdio: 'inherit',
      timeout: 10000,
    });

    if (result.error) {
      console.error(`room-checks: failed to run check:rooms — ${result.error.message}`);
      process.exit(1);
    }
    process.exit(result.status === null ? 1 : result.status);
  })();
}

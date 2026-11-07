// The check_rooms tool: run the same validation as `npm run check:rooms` by
// shelling `node scripts/check-rooms.mjs` from the repository root, and return
// its combined per-room and overall output. No machine path is written into
// the output; the repo root is derived from this module's own URL at runtime.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// scripts/mcp -> repository root is two levels up.
export const REPO_ROOT = resolve(HERE, '..', '..');

/**
 * Run the room-data checks and return the text output (stdout + stderr merged
 * in arrival order), with a trailing overall line stating pass or fail.
 * @returns {Promise<string>}
 */
export function runCheckRooms() {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ['scripts/check-rooms.mjs'], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      out += d.toString();
    });

    child.on('error', (err) => {
      resolvePromise(`check_rooms could not start: ${err.message}`);
    });

    child.on('close', (code) => {
      const result = code === 0 ? 'check_rooms OK' : `check_rooms FAILED (exit ${code})`;
      resolvePromise(`${out.trimEnd()}\n${result}`);
    });
  });
}

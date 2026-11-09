// The Ghost Lantern bundle gate.
//
// Asserts that the built bookmarklet bundle `dist/lantern.js`:
//   - exists,
//   - is at most 30 KB minified,
//   - contains none of the network/storage escape hatches (so the four
//     promises hold: local only, nothing sent, no storage),
//   - and that the bookmarklet string (`javascript:` + encoded bundle) stays
//     under 64,000 characters.
//
// Run after `npm run build`:
//   npm run build
//   npm run check:lantern

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** The bundle size limit, in bytes (30 KB minified). */
export const SIZE_LIMIT_BYTES = 30 * 1024;

/** The bookmarklet-length limit, in characters. */
export const BOOKMARKLET_LIMIT = 64000;

/**
 * The tokens the bundle must never contain (Requirement 1.5). The whole lantern
 * runs locally and stores nothing, so none of these appear in the built code.
 */
export const FORBIDDEN_TOKENS = [
  'fetch',
  'XMLHttpRequest',
  'sendBeacon',
  'WebSocket',
  'EventSource',
  'window.open',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document.cookie',
];

/** Which forbidden tokens appear in a bundle's source. */
export function forbiddenTokensIn(source) {
  return FORBIDDEN_TOKENS.filter((t) => source.includes(t));
}

/** The bookmarklet string for a bundle's source. */
export function bookmarkletFor(source) {
  return 'javascript:' + encodeURIComponent(source);
}

/**
 * Run the gate's pure checks over a bundle's source and byte length.
 * @param {string} source the bundle text
 * @param {number} sizeBytes the bundle's size in bytes
 * @returns {{ ok: boolean, problems: string[], sizeBytes: number, bookmarkletLength: number }}
 */
export function checkBundle(source, sizeBytes) {
  const problems = [];
  if (sizeBytes > SIZE_LIMIT_BYTES) {
    problems.push(
      `bundle is ${(sizeBytes / 1024).toFixed(1)} KB, over the ${SIZE_LIMIT_BYTES / 1024} KB limit`,
    );
  }
  const tokens = forbiddenTokensIn(source);
  if (tokens.length) {
    problems.push(`bundle contains forbidden token(s): ${tokens.join(', ')}`);
  }
  const bookmarklet = bookmarkletFor(source);
  if (bookmarklet.length >= BOOKMARKLET_LIMIT) {
    problems.push(
      `bookmarklet is ${bookmarklet.length} chars, at or over the ${BOOKMARKLET_LIMIT} limit`,
    );
  }
  return { ok: problems.length === 0, problems, sizeBytes, bookmarkletLength: bookmarklet.length };
}

function main() {
  const file = join(process.cwd(), 'dist', 'lantern.js');
  if (!existsSync(file)) {
    console.error('check:lantern FAILED — dist/lantern.js not found. Run `npm run build` first.');
    process.exit(1);
  }
  const source = readFileSync(file, 'utf8');
  const sizeBytes = Buffer.byteLength(source, 'utf8');
  const { ok, problems, bookmarkletLength } = checkBundle(source, sizeBytes);

  console.log(`dist/lantern.js: ${(sizeBytes / 1024).toFixed(1)} KB minified`);
  console.log(`bookmarklet length: ${bookmarkletLength} chars (limit ${BOOKMARKLET_LIMIT})`);
  console.log(`forbidden tokens: ${forbiddenTokensIn(source).join(', ') || 'none'}`);

  if (!ok) {
    for (const p of problems) console.error(`check:lantern FAILED — ${p}`);
    process.exit(1);
  }
  console.log('check:lantern OK — bundle is small, local-only, and the bookmarklet fits.');
}

if (process.argv[1] && process.argv[1].endsWith('check-lantern.mjs')) {
  main();
}

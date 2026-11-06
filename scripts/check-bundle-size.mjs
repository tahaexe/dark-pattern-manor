// Initial-bundle size gate for Dark Pattern Manor.
//
// Reads the Vite build manifest, collects the entry chunk and its static
// imports (the engine and shared UI — no room chunks, which are reached only
// through dynamic import), sums their gzip-compressed size, and fails the
// build if the total exceeds 100 KB. Run after `npm run build`:
//
//   npm run build
//   npm run check:size

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

export const LIMIT_BYTES = 100 * 1024; // 100 KB compressed

/**
 * Walk the manifest from the entry chunk through its static `imports` only
 * (never `dynamicImports`), returning the unique set of emitted files that
 * make up the initial bundle.
 * @param {Record<string, any>} manifest
 * @returns {string[]} emitted file paths relative to the build outDir
 */
export function initialBundleFiles(manifest) {
  // The entry is the chunk flagged isEntry.
  const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
  if (!entryKey) throw new Error('no entry chunk found in manifest');

  const files = new Set();
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    if (chunk.file) files.add(chunk.file);
    for (const css of chunk.css ?? []) files.add(css);
    for (const imp of chunk.imports ?? []) visit(imp); // static imports only
  };
  visit(entryKey);
  return [...files];
}

/**
 * Sum the gzip size of a list of files, reading each through `readBytes`.
 * @param {string[]} files
 * @param {(file: string) => Buffer} readBytes
 * @returns {number} total gzip-compressed bytes
 */
export function sumGzipSize(files, readBytes) {
  let total = 0;
  for (const file of files) {
    const bytes = readBytes(file);
    total += gzipSync(bytes).length;
  }
  return total;
}

function findManifest(distDir) {
  const candidates = [
    join(distDir, '.vite', 'manifest.json'),
    join(distDir, 'manifest.json'),
  ];
  return candidates.find((p) => existsSync(p));
}

function main() {
  const distDir = join(process.cwd(), 'dist');
  const manifestPath = findManifest(distDir);
  if (!manifestPath) {
    console.error(
      'check:size FAILED — no Vite manifest found in dist/. Run `npm run build` first (build.manifest must be enabled).',
    );
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const files = initialBundleFiles(manifest);
  const total = sumGzipSize(files, (file) => readFileSync(join(distDir, file)));

  const kb = (n) => (n / 1024).toFixed(1);
  console.log(`Initial bundle files (${files.length}):`);
  for (const f of files) {
    const size = statSync(join(distDir, f)).size;
    console.log(`  ${f}  (${kb(size)} KB raw)`);
  }
  console.log(`Initial bundle gzip total: ${kb(total)} KB`);
  console.log(`Limit: ${kb(LIMIT_BYTES)} KB`);

  if (total > LIMIT_BYTES) {
    console.error(
      `check:size FAILED — initial bundle is ${kb(total)} KB gzip, over the ${kb(LIMIT_BYTES)} KB limit.`,
    );
    process.exit(1);
  }
  console.log(`check:size OK — ${kb(total)} KB <= ${kb(LIMIT_BYTES)} KB.`);
}

// Run only when executed directly, so the helpers can be unit-tested.
if (process.argv[1] && process.argv[1].endsWith('check-bundle-size.mjs')) {
  main();
}

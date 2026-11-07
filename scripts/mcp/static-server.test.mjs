// Tests for the static server's pure path mapping and a live fetch round-trip.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mapUrlToFile, contentTypeFor, BASE_PATH, start } from './static-server.mjs';

const BASE = BASE_PATH; // '/dark-pattern-manor/'

/** A temp dist/ with an index.html and one asset. */
function makeDist() {
  const dir = mkdtempSync(join(tmpdir(), 'manor-dist-'));
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>t</title>');
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log(1)');
  return dir;
}

test('the base root maps to index.html', () => {
  const dist = makeDist();
  try {
    const m = mapUrlToFile(BASE, { distDir: dist });
    assert.ok(m.filePath.endsWith('index.html'));
    const m2 = mapUrlToFile('/', { distDir: dist });
    assert.ok(m2.filePath.endsWith('index.html'));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('a real asset path maps to its file', () => {
  const dist = makeDist();
  try {
    const m = mapUrlToFile(BASE + 'assets/app.js', { distDir: dist });
    assert.ok(m.filePath.endsWith(join('assets', 'app.js')));
    assert.ok(!('outside' in m));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('an unknown extension-less route under the base falls back to index.html (SPA)', () => {
  const dist = makeDist();
  try {
    const m = mapUrlToFile(BASE + 'room/3', { distDir: dist });
    assert.equal(m.spaFallback, true);
    assert.ok(m.filePath.endsWith('index.html'));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('a path off the base is refused (outside)', () => {
  const dist = makeDist();
  try {
    const m = mapUrlToFile('/etc/passwd', { distDir: dist });
    assert.equal(m.outside, true);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('a .. traversal under the base is refused (outside)', () => {
  const dist = makeDist();
  try {
    const m = mapUrlToFile(BASE + '../../secret', { distDir: dist });
    assert.equal(m.outside, true);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('content types cover the build assets', () => {
  assert.match(contentTypeFor('x.js'), /javascript/);
  assert.match(contentTypeFor('x.css'), /css/);
  assert.match(contentTypeFor('x.html'), /html/);
  assert.match(contentTypeFor('x.webp'), /webp/);
  assert.match(contentTypeFor('x.woff2'), /woff2/);
  assert.match(contentTypeFor('x.svg'), /svg/);
});

test('live: the server serves a file, the SPA fallback, and refuses traversal', async () => {
  const dist = makeDist();
  const server = await start({ distDir: dist });
  try {
    const index = await fetch(server.baseUrl);
    assert.equal(index.status, 200);
    assert.match(index.headers.get('content-type') || '', /html/);

    const js = await fetch(server.baseUrl + 'assets/app.js');
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type') || '', /javascript/);

    const spa = await fetch(server.baseUrl + 'room/5');
    assert.equal(spa.status, 200);
    assert.match(spa.headers.get('content-type') || '', /html/);

    const off = await fetch(server.origin + '/etc/passwd');
    assert.equal(off.status, 403);
  } finally {
    await server.close();
    rmSync(dist, { recursive: true, force: true });
  }
});

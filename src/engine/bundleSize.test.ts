import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';
// The size gate helpers live in scripts/ so the CI gate can import them
// without the app bundle; this test exercises the pure helpers.
import { initialBundleFiles, sumGzipSize, LIMIT_BYTES } from '../../scripts/check-bundle-size.mjs';

describe('bundle-size gate helpers', () => {
  it('collects the entry chunk and its static imports, not dynamic imports', () => {
    const manifest = {
      'src/main.tsx': {
        file: 'assets/main.js',
        isEntry: true,
        css: ['assets/main.css'],
        imports: ['_engine.js'],
        dynamicImports: ['_room-gravemoor.js'],
      },
      '_engine.js': { file: 'assets/engine.js', imports: [] },
      '_room-gravemoor.js': { file: 'assets/room-gravemoor.js', imports: [] },
    };
    const files = initialBundleFiles(manifest);
    expect(files).toContain('assets/main.js');
    expect(files).toContain('assets/main.css');
    expect(files).toContain('assets/engine.js');
    // The dynamically-imported room chunk is NOT counted.
    expect(files).not.toContain('assets/room-gravemoor.js');
  });

  it('throws when there is no entry chunk', () => {
    expect(() => initialBundleFiles({ a: { file: 'a.js' } })).toThrow(/entry/);
  });

  it('sums the gzip size of the given files', () => {
    const contents: Record<string, Buffer> = {
      'a.js': Buffer.from('a'.repeat(1000)),
      'b.js': Buffer.from('b'.repeat(2000)),
    };
    const expected =
      gzipSync(contents['a.js']).length + gzipSync(contents['b.js']).length;
    const total = sumGzipSize(['a.js', 'b.js'], (f) => contents[f]);
    expect(total).toBe(expected);
  });

  it('a manifest whose bundle is under the limit passes; one over fails', () => {
    const small = sumGzipSize(['x'], () => Buffer.from('tiny'));
    expect(small).toBeLessThanOrEqual(LIMIT_BYTES);

    // High-entropy content gzip cannot shrink, so the gzip total exceeds 100 KB.
    const big = randomBytes(200 * 1024);
    const bigTotal = sumGzipSize(['big'], () => big);
    expect(bigTotal).toBeGreaterThan(LIMIT_BYTES);
  });
});

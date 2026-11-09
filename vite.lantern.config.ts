import { defineConfig } from 'vite';

/**
 * A second, separate build that produces the Ghost Lantern bookmarklet bundle
 * `dist/lantern.js`: one minified IIFE with no imports left, so the whole
 * program lives in the bookmarklet and loads nothing from anywhere. It is never
 * imported by the app entry (`src/main.tsx`), so the app's initial bundle does
 * not grow by the lantern's size.
 *
 *   npx vite build --config vite.lantern.config.ts
 */
export default defineConfig({
  // No base path: the bundle runs on any page, not under the app's base.
  build: {
    outDir: 'dist',
    // Keep the app build already in dist/ (this runs after `vite build`).
    emptyOutDir: false,
    minify: 'esbuild',
    target: 'es2020',
    lib: {
      entry: 'src/lantern/main.ts',
      formats: ['iife'],
      name: 'GhostLantern',
      fileName: () => 'lantern.js',
    },
    rollupOptions: {
      output: {
        // One self-contained file; inline every chunk so no import remains.
        inlineDynamicImports: true,
        entryFileNames: 'lantern.js',
      },
    },
  },
});

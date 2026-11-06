import { defineConfig } from 'vite';
import preactPlugin from '@preact/preset-vite';

export default defineConfig({
  plugins: [preactPlugin()],
  base: '/dark-pattern-manor/',
  build: {
    // Emit .vite/manifest.json so the bundle-size gate can walk the entry
    // chunk and its static imports (room chunks stay dynamic, uncounted).
    manifest: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['node_modules/**', 'dist/**', 'scripts/**'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});

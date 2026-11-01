import { defineConfig } from 'vite';
import preactPlugin from '@preact/preset-vite';

export default defineConfig({
  plugins: [preactPlugin()],
  base: '/dark-pattern-manor/',
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['node_modules/**', 'dist/**', 'scripts/**'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});

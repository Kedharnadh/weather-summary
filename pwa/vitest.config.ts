import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Transform JSX/TSX in tests without pulling the React plugin (and its
  // second copy of Vite's types) into the Vitest config.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

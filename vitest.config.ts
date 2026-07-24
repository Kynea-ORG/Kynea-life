import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Pure-function unit tests under lib/ run in 'node'. Component tests under
// app/ and components/ opt into jsdom per-file via a `@vitest-environment
// jsdom` docblock, since they're the exception rather than the rule here.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.tsx', 'components/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
});

import { defineConfig } from 'vitest/config';

// Minimal Vitest config scoped to pure-function unit tests under lib/.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});

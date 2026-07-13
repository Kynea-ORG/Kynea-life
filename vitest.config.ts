import { defineConfig } from 'vitest/config';

// Minimal Vitest config scoped to lib/classes/*.ts pure functions
// (validation.ts, imageValidation.ts, publishGuard.ts land in later PRs).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/classes/**/*.test.ts'],
  },
});

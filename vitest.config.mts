import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
      thresholds: { lines: 90, functions: 90, branches: 80 },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

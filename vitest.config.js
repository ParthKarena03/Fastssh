import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',  // Changed from 'c8' to 'v8'
      reporter: ['text', 'json', 'html'],
    },
  },
});
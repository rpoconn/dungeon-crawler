import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { port: 5173, open: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

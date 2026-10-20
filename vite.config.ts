import { defineConfig } from 'vitest/config';

// Minimal Node typing for this file only; @types/node would leak Node globals into src/.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  // In Docker, bind to 0.0.0.0 so the host can reach it, don't try to open a browser,
  // and poll for changes since file events don't cross Docker Desktop bind mounts.
  server: {
    port: 5173,
    host: true,
    open: !process.env.DOCKER,
    watch: { usePolling: Boolean(process.env.DOCKER) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

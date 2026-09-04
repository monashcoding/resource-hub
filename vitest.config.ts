import { defineConfig } from 'vitest/config';

// Explicit config so Vitest does not auto-discover web/vite.config.ts as a second
// project and run the server tests twice.
//
// Every test here is a PURE unit test: no database, no HTTP server, no browser.
// That is a deliberate limit — the things worth pinning down in this codebase
// (visibility rules, ordering maths, input normalisation, search) are all pure
// functions, and a suite that needs no setup is a suite people actually run.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'web/src/**/*.test.ts'],
    environment: 'node',
  },
});

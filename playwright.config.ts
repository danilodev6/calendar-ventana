import { defineConfig } from "@playwright/test";

import { testDatabaseUrl } from "./e2e/test-database";

// Playwright runs from the project root, which doubles as the base for the
// throwaway database path. Plain process.cwd() keeps this file loadable as
// CommonJS (the package has no "type": "module").
const rootDir = process.cwd();
const port = 3100;

// Critical-flow smoke tests against the production build (`npm run build`
// first) with an isolated database. Trace and screenshots are captured only
// on failure to keep the suite fast and quiet.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60000,
  outputDir: "./test-results",
  globalSetup: "./e2e/global-setup",
  globalTeardown: "./e2e/global-teardown",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Standalone output ignores `next start`; boot it through the wrapper,
    // which also completes it with static assets when needed.
    command: "node scripts/serve-standalone.mjs",
    port,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: testDatabaseUrl(rootDir),
    } as Record<string, string>,
    timeout: 120000,
  },
});

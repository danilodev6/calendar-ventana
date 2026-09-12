import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import { testDatabaseFile, testDatabaseUrl } from "./test-database";

// Wipes and migrates a throwaway database before the suite. Runs before the
// web server starts, so the server always boots against an isolated file.
// process.cwd() keeps this file loadable without ESM (see playwright.config).
async function globalSetup(): Promise<void> {
  const rootDir = process.cwd();
  const databaseFile = testDatabaseFile(rootDir);
  rmSync(join(rootDir, "e2e", ".test-db"), { recursive: true, force: true });
  mkdirSync(dirname(databaseFile), { recursive: true });
  // npx resolves through npx.cmd on Windows without shell-specific syntax.
  const packageRunner = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(packageRunner, ["prisma", "migrate", "deploy"], {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl(rootDir) },
    stdio: "pipe",
    timeout: 180000,
  });
}

export default globalSetup;

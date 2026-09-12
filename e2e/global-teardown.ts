import { rmSync } from "node:fs";
import { join } from "node:path";

// Removes the throwaway database after the suite, successful or not.
// process.cwd() keeps this file loadable without ESM (see playwright.config).
async function globalTeardown(): Promise<void> {
  const rootDir = process.cwd();
  rmSync(join(rootDir, "e2e", ".test-db"), { recursive: true, force: true });
}

export default globalTeardown;

import { sep } from "node:path";

// Shared location of the throwaway E2E database. The file lives outside
// data/ and is wiped by the global setup before every run, so the real
// database is never at risk.
export function testDatabaseFile(rootDir: string): string {
  return [rootDir, "e2e", ".test-db", "e2e.db"].join(sep);
}

export function testDatabaseUrl(rootDir: string): string {
  return `file:${testDatabaseFile(rootDir).split(sep).join("/")}`;
}

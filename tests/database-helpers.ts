import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PrismaClient } from "@/generated/prisma/client";
import { toDatabaseFileUrl } from "@/lib/paths";
import { createDatabaseClient, disconnectDatabase } from "@/server/db";

const MIGRATION_TIMEOUT_MS = 120000;

// Spins up a fully migrated database inside a unique temporary directory.
// Suites use this instead of the real data directory, so production data is
// never at risk during tests.
export interface IsolatedDatabase {
  client: PrismaClient;
  directory: string;
  databaseFileUrl: string;
  cleanup: () => Promise<void>;
}

export async function createIsolatedDatabase(): Promise<IsolatedDatabase> {
  const directory = mkdtempSync(join(tmpdir(), "reservas-casa-test-"));
  const databaseFileUrl = toDatabaseFileUrl(join(directory, "test.db"));
  applyMigrations(databaseFileUrl);
  const client = createDatabaseClient(databaseFileUrl);
  return {
    client,
    directory,
    databaseFileUrl,
    cleanup: async () => {
      await disconnectDatabase(client);
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

// Applies all Prisma migrations to the given database file URL. Shared by
// suites that manage their own temporary directories (e.g. backup tests).
export function applyMigrations(databaseFileUrl: string): void {
  // npx resolves through npx.cmd on Windows without shell-specific syntax.
  const packageRunner = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(packageRunner, ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseFileUrl },
    stdio: "pipe",
    timeout: MIGRATION_TIMEOUT_MS,
  });
}

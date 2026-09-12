import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseFileUrl } from "@/lib/paths";

// Server-only database access. This module opens a direct SQLite connection,
// so it must never be imported from client components. UI code reaches it
// through Server Actions and Route Handlers (added in later phases).

// Creates an isolated client for any database file. Tests use this factory
// with a temporary file; application code uses the shared singleton below.
export function createDatabaseClient(
  databaseFileUrl: string = resolveDatabaseFileUrl(),
): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: databaseFileUrl });
  return new PrismaClient({ adapter });
}

interface GlobalWithDatabaseClient {
  databaseClient?: PrismaClient;
}

const globalForDatabase = globalThis as unknown as GlobalWithDatabaseClient;

// Reused across hot reloads in development so a single process keeps a
// single connection pool.
export const db: PrismaClient =
  globalForDatabase.databaseClient ?? createDatabaseClient();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.databaseClient = db;
}

// Releases the underlying connection. Scripts and tests call this during
// teardown so the process exits cleanly and temporary files can be removed.
export async function disconnectDatabase(
  client: PrismaClient = db,
): Promise<void> {
  await client.$disconnect();
}

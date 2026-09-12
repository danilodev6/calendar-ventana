import { resolve, sep } from "node:path";

// Centralized filesystem locations. Paths are built with node:path, never by
// concatenating separators by hand, and no user directory is hardcoded: every
// location resolves from an explicit base directory or an opt-in override.

// Base directory for the real database and backups. Tests always pass an
// isolated temporary directory instead of touching this location.
export function resolveDataDir(baseDir: string = process.cwd()): string {
  const override = process.env.RESERVATIONS_DATA_DIR;
  if (override !== undefined && override.trim() !== "") {
    return override;
  }
  return resolve(baseDir, "data");
}

// Directory for verified snapshots. It always sits next to the data
// directory so backups stay on the same filesystem (atomic renames) unless
// tests point elsewhere.
export function resolveBackupsDir(baseDir: string = process.cwd()): string {
  return resolve(resolveDataDir(baseDir), "..", "backups");
}

// Converts an absolute file path to a Prisma-compatible file: URL.
// Forward slashes keep the URL valid on Windows and macOS alike.
export function toDatabaseFileUrl(databaseFilePath: string): string {
  const normalized = databaseFilePath.split(sep).join("/");
  return normalized.startsWith("file:") ? normalized : `file:${normalized}`;
}

// Connection URL for the application database. DATABASE_URL wins when set
// (documented in .env.example); otherwise the local data directory is used.
export function resolveDatabaseFileUrl(
  baseDir: string = process.cwd(),
): string {
  const override = process.env.DATABASE_URL;
  if (override !== undefined && override.trim() !== "") {
    return override;
  }
  return toDatabaseFileUrl(resolve(resolveDataDir(baseDir), "app.db"));
}

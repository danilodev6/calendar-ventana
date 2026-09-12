import Database from "better-sqlite3";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

import { addCivilDays, todayInTimeZone } from "@/domain/dates";
import {
  resolveBackupsDir,
  resolveDataDir,
} from "@/lib/paths";

// Verified SQLite snapshots. The copy is taken with SQLite's Online Backup
// API straight from the live file, so it stays consistent without stopping
// the server and without ever copy-pasting a live database file (which would
// risk corruption, especially with WAL state). A snapshot is published only
// after passing PRAGMA integrity_check, via an atomic rename inside the
// backups directory.

export const SNAPSHOT_START = "start";
export const SNAPSHOT_SHUTDOWN = "shutdown";
export type SnapshotKind = "start" | "shutdown";

const SNAPSHOT_PATTERN =
  /^reservas-(\d{4}-\d{2}-\d{2})-(start|shutdown)\.db$/;
const TEMP_SUFFIX = ".tmp";

// Snapshots kept per kind: one start and one shutdown per day, last 30 days.
export const SNAPSHOT_RETENTION_DAYS = 30;

export interface SnapshotOptions {
  dataDir?: string;
  backupsDir?: string;
  // Home civil day ("YYYY-MM-DD") naming the snapshot. Defaults to today and
  // is injectable for deterministic tests.
  today?: string;
}

export interface SnapshotResult {
  ok: boolean;
  kind: SnapshotKind;
  // Final published path, or null when nothing was published.
  path: string | null;
  reusedExisting: boolean;
  // Spanish summary safe for logs and the launcher UI.
  message: string;
}

export function snapshotFileName(date: string, kind: SnapshotKind): string {
  return `reservas-${date}-${kind}.db`;
}

function removeQuietly(path: string): void {
  try {
    rmSync(path, { force: true });
  } catch {
    // Best effort: a stale temp file must never block a new snapshot.
  }
}

function isHealthyDatabase(filePath: string): boolean {
  let database: Database.Database | null = null;
  try {
    database = new Database(filePath, { readonly: true });
    const rows = database
      .prepare("PRAGMA integrity_check")
      .all() as { integrity_check: string }[];
    return rows.length === 1 && rows[0]?.integrity_check === "ok";
  } catch {
    return false;
  } finally {
    database?.close();
  }
}

// Ensures at most one snapshot of the given kind per day. A repeated start
// or shutdown reuses the already published file instead of overwriting it.
// On failure no valid snapshot is ever deleted.
export async function ensureSnapshot(
  kind: SnapshotKind,
  options: SnapshotOptions = {},
): Promise<SnapshotResult> {
  const dataDir = options.dataDir ?? resolveDataDir();
  const backupsDir = options.backupsDir ?? resolveBackupsDir();
  const today = options.today ?? todayInTimeZone();
  const finalName = snapshotFileName(today, kind);
  const finalPath = join(backupsDir, finalName);
  const tempPath = `${finalPath}${TEMP_SUFFIX}`;

  try {
    mkdirSync(backupsDir, { recursive: true });
  } catch (error) {
    return failure(
      kind,
      `No se pudo preparar la carpeta de backups: ${shortError(error)}`,
    );
  }

  // Drop an unfinished temp file from a previous interrupted run. Only the
  // exact temp pattern is touched, never a published snapshot.
  for (const entry of safeListDir(backupsDir)) {
    if (
      entry.endsWith(TEMP_SUFFIX) &&
      SNAPSHOT_PATTERN.test(entry.slice(0, -TEMP_SUFFIX.length))
    ) {
      removeQuietly(join(backupsDir, entry));
    }
  }

  let alreadyExists = false;
  try {
    const existing = safeListDir(backupsDir);
    alreadyExists = existing.includes(finalName);
  } catch (error) {
    return failure(
      kind,
      `No se pudo revisar la carpeta de backups: ${shortError(error)}`,
    );
  }
  if (alreadyExists) {
    return {
      ok: true,
      kind,
      path: finalPath,
      reusedExisting: true,
      message: `Ya existe el backup de ${kind === "start" ? "inicio" : "cierre"} de hoy; se conserva el publicado.`,
    };
  }

  const sourcePath = join(dataDir, "app.db");
  let source: Database.Database | null = null;
  try {
    mkdirSync(dataDir, { recursive: true });
    removeQuietly(tempPath);
    source = new Database(sourcePath, { readonly: true });
    await source.backup(tempPath);
  } catch (error) {
    source?.close();
    removeQuietly(tempPath);
    return failure(
      kind,
      `No se pudo copiar la base de datos: ${shortError(error)}`,
    );
  }
  source.close();

  if (!isHealthyDatabase(tempPath)) {
    removeQuietly(tempPath);
    return failure(
      kind,
      "La copia no pasó la verificación de integridad y no se publicó.",
    );
  }

  try {
    renameSync(tempPath, finalPath);
  } catch (error) {
    removeQuietly(tempPath);
    return failure(
      kind,
      `No se pudo publicar la copia verificada: ${shortError(error)}`,
    );
  }

  pruneSnapshots(backupsDir, today);

  return {
    ok: true,
    kind,
    path: finalPath,
    reusedExisting: false,
    message: `Backup de ${kind === "start" ? "inicio" : "cierre"} guardado y verificado.`,
  };
}

function failure(kind: SnapshotKind, message: string): SnapshotResult {
  return { ok: false, kind, path: null, reusedExisting: false, message };
}

function safeListDir(directory: string): string[] {
  try {
    return readdirSync(directory);
  } catch {
    return [];
  }
}

function shortError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 200);
  }
  return "error desconocido";
}

// Deletes managed snapshots older than the retention window. Only files
// matching the exact managed pattern are eligible; anything else is left
// alone. Runs only after a successful publish, never on failure paths.
export function pruneSnapshots(backupsDir: string, today: string): string[] {
  const cutoff = addCivilDays(today, -(SNAPSHOT_RETENTION_DAYS - 1));
  const removed: string[] = [];
  for (const entry of safeListDir(backupsDir)) {
    const match = SNAPSHOT_PATTERN.exec(entry);
    if (match === null) {
      continue;
    }
    if (match[1] < cutoff) {
      const fullPath = join(backupsDir, entry);
      try {
        rmSync(fullPath, { force: true });
        removed.push(fullPath);
      } catch {
        // A file that cannot be removed stays; the next run retries.
      }
    }
  }
  return removed;
}

export interface RestoreOptions {
  snapshotPath: string;
  targetPath: string;
}

export interface RestoreResult {
  ok: boolean;
  message: string;
}

// Restores a verified snapshot over a target path. The server must be
// stopped first: this copies a cold, validated file instead of a live one.
// The previous target is preserved next to it before replacing.
export function restoreSnapshot(options: RestoreOptions): RestoreResult {
  const { snapshotPath, targetPath } = options;
  if (!isHealthyDatabase(snapshotPath)) {
    return {
      ok: false,
      message: "El backup elegido no pasa la verificación y no se usó.",
    };
  }
  try {
    if (existsSync(targetPath)) {
      copyFileSync(targetPath, `${targetPath}.previous`);
    }
    copyFileSync(snapshotPath, targetPath);
  } catch (error) {
    return {
      ok: false,
      message: `No se pudo restaurar el backup: ${shortError(error)}`,
    };
  }
  if (!isHealthyDatabase(targetPath)) {
    return {
      ok: false,
      message: "La base restaurada no pasa la verificación.",
    };
  }
  return { ok: true, message: "Backup restaurado y verificado." };
}

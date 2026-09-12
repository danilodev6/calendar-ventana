import Database from "better-sqlite3";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ensureSnapshot,
  pruneSnapshots,
  restoreSnapshot,
  snapshotFileName,
} from "@/server/backup";
import { toDatabaseFileUrl } from "@/lib/paths";
import {
  createDatabaseClient,
  disconnectDatabase,
} from "@/server/db";
import {
  applyMigrations,
  createIsolatedDatabase,
  type IsolatedDatabase,
} from "./database-helpers";

const SETUP_TIMEOUT_MS = 120000;
const TODAY = "2026-09-12";

let database: IsolatedDatabase;

beforeAll(async () => {
  database = await createIsolatedDatabase();
  await database.client.reservation.create({
    data: {
      guestName: "Laura Pérez",
      phone: "3415556666",
      checkIn: "2026-09-12",
      checkOut: "2026-09-16",
      status: "RESERVED",
      paymentStatus: "PAID_FULL",
      totalAmount: 500000,
    },
  });
  await database.client.expense.create({
    data: { date: "2026-09-05", description: "Limpieza", amount: 80000 },
  });
}, SETUP_TIMEOUT_MS);

afterAll(async () => {
  await database.cleanup();
});

function freshDirs(suffix: string): { dataDir: string; backupsDir: string } {
  const root = mkdtempSync(join(tmpdir(), `reservas-backup-${suffix}-`));
  const dataDir = join(root, "data hogar");
  mkdirSync(dataDir, { recursive: true });
  return { dataDir, backupsDir: join(root, "copias hogar") };
}

function databaseFileUrl(dataDir: string): string {
  return toDatabaseFileUrl(join(dataDir, "app.db"));
}

// Migrated live client over a fresh temporary database file.
function migratedClient(dataDir: string) {
  const url = databaseFileUrl(dataDir);
  applyMigrations(url);
  return createDatabaseClient(url);
}

function rowCounts(databasePath: string): { stays: number; expenses: number } {
  const handle = new Database(databasePath, { readonly: true });
  try {
    const stays = handle.prepare("SELECT COUNT(*) AS total FROM Reservation").get() as { total: number };
    const expenses = handle.prepare("SELECT COUNT(*) AS total FROM Expense").get() as { total: number };
    return { stays: stays.total, expenses: expenses.total };
  } finally {
    handle.close();
  }
}

describe("snapshots", () => {
  it(
    "copies a live database into a verified, healthy snapshot",
    async () => {
      const { dataDir, backupsDir } = freshDirs("live");
      const live = migratedClient(dataDir);
      await live.reservation.create({
        data: {
          guestName: "Ana Gómez",
          phone: "3410001111",
          checkIn: "2026-10-01",
          checkOut: "2026-10-05",
          status: "INQUIRY",
        },
      });

      const result = await ensureSnapshot("start", {
        dataDir,
        backupsDir,
        today: TODAY,
      });
      expect(result.ok).toBe(true);
      expect(result.reusedExisting).toBe(false);
      expect(result.path).toBe(
        join(backupsDir, snapshotFileName(TODAY, "start")),
      );
      // The live client stays open: the snapshot still holds every row.
      expect(rowCounts(result.path as string)).toEqual({ stays: 1, expenses: 0 });
      await disconnectDatabase(live);
      rmSync(dataDir, { recursive: true, force: true });
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "keeps at most one start and one shutdown snapshot per day",
    async () => {
      const { dataDir, backupsDir } = freshDirs("once");
      const source = migratedClient(dataDir);
      await source.reservation.create({
        data: {
          guestName: "Pedro Ruiz",
          phone: "3412223333",
          checkIn: "2026-11-01",
          checkOut: "2026-11-03",
          status: "INQUIRY",
        },
      });
      const first = await ensureSnapshot("start", {
        dataDir,
        backupsDir,
        today: TODAY,
      });
      const before = statSync(first.path as string).mtimeMs;
      const second = await ensureSnapshot("start", {
        dataDir,
        backupsDir,
        today: TODAY,
      });
      expect(second.ok).toBe(true);
      expect(second.reusedExisting).toBe(true);
      expect(statSync(first.path as string).mtimeMs).toBe(before);

      const shutdown = await ensureSnapshot("shutdown", {
        dataDir,
        backupsDir,
        today: TODAY,
      });
      expect(shutdown.ok).toBe(true);
      expect(shutdown.path).toBe(
        join(backupsDir, snapshotFileName(TODAY, "shutdown")),
      );
      await disconnectDatabase(source);
      rmSync(dataDir, { recursive: true, force: true });
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "removes a stale temp file before publishing",
    async () => {
      const { dataDir, backupsDir } = freshDirs("stale");
      const source = migratedClient(dataDir);
      await source.expense.create({
        data: { date: "2026-09-06", description: "Viejos", amount: 10 },
      });
      mkdirSync(backupsDir, { recursive: true });
      const staleTemp = join(
        backupsDir,
        `${snapshotFileName(TODAY, "start")}.tmp`,
      );
      writeFileSync(staleTemp, "incomplete");
      const result = await ensureSnapshot("start", {
        dataDir,
        backupsDir,
        today: TODAY,
      });
      expect(result.ok).toBe(true);
      expect(rowCounts(result.path as string)).toEqual({ stays: 0, expenses: 1 });
      await disconnectDatabase(source);
      rmSync(dataDir, { recursive: true, force: true });
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "fails without touching valid snapshots when the source is missing",
    async () => {
      const { dataDir, backupsDir } = freshDirs("missing");
      mkdirSync(backupsDir, { recursive: true });
      const good = join(backupsDir, snapshotFileName("2026-09-10", "start"));
      writeFileSync(good, "valid-snapshot-placeholder");
      const result = await ensureSnapshot("start", {
        dataDir,
        backupsDir,
        today: TODAY,
      });
      expect(result.ok).toBe(false);
      expect(result.path).toBeNull();
      // The pre-existing file is byte-identical: errors never delete.
      expect(readFileSync(good, "utf8")).toBe("valid-snapshot-placeholder");
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "supports paths with spaces",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "reservas con espacios-"));
      const dataDir = join(root, "datos de la casa");
      mkdirSync(dataDir, { recursive: true });
      const backupsDir = join(root, "copias de la casa");
      const live = migratedClient(dataDir);
      await live.expense.create({
        data: { date: "2026-09-07", description: "Espacios", amount: 5 },
      });
      const result = await ensureSnapshot("start", {
        dataDir,
        backupsDir,
        today: TODAY,
      });
      expect(result.ok).toBe(true);
      await disconnectDatabase(live);
      rmSync(root, { recursive: true, force: true });
    },
    SETUP_TIMEOUT_MS,
  );
});

describe("retention", () => {
  it("deletes only managed snapshots older than 30 days", () => {
    const root = mkdtempSync(join(tmpdir(), "reservas-retention-"));
    const oldStart = join(root, snapshotFileName("2026-07-01", "start"));
    const oldShutdown = join(root, snapshotFileName("2026-08-13", "shutdown"));
    const keptStart = join(root, snapshotFileName("2026-08-14", "start"));
    const recent = join(root, snapshotFileName(TODAY, "shutdown"));
    const stranger = join(root, "notas.txt");
    const lookalike = join(root, "reservas-viejas.db");
    for (const file of [oldStart, oldShutdown, keptStart, recent, stranger, lookalike]) {
      writeFileSync(file, "x");
    }
    // TODAY 2026-09-12 keeps 2026-08-14 onward (30 days), drops older.
    const removed = pruneSnapshots(root, TODAY);
    expect(removed).toHaveLength(2);
    expect(existsSync(oldStart)).toBe(false);
    expect(existsSync(oldShutdown)).toBe(false);
    expect(existsSync(keptStart)).toBe(true);
    expect(existsSync(recent)).toBe(true);
    expect(existsSync(stranger)).toBe(true);
    expect(existsSync(lookalike)).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("restore", () => {
  it(
    "restores an exact, verified copy of the backed-up data",
    async () => {
      const { dataDir, backupsDir } = freshDirs("restore");
      const live = migratedClient(dataDir);
      await live.reservation.create({
        data: {
          guestName: "Laura Pérez",
          phone: "3415556666",
          checkIn: "2026-09-12",
          checkOut: "2026-09-16",
          status: "RESERVED",
          paymentStatus: "PAID_FULL",
          totalAmount: 500000,
        },
      });
      await live.expense.create({
        data: { date: "2026-09-05", description: "Limpieza", amount: 80000 },
      });
      const snapshot = await ensureSnapshot("start", {
        dataDir,
        backupsDir,
        today: TODAY,
      });
      await disconnectDatabase(live);
      expect(snapshot.ok).toBe(true);

      const restoredPath = join(backupsDir, "restored-check.db");
      const restored = restoreSnapshot({
        snapshotPath: snapshot.path as string,
        targetPath: restoredPath,
      });
      expect(restored.ok).toBe(true);
      expect(rowCounts(restoredPath)).toEqual({ stays: 1, expenses: 1 });

      const broken = restoreSnapshot({
        snapshotPath: join(backupsDir, "missing.db"),
        targetPath: join(backupsDir, "never.db"),
      });
      expect(broken.ok).toBe(false);
      rmSync(dataDir, { recursive: true, force: true });
    },
    SETUP_TIMEOUT_MS,
  );
});

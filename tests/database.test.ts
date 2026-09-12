import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseFileUrl, toDatabaseFileUrl } from "@/lib/paths";
import {
  createDatabaseClient,
  disconnectDatabase,
} from "@/server/db";

const SETUP_TIMEOUT_MS = 120000;

// Package runner binary without relying on shell-specific resolution.
const packageRunner = process.platform === "win32" ? "npx.cmd" : "npx";

let tempDir: string;
let client: PrismaClient;

function applyMigrations(databaseFileUrl: string): void {
  execFileSync(packageRunner, ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseFileUrl },
    stdio: "pipe",
    timeout: SETUP_TIMEOUT_MS,
  });
}

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "reservas-casa-test-"));
  const databaseFileUrl = toDatabaseFileUrl(join(tempDir, "test.db"));
  applyMigrations(databaseFileUrl);
  client = createDatabaseClient(databaseFileUrl);
}, SETUP_TIMEOUT_MS);

afterAll(async () => {
  if (client !== undefined) {
    await disconnectDatabase(client);
  }
  if (tempDir !== undefined) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("database persistence", () => {
  it(
    "creates and reads a reservation preserving civil dates and integer amounts",
    async () => {
      const created = await client.reservation.create({
        data: {
          guestName: "Laura Pérez",
          phone: "+54 9 11 5555 5555",
          dni: "30123456",
          email: "laura@ejemplo.com",
          originCity: "Rosario",
          guestCount: 3,
          notes: "Llega tarde",
          checkIn: "2026-09-12",
          checkOut: "2026-09-16",
          status: "RESERVED",
          paymentStatus: "DEPOSIT_PAID",
          totalAmount: 500000,
          depositAmount: 100000,
          channel: "DIRECT",
        },
      });

      const read = await client.reservation.findUnique({
        where: { id: created.id },
      });
      expect(read?.checkIn).toBe("2026-09-12");
      expect(read?.checkOut).toBe("2026-09-16");
      expect(read?.totalAmount).toBe(500000);
      expect(read?.depositAmount).toBe(100000);
      expect(read?.status).toBe("RESERVED");
      expect(read?.paymentStatus).toBe("DEPOSIT_PAID");
      expect(read?.guestName).toBe("Laura Pérez");
      expect(read?.createdAt).toBeInstanceOf(Date);
      expect(read?.updatedAt).toBeInstanceOf(Date);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "applies model defaults for status, payment, amounts and channel",
    async () => {
      const created = await client.reservation.create({
        data: {
          guestName: "Pedro Ruiz",
          phone: "3415556666",
          checkIn: "2026-10-01",
          checkOut: "2026-10-03",
        },
      });
      expect(created.status).toBe("INQUIRY");
      expect(created.paymentStatus).toBe("UNPAID");
      expect(created.totalAmount).toBe(0);
      expect(created.depositAmount).toBe(0);
      expect(created.channel).toBe("DIRECT");
      expect(created.email).toBeNull();
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "creates and reads an expense with its own civil date",
    async () => {
      await client.expense.create({
        data: {
          date: "2026-09-05",
          description: "Limpieza",
          amount: 80000,
        },
      });

      const found = await client.expense.findMany({
        where: { date: "2026-09-05" },
      });
      expect(found).toHaveLength(1);
      expect(found[0]?.description).toBe("Limpieza");
      expect(found[0]?.amount).toBe(80000);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "writes only to the isolated temporary database",
    async () => {
      const files = readdirSync(tempDir);
      expect(files.some((file) => file === "test.db")).toBe(true);
      // The development database location is never used by this suite.
      expect(resolveDatabaseFileUrl()).not.toContain(tempDir);
    },
    SETUP_TIMEOUT_MS,
  );
});

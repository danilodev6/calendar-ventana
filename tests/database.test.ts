import { readdirSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveDatabaseFileUrl } from "@/lib/paths";
import {
  createIsolatedDatabase,
  type IsolatedDatabase,
} from "./database-helpers";

const SETUP_TIMEOUT_MS = 120000;

let database: IsolatedDatabase;

beforeAll(async () => {
  database = await createIsolatedDatabase();
}, SETUP_TIMEOUT_MS);

afterAll(async () => {
  await database.cleanup();
});

describe("database persistence", () => {
  it(
    "creates and reads a reservation preserving civil dates and integer amounts",
    async () => {
      const created = await database.client.reservation.create({
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

      const read = await database.client.reservation.findUnique({
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
      const created = await database.client.reservation.create({
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
      await database.client.expense.create({
        data: {
          date: "2026-09-05",
          description: "Limpieza",
          amount: 80000,
        },
      });

      const found = await database.client.expense.findMany({
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
      const files = readdirSync(database.directory);
      expect(files.some((file) => file === "test.db")).toBe(true);
      // The development database location is never used by this suite.
      expect(resolveDatabaseFileUrl()).not.toContain(database.directory);
    },
    SETUP_TIMEOUT_MS,
  );
});

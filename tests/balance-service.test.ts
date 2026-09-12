import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ReservationInput } from "@/domain/schemas";
import { getBalance } from "@/server/balance";
import {
  cancelReservationActionWithClient,
  createReservationActionWithClient,
  updateReservationActionWithClient,
} from "@/server/reservation-actions";
import { createExpenseActionWithClient } from "@/server/expense-actions";
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

function reservationInput(
  overrides: Partial<ReservationInput> = {},
): ReservationInput {
  return {
    guestName: "Laura Pérez",
    phone: "+54 9 11 5555 5555",
    dni: null,
    email: null,
    originCity: null,
    guestCount: 2,
    notes: null,
    checkIn: "2030-09-12",
    checkOut: "2030-09-16",
    status: "RESERVED",
    paymentStatus: "PAID_FULL",
    totalAmount: 500000,
    depositAmount: 0,
    channel: "DIRECT",
    ...overrides,
  };
}

describe("getBalance", () => {
  it(
    "counts fully paid stays and expenses of the requested month",
    async () => {
      const client = database.client;
      await createReservationActionWithClient(
        reservationInput({ checkIn: "2031-09-12", checkOut: "2031-09-16" }),
        client,
      );
      await createReservationActionWithClient(
        reservationInput({
          guestName: "Ana Gómez",
          checkIn: "2031-09-15",
          checkOut: "2031-09-18",
          status: "RESERVED",
          paymentStatus: "DEPOSIT_PAID",
          totalAmount: 300000,
          depositAmount: 100000,
        }),
        client,
      );
      await createExpenseActionWithClient(
        { date: "2031-09-05", description: "Limpieza", amount: 80000 },
        client,
      );

      const summary = await getBalance({ month: "2031-09" }, { client });
      expect(summary.month).toBe("2031-09");
      expect(summary.incomeTotal).toBe(500000);
      expect(summary.expenseTotal).toBe(80000);
      expect(summary.result).toBe(420000);
      expect(summary.incomeItems.map((item) => item.guestName)).toEqual([
        "Laura Pérez",
      ]);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "assigns completed stays to their check-in month across year boundaries",
    async () => {
      const client = database.client;
      await createReservationActionWithClient(
        reservationInput({
          checkIn: "2031-08-28",
          checkOut: "2031-09-02",
          status: "COMPLETED",
        }),
        client,
      );
      const august = await getBalance({ month: "2031-08" }, { client });
      expect(august.incomeTotal).toBe(500000);
      const september = await getBalance({ month: "2031-09" }, { client });
      expect(
        september.incomeItems.some((item) => item.checkIn === "2031-08-28"),
      ).toBe(false);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "aggregates every record in the historical view",
    async () => {
      const summary = await getBalance({}, { client: database.client });
      expect(summary.month).toBeNull();
      expect(summary.incomeTotal).toBeGreaterThanOrEqual(1000000);
      expect(
        summary.incomeItems.every((item) => item.amount > 0),
      ).toBe(true);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "adds exactly the total when a deposit becomes full payment",
    async () => {
      const client = database.client;
      const created = await createReservationActionWithClient(
        reservationInput({
          checkIn: "2031-10-01",
          checkOut: "2031-10-05",
          paymentStatus: "DEPOSIT_PAID",
          totalAmount: 300000,
          depositAmount: 100000,
        }),
        client,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }
      const before = await getBalance({ month: "2031-10" }, { client });
      expect(before.incomeTotal).toBe(0);

      const paid = await updateReservationActionWithClient(
        { id: created.reservationId, input: { paymentStatus: "PAID_FULL" } },
        client,
      );
      expect(paid.ok).toBe(true);
      const after = await getBalance({ month: "2031-10" }, { client });
      expect(after.incomeTotal).toBe(300000);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "drops cancelled income but keeps completed income",
    async () => {
      const client = database.client;
      const cancelled = await createReservationActionWithClient(
        reservationInput({ checkIn: "2031-11-01", checkOut: "2031-11-05" }),
        client,
      );
      const completed = await createReservationActionWithClient(
        reservationInput({
          guestName: "Ana Gómez",
          checkIn: "2031-11-10",
          checkOut: "2031-11-14",
          status: "COMPLETED",
        }),
        client,
      );
      expect(cancelled.ok).toBe(true);
      expect(completed.ok).toBe(true);
      if (!cancelled.ok || !completed.ok) {
        return;
      }
      await cancelReservationActionWithClient(cancelled.reservationId, client);
      const summary = await getBalance({ month: "2031-11" }, { client });
      expect(summary.incomeTotal).toBe(500000);
      expect(summary.incomeItems.map((item) => item.guestName)).toEqual([
        "Ana Gómez",
      ]);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "goes negative when expenses exceed income",
    async () => {
      const client = database.client;
      await createExpenseActionWithClient(
        { date: "2031-12-05", description: "Reparación", amount: 120000 },
        client,
      );
      const summary = await getBalance({ month: "2031-12" }, { client });
      expect(summary.incomeTotal).toBe(0);
      expect(summary.expenseTotal).toBe(120000);
      expect(summary.result).toBe(-120000);
    },
    SETUP_TIMEOUT_MS,
  );
});

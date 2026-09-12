import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ReservationInput } from "@/domain/schemas";
import {
  createReservationActionWithClient,
} from "@/server/reservation-actions";
import { getReservationById } from "@/server/reservations";
import { disconnectDatabase } from "@/server/db";
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
    checkIn: "2026-09-12",
    checkOut: "2026-09-16",
    status: "INQUIRY",
    paymentStatus: "UNPAID",
    totalAmount: 0,
    depositAmount: 0,
    channel: "DIRECT",
    ...overrides,
  };
}

describe("createReservationAction", () => {
  it(
    "creates a minimal inquiry and returns its id",
    async () => {
      const result = await createReservationActionWithClient(
        reservationInput(),
        database.client,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stored = await getReservationById(result.reservationId, {
          client: database.client,
        });
        expect(stored?.guestName).toBe("Laura Pérez");
        expect(stored?.status).toBe("INQUIRY");
      }
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "creates a fully detailed confirmed stay",
    async () => {
      const result = await createReservationActionWithClient(
        reservationInput({
          checkIn: "2026-10-01",
          checkOut: "2026-10-05",
          status: "RESERVED",
          paymentStatus: "DEPOSIT_PAID",
          totalAmount: 500000,
          depositAmount: 100000,
          channel: "AIRBNB",
          email: "laura@ejemplo.com",
        }),
        database.client,
      );
      expect(result).toEqual(
        expect.objectContaining({ ok: true }),
      );
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "rejects an overlapping confirmed stay with a human message",
    async () => {
      await createReservationActionWithClient(
        reservationInput({
          checkIn: "2026-11-01",
          checkOut: "2026-11-05",
          status: "RESERVED",
        }),
        database.client,
      );
      const result = await createReservationActionWithClient(
        reservationInput({
          guestName: "Ana Gómez",
          checkIn: "2026-11-03",
          checkOut: "2026-11-07",
          status: "RESERVED",
        }),
        database.client,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("Laura Pérez");
        expect(result.message).not.toContain("SQLITE");
        expect(result.fieldIssues).toEqual([]);
      }
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "allows an overlapping inquiry through the action",
    async () => {
      const result = await createReservationActionWithClient(
        reservationInput({
          guestName: "Ana Gómez",
          checkIn: "2026-11-03",
          checkOut: "2026-11-07",
          status: "INQUIRY",
        }),
        database.client,
      );
      expect(result.ok).toBe(true);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "returns Spanish field issues for invalid payloads",
    async () => {
      const result = await createReservationActionWithClient(
        reservationInput({
          guestName: "",
          checkIn: "2026-12-05",
          checkOut: "2026-12-01",
        }),
        database.client,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldIssues.length).toBeGreaterThan(0);
        expect(
          result.fieldIssues.some((issue) =>
            issue.message.includes("posterior"),
          ),
        ).toBe(true);
      }
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "hides unexpected failures behind a generic message",
    async () => {
      const broken = await createIsolatedDatabase();
      await disconnectDatabase(broken.client);
      rmSync(join(broken.directory, "test.db"));
      const result = await createReservationActionWithClient(
        reservationInput({ status: "RESERVED" }),
        broken.client,
      );
      await broken.cleanup();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe(
          "Ocurrió un error inesperado. Intentá nuevamente.",
        );
      }
    },
    SETUP_TIMEOUT_MS,
  );
});

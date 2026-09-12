import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ReservationInput } from "@/domain/schemas";
import {
  cancelReservationActionWithClient,
  createReservationActionWithClient,
  deleteReservationActionWithClient,
  updateReservationActionWithClient,
} from "@/server/reservation-actions";
import { getReservationById } from "@/server/reservations";
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
    checkIn: "2029-05-01",
    checkOut: "2029-05-05",
    status: "INQUIRY",
    paymentStatus: "UNPAID",
    totalAmount: 0,
    depositAmount: 0,
    channel: "DIRECT",
    ...overrides,
  };
}

// Mirrors the manual walkthrough: inquiry, confirmation, deposit, full
// payment, completion, then cancellation freeing the dates for reuse.
describe("reservation lifecycle", () => {
  it(
    "walks a stay from inquiry to completion",
    async () => {
      const client = database.client;
      const created = await createReservationActionWithClient(
        reservationInput(),
        client,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }
      const id = created.reservationId;

      const confirmed = await updateReservationActionWithClient(
        { id, input: { status: "RESERVED" } },
        client,
      );
      expect(confirmed.ok).toBe(true);

      const overlapping = await createReservationActionWithClient(
        reservationInput({ guestName: "Ana Gómez" }),
        client,
      );
      expect(overlapping.ok).toBe(true);
      if (!overlapping.ok) {
        return;
      }
      const blockedConfirm = await updateReservationActionWithClient(
        { id: overlapping.reservationId, input: { status: "RESERVED" } },
        client,
      );
      expect(blockedConfirm.ok).toBe(false);

      const deposit = await updateReservationActionWithClient(
        {
          id,
          input: {
            paymentStatus: "DEPOSIT_PAID",
            totalAmount: 500000,
            depositAmount: 100000,
          },
        },
        client,
      );
      expect(deposit.ok).toBe(true);

      const paid = await updateReservationActionWithClient(
        { id, input: { paymentStatus: "PAID_FULL" } },
        client,
      );
      expect(paid.ok).toBe(true);

      const completed = await updateReservationActionWithClient(
        { id, input: { status: "COMPLETED" } },
        client,
      );
      expect(completed.ok).toBe(true);

      const stored = await getReservationById(id, { client });
      expect(stored?.status).toBe("COMPLETED");
      expect(stored?.paymentStatus).toBe("PAID_FULL");
      expect(stored?.totalAmount).toBe(500000);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "cancels a stay, reuses its dates and deletes the replacement",
    async () => {
      const client = database.client;
      const created = await createReservationActionWithClient(
        reservationInput({
          checkIn: "2029-06-01",
          checkOut: "2029-06-05",
          status: "RESERVED",
          paymentStatus: "PAID_FULL",
          totalAmount: 500000,
        }),
        client,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }

      const cancelled = await cancelReservationActionWithClient(
        created.reservationId,
        client,
      );
      expect(cancelled.ok).toBe(true);

      const replacement = await createReservationActionWithClient(
        reservationInput({
          guestName: "Ana Gómez",
          checkIn: "2029-06-01",
          checkOut: "2029-06-05",
          status: "RESERVED",
        }),
        client,
      );
      expect(replacement.ok).toBe(true);
      if (!replacement.ok) {
        return;
      }

      const deleted = await deleteReservationActionWithClient(
        replacement.reservationId,
        client,
      );
      expect(deleted.ok).toBe(true);
      expect(
        await getReservationById(replacement.reservationId, { client }),
      ).toBeNull();
      expect(
        await getReservationById(created.reservationId, { client }),
      ).not.toBeNull();
    },
    SETUP_TIMEOUT_MS,
  );
});

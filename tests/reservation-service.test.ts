import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ReservationInput } from "@/domain/schemas";
import {
  ReservationBusyError,
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
  createReservation,
  getReservationById,
  listReservationsByRange,
  updateReservation,
  withBusyRetry,
} from "@/server/reservations";
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

function reservationPayload(
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
    status: "RESERVED",
    paymentStatus: "UNPAID",
    totalAmount: 0,
    depositAmount: 0,
    channel: "DIRECT",
    ...overrides,
  };
}

describe("reservation service availability", () => {
  it(
    "persists only one of two concurrent overlapping confirmed stays",
    async () => {
      const firstPayload = reservationPayload({
        checkIn: "2026-09-12",
        checkOut: "2026-09-16",
      });
      const secondPayload = reservationPayload({
        guestName: "Ana Gómez",
        checkIn: "2026-09-12",
        checkOut: "2026-09-16",
      });

      const [first, second] = await Promise.allSettled([
        createReservation(firstPayload, { client: database.client }),
        createReservation(secondPayload, { client: database.client }),
      ]);
      const fulfilled = [first, second].filter(
        (outcome) => outcome.status === "fulfilled",
      );
      const rejected = [first, second].filter(
        (outcome) => outcome.status === "rejected",
      );
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(
        (rejected[0] as PromiseRejectedResult).reason,
      ).toBeInstanceOf(ReservationConflictError);

      const stored = await listReservationsByRange(
        { from: "2026-09-12", to: "2026-09-16" },
        { client: database.client },
      );
      expect(
        stored.filter((stay) => stay.status === "RESERVED"),
      ).toHaveLength(1);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "persists two adjacent confirmed ranges",
    async () => {
      const first = await createReservation(
        reservationPayload({ checkIn: "2026-10-01", checkOut: "2026-10-05" }),
        { client: database.client },
      );
      const second = await createReservation(
        reservationPayload({
          guestName: "Ana Gómez",
          checkIn: "2026-10-05",
          checkOut: "2026-10-09",
        }),
        { client: database.client },
      );
      expect(first.id).not.toBe(second.id);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "persists several identical inquiries without blocking",
    async () => {
      await createReservation(
        reservationPayload({
          checkIn: "2026-11-01",
          checkOut: "2026-11-05",
          status: "INQUIRY",
        }),
        { client: database.client },
      );
      const second = await createReservation(
        reservationPayload({
          guestName: "Ana Gómez",
          checkIn: "2026-11-01",
          checkOut: "2026-11-05",
          status: "INQUIRY",
        }),
        { client: database.client },
      );
      expect(second.status).toBe("INQUIRY");
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "persists an inquiry over a confirmed stay",
    async () => {
      await createReservation(
        reservationPayload({ checkIn: "2026-12-01", checkOut: "2026-12-05" }),
        { client: database.client },
      );
      const inquiry = await createReservation(
        reservationPayload({
          guestName: "Ana Gómez",
          checkIn: "2026-12-01",
          checkOut: "2026-12-05",
          status: "INQUIRY",
        }),
        { client: database.client },
      );
      expect(inquiry.id).toBeDefined();
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "lets a new stay reuse cancelled dates but not completed ones",
    async () => {
      await createReservation(
        reservationPayload({
          checkIn: "2027-01-10",
          checkOut: "2027-01-14",
          status: "CANCELLED",
        }),
        { client: database.client },
      );
      const reused = await createReservation(
        reservationPayload({
          guestName: "Ana Gómez",
          checkIn: "2027-01-10",
          checkOut: "2027-01-14",
        }),
        { client: database.client },
      );
      expect(reused.status).toBe("RESERVED");

      await createReservation(
        reservationPayload({
          guestName: "Pedro Ruiz",
          checkIn: "2027-02-10",
          checkOut: "2027-02-14",
          status: "COMPLETED",
          paymentStatus: "PAID_FULL",
          totalAmount: 400000,
        }),
        { client: database.client },
      );
      await expect(
        createReservation(
          reservationPayload({
            guestName: "Ana Gómez",
            checkIn: "2027-02-10",
            checkOut: "2027-02-14",
          }),
          { client: database.client },
        ),
      ).rejects.toBeInstanceOf(ReservationConflictError);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "revalidates availability when an inquiry becomes confirmed",
    async () => {
      const inquiry = await createReservation(
        reservationPayload({
          checkIn: "2027-03-10",
          checkOut: "2027-03-14",
          status: "INQUIRY",
        }),
        { client: database.client },
      );
      await createReservation(
        reservationPayload({
          guestName: "Ana Gómez",
          checkIn: "2027-03-12",
          checkOut: "2027-03-16",
        }),
        { client: database.client },
      );

      await expect(
        updateReservation(inquiry.id, { status: "RESERVED" }, {
          client: database.client,
        }),
      ).rejects.toBeInstanceOf(ReservationConflictError);

      const moved = await updateReservation(
        inquiry.id,
        {
          checkIn: "2027-03-16",
          checkOut: "2027-03-20",
          status: "RESERVED",
        },
        { client: database.client },
      );
      expect(moved.status).toBe("RESERVED");
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "edits a stay without clashing with itself but detects other stays",
    async () => {
      const stay = await createReservation(
        reservationPayload({ checkIn: "2027-04-10", checkOut: "2027-04-14" }),
        { client: database.client },
      );
      const edited = await updateReservation(
        stay.id,
        { notes: "Llega tarde" },
        { client: database.client },
      );
      expect(edited.notes).toBe("Llega tarde");

      await createReservation(
        reservationPayload({
          guestName: "Ana Gómez",
          checkIn: "2027-04-16",
          checkOut: "2027-04-20",
        }),
        { client: database.client },
      );
      await expect(
        updateReservation(
          stay.id,
          { checkIn: "2027-04-18", checkOut: "2027-04-22" },
          { client: database.client },
        ),
      ).rejects.toBeInstanceOf(ReservationConflictError);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "reports conflicts with guest and dates but no technical details",
    async () => {
      await createReservation(
        reservationPayload({ checkIn: "2027-05-10", checkOut: "2027-05-14" }),
        { client: database.client },
      );
      const error = await createReservation(
        reservationPayload({
          guestName: "Ana Gómez",
          checkIn: "2027-05-12",
          checkOut: "2027-05-16",
        }),
        { client: database.client },
      ).catch((cause: unknown) => cause);
      expect(error).toBeInstanceOf(ReservationConflictError);
      if (error instanceof ReservationConflictError) {
        expect(error.message).toContain("Laura Pérez");
        expect(error.message).toContain("mayo");
        expect(error.message).not.toContain("SQLITE");
        expect(error.message).not.toContain("P2002");
        expect(error.message).not.toContain("Prisma");
        expect(error.conflictingStay.guestName).toBe("Laura Pérez");
      }
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "rejects invalid data with Spanish field issues",
    async () => {
      const error = await createReservation(
        reservationPayload({ checkIn: "2027-06-14", checkOut: "2027-06-10" }),
        { client: database.client },
      ).catch((cause: unknown) => cause);
      expect(error).toBeInstanceOf(ReservationValidationError);
      if (error instanceof ReservationValidationError) {
        expect(error.fieldIssues.length).toBeGreaterThan(0);
        expect(
          error.fieldIssues.some((issue) =>
            issue.message.includes("posterior"),
          ),
        ).toBe(true);
      }
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "reports missing stays instead of inventing them",
    async () => {
      await expect(
        updateReservation(
          "missing-stay-id",
          { notes: "Hola" },
          { client: database.client },
        ),
      ).rejects.toBeInstanceOf(ReservationNotFoundError);
      await expect(
        getReservationById("missing-stay-id", { client: database.client }),
      ).resolves.toBeNull();
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "lists stays intersecting a range including boundary crossings",
    async () => {
      await createReservation(
        reservationPayload({
          guestName: "Cruza inicio",
          checkIn: "2027-07-28",
          checkOut: "2027-08-03",
          status: "INQUIRY",
        }),
        { client: database.client },
      );
      await createReservation(
        reservationPayload({
          guestName: "Dentro",
          checkIn: "2027-08-10",
          checkOut: "2027-08-15",
          status: "INQUIRY",
        }),
        { client: database.client },
      );
      await createReservation(
        reservationPayload({
          guestName: "Termina en el borde",
          checkIn: "2027-07-25",
          checkOut: "2027-08-01",
          status: "INQUIRY",
        }),
        { client: database.client },
      );
      await createReservation(
        reservationPayload({
          guestName: "Fuera",
          checkIn: "2027-09-01",
          checkOut: "2027-09-05",
          status: "INQUIRY",
        }),
        { client: database.client },
      );

      const listed = await listReservationsByRange(
        { from: "2027-08-01", to: "2027-09-01" },
        { client: database.client },
      );
      expect(listed.map((stay) => stay.guestName)).toEqual([
        "Cruza inicio",
        "Dentro",
      ]);
    },
    SETUP_TIMEOUT_MS,
  );
});

describe("busy retry", () => {
  function busyError(): Error {
    return Object.assign(new Error("Transaction failed (P2034)"), {
      code: "P2034",
    });
  }

  it("repeats the whole operation until a busy lock clears", async () => {
    let attempts = 0;
    const result = await withBusyRetry(() => {
      attempts += 1;
      if (attempts < 3) {
        throw busyError();
      }
      return Promise.resolve("stored");
    });
    expect(result).toBe("stored");
    expect(attempts).toBe(3);
  });

  it("lets non-busy failures through without retrying", async () => {
    let attempts = 0;
    await expect(
      withBusyRetry(() => {
        attempts += 1;
        throw new Error("Boom");
      }),
    ).rejects.toThrow("Boom");
    expect(attempts).toBe(1);
  });

  it("reports an exhausted busy lock as a domain error", async () => {
    await expect(
      withBusyRetry(
        () => {
          throw busyError();
        },
        2,
      ),
    ).rejects.toBeInstanceOf(ReservationBusyError);
  });
});

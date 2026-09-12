import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET } from "@/app/api/reservations/route";
import { getCalendarStaysInRange } from "@/server/reservations";
import {
  createIsolatedDatabase,
  type IsolatedDatabase,
} from "../../../../tests/database-helpers";

const SETUP_TIMEOUT_MS = 120000;

let database: IsolatedDatabase;

beforeAll(async () => {
  database = await createIsolatedDatabase();
  await database.client.reservation.create({
    data: {
      guestName: "Laura Pérez",
      phone: "3415556666",
      checkIn: "2026-08-28",
      checkOut: "2026-09-03",
      status: "RESERVED",
      paymentStatus: "PAID_FULL",
      totalAmount: 500000,
    },
  });
  await database.client.reservation.create({
    data: {
      guestName: "Ana Gómez",
      phone: "3410001111",
      checkIn: "2026-10-01",
      checkOut: "2026-10-05",
      status: "INQUIRY",
    },
  });
}, SETUP_TIMEOUT_MS);

afterAll(async () => {
  await database.cleanup();
});

describe("getCalendarStaysInRange", () => {
  it(
    "includes stays crossing the visible boundaries with minimal fields",
    async () => {
      const stays = await getCalendarStaysInRange(
        { from: "2026-09-01", to: "2026-10-01" },
        { client: database.client },
      );
      expect(stays).toEqual([
        {
          id: expect.any(String),
          guestName: "Laura Pérez",
          checkIn: "2026-08-28",
          checkOut: "2026-09-03",
          status: "RESERVED",
        },
      ]);
      expect(stays[0]).not.toHaveProperty("totalAmount");
      expect(stays[0]).not.toHaveProperty("paymentStatus");
    },
    SETUP_TIMEOUT_MS,
  );
});

describe("GET /api/reservations", () => {
  it("rejects missing, malformed and inverted ranges in Spanish", async () => {
    for (const url of [
      "http://localhost/api/reservations",
      "http://localhost/api/reservations?from=2026-09-01",
      "http://localhost/api/reservations?from=12/09/2026&to=2026-10-01",
      "http://localhost/api/reservations?from=2026-10-01&to=2026-09-01",
      "http://localhost/api/reservations?from=2026-02-30&to=2026-10-01",
      "http://localhost/api/reservations?from=2020-01-01&to=2026-10-01",
    ]) {
      const response = await GET(new Request(url));
      expect(response.status).toBe(400);
      const body = (await response.json()) as { message: string };
      expect(body.message).toContain("rango válido");
    }
  });

  it("answers valid ranges with a stay array", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/reservations?from=2026-09-01&to=2026-10-01",
      ),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });
});

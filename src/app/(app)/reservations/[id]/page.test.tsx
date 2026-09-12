import { describe, expect, it, vi } from "vitest";

import ReservationDetailPage from "@/app/(app)/reservations/[id]/page";

vi.mock("@/server/reservations", async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  getReservationById: async () => null,
}));

describe("ReservationDetailPage", () => {
  it("shows the human not-found page for unknown ids", async () => {
    await expect(
      ReservationDetailPage({ params: Promise.resolve({ id: "missing-id" }) }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });
});

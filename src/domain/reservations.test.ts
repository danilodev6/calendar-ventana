import { describe, expect, it } from "vitest";

import {
  blocksAvailability,
  findConflictingReservation,
  rangesOverlap,
  type ReservationRange,
} from "@/domain/reservations";

function confirmedStay(
  overrides: Partial<ReservationRange> = {},
): ReservationRange {
  return {
    id: "stay-1",
    guestName: "Laura Pérez",
    checkIn: "2026-09-12",
    checkOut: "2026-09-16",
    status: "RESERVED",
    ...overrides,
  };
}

describe("rangesOverlap", () => {
  it("detects partial, total, contained and identical overlaps", () => {
    expect(rangesOverlap("2026-09-10", "2026-09-14", "2026-09-12", "2026-09-16")).toBe(true);
    expect(rangesOverlap("2026-09-10", "2026-09-20", "2026-09-12", "2026-09-16")).toBe(true);
    expect(rangesOverlap("2026-09-12", "2026-09-16", "2026-09-10", "2026-09-20")).toBe(true);
    expect(rangesOverlap("2026-09-12", "2026-09-16", "2026-09-12", "2026-09-16")).toBe(true);
  });

  it("treats same-day check-out/check-in as adjacent, not overlapping", () => {
    expect(rangesOverlap("2026-09-10", "2026-09-12", "2026-09-12", "2026-09-16")).toBe(false);
    expect(rangesOverlap("2026-09-12", "2026-09-16", "2026-09-10", "2026-09-12")).toBe(false);
  });

  it("rejects disjoint ranges", () => {
    expect(rangesOverlap("2026-09-10", "2026-09-11", "2026-09-12", "2026-09-16")).toBe(false);
  });
});

describe("blocksAvailability", () => {
  it("blocks confirmed and completed stays only", () => {
    expect(blocksAvailability("RESERVED")).toBe(true);
    expect(blocksAvailability("COMPLETED")).toBe(true);
    expect(blocksAvailability("INQUIRY")).toBe(false);
    expect(blocksAvailability("CANCELLED")).toBe(false);
  });
});

describe("findConflictingReservation", () => {
  it("returns the first incompatible stay with guest data", () => {
    const existing = [
      confirmedStay({ id: "other-1", guestName: "Ana Gómez" }),
      confirmedStay({ id: "other-2", guestName: "Pedro Ruiz" }),
    ];
    const conflict = findConflictingReservation(
      { checkIn: "2026-09-14", checkOut: "2026-09-18", status: "RESERVED" },
      existing,
    );
    expect(conflict?.id).toBe("other-1");
    expect(conflict?.guestName).toBe("Ana Gómez");
  });

  it("allows adjacent stays", () => {
    const conflict = findConflictingReservation(
      { checkIn: "2026-09-16", checkOut: "2026-09-20", status: "RESERVED" },
      [confirmedStay()],
    );
    expect(conflict).toBeNull();
  });

  it("ignores inquiries and cancellations already on the books", () => {
    const existing = [
      confirmedStay({ id: "inquiry", status: "INQUIRY" }),
      confirmedStay({ id: "cancelled", status: "CANCELLED" }),
    ];
    const conflict = findConflictingReservation(
      { checkIn: "2026-09-12", checkOut: "2026-09-16", status: "RESERVED" },
      existing,
    );
    expect(conflict).toBeNull();
  });

  it("lets inquiries overlap confirmed stays because they do not block", () => {
    const conflict = findConflictingReservation(
      { checkIn: "2026-09-12", checkOut: "2026-09-16", status: "INQUIRY" },
      [confirmedStay()],
    );
    expect(conflict).toBeNull();
  });

  it("treats completed stays as still blocking their historical range", () => {
    const conflict = findConflictingReservation(
      { checkIn: "2026-09-12", checkOut: "2026-09-16", status: "RESERVED" },
      [confirmedStay({ id: "past", status: "COMPLETED" })],
    );
    expect(conflict?.id).toBe("past");
  });

  it("skips the reservation being edited but still detects others", () => {
    const existing = [confirmedStay({ id: "self" })];
    const selfEdit = findConflictingReservation(
      { checkIn: "2026-09-12", checkOut: "2026-09-16", status: "RESERVED" },
      existing,
      { excludeId: "self" },
    );
    expect(selfEdit).toBeNull();

    const clashWithOther = findConflictingReservation(
      { checkIn: "2026-09-12", checkOut: "2026-09-16", status: "RESERVED" },
      [...existing, confirmedStay({ id: "other" })],
      { excludeId: "self" },
    );
    expect(clashWithOther?.id).toBe("other");
  });
});

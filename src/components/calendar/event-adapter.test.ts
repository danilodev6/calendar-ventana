import { describe, expect, it } from "vitest";

import {
  buildReservationUrl,
  reservationToCalendarEvent,
  toCivilDateString,
} from "@/components/calendar/event-adapter";

describe("reservationToCalendarEvent", () => {
  it("passes civil dates through untouched with an exclusive end", () => {
    const event = reservationToCalendarEvent({
      id: "stay-1",
      guestName: "Laura Pérez",
      checkIn: "2026-09-12",
      checkOut: "2026-09-16",
      status: "RESERVED",
    });
    expect(event.start).toBe("2026-09-12");
    expect(event.end).toBe("2026-09-16");
    expect(event.allDay).toBe(true);
  });

  it("shows a short guest label with the Spanish status", () => {
    const event = reservationToCalendarEvent({
      id: "stay-1",
      guestName: "Laura Pérez",
      checkIn: "2026-09-12",
      checkOut: "2026-09-16",
      status: "INQUIRY",
    });
    expect(event.title).toBe("Laura Pérez · Consulta");
  });

  it("marks every status with a distinct styling hook", () => {
    const classes = (status: "INQUIRY" | "RESERVED" | "CANCELLED" | "COMPLETED") =>
      reservationToCalendarEvent({
        id: "stay-1",
        guestName: "Laura Pérez",
        checkIn: "2026-09-12",
        checkOut: "2026-09-16",
        status,
      }).classNames;
    expect(classes("INQUIRY")).toContain("calendar-event-inquiry");
    expect(classes("RESERVED")).toContain("calendar-event-reserved");
    expect(classes("CANCELLED")).toContain("calendar-event-cancelled");
    expect(classes("COMPLETED")).toContain("calendar-event-completed");
  });
});

describe("buildReservationUrl", () => {
  it("points event clicks at the reservation detail", () => {
    expect(buildReservationUrl("stay-1")).toBe("/reservations/stay-1");
  });
});

describe("toCivilDateString", () => {
  it("formats local parts without UTC shifts", () => {
    // Local midnight stays on the same civil day in any timezone.
    expect(toCivilDateString(new Date(2026, 8, 12))).toBe("2026-09-12");
    expect(toCivilDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

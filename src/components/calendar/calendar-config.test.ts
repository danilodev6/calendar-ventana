import { describe, expect, it } from "vitest";

import {
  CALENDAR_OPTIONS,
  THREE_MONTH_VIEW,
} from "@/components/calendar/calendar-config";

// Locks the Phase 8 spike decisions: three simultaneous months starting at
// the current one, one-month navigation steps, Spanish locale with Monday
// first, and no interactive editing features.
describe("calendar configuration", () => {
  it("shows the current month plus the next two in up to three columns", () => {
    expect(CALENDAR_OPTIONS.initialView).toBe(THREE_MONTH_VIEW);
    const views = CALENDAR_OPTIONS.views as Record<string, { type: string; duration: { months: number } }>;
    expect(views[THREE_MONTH_VIEW].type).toBe("multiMonth");
    expect(views[THREE_MONTH_VIEW].duration).toEqual({ months: 3 });
    expect(CALENDAR_OPTIONS.multiMonthMaxColumns).toBe(3);
  });

  it("moves a single month per step with Spanish controls", () => {
    expect(CALENDAR_OPTIONS.dateIncrement).toEqual({ months: 1 });
    expect(CALENDAR_OPTIONS.locale).toBe("es");
    expect(CALENDAR_OPTIONS.firstDay).toBe(1);
    expect(CALENDAR_OPTIONS.buttonText).toMatchObject({
      today: "Hoy",
      prev: "Anterior",
      next: "Siguiente",
    });
  });

  it("disables editing, selection and resource features", () => {
    expect(CALENDAR_OPTIONS.editable).toBe(false);
    expect(CALENDAR_OPTIONS.selectable).toBe(false);
    expect(CALENDAR_OPTIONS.navLinks).toBe(false);
  });
});

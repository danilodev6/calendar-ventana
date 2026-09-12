import { describe, expect, it } from "vitest";

import {
  compareCivilDates,
  formatCivilDate,
  formatMonthEs,
  formatStayRangeEs,
  HOME_TIME_ZONE,
  isValidCivilDate,
  nextMonthKey,
  nightsBetween,
  parseCivilDateParts,
  todayInTimeZone,
  toMonthKey,
} from "@/domain/dates";

describe("isValidCivilDate", () => {
  it("accepts well-formed calendar days", () => {
    expect(isValidCivilDate("2026-09-12")).toBe(true);
    expect(isValidCivilDate("2024-02-29")).toBe(true);
  });

  it("rejects nonexistent days including February 29th on non-leap years", () => {
    expect(isValidCivilDate("2023-02-29")).toBe(false);
    expect(isValidCivilDate("2026-02-30")).toBe(false);
    expect(isValidCivilDate("2026-04-31")).toBe(false);
    expect(isValidCivilDate("2026-13-01")).toBe(false);
    expect(isValidCivilDate("2026-00-10")).toBe(false);
    expect(isValidCivilDate("2026-09-00")).toBe(false);
  });

  it("rejects malformed values and non-strings", () => {
    expect(isValidCivilDate("12/09/2026")).toBe(false);
    expect(isValidCivilDate("2026-9-2")).toBe(false);
    expect(isValidCivilDate("2026-09-12T00:00")).toBe(false);
    expect(isValidCivilDate("")).toBe(false);
    expect(isValidCivilDate(null)).toBe(false);
    expect(isValidCivilDate(undefined)).toBe(false);
    expect(isValidCivilDate(20260912)).toBe(false);
  });
});

describe("parseCivilDateParts", () => {
  it("splits a canonical date into numeric parts", () => {
    expect(parseCivilDateParts("2026-09-12")).toEqual({
      year: 2026,
      month: 9,
      day: 12,
    });
  });

  it("returns null for invalid dates", () => {
    expect(parseCivilDateParts("2026-02-30")).toBeNull();
  });
});

describe("compareCivilDates", () => {
  it("orders canonical dates chronologically", () => {
    expect(compareCivilDates("2026-09-12", "2026-09-13")).toBe(-1);
    expect(compareCivilDates("2026-09-13", "2026-09-12")).toBe(1);
    expect(compareCivilDates("2026-09-12", "2026-09-12")).toBe(0);
  });
});

describe("nightsBetween", () => {
  it("counts one night for adjacent check-out/check-in days", () => {
    expect(nightsBetween("2026-09-12", "2026-09-13")).toBe(1);
  });

  it("counts several nights across month and year boundaries", () => {
    expect(nightsBetween("2026-09-12", "2026-09-16")).toBe(4);
    expect(nightsBetween("2026-01-30", "2026-02-02")).toBe(3);
    expect(nightsBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("counts leap-day stays correctly", () => {
    expect(nightsBetween("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("rejects invalid inputs instead of guessing", () => {
    expect(() => nightsBetween("2026-02-30", "2026-03-01")).toThrow();
  });
});

describe("toMonthKey", () => {
  it("extracts the YYYY-MM bucket", () => {
    expect(toMonthKey("2026-09-12")).toBe("2026-09");
  });
});

describe("formatCivilDate", () => {
  it("renders days as dd/MM/yyyy", () => {
    expect(formatCivilDate("2026-09-12")).toBe("12/09/2026");
    expect(formatCivilDate("2026-01-05")).toBe("05/01/2026");
  });
});

describe("formatMonthEs", () => {
  it("renders month keys as Spanish text", () => {
    expect(formatMonthEs("2026-09")).toBe("septiembre de 2026");
    expect(formatMonthEs("2026-01")).toBe("enero de 2026");
  });

  it("rejects malformed month keys", () => {
    expect(() => formatMonthEs("2026-13")).toThrow();
    expect(() => formatMonthEs("septiembre")).toThrow();
  });
});

describe("formatStayRangeEs", () => {
  it("renders stays within one month compactly", () => {
    expect(formatStayRangeEs("2026-09-12", "2026-09-16")).toBe(
      "del 12 al 16 de septiembre de 2026",
    );
  });

  it("names both months for cross-month stays", () => {
    expect(formatStayRangeEs("2026-08-28", "2026-09-02")).toBe(
      "del 28 de agosto al 2 de septiembre de 2026",
    );
  });

  it("names both years for cross-year stays", () => {
    expect(formatStayRangeEs("2026-12-30", "2027-01-02")).toBe(
      "del 30 de diciembre de 2026 al 2 de enero de 2027",
    );
  });

  it("rejects invalid inputs instead of guessing", () => {
    expect(() => formatStayRangeEs("2026-02-30", "2026-03-01")).toThrow();
  });
});

describe("todayInTimeZone", () => {
  it("derives the home civil day without UTC conversion", () => {
    // 2026-09-12 02:00 UTC is still September 11th in Buenos Aires (UTC-3).
    expect(
      todayInTimeZone(HOME_TIME_ZONE, new Date("2026-09-12T02:00:00Z")),
    ).toBe("2026-09-11");
    expect(
      todayInTimeZone(HOME_TIME_ZONE, new Date("2026-09-12T04:00:00Z")),
    ).toBe("2026-09-12");
  });

  it("returns a valid civil date for the default clock", () => {
    expect(isValidCivilDate(todayInTimeZone())).toBe(true);
  });
});

describe("nextMonthKey", () => {
  it("advances within the year", () => {
    expect(nextMonthKey("2026-09")).toBe("2026-10");
    expect(nextMonthKey("2026-01")).toBe("2026-02");
  });

  it("wraps December into January of the next year", () => {
    expect(nextMonthKey("2026-12")).toBe("2027-01");
  });

  it("rejects malformed month keys", () => {
    expect(() => nextMonthKey("2026-13")).toThrow();
    expect(() => nextMonthKey("septiembre")).toThrow();
  });
});

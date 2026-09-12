// Civil-date helpers.
//
// A civil date is a plain "YYYY-MM-DD" calendar day with no timezone or
// time-of-day attached. These helpers parse and compare the string directly
// and never build a Date from it, so results are identical on every OS,
// timezone and locale. The canonical format also sorts lexicographically
// in chronological order.

export const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

export interface CivilDateParts {
  year: number;
  month: number;
  day: number;
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

// Returns the calendar parts of a canonical civil date, or null when the
// value is malformed or does not exist (e.g. month 13, February 30th,
// February 29th on a non-leap year).
export function parseCivilDateParts(value: string): CivilDateParts | null {
  if (!CIVIL_DATE_PATTERN.test(value)) {
    return null;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12) {
    return null;
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

export function isValidCivilDate(value: unknown): value is string {
  return typeof value === "string" && parseCivilDateParts(value) !== null;
}

export function compareCivilDates(a: string, b: string): -1 | 0 | 1 {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function toUtcMidnight(parts: CivilDateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

// Counts whole calendar days in [checkIn, checkOut). Adjacent dates yield 1.
// Both inputs must be valid civil dates; anything else is a programming error.
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = parseCivilDateParts(checkIn);
  const end = parseCivilDateParts(checkOut);
  if (start === null || end === null) {
    throw new Error("nightsBetween requires two valid civil dates");
  }
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toUtcMidnight(end) - toUtcMidnight(start)) / millisecondsPerDay);
}

// Returns the "YYYY-MM" bucket a civil date belongs to.
export function toMonthKey(civilDate: string): string {
  return civilDate.slice(0, 7);
}

// Formats a civil date for display as "dd/MM/yyyy".
export function formatCivilDate(civilDate: string): string {
  const parts = parseCivilDateParts(civilDate);
  if (parts === null) {
    throw new Error("formatCivilDate requires a valid civil date");
  }
  const day = String(parts.day).padStart(2, "0");
  const month = String(parts.month).padStart(2, "0");
  return `${day}/${month}/${parts.year}`;
}

const MONTH_NAMES_ES = [  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

// Formats a "YYYY-MM" key for display, e.g. "septiembre de 2026".
export function formatMonthEs(monthKey: string): string {
  if (!MONTH_KEY_PATTERN.test(monthKey)) {
    throw new Error("formatMonthEs requires a YYYY-MM month key");
  }
  const month = Number(monthKey.slice(5, 7));
  if (month < 1 || month > 12) {
    throw new Error("formatMonthEs requires a YYYY-MM month key");
  }
  return `${MONTH_NAMES_ES[month - 1]} de ${monthKey.slice(0, 4)}`;
}

// Formats a stay as a Spanish range, e.g. "del 12 al 16 de septiembre de 2026".
export function formatStayRangeEs(checkIn: string, checkOut: string): string {
  const start = parseCivilDateParts(checkIn);
  const end = parseCivilDateParts(checkOut);
  if (start === null || end === null) {
    throw new Error("formatStayRangeEs requires two valid civil dates");
  }
  const startMonth = MONTH_NAMES_ES[start.month - 1];
  const endMonth = MONTH_NAMES_ES[end.month - 1];
  if (start.year === end.year && start.month === end.month) {
    return `del ${start.day} al ${end.day} de ${endMonth} de ${end.year}`;
  }
  if (start.year === end.year) {
    return `del ${start.day} de ${startMonth} al ${end.day} de ${endMonth} de ${end.year}`;
  }
  return `del ${start.day} de ${startMonth} de ${start.year} al ${end.day} de ${endMonth} de ${end.year}`;
}

// Home timezone for "today" calculations. Civil dates are never converted to
// UTC; instead "today" is derived in the home zone and compared as a plain
// YYYY-MM-DD string.
export const HOME_TIME_ZONE = "America/Argentina/Buenos_Aires";

// Returns "today" as a civil date in the given timezone. The en-CA locale
// formats as YYYY-MM-DD regardless of the runtime locale.
export function todayInTimeZone(
  timeZone: string = HOME_TIME_ZONE,
  now: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

import { PrismaClient } from "@/generated/prisma/client";
import type { ReservationModel } from "@/generated/prisma/models";
import { formatStayRangeEs, todayInTimeZone } from "@/domain/dates";
import {
  BLOCKING_STATUSES,
  blocksAvailability,
  type StayCandidate,
} from "@/domain/reservations";
import {
  reservationSchema,
  type ReservationInput,
} from "@/domain/schemas";
import { db } from "@/server/db";

// Server-side reservation service. Every create/update whose result blocks
// availability runs inside a serializable transaction guarded by a local
// mutex: the clash is re-queried inside the transaction and only then is the
// row written. This holds because v1 runs a single process against one
// SQLite file; a multi-process setup would need a database-level guarantee.

export interface ServiceOptions {
  client?: PrismaClient;
}

export interface FieldIssue {
  path: string;
  message: string;
}

// Expected failures use domain errors with Spanish messages safe for the UI.
// Technical details are never embedded in these messages.
export class ReservationValidationError extends Error {
  readonly code = "RESERVATION_VALIDATION";
  readonly fieldIssues: FieldIssue[];

  constructor(fieldIssues: FieldIssue[]) {
    super("La reserva tiene datos inválidos. Revisá los campos marcados.");
    this.name = "ReservationValidationError";
    this.fieldIssues = fieldIssues;
  }
}

export interface ConflictingStay {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
}

export class ReservationConflictError extends Error {
  readonly code = "RESERVATION_CONFLICT";
  readonly conflictingStay: ConflictingStay;

  constructor(conflictingStay: ConflictingStay) {
    super(
      `Estas fechas ya están ocupadas por la reserva de ${conflictingStay.guestName} ${formatStayRangeEs(conflictingStay.checkIn, conflictingStay.checkOut)}.`,
    );
    this.name = "ReservationConflictError";
    this.conflictingStay = conflictingStay;
  }
}

export class ReservationNotFoundError extends Error {
  readonly code = "RESERVATION_NOT_FOUND";

  constructor() {
    super("La reserva solicitada no existe o fue eliminada.");
    this.name = "ReservationNotFoundError";
  }
}

export class ReservationBusyError extends Error {
  readonly code = "RESERVATION_BUSY";

  constructor() {
    super("La base de datos está ocupada. Intentá nuevamente en unos segundos.");
    this.name = "ReservationBusyError";
  }
}

export class ReservationInvalidStateError extends Error {
  readonly code = "RESERVATION_INVALID_STATE";

  constructor(message: string) {
    super(message);
    this.name = "ReservationInvalidStateError";
  }
}

// Local promise-chain mutex, scoped to reservation writes in this process.
class WriteMutex {
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release: () => void = () => {};
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }
}

const reservationWriteMutex = new WriteMutex();

const MAX_BUSY_ATTEMPTS = 3;
const BUSY_RETRY_BASE_DELAY_MS = 25;

export function isBusyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ((error as { code?: unknown }).code === "P2034") {
    return true;
  }
  if (error instanceof Error) {
    return (
      error.message.includes("SQLITE_BUSY") ||
      /database (is|table is) locked/i.test(error.message)
    );
  }
  return false;
}

// Retries the whole operation (mutex, transaction, clash lookup and write)
// when SQLite reports a busy lock, never just the final insert/update.
export async function withBusyRetry<T>(
  operation: () => Promise<T>,
  attempts: number = MAX_BUSY_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isBusyError(error)) {
        throw error;
      }
      if (attempt >= attempts) {
        throw new ReservationBusyError();
      }
      await new Promise((resolve) => {
        setTimeout(resolve, BUSY_RETRY_BASE_DELAY_MS * attempt);
      });
    }
  }
}

function parseReservationInput(rawInput: unknown): ReservationInput {
  const parsed = reservationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ReservationValidationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path.map((segment) => String(segment)).join("."),
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

interface ClashReader {
  reservation: Pick<PrismaClient["reservation"], "findFirst">;
}

// Finds any blocking stay overlapping [checkIn, checkOut), excluding the
// stay being edited. Callers must invoke this inside the write transaction.
async function findClashingStay(
  reader: ClashReader,
  candidate: StayCandidate,
  excludeId?: string,
): Promise<ConflictingStay | null> {
  return reader.reservation.findFirst({
    where: {
      ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      status: { in: [...BLOCKING_STATUSES] },
      checkIn: { lt: candidate.checkOut },
      checkOut: { gt: candidate.checkIn },
    },
    orderBy: [{ checkIn: "asc" }, { id: "asc" }],
  });
}

export async function createReservation(
  rawInput: unknown,
  options: ServiceOptions = {},
): Promise<ReservationModel> {
  const input = parseReservationInput(rawInput);
  const client = options.client ?? db;
  if (!blocksAvailability(input.status)) {
    return client.reservation.create({ data: input });
  }
  return reservationWriteMutex.runExclusive(() =>
    withBusyRetry(() =>
      client.$transaction(async (tx) => {
        const clash = await findClashingStay(tx, input);
        if (clash !== null) {
          throw new ReservationConflictError(clash);
        }
        return tx.reservation.create({ data: input });
      }),
    ),
  );
}

export async function updateReservation(
  id: string,
  rawPatch: Partial<ReservationInput>,
  options: ServiceOptions = {},
): Promise<ReservationModel> {
  const client = options.client ?? db;
  const existing = await client.reservation.findUnique({ where: { id } });
  if (existing === null) {
    throw new ReservationNotFoundError();
  }
  // Rebuild the full input from storage so partial patches validate against
  // the same schema as creates. Timestamps and the id never enter validation.
  const stored: ReservationInput = {
    guestName: existing.guestName,
    phone: existing.phone,
    dni: existing.dni,
    email: existing.email,
    originCity: existing.originCity,
    guestCount: existing.guestCount,
    notes: existing.notes,
    checkIn: existing.checkIn,
    checkOut: existing.checkOut,
    status: existing.status,
    paymentStatus: existing.paymentStatus,
    totalAmount: existing.totalAmount,
    depositAmount: existing.depositAmount,
    channel: existing.channel,
  };
  const input = parseReservationInput({ ...stored, ...rawPatch });
  if (!blocksAvailability(input.status)) {
    return client.reservation.update({ where: { id }, data: input });
  }
  return reservationWriteMutex.runExclusive(() =>
    withBusyRetry(() =>
      client.$transaction(async (tx) => {
        const current = await tx.reservation.findUnique({ where: { id } });
        if (current === null) {
          throw new ReservationNotFoundError();
        }
        const clash = await findClashingStay(tx, input, id);
        if (clash !== null) {
          throw new ReservationConflictError(clash);
        }
        return tx.reservation.update({ where: { id }, data: input });
      }),
    ),
  );
}

export async function getReservationById(
  id: string,
  options: ServiceOptions = {},
): Promise<ReservationModel | null> {
  const client = options.client ?? db;
  return client.reservation.findUnique({ where: { id } });
}

// Cancels a stay while preserving its record: the status becomes CANCELLED,
// which frees the dates and removes any income. Cancelling twice is rejected
// so history cannot be rewritten by accident.
export async function cancelReservation(
  id: string,
  options: ServiceOptions = {},
): Promise<ReservationModel> {
  const client = options.client ?? db;
  const existing = await client.reservation.findUnique({ where: { id } });
  if (existing === null) {
    throw new ReservationNotFoundError();
  }
  if (existing.status === "CANCELLED") {
    throw new ReservationInvalidStateError("La reserva ya está cancelada.");
  }
  return updateReservation(id, { status: "CANCELLED" }, options);
}

// Permanently removes a stay. Reserved for load mistakes: cancelling keeps
// history, deleting erases it.
export async function deleteReservation(
  id: string,
  options: ServiceOptions = {},
): Promise<void> {
  const client = options.client ?? db;
  const existing = await client.reservation.findUnique({ where: { id } });
  if (existing === null) {
    throw new ReservationNotFoundError();
  }
  await client.reservation.delete({ where: { id } });
}

export interface StayRangeFilter {
  from: string;
  to: string;
}

// Lists stays intersecting the half-open [from, to) window, ordered for
// calendar display. Boundary-crossing stays are included.
export async function listReservationsByRange(
  filter: StayRangeFilter,
  options: ServiceOptions = {},
): Promise<ReservationModel[]> {
  const client = options.client ?? db;
  return client.reservation.findMany({
    where: {
      checkIn: { lt: filter.to },
      checkOut: { gt: filter.from },
    },
    orderBy: [{ checkIn: "asc" }, { checkOut: "asc" }, { id: "asc" }],
  });
}

// Minimal calendar projection. Money and payment data never leave the
// server for this view; the calendar only needs identity, name, range and
// status.
export interface CalendarStayJson {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: ReservationModel["status"];
}

export async function getCalendarStaysInRange(
  filter: StayRangeFilter,
  options: ServiceOptions = {},
): Promise<CalendarStayJson[]> {
  const stays = await listReservationsByRange(filter, options);
  return stays.map((stay) => ({
    id: stay.id,
    guestName: stay.guestName,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    status: stay.status,
  }));
}

// Shareable history filters. "upcoming" means a confirmed stay whose checkout
// is still ahead of the home civil day.
export const RESERVATION_FILTERS = [
  "all",
  "upcoming",
  "completed",
  "cancelled",
  "inquiries",
] as const;
export type ReservationFilter = (typeof RESERVATION_FILTERS)[number];

export function parseReservationFilter(value: unknown): ReservationFilter {
  if (
    typeof value === "string" &&
    (RESERVATION_FILTERS as readonly string[]).includes(value)
  ) {
    return value as ReservationFilter;
  }
  return "all";
}

export type SortDirection = "asc" | "desc";

export function parseSortDirection(value: unknown): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

export interface ReservationSearchInput {
  filter?: ReservationFilter;
  // Free guest-name text; matched case-insensitively (see searchReservations
  // for why the match runs outside the database query).
  search?: string;
  // Home civil day ("YYYY-MM-DD") used by the upcoming filter. Defaults to
  // today in the home timezone; injectable for deterministic tests.
  today?: string;
  // Check-in order, newest first by default. The id tiebreak always stays
  // ascending so repeated views are stable.
  sort?: SortDirection;
}

// Searches history by guest name with a status filter. Results come back
// ordered by check-in (newest first unless ascending is asked), so the
// history reads chronologically either way. Name matching stays in
// JavaScript because the SQLite driver rejects Prisma's case-insensitive
// mode; rows arrive already ordered from the parameterized query.
export async function searchReservations(
  input: ReservationSearchInput,
  options: ServiceOptions = {},
): Promise<ReservationModel[]> {
  const client = options.client ?? db;
  const filter = input.filter ?? "all";
  const search = input.search?.trim() ?? "";
  const today = input.today ?? todayInTimeZone();
  const sort = input.sort ?? "desc";

  const candidates = await client.reservation.findMany({
    where: {
      ...(filter === "all" ? {} : { status: statusForFilter(filter) }),
      ...(filter === "upcoming" ? { checkOut: { gt: today } } : {}),
    },
    orderBy: [{ checkIn: sort }, { checkOut: sort }, { id: "asc" }],
  });
  if (search === "") {
    return candidates;
  }
  const needle = search.toLowerCase();
  return candidates.filter((stay) =>
    stay.guestName.toLowerCase().includes(needle),
  );
}

function statusForFilter(
  filter: ReservationFilter,
): ReservationModel["status"] | undefined {
  switch (filter) {
    case "upcoming":
      return "RESERVED";
    case "completed":
      return "COMPLETED";
    case "cancelled":
      return "CANCELLED";
    case "inquiries":
      return "INQUIRY";
    case "all":
      return undefined;
  }
}

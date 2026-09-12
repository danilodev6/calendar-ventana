// Reservation availability rules as pure functions.
// Occupancy uses the half-open interval [checkIn, checkOut): the checkout day
// itself is free, so an adjacent stay never overlaps.

export const RESERVATION_STATUSES = [
  "INQUIRY",
  "RESERVED",
  "CANCELLED",
  "COMPLETED",
] as const;
export type ReservationStatus =
  (typeof RESERVATION_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "UNPAID",
  "DEPOSIT_PAID",
  "PAID_FULL",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_CHANNELS = [
  "DIRECT",
  "AIRBNB",
  "BOOKING",
  "OTHER",
] as const;
export type BookingChannel = (typeof BOOKING_CHANNELS)[number];

// Only confirmed and completed stays occupy dates. Completed stays keep
// blocking their historical range because they represent a real stay, while
// inquiries and cancellations never block.
const BLOCKING_STATUSES: ReadonlySet<ReservationStatus> = new Set([
  "RESERVED",
  "COMPLETED",
]);

export function blocksAvailability(status: ReservationStatus): boolean {
  return BLOCKING_STATUSES.has(status);
}

// Two stays conflict when A.checkIn < B.checkOut && A.checkOut > B.checkIn.
// Canonical "YYYY-MM-DD" strings compare chronologically, so no Date math
// is needed here.
export function rangesOverlap(
  aCheckIn: string,
  aCheckOut: string,
  bCheckIn: string,
  bCheckOut: string,
): boolean {
  return aCheckIn < bCheckOut && aCheckOut > bCheckIn;
}

export interface ReservationRange {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
}

export interface StayCandidate {
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
}

// Returns the first existing reservation incompatible with the candidate, or
// null when the stay fits. Non-blocking candidates (inquiries, cancellations)
// never conflict, and the reservation being edited is skipped via excludeId.
export function findConflictingReservation(
  candidate: StayCandidate,
  existing: readonly ReservationRange[],
  options?: { excludeId?: string },
): ReservationRange | null {
  if (!blocksAvailability(candidate.status)) {
    return null;
  }
  for (const other of existing) {
    if (options?.excludeId !== undefined && other.id === options.excludeId) {
      continue;
    }
    if (!blocksAvailability(other.status)) {
      continue;
    }
    if (
      rangesOverlap(
        candidate.checkIn,
        candidate.checkOut,
        other.checkIn,
        other.checkOut,
      )
    ) {
      return other;
    }
  }
  return null;
}

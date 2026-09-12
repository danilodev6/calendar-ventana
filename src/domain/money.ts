import type {
  PaymentStatus,
  ReservationStatus,
} from "@/domain/reservations";

// Amounts are whole Argentine pesos with no cents, stored as integers to
// avoid floating-point math. The upper bound is the Prisma Int maximum so
// every accepted value fits the database column.
export const MAX_PESO_AMOUNT = 2147483647;

export function isValidPesoAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_PESO_AMOUNT
  );
}

export interface StayCharges {
  totalAmount: number;
  depositAmount: number;
  paymentStatus: PaymentStatus;
}

// The pending balance is always derived, never stored: zero once the stay is
// fully paid, otherwise total minus deposit floored at zero.
export function calculatePendingBalance(charges: StayCharges): number {
  if (charges.paymentStatus === "PAID_FULL") {
    return 0;
  }
  return Math.max(charges.totalAmount - charges.depositAmount, 0);
}

// Only fully paid confirmed or completed stays count as income. The deposit
// field is informational and never added on top of the total.
export function isIncomeEligible(
  status: ReservationStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return (
    paymentStatus === "PAID_FULL" &&
    (status === "RESERVED" || status === "COMPLETED")
  );
}

export interface CountableStay {
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
}

export function getCountableIncome(stay: CountableStay): number {
  return isIncomeEligible(stay.status, stay.paymentStatus)
    ? stay.totalAmount
    : 0;
}

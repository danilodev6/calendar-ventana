import { describe, expect, it } from "vitest";

import {
  MAX_PESO_AMOUNT,
  calculatePendingBalance,
  getCountableIncome,
  isIncomeEligible,
  isValidPesoAmount,
} from "@/domain/money";

describe("isValidPesoAmount", () => {
  it("accepts whole non-negative pesos within the database range", () => {
    expect(isValidPesoAmount(0)).toBe(true);
    expect(isValidPesoAmount(500000)).toBe(true);
    expect(isValidPesoAmount(MAX_PESO_AMOUNT)).toBe(true);
  });

  it("rejects negative values, fractions, overflow and non-numbers", () => {
    expect(isValidPesoAmount(-1)).toBe(false);
    expect(isValidPesoAmount(10.5)).toBe(false);
    expect(isValidPesoAmount(MAX_PESO_AMOUNT + 1)).toBe(false);
    expect(isValidPesoAmount("500000")).toBe(false);
    expect(isValidPesoAmount(NaN)).toBe(false);
  });
});

describe("calculatePendingBalance", () => {
  it("derives the remaining balance from total minus deposit", () => {
    expect(
      calculatePendingBalance({
        totalAmount: 500000,
        depositAmount: 100000,
        paymentStatus: "DEPOSIT_PAID",
      }),
    ).toBe(400000);
  });

  it("returns zero once the stay is fully paid, ignoring any deposit kept", () => {
    expect(
      calculatePendingBalance({
        totalAmount: 500000,
        depositAmount: 100000,
        paymentStatus: "PAID_FULL",
      }),
    ).toBe(0);
    expect(
      calculatePendingBalance({
        totalAmount: 500000,
        depositAmount: 0,
        paymentStatus: "PAID_FULL",
      }),
    ).toBe(0);
  });

  it("floors inconsistent over-deposits at zero instead of going negative", () => {
    expect(
      calculatePendingBalance({
        totalAmount: 100000,
        depositAmount: 150000,
        paymentStatus: "UNPAID",
      }),
    ).toBe(0);
  });
});

describe("isIncomeEligible and getCountableIncome", () => {
  it("counts exactly the total for fully paid confirmed or completed stays", () => {
    expect(
      getCountableIncome({
        status: "RESERVED",
        paymentStatus: "PAID_FULL",
        totalAmount: 500000,
      }),
    ).toBe(500000);
    expect(
      getCountableIncome({
        status: "COMPLETED",
        paymentStatus: "PAID_FULL",
        totalAmount: 500000,
      }),
    ).toBe(500000);
  });

  it("never adds the deposit on top of the total", () => {
    expect(
      getCountableIncome({
        status: "RESERVED",
        paymentStatus: "PAID_FULL",
        totalAmount: 500000,
      }),
    ).not.toBe(600000);
  });

  it("counts zero for unpaid or partially paid stays", () => {
    expect(isIncomeEligible("RESERVED", "UNPAID")).toBe(false);
    expect(isIncomeEligible("RESERVED", "DEPOSIT_PAID")).toBe(false);
    expect(
      getCountableIncome({
        status: "RESERVED",
        paymentStatus: "DEPOSIT_PAID",
        totalAmount: 500000,
      }),
    ).toBe(0);
  });

  it("excludes inquiries and cancellations even when fully paid", () => {
    expect(isIncomeEligible("INQUIRY", "PAID_FULL")).toBe(false);
    expect(isIncomeEligible("CANCELLED", "PAID_FULL")).toBe(false);
    expect(
      getCountableIncome({
        status: "CANCELLED",
        paymentStatus: "PAID_FULL",
        totalAmount: 500000,
      }),
    ).toBe(0);
  });
});

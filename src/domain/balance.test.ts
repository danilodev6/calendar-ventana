import { describe, expect, it } from "vitest";

import {
  summarizeBalance,
  type BalanceExpense,
  type BalanceReservation,
} from "@/domain/balance";

function paidStay(overrides: Partial<BalanceReservation> = {}): BalanceReservation {
  return {
    id: "stay-1",
    guestName: "Laura Pérez",
    checkIn: "2026-09-12",
    status: "RESERVED",
    paymentStatus: "PAID_FULL",
    totalAmount: 500000,
    ...overrides,
  };
}

function expense(overrides: Partial<BalanceExpense> = {}): BalanceExpense {
  return {
    id: "expense-1",
    description: "Limpieza",
    date: "2026-09-05",
    amount: 80000,
    ...overrides,
  };
}

describe("summarizeBalance", () => {
  it("assigns income to the check-in month, not to payment time", () => {
    const reservations = [paidStay({ checkIn: "2026-08-28" })];
    const september = summarizeBalance({
      reservations,
      expenses: [],
      month: "2026-09",
    });
    expect(september.incomeTotal).toBe(0);
    const august = summarizeBalance({
      reservations,
      expenses: [],
      month: "2026-08",
    });
    expect(august.incomeTotal).toBe(500000);
  });

  it("counts a deposit as zero income until the stay is fully paid", () => {
    const reservations = [
      paidStay({
        paymentStatus: "DEPOSIT_PAID",
        totalAmount: 500000,
      }),
    ];
    const partial = summarizeBalance({
      reservations,
      expenses: [],
      month: "2026-09",
    });
    expect(partial.incomeTotal).toBe(0);

    const full = summarizeBalance({
      reservations: [{ ...reservations[0], paymentStatus: "PAID_FULL" }],
      expenses: [],
      month: "2026-09",
    });
    expect(full.incomeTotal).toBe(500000);
  });

  it("removes the income when a stay is cancelled", () => {
    const summary = summarizeBalance({
      reservations: [paidStay({ status: "CANCELLED" })],
      expenses: [],
      month: "2026-09",
    });
    expect(summary.incomeTotal).toBe(0);
    expect(summary.incomeItems).toHaveLength(0);
  });

  it("keeps the income when a stay is completed", () => {
    const summary = summarizeBalance({
      reservations: [paidStay({ status: "COMPLETED" })],
      expenses: [],
      month: "2026-09",
    });
    expect(summary.incomeTotal).toBe(500000);
  });

  it("assigns each expense to its own date month", () => {
    const expenses = [
      expense({ id: "august", date: "2026-08-20", amount: 30000 }),
      expense({ id: "september", date: "2026-09-05", amount: 80000 }),
    ];
    const summary = summarizeBalance({
      reservations: [],
      expenses,
      month: "2026-09",
    });
    expect(summary.expenseTotal).toBe(80000);
    expect(summary.expenseItems.map((item) => item.expenseId)).toEqual([
      "september",
    ]);
  });

  it("aggregates every record without a month filter in the historical view", () => {
    const summary = summarizeBalance({
      reservations: [
        paidStay({ id: "august-stay", checkIn: "2026-08-28" }),
        paidStay({ id: "september-stay", checkIn: "2026-09-12" }),
        paidStay({ id: "cancelled-stay", checkIn: "2026-09-20", status: "CANCELLED" }),
      ],
      expenses: [expense({ date: "2026-07-01", amount: 50000 })],
    });
    expect(summary.month).toBeNull();
    expect(summary.incomeTotal).toBe(1000000);
    expect(summary.expenseTotal).toBe(50000);
    expect(summary.result).toBe(950000);
  });

  it("allows a negative result when expenses exceed income", () => {
    const summary = summarizeBalance({
      reservations: [],
      expenses: [expense({ amount: 120000 })],
      month: "2026-09",
    });
    expect(summary.result).toBe(-120000);
  });

  it("lists countable stays and expenses so figures stay auditable", () => {
    const summary = summarizeBalance({
      reservations: [paidStay()],
      expenses: [expense()],
      month: "2026-09",
    });
    expect(summary.incomeItems).toEqual([
      {
        reservationId: "stay-1",
        guestName: "Laura Pérez",
        checkIn: "2026-09-12",
        amount: 500000,
      },
    ]);
    expect(summary.expenseItems).toHaveLength(1);
  });
});

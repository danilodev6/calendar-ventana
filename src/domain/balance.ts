import { toMonthKey } from "@/domain/dates";
import { getCountableIncome } from "@/domain/money";
import type {
  PaymentStatus,
  ReservationStatus,
} from "@/domain/reservations";

export interface BalanceReservation {
  id: string;
  guestName: string;
  checkIn: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
}

export interface BalanceExpense {
  id: string;
  description: string;
  date: string;
  amount: number;
}

export interface IncomeItem {
  reservationId: string;
  guestName: string;
  checkIn: string;
  amount: number;
}

export interface ExpenseItem {
  expenseId: string;
  description: string;
  date: string;
  amount: number;
}

export interface BalanceSummary {
  // "YYYY-MM" for a monthly view, null for the historical view.
  month: string | null;
  incomeTotal: number;
  expenseTotal: number;
  result: number;
  incomeItems: IncomeItem[];
  expenseItems: ExpenseItem[];
}

export interface BalanceInput {
  reservations: readonly BalanceReservation[];
  expenses: readonly BalanceExpense[];
  // When present, income is assigned by check-in month and expenses by their
  // own date month; when absent, every record counts (historical view).
  month?: string;
}

// Aggregates income and expenses with the single v1 rule set: income counts
// exactly the total of fully paid confirmed/completed stays, assigned to the
// check-in month, and result is income minus expenses.
export function summarizeBalance(input: BalanceInput): BalanceSummary {
  const incomeItems: IncomeItem[] = [];
  for (const reservation of input.reservations) {
    if (input.month !== undefined && toMonthKey(reservation.checkIn) !== input.month) {
      continue;
    }
    const amount = getCountableIncome(reservation);
    if (amount > 0) {
      incomeItems.push({
        reservationId: reservation.id,
        guestName: reservation.guestName,
        checkIn: reservation.checkIn,
        amount,
      });
    }
  }

  const expenseItems: ExpenseItem[] = [];
  for (const expense of input.expenses) {
    if (input.month !== undefined && toMonthKey(expense.date) !== input.month) {
      continue;
    }
    expenseItems.push({
      expenseId: expense.id,
      description: expense.description,
      date: expense.date,
      amount: expense.amount,
    });
  }

  const incomeTotal = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenseItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    month: input.month ?? null,
    incomeTotal,
    expenseTotal,
    result: incomeTotal - expenseTotal,
    incomeItems,
    expenseItems,
  };
}

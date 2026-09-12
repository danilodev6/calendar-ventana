import {
  summarizeBalance,
  type BalanceSummary,
} from "@/domain/balance";
import { db } from "@/server/db";
import type { ServiceOptions } from "@/server/reservations";

export interface BalanceQuery {
  // "YYYY-MM" for a monthly view; omit for the historical view.
  month?: string;
}

// Single balance service for monthly and historical views. It loads both
// collections once and runs the one pure aggregation from the domain layer,
// so monthly and historical figures can never drift apart.
export async function getBalance(
  query: BalanceQuery,
  options: ServiceOptions = {},
): Promise<BalanceSummary> {
  const client = options.client ?? db;
  const [reservations, expenses] = await Promise.all([
    client.reservation.findMany({
      orderBy: [{ checkIn: "asc" }, { id: "asc" }],
    }),
    client.expense.findMany({
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
  ]);
  return summarizeBalance({
    reservations,
    expenses,
    month: query.month,
  });
}

import type { Metadata } from "next";
import Link from "next/link";

import { formatCivilDate, formatMonthEs, isValidMonthKey, nextMonthKey, prevMonthKey, todayInTimeZone } from "@/domain/dates";
import { getBalance } from "@/server/balance";
import { listExpensesByMonth } from "@/server/expenses";
import { ExpenseList } from "@/components/balance/expense-list";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPesos } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Balance | Reservas Casa",
  description: "Ingresos, gastos y resultado",
};

interface BalancePageProps {
  searchParams: Promise<{ month?: string; view?: string }>;
}

function monthHref(month: string): string {
  return `/balance?month=${month}`;
}

// Monthly and historical balance. Income counts fully paid confirmed or
// completed stays once, assigned to their check-in month; expenses count by
// their own date. Figures come from the single domain aggregation, and the
// breakdown below keeps every peso auditable.
export default async function BalancePage({ searchParams }: BalancePageProps) {
  const params = await searchParams;
  const isHistory = params.view === "history";
  const month = isValidMonthKey(params.month)
    ? params.month
    : todayInTimeZone().slice(0, 7);

  const summary = await getBalance(isHistory ? {} : { month });
  const expenses = isHistory
    ? summary.expenseItems.map((item) => ({
        id: item.expenseId,
        date: item.date,
        description: item.description,
        amount: item.amount,
      }))
    : await listExpensesByMonth(month);

  const periodTitle = isHistory
    ? "Histórico"
    : formatMonthEs(month);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Balance
        </h1>
        <Link
          href="/balance/expenses/new"
          className={cn(buttonVariants(), "text-lg md:w-auto")}
        >
          Agregar gasto
        </Link>
      </div>

      <nav aria-label="Período del balance" className="flex flex-wrap items-center gap-2">
        {isHistory ? (
          <>
            <span className="rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-base font-medium text-white">
              Histórico
            </span>
            <Link
              href="/balance"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Mes actual
            </Link>
          </>
        ) : (
          <>
            <Link
              href={monthHref(prevMonthKey(month))}
              aria-label="Mes anterior"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-700 hover:bg-zinc-100"
            >
              ← Anterior
            </Link>
            <Link
              href="/balance?view=history"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Histórico
            </Link>
            <Link
              href={monthHref(nextMonthKey(month))}
              aria-label="Mes siguiente"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Siguiente →
            </Link>
          </>
        )}
      </nav>

      <h2 className="text-2xl font-semibold tracking-tight">{periodTitle}</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight md:text-4xl">
              {formatPesos(summary.incomeTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight md:text-4xl">
              {formatPesos(summary.expenseTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-3xl font-bold tracking-tight md:text-4xl",
                summary.result < 0 && "text-red-700",
              )}
            >
              {formatPesos(summary.result)}
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-base text-zinc-600">
        Ingresos: reservas pagadas completas, asignadas al mes de entrada.
      </p>

      <section aria-label="Reservas contadas" className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold tracking-tight">
          Reservas contadas ({summary.incomeItems.length})
        </h3>
        {summary.incomeItems.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-6 text-base text-zinc-600">
            No hay ingresos en este período.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {summary.incomeItems.map((item) => (
              <li
                key={item.reservationId}
                className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-base font-medium">{item.guestName}</p>
                  <p className="text-sm text-zinc-600">
                    Entrada el {formatCivilDate(item.checkIn)}
                  </p>
                </div>
                <p className="text-base font-semibold md:text-right">
                  {formatPesos(item.amount)}
                </p>
                <Link
                  href={`/reservations/${item.reservationId}`}
                  className="inline-flex min-h-12 items-center font-medium text-blue-700 underline underline-offset-2"
                >
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-label={isHistory ? "Gastos" : `Gastos de ${formatMonthEs(month)}`}
        className="flex flex-col gap-3"
      >
        <h3 className="text-xl font-semibold tracking-tight">
          {isHistory ? "Gastos" : `Gastos de ${formatMonthEs(month)}`}
        </h3>
        <ExpenseList expenses={expenses} />
      </section>
    </div>
  );
}

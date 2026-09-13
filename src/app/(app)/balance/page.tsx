import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

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
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <header>
          <p className="mb-1 text-sm font-semibold tracking-wide text-amber-600 uppercase">
            Resumen económico
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
            Balance
          </h1>
          <p className="mt-2 text-base text-zinc-600">
            Ingresos, gastos y resultado del período seleccionado.
          </p>
        </header>
        <Link
          href="/balance/expenses/new"
          className={cn(buttonVariants(), "gap-2 text-base md:w-auto")}
        >
          <Plus aria-hidden="true" />
          Agregar gasto
        </Link>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Período del balance" className="flex flex-wrap items-center gap-2">
        {isHistory ? (
          <>
            <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm leading-none font-semibold text-white">
              Histórico
            </span>
            <Link
              href="/balance"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm leading-none font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Mes actual
            </Link>
          </>
        ) : (
          <>
            <Link
              href={monthHref(prevMonthKey(month))}
              aria-label="Mes anterior"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm leading-none font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Anterior
            </Link>
            <Link
              href="/balance?view=history"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm leading-none font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Histórico
            </Link>
            <Link
              href={monthHref(nextMonthKey(month))}
              aria-label="Mes siguiente"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm leading-none font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Siguiente
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </>
        )}
      </nav>
      <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-right">
        {periodTitle}
      </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader>
            <CardTitle className="text-emerald-900">Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-emerald-700 md:text-4xl">
              {formatPesos(summary.incomeTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-rose-200/80 bg-gradient-to-br from-rose-50 to-white">
          <CardHeader>
            <CardTitle className="text-red-900">Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-red-700 md:text-4xl">
              {formatPesos(summary.expenseTotal)}
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            summary.result < 0
              ? "border-rose-200 bg-gradient-to-br from-rose-50 to-white"
              : summary.result > 0
                ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white"
                : undefined,
          )}
        >
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-3xl font-bold tracking-tight md:text-4xl",
                summary.result < 0
                  ? "text-red-700"
                  : summary.result > 0
                    ? "text-blue-700"
                    : undefined,
              )}
            >
              {formatPesos(summary.result)}
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="-mt-2 rounded-xl bg-zinc-100/80 px-4 py-3 text-sm text-zinc-600">
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
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:flex-row md:items-center"
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
                  className={buttonVariants({ variant: "info", className: "min-h-9 rounded-lg px-4 py-1 text-sm" })}
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

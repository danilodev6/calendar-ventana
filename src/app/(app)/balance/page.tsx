import type { Metadata } from "next";
import Link from "next/link";

import { formatMonthEs, todayInTimeZone } from "@/domain/dates";
import { listExpensesByMonth } from "@/server/expenses";
import { ExpenseList } from "@/components/balance/expense-list";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Balance | Reservas Casa",
  description: "Ingresos, gastos y resultado",
};

// Balance screen. Phase 9 manages this month's expenses here; income figures
// and period navigation arrive in Phase 10.
export default async function BalancePage() {
  const month = todayInTimeZone().slice(0, 7);
  const expenses = await listExpensesByMonth(month);

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

      <Card>
        <CardHeader>
          <CardTitle>Próximamente: ingresos y resultado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-600">
            Acá se verán los ingresos por reservas pagadas y el resultado del
            mes. Esas cifras se construyen en la Fase 10.
          </p>
        </CardContent>
      </Card>

      <section aria-label={`Gastos de ${formatMonthEs(month)}`} className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Gastos de {formatMonthEs(month)}
        </h2>
        <ExpenseList expenses={expenses} />
      </section>
    </div>
  );
}

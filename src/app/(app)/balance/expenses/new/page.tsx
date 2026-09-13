import type { Metadata } from "next";

import { ExpenseForm } from "@/components/balance/expense-form";

export const metadata: Metadata = {
  title: "Agregar gasto | Reservas Casa",
  description: "Registrar un gasto del mes",
};

export default function NewExpensePage() {
  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="mb-1 text-sm font-semibold tracking-wide text-amber-600 uppercase">
          Balance
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
          Agregar gasto
        </h1>
        <p className="mt-2 text-base text-zinc-600">
          Registrá un gasto con su fecha, descripción e importe.
        </p>
      </header>
      <ExpenseForm />
    </div>
  );
}

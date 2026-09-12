import type { Metadata } from "next";

import { ExpenseForm } from "@/components/balance/expense-form";

export const metadata: Metadata = {
  title: "Agregar gasto | Reservas Casa",
  description: "Registrar un gasto del mes",
};

export default function NewExpensePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Agregar gasto
      </h1>
      <ExpenseForm />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { ExpenseInput } from "@/domain/schemas";
import { getExpenseById } from "@/server/expenses";
import { ExpenseForm } from "@/components/balance/expense-form";

export const metadata: Metadata = {
  title: "Editar gasto | Reservas Casa",
  description: "Modificar un gasto registrado",
};

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expense = await getExpenseById(id);
  if (expense === null) {
    notFound();
  }

  const initialValues: ExpenseInput = {
    date: expense.date,
    description: expense.description,
    amount: expense.amount,
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Editar gasto
      </h1>
      <ExpenseForm expenseId={id} initialValues={initialValues} />
    </div>
  );
}

"use client";

import Link from "next/link";

import { formatCivilDate } from "@/domain/dates";
import { DeleteExpenseButton } from "@/components/balance/delete-expense-button";
import { formatPesos } from "@/lib/format";

export interface ExpenseListItem {
  id: string;
  date: string;
  description: string;
  amount: number;
}

interface ExpenseListProps {
  expenses: ExpenseListItem[];
  onDeleted?: (expenseId: string) => void;
}

// Expenses of one month, oldest first, with visible edit and delete actions.
export function ExpenseList({ expenses, onDeleted }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-6 text-base text-zinc-600">
        No hay gastos en este período.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-base font-medium">{expense.description}</p>
            <p className="text-sm text-zinc-600">{formatCivilDate(expense.date)}</p>
          </div>
          <p className="text-base font-semibold md:text-right">
            {formatPesos(expense.amount)}
          </p>
          <div className="flex gap-3">
            <Link
              href={`/balance/expenses/${expense.id}/edit`}
              className="font-medium text-blue-700 underline underline-offset-2"
            >
              Editar
            </Link>
            <DeleteExpenseButton
              expenseId={expense.id}
              description={expense.description}
              onDeleted={onDeleted}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

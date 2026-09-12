"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldPath, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { todayInTimeZone } from "@/domain/dates";
import { expenseSchema, type ExpenseInput } from "@/domain/schemas";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createExpenseAction,
  updateExpenseAction,
} from "@/server/expense-actions";

const inputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base";

function FieldError({ message }: { message?: string }) {
  if (message === undefined || message === "") {
    return null;
  }
  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

// Shared create/edit form with the smallest possible shape: date,
// description and whole-peso amount. The same schema validates here and on
// the server.
export interface ExpenseFormProps {
  // When present the form edits that expense instead of creating a new one.
  expenseId?: string;
  initialValues?: Partial<ExpenseInput>;
}

export function ExpenseForm({ expenseId, initialValues }: ExpenseFormProps = {}) {
  const router = useRouter();
  const [businessError, setBusinessError] = useState<string | null>(null);
  const isEditing = expenseId !== undefined;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseInput>,
    defaultValues: {
      date: todayInTimeZone(),
      description: "",
      ...initialValues,
    },
  });

  const onSubmit: SubmitHandler<ExpenseInput> = async (values) => {
    setBusinessError(null);
    const result = isEditing
      ? await updateExpenseAction({ id: expenseId, input: values })
      : await createExpenseAction(values);
    if (result.ok) {
      router.push("/balance");
      return;
    }
    for (const issue of result.fieldIssues) {
      setError(issue.path as FieldPath<ExpenseInput>, {
        type: "server",
        message: issue.message,
      });
    }
    setBusinessError(result.message);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {businessError !== null && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-base font-medium text-red-800"
        >
          {businessError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos del gasto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="expense-date" className="text-base font-medium">
              Fecha
            </label>
            <input
              id="expense-date"
              type="date"
              className={inputClassName}
              {...register("date")}
            />
            <FieldError message={errors.date?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="expense-description" className="text-base font-medium">
              Descripción
            </label>
            <input
              id="expense-description"
              type="text"
              className={inputClassName}
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="expense-amount" className="text-base font-medium">
              Monto en pesos
            </label>
            <input
              id="expense-amount"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              className={cn(inputClassName, "text-right")}
              {...register("amount", { valueAsNumber: true })}
            />
            <FieldError message={errors.amount?.message} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Link href="/balance" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : isEditing
              ? "Guardar cambios"
              : "Guardar gasto"}
        </Button>
      </div>
    </form>
  );
}

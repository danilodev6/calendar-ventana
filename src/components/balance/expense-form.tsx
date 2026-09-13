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
import { PesoInput } from "@/components/ui/peso-input";
import { cn } from "@/lib/utils";
import {
  createExpenseAction,
  updateExpenseAction,
} from "@/server/expense-actions";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-base text-zinc-900 shadow-sm outline-none transition-colors hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

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
    control,
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

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,34rem)_auto] md:justify-start">
        <Card className="w-full p-5 md:p-7">
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
            <PesoInput
              name="amount"
              control={control}
              id="expense-amount"
              className={cn(inputClassName, "text-right")}
            />
            <FieldError message={errors.amount?.message} />
          </div>
        </CardContent>
      </Card>

        <div className="flex flex-row gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm md:flex-col">
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
      </div>
    </form>
  );
}

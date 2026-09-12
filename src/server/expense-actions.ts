"use server";

import { revalidatePath } from "next/cache";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ExpenseInput } from "@/domain/schemas";
import { db } from "@/server/db";
import {
  ExpenseNotFoundError,
  ExpenseValidationError,
  createExpense,
  deleteExpense,
  updateExpense,
  type ExpenseFieldIssue,
} from "@/server/expenses";

// Expense mutations from the Balance screen. Same conventions as the
// reservation actions: plain serializable results, Spanish messages, and a
// testable core with an explicit client kept free of cache effects.
export interface SaveExpenseSuccess {
  ok: true;
  expenseId: string;
}

export interface SaveExpenseFailure {
  ok: false;
  message: string;
  fieldIssues: ExpenseFieldIssue[];
}

export type SaveExpenseResult = SaveExpenseSuccess | SaveExpenseFailure;

export interface ExpenseMutationResult {
  ok: boolean;
  message: string;
}

function toFailure(error: unknown, operation: string): SaveExpenseFailure {
  if (error instanceof ExpenseValidationError) {
    return {
      ok: false,
      message: error.message,
      fieldIssues: error.fieldIssues,
    };
  }
  if (error instanceof ExpenseNotFoundError) {
    return { ok: false, message: error.message, fieldIssues: [] };
  }
  console.error(`Unexpected expense ${operation} failure`, error);
  return {
    ok: false,
    message: "Ocurrió un error inesperado. Intentá nuevamente.",
    fieldIssues: [],
  };
}

function revalidateBalance(): void {
  revalidatePath("/balance");
}

export async function createExpenseActionWithClient(
  input: ExpenseInput,
  client: PrismaClient,
): Promise<SaveExpenseResult> {
  try {
    const expense = await createExpense(input, { client });
    return { ok: true, expenseId: expense.id };
  } catch (error) {
    return toFailure(error, "creation");
  }
}

export async function createExpenseAction(
  input: ExpenseInput,
): Promise<SaveExpenseResult> {
  const result = await createExpenseActionWithClient(input, db);
  if (result.ok) {
    revalidateBalance();
  }
  return result;
}

export interface UpdateExpensePayload {
  id: string;
  input: Partial<ExpenseInput>;
}

export async function updateExpenseActionWithClient(
  payload: UpdateExpensePayload,
  client: PrismaClient,
): Promise<SaveExpenseResult> {
  try {
    const expense = await updateExpense(payload.id, payload.input, {
      client,
    });
    return { ok: true, expenseId: expense.id };
  } catch (error) {
    return toFailure(error, "update");
  }
}

export async function updateExpenseAction(
  payload: UpdateExpensePayload,
): Promise<SaveExpenseResult> {
  const result = await updateExpenseActionWithClient(payload, db);
  if (result.ok) {
    revalidateBalance();
  }
  return result;
}

export async function deleteExpenseActionWithClient(
  id: string,
  client: PrismaClient,
): Promise<ExpenseMutationResult> {
  try {
    await deleteExpense(id, { client });
    return { ok: true, message: "El gasto se eliminó correctamente." };
  } catch (error) {
    const failure = toFailure(error, "deletion");
    return { ok: failure.ok, message: failure.message };
  }
}

export async function deleteExpenseAction(
  id: string,
): Promise<ExpenseMutationResult> {
  const result = await deleteExpenseActionWithClient(id, db);
  if (result.ok) {
    revalidateBalance();
  }
  return result;
}

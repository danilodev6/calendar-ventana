import type { ExpenseModel } from "@/generated/prisma/models";
import { isValidCivilDate, nextMonthKey } from "@/domain/dates";
import { expenseSchema, type ExpenseInput } from "@/domain/schemas";
import { db } from "@/server/db";
import type { ServiceOptions } from "@/server/reservations";

// Server-side expense service. Expenses are standalone monthly records with
// no categories and no link to stays, validated by the shared Zod schema.

export interface ExpenseFieldIssue {
  path: string;
  message: string;
}

export class ExpenseValidationError extends Error {
  readonly code = "EXPENSE_VALIDATION";
  readonly fieldIssues: ExpenseFieldIssue[];

  constructor(fieldIssues: ExpenseFieldIssue[]) {
    super("El gasto tiene datos inválidos. Revisá los campos marcados.");
    this.name = "ExpenseValidationError";
    this.fieldIssues = fieldIssues;
  }
}

export class ExpenseNotFoundError extends Error {
  readonly code = "EXPENSE_NOT_FOUND";

  constructor() {
    super("El gasto solicitado no existe o fue eliminado.");
    this.name = "ExpenseNotFoundError";
  }
}

function parseExpenseInput(rawInput: unknown): ExpenseInput {
  const parsed = expenseSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ExpenseValidationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path.map((segment) => String(segment)).join("."),
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

export async function createExpense(
  rawInput: unknown,
  options: ServiceOptions = {},
): Promise<ExpenseModel> {
  const input = parseExpenseInput(rawInput);
  const client = options.client ?? db;
  return client.expense.create({ data: input });
}

export async function updateExpense(
  id: string,
  rawPatch: Partial<ExpenseInput>,
  options: ServiceOptions = {},
): Promise<ExpenseModel> {
  const client = options.client ?? db;
  const existing = await client.expense.findUnique({ where: { id } });
  if (existing === null) {
    throw new ExpenseNotFoundError();
  }
  const stored: ExpenseInput = {
    date: existing.date,
    description: existing.description,
    amount: existing.amount,
  };
  const input = parseExpenseInput({ ...stored, ...rawPatch });
  return client.expense.update({ where: { id }, data: input });
}

export async function deleteExpense(
  id: string,
  options: ServiceOptions = {},
): Promise<void> {
  const client = options.client ?? db;
  const existing = await client.expense.findUnique({ where: { id } });
  if (existing === null) {
    throw new ExpenseNotFoundError();
  }
  await client.expense.delete({ where: { id } });
}

export async function getExpenseById(
  id: string,
  options: ServiceOptions = {},
): Promise<ExpenseModel | null> {
  const client = options.client ?? db;
  return client.expense.findUnique({ where: { id } });
}

// Lists the expenses whose own civil date falls inside the given "YYYY-MM"
// month, oldest first. Month boundaries use plain string comparison, so
// December/January transitions need no timezone math.
export async function listExpensesByMonth(
  month: string,
  options: ServiceOptions = {},
): Promise<ExpenseModel[]> {
  if (!isValidMonthKey(month)) {
    throw new ExpenseValidationError([
      { path: "month", message: "Indicá un mes válido con formato AAAA-MM." },
    ]);
  }
  const client = options.client ?? db;
  return client.expense.findMany({
    where: {
      date: { gte: `${month}-01`, lt: `${nextMonthKey(month)}-01` },
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
}

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isValidMonthKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    MONTH_KEY_PATTERN.test(value) &&
    isValidCivilDate(`${value}-01`)
  );
}

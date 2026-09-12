import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ExpenseInput } from "@/domain/schemas";
import {
  createExpenseActionWithClient,
  deleteExpenseActionWithClient,
  updateExpenseActionWithClient,
} from "@/server/expense-actions";
import { getExpenseById, listExpensesByMonth } from "@/server/expenses";
import {
  createIsolatedDatabase,
  type IsolatedDatabase,
} from "./database-helpers";

const SETUP_TIMEOUT_MS = 120000;

let database: IsolatedDatabase;

beforeAll(async () => {
  database = await createIsolatedDatabase();
}, SETUP_TIMEOUT_MS);

afterAll(async () => {
  await database.cleanup();
});

function expenseInput(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    date: "2026-09-05",
    description: "Limpieza",
    amount: 80000,
    ...overrides,
  };
}

describe("createExpenseAction", () => {
  it(
    "creates a valid expense and returns its id",
    async () => {
      const result = await createExpenseActionWithClient(
        expenseInput(),
        database.client,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stored = await getExpenseById(result.expenseId, {
          client: database.client,
        });
        expect(stored?.description).toBe("Limpieza");
        expect(stored?.amount).toBe(80000);
      }
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "rejects empty descriptions, invalid dates and non-positive amounts",
    async () => {
      const cases: Partial<ExpenseInput>[] = [
        { description: "  " },
        { date: "2026-02-30" },
        { amount: 0 },
        { amount: -50 },
      ];
      for (const overrides of cases) {
        const result = await createExpenseActionWithClient(
          expenseInput(overrides),
          database.client,
        );
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.fieldIssues.length).toBeGreaterThan(0);
        }
      }
    },
    SETUP_TIMEOUT_MS,
  );
});

describe("updateExpenseAction", () => {
  it(
    "edits description, date and amount",
    async () => {
      const created = await createExpenseActionWithClient(
        expenseInput({ date: "2026-10-02" }),
        database.client,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }
      const updated = await updateExpenseActionWithClient(
        {
          id: created.expenseId,
          input: { description: "Limpieza profunda", amount: 95000 },
        },
        database.client,
      );
      expect(updated).toEqual(
        expect.objectContaining({ ok: true, expenseId: created.expenseId }),
      );
      const stored = await getExpenseById(created.expenseId, {
        client: database.client,
      });
      expect(stored?.description).toBe("Limpieza profunda");
      expect(stored?.amount).toBe(95000);
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "rejects invalid updates and unknown ids",
    async () => {
      const created = await createExpenseActionWithClient(
        expenseInput({ date: "2026-10-03" }),
        database.client,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }
      const invalid = await updateExpenseActionWithClient(
        { id: created.expenseId, input: { amount: 0 } },
        database.client,
      );
      expect(invalid.ok).toBe(false);

      const missing = await updateExpenseActionWithClient(
        { id: "missing-id", input: { amount: 100 } },
        database.client,
      );
      expect(missing.ok).toBe(false);
      if (!missing.ok) {
        expect(missing.message).toContain("no existe");
      }
    },
    SETUP_TIMEOUT_MS,
  );
});

describe("deleteExpenseAction", () => {
  it(
    "removes only the indicated expense",
    async () => {
      const first = await createExpenseActionWithClient(
        expenseInput({ date: "2026-11-01", description: "Impuesto" }),
        database.client,
      );
      const second = await createExpenseActionWithClient(
        expenseInput({ date: "2026-11-02", description: "Reparación" }),
        database.client,
      );
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) {
        return;
      }
      const deleted = await deleteExpenseActionWithClient(
        first.expenseId,
        database.client,
      );
      expect(deleted.ok).toBe(true);
      expect(
        await getExpenseById(first.expenseId, { client: database.client }),
      ).toBeNull();
      expect(
        await getExpenseById(second.expenseId, { client: database.client }),
      ).not.toBeNull();
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "reports unknown ids instead of succeeding silently",
    async () => {
      const result = await deleteExpenseActionWithClient(
        "missing-id",
        database.client,
      );
      expect(result.ok).toBe(false);
    },
    SETUP_TIMEOUT_MS,
  );
});

describe("listExpensesByMonth", () => {
  it(
    "keeps each expense in its own date month across year boundaries",
    async () => {
      await createExpenseActionWithClient(
        expenseInput({ date: "2026-12-31", description: "Fin de año" }),
        database.client,
      );
      await createExpenseActionWithClient(
        expenseInput({ date: "2027-01-01", description: "Año nuevo" }),
        database.client,
      );
      const december = await listExpensesByMonth("2026-12", {
        client: database.client,
      });
      expect(december.map((expense) => expense.description)).toContain(
        "Fin de año",
      );
      expect(
        december.some((expense) => expense.description === "Año nuevo"),
      ).toBe(false);
      const january = await listExpensesByMonth("2027-01", {
        client: database.client,
      });
      expect(january.map((expense) => expense.description)).toContain(
        "Año nuevo",
      );
    },
    SETUP_TIMEOUT_MS,
  );
});

// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SaveExpenseResult } from "@/server/expense-actions";
import { ExpenseForm } from "@/components/balance/expense-form";

const mockPush = vi.fn();
const mockCreateExpenseAction = vi.fn();
const mockUpdateExpenseAction = vi.fn();

vi.mock("@/server/expense-actions", () => ({
  createExpenseAction: (...args: unknown[]) =>
    mockCreateExpenseAction(...args),
  updateExpenseAction: (...args: unknown[]) =>
    mockUpdateExpenseAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ExpenseForm", () => {
  it("renders date, description and amount with primary and cancel actions", () => {
    render(<ExpenseForm />);
    expect(screen.getByLabelText("Fecha")).toBeDefined();
    expect(screen.getByLabelText("Descripción")).toBeDefined();
    expect(screen.getByLabelText("Monto en pesos")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Cancelar" }).getAttribute("href"),
    ).toBe("/balance");
    expect(screen.getByRole("button", { name: "Guardar gasto" })).toBeDefined();
  });

  it("requires a description and a positive whole-peso amount", async () => {
    render(<ExpenseForm />);
    fireEvent.change(screen.getByLabelText("Monto en pesos"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    expect(
      await screen.findByText("Ingresá una descripción del gasto."),
    ).toBeDefined();
    expect(
      await screen.findByText("El monto del gasto debe ser mayor a cero."),
    ).toBeDefined();
    expect(mockCreateExpenseAction).not.toHaveBeenCalled();
  });

  it("locks the submit button while saving and returns to the balance", async () => {
    let resolveAction!: (result: SaveExpenseResult) => void;
    mockCreateExpenseAction.mockReturnValueOnce(
      new Promise<SaveExpenseResult>((resolve) => {
        resolveAction = resolve;
      }),
    );
    render(<ExpenseForm />);
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Limpieza" },
    });
    fireEvent.change(screen.getByLabelText("Monto en pesos"), {
      target: { value: "80000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    const savingButton = await screen.findByRole("button", {
      name: "Guardando…",
    });
    expect(savingButton.hasAttribute("disabled")).toBe(true);

    resolveAction({ ok: true, expenseId: "expense-1" });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/balance");
    });
  });

  it("prefills values in edit mode and saves changes", async () => {
    mockUpdateExpenseAction.mockResolvedValueOnce({
      ok: true,
      expenseId: "expense-1",
    });
    render(
      <ExpenseForm
        expenseId="expense-1"
        initialValues={{
          date: "2026-09-05",
          description: "Limpieza",
          amount: 80000,
        }}
      />,
    );
    expect(
      (screen.getByLabelText("Descripción") as HTMLInputElement).value,
    ).toBe("Limpieza");

    fireEvent.change(screen.getByLabelText("Monto en pesos"), {
      target: { value: "95000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => {
      expect(mockUpdateExpenseAction).toHaveBeenCalledWith({
        id: "expense-1",
        input: expect.objectContaining({ amount: 95000 }),
      });
      expect(mockPush).toHaveBeenCalledWith("/balance");
    });
    expect(mockCreateExpenseAction).not.toHaveBeenCalled();
  });
});

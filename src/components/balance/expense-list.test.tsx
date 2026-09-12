// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExpenseModel } from "@/generated/prisma/models";
import { ExpenseList } from "@/components/balance/expense-list";

const mockRefresh = vi.fn();
const mockDeleteExpenseAction = vi.fn();

vi.mock("@/server/expense-actions", () => ({
  deleteExpenseAction: (...args: unknown[]) =>
    mockDeleteExpenseAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
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

function expense(overrides: Partial<ExpenseModel> = {}): ExpenseModel {
  return {
    id: "expense-1",
    date: "2026-09-05",
    description: "Limpieza",
    amount: 80000,
    createdAt: new Date("2026-09-05T12:00:00Z"),
    updatedAt: new Date("2026-09-05T12:00:00Z"),
    ...overrides,
  };
}

describe("ExpenseList", () => {
  it("renders each expense with formatted date, amount and visible actions", () => {
    render(
      <ExpenseList
        expenses={[
          expense(),
          expense({
            id: "expense-2",
            date: "2026-09-20",
            description: "Reparación",
            amount: 150000,
          }),
        ]}
      />,
    );
    expect(screen.getByText("Limpieza")).toBeDefined();
    expect(screen.getByText("05/09/2026")).toBeDefined();
    expect(screen.getByText(/80\.000/)).toBeDefined();
    expect(screen.getByText("Reparación")).toBeDefined();
    const editLinks = screen.getAllByRole("link", { name: "Editar" });
    expect(editLinks[0]?.getAttribute("href")).toBe(
      "/balance/expenses/expense-1/edit",
    );
    expect(editLinks).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Eliminar" })).toHaveLength(2);
  });

  it("shows the empty state without actions", () => {
    render(<ExpenseList expenses={[]} />);
    expect(screen.getByText("No hay gastos en este período.")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Editar" })).toBeNull();
  });

  it("confirms deletion with explicit texts and refreshes afterwards", async () => {
    mockDeleteExpenseAction.mockResolvedValueOnce({
      ok: true,
      message: "El gasto se eliminó correctamente.",
    });
    const onDeleted = vi.fn();
    render(<ExpenseList expenses={[expense()]} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(
      await screen.findByRole("button", { name: "Sí, eliminar gasto" }),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "Sí, eliminar gasto" }),
    );
    await waitFor(() => {
      expect(mockDeleteExpenseAction).toHaveBeenCalledWith("expense-1");
      expect(onDeleted).toHaveBeenCalledWith("expense-1");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("dismissing the confirmation never mutates", () => {
    render(<ExpenseList expenses={[expense()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(mockDeleteExpenseAction).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Sí, eliminar gasto" }),
    ).toBeNull();
  });
});

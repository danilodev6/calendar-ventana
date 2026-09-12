// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CancelReservationButton,
  DeleteReservationButton,
  PaymentQuickActions,
  StatusQuickActions,
} from "@/components/reservations/detail-actions";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockCancelReservationAction = vi.fn();
const mockDeleteReservationAction = vi.fn();
const mockUpdateReservationAction = vi.fn();

vi.mock("@/server/reservation-actions", () => ({
  cancelReservationAction: (...args: unknown[]) =>
    mockCancelReservationAction(...args),
  deleteReservationAction: (...args: unknown[]) =>
    mockDeleteReservationAction(...args),
  updateReservationAction: (...args: unknown[]) =>
    mockUpdateReservationAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CancelReservationButton", () => {
  it("explains that cancelling keeps history and frees dates", async () => {
    mockCancelReservationAction.mockResolvedValueOnce({
      ok: true,
      message: "La reserva se canceló correctamente.",
    });
    render(<CancelReservationButton reservationId="stay-1" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar reserva" }),
    );
    expect(
      await screen.findByText(/se conserva en el historial/),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "Sí, cancelar reserva" }),
    );
    await waitFor(() => {
      expect(mockCancelReservationAction).toHaveBeenCalledWith("stay-1");
      expect(mockPush).toHaveBeenCalledWith("/reservations/stay-1");
    });
  });

  it("dismissing the confirmation never mutates", () => {
    render(<CancelReservationButton reservationId="stay-1" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar reserva" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(mockCancelReservationAction).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Sí, cancelar reserva" }),
    ).toBeNull();
  });

  it("shows server failures without navigating away", async () => {
    mockCancelReservationAction.mockResolvedValueOnce({
      ok: false,
      message: "La reserva ya está cancelada.",
    });
    render(<CancelReservationButton reservationId="stay-1" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar reserva" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Sí, cancelar reserva" }),
    );
    expect(
      await screen.findByText("La reserva ya está cancelada."),
    ).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("DeleteReservationButton", () => {
  it("uses a severer confirmation and returns to the history", async () => {
    mockDeleteReservationAction.mockResolvedValueOnce({
      ok: true,
      message: "La reserva se eliminó definitivamente.",
    });
    render(<DeleteReservationButton reservationId="stay-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar reserva" }));
    expect(
      await screen.findByText(/se borra definitivamente/),
    ).toBeDefined();
    expect(
      screen.queryByText(/se conserva en el historial/),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Sí, eliminar definitivamente" }),
    );
    await waitFor(() => {
      expect(mockDeleteReservationAction).toHaveBeenCalledWith("stay-1");
      expect(mockPush).toHaveBeenCalledWith("/reservations");
    });
  });

  it("dismissing the confirmation never mutates", () => {
    render(<DeleteReservationButton reservationId="stay-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar reserva" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(mockDeleteReservationAction).not.toHaveBeenCalled();
  });
});

describe("PaymentQuickActions", () => {
  it("asks for the deposit amount and applies it without navigating", async () => {
    mockUpdateReservationAction.mockResolvedValueOnce({ ok: true });
    render(
      <PaymentQuickActions
        reservationId="stay-1"
        paymentStatus="UNPAID"
        depositAmount={0}
        totalAmount={500000}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pago seña" }));
    const dialog = await screen.findByRole("dialog", { name: "Registrar seña" });
    expect(dialog).toBeDefined();
    fireEvent.change(
      screen.getByLabelText("Importe de la seña en pesos"),
      { target: { value: "100000" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar seña" }));
    await waitFor(() => {
      expect(mockUpdateReservationAction).toHaveBeenCalledWith({
        id: "stay-1",
        input: { paymentStatus: "DEPOSIT_PAID", depositAmount: 100000 },
      });
      expect(mockRefresh).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
    // The button unlocks after success instead of freezing on "Guardando…".
    await waitFor(() => {
      expect(
        (
          screen.getByRole("button", {
            name: "Pagado completo",
          }) as HTMLButtonElement
        ).hasAttribute("disabled"),
      ).toBe(false);
    });
  });

  it("rejects empty and excessive deposits inside the dialog", async () => {
    render(
      <PaymentQuickActions
        reservationId="stay-1"
        paymentStatus="UNPAID"
        depositAmount={0}
        totalAmount={500000}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pago seña" }));
    await screen.findByRole("dialog", { name: "Registrar seña" });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar seña" }));
    expect(
      await screen.findByText("Ingresá un importe de seña mayor a cero."),
    ).toBeDefined();
    expect(mockUpdateReservationAction).not.toHaveBeenCalled();

    fireEvent.change(
      screen.getByLabelText("Importe de la seña en pesos"),
      { target: { value: "500000" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar seña" }));
    expect(
      await screen.findByText(/La seña debe ser menor que el total/),
    ).toBeDefined();
    expect(mockUpdateReservationAction).not.toHaveBeenCalled();
  });

  it("dismissing the dialog never mutates", () => {
    render(
      <PaymentQuickActions
        reservationId="stay-1"
        paymentStatus="UNPAID"
        depositAmount={0}
        totalAmount={500000}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pago seña" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(mockUpdateReservationAction).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Registrar seña" }),
    ).toBeNull();
  });

  it("offers only full payment once a deposit exists", () => {
    render(
      <PaymentQuickActions
        reservationId="stay-1"
        paymentStatus="DEPOSIT_PAID"
        depositAmount={100000}
        totalAmount={500000}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Pago seña" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Pagado completo" }),
    ).toBeDefined();
  });

  it("steps back from full payment instead of locking the state", async () => {
    mockUpdateReservationAction.mockResolvedValueOnce({ ok: true });
    render(
      <PaymentQuickActions
        reservationId="stay-1"
        paymentStatus="PAID_FULL"
        depositAmount={100000}
        totalAmount={500000}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Pagado completo" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Volver a seña" }));
    await waitFor(() => {
      expect(mockUpdateReservationAction).toHaveBeenCalledWith({
        id: "stay-1",
        input: { paymentStatus: "DEPOSIT_PAID" },
      });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("steps back to unpaid when full payment kept no deposit", async () => {
    mockUpdateReservationAction.mockResolvedValueOnce({ ok: true });
    render(
      <PaymentQuickActions
        reservationId="stay-1"
        paymentStatus="PAID_FULL"
        depositAmount={0}
        totalAmount={500000}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Volver a sin pagar" }));
    await waitFor(() => {
      expect(mockUpdateReservationAction).toHaveBeenCalledWith({
        id: "stay-1",
        input: { paymentStatus: "UNPAID" },
      });
    });
  });

  it("shows server errors inline without navigating away", async () => {
    mockUpdateReservationAction.mockResolvedValueOnce({
      ok: false,
      message: "La base de datos está ocupada. Intentá nuevamente en unos segundos.",
      fieldIssues: [],
    });
    render(
      <PaymentQuickActions
        reservationId="stay-1"
        paymentStatus="DEPOSIT_PAID"
        depositAmount={100000}
        totalAmount={500000}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pagado completo" }));
    expect(
      await screen.findByText(/base de datos está ocupada/),
    ).toBeDefined();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe("StatusQuickActions", () => {
  it("offers every status except the current one", async () => {
    mockUpdateReservationAction.mockResolvedValueOnce({ ok: true });
    render(
      <StatusQuickActions reservationId="stay-1" status="INQUIRY" />,
    );
    expect(screen.queryByRole("button", { name: "Consulta" })).toBeNull();
    for (const label of ["Reservada", "Cancelada", "Finalizada"]) {
      expect(screen.getByRole("button", { name: label })).toBeDefined();
    }
    fireEvent.click(screen.getByRole("button", { name: "Reservada" }));
    await waitFor(() => {
      expect(mockUpdateReservationAction).toHaveBeenCalledWith({
        id: "stay-1",
        input: { status: "RESERVED" },
      });
      expect(mockRefresh).toHaveBeenCalled();
    });
    // The button unlocks after success instead of freezing on "Guardando…".
    await waitFor(() => {
      expect(
        (
          screen.getByRole("button", {
            name: "Reservada",
          }) as HTMLButtonElement
        ).hasAttribute("disabled"),
      ).toBe(false);
    });
  });

  it("shows conflict errors without navigating away", async () => {
    mockUpdateReservationAction.mockResolvedValueOnce({
      ok: false,
      message: "Estas fechas ya están ocupadas por la reserva de Ana Gómez",
      fieldIssues: [],
    });
    render(
      <StatusQuickActions reservationId="stay-1" status="INQUIRY" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reservada" }));
    expect(
      await screen.findByText(/ya están ocupadas/),
    ).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

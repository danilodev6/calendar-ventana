// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CancelReservationButton,
  DeleteReservationButton,
} from "@/components/reservations/detail-actions";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockCancelReservationAction = vi.fn();
const mockDeleteReservationAction = vi.fn();

vi.mock("@/server/reservation-actions", () => ({
  cancelReservationAction: (...args: unknown[]) =>
    mockCancelReservationAction(...args),
  deleteReservationAction: (...args: unknown[]) =>
    mockDeleteReservationAction(...args),
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

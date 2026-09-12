// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CreateReservationResult } from "@/server/reservation-actions";
import { ReservationForm } from "@/components/reservations/reservation-form";

const mockPush = vi.fn();
const mockCreateReservationAction = vi.fn();
const mockUpdateReservationAction = vi.fn();

vi.mock("@/server/reservation-actions", () => ({
  createReservationAction: (...args: unknown[]) =>
    mockCreateReservationAction(...args),
  updateReservationAction: (...args: unknown[]) =>
    mockUpdateReservationAction(...args),
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

function fillValidBase() {
  fireEvent.change(screen.getByLabelText("Nombre del huésped"), {
    target: { value: "Laura Pérez" },
  });
  fireEvent.change(screen.getByLabelText("Teléfono"), {
    target: { value: "3415556666" },
  });
  fireEvent.change(screen.getByLabelText("Entrada"), {
    target: { value: "2026-09-12" },
  });
  fireEvent.change(screen.getByLabelText("Salida"), {
    target: { value: "2026-09-16" },
  });
}

describe("ReservationForm", () => {
  it("renders the four Spanish sections with primary and cancel actions", () => {
    render(<ReservationForm />);
    for (const heading of [
      "Datos del huésped",
      "Estadía",
      "Reserva",
      "Pago",
    ]) {
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeDefined();
    }
    const cancel = screen.getByRole("link", { name: "Cancelar" });
    expect(cancel.getAttribute("href")).toBe("/reservations");
    expect(
      screen.getByRole("button", { name: "Guardar reserva" }),
    ).toBeDefined();
  });

  it("requires guest name, phone and stay dates in Spanish", async () => {
    render(<ReservationForm />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar reserva" }));
    expect(
      await screen.findByText("Ingresá el nombre del huésped."),
    ).toBeDefined();
    expect(
      await screen.findByText("Ingresá un teléfono de contacto."),
    ).toBeDefined();
    expect(mockCreateReservationAction).not.toHaveBeenCalled();
  });

  it("rejects deposits larger than the total", async () => {
    render(<ReservationForm />);
    fillValidBase();
    fireEvent.change(screen.getByLabelText("Estado del pago"), {
      target: { value: "DEPOSIT_PAID" },
    });
    fireEvent.change(screen.getByLabelText("Total en pesos"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Seña en pesos"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar reserva" }));
    expect(
      await screen.findByText("La seña no puede ser mayor que el total."),
    ).toBeDefined();
    expect(mockCreateReservationAction).not.toHaveBeenCalled();
  });

  it("treats email as optional but validates it when present", async () => {
    render(<ReservationForm />);
    fillValidBase();
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar reserva" }));
    expect(
      await screen.findByText("Ingresá un email válido o dejá el campo vacío."),
    ).toBeDefined();
    expect(mockCreateReservationAction).not.toHaveBeenCalled();
  });

  it("locks the submit button while saving and navigates to the detail", async () => {
    let resolveAction!: (result: CreateReservationResult) => void;
    mockCreateReservationAction.mockReturnValueOnce(
      new Promise<CreateReservationResult>((resolve) => {
        resolveAction = resolve;
      }),
    );
    render(<ReservationForm />);
    fillValidBase();
    fireEvent.click(screen.getByRole("button", { name: "Guardar reserva" }));

    const savingButton = await screen.findByRole("button", {
      name: "Guardando…",
    });
    expect(savingButton.hasAttribute("disabled")).toBe(true);

    resolveAction({ ok: true, reservationId: "reservation-123" });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/reservations/reservation-123");
    });
  });

  it("shows business errors while keeping the typed values", async () => {
    mockCreateReservationAction.mockResolvedValueOnce({
      ok: false,
      message:
        "Estas fechas ya están ocupadas por la reserva de Ana Gómez del 12 al 16 de septiembre de 2026.",
      fieldIssues: [],
    });
    render(<ReservationForm />);
    fillValidBase();
    fireEvent.click(screen.getByRole("button", { name: "Guardar reserva" }));
    expect(
      await screen.findByText(/Ana Gómez del 12 al 16 de septiembre/),
    ).toBeDefined();
    expect(
      (screen.getByLabelText("Nombre del huésped") as HTMLInputElement).value,
    ).toBe("Laura Pérez");
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("ReservationForm in edit mode", () => {
  it("preloads values, saves changes and returns to the detail", async () => {
    mockUpdateReservationAction.mockResolvedValueOnce({
      ok: true,
      reservationId: "stay-1",
    });
    render(
      <ReservationForm
        reservationId="stay-1"
        initialValues={{
          guestName: "Laura Pérez",
          phone: "3415556666",
          checkIn: "2026-09-12",
          checkOut: "2026-09-16",
          status: "RESERVED",
        }}
      />,
    );
    expect(
      (screen.getByLabelText("Nombre del huésped") as HTMLInputElement).value,
    ).toBe("Laura Pérez");
    expect(screen.getByRole("link", { name: "Cancelar" }).getAttribute("href")).toBe(
      "/reservations/stay-1",
    );

    fireEvent.change(screen.getByLabelText("Teléfono"), {
      target: { value: "3410001111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => {
      expect(mockUpdateReservationAction).toHaveBeenCalledWith({
        id: "stay-1",
        input: expect.objectContaining({ phone: "3410001111" }),
      });
      expect(mockPush).toHaveBeenCalledWith("/reservations/stay-1");
    });
    expect(mockCreateReservationAction).not.toHaveBeenCalled();
  });
});

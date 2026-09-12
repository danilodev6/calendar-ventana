// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReservationModel } from "@/generated/prisma/models";
import { ReservationDetail } from "@/components/reservations/reservation-detail";

vi.mock("@/server/reservation-actions", () => ({
  updateReservationAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

function stay(overrides: Partial<ReservationModel> = {}): ReservationModel {
  return {
    id: "stay-1",
    guestName: "Laura Pérez",
    phone: "3415556666",
    dni: null,
    email: null,
    originCity: null,
    guestCount: 2,
    notes: null,
    checkIn: "2026-09-12",
    checkOut: "2026-09-16",
    status: "RESERVED",
    paymentStatus: "DEPOSIT_PAID",
    totalAmount: 500000,
    depositAmount: 100000,
    channel: "DIRECT",
    createdAt: new Date("2026-09-01T12:00:00Z"),
    updatedAt: new Date("2026-09-01T12:00:00Z"),
    ...overrides,
  };
}

describe("ReservationDetail", () => {
  it("renders the four cards with derived nights and pending balance", () => {
    render(<ReservationDetail reservation={stay()} />);
    for (const heading of [
      "Laura Pérez",
      "Datos del huésped",
      "Estadía",
      "Reserva",
      "Pago",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeDefined();
    }
    expect(screen.getByText("12/09/2026")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText(/500\.000/)).toBeDefined();
    expect(screen.getByText(/400\.000/)).toBeDefined();
    expect(screen.getByText("Reservada")).toBeDefined();
    expect(screen.getByText("Seña pagada")).toBeDefined();
    expect(screen.getByText("Directa")).toBeDefined();
  });

  it("hides missing optionals instead of showing placeholders", () => {
    render(<ReservationDetail reservation={stay()} />);
    expect(screen.queryByText("Email:")).toBeNull();
    expect(screen.queryByText("DNI:")).toBeNull();
    expect(screen.queryByText("Localidad:")).toBeNull();
    expect(screen.queryByText("Notas:")).toBeNull();
  });

  it("shows optional data naturally when present", () => {
    render(
      <ReservationDetail
        reservation={stay({
          email: "laura@ejemplo.com",
          notes: "Llega tarde",
        })}
      />,
    );
    expect(screen.getByText("laura@ejemplo.com")).toBeDefined();
    expect(screen.getByText("Llega tarde")).toBeDefined();
  });
});

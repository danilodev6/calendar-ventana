// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReservationModel } from "@/generated/prisma/models";
import { ReservationTable } from "@/components/reservations/reservation-table";

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

describe("ReservationTable", () => {
  it("renders every agreed column with derived nights and formatted money", () => {
    render(<ReservationTable reservations={[stay()]} />);
    const table = screen.getByRole("table");
    for (const header of [
      "Huésped",
      "Entrada",
      "Salida",
      "Noches",
      "Personas",
      "Estado",
      "Pago",
      "Total",
    ]) {
      expect(
        within(table).getByRole("columnheader", { name: header }),
      ).toBeDefined();
    }
    const row = within(table).getAllByRole("row")[1];
    const cells = within(row).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "Laura Pérez",
      "12/09/2026",
      "16/09/2026",
      "4",
      "2",
      "Reservada",
      "Seña pagada",
      expect.stringContaining("500.000"),
      "Ver",
    ]);
    const viewLink = within(table).getByRole("link", { name: "Ver" });
    expect(viewLink.getAttribute("href")).toBe("/reservations/stay-1");
  });

  it("shows a dash for missing guest counts", () => {
    render(<ReservationTable reservations={[stay({ guestCount: null })]} />);
    expect(screen.getByRole("cell", { name: "—" })).toBeDefined();
  });

  it("explains an empty result without a call to action", () => {
    render(<ReservationTable reservations={[]} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getByText(/No se encontraron reservas con esos criterios/),
    ).toBeDefined();
  });
});

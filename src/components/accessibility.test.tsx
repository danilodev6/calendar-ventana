// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ExpenseForm } from "@/components/balance/expense-form";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { ReservationDetail } from "@/components/reservations/reservation-detail";
import { ReservationTable } from "@/components/reservations/reservation-table";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import {
  PaymentStatusBadge,
  ReservationStatusBadge,
} from "@/components/reservations/status-badges";

vi.mock("@/server/reservation-actions", () => ({
  createReservationAction: vi.fn(),
  updateReservationAction: vi.fn(),
}));

vi.mock("@/server/expense-actions", () => ({
  createExpenseAction: vi.fn(),
  updateExpenseAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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

// Component fragments carry no page landmarks by design; pages provide
// main/nav. The region rule is therefore disabled for these checks.
async function expectNoViolations(container: HTMLElement) {
  const results = await axe(container, {
    rules: { region: { enabled: false } },
  });
  expect(
    results.violations.map(
      (violation) => `${violation.id}: ${violation.help}`,
    ),
  ).toEqual([]);
}

const detailStay = {
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
} as const;

describe("accessibility", () => {
  it("keeps the primary navigation operable", async () => {
    const { container } = render(<SidebarNav currentPath="/balance" />);
    await expectNoViolations(container);
  });

  it("keeps the history table operable", async () => {
    const { container } = render(
      <ReservationTable reservations={[{ ...detailStay }]} />,
    );
    await expectNoViolations(container);
  });

  it("keeps the reservation detail operable", async () => {
    const { container } = render(
      <ReservationDetail reservation={{ ...detailStay }} />,
    );
    await expectNoViolations(container);
  });

  it("keeps the reservation form operable", async () => {
    const { container } = render(<ReservationForm />);
    await expectNoViolations(container);
  });

  it("keeps the expense form operable", async () => {
    const { container } = render(<ExpenseForm />);
    await expectNoViolations(container);
  });

  it("keeps confirmations and badges operable", async () => {
    const { container } = render(
      <div>
        <ConfirmPanel
          description="La reserva se conserva en el historial."
          confirmLabel="Sí, cancelar reserva"
          pendingLabel="Cancelando…"
          isPending={false}
          error={null}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
        <ReservationStatusBadge status="RESERVED" />
        <PaymentStatusBadge status="PAID_FULL" />
      </div>,
    );
    await expectNoViolations(container);
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  PaymentStatusBadge,
  ReservationStatusBadge,
} from "@/components/reservations/status-badges";

afterEach(() => {
  cleanup();
});

describe("status badges", () => {
  it("renders every reservation status with its Spanish label", () => {
    const cases = [
      ["INQUIRY", "Consulta"],
      ["RESERVED", "Reservada"],
      ["CANCELLED", "Cancelada"],
      ["COMPLETED", "Finalizada"],
    ] as const;
    for (const [status, label] of cases) {
      const { unmount } = render(<ReservationStatusBadge status={status} />);
      expect(screen.getByText(label)).toBeDefined();
      unmount();
    }
  });

  it("renders every payment status with its Spanish label", () => {
    const cases = [
      ["UNPAID", "Sin pagar"],
      ["DEPOSIT_PAID", "Seña pagada"],
      ["PAID_FULL", "Pagado completo"],
    ] as const;
    for (const [status, label] of cases) {
      const { unmount } = render(<PaymentStatusBadge status={status} />);
      expect(screen.getByText(label)).toBeDefined();
      unmount();
    }
  });

  it("hides decorative icons from assistive technology", () => {
    const { container } = render(
      <ReservationStatusBadge status="RESERVED" />,
    );
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

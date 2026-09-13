// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReservationCalendar } from "@/components/calendar/reservation-calendar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const stays = [
  {
    id: "stay-1",
    guestName: "Laura Pérez",
    checkIn: "2026-09-12",
    checkOut: "2026-09-16",
    status: "RESERVED",
  },
  {
    id: "stay-2",
    guestName: "Ana Gómez",
    checkIn: "2026-09-12",
    checkOut: "2026-09-14",
    status: "INQUIRY",
  },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ReservationCalendar spike", () => {
  it(
    "renders three month columns with overlapping stays side by side",
    async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => stays,
        })),
      );
      const { container } = render(<ReservationCalendar />);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const months = container.querySelectorAll(".fc-multimonth-month");
      expect(months.length).toBe(3);
      // The initial window is the current month plus the next two.
      const now = new Date();
      const titleFormat = new Intl.DateTimeFormat("es", { month: "long" });
      const expectedTitles = [0, 1, 2].map((offset) =>
        titleFormat.format(
          new Date(now.getFullYear(), now.getMonth() + offset, 1),
        ),
      );
      const actualTitles = [...months].map(
        (month) =>
          month.querySelector(".fc-multimonth-title")?.textContent ?? "",
      );
      expect(actualTitles).toEqual(expectedTitles);
      // A multi-day event repeats its title across cells, so assert presence.
      expect(
        await screen.findAllByText("Laura Pérez · Reservada"),
      ).not.toHaveLength(0);
      expect(
        await screen.findAllByText("Ana Gómez · Consulta"),
      ).not.toHaveLength(0);
    },
    30000,
  );
});

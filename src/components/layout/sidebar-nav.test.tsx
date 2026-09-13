// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidebarNav } from "@/components/layout/sidebar-nav";

afterEach(() => {
  cleanup();
});

// next/link needs router context; for this presentational test a plain
// anchor keeps the focus on labels, hrefs and the active state.
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

const EXPECTED_LINKS = [
  { label: "Calendario", href: "/" },
  { label: "Nueva reserva", href: "/reservations/new" },
  { label: "Todas las reservas", href: "/reservations" },
  { label: "Balance", href: "/balance" },
];

describe("SidebarNav", () => {
  it("renders exactly the four primary destinations with Spanish labels", () => {
    render(<SidebarNav currentPath="/" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    for (const { label, href } of EXPECTED_LINKS) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveProperty("tagName", "A");
      expect(link.getAttribute("href")).toBe(href);
    }
  });

  it("marks only the current section as the active page", () => {
    render(<SidebarNav currentPath="/balance" />);
    const active = screen.getByRole("link", { name: "Balance" });
    expect(active.getAttribute("aria-current")).toBe("page");
    for (const { label } of EXPECTED_LINKS.filter(
      (link) => link.label !== "Balance",
    )) {
      expect(
        screen.getByRole("link", { name: label }).getAttribute("aria-current"),
      ).toBeNull();
    }
  });

  it("highlights the new-reservation entry without also highlighting the list", () => {
    render(<SidebarNav currentPath="/reservations/new" />);
    expect(
      screen.getByRole("link", { name: "Nueva reserva" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "Todas las reservas" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("keeps every target at least 48px tall for easy tapping", () => {
    render(<SidebarNav currentPath="/" />);
    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");
    for (const link of links) {
      expect(link.className).toContain("min-h-14");
    }
  });
});

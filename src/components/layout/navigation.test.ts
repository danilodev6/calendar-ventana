import { describe, expect, it } from "vitest";

import { findActiveHref } from "@/components/layout/navigation";

describe("findActiveHref", () => {
  it("matches each primary route exactly", () => {
    expect(findActiveHref("/")).toBe("/");
    expect(findActiveHref("/reservations/new")).toBe("/reservations/new");
    expect(findActiveHref("/reservations")).toBe("/reservations");
    expect(findActiveHref("/balance")).toBe("/balance");
  });

  it("prefers the longest matching prefix for nested routes", () => {
    expect(findActiveHref("/reservations/new")).toBe("/reservations/new");
    expect(findActiveHref("/reservations/some-id")).toBe("/reservations");
  });

  it("only matches the calendar route exactly", () => {
    expect(findActiveHref("/balance")).not.toBe("/");
    expect(findActiveHref("/unknown")).toBeNull();
  });
});

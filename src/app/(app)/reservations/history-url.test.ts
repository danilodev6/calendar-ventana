import { describe, expect, it } from "vitest";

import { buildHistoryHref, toggleSort } from "@/app/(app)/reservations/history-url";

describe("buildHistoryHref", () => {
  it("keeps default views short", () => {
    expect(
      buildHistoryHref({ filter: "all", sort: "desc", query: "" }),
    ).toBe("/reservations");
  });

  it("encodes filter, ascending order and search text", () => {
    expect(
      buildHistoryHref({ filter: "completed", sort: "asc", query: "laura" }),
    ).toBe("/reservations?filter=completed&sort=asc&q=laura");
  });

  it("omits individual defaults", () => {
    expect(
      buildHistoryHref({ filter: "inquiries", sort: "desc", query: "" }),
    ).toBe("/reservations?filter=inquiries");
  });
});

describe("toggleSort", () => {
  it("flips the check-in order", () => {
    expect(toggleSort("desc")).toBe("asc");
    expect(toggleSort("asc")).toBe("desc");
  });
});

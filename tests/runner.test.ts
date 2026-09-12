import { describe, expect, it } from "vitest";

// Minimal Phase 0 test: verifies that the runner discovers and executes tests.
// Business rules will have their own tests starting from Phase 2.
describe("test runner", () => {
  it("discovers and executes tests", () => {
    expect(1 + 1).toBe(2);
  });
});

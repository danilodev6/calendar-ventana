import { describe, expect, it } from "vitest";

import { formatPesoInput, parsePesoInput } from "@/components/ui/peso-input";

describe("formatPesoInput", () => {
  it("groups thousands the Argentine way", () => {
    expect(formatPesoInput(500000)).toBe("500.000");
    expect(formatPesoInput(1200)).toBe("1.200");
    expect(formatPesoInput(0)).toBe("0");
  });

  it("renders empty values as blank", () => {
    expect(formatPesoInput(undefined)).toBe("");
    expect(formatPesoInput(null)).toBe("");
    expect(formatPesoInput(NaN)).toBe("");
  });
});

describe("parsePesoInput", () => {
  it("reads grouped and plain digits as integers", () => {
    expect(parsePesoInput("500.000")).toBe(500000);
    expect(parsePesoInput("1200")).toBe(1200);
    expect(parsePesoInput("0")).toBe(0);
  });

  it("maps blank and non-numeric input to undefined", () => {
    expect(parsePesoInput("")).toBeUndefined();
    expect(parsePesoInput("abc")).toBeUndefined();
  });

  it("rejects unsafe integers instead of rounding them", () => {
    expect(parsePesoInput("9".repeat(30))).toBeUndefined();
  });
});

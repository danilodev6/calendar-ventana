import { describe, expect, it } from "vitest";

// Test mínimo de Fase 0: verifica que el runner descubre y ejecuta tests.
// Las reglas de negocio tendrán sus propios tests desde la Fase 2.
describe("runner de tests", () => {
  it("descubre y ejecuta tests", () => {
    expect(1 + 1).toBe(2);
  });
});

// Single formatting helpers for user-visible values.

const pesosFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// Formats whole-peso amounts, e.g. "$ 500.000".
export function formatPesos(amount: number): string {
  return pesosFormatter.format(amount);
}

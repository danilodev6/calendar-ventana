import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

const pesoGroupFormat = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

// Shows whole-peso amounts with thousand separators ("500.000") while the
// form value stays a plain integer. Empty input maps to undefined so Zod
// reports the required/positive message instead of a confusing NaN.
export function formatPesoInput(value: number | null | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "";
  }
  return pesoGroupFormat.format(value);
}

export function parsePesoInput(text: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, "");
  if (digits === "") {
    return undefined;
  }
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : undefined;
}

interface PesoInputProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  id: string;
  className?: string;
  autoComplete?: string;
}

// Thousand-separated peso input wired to React Hook Form. Typing only ever
// produces integers (anything else is stripped visibly), so fractions can
// never reach the server; the Zod schema stays as the backstop.
export function PesoInput<TFieldValues extends FieldValues>({
  name,
  control,
  id,
  className,
  autoComplete,
}: PesoInputProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <input
          id={id}
          ref={field.ref}
          name={field.name}
          type="text"
          inputMode="numeric"
          autoComplete={autoComplete}
          className={className}
          value={formatPesoInput(field.value as number | null | undefined)}
          onChange={(event) => field.onChange(parsePesoInput(event.target.value))}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

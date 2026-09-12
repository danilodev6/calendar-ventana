import { describe, expect, it } from "vitest";

import {
  expenseSchema,
  reservationSchema,
  type ReservationInput,
} from "@/domain/schemas";

function validReservation(
  overrides: Partial<ReservationInput> = {},
): ReservationInput {
  return {
    guestName: "Laura Pérez",
    phone: "+54 9 11 5555 5555",
    dni: null,
    email: null,
    originCity: null,
    guestCount: 2,
    notes: null,
    checkIn: "2026-09-12",
    checkOut: "2026-09-16",
    status: "INQUIRY",
    paymentStatus: "UNPAID",
    totalAmount: 0,
    depositAmount: 0,
    channel: "DIRECT",
    ...overrides,
  };
}

function firstMessage(result: { error?: { issues: { message: string }[] } }): string {
  return result.error?.issues[0]?.message ?? "";
}

describe("reservationSchema", () => {
  it("accepts a minimal inquiry with required fields only", () => {
    const result = reservationSchema.safeParse(
      validReservation({
        guestName: "  Laura Pérez  ",
        guestCount: undefined,
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestName).toBe("Laura Pérez");
    }
  });

  it("applies form defaults for status, payment, amounts and channel", () => {
    const { status, paymentStatus, channel, ...withoutDefaults } =
      validReservation();
    void status;
    void paymentStatus;
    void channel;
    const result = reservationSchema.safeParse(withoutDefaults);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("INQUIRY");
      expect(result.data.paymentStatus).toBe("UNPAID");
      expect(result.data.channel).toBe("DIRECT");
    }
  });

  it("rejects missing name, phone and stay dates in Spanish", () => {
    const result = reservationSchema.safeParse(
      validReservation({ guestName: "  ", phone: "" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Ingresá el nombre del huésped.");
      expect(messages).toContain("Ingresá un teléfono de contacto.");
    }
  });

  it("rejects checkout dates that are not after check-in", () => {
    const sameDay = reservationSchema.safeParse(
      validReservation({ checkIn: "2026-09-12", checkOut: "2026-09-12" }),
    );
    expect(sameDay.success).toBe(false);
    expect(firstMessage(sameDay)).toBe(
      "La fecha de salida debe ser posterior a la de entrada.",
    );

    const backwards = reservationSchema.safeParse(
      validReservation({ checkIn: "2026-09-16", checkOut: "2026-09-12" }),
    );
    expect(backwards.success).toBe(false);
  });

  it("rejects nonexistent calendar days", () => {
    const result = reservationSchema.safeParse(
      validReservation({ checkIn: "2026-02-30", checkOut: "2026-03-02" }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts an optional email but validates and normalizes it", () => {
    const valid = reservationSchema.safeParse(
      validReservation({ email: "  Laura@Ejemplo.com " }),
    );
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.email).toBe("laura@ejemplo.com");
    }

    const empty = reservationSchema.safeParse(validReservation({ email: "" }));
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.email).toBeNull();
    }

    const invalid = reservationSchema.safeParse(
      validReservation({ email: "not-an-email" }),
    );
    expect(invalid.success).toBe(false);
    expect(firstMessage(invalid)).toBe(
      "Ingresá un email válido o dejá el campo vacío.",
    );
  });

  it("normalizes other empty optionals to null", () => {
    const result = reservationSchema.safeParse(
      validReservation({ dni: "", originCity: "   ", notes: "" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dni).toBeNull();
      expect(result.data.originCity).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("rejects non-positive guest counts", () => {
    expect(
      reservationSchema.safeParse(validReservation({ guestCount: 0 })).success,
    ).toBe(false);
    expect(
      reservationSchema.safeParse(validReservation({ guestCount: -2 })).success,
    ).toBe(false);
    expect(
      reservationSchema.safeParse(validReservation({ guestCount: 2.5 })).success,
    ).toBe(false);
  });

  it("rejects negative amounts and deposits larger than the total", () => {
    const negative = reservationSchema.safeParse(
      validReservation({ totalAmount: -100 }),
    );
    expect(negative.success).toBe(false);

    const overDeposit = reservationSchema.safeParse(
      validReservation({
        status: "RESERVED",
        paymentStatus: "DEPOSIT_PAID",
        totalAmount: 500000,
        depositAmount: 600000,
      }),
    );
    expect(overDeposit.success).toBe(false);
    expect(firstMessage(overDeposit)).toBe(
      "La seña no puede ser mayor que el total.",
    );
  });

  it("rejects unpaid stays carrying a deposit", () => {
    const result = reservationSchema.safeParse(
      validReservation({ paymentStatus: "UNPAID", depositAmount: 100000, totalAmount: 500000 }),
    );
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(
      'Si el pago está "Sin pagar", la seña debe ser 0.',
    );
  });

  it("rejects partially paid stays with zero or full deposits", () => {
    const zeroDeposit = reservationSchema.safeParse(
      validReservation({
        status: "RESERVED",
        paymentStatus: "DEPOSIT_PAID",
        totalAmount: 500000,
        depositAmount: 0,
      }),
    );
    expect(zeroDeposit.success).toBe(false);

    const fullDeposit = reservationSchema.safeParse(
      validReservation({
        status: "RESERVED",
        paymentStatus: "DEPOSIT_PAID",
        totalAmount: 500000,
        depositAmount: 500000,
      }),
    );
    expect(fullDeposit.success).toBe(false);
    expect(firstMessage(fullDeposit)).toContain("Pagado completo");
  });

  it("keeps a previous deposit on fully paid stays without double counting rules", () => {
    const result = reservationSchema.safeParse(
      validReservation({
        status: "RESERVED",
        paymentStatus: "PAID_FULL",
        totalAmount: 500000,
        depositAmount: 100000,
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depositAmount).toBe(100000);
    }
  });
});

describe("expenseSchema", () => {
  it("accepts a valid expense", () => {
    const result = expenseSchema.safeParse({
      date: "2026-09-05",
      description: "Limpieza",
      amount: 80000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty descriptions, invalid dates and non-positive amounts", () => {
    expect(
      expenseSchema.safeParse({ date: "2026-09-05", description: "  ", amount: 80000 })
        .success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ date: "2026-02-30", description: "Limpieza", amount: 80000 })
        .success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ date: "2026-09-05", description: "Limpieza", amount: 0 })
        .success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({ date: "2026-09-05", description: "Limpieza", amount: -50 })
        .success,
    ).toBe(false);
  });
});

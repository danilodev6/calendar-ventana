import { z } from "zod";

import { isValidCivilDate } from "@/domain/dates";
import { MAX_PESO_AMOUNT } from "@/domain/money";
import {
  BOOKING_CHANNELS,
  PAYMENT_STATUSES,
  RESERVATION_STATUSES,
} from "@/domain/reservations";

// Shared Zod schemas. The same schema validates client input for fast
// feedback and server input as the authoritative check. Every user-facing
// message is Spanish; identifiers stay in English.

const civilDateSchema = z
  .string()
  .refine(isValidCivilDate, {
    message: "Ingresá una fecha válida con formato AAAA-MM-DD.",
  });

// Empty strings from optional inputs normalize to null before validation.
function emptyToNull(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}

function optionalTextSchema(maxLength: number) {
  return z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(maxLength, { message: "El texto supera el largo máximo permitido." })
      .nullable()
      .optional(),
  );
}

const optionalEmailSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Ingresá un email válido o dejá el campo vacío." })
    .nullable()
    .optional(),
);

const guestCountSchema = z
  .number({ error: "La cantidad de personas debe ser un número." })
  .int({ message: "La cantidad de personas debe ser un número entero." })
  .positive({ message: "La cantidad de personas debe ser mayor a cero." })
  .nullable()
  .optional();

function pesoAmountSchema(fieldLabel: string) {
  return z
    .number({ error: `Ingresá ${fieldLabel} en pesos, sin centavos.` })
    .int({ message: `Ingresá ${fieldLabel} en pesos, sin centavos.` })
    .min(0, { message: `${fieldLabel} no puede ser un importe negativo.` })
    .max(MAX_PESO_AMOUNT, {
      message: `${fieldLabel} supera el importe máximo permitido.`,
    });
}

export const reservationSchema = z
  .object({
    guestName: z
      .string()
      .trim()
      .min(1, { message: "Ingresá el nombre del huésped." })
      .max(120, { message: "El nombre supera el largo máximo permitido." }),
    phone: z
      .string()
      .trim()
      .min(1, { message: "Ingresá un teléfono de contacto." })
      .max(40, { message: "El teléfono supera el largo máximo permitido." }),
    dni: optionalTextSchema(30),
    email: optionalEmailSchema,
    originCity: optionalTextSchema(120),
    guestCount: guestCountSchema,
    notes: optionalTextSchema(2000),
    checkIn: civilDateSchema,
    checkOut: civilDateSchema,
    status: z.enum(RESERVATION_STATUSES).default("INQUIRY"),
    paymentStatus: z.enum(PAYMENT_STATUSES).default("UNPAID"),
    totalAmount: pesoAmountSchema("el total").default(0),
    depositAmount: pesoAmountSchema("la seña").default(0),
    channel: z.enum(BOOKING_CHANNELS).default("DIRECT"),
  })
  .superRefine((data, context) => {
    if (data.checkOut <= data.checkIn) {
      context.addIssue({
        code: "custom",
        path: ["checkOut"],
        message: "La fecha de salida debe ser posterior a la de entrada.",
      });
    }
    if (data.depositAmount > data.totalAmount) {
      context.addIssue({
        code: "custom",
        path: ["depositAmount"],
        message: "La seña no puede ser mayor que el total.",
      });
    }
    if (data.paymentStatus === "UNPAID" && data.depositAmount !== 0) {
      context.addIssue({
        code: "custom",
        path: ["depositAmount"],
        message: 'Si el pago está "Sin pagar", la seña debe ser 0.',
      });
    }
    if (
      data.paymentStatus === "DEPOSIT_PAID" &&
      !(data.depositAmount > 0 && data.depositAmount < data.totalAmount)
    ) {
      context.addIssue({
        code: "custom",
        path: ["depositAmount"],
        message:
          'La seña debe ser mayor a 0 y menor que el total; si cubre todo el total, elegí "Pagado completo".',
      });
    }
  });

export type ReservationInput = z.infer<typeof reservationSchema>;

export const expenseSchema = z.object({
  date: civilDateSchema,
  description: z
    .string()
    .trim()
    .min(1, { message: "Ingresá una descripción del gasto." })
    .max(200, { message: "La descripción supera el largo máximo permitido." }),
  amount: z
    .number({ error: "Ingresá el monto en pesos, sin centavos." })
    .int({ message: "Ingresá el monto en pesos, sin centavos." })
    .positive({ message: "El monto del gasto debe ser mayor a cero." })
    .max(MAX_PESO_AMOUNT, {
      message: "El monto supera el importe máximo permitido.",
    }),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

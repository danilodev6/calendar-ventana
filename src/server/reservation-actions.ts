"use server";

import { revalidatePath } from "next/cache";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ReservationInput } from "@/domain/schemas";
import {
  ReservationBusyError,
  ReservationConflictError,
  ReservationNotFoundError,
  ReservationValidationError,
  createReservation,
  type FieldIssue,
} from "@/server/reservations";
import { db } from "@/server/db";

// The form client calls createReservationAction and either navigates to the
// new detail page or shows the returned Spanish message while keeping the
// typed values. Results are plain serializable data, never thrown errors.
export interface CreateReservationSuccess {
  ok: true;
  reservationId: string;
}

export interface CreateReservationFailure {
  ok: false;
  message: string;
  fieldIssues: FieldIssue[];
}

export type CreateReservationResult =
  | CreateReservationSuccess
  | CreateReservationFailure;

// Testable core: same logic with an explicit client, without cache effects
// (revalidatePath requires a request scope and would break isolated tests).
export async function createReservationActionWithClient(
  input: ReservationInput,
  client: PrismaClient,
): Promise<CreateReservationResult> {
  try {
    const reservation = await createReservation(input, { client });
    return { ok: true, reservationId: reservation.id };
  } catch (error) {
    if (error instanceof ReservationConflictError) {
      return { ok: false, message: error.message, fieldIssues: [] };
    }
    if (error instanceof ReservationValidationError) {
      return {
        ok: false,
        message: error.message,
        fieldIssues: error.fieldIssues,
      };
    }
    if (
      error instanceof ReservationNotFoundError ||
      error instanceof ReservationBusyError
    ) {
      return { ok: false, message: error.message, fieldIssues: [] };
    }
    console.error("Unexpected reservation creation failure", error);
    return {
      ok: false,
      message: "Ocurrió un error inesperado. Intentá nuevamente.",
      fieldIssues: [],
    };
  }
}

export async function createReservationAction(
  input: ReservationInput,
): Promise<CreateReservationResult> {
  const result = await createReservationActionWithClient(input, db);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath("/balance");
  }
  return result;
}

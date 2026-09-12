"use server";

import { revalidatePath } from "next/cache";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ReservationInput } from "@/domain/schemas";
import {
  ReservationBusyError,
  ReservationConflictError,
  ReservationInvalidStateError,
  ReservationNotFoundError,
  ReservationValidationError,
  cancelReservation,
  createReservation,
  deleteReservation,
  updateReservation,
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

function toFailure(error: unknown, operation: string): CreateReservationFailure {
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
    error instanceof ReservationBusyError ||
    error instanceof ReservationInvalidStateError
  ) {
    return { ok: false, message: error.message, fieldIssues: [] };
  }
  console.error(`Unexpected reservation ${operation} failure`, error);
  return {
    ok: false,
    message: "Ocurrió un error inesperado. Intentá nuevamente.",
    fieldIssues: [],
  };
}

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
    return toFailure(error, "creation");
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

export interface UpdateReservationPayload {
  id: string;
  input: Partial<ReservationInput>;
}

// Testable update core with an explicit client. Returns to the detail page
// on success because the stay still exists.
export async function updateReservationActionWithClient(
  payload: UpdateReservationPayload,
  client: PrismaClient,
): Promise<CreateReservationResult> {
  try {
    const reservation = await updateReservation(payload.id, payload.input, {
      client,
    });
    return { ok: true, reservationId: reservation.id };
  } catch (error) {
    return toFailure(error, "update");
  }
}

export async function updateReservationAction(
  payload: UpdateReservationPayload,
): Promise<CreateReservationResult> {
  const result = await updateReservationActionWithClient(payload, db);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${payload.id}`);
    revalidatePath("/balance");
  }
  return result;
}

export interface MutationResult {
  ok: boolean;
  message: string;
}

// Testable cancel core with an explicit client.
export async function cancelReservationActionWithClient(
  id: string,
  client: PrismaClient,
): Promise<MutationResult> {
  try {
    await cancelReservation(id, { client });
    return { ok: true, message: "La reserva se canceló correctamente." };
  } catch (error) {
    const failure = toFailure(error, "cancellation");
    return { ok: failure.ok, message: failure.message };
  }
}

export async function cancelReservationAction(
  id: string,
): Promise<MutationResult> {
  const result = await cancelReservationActionWithClient(id, db);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${id}`);
    revalidatePath("/balance");
  }
  return result;
}

// Testable delete core with an explicit client.
export async function deleteReservationActionWithClient(
  id: string,
  client: PrismaClient,
): Promise<MutationResult> {
  try {
    await deleteReservation(id, { client });
    return { ok: true, message: "La reserva se eliminó definitivamente." };
  } catch (error) {
    const failure = toFailure(error, "deletion");
    return { ok: failure.ok, message: failure.message };
  }
}

export async function deleteReservationAction(
  id: string,
): Promise<MutationResult> {
  const result = await deleteReservationActionWithClient(id, db);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath("/balance");
  }
  return result;
}

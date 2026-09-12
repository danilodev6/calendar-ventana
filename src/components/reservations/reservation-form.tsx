"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldPath, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  BOOKING_CHANNELS,
  PAYMENT_STATUSES,
  RESERVATION_STATUSES,
} from "@/domain/reservations";
import { reservationSchema, type ReservationInput } from "@/domain/schemas";
import {
  BOOKING_CHANNEL_LABELS,
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/components/reservations/reservation-labels";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createReservationAction,
  updateReservationAction,
} from "@/server/reservation-actions";

const inputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base";

function FieldError({ message }: { message?: string }) {
  if (message === undefined || message === "") {
    return null;
  }
  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

// Shared create/edit form for inquiries and stays. The same fields and Zod
// schema serve both flows; edit mode only preloads values, posts to the
// update action and returns to the detail page. The same schema validates
// here for instant feedback and again on the server as the authoritative
// check. Amounts travel as whole-peso numbers; decimals are rejected
// server-side.
export interface ReservationFormProps {
  // When present the form edits that stay instead of creating a new one.
  reservationId?: string;
  initialValues?: Partial<ReservationInput>;
}

export function ReservationForm({
  reservationId,
  initialValues,
}: ReservationFormProps = {}) {
  const router = useRouter();
  const [businessError, setBusinessError] = useState<string | null>(null);
  const isEditing = reservationId !== undefined;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReservationInput>({
    // The schema input keeps defaults optional while every defaulted field
    // is registered with a default value, so submitted values always match
    // the validated output type.
    resolver: zodResolver(reservationSchema) as Resolver<ReservationInput>,
    defaultValues: {
      status: "INQUIRY",
      paymentStatus: "UNPAID",
      channel: "DIRECT",
      totalAmount: 0,
      depositAmount: 0,
      ...initialValues,
    },
  });

  const onSubmit: SubmitHandler<ReservationInput> = async (values) => {
    setBusinessError(null);
    const result = isEditing
      ? await updateReservationAction({ id: reservationId, input: values })
      : await createReservationAction(values);
    if (result.ok) {
      router.push(`/reservations/${result.reservationId}`);
      return;
    }
    for (const issue of result.fieldIssues) {
      setError(issue.path as FieldPath<ReservationInput>, {
        type: "server",
        message: issue.message,
      });
    }
    setBusinessError(result.message);
  };

  const cancelHref = isEditing ? `/reservations/${reservationId}` : "/reservations";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {businessError !== null && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-base font-medium text-red-800"
        >
          {businessError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos del huésped</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="guestName" className="text-base font-medium">
              Nombre del huésped
            </label>
            <input
              id="guestName"
              type="text"
              autoComplete="name"
              className={inputClassName}
              {...register("guestName")}
            />
            <FieldError message={errors.guestName?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="phone" className="text-base font-medium">
              Teléfono
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              className={inputClassName}
              {...register("phone")}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="dni" className="text-base font-medium">
                DNI <span className="font-normal text-zinc-500">(opcional)</span>
              </label>
              <input id="dni" type="text" className={inputClassName} {...register("dni")} />
              <FieldError message={errors.dni?.message} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="guestCount" className="text-base font-medium">
                Cantidad de personas{" "}
                <span className="font-normal text-zinc-500">(opcional)</span>
              </label>
              <input
                id="guestCount"
                type="number"
                min={1}
                step={1}
                className={inputClassName}
                {...register("guestCount", {
                  setValueAs: (value: string) =>
                    value === "" ? null : Number(value),
                })}
              />
              <FieldError message={errors.guestCount?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-base font-medium">
              Email <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClassName}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="originCity" className="text-base font-medium">
              Localidad <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <input
              id="originCity"
              type="text"
              className={inputClassName}
              {...register("originCity")}
            />
            <FieldError message={errors.originCity?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-base font-medium">
              Notas <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <textarea
              id="notes"
              rows={3}
              className={inputClassName}
              {...register("notes")}
            />
            <FieldError message={errors.notes?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estadía</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="checkIn" className="text-base font-medium">
              Entrada
            </label>
            <input
              id="checkIn"
              type="date"
              className={inputClassName}
              {...register("checkIn")}
            />
            <FieldError message={errors.checkIn?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="checkOut" className="text-base font-medium">
              Salida
            </label>
            <input
              id="checkOut"
              type="date"
              className={inputClassName}
              {...register("checkOut")}
            />
            <FieldError message={errors.checkOut?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reserva</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-base font-medium">
              Estado
            </label>
            <select id="status" className={inputClassName} {...register("status")}>
              {RESERVATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {RESERVATION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <FieldError message={errors.status?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="channel" className="text-base font-medium">
              Origen
            </label>
            <select id="channel" className={inputClassName} {...register("channel")}>
              {BOOKING_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {BOOKING_CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
            <FieldError message={errors.channel?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pago</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="paymentStatus" className="text-base font-medium">
              Estado del pago
            </label>
            <select
              id="paymentStatus"
              className={inputClassName}
              {...register("paymentStatus")}
            >
              {PAYMENT_STATUSES.map((paymentStatus) => (
                <option key={paymentStatus} value={paymentStatus}>
                  {PAYMENT_STATUS_LABELS[paymentStatus]}
                </option>
              ))}
            </select>
            <FieldError message={errors.paymentStatus?.message} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="totalAmount" className="text-base font-medium">
                Total en pesos
              </label>
              <input
                id="totalAmount"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className={cn(inputClassName, "text-right")}
                {...register("totalAmount", { valueAsNumber: true })}
              />
              <FieldError message={errors.totalAmount?.message} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="depositAmount" className="text-base font-medium">
                Seña en pesos
              </label>
              <input
                id="depositAmount"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className={cn(inputClassName, "text-right")}
                {...register("depositAmount", { valueAsNumber: true })}
              />
              <FieldError message={errors.depositAmount?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : isEditing
              ? "Guardar cambios"
              : "Guardar reserva"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useForm,
  type FieldPath,
  type Resolver,
  type SubmitHandler,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays } from "lucide-react";

import { formatCivilDate } from "@/domain/dates";

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
import { PesoInput } from "@/components/ui/peso-input";
import { cn } from "@/lib/utils";
import {
  createReservationAction,
  updateReservationAction,
} from "@/server/reservation-actions";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-base text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

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

// Stay dates are picked from the browser calendar popup through an
// icon-only button: no "dd/mm/yyyy" placeholder is ever shown. Once chosen,
// the date appears written below the button. Typing is impossible by
// construction since the native input stays out of reach.
function StayDateField({
  id,
  label,
  initialValue,
  registration,
  error,
}: {
  id: string;
  label: string;
  initialValue: string | undefined;
  registration: UseFormRegisterReturn<"checkIn" | "checkOut">;
  error: string | undefined;
}) {
  // Mirrors the picked date as written text without react-hook-form's
  // `watch` (which the React Compiler cannot compile): the hidden input
  // stays the single source of truth for validation and submit.
  const [written, setWritten] = useState<string | null>(() =>
    initialValue ? formatCivilDate(initialValue) : null,
  );

  function openPicker() {
    const input = document.getElementById(id);
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  }

  const action = written ? "Cambiar fecha de" : "Elegir fecha de";
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-zinc-700">
        {label}
      </label>
      <button
        type="button"
        onClick={openPicker}
        aria-label={`${action} ${label.toLowerCase()}`}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 font-semibold text-zinc-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        <CalendarDays aria-hidden="true" className="size-6" />
        <span>{written ?? "Elegir fecha"}</span>
      </button>
      <input
        id={id}
        type="date"
        tabIndex={-1}
        className="sr-only"
        {...registration}
        onChange={(event) => {
          void registration.onChange(event);
          const picked = event.target.value;
          setWritten(picked ? formatCivilDate(picked) : null);
        }}
      />
      <FieldError message={error} />
    </div>
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
    control,
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

  const cancelHref = isEditing
    ? `/reservations/${reservationId}`
    : "/reservations";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      {businessError !== null && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-base font-medium text-red-800"
        >
          {businessError}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5 md:p-7">
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
                    DNI{" "}
                    <span className="font-normal text-zinc-500">
                      (opcional)
                    </span>
                  </label>
                  <input
                    id="dni"
                    type="text"
                    className={inputClassName}
                    {...register("dni")}
                  />
                  <FieldError message={errors.dni?.message} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="guestCount" className="text-base font-medium">
                    Cantidad de personas{" "}
                    <span className="font-normal text-zinc-500">
                      (opcional)
                    </span>
                  </label>
                  <input
                    id="guestCount"
                    type="number"
                    min={1}
                    step={1}
                    className={inputClassName}
                    {...register("guestCount", {
                      // Untouched null/undefined defaults reach this transform
                      // as-is (not as ""), and Number(null) is 0 while
                      // Number(undefined) is NaN: normalize every empty shape
                      // to null so an optional blank stays blank.
                      setValueAs: (value: unknown) =>
                        value === "" ||
                        value === null ||
                        value === undefined ||
                        (typeof value === "number" && Number.isNaN(value))
                          ? null
                          : Number(value),
                    })}
                  />
                  <FieldError message={errors.guestCount?.message} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-base font-medium">
                  Email{" "}
                  <span className="font-normal text-zinc-500">(opcional)</span>
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
                  Localidad{" "}
                  <span className="font-normal text-zinc-500">(opcional)</span>
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
                  Notas{" "}
                  <span className="font-normal text-zinc-500">(opcional)</span>
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
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5 md:p-7">
            <CardHeader>
              <CardTitle>Estadía</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <StayDateField
                id="checkIn"
                label="Entrada"
                initialValue={initialValues?.checkIn}
                registration={register("checkIn")}
                error={errors.checkIn?.message}
              />
              <StayDateField
                id="checkOut"
                label="Salida"
                initialValue={initialValues?.checkOut}
                registration={register("checkOut")}
                error={errors.checkOut?.message}
              />
            </CardContent>
          </Card>
          <Card className="p-5 md:p-7">
            <CardHeader>
              <CardTitle>Reserva</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="status" className="text-base font-medium">
                  Estado
                </label>
                <select
                  id="status"
                  className={inputClassName}
                  {...register("status")}
                >
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
                <select
                  id="channel"
                  className={inputClassName}
                  {...register("channel")}
                >
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

          <Card className="p-5 md:p-7">
            <CardHeader>
              <CardTitle>Pago</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="paymentStatus"
                  className="text-base font-medium"
                >
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
                  <label
                    htmlFor="totalAmount"
                    className="text-base font-medium"
                  >
                    Total en pesos
                  </label>
                  <PesoInput
                    name="totalAmount"
                    control={control}
                    id="totalAmount"
                    className={cn(inputClassName, "text-right")}
                  />
                  <FieldError message={errors.totalAmount?.message} />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="depositAmount"
                    className="text-base font-medium"
                  >
                    Seña en pesos
                  </label>
                  <PesoInput
                    name="depositAmount"
                    control={control}
                    id="depositAmount"
                    className={cn(inputClassName, "text-right")}
                  />
                  <FieldError message={errors.depositAmount?.message} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:flex-row sm:justify-around sm:gap-0 sm:p-6">
            <Link
              href={cancelHref}
              className={buttonVariants({ variant: "secondary" })}
            >
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
        </div>
      </div>
    </form>
  );
}

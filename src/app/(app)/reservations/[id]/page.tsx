import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatCivilDate, nightsBetween } from "@/domain/dates";
import { calculatePendingBalance } from "@/domain/money";
import { getReservationById } from "@/server/reservations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BOOKING_CHANNEL_LABELS,
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/components/reservations/reservation-labels";
import { formatPesos } from "@/lib/format";

export const metadata: Metadata = {
  title: "Detalle de reserva | Reservas Casa",
  description: "Datos de una reserva",
};

// Minimal detail page for the Phase 5 redirect target. The full detail with
// edit, cancel and delete actions arrives in Phases 6 and 7.
export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reservation = await getReservationById(id);
  if (reservation === null) {
    notFound();
  }

  const nights = nightsBetween(reservation.checkIn, reservation.checkOut);
  const pending = calculatePendingBalance(reservation);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {reservation.guestName}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Datos del huésped</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-base">
            <div className="flex gap-2">
              <dt className="font-medium">Teléfono:</dt>
              <dd>{reservation.phone}</dd>
            </div>
            {reservation.email !== null && (
              <div className="flex gap-2">
                <dt className="font-medium">Email:</dt>
                <dd>{reservation.email}</dd>
              </div>
            )}
            {reservation.guestCount !== null && (
              <div className="flex gap-2">
                <dt className="font-medium">Personas:</dt>
                <dd>{reservation.guestCount}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estadía</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-base">
            <div className="flex gap-2">
              <dt className="font-medium">Entrada:</dt>
              <dd>{formatCivilDate(reservation.checkIn)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Salida:</dt>
              <dd>{formatCivilDate(reservation.checkOut)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Noches:</dt>
              <dd>{nights}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reserva</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-base">
            <div className="flex gap-2">
              <dt className="font-medium">Estado:</dt>
              <dd>{RESERVATION_STATUS_LABELS[reservation.status]}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Origen:</dt>
              <dd>{BOOKING_CHANNEL_LABELS[reservation.channel]}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-base">
            <div className="flex gap-2">
              <dt className="font-medium">Estado:</dt>
              <dd>{PAYMENT_STATUS_LABELS[reservation.paymentStatus]}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Total:</dt>
              <dd>{formatPesos(reservation.totalAmount)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Seña:</dt>
              <dd>{formatPesos(reservation.depositAmount)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">Saldo:</dt>
              <dd>{formatPesos(pending)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

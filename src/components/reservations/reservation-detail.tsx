import type { ReservationModel } from "@/generated/prisma/models";
import { formatCivilDate, nightsBetween } from "@/domain/dates";
import { calculatePendingBalance } from "@/domain/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BOOKING_CHANNEL_LABELS,
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/components/reservations/reservation-labels";
import { formatPesos } from "@/lib/format";

interface ReservationDetailProps {
  reservation: ReservationModel;
}

function Definition({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <dt className="font-medium">{term}:</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Read-only reservation detail in the four agreed cards. Missing optionals
// simply render nothing; derived nights and balance come from domain helpers.
export function ReservationDetail({ reservation }: ReservationDetailProps) {
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
            <Definition term="Teléfono">{reservation.phone}</Definition>
            {reservation.dni !== null && (
              <Definition term="DNI">{reservation.dni}</Definition>
            )}
            {reservation.email !== null && (
              <Definition term="Email">{reservation.email}</Definition>
            )}
            {reservation.originCity !== null && (
              <Definition term="Localidad">{reservation.originCity}</Definition>
            )}
            {reservation.guestCount !== null && (
              <Definition term="Personas">{reservation.guestCount}</Definition>
            )}
            {reservation.notes !== null && (
              <Definition term="Notas">{reservation.notes}</Definition>
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
            <Definition term="Entrada">
              {formatCivilDate(reservation.checkIn)}
            </Definition>
            <Definition term="Salida">
              {formatCivilDate(reservation.checkOut)}
            </Definition>
            <Definition term="Noches">{nights}</Definition>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reserva</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-base">
            <Definition term="Estado">
              {RESERVATION_STATUS_LABELS[reservation.status]}
            </Definition>
            <Definition term="Origen">
              {BOOKING_CHANNEL_LABELS[reservation.channel]}
            </Definition>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-base">
            <Definition term="Estado">
              {PAYMENT_STATUS_LABELS[reservation.paymentStatus]}
            </Definition>
            <Definition term="Total">
              {formatPesos(reservation.totalAmount)}
            </Definition>
            <Definition term="Seña">
              {formatPesos(reservation.depositAmount)}
            </Definition>
            <Definition term="Saldo">{formatPesos(pending)}</Definition>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

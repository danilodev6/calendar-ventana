import Link from "next/link";

import type { ReservationModel } from "@/generated/prisma/models";
import { formatCivilDate, nightsBetween } from "@/domain/dates";
import { formatPesos } from "@/lib/format";
import {
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/components/reservations/reservation-labels";

interface ReservationTableProps {
  reservations: ReservationModel[];
}

// Simple history table with comfortable rows and a textual "Ver" action.
// Nights and money come from the shared derived helpers, never from storage.
export function ReservationTable({ reservations }: ReservationTableProps) {
  if (reservations.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-6 text-base text-zinc-600">
        No se encontraron reservas con esos criterios. Probá con otra búsqueda
        o filtro.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full min-w-3xl text-left text-base">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th scope="col" className="px-4 py-3 font-medium">
              Huésped
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Entrada
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Salida
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Noches
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Personas
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Estado
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Pago
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Total
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr
              key={reservation.id}
              className="border-b border-zinc-100 last:border-0"
            >
              <td className="px-4 py-3 font-medium">{reservation.guestName}</td>
              <td className="px-4 py-3">{formatCivilDate(reservation.checkIn)}</td>
              <td className="px-4 py-3">{formatCivilDate(reservation.checkOut)}</td>
              <td className="px-4 py-3 text-right">
                {nightsBetween(reservation.checkIn, reservation.checkOut)}
              </td>
              <td className="px-4 py-3 text-right">
                {reservation.guestCount ?? "—"}
              </td>
              <td className="px-4 py-3">
                {RESERVATION_STATUS_LABELS[reservation.status]}
              </td>
              <td className="px-4 py-3">
                {PAYMENT_STATUS_LABELS[reservation.paymentStatus]}
              </td>
              <td className="px-4 py-3 text-right">
                {formatPesos(reservation.totalAmount)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/reservations/${reservation.id}`}
                  className="font-medium text-blue-700 underline underline-offset-2"
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

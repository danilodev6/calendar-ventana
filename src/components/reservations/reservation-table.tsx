import Link from "next/link";

import type { ReservationModel } from "@/generated/prisma/models";
import { formatCivilDate, nightsBetween } from "@/domain/dates";
import { formatPesos } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import {
  PaymentStatusBadge,
  ReservationStatusBadge,
} from "@/components/reservations/status-badges";

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
    <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm md:p-4">
      <table className="w-full table-auto text-left text-base">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            <th scope="col" className="px-3 py-3 font-medium">
              Huésped
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Entrada
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Salida
            </th>
            <th scope="col" className="hidden px-3 py-3 text-right font-medium lg:table-cell">
              Noches
            </th>
            <th scope="col" className="hidden px-3 py-3 text-right font-medium xl:table-cell">
              Personas
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Estado
            </th>
            <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">
              Pago
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Total
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr
              key={reservation.id}
              className="border-b border-zinc-100 align-middle last:border-0"
            >
              <td className="max-w-44 truncate px-3 py-3 font-medium">{reservation.guestName}</td>
              <td className="px-3 py-3 whitespace-nowrap">{formatCivilDate(reservation.checkIn)}</td>
              <td className="px-3 py-3 whitespace-nowrap">{formatCivilDate(reservation.checkOut)}</td>
              <td className="hidden px-3 py-3 text-right lg:table-cell">
                {nightsBetween(reservation.checkIn, reservation.checkOut)}
              </td>
              <td className="hidden px-3 py-3 text-right xl:table-cell">
                {reservation.guestCount ?? "—"}
              </td>
              <td className="px-3 py-3">
                <ReservationStatusBadge status={reservation.status} />
              </td>
              <td className="hidden px-3 py-3 md:table-cell">
                <PaymentStatusBadge status={reservation.paymentStatus} />
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                {formatPesos(reservation.totalAmount)}
              </td>
              <td className="px-3 py-3">
                <Link
                  href={`/reservations/${reservation.id}`}
                  className={buttonVariants({ variant: "info", className: "min-h-10 px-4 py-1 text-sm" })}
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

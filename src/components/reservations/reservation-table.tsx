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
    <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_12px_32px_rgba(24,24,27,0.035)] md:p-4">
      <table className="w-full min-w-[860px] table-auto text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs tracking-wide text-zinc-500 uppercase">
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
              className="border-b border-zinc-100 align-middle transition-colors hover:bg-zinc-50/80 last:border-0"
            >
              <td className="max-w-44 truncate px-3 py-4 text-base font-semibold text-zinc-900">{reservation.guestName}</td>
              <td className="px-3 py-4 whitespace-nowrap text-zinc-600">{formatCivilDate(reservation.checkIn)}</td>
              <td className="px-3 py-4 whitespace-nowrap text-zinc-600">{formatCivilDate(reservation.checkOut)}</td>
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
                  className={buttonVariants({ variant: "info", className: "min-h-9 rounded-lg px-4 py-1 text-sm" })}
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

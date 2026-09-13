import type { Metadata } from "next";

import { ReservationCalendar } from "@/components/calendar/reservation-calendar";

export const metadata: Metadata = {
  title: "Calendario | Reservas Casa",
  description: "Calendario visual de reservas de la vivienda",
};

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="mb-1 text-sm font-semibold tracking-wide text-blue-600 uppercase">
          Vista general
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
          Calendario
        </h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-600">
          Consultá la disponibilidad y abrí cualquier reserva desde el calendario.
        </p>
      </header>
      <ReservationCalendar />
    </div>
  );
}

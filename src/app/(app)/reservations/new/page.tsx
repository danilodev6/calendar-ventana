import type { Metadata } from "next";

import { ReservationForm } from "@/components/reservations/reservation-form";

export const metadata: Metadata = {
  title: "Nueva reserva | Reservas Casa",
  description: "Registrar una consulta o reserva",
};

export default function NewReservationPage() {
  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="mb-1 text-sm font-semibold tracking-wide text-emerald-600 uppercase">
          Nueva carga
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
          Nueva reserva
        </h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-600">
          Cargá primero los datos principales; el resto puede completarse más adelante.
        </p>
      </header>
      <ReservationForm />
    </div>
  );
}

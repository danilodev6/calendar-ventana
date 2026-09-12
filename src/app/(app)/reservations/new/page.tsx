import type { Metadata } from "next";

import { ReservationForm } from "@/components/reservations/reservation-form";

export const metadata: Metadata = {
  title: "Nueva reserva | Reservas Casa",
  description: "Registrar una consulta o reserva",
};

export default function NewReservationPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Nueva reserva
      </h1>
      <ReservationForm />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { ReservationInput } from "@/domain/schemas";
import { getReservationById } from "@/server/reservations";
import { ReservationForm } from "@/components/reservations/reservation-form";

export const metadata: Metadata = {
  title: "Editar reserva | Reservas Casa",
  description: "Modificar los datos de una reserva",
};

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reservation = await getReservationById(id);
  if (reservation === null) {
    notFound();
  }

  const initialValues: ReservationInput = {
    guestName: reservation.guestName,
    phone: reservation.phone,
    dni: reservation.dni,
    email: reservation.email,
    originCity: reservation.originCity,
    guestCount: reservation.guestCount,
    notes: reservation.notes,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    status: reservation.status,
    paymentStatus: reservation.paymentStatus,
    totalAmount: reservation.totalAmount,
    depositAmount: reservation.depositAmount,
    channel: reservation.channel,
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Editar reserva
      </h1>
      <ReservationForm reservationId={id} initialValues={initialValues} />
    </div>
  );
}

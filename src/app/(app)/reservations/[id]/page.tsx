import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getReservationById } from "@/server/reservations";
import {
  CancelReservationButton,
  DeleteReservationButton,
} from "@/components/reservations/detail-actions";
import { ReservationDetail } from "@/components/reservations/reservation-detail";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalle de reserva | Reservas Casa",
  description: "Datos de una reserva",
};

// Detail with its lifecycle actions. Cancel keeps history and frees dates;
// delete erases the record and is reserved for load mistakes. Cancelling an
// already cancelled stay is disabled with an explanation instead of failing.
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

  return (
    <div className="flex flex-col items-start gap-6">
      <Link
        href="/reservations"
        className={cn(buttonVariants({ variant: "secondary" }))}
      >
        ← Volver
      </Link>
      <div className="w-full">
        <ReservationDetail reservation={reservation} />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <Link
            href={`/reservations/${id}/edit`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Editar reserva
          </Link>
          {reservation.status === "CANCELLED" ? (
            <p className="text-base text-zinc-600">
              Esta reserva ya está cancelada y sus fechas quedaron libres.
            </p>
          ) : (
            <CancelReservationButton reservationId={id} />
          )}
          <DeleteReservationButton reservationId={id} />
        </CardContent>
      </Card>
    </div>
  );
}

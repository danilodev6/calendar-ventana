import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getReservationById } from "@/server/reservations";
import { ReservationDetail } from "@/components/reservations/reservation-detail";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalle de reserva | Reservas Casa",
  description: "Datos de una reserva",
};

// Read-only detail. Edit, cancel and delete actions arrive in Phase 7;
// until then the only action is going back to the history.
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
    </div>
  );
}

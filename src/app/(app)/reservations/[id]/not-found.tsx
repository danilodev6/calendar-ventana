import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReservationNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Reserva no encontrada
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Esta reserva no existe o fue eliminada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-zinc-600">
            Revisá el enlace o volvé a la lista para buscarla.
          </p>
          <Link href="/reservations" className={buttonVariants()}>
            Volver a Todas las reservas
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

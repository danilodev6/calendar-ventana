import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Todas las reservas | Reservas Casa",
  description: "Historial y búsqueda de reservas",
};

export default function ReservationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Todas las reservas
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Todavía no hay reservas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-zinc-600">
            Cuando registres la primera reserva, aparecerá en esta lista junto
            con el buscador y los filtros.
          </p>
          <Link href="/reservations/new" className={buttonVariants()}>
            Nueva reserva
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

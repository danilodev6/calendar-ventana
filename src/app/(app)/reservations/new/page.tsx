import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <Card>
        <CardHeader>
          <CardTitle>Próximamente: formulario de alta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-600">
            Acá se cargarán los datos del huésped, la estadía y el pago. Este
            formulario se construye en la Fase 5.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

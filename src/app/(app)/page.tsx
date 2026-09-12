import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Calendario | Reservas Casa",
  description: "Calendario visual de reservas de la vivienda",
};

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Calendario
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Próximamente: vista de tres meses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-600">
            Acá se mostrarán tres meses simultáneos con las reservas como
            rangos. Esta vista se construye en la Fase 8.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

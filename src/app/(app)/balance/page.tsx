import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Balance | Reservas Casa",
  description: "Ingresos, gastos y resultado",
};

export default function BalancePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Balance</h1>
      <Card>
        <CardHeader>
          <CardTitle>Próximamente: ingresos y gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-600">
            Acá se verán los ingresos por reservas pagadas, los gastos del mes
            y el resultado. Esta pantalla se construye en las Fases 9 y 10.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

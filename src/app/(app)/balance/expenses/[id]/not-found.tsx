import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExpenseNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Gasto no encontrado
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Este gasto no existe o fue eliminado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-zinc-600">Volvé al balance para ver los gastos.</p>
          <Link href="/balance" className={buttonVariants()}>
            Volver al Balance
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

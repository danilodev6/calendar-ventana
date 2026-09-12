import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Página no encontrada
      </h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Esta dirección no existe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-zinc-600">
            Volvé al calendario para seguir trabajando.
          </p>
          <Link href="/" className={buttonVariants()}>
            Ir al Calendario
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

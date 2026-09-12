"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Route-level safety net. It shows a human message with a retry action and
// never leaks technical details; those stay in the server log.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application route error", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Algo salió mal
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>No se pudo mostrar esta pantalla</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-zinc-600">
            Probá de nuevo. Si el problema sigue, cerrá y volvé a abrir la
            aplicación.
          </p>
          <Button type="button" onClick={() => reset()}>
            Intentar nuevamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

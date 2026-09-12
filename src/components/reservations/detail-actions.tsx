"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import {
  cancelReservationAction,
  deleteReservationAction,
} from "@/server/reservation-actions";

export function CancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsPending(true);
    setError(null);
    const result = await cancelReservationAction(reservationId);
    if (result.ok) {
      router.push(`/reservations/${reservationId}`);
      router.refresh();
      return;
    }
    setError(result.message);
    setIsPending(false);
  }

  if (!confirming) {
    return (
      <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
        Cancelar reserva
      </Button>
    );
  }

  return (
    <ConfirmPanel
      description="La reserva se conserva en el historial y sus fechas quedan libres para otras reservas."
      confirmLabel="Sí, cancelar reserva"
      pendingLabel="Cancelando…"
      isPending={isPending}
      error={error}
      onConfirm={handleConfirm}
      onCancel={() => setConfirming(false)}
    />
  );
}

export function DeleteReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsPending(true);
    setError(null);
    const result = await deleteReservationAction(reservationId);
    if (result.ok) {
      router.push("/reservations");
      router.refresh();
      return;
    }
    setError(result.message);
    setIsPending(false);
  }

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
        Eliminar reserva
      </Button>
    );
  }

  return (
    <ConfirmPanel
      description="La reserva se borra definitivamente y no queda en el historial. Usalo solo para errores de carga."
      confirmLabel="Sí, eliminar definitivamente"
      pendingLabel="Eliminando…"
      isPending={isPending}
      error={error}
      onConfirm={handleConfirm}
      onCancel={() => setConfirming(false)}
    />
  );
}

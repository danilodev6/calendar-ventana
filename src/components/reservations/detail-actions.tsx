"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  cancelReservationAction,
  deleteReservationAction,
} from "@/server/reservation-actions";

interface ConfirmPanelProps {
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// Inline two-step confirmation with explicit texts. Dismissing the panel
// never mutates: the action only runs after the explicit confirm button.
function ConfirmPanel({
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  error,
  onConfirm,
  onCancel,
}: ConfirmPanelProps) {
  return (
    <div
      role="alertdialog"
      aria-label={confirmLabel}
      className="flex flex-col items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4"
    >
      <p className="text-base text-red-900">{description}</p>
      {error !== null && (
        <p role="alert" className="text-base font-medium text-red-800">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 md:flex-row">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={onCancel}
        >
          Volver
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={onConfirm}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </div>
  );
}

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

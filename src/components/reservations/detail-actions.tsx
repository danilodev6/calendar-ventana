"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type {
  PaymentStatus,
  ReservationStatus,
} from "@/domain/reservations";
import {
  RESERVATION_STATUS_LABELS,
} from "@/components/reservations/reservation-labels";
import { Button } from "@/components/ui/button";
import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { formatPesoInput, parsePesoInput } from "@/components/ui/peso-input";
import { formatPesos } from "@/lib/format";
import {
  cancelReservationAction,
  deleteReservationAction,
  updateReservationAction,
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
      setIsPending(false);
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
      setIsPending(false);
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

// One-click payment changes from the detail, without opening the edit form.
// Every change runs through the same transactional update (and its
// validations) as editing. "Pago seña" asks for the deposit amount in a
// dialog because an unpaid stay never carries one. Fully paid stays offer a
// step back so a mistaken tap is reversible without editing.
export function PaymentQuickActions({
  reservationId,
  paymentStatus,
  depositAmount,
  totalAmount,
}: {
  reservationId: string;
  paymentStatus: PaymentStatus;
  depositAmount: number;
  totalAmount: number;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);

  async function applyChange(input: { paymentStatus: PaymentStatus; depositAmount?: number }) {
    setIsPending(true);
    setError(null);
    const result = await updateReservationAction({
      id: reservationId,
      input,
    });
    setIsPending(false);
    if (result.ok) {
      setDepositOpen(false);
      router.refresh();
      return;
    }
    setError(result.message);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {paymentStatus === "UNPAID" && (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setDepositOpen(true);
            }}
          >
            Pago seña
          </Button>
        )}
        {paymentStatus !== "PAID_FULL" && (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => applyChange({ paymentStatus: "PAID_FULL" })}
          >
            {isPending && !depositOpen ? "Guardando…" : "Pagado completo"}
          </Button>
        )}
        {paymentStatus === "PAID_FULL" && depositAmount > 0 && (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => applyChange({ paymentStatus: "DEPOSIT_PAID" })}
          >
            {isPending ? "Guardando…" : "Volver a seña"}
          </Button>
        )}
        {paymentStatus === "PAID_FULL" && depositAmount === 0 && (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => applyChange({ paymentStatus: "UNPAID" })}
          >
            {isPending ? "Guardando…" : "Volver a sin pagar"}
          </Button>
        )}
      </div>
      {error !== null && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {depositOpen && (
        <DepositDialog
          totalAmount={totalAmount}
          isPending={isPending}
          onConfirm={(amount) =>
            applyChange({ paymentStatus: "DEPOSIT_PAID", depositAmount: amount })
          }
          onCancel={() => setDepositOpen(false)}
        />
      )}
    </div>
  );
}

// Modal dialog to record the deposit amount. The server revalidates the
// amount and the new state; this dialog only avoids a pointless round trip
// for empty or excessive values.
function DepositDialog({
  totalAmount,
  isPending,
  onConfirm,
  onCancel,
}: {
  totalAmount: number;
  isPending: boolean;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleConfirm() {
    const amount = parsePesoInput(raw);
    if (amount === undefined || amount <= 0) {
      setLocalError("Ingresá un importe de seña mayor a cero.");
      return;
    }
    if (amount >= totalAmount) {
      setLocalError(
        `La seña debe ser menor que el total (${formatPesos(totalAmount)}).`,
      );
      return;
    }
    setLocalError(null);
    onConfirm(amount);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar seña"
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
        }}
      >
        <h2 className="text-xl font-bold tracking-tight">Registrar seña</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="deposit-dialog-amount" className="text-base font-medium">
            Importe de la seña en pesos
          </label>
          <input
            id="deposit-dialog-amount"
            type="text"
            inputMode="numeric"
            autoFocus
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-right text-base"
            value={formatPesoInput(parsePesoInput(raw))}
            onChange={(event) => setRaw(event.target.value)}
          />
          {localError !== null && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {localError}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onCancel}
          >
            Volver
          </Button>
          <Button type="button" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Guardando…" : "Confirmar seña"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// One-click status changes from the detail. Confirming revalidates
// availability; cancelling keeps history like the explicit cancel action.
// The current status is never offered.
const STATUS_ORDER: ReservationStatus[] = [
  "INQUIRY",
  "RESERVED",
  "CANCELLED",
  "COMPLETED",
];

export function StatusQuickActions({
  reservationId,
  status,
}: {
  reservationId: string;
  status: ReservationStatus;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyChange(next: ReservationStatus) {
    setIsPending(true);
    setError(null);
    const result = await updateReservationAction({
      id: reservationId,
      input: { status: next },
    });
    setIsPending(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(result.message);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.filter((option) => option !== status).map((option) => (
          <Button
            key={option}
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => applyChange(option)}
          >
            {isPending ? "Guardando…" : RESERVATION_STATUS_LABELS[option]}
          </Button>
        ))}
      </div>
      {error !== null && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

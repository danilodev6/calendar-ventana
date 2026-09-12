"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmPanel } from "@/components/ui/confirm-panel";
import { deleteExpenseAction } from "@/server/expense-actions";

interface DeleteExpenseButtonProps {
  expenseId: string;
  description: string;
  onDeleted?: (expenseId: string) => void;
}

// Delete action with an explicit inline confirmation. Dismissing the panel
// never mutates.
export function DeleteExpenseButton({
  expenseId,
  description,
  onDeleted,
}: DeleteExpenseButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsPending(true);
    setError(null);
    const result = await deleteExpenseAction(expenseId);
    if (result.ok) {
      onDeleted?.(expenseId);
      router.refresh();
      return;
    }
    setError(result.message);
    setIsPending(false);
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-medium text-red-700 underline underline-offset-2"
      >
        Eliminar
      </button>
    );
  }

  return (
    <ConfirmPanel
      description={`El gasto "${description}" se elimina definitivamente.`}
      confirmLabel="Sí, eliminar gasto"
      pendingLabel="Eliminando…"
      isPending={isPending}
      error={error}
      onConfirm={handleConfirm}
      onCancel={() => setConfirming(false)}
    />
  );
}

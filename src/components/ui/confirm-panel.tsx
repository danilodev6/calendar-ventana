"use client";

import { Button } from "@/components/ui/button";

export interface ConfirmPanelProps {
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
export function ConfirmPanel({
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

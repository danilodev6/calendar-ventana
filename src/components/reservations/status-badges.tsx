import {
  BadgeCheck,
  CalendarCheck,
  Circle,
  CircleHelp,
  CircleX,
  Coins,
  Flag,
} from "lucide-react";

import type {
  PaymentStatus,
  ReservationStatus,
} from "@/domain/reservations";
import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/components/reservations/reservation-labels";

// Status badges combine text, icon and color so meaning never depends on
// color alone. Tones follow the agreed palette: amber inquiry, blue reserved,
// red/gray cancelled, violet/gray completed.
export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus;
}) {
  switch (status) {
    case "INQUIRY":
      return (
        <Badge tone="amber">
          <CircleHelp aria-hidden="true" />
          {RESERVATION_STATUS_LABELS[status]}
        </Badge>
      );
    case "RESERVED":
      return (
        <Badge tone="blue">
          <CalendarCheck aria-hidden="true" />
          {RESERVATION_STATUS_LABELS[status]}
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge tone="red">
          <CircleX aria-hidden="true" />
          {RESERVATION_STATUS_LABELS[status]}
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge tone="violet">
          <Flag aria-hidden="true" />
          {RESERVATION_STATUS_LABELS[status]}
        </Badge>
      );
  }
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  switch (status) {
    case "UNPAID":
      return (
        <Badge tone="gray">
          <Circle aria-hidden="true" />
          {PAYMENT_STATUS_LABELS[status]}
        </Badge>
      );
    case "DEPOSIT_PAID":
      return (
        <Badge tone="amber">
          <Coins aria-hidden="true" />
          {PAYMENT_STATUS_LABELS[status]}
        </Badge>
      );
    case "PAID_FULL":
      return (
        <Badge tone="green">
          <BadgeCheck aria-hidden="true" />
          {PAYMENT_STATUS_LABELS[status]}
        </Badge>
      );
  }
}

import type {
  BookingChannel,
  PaymentStatus,
  ReservationStatus,
} from "@/domain/reservations";
import type { ReservationFilter } from "@/server/reservations";

// Single label maps from internal enum values to user-visible Spanish text.
// Internal values are never shown directly. Brand names stay as they exist.
export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  INQUIRY: "Consulta",
  RESERVED: "Reservada",
  CANCELLED: "Cancelada",
  COMPLETED: "Finalizada",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Sin pagar",
  DEPOSIT_PAID: "Seña pagada",
  PAID_FULL: "Pagado completo",
};

export const BOOKING_CHANNEL_LABELS: Record<BookingChannel, string> = {
  DIRECT: "Directa",
  AIRBNB: "Airbnb",
  BOOKING: "Booking",
  OTHER: "Otra",
};

export const RESERVATION_FILTER_LABELS: Record<ReservationFilter, string> = {
  all: "Todas",
  upcoming: "Próximas",
  completed: "Finalizadas",
  cancelled: "Canceladas",
  inquiries: "Consultas",
};

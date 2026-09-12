import type { ReservationStatus } from "@/domain/reservations";
import { RESERVATION_STATUS_LABELS } from "@/components/reservations/reservation-labels";

// Minimal stay shape the calendar needs. Money and payment data are never
// exposed to this view.
export interface CalendarStay {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
}

export interface CalendarEvent {
  id: string;
  title: string;
  // Civil dates passed through untouched: FullCalendar all-day events also
  // treat `end` as exclusive, so no day is added or removed.
  start: string;
  end: string;
  allDay: true;
  classNames: string[];
}

const STATUS_EVENT_CLASSES: Record<ReservationStatus, string> = {
  INQUIRY: "calendar-event-inquiry",
  RESERVED: "calendar-event-reserved",
  CANCELLED: "calendar-event-cancelled",
  COMPLETED: "calendar-event-completed",
};

export function reservationToCalendarEvent(stay: CalendarStay): CalendarEvent {
  return {
    id: stay.id,
    title: `${stay.guestName} · ${RESERVATION_STATUS_LABELS[stay.status]}`,
    start: stay.checkIn,
    end: stay.checkOut,
    allDay: true,
    classNames: ["calendar-event", STATUS_EVENT_CLASSES[stay.status]],
  };
}

export function buildReservationUrl(reservationId: string): string {
  return `/reservations/${reservationId}`;
}

// Formats a local Date as YYYY-MM-DD using local parts only, so the visible
// range request never shifts a day across timezones.
export function toCivilDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

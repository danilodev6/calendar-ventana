"use client";

import type { EventClickArg, EventInput } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import multiMonthPlugin from "@fullcalendar/multimonth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CALENDAR_OPTIONS } from "@/components/calendar/calendar-config";
import "./calendar.css";
import {
  buildReservationUrl,
  reservationToCalendarEvent,
  toCivilDateString,
  type CalendarStay,
} from "@/components/calendar/event-adapter";

interface FetchInfo {
  start: Date;
  end: Date;
}

type FetchSuccess = (events: EventInput[]) => void;
type FetchFailure = (error: Error) => void;

// Main three-month calendar. Stays load per visible range through the bounded
// JSON endpoint; cancelled stays render dimmed and struck through unless the
// toggle hides them. Clicking an event opens its detail page.
export function ReservationCalendar() {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [hideCancelled, setHideCancelled] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const hideCancelledRef = useRef(hideCancelled);

  const loadEvents = useCallback(
    async (info: FetchInfo, success: FetchSuccess, failure: FetchFailure) => {
      try {
        const from = toCivilDateString(info.start);
        const to = toCivilDateString(info.end);
        const response = await fetch(
          `/api/reservations?from=${from}&to=${to}`,
        );
        if (!response.ok) {
          throw new Error(`Calendar request failed: ${response.status}`);
        }
        const stays = (await response.json()) as CalendarStay[];
        const visible = hideCancelledRef.current
          ? stays.filter((stay) => stay.status !== "CANCELLED")
          : stays;
        setLoadError(false);
        success(visible.map(reservationToCalendarEvent));
      } catch (error) {
        setLoadError(true);
        failure(
          error instanceof Error ? error : new Error("Calendar load failed"),
        );
      }
    },
    [],
  );

  useEffect(() => {
    hideCancelledRef.current = hideCancelled;
    calendarRef.current?.getApi().refetchEvents();
  }, [hideCancelled]);

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      arg.jsEvent.preventDefault();
      router.push(buildReservationUrl(arg.event.id));
    },
    [router],
  );

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_18px_48px_rgba(24,24,27,0.05)] sm:p-6">
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-900">Disponibilidad</p>
          <p className="mt-0.5 text-sm text-zinc-500">
            Mes actual y próximos dos meses
          </p>
        </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 self-start rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 sm:self-auto">
        <input
          type="checkbox"
          className="size-4 accent-blue-600"
          checked={hideCancelled}
          onChange={(event) => setHideCancelled(event.target.checked)}
        />
        Ocultar canceladas
      </label>
      </div>
      {loadError && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-base font-medium text-red-800"
        >
          No se pudo cargar el calendario. Intentá nuevamente.
        </p>
      )}
      <FullCalendar
        ref={calendarRef}
        plugins={[multiMonthPlugin]}
        events={loadEvents}
        eventClick={handleEventClick}
        {...CALENDAR_OPTIONS}
      />
    </div>
  );
}

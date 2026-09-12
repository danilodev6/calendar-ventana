import type { CalendarOptions } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";

// Frozen FullCalendar Standard (MIT) configuration for the main screen,
// decided in the Phase 8 spike. Only documented multiMonth options are used:
// a custom three-month view, at most three month columns on desktop, one
// month steps for prev/next, Spanish locale with Monday first, no
// drag-and-drop, selection, resources or schedules.
export const THREE_MONTH_VIEW = "multiMonthThree";

export const CALENDAR_OPTIONS: CalendarOptions = {
  initialView: THREE_MONTH_VIEW,
  views: {
    [THREE_MONTH_VIEW]: {
      type: "multiMonth",
      duration: { months: 3 },
    },
  },
  multiMonthMaxColumns: 3,
  dateIncrement: { months: 1 },
  locales: [esLocale],
  locale: "es",
  firstDay: 1,
  weekends: true,
  editable: false,
  selectable: false,
  navLinks: false,
  displayEventTime: false,
  headerToolbar: {
    start: "prev,next today",
    center: "title",
    end: "",
  },
  buttonText: {
    today: "Hoy",
    prev: "Anterior",
    next: "Siguiente",
  },
};

import type { CalendarOptions } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";

// Frozen FullCalendar Standard (MIT) configuration for the main screen.
// Only documented multiMonth options are used: a custom two-month view, at
// most two month columns on desktop, one month steps for prev/next, Spanish
// locale with Monday first, no drag-and-drop, selection, resources or
// schedules. The toolbar carries only navigation buttons: the range title is
// intentionally omitted.
export const TWO_MONTH_VIEW = "multiMonthTwo";

export const CALENDAR_OPTIONS: CalendarOptions = {
  initialView: TWO_MONTH_VIEW,
  views: {
    [TWO_MONTH_VIEW]: {
      type: "multiMonth",
      duration: { months: 2 },
    },
  },
  multiMonthMaxColumns: 2,
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
    center: "",
    end: "",
  },
  buttonText: {
    today: "Hoy",
    prev: "Anterior",
    next: "Siguiente",
  },
};

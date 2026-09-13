import type { CalendarOptions } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";

// Frozen FullCalendar Standard (MIT) configuration for the main screen.
// Only documented multiMonth options are used: a custom three-month view, at
// most three month columns on desktop, one month steps for prev/next, Spanish
// locale with Monday first, no drag-and-drop, selection, resources or
// schedules. The toolbar carries only navigation buttons: the range title is
// intentionally omitted.
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
  multiMonthMinWidth: 300,
  height: "auto",
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
    start: "prev today next",
    center: "",
    end: "",
  },
  buttonText: {
    today: "Hoy",
    prev: "Anterior",
    next: "Siguiente",
  },
};

import type {
  ReservationFilter,
  SortDirection,
} from "@/server/reservations";

// Shareable history URLs. Defaults (all/desc/empty search) stay implicit so
// links remain short; anything else travels as query params.
export function buildHistoryHref(args: {
  filter: ReservationFilter;
  sort: SortDirection;
  query: string;
}): string {
  const params = new URLSearchParams();
  if (args.filter !== "all") {
    params.set("filter", args.filter);
  }
  if (args.sort !== "desc") {
    params.set("sort", args.sort);
  }
  if (args.query !== "") {
    params.set("q", args.query);
  }
  const query = params.toString();
  return query === "" ? "/reservations" : `/reservations?${query}`;
}

// Pressing the active filter pill flips the check-in order.
export function toggleSort(sort: SortDirection): SortDirection {
  return sort === "asc" ? "desc" : "asc";
}

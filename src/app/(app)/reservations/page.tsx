import type { Metadata } from "next";
import Link from "next/link";

import {
  parseReservationFilter,
  parseSortDirection,
  RESERVATION_FILTERS,
  searchReservations,
} from "@/server/reservations";
import {
  buildHistoryHref,
  toggleSort,
} from "@/app/(app)/reservations/history-url";
import { RESERVATION_FILTER_LABELS } from "@/components/reservations/reservation-labels";
import { ReservationTable } from "@/components/reservations/reservation-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Todas las reservas | Reservas Casa",
  description: "Historial y búsqueda de reservas",
};

interface ReservationsPageProps {
  searchParams: Promise<{ filter?: string; sort?: string; q?: string }>;
}

// Searchable history. Filters, check-in order and the guest-name search
// travel as query params so every view is shareable; pressing the active
// filter again flips between newest-first and oldest-first.
export default async function ReservationsPage({
  searchParams,
}: ReservationsPageProps) {
  const params = await searchParams;
  const filter = parseReservationFilter(params.filter);
  const sort = parseSortDirection(params.sort);
  const query = (params.q ?? "").trim();
  const reservations = await searchReservations({ filter, search: query, sort });
  const isUnfiltered = filter === "all" && query === "" && sort === "desc";

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="mb-1 text-sm font-semibold tracking-wide text-violet-600 uppercase">
          Historial
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
          Todas las reservas
        </h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-600">
          Buscá huéspedes y filtrá las estadías por su estado.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5">
        <form
          method="get"
          action="/reservations"
          role="search"
          className="flex flex-col gap-3 md:flex-row"
        >
        <input type="hidden" name="filter" value={filter} />
        <input type="hidden" name="sort" value={sort} />
        <label htmlFor="reservation-search" className="sr-only">
          Buscar por huésped
        </label>
        <input
          id="reservation-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Buscar por huésped…"
          autoComplete="off"
          className="min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-base shadow-sm outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className={cn(buttonVariants(), "flex-1 md:flex-none")}
          >
            Buscar
          </button>
          {query !== "" && (
            <Link
              href={buildHistoryHref({ filter, sort, query: "" })}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex-1 md:flex-none",
              )}
            >
              Limpiar
            </Link>
          )}
        </div>
        </form>

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
        {RESERVATION_FILTERS.map((option) => {
          const isActive = option === filter;
          return (
            <Link
              key={option}
              href={buildHistoryHref({
                filter: option,
                sort: isActive ? toggleSort(sort) : sort,
                query,
              })}
              aria-current={isActive ? "page" : undefined}
              title={
                isActive
                  ? sort === "desc"
                    ? "Ordenadas de más nuevas a más viejas; apretá para invertir"
                    : "Ordenadas de más viejas a más nuevas; apretá para invertir"
                  : undefined
              }
              className={cn(
                "inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-center text-sm leading-none font-semibold shadow-sm transition-all",
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100",
              )}
            >
              {RESERVATION_FILTER_LABELS[option]}
              {isActive && (
                <>
                  <span aria-hidden="true">{sort === "desc" ? " ↓" : " ↑"}</span>
                  <span className="sr-only">
                    {sort === "desc"
                      ? ", orden descendente por entrada"
                      : ", orden ascendente por entrada"}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </nav>
      </div>

      {reservations.length === 0 && isUnfiltered ? (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay reservas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-zinc-600">
              Cuando registres la primera reserva, aparecerá en esta lista
              junto con el buscador y los filtros.
            </p>
            <Link href="/reservations/new" className={buttonVariants()}>
              Nueva reserva
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ReservationTable reservations={reservations} />
      )}
    </div>
  );
}

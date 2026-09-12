import type { Metadata } from "next";
import Link from "next/link";

import {
  parseReservationFilter,
  RESERVATION_FILTERS,
  searchReservations,
} from "@/server/reservations";
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
  searchParams: Promise<{ filter?: string; q?: string }>;
}

function filterHref(filter: string, query: string): string {
  const params = new URLSearchParams();
  params.set("filter", filter);
  if (query !== "") {
    params.set("q", query);
  }
  return `/reservations?${params.toString()}`;
}

// Searchable history. Filters and the guest-name search travel as query
// params so every view is shareable; the search itself needs no JavaScript.
export default async function ReservationsPage({
  searchParams,
}: ReservationsPageProps) {
  const params = await searchParams;
  const filter = parseReservationFilter(params.filter);
  const query = (params.q ?? "").trim();
  const reservations = await searchReservations({ filter, search: query });
  const isUnfiltered = filter === "all" && query === "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Todas las reservas
      </h1>

      <form
        method="get"
        action="/reservations"
        role="search"
        className="flex flex-col gap-3 md:flex-row"
      >
        <input type="hidden" name="filter" value={filter} />
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
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base"
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
              href={filterHref(filter, "")}
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

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {RESERVATION_FILTERS.map((option) => (
          <Link
            key={option}
            href={filterHref(option, query)}
            aria-current={option === filter ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-base font-medium transition-colors",
              option === filter
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100",
            )}
          >
            {RESERVATION_FILTER_LABELS[option]}
          </Link>
        ))}
      </nav>

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

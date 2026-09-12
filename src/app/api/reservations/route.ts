import { NextResponse } from "next/server";

import { isValidCivilDate, nightsBetween } from "@/domain/dates";
import { getCalendarStaysInRange } from "@/server/reservations";

// Bounded read endpoint consumed by the calendar view: returns the stays
// intersecting [from, to) with the minimal fields the calendar needs.
// Anything else keeps using Server Actions; this handler exists only
// because the calendar fetches new ranges as the user navigates.
const MAX_RANGE_NIGHTS = 400;

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  if (
    !isValidCivilDate(from) ||
    !isValidCivilDate(to) ||
    !(from < to) ||
    nightsBetween(from, to) > MAX_RANGE_NIGHTS
  ) {
    return NextResponse.json(
      {
        message:
          "Indicá un rango válido con from y to en formato AAAA-MM-DD.",
      },
      { status: 400 },
    );
  }

  const stays = await getCalendarStaysInRange({ from, to });
  return NextResponse.json(stays);
}

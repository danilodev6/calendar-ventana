import { NextResponse } from "next/server";

import { checkHealth } from "@/server/health";

export async function GET(): Promise<NextResponse> {
  const status = await checkHealth();
  return NextResponse.json(status, {
    status: status.status === "ok" ? 200 : 503,
  });
}

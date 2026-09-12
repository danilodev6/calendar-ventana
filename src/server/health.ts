import type { PrismaClient } from "@/generated/prisma/client";

import { db } from "@/server/db";

// Minimal liveness probe for the launcher and smoke checks. It verifies the
// server process and SQLite read access without exposing any user data. The
// fixed app marker lets the launcher tell this app apart from any other
// process answering on the same port.
export const HEALTH_APP_MARKER = "reservas-casa";

export interface HealthStatus {
  status: "ok" | "error";
  app: typeof HEALTH_APP_MARKER;
}

export async function checkHealth(
  client: PrismaClient = db,
): Promise<HealthStatus> {
  try {
    await client.$queryRaw`SELECT 1`;
    return { status: "ok", app: HEALTH_APP_MARKER };
  } catch {
    return { status: "error", app: HEALTH_APP_MARKER };
  }
}

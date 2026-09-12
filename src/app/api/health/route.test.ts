import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";
import { checkHealth } from "@/server/health";
import { createDatabaseClient } from "@/server/db";
import {
  createIsolatedDatabase,
  type IsolatedDatabase,
} from "../../../../tests/database-helpers";

const SETUP_TIMEOUT_MS = 120000;

let database: IsolatedDatabase;

beforeAll(async () => {
  database = await createIsolatedDatabase();
}, SETUP_TIMEOUT_MS);

afterAll(async () => {
  await database.cleanup();
});

describe("checkHealth", () => {
  it(
    "reports a healthy server with the app marker",
    async () => {
      await expect(checkHealth(database.client)).resolves.toEqual({
        status: "ok",
        app: "reservas-casa",
      });
    },
    SETUP_TIMEOUT_MS,
  );

  it(
    "reports an error without exposing data when SQLite is unreachable",
    async () => {
      const broken = createDatabaseClient("file:/tmp");
      await expect(checkHealth(broken)).resolves.toEqual({
        status: "error",
        app: "reservas-casa",
      });
      await broken.$disconnect();
    },
    SETUP_TIMEOUT_MS,
  );
});

describe("GET /api/health", () => {
  it("answers 200 with the app marker on a working database", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; app: string };
    expect(body).toEqual({ status: "ok", app: "reservas-casa" });
    expect(JSON.stringify(body)).not.toContain("Laura");
  });
});

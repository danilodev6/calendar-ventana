import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { todayInTimeZone } from "@/domain/dates";
import {
  databaseFileUrl,
  hasManagedSnapshot,
  isOurApp,
  main,
  parseArgs,
  probeHealth,
  resolveAppDirs,
  waitForHealth,
} from "../scripts/launch.mjs";

const TEST_TIMEOUT_MS = 30000;

describe("launcher arguments", () => {
  it("parses flags and ignores invalid values", () => {
    const parsed = parseArgs([
      "--dir=/tmp/casa",
      "--port=3101",
      "--no-browser",
      "--wait-timeout=10",
    ]);
    expect(parsed).toMatchObject({
      port: 3101,
      noBrowser: true,
      waitTimeoutSec: 10,
    });
    expect(parsed.dir).toBe(resolve("/tmp/casa"));

    const invalid = parseArgs(["--port=nope", "--wait-timeout=-3"]);
    expect(invalid.port).toBe(3000);
    expect(invalid.waitTimeoutSec).toBe(60);
  });

  it("resolves data and backup directories without shell syntax", () => {
    const plain = resolveAppDirs("/apps/casa", {});
    expect(plain.dataDir).toBe(resolve("/apps/casa/data"));
    expect(plain.backupsDir).toBe(resolve("/apps/casa/backups"));

    const spaced = resolveAppDirs("/apps/mi casa", {
      RESERVATIONS_DATA_DIR: "/datos con espacios",
    });
    expect(spaced.dataDir).toBe("/datos con espacios");
    expect(databaseFileUrl("/datos con espacios")).toBe(
      "file:/datos con espacios/app.db",
    );
  });
});

describe("health probing", () => {
  let server: Server | null = null;

  afterEach(async () => {
    await new Promise<void>((resolveDone) => {
      if (server === null) {
        resolveDone();
        return;
      }
      server.close(() => resolveDone());
      server = null;
    });
  });

  async function listen(
    handler: (request: { url?: string }, respond: (code: number, body: string) => void) => void,
  ): Promise<number> {
    server = createServer((request, response) => {
      handler(request, (code, body) => {
        response.writeHead(code, { "content-type": "application/json" });
        response.end(body);
      });
    });
    await new Promise<void>((resolveDone) => {
      server?.listen(0, "127.0.0.1", () => resolveDone());
    });
    const address = server?.address();
    if (address === null || address === undefined || typeof address === "string") {
      throw new Error("Could not bind the stub server");
    }
    return address.port;
  }

  it("recognizes this app and waits until it answers", async () => {
    const port = await listen((_request, respond) => {
      respond(200, JSON.stringify({ status: "ok", app: "reservas-casa" }));
    });
    const probe = await probeHealth(port);
    expect(isOurApp(probe)).toBe(true);
    await expect(waitForHealth(port, { timeoutMs: 5000 })).resolves.toBe(true);
  });

  it("reports unreachable ports without waiting forever", async () => {
    const port = await listen(() => {});
    // Close immediately so connections are refused.
    await new Promise<void>((resolveDone) => {
      server?.close(() => resolveDone());
      server = null;
    });
    const probe = await probeHealth(port, 500);
    expect(probe).toEqual({ reachable: false });
    expect(isOurApp(probe)).toBe(false);
    await expect(
      waitForHealth(port, { timeoutMs: 1200, intervalMs: 200 }),
    ).resolves.toBe(false);
  }, TEST_TIMEOUT_MS);

  it("distinguishes foreign answers on a busy port", () => {
    expect(
      isOurApp({ reachable: true, status: 200, body: { app: "other" } }),
    ).toBe(false);
    expect(
      isOurApp({ reachable: true, status: 500, body: { app: "reservas-casa" } }),
    ).toBe(false);
  });
});

describe("launcher single-instance behavior", () => {
  let server: Server | null = null;

  afterEach(async () => {
    await new Promise<void>((resolveDone) => {
      if (server === null) {
        resolveDone();
        return;
      }
      server.close(() => resolveDone());
      server = null;
    });
  });

  it("opens the running app instead of starting a second instance", async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", app: "reservas-casa" }));
    });
    await new Promise<void>((resolveDone) => {
      server?.listen(0, "127.0.0.1", () => resolveDone());
    });
    const address = server.address();
    if (address === null || typeof address === "string" || address === undefined) {
      throw new Error("Could not bind the stub server");
    }
    const emptyDir = mkdtempSync(join(tmpdir(), "reservas-launch-empty-"));
    try {
      const code = await main(
        [`--dir=${emptyDir}`, `--port=${address.port}`, "--no-browser"],
        {},
      );
      expect(code).toBe(0);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT_MS);

  it("refuses to kill foreign processes on a busy port", async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", app: "something-else" }));
    });
    await new Promise<void>((resolveDone) => {
      server?.listen(0, "127.0.0.1", () => resolveDone());
    });
    const address = server.address();
    if (address === null || typeof address === "string" || address === undefined) {
      throw new Error("Could not bind the stub server");
    }
    const emptyDir = mkdtempSync(join(tmpdir(), "reservas-launch-empty-"));
    try {
      const code = await main(
        [`--dir=${emptyDir}`, `--port=${address.port}`, "--no-browser"],
        {},
      );
      expect(code).toBe(2);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT_MS);

  it("stops when the install directory has no server", async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "reservas-launch-empty-"));
    try {
      const freePort = 32111;
      const probe = await probeHealth(freePort, 300);
      if (probe.reachable) {
        return;
      }
      const code = await main(
        [`--dir=${emptyDir}`, `--port=${freePort}`, "--no-browser"],
        {},
      );
      expect(code).toBe(1);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT_MS);
});

const distRoot = resolve(process.cwd(), "dist");

describe.runIf(existsSync(join(distRoot, "server.js")))(
  "production distribution",
  () => {
    it(
      "ships every runtime artifact the launcher needs",
      () => {
        const required = [
          "server.js",
          "launch.mjs",
          "launch.cmd",
          "launch.command",
          "public",
          ".next/static",
          "prisma/schema.prisma",
          "prisma/migrations",
          "prisma.config.ts",
          "scripts/backup.cjs",
          "node_modules/prisma/build/index.js",
          "node_modules/@prisma/client",
          "node_modules/better-sqlite3",
        ];
        for (const relative of required) {
          expect(
            existsSync(join(distRoot, relative)),
            `missing distributable: ${relative}`,
          ).toBe(true);
        }
        expect(
          existsSync(
            join(distRoot, "node_modules", "better-sqlite3", "prebuilds"),
          ),
        ).toBe(true);
      },
    );

    it(
      "boots from persistent locations and shuts down with a snapshot",
      async () => {
        // Copy the distribution so the test never touches real data and
        // paths with spaces are covered end to end.
        const { cpSync } = await import("node:fs");
        const installDir = mkdtempSync(join(tmpdir(), "casa con espacios-"));
        cpSync(distRoot, installDir, { recursive: true });
        const dataDir = join(installDir, "datos con espacios");
        const port = 3131;
        const child = spawn(
          process.execPath,
          [
            join(installDir, "launch.mjs"),
            `--dir=${installDir}`,
            `--port=${port}`,
            "--no-browser",
          ],
          { env: { ...process.env, RESERVATIONS_DATA_DIR: dataDir } },
        );
        let output = "";
        child.stdout?.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });
        child.stderr?.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });
        const childExit = new Promise<number | null>((resolveExit) => {
          child.on("exit", (code) => resolveExit(code));
        });
        try {
          await vi.waitFor(
            () => {
              if (!output.includes("Reservas Casa lista")) {
                throw new Error("waiting for the ready marker");
              }
            },
            { timeout: 120000, interval: 1000 },
          );
          const health = (await (
            await fetch(`http://127.0.0.1:${port}/api/health`)
          ).json()) as { status: string; app: string };
          expect(health).toEqual({ status: "ok", app: "reservas-casa" });
          expect(existsSync(join(dataDir, "app.db"))).toBe(true);
          expect(
            hasManagedSnapshot(join(installDir, "backups")),
          ).toBe(true);

          child.kill("SIGTERM");
          const code = await Promise.race([
            childExit,
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error("launcher did not stop")), 90000),
            ),
          ]);
          expect(code).toBe(0);
          const today = todayInTimeZone();
          expect(
            existsSync(
              join(installDir, "backups", `reservas-${today}-shutdown.db`),
            ),
          ).toBe(true);
          await expect(
            fetch(`http://127.0.0.1:${port}/api/health`),
          ).rejects.toThrow();
        } finally {
          child.kill("SIGKILL");
          rmSync(installDir, { recursive: true, force: true });
        }
      },
      240000,
    );
  },
);

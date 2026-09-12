// Local launcher for the production build (Phase 13).
//
// Flow: single-instance check -> migrate deploy -> startup snapshot ->
// production server -> wait for health -> default browser. Ctrl+C (or the
// Stop wrapper) closes the server gracefully and takes the shutdown snapshot.
//
// Plain JavaScript with Node builtins only, so production runs it without a
// toolchain. Usage:
//   node launch.mjs [--dir=<install dir>] [--port=3000] [--no-browser]
//                   [--wait-timeout=60]
// Exit codes: 0 running/stopped cleanly, 1 failure, 2 port taken by other app.
import { execFile, spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 3000;
const DEFAULT_WAIT_TIMEOUT_SEC = 60;
const HEALTH_TIMEOUT_MS = 3000;
const HEALTH_INTERVAL_MS = 500;
const SHUTDOWN_GRACE_MS = 10000;
const APP_MARKER = "reservas-casa";

export function parseArgs(argv) {
  const args = {
    dir: dirname(fileURLToPath(import.meta.url)),
    port: DEFAULT_PORT,
    noBrowser: false,
    waitTimeoutSec: DEFAULT_WAIT_TIMEOUT_SEC,
  };
  for (const raw of argv) {
    if (raw.startsWith("--dir=")) {
      args.dir = resolve(raw.slice("--dir=".length));
    } else if (raw.startsWith("--port=")) {
      const port = Number(raw.slice("--port=".length));
      if (Number.isInteger(port) && port > 0 && port < 65536) {
        args.port = port;
      }
    } else if (raw === "--no-browser") {
      args.noBrowser = true;
    } else if (raw.startsWith("--wait-timeout=")) {
      const seconds = Number(raw.slice("--wait-timeout=".length));
      if (Number.isFinite(seconds) && seconds > 0) {
        args.waitTimeoutSec = seconds;
      }
    }
  }
  return args;
}

/**
 * @param {string} rootDir
 * @param {Record<string, string | undefined>} [env]
 */
export function resolveAppDirs(rootDir, env = process.env) {
  const dataDir =
    env.RESERVATIONS_DATA_DIR && env.RESERVATIONS_DATA_DIR.trim() !== ""
      ? env.RESERVATIONS_DATA_DIR
      : resolve(rootDir, "data");
  return { rootDir, dataDir, backupsDir: resolve(rootDir, "backups") };
}

export function databaseFileUrl(dataDir) {
  return `file:${dataDir.split(sep).join("/")}/app.db`;
}

export function healthUrl(port) {
  return `http://127.0.0.1:${port}/api/health`;
}

export function isOurApp(probe) {
  return (
    probe.reachable &&
    probe.status === 200 &&
    !!probe.body &&
    probe.body.app === APP_MARKER
  );
}

export function probeHealth(port, timeoutMs = HEALTH_TIMEOUT_MS) {
  return new Promise((resolveProbe) => {
    const request = http.get(healthUrl(port), { timeout: timeoutMs }, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        let body = null;
        try {
          body = JSON.parse(raw);
        } catch {
          body = null;
        }
        resolveProbe({ reachable: true, status: res.statusCode, body });
      });
    });
    request.on("timeout", () => {
      request.destroy();
      resolveProbe({ reachable: false });
    });
    request.on("error", () => {
      resolveProbe({ reachable: false });
    });
  });
}

export async function waitForHealth(
  port,
  { timeoutMs = DEFAULT_WAIT_TIMEOUT_SEC * 1000, intervalMs = HEALTH_INTERVAL_MS } = {},
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const probe = await probeHealth(port);
    if (isOurApp(probe)) {
      return true;
    }
    if (Date.now() >= deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export function hasManagedSnapshot(backupsDir) {
  let entries = [];
  try {
    entries = readdirSync(backupsDir);
  } catch {
    return false;
  }
  return entries.some((entry) =>
    /^reservas-\d{4}-\d{2}-\d{2}-(start|shutdown)\.db$/.test(entry),
  );
}

function openBrowser(url) {
  const platform = process.platform;
  const child =
    platform === "win32"
      ? execFile("cmd", ["/c", "start", '""', url])
      : platform === "darwin"
        ? execFile("open", [url])
        : execFile("xdg-open", [url]);
  child.unref();
}

function loadBackupRunner(rootDir) {
  const require = createRequire(import.meta.url);
  return require(resolve(rootDir, "scripts", "backup.cjs"));
}

function runMigrations(rootDir, databaseUrl) {
  const result = spawnSync(
    process.execPath,
    [resolve(rootDir, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
    { cwd: rootDir, env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8" },
  );
  return { ok: result.status === 0, output: (result.stdout ?? "") + (result.stderr ?? "") };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string[]} [argv]
 * @param {Record<string, string | undefined>} [env]
 * @returns {Promise<number>}
 */
export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const { rootDir, dataDir, backupsDir } = resolveAppDirs(args.dir, env);
  const databaseUrl = databaseFileUrl(dataDir);
  const baseUrl = `http://127.0.0.1:${args.port}`;

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (!Number.isInteger(nodeMajor) || nodeMajor < 20) {
    console.log("Reservas Casa necesita Node.js 20 o superior.");
    return 1;
  }

  // Never start a second instance against the same database. The port probe
  // comes first so an already running app is reused unconditionally.
  const probe = await probeHealth(args.port);
  if (isOurApp(probe)) {
    console.log(`Reservas Casa ya está abierta en ${baseUrl}.`);
    if (!args.noBrowser) {
      openBrowser(baseUrl);
    }
    return 0;
  }
  if (probe.reachable) {
    console.log(
      `El puerto ${args.port} está ocupado por otro programa. Cerralo o elegí otro puerto con --port=....`,
    );
    return 2;
  }

  if (!existsSync(resolve(rootDir, "server.js"))) {
    console.log(
      `No se encontró el servidor en ${rootDir}. Instalá la distribución completa antes de continuar.`,
    );
    return 1;
  }

  console.log("Preparando la base de datos…");
  const migrated = runMigrations(rootDir, databaseUrl);
  if (!migrated.ok) {
    console.log("No se pudo preparar la base de datos. Detalle técnico:");
    console.log(migrated.output.slice(0, 2000));
    return 1;
  }

  console.log("Guardando backup de inicio…");
  let backupModule = null;
  try {
    backupModule = loadBackupRunner(rootDir);
  } catch {
    backupModule = null;
  }
  if (backupModule !== null) {
    const snapshot = await backupModule.ensureSnapshot("start", {
      dataDir,
      backupsDir,
    });
    console.log(snapshot.message);
    if (!snapshot.ok) {
      if (!hasManagedSnapshot(backupsDir)) {
        console.log("Sin backups válidos no se puede continuar de forma segura.");
        return 1;
      }
      console.log("Se continúa con advertencia: el inicio quedó sin snapshot nuevo.");
    }
  } else {
    console.log("Aviso: no se encontró el módulo de backup; se continúa sin snapshot de inicio.");
  }

  console.log(`Iniciando el servidor en ${baseUrl}…`);
  const server = spawn(process.execPath, ["server.js"], {
    cwd: rootDir,
    env: {
      ...env,
      PORT: String(args.port),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: databaseUrl,
    },
    stdio: "inherit",
  });

  let serverCode = null;
  const serverDone = new Promise((resolveDone) => {
    server.on("exit", (code) => {
      serverCode = code;
      resolveDone();
    });
  });

  const healthy = await waitForHealth(args.port, {
    timeoutMs: args.waitTimeoutSec * 1000,
  });
  if (!healthy) {
    console.log("El servidor no respondió a tiempo. Revisá la ventana para ver el error.");
    server.kill("SIGTERM");
    await serverDone;
    return 1;
  }

  console.log(`Reservas Casa lista en ${baseUrl}.`);
  console.log("No cierres esta ventana mientras usás la aplicación.");
  console.log("Para detenerla, presioná Ctrl+C en esta ventana.");
  if (!args.noBrowser) {
    openBrowser(baseUrl);
  }

  let stopping = false;
  let finishShutdown = () => {};
  const shutdownFinished = new Promise((resolve) => {
    finishShutdown = resolve;
  });
  const shutdown = async () => {
    if (stopping) {
      return;
    }
    stopping = true;
    try {
      console.log("Deteniendo el servidor…");
      server.kill("SIGTERM");
      const exited = await Promise.race([
        serverDone.then(() => true),
        sleep(SHUTDOWN_GRACE_MS).then(() => false),
      ]);
      if (!exited) {
        server.kill("SIGKILL");
        await serverDone;
      }
      if (backupModule !== null) {
        console.log("Guardando backup de cierre…");
        try {
          const snapshot = await backupModule.ensureSnapshot("shutdown", {
            dataDir,
            backupsDir,
          });
          console.log(snapshot.message);
        } catch {
          console.log("Aviso: no se pudo guardar el backup de cierre.");
        }
      }
    } finally {
      finishShutdown();
    }
  };

  process.on("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().then(() => process.exit(0));
  });
  if (process.platform === "win32") {
    process.on("SIGBREAK", () => {
      void shutdown().then(() => process.exit(0));
    });
  }

  await serverDone;
  if (!stopping) {
    console.log(
      `El servidor se detuvo solo (código ${serverCode ?? "desconocido"}). Revisá los mensajes de arriba.`,
    );
    return 1;
  }
  // The server exited as part of shutdown: wait for the shutdown backup
  // before reporting success, instead of racing it with process exit.
  await shutdownFinished;
  return 0;
}

function sameFile(first, second) {
  try {
    return realpathSync(first) === realpathSync(second);
  } catch {
    return resolve(first) === resolve(second);
  }
}

const invokedAsScript =
  typeof process.argv[1] === "string" &&
  sameFile(process.argv[1], fileURLToPath(import.meta.url));

if (invokedAsScript) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.log("Error inesperado del lanzador.");
      console.log(String(error).slice(0, 500));
      process.exit(1);
    });
}

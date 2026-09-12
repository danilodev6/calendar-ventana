// Starts the production standalone server, completing it with static assets
// and public files first if needed. npm no longer runs postbuild hooks for
// custom scripts, so this explicit entry point owns the step instead of
// relying on hook magic. Used by `npm start` and the Playwright web server.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = join(projectRoot, ".next", "standalone");

if (
  !existsSync(join(standaloneDir, ".next", "static")) ||
  !existsSync(join(standaloneDir, "public"))
) {
  await import("./complete-standalone.mjs");
}

const server = spawn(process.execPath, [join(standaloneDir, "server.js")], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.kill(signal);
  });
}

server.on("exit", (code) => {
  process.exit(code ?? 1);
});

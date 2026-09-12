// Completes the standalone server inside .next/standalone after every build:
// static assets and public files are not traced and must sit next to it.
// Uses only Node builtins for macOS/Windows parity. Runs via `postbuild`.
import { cpSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = join(projectRoot, ".next", "standalone");
if (!existsSync(join(standaloneDir, "server.js"))) {
  throw new Error("Standalone server not found. Run `npm run build` first.");
}
cpSync(join(projectRoot, ".next", "static"), join(standaloneDir, ".next", "static"), {
  recursive: true,
});
cpSync(join(projectRoot, "public"), join(standaloneDir, "public"), {
  recursive: true,
});
console.log("Standalone server completed with static assets.");

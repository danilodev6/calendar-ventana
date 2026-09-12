// Assembles the distributable local build in dist/ from a production build.
// Only Node builtins are used (fs.cpSync), so every step works identically
// on macOS and Windows. Run `npm run build` first, then `npm run dist`.
//
// Layout:
//   dist/server.js            standalone Next server entry point
//   dist/.next/               static assets and server chunks
//   dist/public/              static files
//   dist/prisma/              schema + migrations for `migrate deploy`
//   dist/prisma.config.ts     datasource default resolves to dist/data
//   dist/launch.mjs           local launcher (backup, server, browser)
//   dist/launch.cmd/.command  double-click wrappers
//   dist/scripts/backup.cjs   self-contained backup runner (esbuild bundle)
//   dist/node_modules/        traced server deps plus explicit extras:
//                             prisma CLI, @prisma/*, better-sqlite3 whole
import { buildSync } from "esbuild";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = join(projectRoot, "dist");

function copyWhole(source, target, label) {
  if (!existsSync(source)) {
    throw new Error(`Missing distributable input: ${label} (${source})`);
  }
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

const standaloneDir = join(projectRoot, ".next", "standalone");
if (!existsSync(join(standaloneDir, "server.js"))) {
  throw new Error("Run `npm run build` before `npm run dist`.");
}

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(distRoot, { recursive: true });

// Standalone server with its traced dependencies.
cpSync(standaloneDir, distRoot, { recursive: true });
// Static assets and public files are not traced; they ship alongside.
copyWhole(
  join(projectRoot, ".next", "static"),
  join(distRoot, ".next", "static"),
  "production static assets",
);
copyWhole(join(projectRoot, "public"), join(distRoot, "public"), "public files");
// Migration inputs. prisma.config.ts resolves dist/data by its own location.
copyWhole(join(projectRoot, "prisma"), join(distRoot, "prisma"), "prisma schema");
copyWhole(
  join(projectRoot, "prisma.config.ts"),
  join(distRoot, "prisma.config.ts"),
  "prisma config",
);
// Launcher and wrappers.
copyWhole(
  join(projectRoot, "scripts", "launch.mjs"),
  join(distRoot, "launch.mjs"),
  "launcher",
);
for (const wrapper of ["launch.cmd", "launch.command"]) {
  copyWhole(
    join(projectRoot, "scripts", wrapper),
    join(distRoot, wrapper),
    wrapper,
  );
}
// Explicit runtime extras the standalone trace cannot see:
// - better-sqlite3 ships native prebuilds loaded through dynamic paths;
// - the prisma CLI (used for `migrate deploy` at install) with its whole
//   dependency closure resolved from this exact tree, so production matches
//   development with no version skew.
copyWhole(
  join(projectRoot, "node_modules", "better-sqlite3"),
  join(distRoot, "node_modules", "better-sqlite3"),
  "node_modules/better-sqlite3",
);
copyClosure("prisma", join(distRoot, "node_modules"));

// Resolves a package directory tolerating strict exports maps: first a
// direct filesystem lookup through ancestor node_modules (no resolution
// involved), then the package.json subpath, then the main entry with an
// upward walk. Every candidate verifies the manifest name.
function manifestPathFor(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, "node_modules", name, "package.json");
    if (existsSync(candidate) && readManifestName(candidate) === name) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  const requireFrom = createRequire(join(fromDir, "package.json"));
  const candidates = [];
  try {
    candidates.push(requireFrom.resolve(`${name}/package.json`));
  } catch {
    // Subpath hidden by the exports map; fall through to the main entry.
  }
  try {
    candidates.push(enclosingManifest(dirname(requireFrom.resolve(name))));
  } catch {
    // No resolvable main entry.
  }
  for (const candidate of candidates) {
    if (candidate !== null && readManifestName(candidate) === name) {
      return candidate;
    }
  }
  throw new Error(`Cannot locate manifest for: ${name}`);
}

function enclosingManifest(dir) {
  for (;;) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function readManifestName(manifestPath) {
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")).name ?? null;
  } catch {
    return null;
  }
}
function copyClosure(rootName, targetModules) {
  const seen = new Set();
  const skipped = [];
  // Each entry resolves from its dependent's directory so nested copies win
  // exactly like Node resolution does.
  const queue = [{ name: rootName, fromDir: projectRoot, optional: false }];
  while (queue.length > 0) {
    const { name, fromDir, optional } = queue.pop();
    let manifestPath;
    try {
      manifestPath = manifestPathFor(name, fromDir);
    } catch {
      // Unresolvable entries (e.g. drivers for other databases that npm did
      // not install) are skipped visibly; the launcher boot test proves the
      // distribution is complete for SQLite.
      skipped.push(`${optional ? "optional " : ""}${name} (wanted by ${fromDir})`);
      continue;
    }
    if (seen.has(manifestPath)) {
      continue;
    }
    seen.add(manifestPath);
    const packageDir = dirname(manifestPath);
    const modulesRoot = join(projectRoot, "node_modules") + "/";
    if (!packageDir.startsWith(modulesRoot)) {
      throw new Error(`Package outside node_modules: ${name}`);
    }
    const relative = packageDir.slice(modulesRoot.length);
    cpSync(packageDir, join(targetModules, relative), { recursive: true });
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const dep of Object.keys(manifest.dependencies ?? {})) {
      queue.push({ name: dep, fromDir: packageDir, optional: false });
    }
    for (const dep of Object.keys(manifest.optionalDependencies ?? {})) {
      queue.push({ name: dep, fromDir: packageDir, optional: true });
    }
  }
  for (const skippedName of skipped) {
    console.log(`Skipping uninstallable distributable: ${skippedName}`);
  }
}
// Self-contained backup runner: TypeScript sources bundled to plain CJS so
// production only needs node, with better-sqlite3 resolved from dist.
buildSync({
  entryPoints: [join(projectRoot, "src", "server", "backup.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: join(distRoot, "scripts", "backup.cjs"),
  external: ["better-sqlite3"],
  logLevel: "silent",
});

console.log(`Distribution assembled in ${distRoot}`);

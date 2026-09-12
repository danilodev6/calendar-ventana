// Manual backup entry point: `npm run backup [-- --kind=start|shutdown]`.
// The launcher (Phase 13) calls ensureSnapshot directly; humans use this.
import { ensureSnapshot, type SnapshotKind } from "@/server/backup";

function parseKind(argv: string[]): SnapshotKind {
  for (const arg of argv) {
    if (arg === "--kind=shutdown") {
      return "shutdown";
    }
    if (arg === "--kind=start") {
      return "start";
    }
  }
  return "start";
}

const kind = parseKind(process.argv.slice(2));

async function main(): Promise<void> {
  const result = await ensureSnapshot(kind);
  console.log(result.message);
  if (result.path !== null) {
    console.log(result.path);
  }
  process.exit(result.ok ? 0 : 1);
}

void main();

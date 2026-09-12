import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const projectRoot = dirname(fileURLToPath(import.meta.url));

function toFileUrl(absolutePath: string): string {
  return `file:${absolutePath.split(sep).join("/")}`;
}

// CLI commands (generate, migrate) use DATABASE_URL when set, otherwise the
// local development database. Forward slashes keep the URL valid on Windows.
const databaseUrl =
  process.env.DATABASE_URL ??
  toFileUrl(resolve(projectRoot, "data", "app.db"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});

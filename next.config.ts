import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Self-contained production server for the local launcher (Phase 13).
  // Extra runtime files (Prisma CLI, native bindings, migrations) are added
  // explicitly by scripts/prepare-dist.mjs and verified by tests.
  output: "standalone",
};

export default nextConfig;

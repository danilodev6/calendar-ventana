import type { ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";

// Primary application shell: full-height sidebar on desktop, top bar on
// narrow widths, and an independent scrolling content area.
export default function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
      <AppNavigation />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-4xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}

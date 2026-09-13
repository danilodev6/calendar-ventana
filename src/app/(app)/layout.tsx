import type { ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";

// Primary application shell: floating sidebar on desktop, top bar on narrow
// widths, and a wide independent scrolling content area.
export default function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppNavigation />
      <main id="contenido" className="min-w-0 flex-1">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:m-4 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-medium"
        >
          Saltar al contenido
        </a>
        <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-7 md:px-8 md:py-10 xl:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}

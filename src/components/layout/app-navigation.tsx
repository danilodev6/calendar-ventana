"use client";

import { House } from "lucide-react";
import { usePathname } from "next/navigation";

import { SidebarNav } from "@/components/layout/sidebar-nav";

// Client shell that wires the presentational SidebarNav to the real pathname.
// Desktop shows a floating full-height sidebar; narrow widths get a basic top
// bar with the same four destinations. Only one of them is visible at a time.
export function AppNavigation() {
  const currentPath = usePathname();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-zinc-200/80 bg-white/90 px-5 py-6 shadow-[12px_0_40px_rgba(24,24,27,0.04)] backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3 px-2 pb-7">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20"
          >
            <House className="size-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold tracking-tight text-zinc-950">
              Calendar Ventana
            </p>
            <p className="mt-0.5 text-xs font-medium tracking-wide text-zinc-500">
              Gestión de reservas
            </p>
          </div>
        </div>
        <SidebarNav currentPath={currentPath} orientation="vertical" />
      </aside>
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/95 p-3 shadow-sm backdrop-blur md:hidden">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white"
          >
            <House className="size-5" />
          </span>
          <p className="text-lg font-bold tracking-tight">Reservas Casa</p>
        </div>
        <SidebarNav currentPath={currentPath} orientation="horizontal" />
      </header>
    </>
  );
}

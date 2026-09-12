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
      <aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-80 shrink-0 flex-col gap-6 overflow-y-auto rounded-3xl border border-zinc-200/70 bg-white p-5 shadow-sm md:flex">
        <div className="flex items-center gap-3 px-1 pt-1">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 text-white"
          >
            <House className="size-6" />
          </span>
          <p className="text-2xl font-bold tracking-tight">Calendar Ventana</p>
        </div>
        <SidebarNav currentPath={currentPath} orientation="vertical" />
      </aside>
      <header className="sticky top-0 border-b border-zinc-200/70 bg-white/95 p-3 backdrop-blur md:hidden">
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

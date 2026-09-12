"use client";

import { usePathname } from "next/navigation";

import { SidebarNav } from "@/components/layout/sidebar-nav";

// Client shell that wires the presentational SidebarNav to the real pathname.
// Desktop shows a full-height sidebar; narrow widths get a basic top bar with
// the same four destinations. Only one of them is visible at a time.
export function AppNavigation() {
  const currentPath = usePathname();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-zinc-200 bg-white p-4 md:flex">
        <p className="px-2 pt-2 text-xl font-bold tracking-tight">
          Reservas Casa
        </p>
        <SidebarNav currentPath={currentPath} orientation="vertical" />
      </aside>
      <header className="sticky top-0 border-b border-zinc-200 bg-white p-3 md:hidden">
        <p className="mb-2 px-1 text-lg font-bold tracking-tight">
          Reservas Casa
        </p>
        <SidebarNav currentPath={currentPath} orientation="horizontal" />
      </header>
    </>
  );
}

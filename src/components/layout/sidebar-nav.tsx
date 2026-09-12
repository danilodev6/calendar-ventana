import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  NAVIGATION_ITEMS,
  findActiveHref,
  type NavigationItem,
} from "@/components/layout/navigation";

interface SidebarNavProps {
  items?: NavigationItem[];
  currentPath: string;
  orientation?: "vertical" | "horizontal";
  onNavigate?: () => void;
}

// Presentational navigation list. It receives the current path as a prop so
// it stays a server-safe component that is easy to test; the client wrapper
// in `app-navigation.tsx` provides the real pathname.
export function SidebarNav({
  items = NAVIGATION_ITEMS,
  currentPath,
  orientation = "vertical",
  onNavigate,
}: SidebarNavProps) {
  const activeHref = findActiveHref(currentPath, items.map((item) => item.href));

  return (
    <nav aria-label="Secciones principales">
      <ul
        className={cn(
          "flex gap-2",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        )}
      >
        {items.map((item) => {
          const isActive = item.href === activeHref;
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "relative flex min-h-12 flex-1 items-center gap-3 rounded-lg px-4 py-2 text-lg font-medium transition-colors",
                  "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
                  isActive &&
                    "bg-zinc-900 font-semibold text-white hover:bg-zinc-900 hover:text-white",
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 bottom-2 left-0 w-1.5 rounded-full bg-white"
                  />
                )}
                <Icon aria-hidden="true" className="size-6 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

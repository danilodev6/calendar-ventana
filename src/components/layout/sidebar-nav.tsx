import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  NAVIGATION_ITEMS,
  findActiveHref,
  type NavigationItem,
  type NavigationTint,
} from "@/components/layout/navigation";

interface SidebarNavProps {
  items?: NavigationItem[];
  currentPath: string;
  orientation?: "vertical" | "horizontal";
  onNavigate?: () => void;
}

// Soft tinted pill per destination when active; calm gray otherwise. The
// active section is marked by background, strong text, the filled icon chip
// and `aria-current`, never by color alone.
const TINT_STYLES: Record<
  NavigationTint,
  { pill: string; chip: string; chipIdle: string }
> = {
  sky: {
    pill: "bg-sky-100 text-sky-950",
    chip: "bg-sky-500 text-white",
    chipIdle: "bg-sky-100 text-sky-700",
  },
  emerald: {
    pill: "bg-emerald-100 text-emerald-950",
    chip: "bg-emerald-500 text-white",
    chipIdle: "bg-emerald-100 text-emerald-700",
  },
  violet: {
    pill: "bg-violet-100 text-violet-950",
    chip: "bg-violet-500 text-white",
    chipIdle: "bg-violet-100 text-violet-700",
  },
  amber: {
    pill: "bg-amber-100 text-amber-950",
    chip: "bg-amber-500 text-white",
    chipIdle: "bg-amber-100 text-amber-700",
  },
};

// Presentational navigation list. It receives the current path as a prop so
// it stays a server-safe component that is easy to test; the client wrapper
// in `app-navigation.tsx` provides the real pathname. Items stretch to fill
// the available height so every target is effortless to hit.
export function SidebarNav({
  items = NAVIGATION_ITEMS,
  currentPath,
  orientation = "vertical",
  onNavigate,
}: SidebarNavProps) {
  const activeHref = findActiveHref(currentPath, items.map((item) => item.href));

  return (
    <nav aria-label="Secciones principales" className="flex min-h-0 flex-1">
      <ul
        className={cn(
          "flex flex-1 gap-3",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        )}
      >
        {items.map((item) => {
          const isActive = item.href === activeHref;
          const Icon = item.icon;
          const tint = TINT_STYLES[item.tint];
          return (
            <li key={item.href} className="flex min-h-0 flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-12 flex-1 flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center text-lg leading-tight font-semibold transition-colors",
                  isActive
                    ? tint.pill
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                    isActive ? tint.chip : tint.chipIdle,
                  )}
                >
                  <Icon className="size-6" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

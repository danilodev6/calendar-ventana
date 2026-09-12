import {
  BookOpen,
  Calendar,
  CalendarPlus,
  Scale,
  type LucideIcon,
} from "lucide-react";

export type NavigationTint = "sky" | "emerald" | "violet" | "amber";

export interface NavigationItem {
  href: string;
  // User-visible label. Always Spanish; never show `href` as a label.
  label: string;
  icon: LucideIcon;
  // Accent used for the active pill; meaning never depends on it alone.
  tint: NavigationTint;
}

// Single source of truth for the four primary destinations.
// Routes stay in English while visible labels are in Spanish.
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { href: "/", label: "Calendario", icon: Calendar, tint: "sky" },
  { href: "/reservations/new", label: "Nueva reserva", icon: CalendarPlus, tint: "emerald" },
  { href: "/reservations", label: "Todas las reservas", icon: BookOpen, tint: "violet" },
  { href: "/balance", label: "Balance", icon: Scale, tint: "amber" },
];

// Returns the href of the item that best matches the current path.
// The longest segment-aware prefix wins, so "/reservations/new" beats
// "/reservations" while a future "/reservations/[id]" still falls back
// to "/reservations". "/" only matches exactly.
export function findActiveHref(
  currentPath: string,
  hrefs: string[] = NAVIGATION_ITEMS.map((item) => item.href),
): string | null {
  let bestMatch: string | null = null;
  for (const href of hrefs) {
    const matches =
      href === "/"
        ? currentPath === "/"
        : currentPath === href || currentPath.startsWith(`${href}/`);
    if (matches && (bestMatch === null || href.length > bestMatch.length)) {
      bestMatch = href;
    }
  }
  return bestMatch;
}

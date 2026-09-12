import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Small status pill: always text plus an icon provided by the caller, with
// color as a redundant cue only. Soft backgrounds with very dark text keep
// contrast at WCAG AA for normal text.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        amber: "bg-amber-200 text-amber-950",
        blue: "bg-sky-200 text-sky-950",
        red: "bg-rose-200 text-rose-950",
        violet: "bg-violet-200 text-violet-950",
        green: "bg-emerald-200 text-emerald-950",
        gray: "bg-zinc-200 text-zinc-800",
      },
    },
    defaultVariants: {
      tone: "gray",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

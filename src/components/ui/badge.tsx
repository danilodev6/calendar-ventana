import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Small status pill: always text plus an icon provided by the caller, with
// color as a redundant cue only. Every background keeps white-text contrast
// at WCAG AA for normal text.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        amber: "bg-amber-700 text-white",
        blue: "bg-blue-700 text-white",
        red: "bg-red-700 text-white",
        violet: "bg-violet-700 text-white",
        green: "bg-green-700 text-white",
        gray: "bg-zinc-600 text-white",
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

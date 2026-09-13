import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Minimal shadcn-style button. Only the variants used by v1 are included,
// and there is no Radix Slot dependency: link-styled buttons should use
// `buttonVariants()` directly on a Next.js Link.
const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-center text-base leading-none font-semibold whitespace-nowrap shadow-sm transition-all duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-white hover:bg-zinc-700 hover:shadow-md",
        secondary: "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950",
        destructive: "bg-red-600 text-white hover:bg-red-500 hover:shadow-md",
        info: "bg-blue-600 text-white shadow-blue-600/15 hover:bg-blue-500 hover:shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };

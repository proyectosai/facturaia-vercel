import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]",
        secondary: "bg-[color:var(--color-panel)] text-muted-foreground",
        success: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

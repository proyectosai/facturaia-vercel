"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm",
  {
    variants: {
      variant: {
        default: "text-muted-foreground",
        outline: "border border-border bg-white/60 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle };

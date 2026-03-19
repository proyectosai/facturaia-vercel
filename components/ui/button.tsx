import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--color-brand)] px-5 py-3 text-[color:var(--color-brand-foreground)] shadow-lg shadow-[color:color-mix(in_oklab,var(--color-brand)_24%,transparent)] hover:brightness-105",
        secondary:
          "bg-[color:var(--color-panel)] px-5 py-3 text-foreground hover:bg-[color:var(--color-panel-strong)]",
        outline:
          "border border-border bg-white/70 px-5 py-3 text-foreground hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]",
        ghost: "px-4 py-3 text-muted-foreground hover:bg-white/70 hover:text-foreground",
        destructive:
          "bg-[color:var(--color-danger)] px-5 py-3 text-white hover:brightness-110",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };

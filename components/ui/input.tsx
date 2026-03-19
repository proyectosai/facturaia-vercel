import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-11 w-full rounded-2xl border border-border bg-white/85 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-[color:var(--color-brand)] focus:ring-4 focus:ring-[color:color-mix(in_oklab,var(--color-brand)_16%,transparent)]",
          className,
        )}
        type={type}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };

import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-3xl border border-border bg-white/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-[color:var(--color-brand)] focus:ring-4 focus:ring-[color:color-mix(in_oklab,var(--color-brand)_16%,transparent)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };

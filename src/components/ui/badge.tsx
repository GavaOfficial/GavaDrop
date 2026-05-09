import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const badgeClasses: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-transparent bg-destructive text-white",
  outline: "border-border text-foreground",
};

function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };

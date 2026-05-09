"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number | null;
  variant?: "default" | "modern" | "glow";
}

function Progress({ className, value = 0, variant = "default", ...props }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value ?? 0));
  const barClass =
    variant === "default"
      ? "bg-primary"
      : "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]";

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        variant === "modern" && "h-3 bg-muted/50",
        variant === "glow" && "h-4 bg-muted/30",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn("h-full rounded-full transition-[width] duration-300 ease-out", barClass)}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export { Progress };

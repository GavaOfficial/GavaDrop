"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  variant?: "default" | "modern" | "glow";
}

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: ProgressProps) {
  const baseStyles = {
    default: "bg-primary/20 h-2",
    modern: "bg-muted/50 h-3",
    glow: "bg-muted/30 h-4"
  };

  const indicatorStyles = {
    default: "bg-primary",
    modern: "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]",
    glow: "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] shadow-[0_0_20px_var(--glow-color)]"
  };

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative w-full overflow-hidden rounded-full",
        baseStyles[variant],
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all duration-300 ease-out rounded-full",
          indicatorStyles[variant],
          variant !== "default" && "relative after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/30 after:to-transparent after:rounded-full"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }

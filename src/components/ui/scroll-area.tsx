import * as React from "react";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="scroll-area"
    className={cn("min-h-0 overflow-auto", className)}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

function ScrollBar(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="scroll-bar" {...props} />;
}

export { ScrollArea, ScrollBar };

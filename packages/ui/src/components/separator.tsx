"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Separator` (shadcn v4 `base-nova`).
 *
 * Source: `shadcn` registry on Base UI `Separator`. Base UI renders
 * `role="separator"` and sets `data-orientation`, so the visual orientation
 * and the accessibility tree cannot drift apart.
 *
 * States covered: horizontal · vertical.
 *
 * Note: a separator is decorative structure. Never rely on it to convey
 * grouping that assistive tech must understand — use real headings and
 * landmarks for that.
 */
export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

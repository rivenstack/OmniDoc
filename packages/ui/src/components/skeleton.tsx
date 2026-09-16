import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Skeleton` (D-01 component inventory §3).
 *
 * Source: `shadcn`. State: static (no shimmer).
 *
 * D-01 §6.1 requires that skeleton loaders resolve to **static neutral
 * blocks** under `prefers-reduced-motion: reduce`, so this component ships no
 * animation at all rather than shipping one plus a fallback. That satisfies
 * the reduced-motion gate by construction and avoids an animated placeholder
 * competing with the trust chrome.
 *
 * Loading is announced once by the surrounding status region (a11y §1.4), so
 * the skeleton itself is `aria-hidden` and must not be given a label.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-md bg-muted", className)}
      {...props}
    />
  );
}

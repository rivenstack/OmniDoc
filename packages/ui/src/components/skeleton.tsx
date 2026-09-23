import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Skeleton` (shadcn v4 `base-nova`, adapted).
 *
 * Source: `shadcn` registry. Adaptations: `aria-hidden` by default — loading
 * is announced once by the surrounding status region, and a placeholder must
 * never be read out as content.
 *
 * The pulse is upstream's; the global `prefers-reduced-motion` rule in
 * `tokens.css` resolves it to a static block without any per-component
 * fallback. A skeleton is decorative: do not give it a label.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

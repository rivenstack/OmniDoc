import { Input as InputPrimitive } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Input` (shadcn v4 `base-nova`, adapted).
 *
 * Source: `shadcn` registry (Base UI `Input`). Adaptations: full-opacity
 * focus ring, 12px inline padding for the pill shape.
 *
 * States covered: default · focus · error · disabled · read-only · file.
 *
 * The error state is driven by `aria-invalid`, not a separate `error` prop,
 * so the visual and the accessibility tree can never disagree. `text-base`
 * on small screens keeps iOS Safari from zooming on focus; desktop drops to
 * `text-sm`.
 */
export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
        className,
      )}
      {...props}
    />
  );
}

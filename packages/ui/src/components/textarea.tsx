import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Textarea` (shadcn v4 `base-nova`, adapted).
 *
 * Source: `shadcn` registry. Adaptations: full-opacity focus ring, 12px
 * inline padding, and the `od-unbroken` guard so pasted tokens/URLs never
 * cause horizontal page scroll.
 *
 * States covered: default · focus · error · disabled · auto-grow.
 *
 * Auto-grow maps to CSS `field-sizing: content` (upstream default), so
 * growth needs no JS and no resize observer. Error state is driven by
 * `aria-invalid`.
 */
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none od-unbroken placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
        className,
      )}
      {...props}
    />
  );
}

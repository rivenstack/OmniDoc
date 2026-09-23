import { IconLoader } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Spinner` (shadcn v4 `base-nova`, adapted).
 *
 * Source: `shadcn` registry, tabler icon library. Adaptations: the accessible
 * name is a `label` prop (default "Loading") instead of a fixed string, so
 * the caller can name what is actually loading.
 *
 * States covered: spinning · static (reduced motion — the global
 * `prefers-reduced-motion` rule in `tokens.css` stops the animation while
 * the element keeps its name).
 *
 * Announce loading **once** from the surrounding status region — never per
 * streamed token. Compose into buttons as
 * `<Button disabled><Spinner data-icon="inline-start" />Saving…</Button>`.
 */
export function Spinner({
  className,
  label = "Loading",
  ...props
}: ComponentProps<"svg"> & { label?: string }) {
  return (
    <IconLoader
      data-slot="spinner"
      role="status"
      aria-label={label}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

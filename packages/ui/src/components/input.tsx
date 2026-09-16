import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Input` (D-01 component inventory §3).
 *
 * Source: `shadcn`. Native `<input>` plus D-01 token classes.
 *
 * States covered: default · focus · error · disabled · read-only.
 *
 * The error state is driven by `aria-invalid`, not a separate `error` prop, so
 * the visual and the accessibility tree can never disagree (a11y §1.6).
 * Block padding stays physical via `py-*` because block direction is not a
 * mirrored axis; inline padding uses `ps-*`/`pe-*` (a11y §7.2).
 */
export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 min-w-0 rounded-md border border-input bg-background",
        "ps-3 pe-3 py-2 text-od-body-sm text-foreground",
        "od-inline-full",
        "placeholder:text-od-text-tertiary",
        "transition-colors duration-[var(--od-duration-instant)] ease-standard",
        "motion-reduce:transition-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "read-only:bg-od-surface-sunken",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

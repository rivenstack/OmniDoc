import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Textarea` (D-01 component inventory §3).
 *
 * Source: `shadcn`. Native `<textarea>` plus D-01 token classes.
 *
 * States covered: default · focus · error · auto-grow.
 *
 * `autoGrow` maps to CSS `field-sizing: content` so growth needs no JS and no
 * resize observer. Error state is driven by `aria-invalid` (a11y §1.6).
 */
const textareaVariants = cva(
  [
    "flex min-h-20 rounded-md border border-input bg-background",
    "ps-3 pe-3 py-2 text-od-body-sm text-foreground",
    "od-inline-full od-unbroken",
    "placeholder:text-od-text-tertiary",
    "transition-colors duration-[var(--od-duration-instant)] ease-standard",
    "motion-reduce:transition-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "read-only:bg-od-surface-sunken",
    "aria-invalid:border-destructive",
  ],
  {
    variants: {
      autoGrow: {
        true: "field-sizing-content",
        false: "resize-y",
      },
    },
    defaultVariants: {
      autoGrow: false,
    },
  },
);

export type TextareaProps = ComponentProps<"textarea"> &
  VariantProps<typeof textareaVariants>;

export function Textarea({
  className,
  autoGrow,
  rows = 4,
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      rows={autoGrow ? undefined : rows}
      className={cn(textareaVariants({ autoGrow }), className)}
      {...props}
    />
  );
}

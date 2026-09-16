import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Label` (D-01 component inventory §3).
 *
 * Source: `shadcn`. A native `<label>` — Base UI exposes no standalone Label
 * primitive at 1.8.0, and the native element already gives correct
 * label/control association by `htmlFor` (a11y §1.3).
 *
 * States covered: default · required · muted.
 *
 * The required marker is visual only; the control itself must still carry the
 * `required`/`aria-required` attribute so assistive tech reports it.
 */
const labelVariants = cva(
  [
    "flex items-center gap-1 text-od-caption font-medium text-foreground",
    "select-none",
    // A disabled peer/label relationship should not look interactive.
    "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
  ],
  {
    variants: {
      variant: {
        default: "",
        required: "after:text-destructive after:content-['*']",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type LabelProps = ComponentProps<"label"> &
  VariantProps<typeof labelVariants>;

export function Label({ className, variant, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(labelVariants({ variant }), className)}
      {...props}
    />
  );
}

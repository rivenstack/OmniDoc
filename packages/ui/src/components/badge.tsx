import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Badge` (D-01 component inventory §3).
 *
 * Source: `shadcn`. States covered: neutral · accent · success · warning ·
 * danger · info · outline.
 *
 * Accessibility (D-01 §2.4, §7; a11y §1.6): a badge is **never** the only
 * signal. Every status usage must pair a badge with an icon **and** a text
 * label — "always icon + text, never color-only" (QA 2.1, 4.4). A badge's own
 * text is required by the component, but the caller still owns the icon.
 *
 * Contrast (D-01 §7): the `danger` variant uses D-01's own explicit
 * `--destructive` / `--destructive-foreground` pair. D-01 defines no
 * foreground pairing for the success / warning / info ramps, so those variants
 * deliberately keep `--foreground` text on a 10% tint of the status hue and
 * carry the status through border + icon + label instead of inventing a
 * text-on-status pairing that was never specified or contrast-checked.
 */
export const badgeVariants = cva(
  [
    "inline-flex shrink-0 items-center gap-1 rounded-full border",
    "ps-2 pe-2 py-0.5 text-od-micro font-medium whitespace-nowrap",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-3",
  ],
  {
    variants: {
      variant: {
        neutral: "border-transparent bg-muted text-muted-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
        success:
          "border-od-status-supported/60 bg-od-status-supported/10 text-foreground",
        warning:
          "border-od-status-partial/60 bg-od-status-partial/10 text-foreground",
        danger: "border-transparent bg-destructive text-destructive-foreground",
        info: "border-od-status-info/60 bg-od-status-info/10 text-foreground",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export type BadgeProps = ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

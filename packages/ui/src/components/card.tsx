import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Card` (D-01 component inventory §3).
 *
 * Source: `shadcn`. States covered: default · interactive · muted.
 *
 * Elevation follows D-01 §5: cards sit at elevation 1 and elevation is
 * **hierarchical only** — it must never be used to signal trust level. Trust
 * is carried by label + icon + structure.
 *
 * `interactive` is a visual affordance only. When a card is actually
 * clickable, render a real control inside it (or wrap it in one) so keyboard
 * and screen-reader users get a genuine target (a11y §1.1, §3) — a `<div>`
 * with `onClick` is not acceptable.
 */
const cardVariants = cva(
  "flex flex-col rounded-lg border border-border text-card-foreground",
  {
    variants: {
      variant: {
        default: "bg-card shadow-od-1",
        interactive:
          "bg-card shadow-od-1 transition-colors duration-[var(--od-duration-instant)] ease-standard motion-reduce:transition-none hover:bg-accent/50",
        muted: "bg-muted shadow-od-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type CardProps = ComponentProps<"div"> &
  VariantProps<typeof cardVariants>;

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1 ps-6 pe-6 pt-6", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-od-h3 text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-od-body-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("ps-6 pe-6 py-6", className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-auto flex items-center gap-2 ps-6 pe-6 pb-6",
        className,
      )}
      {...props}
    />
  );
}

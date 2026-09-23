import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Badge` (shadcn v4 `base-nova`, adapted).
 *
 * Source: `shadcn` registry (Base UI variant). Adaptations: full-opacity
 * focus ring, logical icon padding (`ps-*`/`pe-*`), and the OmniDoc status
 * variants on top of the upstream set.
 *
 * Accessibility (release gate): a badge is **never** the only signal. Every
 * status usage pairs a badge with an icon **and** a text label — "always
 * icon + text, never colour-only". The caller owns the icon and the label.
 *
 * Status colours are the accessible text steps defined in `tokens.css`
 * (≥4.5:1 on their own 10% tint), so the tinted pill stays readable in both
 * themes. `destructive` is upstream's tinted variant, not a solid red fill.
 *
 * Variants: default · secondary · destructive · outline · ghost · link ·
 * success · warning · info.
 */
export const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive [a]:hover:bg-destructive/15",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-od-status-supported/10 text-od-status-supported [a]:hover:bg-od-status-supported/20",
        warning:
          "bg-od-status-partial/10 text-od-status-partial [a]:hover:bg-od-status-partial/20",
        info: "bg-od-status-info/10 text-od-status-info [a]:hover:bg-od-status-info/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant = "default", render, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

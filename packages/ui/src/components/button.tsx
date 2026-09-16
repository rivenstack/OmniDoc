import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Button` (D-01 component inventory §3).
 *
 * Source: `shadcn`. Copy-in and project-owned in `packages/ui` (ADR-0002/0003);
 * consume D-01 semantic tokens only — never primitives or raw values.
 *
 * States covered: default · secondary · ghost · outline · destructive · link ·
 * loading · disabled · icon.
 *
 * Direction discipline (ADR-0003, a11y §7.2): spacing uses the logical
 * `gap`/`ps-*`/`pe-*` utilities and `text-start`, so nothing mirrors
 * incorrectly if an RTL locale is later scheduled. Focus is never removed —
 * the token layer sets the single `:focus-visible` ring.
 */
export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-md font-medium whitespace-nowrap",
    "transition-colors duration-[var(--od-duration-instant)] ease-standard",
    "motion-reduce:transition-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 ps-4 pe-4 text-od-body-sm",
        sm: "h-8 ps-3 pe-3 text-od-caption",
        lg: "h-11 ps-6 pe-6 text-od-body",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner and marks the control busy without reflowing it. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled === true || loading;

  return (
    <button
      type={type}
      data-slot="button"
      data-loading={loading ? "" : undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : null}
      {children}
    </button>
  );
}

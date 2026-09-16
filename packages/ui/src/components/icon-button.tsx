import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { buttonVariants } from "./button";
import type { VariantProps } from "class-variance-authority";

/**
 * Foundations / primitives — `IconButton` (D-01 component inventory §3).
 *
 * Source: `shadcn+` — a shadcn button with project-specific props. Its only
 * project addition is the **required** accessible name: an icon-only control
 * without a label fails the accessibility release gate (a11y §1.3), so the
 * type makes it impossible to omit accidentally.
 *
 * States covered: default · hover · focus · disabled · pressed.
 */
export type IconButtonProps = Omit<
  React.ComponentProps<"button">,
  "aria-label" | "children"
> &
  Pick<VariantProps<typeof buttonVariants>, "variant"> & {
    /** Accessible name. Required — never render an unnamed icon button. */
    label: string;
    /** The icon (or other single visual). */
    children: ReactNode;
    /** Renders a toggle button (`aria-pressed`). */
    pressed?: boolean;
  };

export function IconButton({
  className,
  label,
  variant = "ghost",
  pressed,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      data-slot="icon-button"
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        buttonVariants({ variant, size: "icon" }),
        "shrink-0 rounded-md",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

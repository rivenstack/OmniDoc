import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";
import { Button, buttonVariants } from "./button";

/**
 * Foundations / primitives — `IconButton` (project component on shadcn v4).
 *
 * Not a registry item: shadcn v4 exposes icon buttons as
 * `<Button size="icon">`. This wrapper exists for one accessibility reason —
 * the accessible name is **required by type**, so an unnamed icon-only
 * control cannot ship (release gate: no icon button without a label).
 *
 * States covered: default · hover · focus · disabled · pressed
 * (`aria-pressed`).
 */
export type IconButtonProps = Omit<
  ComponentProps<typeof Button>,
  "aria-label" | "children" | "size"
> &
  Pick<VariantProps<typeof buttonVariants>, "variant"> & {
    /** Accessible name. Required — never render an unnamed icon button. */
    label: string;
    /** The icon (or other single visual). */
    children: ReactNode;
    /** Renders a toggle button (`aria-pressed`). */
    pressed?: boolean;
    /** Icon-only size step. Defaults to the 32px `icon` square. */
    size?: "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  };

export function IconButton({
  className,
  label,
  variant = "ghost",
  size = "icon",
  pressed,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      data-slot="icon-button"
      size={size}
      variant={variant}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(className)}
      {...props}
    >
      {children}
    </Button>
  );
}

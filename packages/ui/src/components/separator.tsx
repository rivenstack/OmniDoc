import { Separator as BaseSeparator } from "@base-ui/react/separator";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Separator` (D-01 component inventory §3).
 *
 * Source: `shadcn` on Base UI `Separator` 1.8.0. Base UI renders a
 * `role="separator"` element and manages `aria-orientation`, so the visual
 * orientation and the accessibility tree cannot drift apart.
 *
 * States covered: horizontal · vertical.
 *
 * Note: a separator is decorative structure. Never rely on it to convey
 * grouping that assistive tech must understand — use real headings/landmarks
 * for that (a11y §4).
 */
export type SeparatorProps = Omit<
  ComponentProps<typeof BaseSeparator>,
  "className"
> & {
  className?: string;
};

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  return (
    <BaseSeparator
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:od-inline-full",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

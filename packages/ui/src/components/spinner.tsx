import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Spinner` (D-01 component inventory §3).
 *
 * Source: `shadcn+` — a shadcn/Lucide spinner with project-specific props.
 *
 * States covered: spinning · static (reduced motion).
 *
 * D-01 §6.1: under `prefers-reduced-motion: reduce` the spinner becomes a
 * non-animated indicator. The element keeps its accessible name in both
 * states, so the loading state is still announced. Announce it **once** from
 * the surrounding status region — never per streamed token (a11y §1.5, §4).
 */
const spinnerVariants = cva(
  "animate-spin motion-reduce:animate-none text-muted-foreground",
  {
    variants: {
      size: {
        sm: "size-4",
        default: "size-5",
        lg: "size-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export type SpinnerProps = Omit<
  React.ComponentProps<"span">,
  "children" | "role"
> &
  VariantProps<typeof spinnerVariants> & {
    /** Accessible name announced for the loading state. */
    label?: string;
  };

export function Spinner({
  className,
  size,
  label = "Loading",
  ...props
}: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role="status"
      className={cn("inline-flex items-center", className)}
      {...props}
    >
      <LoaderCircle
        aria-hidden="true"
        className={cn(spinnerVariants({ size }))}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

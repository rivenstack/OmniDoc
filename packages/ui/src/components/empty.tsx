import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Empty` (shadcn v4 `base-nova`, adapted).
 *
 * Source: `shadcn` registry. The standard empty-state block: dashed frame,
 * media, title, description, actions. Never hand-roll an empty state with
 * stacked `div`s.
 *
 * Adaptations: `font-heading` instead of the upstream `cn-font-heading`
 * marker (this design system owns its heading font role directly).
 *
 * Composition:
 * `<Empty><EmptyHeader><EmptyMedia variant="icon"><IconNotes /></EmptyMedia>
 *  <EmptyTitle>No notes yet</EmptyTitle>
 *  <EmptyDescription>…</EmptyDescription></EmptyHeader>
 *  <EmptyContent><Button>New note</Button></EmptyContent></Empty>`
 */
export function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center text-balance",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-sm flex-col items-center gap-2", className)}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "font-heading text-sm font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance",
        className,
      )}
      {...props}
    />
  );
}

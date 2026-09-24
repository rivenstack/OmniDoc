import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export type ContentRegionProps = React.ComponentProps<"div">;

/**
 * Shell block — `ContentRegion`.
 *
 * The centered content column. Content is capped at the layout max and centered
 * so wide screens do not stretch prose; individual reading surfaces still cap
 * themselves with `od-reading-measure`.
 */
export function ContentRegion({
  className,
  children,
  ...props
}: ContentRegionProps) {
  return (
    <div
      data-slot="content-region"
      className={cn(
        "mx-auto flex w-full max-w-[var(--od-layout-content-max)] flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Shell block — `PageHeader`.
 *
 * The content-region header slot. The heading carries `data-slot=page-heading`
 * and `tabIndex={-1}` so route-change focus management can land on it without
 * adding it to the tab order.
 */
export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-col gap-1", className)}
    >
      <h1
        data-slot="page-heading"
        tabIndex={-1}
        className="text-od-h1 text-foreground outline-none"
      >
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </header>
  );
}

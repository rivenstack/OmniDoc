import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { SHELL_CONTENT_ID } from "./copy";
import { Skeleton } from "../skeleton";
import { Button } from "../button";

/**
 * Layout & shell — `ContentRegion` (D-01 component inventory §1).
 *
 * Source: `custom`. States covered: `default · loading · error · empty`.
 *
 * This element is the shell's `main` landmark **and** the skip link's target
 * (`id="main"`, shell spec §7.1–7.2). It is `tabIndex={-1}` so it can receive
 * programmatic focus; on a route change the app moves focus to the content
 * heading (or to this region when a route renders no heading) — a11y §2.
 *
 * The shell must stay usable when a provider path fails (shell spec §6), so the
 * `error` state is scoped to this region and always offers a retry: a transport
 * error never blanks the chrome around it. `role="alert"` makes it announced
 * once, assertively; it is not an infinite live region.
 */
export type ContentRegionError = {
  title?: ReactNode;
  message?: ReactNode;
  /** Typically a `Button`; rendered inline with the message. */
  retry?: ReactNode;
};

export type ContentRegionEmpty = {
  /** Real heading — empty states are text-exposed, never colour-only. */
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export type ContentRegionProps = {
  state?: "default" | "loading" | "error" | "empty";
  error?: ContentRegionError;
  empty?: ContentRegionEmpty;
  children?: ReactNode;
  className?: string;
};

export function ContentRegion({
  state = "default",
  error,
  empty,
  children,
  className,
}: ContentRegionProps) {
  return (
    <main
      id={SHELL_CONTENT_ID}
      data-slot="content-region"
      data-state={state}
      tabIndex={-1}
      className={cn(
        "flex min-w-0 flex-1 flex-col px-4 py-6 focus-visible:outline-none sm:px-6",
        className,
      )}
    >
      {state === "loading" ? (
        <div
          data-slot="content-region-loading"
          // Static skeleton blocks only: no shimmer, so `prefers-reduced-motion`
          // needs no special case (a11y §5).
          className="flex flex-col gap-4"
          aria-busy="true"
        >
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full max-w-[var(--od-measure-reading)]" />
          <Skeleton className="h-4 w-full max-w-[var(--od-measure-reading)]" />
          <Skeleton className="h-4 w-2/3 max-w-[var(--od-measure-reading)]" />
        </div>
      ) : null}

      {state === "error" ? (
        <div
          data-slot="content-region-error"
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-od-1"
        >
          <h2 className="text-od-h3 text-foreground">
            {error?.title ?? "Something went wrong."}
          </h2>
          {error?.message ? (
            <p className="max-w-[var(--od-measure-reading)] text-od-body-sm text-od-text-secondary">
              {error.message}
            </p>
          ) : null}
          {error?.retry ?? null}
        </div>
      ) : null}

      {state === "empty" ? (
        <div
          data-slot="content-region-empty"
          className="flex flex-col items-start gap-3"
        >
          <h2 className="text-od-h2 text-foreground">{empty?.title}</h2>
          {empty?.description ? (
            <p className="max-w-[var(--od-measure-reading)] text-od-body text-od-text-secondary">
              {empty.description}
            </p>
          ) : null}
          {empty?.action ?? null}
        </div>
      ) : null}

      {state === "default" ? children : null}
    </main>
  );
}

/**
 * Small convenience for the region's error state so callers do not have to
 * reconstruct the retry control. Kept beside `ContentRegion` because it has no
 * meaning outside it.
 */
export function ContentRegionRetry({
  onClick,
  children = "Retry",
}: {
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

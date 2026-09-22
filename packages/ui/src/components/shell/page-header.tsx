import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Layout & shell — `PageHeader` (D-01 component inventory §1).
 *
 * Source: `shadcn+`. States covered: `default · with actions · with corpus chip`.
 *
 * The title element is the shell's **route-change focus target** (shell spec
 * §2.4, QA 1.3): it is programmatically focusable (`tabIndex={-1}`) and carries
 * the id the app focuses after navigation. `tabIndex={-1}` is intentional and
 * is not a keyboard trap — the heading stays out of sequential tab order while
 * remaining focusable on demand.
 *
 * **Root is a `<div>`, not a `<header>`.** A `<header>` nested in `<main>` is
 * still resolved as a `banner` landmark by assistive-technology heuristics, so
 * rendering one here produced a *second* banner landmark alongside the `TopBar`
 * and made "the banner" ambiguous for landmark navigation. F-02's regression test
 * caught this; the shell owns exactly one `banner` (shell spec §7.2, a11y §4).
 *
 * The corpus chip sits at the inline-end of the title row via `ms-auto` (a
 * logical inset) and the title itself is wrapped in `<bdi>`, because a
 * workspace-derived title is user-generated text next to chassis punctuation
 * (states/sample-vs-mine §9, a11y §7.3).
 */
export type PageHeaderProps = {
  /** Focus target id. The content region computes a default when omitted. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Secondary controls for the page (buttons, filters). */
  actions?: ReactNode;
  /** e.g. a corpus chip (`CorpusChip` — F-08 owns the component itself). */
  corpusChip?: ReactNode;
  headingLevel?: 1 | 2;
  className?: string;
};

export function PageHeader({
  id,
  title,
  description,
  actions,
  corpusChip,
  headingLevel = 1,
  className,
}: PageHeaderProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <div
      data-slot="page-header"
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Heading
          id={id}
          data-slot="page-header-title"
          tabIndex={-1}
          className={cn(
            "min-w-0 focus-visible:outline-none",
            headingLevel === 1 ? "text-od-h1" : "text-od-h2",
            "text-foreground",
          )}
        >
          <bdi className="od-unbroken">{title}</bdi>
        </Heading>
        {corpusChip ? (
          <div data-slot="page-header-corpus-chip" className="ms-auto">
            {corpusChip}
          </div>
        ) : null}
      </div>

      {description ? (
        <p className="max-w-[var(--od-measure-reading)] text-od-body-sm text-od-text-secondary">
          {description}
        </p>
      ) : null}

      {actions ? (
        <div
          data-slot="page-header-actions"
          className="flex flex-wrap items-center gap-2"
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

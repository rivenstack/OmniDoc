import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { SHELL_CONTENT_ID, SKIP_LINK_LABEL } from "./copy";

/**
 * Layout & shell — `SkipLink` (D-01 component inventory §1).
 *
 * Source: `custom`. States covered: `default (visible on focus)`.
 *
 * Accessibility (shell spec §7.1, a11y §4): this must be the **first focusable
 * element in the document**. It is `sr-only` until focused, then rendered as a
 * real, visible control at the inline-start edge of the viewport — logical
 * `start-2`, so it follows the writing direction rather than hard-coding left.
 *
 * It is a plain anchor, so it needs no JS: the browser moves focus to
 * `#main` and `ContentRegion` owns that target.
 */
export type SkipLinkProps = {
  /** Defaults to `#main` — the id owned by `ContentRegion`. */
  href?: string;
  children?: ReactNode;
  className?: string;
};

export function SkipLink({
  href = `#${SHELL_CONTENT_ID}`,
  children = SKIP_LINK_LABEL,
  className,
}: SkipLinkProps) {
  return (
    <a
      data-slot="skip-link"
      href={href}
      className={cn(
        "sr-only",
        // Visible-on-focus geometry. `fixed` keeps it out of flow so revealing
        // it cannot shift layout; `start-2` is the logical inline-start inset.
        "focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:start-2 focus-visible:z-50",
        "focus-visible:rounded-md focus-visible:bg-background focus-visible:px-3 focus-visible:py-2",
        "focus-visible:text-od-body-sm focus-visible:font-medium focus-visible:text-foreground focus-visible:shadow-od-2",
        className,
      )}
    >
      {children}
    </a>
  );
}

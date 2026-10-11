"use client";

import Link from "next/link";
import type { SearchLinkProps } from "@omnidoc/ui";

/**
 * Client-navigation links injected into the search blocks (F-06).
 *
 * `@omnidoc/ui` must not depend on `next/link`, so the blocks take their link
 * components as props. The wrappers differ deliberately:
 *
 * - **`SearchHitLink`** opens a note (the existing capture route
 *   `/notes/[noteId]`): normal navigation, which lands the reader at the top of
 *   the note.
 * - **`SearchFilterLink`** switches the corpus filter: `scroll={false}` keeps the
 *   reader where they are, so the results below update instead of the page
 *   jumping back to the top.
 * - **`SearchAskLink`** is the quiet pivot to `/ask` (F-07 owns that route and
 *   its behaviour).
 *
 * All three forward `aria-current`, because the active filter chip must be
 * announced as current, not merely drawn differently.
 */
export function SearchHitLink({
  href,
  className,
  children,
  "aria-current": ariaCurrent,
}: SearchLinkProps) {
  return (
    <Link href={href} className={className} aria-current={ariaCurrent}>
      {children}
    </Link>
  );
}

export function SearchFilterLink({
  href,
  className,
  children,
  "aria-current": ariaCurrent,
}: SearchLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      aria-current={ariaCurrent}
      scroll={false}
    >
      {children}
    </Link>
  );
}

export function SearchAskLink({ href, className, children }: SearchLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

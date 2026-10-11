"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Client-navigation links injected into the organize blocks (F-05).
 *
 * `@omnidoc/ui` must not depend on `next/link`, so `NoteList` takes its link
 * components as props. These wrappers are the app's answer, and the difference
 * between them is deliberate:
 *
 * - **`NoteRowLink`** opens a note: normal navigation, which lands the reader at
 *   the top of the note.
 * - **`NotePaginationLink`** loads the next page *below* the current one;
 *   `scroll={false}` keeps the reader where they are instead of throwing them
 *   back to the top of a list that just grew.
 *
 * Both are client components: the list block receives them as props rather than
 * importing `next/link` itself, and the wrappers stay reusable inside
 * interactive compositions (such as a `Button`'s `render` prop).
 */
export type OrganizeNavLinkProps = {
  href: string;
  className?: string;
  children?: ReactNode;
};

export function NoteRowLink({ href, className, children }: OrganizeNavLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function NotePaginationLink({
  href,
  className,
  children,
}: OrganizeNavLinkProps) {
  return (
    <Link href={href} className={className} scroll={false}>
      {children}
    </Link>
  );
}

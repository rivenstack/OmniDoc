import type { ComponentType, ReactNode } from "react";

/**
 * The link contract every search block renders through.
 *
 * `@omnidoc/ui` must not depend on `next/link`, so the app injects its own
 * link components (F-05 precedent, `organize/note-list.tsx`). Search needs two
 * of them because their navigation behaviour differs:
 *
 * - **hit links** open a note: normal navigation.
 * - **filter links** change the corpus filter: the reader stays where they are
 *   (`scroll={false}`), so the results below update without throwing the page
 *   back to the top.
 *
 * `aria-current` travels on the link itself, because the active chip must be
 * announced as the current filter, not only drawn differently.
 */
export type SearchLinkProps = {
  href: string;
  className?: string;
  children?: ReactNode;
  "aria-current"?: "true" | "false" | boolean;
};

export type SearchLink = ComponentType<SearchLinkProps>;

function AnchorLink({
  href,
  className,
  children,
  "aria-current": ariaCurrent,
}: SearchLinkProps) {
  return (
    <a href={href} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  );
}

/**
 * The default link: a plain anchor. It keeps every block renderable and
 * testable on its own, and it is what a no-JavaScript visitor actually gets.
 */
export const DefaultSearchLink: SearchLink = AnchorLink;

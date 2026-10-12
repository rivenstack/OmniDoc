import type { ComponentType, ReactNode } from "react";

/**
 * The link contract every Ask block renders through.
 *
 * `@omnidoc/ui` must not depend on `next/link`, so the app injects its own link
 * component (F-05 / F-06 precedent). Ask needs only one: every citation link
 * opens the cited note in the existing capture route `/notes/[noteId]`, and
 * normal navigation is what a reader expects after inspecting a passage.
 *
 * The default is a plain anchor, which is also what makes every block
 * renderable and testable on its own — and what a no-JavaScript visitor gets.
 */
export type AskLinkProps = {
  href: string;
  className?: string;
  children?: ReactNode;
};

export type AskLink = ComponentType<AskLinkProps>;

function AnchorLink({ href, className, children }: AskLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export const DefaultAskLink: AskLink = AnchorLink;

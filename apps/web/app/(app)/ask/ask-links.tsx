"use client";

import Link from "next/link";
import { buttonVariants, cn, type AskLinkProps } from "@omnidoc/ui";

/**
 * Client-navigation links injected into the Ask blocks.
 *
 * `@omnidoc/ui` must not depend on `next/link`, so the blocks take their link
 * component as a prop. Ask needs only one: a citation chip opens the cited note
 * at the existing capture route. It is a thin wrapper so the block stays
 * route-free and testable on its own.
 */
export function AskNoteLink({ href, className, children }: AskLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * The recovery link for an expired session.
 *
 * Base UI's `Button` renders through `render`, not `asChild`, so a link styled
 * as a button uses the shared variant classes on the anchor itself.
 */
export function AskSignInLink({ className }: { className?: string }) {
  return (
    <Link
      href="/sign-in"
      className={cn(buttonVariants({ variant: "outline" }), className)}
    >
      Sign in again
    </Link>
  );
}

import { cn } from "../lib/utils";

export type SkipLinkProps = {
  /** Target fragment. Defaults to the shell's main content region. */
  href?: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Shell block — `SkipLink`.
 *
 * The first focusable element in the document so keyboard and screen-reader
 * users can bypass repeated navigation (ui-qa-checklist §1.7). Hidden until
 * focused, then pinned to the start edge with the design-system focus ring.
 *
 * Because it is first in the DOM it sits before the sidebar, so when revealed
 * it overlays the sidebar header (the workspace switcher). That is expected for
 * a skip link — it is a transient overlay, and the elevation is what tells the
 * eye that it floats above the shell rather than colliding with it.
 *
 * Not a visual choice: the reference protocol in the F-02 handoff exempts the
 * skip link and focus management from "ask first".
 */
export function SkipLink({
  href = "#content",
  children = "Skip to content",
  className,
}: SkipLinkProps) {
  return (
    <a
      data-slot="skip-link"
      href={href}
      className={cn(
        // `focus:not-sr-only` clears the clip/overflow that hides the link, but
        // it also resets `position` to `static`. That would make the link a
        // flex item in the shell's sidebar row and shove the sidebar sideways.
        // `focus:fixed` is emitted after `focus:not-sr-only` in the generated
        // CSS and wins — verified, not assumed. Do not drop it.
        "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </a>
  );
}

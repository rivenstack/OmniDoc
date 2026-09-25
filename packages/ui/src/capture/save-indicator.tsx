import { cn } from "../lib/utils";
import {
  saveStatusLabel,
  saveStatusMessage,
  type SaveStatus,
} from "./save-state";

export type SaveIndicatorProps = {
  status: SaveStatus;
  className?: string;
};

/**
 * Capture block — `SaveIndicator`.
 *
 * Text only, with no spinner: the words already say what is happening, and a
 * spinning affordance next to "Saving…" would be motion that
 * `prefers-reduced-motion` has to undo (`ui-qa-checklist.md` §3.1/§3.3).
 *
 * Two elements on purpose:
 *
 * - the visible label is terse (`Saved`, `Conflict`, `Not saved`)
 * - the `role="status"` region carries the unambiguous sentence
 *
 * Splitting them is what keeps the announcement honest without forcing the badge
 * to be a paragraph. The live region's text changes exactly once per status
 * change (`saveStatusMessage`), so a re-render says nothing new and the user is
 * not spammed (`ui-qa-checklist.md` §2.3).
 *
 * `conflict` and `error` are given different tones *and* different words: colour
 * never carries the meaning alone (§4.4).
 */
export function SaveIndicator({ status, className }: SaveIndicatorProps) {
  const message = saveStatusMessage(status);

  return (
    <div
      data-slot="save-indicator"
      data-status={status}
      className={cn("flex min-w-0 items-center justify-end", className)}
    >
      {status === "idle" ? null : (
        <span
          // Decorative to assistive tech: the exposed information is the status
          // sentence below. Without this the badge and the live region can carry
          // the same words ("Saving…"), and a screen reader would read it twice.
          aria-hidden="true"
          className={cn("text-xs font-medium", tone(status))}
        >
          {saveStatusLabel(status)}
        </span>
      )}
      {/*
        Always mounted, including for `idle` (empty text). A live region that
        appears and disappears is announced inconsistently across AT; one that
        stays put and changes its text is not.
      */}
      <span role="status" className="sr-only">
        {message}
      </span>
    </div>
  );
}

function tone(status: SaveStatus): string {
  switch (status) {
    case "idle":
      return "text-muted-foreground";
    case "saving":
      return "text-muted-foreground";
    case "saved":
      return "text-muted-foreground";
    case "conflict":
      return "text-od-status-conflict";
    case "error":
      return "text-od-status-error";
  }
}

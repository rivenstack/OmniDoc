import { Button } from "../components/button";
import { cn } from "../lib/utils";

export type SaveProblemKind = "conflict" | "error";

export type SaveProblemBannerProps = {
  kind: SaveProblemKind;
  /** When the server's version was last updated, if the caller knows it. */
  serverUpdatedAt?: string | null;
  /** Keep the version the server holds. Discards the local edits. */
  onKeepServerVersion?: () => void | Promise<void>;
  /** Re-save the local edits on top of the server's version. */
  onKeepMyEdits?: () => void | Promise<void>;
  /** Retry a failed save. */
  onRetry?: () => void | Promise<void>;
  busy?: boolean;
  className?: string;
};

/**
 * Capture block — `SaveProblemBanner` (option A: inline, above the editor).
 *
 * The banner never decides anything. `system-ux.md` §2 says *"A conflict is
 * visible. The client does not pick the winning version."* — so this block's
 * whole job is to make the disagreement legible and hand the choice to the user.
 * There is no "auto-merge", no timeout that picks a winner, and no default that
 * fires if the user does nothing.
 *
 * `kind` is not cosmetic:
 *
 * - `conflict` — the server holds a different version. Both versions exist and
 *   are valid; the two actions are "keep theirs" and "keep mine".
 * - `error` — we could not reach the answer. There is nothing to reconcile, only
 *   something to retry. Offering "keep server / keep mine" here would be a lie
 *   about what is known.
 *
 * The block is **not** a live region. The status change is announced once by
 * `SaveIndicator`'s polite region; making the banner announce too would say the
 * same thing twice (`ui-qa-checklist.md` §2.3). It is a labelled region instead,
 * so a screen-reader user can navigate to it after hearing the status.
 */
export function SaveProblemBanner({
  kind,
  serverUpdatedAt,
  onKeepServerVersion,
  onKeepMyEdits,
  onRetry,
  busy,
  className,
}: SaveProblemBannerProps) {
  const headingId = `save-problem-${kind}`;

  return (
    <section
      data-slot="save-problem-banner"
      data-kind={kind}
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-start sm:justify-between",
        kind === "conflict"
          ? "border-od-status-conflict/40 bg-od-status-conflict/10"
          : "border-destructive/40 bg-destructive/10",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p id={headingId} className="font-medium text-foreground">
          {kind === "conflict"
            ? "This note changed somewhere else"
            : "These edits are not saved"}
        </p>
        <p className="text-muted-foreground">
          {kind === "conflict" ? (
            <>
              Another version was saved
              {serverUpdatedAt ? " since you opened this" : ""}. Neither version
              has been discarded. Your edits stay on this page until you choose.
            </>
          ) : (
            <>
              OmniDoc could not reach the server, so nothing was written. Your
              edits are still on this page.
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {kind === "conflict" ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                void onKeepServerVersion?.();
              }}
            >
              Keep the server&rsquo;s version
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => {
                void onKeepMyEdits?.();
              }}
            >
              Keep my edits
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              void onRetry?.();
            }}
          >
            Try again
          </Button>
        )}
      </div>
    </section>
  );
}

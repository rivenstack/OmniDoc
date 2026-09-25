/**
 * Capture save state — the part of the note editor that must never lie.
 *
 * `docs/design/system-ux.md` §2 fixes the behaviour: *"Saves are versioned. A
 * conflict is visible. The client does not pick the winning version."* This
 * module is that behaviour as a pure reducer, so it can be tested without an
 * editor, a network, or a browser.
 *
 * ## Status
 *
 * - `idle` — nothing to report. Also the state after a success whose captured
 *   revision is already stale (edits arrived while the save was in flight), and
 *   after a new edit invalidates a `saved` badge. It is never used to mean
 *   "saved".
 * - `saving` — a request is in flight for a specific revision.
 * - `saved` — that revision is on the server and no newer edit exists.
 * - `conflict` — the server holds a different version. The local edits are
 *   **not** saved and are **not** discarded; the user decides.
 * - `error` — a transport failure. Not one of the four states listed for F-04,
 *   and deliberately added: a failed save that renders as nothing (or worse,
 *   as `saved`) is silent data loss. It is kept distinct from `conflict`
 *   because "the server has a newer version" and "we could not reach the
 *   server" are different facts and the user's next action differs.
 *
 * ## Revisions, not booleans
 *
 * `dirty` is derived from two counters rather than stored. A save captures the
 * revision it is sending; if the user types while it is in flight, `revision`
 * moves past `savedRevision`, the badge stops claiming `saved`, and another
 * save is queued. A boolean `dirty` flag cannot express that without a race.
 */

/** The status the editor shows. */
export type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error";

export type SaveState = {
  status: SaveStatus;
  /** Increments on every local edit. */
  revision: number;
  /** The revision the last successful save captured. */
  savedRevision: number;
  /** `versionId` from the last successful save — the next `expectedVersion`. */
  version: string | null;
};

export type SaveEvent =
  /** The user changed the title or body. */
  | { type: "edit" }
  /** Autosave fired for the current revision. */
  | { type: "save_started" }
  /** The server accepted the save; `revision` is what was sent. */
  | { type: "save_succeeded"; revision: number; version: string }
  /** The server answered 409 — a different version exists. */
  | { type: "save_conflict" }
  /** Transport failure, 5xx, or an unreadable response. */
  | { type: "save_failed" }
  /** Re-baseline from a server note (initial load, or a resolved conflict). */
  | { type: "reset"; version: string | null; revision?: number };

export function initialSaveState(version: string | null = null): SaveState {
  return { status: "idle", revision: 0, savedRevision: 0, version };
}

/** Local edits exist that the server has not accepted. */
export function isDirty(state: SaveState): boolean {
  return state.revision !== state.savedRevision;
}

/**
 * Can a save be started?
 *
 * Only when there is something to save: firing an autosave with no edits would
 * bump the version and announce a save the user did not make.
 */
export function canSave(state: SaveState): boolean {
  return isDirty(state) && state.status !== "saving" && state.status !== "conflict";
}

export function reduceSaveState(state: SaveState, event: SaveEvent): SaveState {
  switch (event.type) {
    case "edit": {
      const revision = state.revision + 1;
      // An edit during `saving` or `conflict` must not clear the state the user
      // is being shown: a save is still in flight, or a decision is still owed.
      // Anywhere else, newer edits make `saved` false and `error` stale, so the
      // badge goes quiet instead of asserting something untrue.
      const status: SaveStatus =
        state.status === "saving" || state.status === "conflict"
          ? state.status
          : "idle";
      return { ...state, revision, status };
    }

    case "save_started": {
      return canSave(state) ? { ...state, status: "saving" } : state;
    }

    case "save_succeeded": {
      // Edits that arrived while this save was in flight are newer than what was
      // sent, so `saved` would be a lie — the queue is still non-empty.
      const status: SaveStatus =
        state.revision === event.revision ? "saved" : "idle";
      return {
        status,
        revision: state.revision,
        savedRevision: event.revision,
        version: event.version,
      };
    }

    case "save_conflict": {
      // Keep the local edits and the revision the user can retry with. Nothing
      // is auto-resolved, and the version token stays at the last one accepted
      // so a retry is rejected again rather than silently overwriting.
      return { ...state, status: "conflict" };
    }

    case "save_failed": {
      return { ...state, status: "error" };
    }

    case "reset": {
      const revision = event.revision ?? 0;
      return {
        status: "idle",
        revision,
        savedRevision: revision,
        version: event.version,
      };
    }
  }
}

/**
 * Copy for the polite live region (`quality/ui-qa-checklist.md` §2.3).
 *
 * One string per status, so the region's text changes exactly once per state
 * change and a re-render announces nothing. `idle` is empty on purpose: there is
 * nothing to say, and an empty region does not interrupt the user.
 */
export function saveStatusMessage(status: SaveStatus): string {
  switch (status) {
    case "idle":
      return "";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "conflict":
      return "This note changed elsewhere. Your edits are not saved.";
    case "error":
      return "Couldn't save. Your edits are still on this page.";
  }
}

/**
 * Short badge text. Separate from `saveStatusMessage` because the visible badge
 * has room to be terse while the announcement must be unambiguous.
 */
export function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case "idle":
      return "";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "conflict":
      return "Conflict";
    case "error":
      return "Not saved";
  }
}

/** The `expectedVersion` to send for the current state, if a save may start. */
export function expectedVersion(state: SaveState): string | null {
  return state.version;
}

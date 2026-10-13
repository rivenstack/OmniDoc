/**
 * The reveal rebuild policy: guards and deferral delays (F-15 Rev 2, Task 2.3).
 *
 * Two catalogue entries describe *when* the decoration set is recomputed, and
 * both are surprising enough to be worth their own module:
 *
 * - **`OBS-1.14.4-REVEAL-006` — three guards, one outcome.** While the pointer is
 *   down, while an IME composition is in flight, or while the syntax tree does
 *   not reach the end of the viewport, the set is merely *mapped* through the
 *   document changes instead of being rebuilt. Rebuilding under the pointer
 *   would move text out from under the cursor; rebuilding mid-composition would
 *   disturb the IME.
 * - **`OBS-1.14.4-REVEAL-010` — one synchronous path, five deferred ones.** A
 *   transaction recomputes immediately; a focus or blur change waits 10 ms, a
 *   pointer release 50 ms, a composition end 100 ms, a mobile cursor drag
 *   700 ms, and a caret nudge is a zero-millisecond timeout (deferred, but as
 *   soon as the queue allows).
 *
 * The distinct delays are why a caret that leaves a construct does not always
 * re-render instantly — that is the artifact's behaviour, not a bug to smooth
 * over (`OBS-1.14.4-IME-002` is the composition half of the same story).
 *
 * This module is the policy only: it never touches a view's state, so the
 * plugin that owns the decoration set decides what to do when a rebuild is due.
 */

import { syntaxTree } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";

/**
 * The five deferral delays, plus the synchronous transaction path
 * (`OBS-1.14.4-REVEAL-010`). Milliseconds.
 */
export const REVEAL_DELAYS = {
  /** A transaction rebuilds synchronously — not deferred at all. */
  transaction: 0,
  focusBlur: 10,
  pointerRelease: 50,
  compositionEnd: 100,
  mobileDragEnd: 700,
  /** Deferred, but with no wait: a follow-up pass once the caret has settled. */
  caretNudge: 0,
} as const;

/** Everything that can cause the set to be recomputed. */
export type RevealTrigger = keyof typeof REVEAL_DELAYS;

/** The three conditions under which the set is mapped instead of rebuilt. */
export type RebuildGuard = {
  /** A pointer is currently down inside the editor (`REVEAL-006`). */
  readonly pointerDown: boolean;
  /** An IME composition is in flight (`REVEAL-006`, `IME-002`). */
  readonly composing: boolean;
  /** The syntax tree reaches the viewport's end (`REVEAL-006`). */
  readonly treeCoversViewport: boolean;
};

/** The guard state for an idle, fully-parsed editor. */
export const NO_REBUILD_GUARD: RebuildGuard = {
  pointerDown: false,
  composing: false,
  treeCoversViewport: true,
};

/** True when the set must be mapped through changes rather than rebuilt. */
export function shouldMapOnly(guard: RebuildGuard): boolean {
  return guard.pointerDown || guard.composing || !guard.treeCoversViewport;
}

/**
 * The third guard, read from the view (`OBS-1.14.4-REVEAL-006`).
 *
 * "Tree shorter than the viewport" is a *parsing* condition, not a layout one:
 * the walk can only decorate what the parser has reached, so rebuilding while
 * the tree still ends before the visible region would decorate half a document.
 */
export function treeCoversViewport(view: EditorView): boolean {
  return syntaxTree(view.state).length >= view.viewport.to;
}

/** The delay a trigger is deferred by, in milliseconds. */
export function delayFor(trigger: RevealTrigger): number {
  return REVEAL_DELAYS[trigger];
}

/** The handle a timer implementation returns; opaque to callers. */
export type TimerHandle = ReturnType<typeof setTimeout>;

export type RebuildSchedulerOptions = {
  /** Injectable for tests; defaults to the global timer functions. */
  readonly setTimer?: (run: () => void, ms: number) => TimerHandle;
  readonly clearTimer?: (handle: TimerHandle) => void;
};

/** Defers a rebuild according to the trigger that caused it. */
export type RebuildScheduler = {
  /**
   * Run `run` now for a transaction, or after this trigger's delay otherwise.
   * A second call supersedes a pending one — the newest trigger wins, which is
   * what stops a queue of stale rebuilds from firing in a burst.
   */
  schedule(trigger: RevealTrigger, run: () => void): void;
  /** Drop a pending rebuild (view teardown, or a synchronous rebuild landing). */
  cancel(): void;
  /** True while a deferred rebuild is waiting. */
  isPending(): boolean;
};

/** Create a scheduler. One per editor instance. */
export function createRebuildScheduler(
  options: RebuildSchedulerOptions = {},
): RebuildScheduler {
  const setTimer =
    options.setTimer ?? ((run: () => void, ms: number) => setTimeout(run, ms));
  const clearTimer = options.clearTimer ?? ((handle: TimerHandle) => clearTimeout(handle));

  let pending: TimerHandle | null = null;

  const cancel = () => {
    if (pending !== null) {
      clearTimer(pending);
      pending = null;
    }
  };

  return {
    schedule(trigger, run) {
      cancel();
      // `transaction` is the only synchronous path; every other trigger is a
      // timeout, including the zero-millisecond caret nudge.
      if (trigger === "transaction") {
        run();
        return;
      }
      pending = setTimer(() => {
        pending = null;
        run();
      }, delayFor(trigger));
    },
    cancel,
    isPending: () => pending !== null,
  };
}

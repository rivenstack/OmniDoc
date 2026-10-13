// Reveal rebuild guards and deferral delays — F-15 Rev 2, plan Task 2.3.
//
// Acceptance (plan §5 Task 2.3): "Pointer-down / composing / short-tree →
// map-only; transaction → synchronous; focus/blur 10 ms; pointer release 50 ms;
// composition end 100 ms; mobile drag end 700 ms; caret nudge 0 ms."
//
// The scheduler is driven with fake timers, so each delay is asserted exactly
// rather than approximately.

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type EditorHarness } from "../parity/harness";
import { markdownLivePreviewPlugin } from "./index";
import {
  NO_REBUILD_GUARD,
  REVEAL_DELAYS,
  createRebuildScheduler,
  delayFor,
  shouldMapOnly,
  treeCoversViewport,
  type RebuildGuard,
  type TimerHandle,
} from "./policy";

let harness: EditorHarness | null = null;

afterEach(() => {
  harness?.destroy();
  harness = null;
  vi.useRealTimers();
});

const guard = (overrides: Partial<RebuildGuard> = {}): RebuildGuard => ({
  ...NO_REBUILD_GUARD,
  ...overrides,
});

describe("rebuild guards (OBS-1.14.4-REVEAL-006, OBS-1.14.4-IME-002)", () => {
  it("rebuilds in an idle, fully-parsed editor", () => {
    expect(shouldMapOnly(NO_REBUILD_GUARD)).toBe(false);
  });

  it("maps only while the pointer is down", () => {
    expect(shouldMapOnly(guard({ pointerDown: true }))).toBe(true);
  });

  it("maps only while an IME composition is in flight", () => {
    expect(shouldMapOnly(guard({ composing: true }))).toBe(true);
  });

  it("maps only while the tree does not reach the viewport end", () => {
    expect(shouldMapOnly(guard({ treeCoversViewport: false }))).toBe(true);
  });

  it("maps only if any guard holds, and rebuilds when all are clear", () => {
    expect(
      shouldMapOnly(guard({ pointerDown: true, composing: true, treeCoversViewport: false })),
    ).toBe(true);
    expect(
      shouldMapOnly(guard({ pointerDown: false, composing: true, treeCoversViewport: true })),
    ).toBe(true);
    expect(
      shouldMapOnly(guard({ pointerDown: false, composing: false, treeCoversViewport: true })),
    ).toBe(false);
  });

  it("reads the third guard from a real view", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "A paragraph with **bold** text.\n",
        extensions: [markdown({ base: markdownLanguage })],
      }),
    });
    // jsdom has no layout, but the parser reaches the whole document, so the
    // tree covers the viewport and the guard does not hold.
    expect(treeCoversViewport(view)).toBe(true);
    view.destroy();
    parent.remove();
  });
});

describe("deferral delays (OBS-1.14.4-REVEAL-010)", () => {
  it("names the artifact's five delays plus the synchronous path", () => {
    expect(REVEAL_DELAYS).toEqual({
      transaction: 0,
      focusBlur: 10,
      pointerRelease: 50,
      compositionEnd: 100,
      mobileDragEnd: 700,
      caretNudge: 0,
    });
    expect(delayFor("focusBlur")).toBe(10);
    expect(delayFor("pointerRelease")).toBe(50);
    expect(delayFor("compositionEnd")).toBe(100);
    expect(delayFor("mobileDragEnd")).toBe(700);
    expect(delayFor("caretNudge")).toBe(0);
  });

  it("runs a transaction synchronously, with no timer involved", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const scheduler = createRebuildScheduler();

    scheduler.schedule("transaction", run);

    expect(run).toHaveBeenCalledTimes(1);
    expect(scheduler.isPending()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("defers a focus or blur change by exactly 10 ms", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    createRebuildScheduler().schedule("focusBlur", run);

    vi.advanceTimersByTime(9);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("defers a pointer release by exactly 50 ms", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    createRebuildScheduler().schedule("pointerRelease", run);

    vi.advanceTimersByTime(49);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("defers a composition end by exactly 100 ms", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    createRebuildScheduler().schedule("compositionEnd", run);

    vi.advanceTimersByTime(99);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("defers a mobile drag end by exactly 700 ms", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    createRebuildScheduler().schedule("mobileDragEnd", run);

    vi.advanceTimersByTime(699);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("defers the caret nudge with a zero-millisecond timeout", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const scheduler = createRebuildScheduler();
    scheduler.schedule("caretNudge", run);

    // Deferred, not synchronous: a zero-millisecond timeout still waits for the
    // timer queue.
    expect(run).not.toHaveBeenCalled();
    expect(scheduler.isPending()).toBe(true);
    vi.advanceTimersByTime(0);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("lets the newest trigger supersede a pending one", () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const scheduler = createRebuildScheduler();

    scheduler.schedule("mobileDragEnd", first);
    scheduler.schedule("focusBlur", second);

    expect(scheduler.isPending()).toBe(true);
    vi.advanceTimersByTime(700);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending rebuild on demand", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const scheduler = createRebuildScheduler();
    scheduler.schedule("pointerRelease", run);

    scheduler.cancel();

    expect(scheduler.isPending()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(run).not.toHaveBeenCalled();
  });

  it("uses the injected timer functions", () => {
    const timers: { run: () => void; ms: number }[] = [];
    const cleared: TimerHandle[] = [];
    const scheduler = createRebuildScheduler({
      setTimer: (run, ms) => {
        timers.push({ run, ms });
        return timers.length as unknown as TimerHandle;
      },
      clearTimer: (handle) => {
        cleared.push(handle);
      },
    });

    scheduler.schedule("compositionEnd", () => undefined);
    expect(timers).toHaveLength(1);
    expect(timers[0].ms).toBe(100);

    scheduler.schedule("focusBlur", () => undefined);
    expect(cleared).toEqual([1]);
    expect(timers[1].ms).toBe(10);
  });

  it("clears its pending handle before running, so a rebuild cannot re-enter itself", () => {
    vi.useFakeTimers();
    const scheduler = createRebuildScheduler();
    let pendingDuringRun: boolean | null = null;
    scheduler.schedule("focusBlur", () => {
      pendingDuringRun = scheduler.isPending();
    });

    vi.advanceTimersByTime(10);
    expect(pendingDuringRun).toBe(false);
  });
});

// The policy is only real if the plugin honours it, so these drive the actual
// `markdownLivePreviewPlugin`. The signal is the `cm-live-syntax` mark: it is
// emitted only when a token is *revealed*, so its presence says a rebuild has
// run with the caret inside the construct.
describe("the preview plugin honours the policy (OBS-1.14.4-REVEAL-006/-010)", () => {
  /** A heading with the caret parked on it: revealed iff the set was rebuilt. */
  function mountHeading(): EditorHarness {
    harness = createHarness({
      doc: "# Title\n",
      selection: { anchor: 0 },
      extensions: [markdown({ base: markdownLanguage }), markdownLivePreviewPlugin],
    });
    return harness;
  }

  it("folds the marker while unfocused, and still folds it immediately after focus", async () => {
    const view = mountHeading();
    // Unfocused: the caret does not count (`REVEAL-002`).
    expect(view.classesAt(0)).not.toContain("cm-live-syntax");

    view.focus();

    // The focus path is deferred by 10 ms, so nothing has been recomputed yet.
    expect(view.classesAt(0)).not.toContain("cm-live-syntax");

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(view.classesAt(0)).toContain("cm-live-syntax");
  });

  it("recomputes synchronously on a transaction", () => {
    const view = mountHeading();
    view.focus();
    // A selection transaction takes the synchronous path (`REVEAL-010`), so the
    // reveal is visible in the same turn.
    view.placeCaret(0);
    expect(view.classesAt(0)).toContain("cm-live-syntax");
  });

  it("maps only while the pointer is down, and rebuilds 50 ms after release", async () => {
    harness = createHarness({
      doc: "plain\n",
      selection: { anchor: 0 },
      extensions: [markdown({ base: markdownLanguage }), markdownLivePreviewPlugin],
    });
    const view = harness;
    view.focus();

    view.view.contentDOM.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
    );
    // A document change while the pointer is down is mapped, never rebuilt: a
    // rebuild would move text out from under the cursor. The new construct
    // therefore carries no decoration yet.
    view.setDoc("**bold**\n");
    expect(view.classesAt(2)).not.toContain("cm-live-strong");

    view.view.contentDOM.dispatchEvent(
      new MouseEvent("mouseup", { bubbles: true }),
    );
    // 50 ms pointer-release deferral, then the rebuild lands.
    expect(view.classesAt(2)).not.toContain("cm-live-strong");
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(view.classesAt(2)).toContain("cm-live-strong");
  });
});

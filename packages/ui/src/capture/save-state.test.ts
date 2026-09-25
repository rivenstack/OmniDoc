import { describe, expect, it } from "vitest";

import {
  canSave,
  expectedVersion,
  initialSaveState,
  isDirty,
  reduceSaveState,
  saveStatusLabel,
  saveStatusMessage,
  type SaveState,
} from "./save-state";

/** Fold a list of events over the initial state — the way the editor drives it. */
function drive(events: Parameters<typeof reduceSaveState>[1][], version = "v1"): SaveState {
  return events.reduce(reduceSaveState, initialSaveState(version));
}

describe("save state transitions", () => {
  it("starts idle, clean, and holding the loaded version", () => {
    const state = initialSaveState("v1");

    expect(state.status).toBe("idle");
    expect(isDirty(state)).toBe(false);
    expect(expectedVersion(state)).toBe("v1");
  });

  it("goes idle → saving → saved for one edit", () => {
    const edited = reduceSaveState(initialSaveState("v1"), { type: "edit" });
    expect(edited.status).toBe("idle");
    expect(isDirty(edited)).toBe(true);

    const saving = reduceSaveState(edited, { type: "save_started" });
    expect(saving.status).toBe("saving");

    const saved = reduceSaveState(saving, {
      type: "save_succeeded",
      revision: saving.revision,
      version: "v2",
    });
    expect(saved.status).toBe("saved");
    expect(isDirty(saved)).toBe(false);
    // The next save must send the newly accepted version.
    expect(expectedVersion(saved)).toBe("v2");
  });

  it("stops claiming saved as soon as a newer edit exists", () => {
    const saved = drive([
      { type: "edit" },
      { type: "save_started" },
      { type: "save_succeeded", revision: 1, version: "v2" },
    ]);
    expect(saved.status).toBe("saved");

    const edited = reduceSaveState(saved, { type: "edit" });
    expect(edited.status).toBe("idle");
    expect(isDirty(edited)).toBe(true);
  });

  it("does not claim saved when edits land while the save is in flight", () => {
    let state = drive([{ type: "edit" }]);
    state = reduceSaveState(state, { type: "save_started" });
    // The user keeps typing before the response arrives.
    state = reduceSaveState(state, { type: "edit" });
    expect(state.status).toBe("saving");

    state = reduceSaveState(state, {
      type: "save_succeeded",
      revision: 1,
      version: "v2",
    });

    expect(state.status).toBe("idle");
    expect(isDirty(state)).toBe(true);
    expect(canSave(state)).toBe(true);
  });

  it("refuses to start a save with nothing to save", () => {
    const clean = initialSaveState("v1");

    expect(canSave(clean)).toBe(false);
    expect(reduceSaveState(clean, { type: "save_started" })).toBe(clean);
  });

  it("refuses to start a second save while one is in flight", () => {
    const saving = drive([{ type: "edit" }, { type: "save_started" }]);

    expect(canSave(saving)).toBe(false);
    expect(reduceSaveState(saving, { type: "save_started" })).toBe(saving);
  });
});

describe("conflict handling", () => {
  it("surfaces a conflict and keeps the local edits", () => {
    const conflicting = drive([
      { type: "edit" },
      { type: "save_started" },
      { type: "save_conflict" },
    ]);

    expect(conflicting.status).toBe("conflict");
    // The client did not pick a winner: the local revision is still unsaved.
    expect(isDirty(conflicting)).toBe(true);
  });

  it("will not let autosave retry over an undecided conflict", () => {
    const conflicting = drive([
      { type: "edit" },
      { type: "save_started" },
      { type: "save_conflict" },
    ]);

    expect(canSave(conflicting)).toBe(false);
    expect(reduceSaveState(conflicting, { type: "save_started" })).toBe(conflicting);
  });

  it("keeps the conflict visible while the user is still editing", () => {
    const conflicting = drive([
      { type: "edit" },
      { type: "save_started" },
      { type: "save_conflict" },
    ]);

    const edited = reduceSaveState(conflicting, { type: "edit" });

    expect(edited.status).toBe("conflict");
    expect(edited.revision).toBe(2);
  });

  it("keeps the rejected version token so a blind retry cannot overwrite", () => {
    const conflicting = drive([
      { type: "edit" },
      { type: "save_started" },
      { type: "save_conflict" },
    ]);

    // Still `v1`: if the client auto-retried, it would send the same rejected
    // token and be refused again rather than clobbering the other version.
    expect(expectedVersion(conflicting)).toBe("v1");
  });

  it("re-baselines to the version the user chose to keep", () => {
    const conflicting = drive([
      { type: "edit" },
      { type: "save_started" },
      { type: "save_conflict" },
    ]);

    const resolved = reduceSaveState(conflicting, { type: "reset", version: "v9" });

    expect(resolved).toEqual({
      status: "idle",
      revision: 0,
      savedRevision: 0,
      version: "v9",
    });
    expect(isDirty(resolved)).toBe(false);
  });
});

describe("transport failure", () => {
  it("reports a failed save instead of pretending it saved", () => {
    const failed = drive([
      { type: "edit" },
      { type: "save_started" },
      { type: "save_failed" },
    ]);

    expect(failed.status).toBe("error");
    expect(isDirty(failed)).toBe(true);
  });

  it("lets a later edit retry after a failure", () => {
    const failed = drive([
      { type: "edit" },
      { type: "save_started" },
      { type: "save_failed" },
    ]);

    const retried = reduceSaveState(failed, { type: "edit" });

    expect(retried.status).toBe("idle");
    expect(canSave(retried)).toBe(true);
  });
});

describe("announcements", () => {
  it("produces exactly one message per status, and none for idle", () => {
    expect(saveStatusMessage("idle")).toBe("");
    expect(saveStatusMessage("saving")).toBe("Saving…");
    expect(saveStatusMessage("saved")).toBe("Saved");
    expect(saveStatusMessage("conflict")).not.toBe("");
    expect(saveStatusMessage("error")).not.toBe("");
  });

  it("says what is true rather than reassuring", () => {
    // A conflict is not "saved", and an error is not a conflict.
    expect(saveStatusMessage("conflict")).toMatch(/not saved/i);
    expect(saveStatusMessage("error")).toMatch(/couldn't save/i);
    expect(saveStatusMessage("conflict")).not.toBe(saveStatusMessage("error"));
  });

  it("keeps the visible badge out of the live region's way", () => {
    expect(saveStatusLabel("conflict")).toBe("Conflict");
    expect(saveStatusLabel("error")).toBe("Not saved");
  });

  it("changes the announced text on every status change in one save cycle", () => {
    const cycle = ["idle", "saving", "saved"] as const;
    const messages = cycle.map(saveStatusMessage);

    expect(new Set(messages).size).toBe(messages.length);
  });
});

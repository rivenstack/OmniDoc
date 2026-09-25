import { describe, expect, it } from "vitest";

import {
  createCaptureStore,
  dispatchSaveEvent,
  nextExpectedVersion,
  shouldStartSave,
} from "./capture-store";

describe("capture store", () => {
  it("creates a distinct store per note", () => {
    const first = createCaptureStore("v1");
    const second = createCaptureStore("v1");

    dispatchSaveEvent(first, { type: "edit" });

    expect(first.getState().save.revision).toBe(1);
    // Module-level state would leak the edit into the other open note.
    expect(second.getState().save.revision).toBe(0);
  });

  it("drives one full save cycle through dispatch", () => {
    const store = createCaptureStore("v1");

    dispatchSaveEvent(store, { type: "edit" });
    expect(shouldStartSave(store)).toBe(true);

    const revision = store.getState().save.revision;
    dispatchSaveEvent(store, { type: "save_started" });
    expect(store.getState().save.status).toBe("saving");
    expect(shouldStartSave(store)).toBe(false);

    dispatchSaveEvent(store, { type: "save_succeeded", revision, version: "v2" });

    expect(store.getState().save.status).toBe("saved");
    expect(nextExpectedVersion(store)).toBe("v2");
    expect(shouldStartSave(store)).toBe(false);
  });

  it("carries the loaded version into the first update", () => {
    const store = createCaptureStore("v7");

    expect(nextExpectedVersion(store)).toBe("v7");
  });

  it("starts a fresh draft with no version token", () => {
    const store = createCaptureStore();

    expect(nextExpectedVersion(store)).toBeNull();

    dispatchSaveEvent(store, { type: "edit" });
    dispatchSaveEvent(store, { type: "save_started" });
    dispatchSaveEvent(store, { type: "save_succeeded", revision: 1, version: "v1" });

    expect(nextExpectedVersion(store)).toBe("v1");
  });

  it("stops autosave after a conflict until the user decides", () => {
    const store = createCaptureStore("v1");

    dispatchSaveEvent(store, { type: "edit" });
    dispatchSaveEvent(store, { type: "save_started" });
    dispatchSaveEvent(store, { type: "save_conflict" });

    expect(store.getState().save.status).toBe("conflict");
    expect(shouldStartSave(store)).toBe(false);
  });
});

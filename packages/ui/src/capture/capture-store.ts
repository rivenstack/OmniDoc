/**
 * Capture store — Zustand 5.0.15 (ADR-0003 §2: editor/UI state only).
 *
 * Holds what the save cycle needs to be honest: the status, the revision
 * counters, and the version token. The ProseMirror document itself is **not**
 * here — TipTap owns it, and duplicating the body into a second store would
 * create a second source of truth for the very thing ADR-0001 §2 says has one.
 *
 * A vanilla store (not a React `create`) so the save cycle is testable without
 * a renderer, and so the app can create one store per open note instead of
 * sharing module-level state between notes.
 */
import { createStore, type StoreApi } from "zustand/vanilla";

import {
  canSave,
  expectedVersion,
  initialSaveState,
  reduceSaveState,
  type SaveEvent,
  type SaveState,
} from "./save-state";

export type CaptureStoreState = {
  /** The save cycle the badge and live region read. */
  save: SaveState;
  /** Apply one save-cycle event. */
  dispatch: (event: SaveEvent) => void;
};

export type CaptureStore = StoreApi<CaptureStoreState>;

/**
 * Create the save-cycle store for one open note.
 *
 * `version` is the `versionId` of the note as loaded (or `null` for a note that
 * has never been saved — the draft path).
 */
export function createCaptureStore(version: string | null = null): CaptureStore {
  return createStore<CaptureStoreState>((set) => ({
    save: initialSaveState(version),
    dispatch: (event) =>
      set((state) => ({ save: reduceSaveState(state.save, event) })),
  }));
}

/** Whether a save may start now. Read through the store, never from a copy. */
export function shouldStartSave(store: CaptureStore): boolean {
  return canSave(store.getState().save);
}

/** The `expectedVersion` to send with the next update. */
export function nextExpectedVersion(store: CaptureStore): string | null {
  return expectedVersion(store.getState().save);
}

/**
 * Apply one save-cycle event.
 *
 * Zustand keeps actions in state, so this reads `getState()` rather than
 * reaching for a method on the store handle. Consumers use this instead of
 * `store.dispatch(...)` — there is no such method.
 */
export function dispatchSaveEvent(store: CaptureStore, event: SaveEvent): void {
  store.getState().dispatch(event);
}

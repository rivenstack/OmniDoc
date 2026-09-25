/**
 * Capture blocks — the note editor's project-owned layer.
 *
 * `save-state.ts` and `capture-store.ts` hold the save cycle (Zustand 5.0.15,
 * ADR-0003 §2). `import-status.ts` holds the per-file indexing vocabulary.
 *
 * The ProseMirror document itself is owned by TipTap, not by this package
 * (ADR-0001 §2: ProseMirror JSON is the single durable source of truth).
 */
export {
  canSave,
  expectedVersion,
  initialSaveState,
  isDirty,
  reduceSaveState,
  saveStatusLabel,
  saveStatusMessage,
  type SaveEvent,
  type SaveState,
  type SaveStatus,
} from "./save-state";
export {
  createCaptureStore,
  dispatchSaveEvent,
  nextExpectedVersion,
  shouldStartSave,
  type CaptureStore,
  type CaptureStoreState,
} from "./capture-store";
export {
  importStatusFromJob,
  importStatusLabel,
  importStatusMessage,
  indexIncompleteNotice,
  isIndexComplete,
  type ImportStatus,
  type JobStatus,
} from "./import-status";

/**
 * Capture blocks — the note editor's project-owned layer.
 *
 * `save-state.ts` and `capture-store.ts` hold the save cycle (Zustand 5.0.15,
 * ADR-0003 §2). `import-status.ts` holds the per-file indexing vocabulary.
 * `document.ts` holds the contract body type and the empty-document spelling.
 *
 * The ProseMirror document itself is owned by TipTap, not by this package
 * (ADR-0001 §2: ProseMirror JSON is the single durable source of truth) — no
 * module here keeps a second copy of the body.
 */
export {
  EMPTY_DOCUMENT,
  isBlankDraft,
  type ProseMirrorDocument,
} from "./document";
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
export { SaveIndicator, type SaveIndicatorProps } from "./save-indicator";
export { NoteTitleField, type NoteTitleFieldProps } from "./note-title-field";
export {
  SaveProblemBanner,
  type SaveProblemBannerProps,
  type SaveProblemKind,
} from "./save-problem-banner";
export { FormattingToolbar, SelectionToolbar } from "./formatting-toolbar";
export {
  ImportDropzone,
  type ImportDropzoneProps,
  type ImportItem,
} from "./import-dropzone";
export {
  AUTOSAVE_DELAY_MS,
  CaptureSurface,
  IMPORT_POLL_MS,
  type CaptureImportResult,
  type CaptureNote,
  type CaptureSaveInput,
  type CaptureSaveResult,
  type CaptureSurfaceProps,
} from "./capture-surface";

"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useStore } from "zustand";
import { cn } from "../lib/utils";
import {
  EMPTY_DOCUMENT,
  isBlankDraft,
  type ProseMirrorDocument,
} from "./document";
import { canSave } from "./save-state";
import {
  createCaptureStore,
  dispatchSaveEvent,
  nextExpectedVersion as readExpectedVersion,
} from "./capture-store";
import { FormattingToolbar, SelectionToolbar } from "./formatting-toolbar";
import { ImportDropzone, type ImportItem } from "./import-dropzone";
import { NoteTitleField } from "./note-title-field";
import { SaveIndicator } from "./save-indicator";
import { SaveProblemBanner } from "./save-problem-banner";
import type { ImportStatus } from "./import-status";

/** How long the editor waits after the last keystroke before saving. */
export const AUTOSAVE_DELAY_MS = 800;

/** How often an import in flight is re-checked. */
export const IMPORT_POLL_MS = 2_000;

/** A note as this surface needs it — the app maps the contract onto this. */
export type CaptureNote = {
  id: string;
  title: string;
  bodyJson: ProseMirrorDocument;
  version: string;
};

export type CaptureSaveInput = {
  /** `null` for a note that has not been created yet. */
  noteId: string | null;
  title: string;
  bodyJson: ProseMirrorDocument;
  /** `null` means "this note has never been saved" — the app creates instead. */
  expectedVersion: string | null;
};

/**
 * Save outcomes. `conflict` is a result, not an error: the note was not saved
 * and the user must choose (`system-ux.md` §2).
 */
export type CaptureSaveResult =
  | { status: "saved"; noteId: string; version: string }
  | { status: "conflict" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "validation" }
  | { status: "unavailable" };

export type CaptureImportResult =
  | { status: "queued"; jobId: string }
  | { status: "rejected" }
  | { status: "unavailable" };

export type CaptureSurfaceProps = {
  /** The loaded note, or `null` for a note that has not been created yet. */
  note: CaptureNote | null;
  /** Persist. Provided by the app; this block never calls the API itself. */
  onSave: (input: CaptureSaveInput) => Promise<CaptureSaveResult>;
  /** Re-read a note's current version, used to resolve a conflict. */
  onLoadServerVersion?: (noteId: string) => Promise<CaptureNote | null>;
  /** Enqueue one file for indexing. */
  onImportFile?: (file: File) => Promise<CaptureImportResult>;
  /** Read one import's progress. */
  onReadImportJob?: (jobId: string) => Promise<ImportStatus | null>;
  /** Fires once the first save created a real note, so the app can update the URL. */
  onCreated?: (noteId: string) => void;
  /** Accessible name for the body surface. Distinct from the title field. */
  bodyLabel?: string;
  className?: string;
};

/**
 * Capture block — `CaptureSurface`.
 *
 * The note **is** the page: title, toolbar and body sit directly on the page
 * background with no card around them (option A). A card would make the body
 * look like a form field, and the body is where the work happens.
 *
 * What this block deliberately does not do:
 *
 * - It never calls the API. `onSave` / `onImportFile` are the app's, so the
 *   block stays testable without a network and the ports stay the only way to
 *   the server (`architecture.md` §1).
 * - It never stores the document. TipTap owns it; the store holds only the save
 *   cycle. Two owners of the body would be two sources of truth for the one
 *   thing ADR-0001 §2 says has a single one.
 * - It never resolves a conflict. See `SaveProblemBanner`.
 *
 * A blank draft is not saved: firing an autosave on an untouched new note would
 * create an empty note the user never asked for, and "New note lands in the
 * editor" must not mean "New note lands in the database".
 */
export function CaptureSurface({
  note,
  onSave,
  onLoadServerVersion,
  onImportFile,
  onReadImportJob,
  onCreated,
  bodyLabel = "Note body",
  className,
}: CaptureSurfaceProps) {
  const [store] = useState(() => createCaptureStore(note?.version ?? null));
  const save = useStore(store, (state) => state.save);

  const [title, setTitle] = useState(note?.title ?? "");
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [resolving, setResolving] = useState(false);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(
    note?.id ?? null,
  );

  // Latest values for use inside the save callback without re-creating it on
  // every keystroke (which would restart the autosave debounce).
  const titleRef = useRef(title);
  titleRef.current = title;
  const createdNoteIdRef = useRef(createdNoteId);
  createdNoteIdRef.current = createdNoteId;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          // A code block that overflows must be scrollable **by keyboard**
          // (`ui-qa-checklist.md` §6.1); an overflow container without a tab
          // stop cannot be scrolled without a pointer.
          HTMLAttributes: { tabindex: "0" },
        },
      }),
    ],
    content: note?.bodyJson ?? EMPTY_DOCUMENT,
    // Required: the default throws during server rendering, and Next renders
    // this tree on the server first.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": bodyLabel,
        // `ProseMirror` must stay in this string: TipTap's `attributes.class`
        // **replaces** the view's default class rather than adding to it, and
        // losing it drops the editor's base styles and every `[&_.ProseMirror]`
        // rule below.
        class: "ProseMirror od-capture-body",
      },
      handleKeyDown(view, event) {
        // A keyboard exit from the editing surface. Tab also leaves (the editor
        // does not trap it); Escape is the explicit one, and it must not be
        // swallowed by an extension.
        if (event.key === "Escape") {
          view.dom.blur();
          return true;
        }
        return false;
      },
    },
    onUpdate: () => {
      dispatchSaveEvent(store, { type: "edit" });
    },
  });

  const runSave = useCallback(async (): Promise<void> => {
    const current = store.getState().save;
    if (!canSave(current)) {
      return;
    }
    const revision = current.revision;
    const expectedVersion = readExpectedVersion(store);
    const body = editor?.getJSON() as ProseMirrorDocument | undefined;

    // Nothing worth persisting: saving here would create an empty note the user
    // never asked for. The revision is left dirty, so the next real edit still
    // saves.
    if (isBlankDraft(titleRef.current, body)) {
      return;
    }

    dispatchSaveEvent(store, { type: "save_started" });

    const result = await onSave({
      noteId: createdNoteIdRef.current,
      title: titleRef.current,
      bodyJson: body ?? EMPTY_DOCUMENT,
      expectedVersion,
    });

    switch (result.status) {
      case "saved": {
        dispatchSaveEvent(store, {
          type: "save_succeeded",
          revision,
          version: result.version,
        });
        if (!createdNoteIdRef.current) {
          createdNoteIdRef.current = result.noteId;
          setCreatedNoteId(result.noteId);
          onCreated?.(result.noteId);
        }
        return;
      }
      case "conflict": {
        dispatchSaveEvent(store, { type: "save_conflict" });
        return;
      }
      default: {
        // forbidden / not_found / validation / unavailable all mean the same
        // thing to the user: these edits are not on the server, and nothing here
        // is a decision they owe. They are shown as one honest state.
        dispatchSaveEvent(store, { type: "save_failed" });
      }
    }
  }, [editor, onCreated, onSave, store]);

  // Autosave: debounce on the revision counter, not on a dirty boolean, so a
  // save that is already in flight is never double-fired.
  useEffect(() => {
    if (!save || !canSave(save)) {
      return;
    }
    const timer = setTimeout(() => {
      void runSave();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [save, runSave]);

  // Resolve "keep the server's version": adopt their title and body, and
  // re-baseline to their version so nothing is saved.
  const keepServerVersion = useCallback(async () => {
    const noteId = createdNoteIdRef.current;
    // A conflict can only be reported for a note the server already holds, so a
    // missing id here means there is nothing to reconcile.
    if (!onLoadServerVersion || !noteId) {
      return;
    }
    setResolving(true);
    const server = await onLoadServerVersion(noteId);
    setResolving(false);
    if (!server) {
      return;
    }
    setTitle(server.title);
    editor?.commands.setContent(server.bodyJson, { emitUpdate: false });
    dispatchSaveEvent(store, { type: "reset", version: server.version });
  }, [editor, onLoadServerVersion, store]);

  // Resolve "keep my edits": take their version as the concurrency base and save
  // over it. This is the user's explicit choice, which is exactly what §2
  // requires — it is not the client picking a winner on its own.
  const keepMyEdits = useCallback(async () => {
    const noteId = createdNoteIdRef.current;
    if (!onLoadServerVersion || !noteId) {
      return;
    }
    setResolving(true);
    const server = await onLoadServerVersion(noteId);
    setResolving(false);
    if (!server) {
      return;
    }
    dispatchSaveEvent(store, { type: "reset", version: server.version });
    // Re-baselining to their version would leave nothing to save, so mark the
    // local content as an edit again before saving it.
    dispatchSaveEvent(store, { type: "edit" });
    void runSave();
  }, [onLoadServerVersion, runSave, store]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!onImportFile) {
        return;
      }
      for (const file of files) {
        // A file is listed immediately as `pending`, because "we accepted this
        // file" and "the server accepted this file" are different facts and the
        // row must not claim the second before it is true.
        const localId = `${file.name}:${file.size}:${nextLocalId()}`;
        setImportItems((items) => [
          ...items,
          { id: localId, fileName: file.name, status: "pending" },
        ]);

        const result = await onImportFile(file);
        setImportItems((items) =>
          items.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  id: result.status === "queued" ? result.jobId : localId,
                  status: result.status === "queued" ? "indexing" : "failed",
                }
              : item,
          ),
        );
      }
    },
    [onImportFile],
  );

  // Poll only while something is actually in flight.
  useEffect(() => {
    if (!onReadImportJob) {
      return;
    }
    const inFlight = importItems.filter(
      (item) => item.status === "pending" || item.status === "indexing",
    );
    if (inFlight.length === 0) {
      return;
    }
    const timer = setInterval(() => {
      void (async () => {
        for (const item of inFlight) {
          const status = await onReadImportJob(item.id);
          if (status) {
            setImportItems((items) =>
              items.map((entry) =>
                entry.id === item.id ? { ...entry, status } : entry,
              ),
            );
          }
        }
      })();
    }, IMPORT_POLL_MS);
    return () => clearInterval(timer);
  }, [importItems, onReadImportJob]);

  const titleId = useId();

  return (
    <div
      data-slot="capture-surface"
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <NoteTitleField
          id={titleId}
          value={title}
          onValueChange={(value) => {
            setTitle(value);
            dispatchSaveEvent(store, { type: "edit" });
          }}
          onCommit={() => {
            // Leaving the title is a commit signal: save now instead of waiting
            // out the debounce.
            void runSave();
          }}
          className="flex-1"
        />
        <SaveIndicator status={save?.status ?? "idle"} className="pt-2" />
      </div>

      {save?.status === "conflict" ? (
        <SaveProblemBanner
          kind="conflict"
          busy={resolving}
          onKeepServerVersion={keepServerVersion}
          onKeepMyEdits={keepMyEdits}
        />
      ) : null}

      {save?.status === "error" ? (
        <SaveProblemBanner
          kind="error"
          onRetry={() => {
            void runSave();
          }}
        />
      ) : null}

      {editor ? <FormattingToolbar editor={editor} /> : null}

      <div className="min-h-[50vh] min-w-0">
        <EditorContent
          editor={editor}
          className={cn(
            // `break-words` inherits, so long unbroken strings wrap anywhere in
            // the body without a blanket descendant selector
            // (`ui-qa-checklist.md` §5.9).
            "min-w-0 break-words text-base text-foreground outline-none",
            "[&_.ProseMirror]:min-h-[40vh] [&_.ProseMirror]:outline-none",
            "[&_p]:my-3",
            "[&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-medium",
            "[&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-medium",
            "[&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium",
            "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6",
            "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6",
            "[&_blockquote]:my-4 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground",
            "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm",
            "[&_pre]:focus-visible:ring-3 [&_pre]:focus-visible:ring-ring [&_pre]:outline-none",
            "[&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
            "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
            "[&_hr]:my-6 [&_hr]:border-border",
            "[&_a]:text-primary [&_a]:underline",
          )}
        />
      </div>

      {editor ? <SelectionToolbar editor={editor} /> : null}

      {onImportFile ? (
        <ImportDropzone items={importItems} onFilesSelected={handleFiles} />
      ) : null}
    </div>
  );
}

/** Monotonic id for a file row that has no server id yet. */
let localIdCounter = 0;
function nextLocalId(): number {
  localIdCounter += 1;
  return localIdCounter;
}

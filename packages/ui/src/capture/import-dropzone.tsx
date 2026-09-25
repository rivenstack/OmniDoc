"use client";

import { useId, useState, type DragEvent } from "react";
import { IconFileText, IconUpload } from "@tabler/icons-react";
import { Badge, type BadgeProps } from "../components/badge";
import { cn } from "../lib/utils";
import {
  importStatusLabel,
  importStatusMessage,
  indexIncompleteNotice,
  type ImportStatus,
} from "./import-status";

/** One imported file as the UI knows it. */
export type ImportItem = {
  /** Stable key — the ingestion job id once the server has one. */
  id: string;
  fileName: string;
  status: ImportStatus;
};

export type ImportDropzoneProps = {
  items: ImportItem[];
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
};

const STATUS_BADGE: Record<ImportStatus, NonNullable<BadgeProps["variant"]>> = {
  pending: "secondary",
  indexing: "info",
  ready: "success",
  partial: "warning",
  failed: "destructive",
};

/**
 * Capture block — `ImportDropzone` (option A: a drop zone below the editor with
 * per-file rows).
 *
 * `system-ux.md` §2 makes paste and file import first-class, and gives **each
 * imported file its own** indexing status. So this block renders a row per file
 * rather than one aggregate spinner: "3 of 4 done" cannot tell you which file
 * failed, and a single "ready" would present an incomplete index as complete.
 *
 * The drop target is an extra affordance, never the only path — the file input
 * is the real control, keyboard-operable and labelled, so nothing here is
 * gesture-only (`ui-qa-checklist.md` §1.8). Dropping is deliberately not wired
 * to the input's value: the block reports the `File[]` it was handed and lets
 * the caller decide what to send.
 *
 * The indexing notice uses `role="status"` so "not everything is indexed yet"
 * is announced once when it appears, rather than re-announced on every poll.
 */
export function ImportDropzone({
  items,
  onFilesSelected,
  disabled,
  className,
}: ImportDropzoneProps) {
  const inputId = useId();
  const hintId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const notice = indexIncompleteNotice(items.map((item) => item.status));

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) {
      return;
    }
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }

  return (
    <section
      data-slot="import-dropzone"
      aria-labelledby={`${inputId}-heading`}
      className={cn("flex flex-col gap-3", className)}
    >
      <h2 id={`${inputId}-heading`} className="sr-only">
        Import files
      </h2>

      <div
        data-dragging={isDragging ? "true" : undefined}
        onDragOver={(event) => {
          // preventDefault on dragover is what makes a drop event fire at all.
          event.preventDefault();
          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-dashed p-3 transition-colors",
          "data-dragging:border-ring data-dragging:bg-muted/50",
        )}
      >
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconUpload aria-hidden="true" className="size-4 shrink-0" />
          Drop a file here, or choose one. Pasted text becomes part of the note.
        </p>

        <div className="flex flex-col gap-2">
          {/*
            The input is visually hidden and the visible control is a `<label>`
            styled as a button. Hiding a focusable input outright would leave a
            keyboard user with focus they cannot see (`ui-qa-checklist.md` §1.2),
            so the label is a `peer` of the input and mirrors its focus ring.
            The input keeps its own accessible name for the accessibility tree.
          */}
          <input
            id={inputId}
            type="file"
            multiple
            disabled={disabled}
            aria-describedby={hintId}
            className="peer sr-only"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) {
                onFilesSelected(files);
              }
              // Reset so re-picking the same file fires `change` again.
              event.target.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            data-slot="import-trigger"
            className={cn(
              "inline-flex h-8 w-fit items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium",
              "cursor-pointer transition-colors hover:bg-muted hover:text-foreground",
              "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring peer-focus-visible:outline-none",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            )}
          >
            <IconUpload aria-hidden="true" className="size-4" />
            Choose files
          </label>
          <p id={hintId} className="text-xs text-muted-foreground">
            Each file keeps its own indexing status. Search and Ask can only see
            content once it is indexed.
          </p>
        </div>
      </div>

      {notice ? (
        <p role="status" className="text-xs text-od-status-partial">
          {notice}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <IconFileText
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                {/* `bdi` isolates the filename: it is untrusted content and may
                    carry mixed-direction text (`architecture.md` §8). */}
                <bdi className="truncate text-sm text-foreground">
                  {item.fileName}
                </bdi>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="sr-only">
                  {importStatusMessage(item.status)}
                </span>
                <Badge variant={STATUS_BADGE[item.status]}>
                  {importStatusLabel(item.status)}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Import / indexing status for capture.
 *
 * `docs/design/system-ux.md` §2: *"Paste and file import are first-class. Each
 * imported file has its own indexing status: pending, indexing, ready, partial,
 * or failed."* and *"Indexing in progress is visible. Search and Ask must not
 * present an incomplete index as complete."*
 *
 * The transport contract (`docs/api/openapi.yaml`, `JobStatus`) says
 * `pending | running | ready | failed | partial`. Those are the wire words; the
 * five product words are the ones the user reads, and `running` is shown as
 * `indexing` because that is what is happening. The mapping lives here, once, so
 * no screen invents its own vocabulary.
 */
import type { components } from "@omnidoc/contracts";

export type JobStatus = components["schemas"]["JobStatus"];

/** The five statuses a single imported file can be in. */
export type ImportStatus = "pending" | "indexing" | "ready" | "partial" | "failed";

/**
 * Wire → product vocabulary.
 *
 * `running` becomes `indexing`. The rest pass through, so a new wire value is a
 * compile error here rather than a silently mislabelled row.
 */
export function importStatusFromJob(status: JobStatus): ImportStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "running":
      return "indexing";
    case "ready":
      return "ready";
    case "partial":
      return "partial";
    case "failed":
      return "failed";
  }
}

/** One line per status, written to be true rather than reassuring. */
export function importStatusMessage(status: ImportStatus): string {
  switch (status) {
    case "pending":
      return "Waiting to be indexed.";
    case "indexing":
      return "Indexing…";
    case "ready":
      return "Indexed. Search and Ask can use this file.";
    case "partial":
      return "Partly indexed. Some content could not be processed.";
    case "failed":
      return "Indexing failed. This file is not searchable.";
  }
}

/** Short label for a status chip. */
export function importStatusLabel(status: ImportStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "indexing":
      return "Indexing";
    case "ready":
      return "Ready";
    case "partial":
      return "Partial";
    case "failed":
      return "Failed";
  }
}

/**
 * Is this file fully searchable?
 *
 * Only `ready` is. `partial` is **not** complete: `architecture.md` §3 makes
 * indexing lag a first-class state, and treating a partial index as done is
 * exactly the silent-success failure REC-02 warns about.
 */
export function isIndexComplete(status: ImportStatus): boolean {
  return status === "ready";
}

/**
 * What to tell the user about a set of imports, or `null` when everything is
 * indexed and nothing needs saying.
 *
 * This is the shared answer to "may Search and Ask imply a complete index?" —
 * they may not, and this returns the reason rather than letting each surface
 * decide for itself.
 */
export function indexIncompleteNotice(statuses: ImportStatus[]): string | null {
  if (statuses.length === 0) {
    return null;
  }

  const working = statuses.filter(
    (status) => status === "pending" || status === "indexing",
  ).length;
  const incomplete = statuses.filter((status) => status === "partial").length;
  const failed = statuses.filter((status) => status === "failed").length;

  if (working === 0 && incomplete === 0 && failed === 0) {
    return null;
  }

  const parts: string[] = [];
  if (working > 0) {
    parts.push(`${working} still indexing`);
  }
  if (incomplete > 0) {
    parts.push(`${incomplete} partly indexed`);
  }
  if (failed > 0) {
    parts.push(`${failed} failed`);
  }

  return `Not everything is indexed yet (${parts.join(", ")}). Search and Ask may miss content.`;
}

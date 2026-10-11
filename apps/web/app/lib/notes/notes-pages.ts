/**
 * Organize list pages — cursor-chain walking over the notes port (F-05).
 *
 * `listNotes` (S-02) is cursor-paginated: the first response carries
 * `nextCursor`, and the next page is asked for by passing that cursor back.
 * The F-05 risk in the work ticket shapes this module:
 *
 * - *"pagination cursors must come from the server; do not synthesize a cursor
 *   client-side"* — so a URL the user shares is a chain of cursors **the server
 *   issued**, and if the server no longer agrees with a cursor in the URL (the
 *   corpus changed since the link was made) the walk stops at the last page the
 *   server still vouches for and offers the server's own cursor instead.
 *
 * No framework imports: the port stays testable with a plain mocked `fetch`,
 * and the route-facing session/workspace resolution lives in
 * `note-list-loader.ts` (which is the only part that needs `next/headers`).
 */
import type { OrganizeNote } from "@omnidoc/ui";

import type { ApiJar } from "../api/transport";
import { listNotes, type Note } from "./notes-api";

export type NotesListOutcome =
  | {
      status: "listed";
      notes: OrganizeNote[];
      /**
       * The chain that actually produced `notes` — not necessarily the chain in
       * the URL. A stale or truncated URL resolves to the pages the server
       * still vouches for, and the route builds its links from *this* chain so
       * a broken link is never extended.
       */
      cursors: string[];
      nextCursor: string | null;
    }
  | { status: "denied" }
  | { status: "unavailable" };

/**
 * How many pages one URL may chain.
 *
 * The cursor list arrives from the address bar, so it is bounded before it
 * becomes N requests. Twenty pages is ~400 notes at the contract's default page
 * size; past that the user pages by following "Load more" from where they land.
 */
export const MAX_LIST_PAGE_CHAIN = 20;

/** Read the repeated `cursor` search parameter into a validated chain. */
export function readCursors(value: string | string[] | undefined): string[] {
  const raw = value === undefined ? [] : Array.isArray(value) ? value : [value];
  return raw
    .map((cursor) => cursor.trim())
    .filter((cursor) => cursor.length > 0)
    .slice(0, MAX_LIST_PAGE_CHAIN);
}

/**
 * The `href` for a page chain.
 *
 * Cursors are only ever looked up and re-encoded here; nothing is minted. An
 * empty chain is the base path with no query.
 */
export function pageHref(basePath: string, cursors: readonly string[]): string {
  if (cursors.length === 0) {
    return basePath;
  }
  const params = new URLSearchParams();
  for (const cursor of cursors) {
    params.append("cursor", cursor);
  }
  return `${basePath}?${params.toString()}`;
}

/** Project a contract `Note` onto what a list row renders — no shape forks. */
export function toOrganizeNote(note: Note): OrganizeNote {
  return {
    id: note.id,
    title: note.title,
    updatedAt: note.updatedAt,
    corpusOwnership: note.corpusOwnership,
  };
}

/**
 * Walk the cursor chain and collect every page the URL asks for.
 *
 * `cursors` is the chain the user has already loaded, oldest page first. Each
 * entry must match the `nextCursor` the server returned for the page before it;
 * a mismatch (a stale link, or notes created since) stops the walk cleanly and
 * hands back the server's current next cursor — never a client-made one.
 *
 * Outcomes mirror `note-loader.ts`: `forbidden` is the generic denial, and
 * `unauthorized`/`unavailable` collapse into "we could not ask" so an expired
 * session does not read as "no notes".
 */
export async function collectNotePages(
  workspaceId: string,
  jar: ApiJar,
  cursors: readonly string[] = [],
): Promise<NotesListOutcome> {
  const notes: OrganizeNote[] = [];
  const chain: string[] = [];
  let cursor: string | undefined;

  for (let index = 0; index <= cursors.length; index += 1) {
    const page = await listNotes(
      workspaceId,
      jar,
      cursor ? { cursor } : {},
    );
    if (page.status === "forbidden") {
      return { status: "denied" };
    }
    if (page.status !== "listed") {
      return { status: "unavailable" };
    }

    notes.push(...page.notes.map(toOrganizeNote));

    const nextCursor = page.nextCursor ?? null;
    if (nextCursor === null) {
      return { status: "listed", notes, cursors: chain, nextCursor: null };
    }
    if (index === cursors.length || cursors[index] !== nextCursor) {
      return { status: "listed", notes, cursors: chain, nextCursor };
    }
    chain.push(nextCursor);
    cursor = nextCursor;
  }

  return { status: "listed", notes, cursors: chain, nextCursor: null };
}

import type { ComponentType, ReactNode } from "react";
import { Badge } from "../components/badge";
import { buttonVariants } from "../components/button";
import { cn } from "../lib/utils";

/**
 * Organize block — `NoteList` (F-05).
 *
 * The note list is one block over one port (`listNotes`, S-02):
 * a real `ul`/`li` list whose rows are links into the capture route. The look
 * `@user` chose on 2026-10-11 is *quiet Mintlify rows* — title + meta line,
 * hairline dividers, no cards — logged in `docs/design/now.md`.
 *
 * Behaviour that is **not** a look choice, and lives here so both routes share
 * one implementation:
 *
 * - **Rows are links, not click handlers.** Tab + Enter work because the row is
 *   an anchor with an `href` (`quality/ui-qa-checklist.md` §1.1); no
 *   `tabIndex={-1}`, no `onClick` (a click-only row is the classic a11y trap).
 * - **Titles are UGC and are `bdi`-isolated** so a mixed-direction title cannot
 *   re-order the list chrome (§6.5, §7.3). Long and unbroken titles truncate
 *   with `min-w-0` on every box in the chain — they must not widen the page at
 *   ~390px (§5.9).
 * - **The list never claims indexing state.** `Note` in the contract carries no
 *   per-note indexing field, so a row that said "Indexed" or "Ready" would be
 *   inventing data — the honesty rule in `system-ux.md` §2 (*"Search and Ask
 *   must not present an incomplete index as complete"*) starts with not
 *   claiming it here. Per-file indexing status is F-04's import rows, where the
 *   contract does return it.
 * - **Sample vs mine is real data, not decoration** (`system-ux.md` §1): the
 *   `Sample` badge renders only when the server says `corpusOwnership` is
 *   `sample`, mirroring the shell's workspace switcher.
 * - **Cursors come from the server.** `loadMoreHref` is built from the
 *   `nextCursor` the server just returned; the client never synthesizes one.
 *
 * Links are injected: `@omnidoc/ui` must not depend on `next/link`, so the app
 * passes its own link components (rows navigate normally; pagination keeps the
 * reader in place with `scroll={false}`). The default is a plain anchor, which
 * is also what makes the block testable standalone.
 */

/**
 * The row shape the list renders — the client-side projection of contract
 * `Note` that organize needs. `title` is UGC, `updatedAt` is ISO 8601, and
 * `corpusOwnership` is only rendered when the server sends it.
 */
export type OrganizeNote = {
  id: string;
  title: string;
  updatedAt: string;
  corpusOwnership?: "sample" | "mine";
};

/** Props a link component must accept to be injected into the list. */
export type OrganizeLinkProps = {
  href: string;
  className?: string;
  children?: ReactNode;
};

export type OrganizeLink = ComponentType<OrganizeLinkProps>;

function AnchorLink({ href, className, children }: OrganizeLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

const DefaultLink: OrganizeLink = AnchorLink;

/**
 * Format `Note.updatedAt` for the meta line.
 *
 * `lang` comes from the single locale source (`apps/web/app/locale.ts`) — the
 * block does not hardcode a locale. An unparseable value is returned verbatim
 * rather than replaced by a fake date: the honest failure is showing what the
 * server sent.
 */
export function formatUpdatedAt(
  iso: string,
  options: { lang?: string; timeZone?: string } = {},
): string {
  const { lang = "en", timeZone } = options;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone }).format(
    date,
  );
}

export type NoteListProps = {
  notes: readonly OrganizeNote[];
  /**
   * Route for one note. The app owns routing (`@omnidoc/ui` has no routes), so
   * it maps a note to its capture-route href here.
   */
  hrefForNote: (note: OrganizeNote) => string;
  /** "Load more" target: the URL with the server's next cursor appended. */
  loadMoreHref?: string;
  /** Back to the newest page, offered only when older pages are on screen. */
  firstPageHref?: string;
  /** BCP-47 tag for the timestamp label; from the single locale source. */
  lang?: string;
  linkComponent?: OrganizeLink;
  paginationLinkComponent?: OrganizeLink;
  className?: string;
};

export function NoteList({
  notes,
  hrefForNote,
  loadMoreHref,
  firstPageHref,
  lang = "en",
  linkComponent: Link = DefaultLink,
  paginationLinkComponent: PaginationLink = DefaultLink,
  className,
}: NoteListProps) {
  const hasPagination = Boolean(loadMoreHref || firstPageHref);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/*
        `role="list"` is explicit: the shared Tailwind reset removes list
        markers, and Safari drops list semantics when `list-style` is none.
      */}
      <ul role="list" className="divide-y divide-border border-y border-border">
        {notes.map((note) => (
          <NoteListRow
            key={note.id}
            note={note}
            href={hrefForNote(note)}
            lang={lang}
            linkComponent={Link}
          />
        ))}
      </ul>
      {hasPagination && (
        <div className="flex flex-wrap items-center gap-3">
          {loadMoreHref && (
            <PaginationLink
              href={loadMoreHref}
              className={buttonVariants({ variant: "outline" })}
            >
              Load more
            </PaginationLink>
          )}
          {firstPageHref && (
            <PaginationLink
              href={firstPageHref}
              className="rounded-sm text-sm text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              First page
            </PaginationLink>
          )}
        </div>
      )}
    </div>
  );
}

function NoteListRow({
  note,
  href,
  lang,
  linkComponent: Link,
}: {
  note: OrganizeNote;
  href: string;
  lang: string;
  linkComponent: OrganizeLink;
}) {
  const title = note.title.trim();

  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="flex min-w-0 flex-col gap-1 rounded-lg px-3 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="block min-w-0 truncate text-sm font-medium text-foreground">
          <bdi>{title.length > 0 ? title : "Untitled"}</bdi>
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>
            Updated{" "}
            <time dateTime={note.updatedAt}>
              {formatUpdatedAt(note.updatedAt, { lang })}
            </time>
          </span>
          {note.corpusOwnership === "sample" && (
            <Badge variant="outline">Sample</Badge>
          )}
        </span>
      </Link>
    </li>
  );
}

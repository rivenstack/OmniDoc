import { IconExternalLink } from "@tabler/icons-react";
import type { Citation } from "@omnidoc/contracts";
import { Badge } from "../components/badge";
import { cn } from "../lib/utils";
import { Markdown } from "../markdown";
import { formatUpdatedAt } from "../organize";
import { DefaultAskLink, type AskLink } from "./ask-link";

/**
 * Ask block — `AskCitations`, the passage-level citation list.
 *
 * Every citation here is the **server's payload** (`architecture.md` §4,
 * `docs/api/ask-sse.md`): note id, version id, chunk id, offsets, preview, and
 * an optional updated time and corpus label. The client renders them and never
 * builds one — no citation the client did not receive, and no citation merged
 * into a different note.
 *
 * `@user` chose **inline numbered chips with an expandable passage**
 * (2026-10-12). The look is quiet (no cards): a numbered disclosure per
 * citation. Behaviour that is not a look choice:
 *
 * - **Each chip is a native `<details>`/`<summary>`.** It expands with the
 *   keyboard and needs no JavaScript and no client state, so citation inspection
 *   works identically for mouse and keyboard
 *   (`quality/ui-qa-checklist.md` §1.5) and survives before hydration.
 * - **The accessible name is "Citation N", not "N"** (§2.1): a bare number tells
 *   a screen reader nothing about what the control is.
 * - **The preview renders through the sanitized `Markdown` block** (§6.6): a
 *   preview can contain code, URLs, or tables from a note, so it is untrusted
 *   content and must not be able to execute.
 * - **The preview and any identifier are `bdi`-isolated and wrap** (§6.5, §5.9):
 *   a mixed-direction or very long passage must not re-order the row or widen the
 *   page at ~390px.
 * - **The last-updated cue is shown when the server sent one** (§5.10): a stale
 *   passage is flagged rather than silently over-claimed as fresh.
 * - **The `Sample` label is real data** (`system-ux.md` §1): it renders only when
 *   the server says the cited passage came from the sample corpus.
 *
 * The "open note" link is injected: `@omnidoc/ui` owns no routes, so the app maps
 * a citation to `/notes/[noteId]`.
 */
export type AskCitationsProps = {
  citations: readonly Citation[];
  /** Route for one citation. The app owns routing. */
  hrefForCitation: (citation: Citation) => string;
  /** Group heading. Kept visible so the list has a name, not just a role. */
  label?: string;
  /** BCP-47 tag for the timestamp cue; from the single locale source. */
  lang?: string;
  linkComponent?: AskLink;
  className?: string;
};

/** Stable identity of a citation — note + passage, never merged across notes. */
export function citationKey(citation: Citation): string {
  const { startOffset, endOffset } = citation.anchor;
  return `${citation.noteId}\u0000${citation.versionId}\u0000${citation.chunkId}\u0000${startOffset}\u0000${endOffset}`;
}

export function AskCitations({
  citations,
  hrefForCitation,
  label = "Sources",
  lang = "en",
  linkComponent: Link = DefaultAskLink,
  className,
}: AskCitationsProps) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
      {/* `role="list"` is explicit: the Tailwind reset removes list markers, and
          Safari drops list semantics when `list-style` is none. */}
      <ul role="list" className="flex min-w-0 flex-col gap-2">
        {citations.map((citation, index) => (
          <AskCitationItem
            key={citationKey(citation)}
            citation={citation}
            ordinal={index + 1}
            href={hrefForCitation(citation)}
            lang={lang}
            linkComponent={Link}
          />
        ))}
      </ul>
    </div>
  );
}

function AskCitationItem({
  citation,
  ordinal,
  href,
  lang,
  linkComponent: Link,
}: {
  citation: Citation;
  ordinal: number;
  href: string;
  lang: string;
  linkComponent: AskLink;
}) {
  const preview = citation.preview;
  const blockId = citation.anchor.blockId;

  return (
    <li className="min-w-0">
      <details className="group/citation min-w-0 rounded-lg border border-border open:bg-muted/30">
        <summary
          // The real accessible name: a bare number names nothing (§2.1), and
          // the preview is only a sighted-user affordance — a screen reader
          // reads the passage from the expanded content.
          aria-label={`Citation ${ordinal}`}
          className={cn(
            "flex min-w-0 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-foreground outline-none",
            "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-medium tabular-nums text-muted-foreground"
          >
            {ordinal}
          </span>
          <span
            aria-hidden="true"
            className="block min-w-0 flex-1 truncate text-xs text-muted-foreground"
          >
            <bdi>{firstLine(preview)}</bdi>
          </span>
          {citation.corpusOwnership === "sample" && (
            <Badge variant="outline">Sample</Badge>
          )}
        </summary>
        <div className="flex min-w-0 flex-col gap-2 border-t border-border px-3 py-2">
          {/* Untrusted passage text → the one sanitized render path (§6.6). */}
          <Markdown
            source={preview}
            className="wrap-anywhere text-sm text-foreground"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {citation.updatedAt && (
              <span>
                Updated{" "}
                <time dateTime={citation.updatedAt}>
                  {formatUpdatedAt(citation.updatedAt, { lang })}
                </time>
              </span>
            )}
            <span className="min-w-0 break-all">
              <bdi>{citation.noteId}</bdi>
              {blockId ? <bdi>{` · ${blockId}`}</bdi> : null}
            </span>
          </div>
          <Link
            href={href}
            className="inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconExternalLink aria-hidden="true" className="size-4 shrink-0" />
            Open note
          </Link>
        </div>
      </details>
    </li>
  );
}

/** A short, single-line label for the collapsed chip. Never used as the answer. */
function firstLine(preview: string): string {
  const line = preview.split(/\r?\n/).find((value) => value.trim().length > 0);
  const text = (line ?? preview).trim();
  return text.length > 0 ? text : "Passage";
}

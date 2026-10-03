import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import { Markdown } from "tiptap-markdown";
import { normalizeMarkdownTables } from "../markdown/table";
import type { ProseMirrorDocument } from "./document";

/**
 * Headless TipTap editor configured with StarterKit, Table extensions, and Markdown extension
 * for headless bidirectional conversions between ProseMirror JSON and Markdown text.
 */
function createConverterEditor(): Editor {
  return new Editor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
  });
}

let converterInstance: Editor | null = null;

/**
 * These converters are **browser-only**, and the failure mode is why.
 *
 * `tiptap-markdown` parses the editor's initial content through a `DOMParser`
 * (`elementFromString`) from its `onBeforeCreate` hook, so constructing the
 * converter editor needs a DOM. Next renders client components on the server
 * first, where a DOM-less construction is a hard `window is not defined`
 * crash that takes the whole route down (HTTP 500) — not a caught error.
 *
 * Throwing here fails loudly instead of returning an empty string: a caller
 * that silently got `""` from a server render would persist an empty note body.
 * Derive markdown on the client, after mount (`CaptureSurface` does, in a
 * `useEffect` — not in a `useState` initialiser, which also runs while the
 * server renders).
 */
function getConverter(): Editor {
  if (typeof window === "undefined") {
    throw new Error(
      "markdown-bridge: TipTap's markdown parser needs a DOM; derive markdown on the client only.",
    );
  }
  if (!converterInstance) {
    converterInstance = createConverterEditor();
  }
  return converterInstance;
}

/** The only node fields this module walks. The document is editor-owned. */
type DocumentNode = {
  marks?: { type?: string; attrs?: { href?: unknown } }[];
  content?: unknown;
  [key: string]: unknown;
};

/**
 * Drop `link` marks that have no target.
 *
 * A stored body has to be renderable: `note.bodyJson` comes from the server and
 * this module projects it. TipTap's `Link` mark declares `href` with a `null`
 * default, so a body can hold `{ "type": "link" }` with no target, and
 * `prosemirror-markdown`'s link serializer assumes a string
 * (`mark.attrs.href.replace(...)`) — serializing it throws and, because the
 * conversion runs while rendering, takes the whole route down.
 *
 * Markdown has no syntax for a link without a target, so the mark is dropped
 * and its text kept: the text is the content, and there was never a target to
 * lose. Anything else — a real target, an empty one — is left untouched.
 */
function withoutTargetlessLinks(doc: ProseMirrorDocument): ProseMirrorDocument {
  const cleanNode = (value: unknown): unknown => {
    if (typeof value !== "object" || value === null) {
      return value;
    }
    const node = value as DocumentNode;
    const next: DocumentNode = { ...node };

    if (Array.isArray(node.marks)) {
      const marks = node.marks.filter(
        (mark) => mark?.type !== "link" || typeof mark.attrs?.href === "string",
      );
      if (marks.length > 0) {
        next.marks = marks;
      } else {
        delete next.marks;
      }
    }

    if (Array.isArray(node.content)) {
      next.content = node.content.map(cleanNode);
    }

    return next;
  };

  return cleanNode(doc) as ProseMirrorDocument;
}

/**
 * A private-use codepoint that carries a literal `|` through the serializer.
 *
 * `prosemirror-markdown` writes a table cell's text verbatim, so a cell holding
 * `a | b` is serialized as `| a | b |` — three cells where the table has two,
 * which is a different table the next time it is read. The `|` is swapped for
 * this sentinel before serializing and swapped back as `\|` after, which is the
 * GFM spelling for a literal pipe in a cell and what every reader here already
 * understands (`markdown/table.ts`). It never reaches storage: it exists only
 * for the duration of one `getMarkdown()` call.
 */
const PIPE_SENTINEL = "\uE000";

/**
 * Hide literal pipes inside table cells from the markdown serializer.
 *
 * Only cell text is touched — a `|` in a paragraph is ordinary punctuation.
 */
function hideTablePipes(doc: ProseMirrorDocument): ProseMirrorDocument {
  const walk = (value: unknown, insideCell: boolean): unknown => {
    if (typeof value !== "object" || value === null) {
      return value;
    }
    const node = value as DocumentNode & { text?: unknown };
    const isCell = node.type === "tableCell" || node.type === "tableHeader";
    const next: DocumentNode = { ...node };

    if (insideCell && typeof node.text === "string") {
      next.text = node.text.replace(/\|/g, PIPE_SENTINEL);
    }
    if (Array.isArray(node.content)) {
      next.content = node.content.map((child) =>
        walk(child, insideCell || isCell),
      );
    }

    return next;
  };

  return walk(doc, false) as ProseMirrorDocument;
}

/**
 * Convert a ProseMirror document JSON into clean Markdown string.
 */
export function proseMirrorToMarkdown(doc: ProseMirrorDocument): string {
  if (!doc || !doc.content || (Array.isArray(doc.content) && doc.content.length === 0)) {
    return "";
  }
  const editor = getConverter();
  editor.commands.setContent(hideTablePipes(withoutTargetlessLinks(doc)), {
    emitUpdate: false,
  });
  const storage = editor.storage as unknown as { markdown?: { getMarkdown: () => string } };
  const markdown = storage.markdown ? storage.markdown.getMarkdown().trim() : "";
  return markdown.replaceAll(PIPE_SENTINEL, "\\|");
}

/**
 * Convert a Markdown string into a ProseMirror document JSON.
 *
 * Tables are normalised first. The editor's Markdown mode is deliberately
 * lenient about a delimiter row that is narrower than its header — that is what
 * lets `| Head 1 | Head 2 | Head 3 |` + `| --- |` render as a table while it is
 * being typed — but `tiptap-markdown` follows GFM strictly and would read that
 * block as a paragraph. Padding it here keeps the two readers agreeing, so a
 * lenient table in the editor is still a table after a save and reload.
 */
export function markdownToProseMirror(markdown: string): ProseMirrorDocument {
  const source = normalizeMarkdownTables(markdown);
  if (!source || source.trim() === "") {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }
  const editor = getConverter();
  editor.commands.setContent(source, { emitUpdate: false });
  return editor.getJSON() as ProseMirrorDocument;
}

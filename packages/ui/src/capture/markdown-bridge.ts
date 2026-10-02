import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import { Markdown } from "tiptap-markdown";
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
 * Convert a ProseMirror document JSON into clean Markdown string.
 */
export function proseMirrorToMarkdown(doc: ProseMirrorDocument): string {
  if (!doc || !doc.content || (Array.isArray(doc.content) && doc.content.length === 0)) {
    return "";
  }
  const editor = getConverter();
  editor.commands.setContent(withoutTargetlessLinks(doc), { emitUpdate: false });
  const storage = editor.storage as unknown as { markdown?: { getMarkdown: () => string } };
  return storage.markdown ? storage.markdown.getMarkdown().trim() : "";
}

/**
 * Convert a Markdown string into a ProseMirror document JSON.
 */
export function markdownToProseMirror(markdown: string): ProseMirrorDocument {
  if (!markdown || markdown.trim() === "") {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }
  const editor = getConverter();
  editor.commands.setContent(markdown, { emitUpdate: false });
  return editor.getJSON() as ProseMirrorDocument;
}

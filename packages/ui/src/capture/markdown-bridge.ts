import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { ProseMirrorDocument } from "./document";

/**
 * Headless TipTap editor configured with StarterKit and Markdown extension
 * for headless bidirectional conversions between ProseMirror JSON and Markdown text.
 */
function createConverterEditor(): Editor {
  return new Editor({
    extensions: [
      StarterKit,
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

function getConverter(): Editor {
  if (!converterInstance) {
    converterInstance = createConverterEditor();
  }
  return converterInstance;
}

/**
 * Convert a ProseMirror document JSON into clean Markdown string.
 */
export function proseMirrorToMarkdown(doc: ProseMirrorDocument): string {
  if (!doc || !doc.content || (Array.isArray(doc.content) && doc.content.length === 0)) {
    return "";
  }
  const editor = getConverter();
  editor.commands.setContent(doc, { emitUpdate: false });
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

import type { components } from "@omnidoc/contracts";

/**
 * The note body type, taken straight from the generated contract.
 *
 * `ProseMirrorDocument` is `additionalProperties: true` in
 * `docs/api/openapi.yaml` because the document's structure is editor-owned —
 * which is also why nothing here tries to model ProseMirror node types. The
 * contract says "a JSON document"; only the editor gets to decide what is in it
 * (ADR-0001 §2).
 */
export type ProseMirrorDocument = components["schemas"]["ProseMirrorDocument"];

/**
 * An empty ProseMirror document.
 *
 * Spelled the way the editor spells it, so a brand-new note's stored body is the
 * same document an untouched editor holds. A second spelling of "empty" would
 * make `isBlankDraft` lie about some notes.
 */
export const EMPTY_DOCUMENT: ProseMirrorDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/**
 * Is this draft empty enough that saving it would invent a note?
 *
 * A note is creatable with a title and body only, but "New note lands directly
 * in the editor" must not mean "New note lands in the database". Autosave stays
 * quiet until there is content, so opening the editor and changing your mind
 * leaves no trace.
 *
 * Only the shapes that genuinely hold no content count: no title, and a body
 * that is either nothing or exactly one empty paragraph. A second empty
 * paragraph is content — the user pressed Enter, and throwing that away would
 * make the editor quietly lose a deliberate keystroke.
 */
export function isBlankDraft(
  title: string,
  body: ProseMirrorDocument | undefined,
): boolean {
  if (title.trim() !== "") {
    return false;
  }
  if (!body) {
    return true;
  }
  const content = (body as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) {
    return true;
  }
  if (content.length > 1) {
    return false;
  }
  const [only] = content as unknown[];
  return (
    typeof only === "object" &&
    only !== null &&
    (only as { type?: unknown }).type === "paragraph" &&
    !Array.isArray((only as { content?: unknown }).content)
  );
}

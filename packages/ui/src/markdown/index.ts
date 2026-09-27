/**
 * Markdown barrel — the sanitized render path.
 *
 * One render path, one schema (`sanitize-schema.ts`), one block (`markdown.tsx`)
 * for the markdown projection of the note SoT (ADR-0001 §2). Note content is
 * untrusted UGC, so sanitization is an architecture control, not a rendering
 * preference (`architecture.md` §security; ADR-0003 §4).
 *
 * The schema is exported so a test or a Phase Check reviewer can assert the
 * control directly rather than only inferring it from rendered output.
 */
export { Markdown, type MarkdownProps } from "./markdown";
export { markdownSanitizeSchema } from "./sanitize-schema";

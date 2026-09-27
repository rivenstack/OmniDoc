import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/utils";
import { markdownSanitizeSchema } from "./sanitize-schema";

/**
 * Element overrides for the sanitized render path.
 *
 * Each override receives React-Markdown's `node` (the hast node) alongside the
 * element's props. `node` is not a DOM attribute — spreading it onto an element
 * would leak a non-DOM prop — so it is dropped here. `children` is pulled out
 * only where the override needs to wrap it.
 *
 * These overrides are behaviour and accessibility, not styling: they add no
 * typography, colour, or spacing.
 */
const components: Components = {
  a({ node: _node, children, ...props }) {
    return (
      <a {...props}>
        {/*
          Logical isolation, not decoration. Link text frequently holds an
          identifier, URL, or mixed-direction fragment, which must not be able
          to re-order the text around it (`architecture.md` §Directionality:
          `bdi` or equivalent for identifiers, code tokens, URLs, UGC).
        */}
        <bdi>{children}</bdi>
      </a>
    );
  },
  code({ node: _node, children, ...props }) {
    return (
      <code {...props}>
        {/* Code tokens are the same BiDi hazard as identifiers — a token must
            not visually re-order its neighbours. */}
        <bdi>{children}</bdi>
      </code>
    );
  },
  pre({ node: _node, className, ...props }) {
    return (
      // A code block that overflows must be scrollable **by keyboard**, or the
      // overflowing content is unreachable without a mouse
      // (`ui-qa-checklist.md` §6.1/§6.3).
      <pre
        {...props}
        tabIndex={0}
        className={cn("overflow-x-auto", className)}
      />
    );
  },
  table({ node: _node, ...props }) {
    return (
      // A wide table scrolls inside its own container so a column is never
      // clipped and the page never widens (`ui-qa-checklist.md` §6.4). The
      // container is focusable and named because a scrollable region that
      // cannot be reached by keyboard, or has no accessible name, hides content
      // from exactly the users who cannot scroll it by eye.
      <div
        data-slot="markdown-table-scroll"
        role="group"
        aria-label="Table"
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table {...props} />
      </div>
    );
  },
};

export type MarkdownProps = {
  /**
   * Markdown source — the canonical serializer's projection of the note SoT
   * (ADR-0001 §2). A plain string, never a document model: this block never
   * parses markdown back into storage, and never reads ProseMirror JSON.
   */
  source: string;
  /**
   * Typographic presentation is deliberately **not** decided here. The
   * look of answer prose belongs to the surface that consumes this block, so a
   * consumer passes its own classes rather than this block inventing a scale.
   */
  className?: string;
};

/**
 * Rich content block — `Markdown`.
 *
 * The single sanitized markdown render path (`architecture.md` §security,
 * ADR-0003 §4). Every markdown-rendering surface — note and citation previews,
 * answer prose — must route through this block instead of adding a second
 * pipeline: one place where sanitization is enforced, one place where it is
 * tested.
 *
 * Behaviour, not look. It applies no typography, colour, or spacing of its own
 * (`@user` decision 2026-09-27: stock tokens, no visual work in this slice). The
 * two things it does enforce are structural and accessibility-relevant:
 * keyboard-reachable overflow for code and tables, and `bdi` isolation for code
 * tokens and link text.
 */
export function Markdown({ source, className }: MarkdownProps) {
  return (
    <div data-slot="markdown" className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSanitizeSchema]]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

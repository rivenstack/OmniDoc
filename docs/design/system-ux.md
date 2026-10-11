# System UX

**Owner:** `/designer`, with `@user` choices
**Status:** live contract (2026-10-10)
**Changes:** rare. Offer options. The user chooses. Then edit this file.

This is the only design document other systems must honor. It records
behavior and information that would force an API, database, port, or
product-invariant change.

It does not specify layout, position, motion, color, spacing, component
choice, or code.

D-01 files in this folder (tokens, shell geometry, journey layouts,
component inventory) are history. They are not implementation authority.
The living plan is [`now.md`](./now.md).

---

## 1. What must exist (not where it sits)

These are information and actions. Placement is flexible and belongs in
the build, not here.

| Item | Why it is a system contract |
| --- | --- |
| New note | Capture must be possible without choosing a folder or tag first |
| Editor modes | Three editing modes for notes — Normal (WYSIWYG rich text), Markdown (Obsidian-style live preview), Text (raw markdown source) — plus a separate lock control that makes any mode read-only. The modes map to Obsidian's editing model: Markdown is its Live Preview, Text is its source mode, and the lock is its read-only state. Reading is a render path, not a mode |
| Notes | All notes in the workspace |
| Search | Its own operation, not Ask |
| Ask | Its own operation, not Search |
| Workspace switcher | A selector. The server decides membership |
| Search entry | A way to start Search. Width and shortcut are not specified |
| Runtime mode | Mock, live operator-funded, or live customer key must be representable. No silent switch |
| Corpus ownership | Sample vs the user's own notes is real data, not decoration |
| Citation inspection | An answer can open the passage it cites. Placement is not specified |
| Usage | May be unavailable. Never fabricate cost. Never claim zero retention |

Rearranging these is allowed. Dropping one is a contract change: offer
the option, wait for the user, then edit this table.

**Collections (folders/tags) — dropped 2026-10-12 (`@user`).** Inbox and
Collections left this table: with no collections/folders contract there is
nothing to file, so an "unfiled" Inbox and an "all notes" Notes were the same
list under two names. The shell carries one note list (Notes). The capability is
kept for a later contract decision as `BL-26`
([`../planning/feature-backlog.md`](../planning/feature-backlog.md)); it is not
a current item here.

## 2. Behaviors that bind other systems

### Capture and notes

- A note can be created with a title and body only.
- **The editing surface behaves like Obsidian's editor.** A user who already
  knows Obsidian must be able to write, format, and navigate without
  retraining: the same markdown constructs render the same way, the same
  keystrokes do the same things, and syntax is editable on focus and previewed
  inline when unfocused. Behavior parity is derived from shipped-artifact
  analysis of Obsidian (the F-15 plan §0.1 records the evidence); we reproduce
  **behavior** using permissively-licensed building blocks only — no Obsidian
  code, CSS, or assets are copied.
- The note editing surface supports three modes, and every mode renders live:
  - **Normal**: Visual rich text editor (TipTap) with sticky toolbar, bubble menu, and native markdown input rules. Best for standard users.
  - **Markdown**: Obsidian-style inline live preview (CodeMirror 6) with syntax folding/decorations. Syntax tokens are editable on focus and previewed inline when unfocused. Best for power users.
  - **Text**: Pure raw markdown source editor (CodeMirror 6 / monospace) with no preview. The toolbar acts as a shortcut assistant inserting markdown syntax.
- A separate **lock** control beside the mode menu makes any mode read-only (toolbar and selection bubble hidden; title and import disabled). Viewing is not a mode: the sanitized read-only projection (`packages/ui/src/markdown/`) remains a render path — fast, non-editable, guarded against XSS — not a capture mode.
- **One formatting surface.** The same formatting affordances are available and behave identically in Normal, Markdown, and Text modes. No command is mouse-only.
- ProseMirror JSON remains the durable source of truth in the database (ADR-0001 §2). Any edit in Text or Markdown mode is synchronized bidirectionally with the ProseMirror document model without data loss.
- **The markdown construct set is a contract, not an implementation detail.** These constructs must round-trip losslessly across the editor, the JSON ↔ markdown bridge, and the render path: headings, bold / italic / strikethrough, inline code, fenced code, blockquotes, bullet / ordered / task lists, horizontal rules, GFM tables, links, images, footnotes, callouts, `==highlight==`, and `%%comments%%`.
- **Projection is not source of truth.** Callouts, `==highlight==`, and `%%comments%%` render in Markdown mode; Normal mode keeps the literal source. Round-trips stay lossless as text, so there is no SoT change and no data loss — the modes are not pixel-identical for these constructs.
- `[[wikilink]]` syntax is **plain text in v1** — no link resolution, no autocomplete, and no unresolved-link styling. Recorded 2026-10-10 (`@user`): out of scope until the backlog item is promoted. The note source of truth (ProseMirror JSON) and `docs/api/openapi.yaml` are unchanged. If it is promoted later, the representation choice — a dedicated `wikilink` mark carrying `{ targetId, targetTitle }` (Obsidian-faithful; needs a TipTap mark plus `tiptap-markdown` serializer/parser work) or a plain internal `omni://` link mark (cheapest; breaks on rename) — is re-opened then, as a contract-level decision rather than a UI choice.
- Paste and file import are first-class. Each imported file has its own
  indexing status: pending, indexing, ready, partial, or failed.
- Saves are versioned. A conflict is visible. The client does not pick
  the winning version.
- An AI answer is not written into the corpus unless the user explicitly
  saves it. That note is marked AI-generated.
- Indexing in progress is visible. Search and Ask must not present an
  incomplete index as complete.

### Search and Ask

- Search and Ask are different ports. The UI does not call providers.
- Snippets and citations come from the server. The client does not invent
  hits, and does not attach a citation the server did not return.
- No citation is better than a mismatched citation.
- Sample vs Mine is a real search filter, not only a label.
- Ask outcomes `supported`, `partial`, `no_supported_answer`, `conflict`,
  and `refused_policy` are successful responses, not errors.
- Transport failures (timeout, unavailable, quota) are a different class.
  The product must be able to tell them apart. Appearance is not specified
  here.
- Citation identity is the payload in `architecture.md` §4 (note, version,
  chunk, offsets, preview, updated time). This file does not restate the
  schema.

Search-as-you-type is the current preference. It is not a locked
contract and can change later without a schema change.

### Dual mode and keys

- Three runtime modes. No silent fallback from one to another.
- A customer key is pasted, verified, and then not shown in full again.
  Only a masked prefix may be displayed.
- Connecting a key is optional on the first-run mock path. Live AI is not
  required to use the sample.

### Tenancy

- Workspace id selects. It does not authorize.
- A forbidden workspace is a generic denial. Do not reveal whether it
  exists.
- The product is honest at one or a few members. Do not require fake org
  charts, seat billing, or SSO data.

### Locale

- Shipping locale is `en` (LTR). RTL is deferred, not closed.
- Direction comes from one locale source. That is an implementer
  discipline, not a layout spec.

## 3. Explicitly out of this file

- Pixel layout, sidebar width, citation rail versus sheet
- Motion, easing, skeletons
- Color, type, radius, elevation
- Which shadcn component to copy
- Sentence-level copy, except where the sentence is the security contract
  (generic forbidden denial; no zero-retention claim)

## 4. How to change a contract

1. State the options and what each forces (API, schema, port, or invariant).
2. Stop. The user chooses.
3. Edit this file and [`now.md`](./now.md). Do not open a parallel spec.

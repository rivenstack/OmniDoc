# Now — UI plan

**Living page.** Edit this during the build. Keep it short.
**Updated:** 2026-10-11

Choose here. Do not wait for a finished mock to review.

## Authority

| Question | Read |
| --- | --- |
| What must the API and data honor? | [`system-ux.md`](./system-ux.md) |
| What are we building now? | This file |
| How should the editor behave? | **Obsidian.** Shipped-artifact analysis is the behavior source — the [F-15 plan](../plans/2026-10-10_104547-obsidian-parity-editor-redesign.md) §0.1 records the REA evidence |
| How should it look? | **Mintlify** design language — values in `packages/ui/src/styles/tokens.css` |
| Old visual spec | Other files in `docs/design/` — history only (D-01) |

## Why the editor plan was rewritten (2026-10-10)

The first Obsidian-*like* editor (F-13, then F-14) was built from memory and
review passes. It delivered the modes, the lock, and tables, but it accumulated
bugs: extensions were assembled inline and rebuilt on every mode change, one
1,722-line module mixed live preview with table widgets and tools, two toolbars
drifted apart, and the table preview rescanned the whole document on every
keystroke.

**F-15 rebuilds it on evidence instead of memory.** Obsidian 1.14.4 was
analyzed statically from its shipped bundle with the reverse-engineering
tooling (evidence `ev_c7f5023c…`, authority `shipped-artifact`), so each
behavior — the extension / `Compartment` model, the live-preview `StateField` +
`ViewPlugin` pair, `atomicRanges`, the settings that shape editing — is
reproduced deliberately with modern, permissively-licensed building blocks on
current library versions. No Obsidian code, CSS, or assets are copied.

F-15 **supersedes-in-part the CM6 internals** delivered by F-13/F-14. Their
user-facing behavior — three modes + lock, GFM tables, live-preview folding —
is preserved, and the existing `cm-editor.test.tsx` / `table-preview.test.tsx`
suites are the regression net.

## Stable vs flexible

| Stable (change rarely; you choose) | Flexible (change while building) |
| --- | --- |
| Destinations and header items in `system-ux.md` | Where those items sit |
| Search and Ask as different operations | Shortcuts, result layout, motion |
| Answer states, citation identity, no silent mode fallback | Color, density, component composition |
| Sample vs Mine; no zero-retention claim | How those labels are drawn |
| shadcn/Base UI as the component source (ADR-0003) | Which primitive, until a screen needs one |
| Token **roles** (`--primary` = primary action, `--muted` = muted surface) | Token **values** — swapping them re-skins the app without touching screens |
| **Obsidian-parity editing behavior** (from REA evidence) | Which library or primitive implements a behavior, until a phase needs one |

The design language is a token layer, not a hardcoded spec. A new look
(Google-like, Anthropic-like, whatever you pick from references) is a
retune of `packages/ui/src/styles/tokens.css` values, plus density or
radius choices. Components are copied-in shadcn blocks and do not move.

## Current slice

**F-06 retrieve — live 2026-10-11.**

Search is its own operation, separate from Ask (`system-ux.md` §1/§2). The
slice: one search port over the frozen S-02 search contract plus the `/search`
screen — server snippets rendered as text (no client-side highlighting), a real
Sample/Mine filter (`corpusOwnership`), an honest degraded/incomplete notice,
empty / loading / denied / unavailable states, and a quiet pivot to Ask.
Ticket: [`lane-frontend.md`](../handoffs/active/lane-frontend.md) (opened
2026-10-11; dependency-ready — S-02 search + B-07 completed).

**F-15 — Obsidian-parity capture editor redesign (governance complete;
implementation deferred).**

Plan of record:
[`docs/plans/2026-10-10_104547-obsidian-parity-editor-redesign.md`](../plans/2026-10-10_104547-obsidian-parity-editor-redesign.md).
Governance tasks G-1…G-4 completed 2026-10-10 (editor pins, wikilink deferral,
F-13/F-14 reconciliation, mode-contract sync) and are merged to `develop`.
Phases A–H have **not** started: the ready handoff was archived
superseded-before-execution (2026-10-11) and F-15 stays `listed` for Commander
resequencing — do not start editor phases from the F-06 head.

One markdown editing engine — an extension factory parameterised by an
`EditorSettings` object plus `Compartment`s, and a live-preview `StateField` /
viewport-scoped `ViewPlugin` pair with `atomicRanges` — driving **one
formatting surface**: a command registry that both the TipTap and CodeMirror
adapters implement, so the same affordances work identically in Normal,
Markdown, and Text. Phases A–H land one bite-sized task per commit, each green
before the next begins.

**Preserved, not rebuilt:** three capture modes + lock, GFM tables,
live-preview folding, the JSON ↔ markdown bridge, and ProseMirror JSON as the
durable source of truth.

**Gated (not in this slice):** `[[wikilink]]` autocomplete (literal text in v1),
vim mode, and math / mermaid widgets — each needs an explicit `@user` yes plus
a ledger pin before any install.

## Delivered slices

Status detail lives in [`context.md`](../../context.md) and the handoffs. This
table is the map, not the archive.

| Slice | Landed | What it left behind |
| --- | --- | --- |
| F-01 tokens + primitives | 2026-09-23 | Mintlify token layer, Tabler icons, shadcn v4 `base-nova` sources, `/kit` |
| F-02 app shell | 2026-09-23 | Sidebar, slim top bar, mobile tab bar, command palette, skip link |
| F-03 auth / session UI | 2026-09-24 | Identity port, three-state session entry, sign-in block |
| F-04 capture | 2026-09-25 | Notes port, save cycle, import status, capture blocks |
| F-05 organize | 2026-10-11 | Inbox/Notes server-first lists with URL-based server cursors; honest Collections gap statement; quiet rows (no cards) |
| F-12 markdown render | 2026-09-27 | `packages/ui/src/markdown/` sanitized render path |
| F-13 multi-mode capture | 2026-10-01 | Three modes + lock, CodeMirror live preview, JSON ↔ markdown bridge |
| F-14 markdown & editor tables | 2026-10-02 | GFM tables across modes, shared table grammar |

## Open choices

- **F-05 (organize): closed 2026-10-11.** `@user` chose the row direction —
  *quiet Mintlify rows* (title + meta line, hairline dividers, no cards) — from
  the offered directions. Bound and **not** choices, built without asking: the
  four list states on the existing `Empty`/`Skeleton` patterns with one primary
  `New note` CTA, the `Load more` outline pill plus muted `First page` link,
  list semantics, keyboard-operable link rows, `bdi`-isolated titles,
  URL-based cursor pagination, and the generic denial copy. The Collections
  sub-slice is **not** a look decision — it is blocked on the S-02 contract and
  renders as the honest gap statement.
- **F-07 answer-prose look:** no reference yet. F-12 shipped behaviour-only.
- **Sample vs Mine:** `Workspace` carries no sample marker — F-09 plus a
  contract change.
- **Identity-unavailable entry screen:** built from the stock `Empty`
  primitive; no reference covers it, so it is flagged rather than presented as
  designed.
- **Editor settings persistence — resolved 2026-10-10:** prop / component
  state only in v1; no server or localStorage. Revisit only with a concrete
  need.

## Rules for anyone editing this page

- Record a decision only after the user picks it. Move it from Open
  choices into the log below.
- Do not paste layouts, token values, or component recipes here.
- Do not harden UI details a reference has not covered.
- If a change belongs in `system-ux.md`, edit that file in the same pass.
- The F-01→F-11 sequence is the plan of record; the D-01 specs behind
  those IDs are not.
- **Editor behavior comes from REA evidence, not memory.** A parity claim
  cites the F-15 plan or the evidence bundle; a preference is not a parity
  claim.

## Decisions log

> Entries from 2026-10-01 and 2026-10-02 describe the first Obsidian-*like*
> editor. They are **superseded-in-part** by F-15 (2026-10-10): the modes, the
> lock, and the tables they delivered still stand, but the CM6 internals
> beneath them are rebuilt. Full detail for compressed rows lives in git
> history and `docs/memory/implementer.md`.

| Date | Choice |
| --- | --- |
| 2026-09-22 | D-01 visuals are historical. System contracts live in `system-ux.md`. |
| 2026-09-22 | This file is the visible plan — not a second spec, and not the backend lane. |
| 2026-09-22 | Search: as-you-type is the current preference, not a locked contract. Can change later without a schema change. |
| 2026-09-22 | Look is stock shadcn until references are supplied and chosen. No language doc yet. |
| 2026-09-22 | Kit landed at `/kit` (a page, not Storybook — Storybook 10 stays a later gap). |
| 2026-09-22 | Design language clarified: a swappable token layer. A new look retunes `tokens.css` values; components and screens stay. |
| 2026-09-23 | Sequence confirmed: the F-01→F-11 order is the plan of record; the D-01 specs behind those IDs are not. |
| 2026-09-23 | F-02 reopened as the next step. Reference protocol live: the implementer asks for a reference per block and offers options on real choices. |
| 2026-09-23 | **Design language chosen: Mintlify** (from the popular-web-designs references). White canvas, near-black text, brand green accent, pill controls, border-driven depth. Lands as token values + component shape — not a new spec. |
| 2026-09-23 | Icon library: **Tabler** (`@tabler/icons-react` 3.48.0) replaces lucide in both `components.json` files and all components. |
| 2026-09-23 | shadcn config moved to v4 **`base-nova`** (Base UI variants) so `shadcn add` fetches current components; F-01 primitives were re-copied on those sources. |
| 2026-09-23 | New v4 form/empty family added (`Field`/`FieldGroup`/`FieldLabel`/`FieldError`, `InputGroup`, `Empty`); raw `Label`+`Input` layout is no longer the form pattern. |
| 2026-09-23 | `Button` has no `loading` prop (compose `Spinner` + `disabled`, the v4 pattern); `IconButton` keeps the label-by-type guarantee. |
| 2026-09-23 | Fonts: Inter + Geist Mono self-hosted through `next/font` (build-time fetch, no runtime third-party request). The token layer keeps a system fallback stack. |
| 2026-09-23 | A11y-over-template deviations: focus rings are full-opacity `ring-ring` (upstream `/50` fails 3:1 on white), and status/focus colors are darkened until they pass WCAG contrast. |
| 2026-09-23 | Phase-check follow-up: destructive tints retuned and error rings/borders made full-opacity, so destructive/invalid states pass contrast too. |
| 2026-09-23 | Logged deviation: control borders stay whisper-thin (below the 3:1 boundary bar) per the Mintlify look; fields are identified by label + placeholder + a passing focus ring. **User-confirmed 2026-09-23.** |
| 2026-09-23 | No browser in the implementer session: the visual check is handed to `@user` — `/kit` checked in light and dark, result **"looks good"**. The implementer asks rather than infers. |
| 2026-09-23 | **F-02 references chosen by `@user`:** nested/collapsible sidebar; slim utility top bar (search entry, New note, theme toggle, inert F-08 mode slot); bottom mobile tab bar; centered content column; `Command` palette (adds `cmdk`); workspace switcher as a sidebar-top dropdown; Storybook **not** added (Vitest instead). |
| 2026-09-23 | **F-02 shell landed.** Shell blocks live in `packages/ui/src/shell`; app wiring in `apps/web/app/(app)`. Workspace data is a server-layout **placeholder passed as props** (types only, no fetch) — not a fixture authority. |
| 2026-09-23 | Sidebar settled on the upstream **`sidebar-07`** composition (one `Sidebar collapsible="icon"`), adapted to existing semantic roles with **no** `tokens.css` edit; upstream physical utilities normalized to logical (`ps/pe/ms/me`, `text-start/end`). Migration detail: `docs/memory/implementer.md`. |
| 2026-09-23 | **Motion is a dependency, not free:** shadcn v4 overlay classes (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`) only work with `tw-animate-css` imported in the Tailwind entry. |
| 2026-09-23 | **Base UI `nativeButton`:** `Button`/`IconButton` with `render={<Link/>}` must pass `nativeButton={false}` or Base UI warns and drops native semantics. |
| 2026-09-24 | **F-03 identity wiring landed.** Session identity is a server-side port (`apps/web/app/lib/identity/`) over `POST/GET/DELETE /api/v1/session` + `GET /api/v1/workspaces`, typed by `@omnidoc/contracts`. No client auth library; the browser never talks to the API, so no CORS, and Next relays `JSESSIONID` (httpOnly) + `XSRF-TOKEN`. |
| 2026-09-24 | **Signed-in entry has three states, not two** — a correctness rule, not a look: authenticated → shell; rejected session → sign-in (with the requested path remembered); identity service unreachable → an honest "can't confirm" screen. |
| 2026-09-24 | **The account menu shows the contract `actorId`.** `Principal` carries no name or email, and adding one is a contract change — so the F-02 placeholder name was deleted rather than kept alongside it. |
| 2026-09-24 | **A stale workspace preference falls back to the first server-resolved workspace** instead of dead-ending on the generic denial. That denial stays reserved for a selector the *server* refuses (`system-ux.md` §2). |
| 2026-09-24 | **Next 16 file convention:** `middleware.ts` → `proxy.ts` (`export function proxy`), per the framework deprecation. Added to `tsconfig.app.json` so the fast typecheck target covers it. |
| 2026-09-24 | **Sign-in block built from `@user`'s reference.** The pending choice was resolved by a supplied shadcn-style login card, so the block was built rather than guessed. `/sign-in` is a real route. |
| 2026-09-24 | **Unbacked controls render disabled, with a note — `@user`'s explicit choice over omitting them.** Social sign-in, "Remember this device", password recovery and account creation have no endpoint in `docs/api/openapi.yaml`. Enabling any of them is a contract change, not a frontend tweak. |
| 2026-09-24 | **No third-party assets in the sign-in block.** The reference loaded its logo and provider icons from `images.shadcnspace.com`; those became a Tabler mark and Tabler brand icons, because a runtime request to a host we do not control is the same problem the self-hosted fonts avoid. |
| 2026-09-24 | **The sign-in card title is the page `h1`.** `CardTitle` gained an optional `level` (default `3`, so existing cards are untouched) instead of shipping an `h1`→`h3` outline gap or a duplicate hidden heading. |
| 2026-09-24 | **Two shadcn-registry defects fixed on copy-in (Checkbox):** the registry imports `cn` from an npm package and adds it as a dependency (removed — this project owns its `cn`); and its `disabled:` utilities can never match, because Base UI renders the control as `<span role="checkbox">` where `:disabled` does not apply, so the styling uses the `data-disabled` variant Base UI actually emits. |
| 2026-09-24 | **The sign-in checkbox is named with `aria-labelledby`, not `htmlFor` alone.** Base UI applies the consumer's `id` to its hidden native input, so an `htmlFor`-only label points at an `aria-hidden` element and leaves the visible control anonymous. |
| 2026-09-24 | **`bg-white/10` kept as a literal on the sign-in arcs.** The surface above is deliberately inverted (dark in both themes), so a light tint is needed in both; a token like `bg-foreground/10` would vanish into the surface it sits on. |
| 2026-09-24 | **Two `@user` review fixes.** (1) *The workspace avatar letter vanished on dropdown hover* — `DropdownMenuItem` forces every descendant to `accent-foreground` while highlighted, so `WorkspaceMark` sets its foreground with the important modifier. (2) *Skip link kept* — a required a11y affordance (ui-qa-checklist §1.7); appearing on Tab is its whole purpose, not a bug. |
| 2026-09-24 | **Two `@user` review fixes to the shell chrome.** (1) *Top-bar separator alignment + spacing* — the primitive's `self-stretch` default beats a definite `h-*` and pins the rule to flex start; the call site hands alignment back to the container. (2) *Trigger glyph* — `SidebarTrigger` advertises the action it performs (collapse/expand pair chosen by the sidebar `side`) with the accessible name left stable as "Toggle Sidebar". |
| 2026-09-24 | **F-03 closed.** Sign-in, sign-out, three-state session entry and selector semantics are all landed and green. Gaps handed on: no sample marker on `Workspace`; the forbidden denial has no reachable trigger; no real-API sign-in smoke test; visual confirmation is `@user`'s. |
| 2026-09-25 | **Two `@user` review fixes.** (1) *Sign out did nothing — and neither did the theme-toggle item nor workspace picking.* All three were wired with `onSelect`, which is **Radix's** `DropdownMenu.Item` prop; this project's `base-nova` tier is Base UI, whose `Menu.Item` handler is `onClick`, so the dead prop reached a `<div>` as a native `select` listener that a click never fires. Server-action handlers are **wrapped** (`onClick={() => action()}`) so a click event is never forwarded as an argument it cannot serialise. (2) *The workspace switcher opened straight down over the nav* — it now mirrors `NavUser`'s `side`/`align`. |
| 2026-09-25 | **Gap — the social sign-in note was missing** (`login.test.tsx` asserted a sentence the block did not render). **Closed 2026-09-25** — `@user` decided the disabled buttons stay unannotated; fixed in `3802d9b`. |
| 2026-09-25 | Save status gains a fifth state, `error`, for a failed save. A failed save must not render as nothing or as `saved`; it stays distinct from `conflict` because the user's next action differs. |
| 2026-09-25 | The disabled social sign-in buttons stay **unannotated**. The removed explanation note was intentional: they are placeholders for a later feature, and the button labels carry the message. The account-creation group keeps its note. |
| 2026-09-25 | F-04: the visual blocks are built from options offered per block, not from a supplied reference. |
| 2026-09-25 | F-04 options chosen: document-first shell; static toolbar + selection bubble; borderless title; text-only save indicator; drop zone with per-file rows; inline conflict banner. |
| 2026-09-25 | CodeMirror 6 for fenced code (ADR-0001 §2) deferred to a follow-up slice; StarterKit's code block ships in F-04. *(Superseded by F-15, which builds the CodeMirror engine.)* |
| 2026-09-27 | **F-12 look decision: none.** `@user` chose behaviour-only for the markdown render pipeline — stock tokens, no typography, no prose scale, no palette work. The pipeline is a shared `packages/ui` block, so the answer-prose look stays open for F-07 and still needs a reference. |
| 2026-09-27 | **F-12 scope narrowed to the render consumer.** `@tiptap/extension-table` and CodeMirror 6 were **refused** in this slice rather than added: both need a *new* pin (ADR + ledger), which is an Architect decision, not a lane-local install. The sanitize schema's refusals (`style`, `on*`, presentational attributes, `name`, non-`http(s)` schemes) are locked by schema-level tests. |
| 2026-10-01 | **Multi-mode capture & markdown editing architecture chosen: Option A.2** (`@user`). Normal (TipTap WYSIWYG + sticky toolbar + selection bubble + native markdown input rules), Markdown (Obsidian-style inline live preview in CodeMirror 6), Text (raw markdown source), Reading (sanitized read-only projection). ProseMirror JSON remains the durable database SoT; bidirectional sync runs on mode switch and save. *(Reading removed the same day — see below.)* |
| 2026-10-01 | **Live-preview folding follows Obsidian reveal rules:** line tokens (`#`, `>`) unfold when the selection touches their line; inline tokens (`**`, `~~`, backticks, link brackets/URL) unfold only when the selection touches the *formatted span*; folded tokens use `Decoration.replace`. Unfolding is gated on **focus and the lock**, so an unfocused or locked note renders as a finished document. |
| 2026-10-01 | **Capture modes revised (`@user`): three modes plus a lock.** *Reading* is removed — every mode renders live, so a separate preview mode duplicated Normal/Markdown; the fourth control is a **lock button** beside the mode menu, which makes the whole note read-only (toolbar and selection bubble hidden; title and import disabled). |
| 2026-10-02 | **Markdown & editor tables (F-14) architecture and UI choices (`@user`):** (1) interactive size popover (matrix picker) plus default 3x3 table insertion button in the toolbar; (2) contextual table manipulation controls (add row before/after, add col before/after, delete row/col/table) in the floating selection bubble when selection is within a table; (3) pinned `@tiptap/extension-table*` at 3.31.3; (4) the bidirectional JSON ↔ Markdown bridge converts GFM tables without loss; (5) CodeMirror Markdown mode live preview formats tables and unfolds raw pipes when the cursor touches the row. |
| 2026-10-03 | **F-14 review — Markdown-mode tables (`@user` report, verified in a browser against the local stack).** The table widget is **permanent and editable in place**, not a preview that unfolds: (1) the block is found by **scanning lines** (`findTableBlocks`), never by a GFM `Table` node in the syntax tree — a syntax-tree-valid table is not what a user typing one ever has on screen; (2) the only deferral is a delimiter row narrower than its header still sitting on the last line with the caret at its end, and an idle timer then pads that row (which also makes the stored markdown valid GFM); (3) cells show and accept **markdown source**, rendering in place when the cell is left; (4) a helper toolbar above the table acts on the focused cell, and `Tab`/`Enter`/arrows navigate cells with `Tab` off the last cell growing a row; (5) **a literal pipe is escaped as `\|` in cells, including inside a code span** — GFM requires it, and the bridge serializer carries it through a private-use sentinel, because otherwise a pipe in a cell silently adds a column and drops the tail of the row on the next read; (6) `normalizeMarkdownTables` pads and escapes tables at the **bridge boundary**, so a lenient table in the editor is still a table in Normal mode and after a reload. Two defects found while verifying: widget writes had to move **out of CodeMirror's update cycle** (a `focusout` arrives during the update that moved focus, and `EditorView.dispatch` then throws and the edit is lost), and the note-selection mode is now **remembered across the new-note → saved-note remount**. |
| 2026-10-10 | **Editor parity is a contract, and its source is evidence.** The editing surface must behave like Obsidian's editor so a user who knows Obsidian needs no retraining; behavior is derived from shipped-artifact analysis (REA, Obsidian 1.14.4) and reproduced with permissively-licensed building blocks only. |
| 2026-10-10 | **Wikilinks deferred (v1):** `[[…]]` stays literal text in every mode — no resolution, autocomplete, or unresolved-link styling. `@user` chose option 3 (out of scope) over a dedicated `wikilink` mark (Obsidian-faithful; needs a TipTap mark + `tiptap-markdown` serializer/parser work) or a plain internal `omni://` link mark (cheapest; breaks on rename). The SoT (`ProseMirrorDocument`) and `docs/api/openapi.yaml` are unchanged; the F-15 plan's Phase E is deferred with it. |
| 2026-10-10 | **F-15 supersedes-in-part the F-13/F-14 CM6 internals** (inline extension assembly, the 1,722-line live-preview module, the two parallel toolbars). Their user-facing behavior — three modes + lock, GFM tables, live-preview folding — is preserved and guarded by the existing test suites. |
| 2026-10-10 | **Editor settings persistence: prop / component state only in v1** (`@user`). No server or localStorage persistence; revisit only with a concrete need. |
| 2026-10-10 | **`now.md` restructured.** The per-slice status blocks moved to `context.md` and the handoffs; this file keeps the living plan plus an append-only decisions log. Full detail for compressed rows lives in git history and `docs/memory/implementer.md`. |
| 2026-10-11 | **F-05 rows chosen by `@user`: quiet Mintlify rows** — title + meta line, hairline dividers, no cards. States, empty-state CTA and pagination affordances were bound (not choices) and built on the existing `Empty`/`Skeleton`/`Button` patterns. |
| 2026-10-11 | **F-05 pagination is URL-based server cursors** (`?cursor=…`, repeated, bounded at 20 pages). Links stay shareable, reloadable and JavaScript-optional; only server-issued cursors are followed, and a stale cursor falls back to the pages the server still vouches for plus the server's own next cursor. No client cache, no client-made cursor. |
| 2026-10-11 | **F-05 lists do not claim indexing state.** Contract `Note`/`NotePage` carry no per-note indexing field, so rows show only what the server returns (title, updated time, and a `Sample` label when `corpusOwnership` says so). Per-file indexing status stays F-04's import rows, where the contract does return it. |
| 2026-10-11 | **F-05 Collections stays honest.** S-02 has no `collections`/`tags` operation and `Note` carries no folder/tag field, so the Collections route states the gap and Inbox/Notes share one sentence (`UNFILED_NOTICE`) that today they show the same unfiled set. No client-side folder/tag model was forked; the contract change is escalated to Commander/`@user`. |

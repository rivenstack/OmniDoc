# Obsidian-Parity Capture Editor Redesign — Implementation Plan

> **Execution note:** implement this plan task-by-task, one bite-sized task at a
> time, committing after each. Do not batch tasks. Each task ends green —
> `npx vitest run` (cwd `packages/ui`) and `npx nx typecheck ui` (repo root;
> this runs `tsc --noEmit -p packages/ui/tsconfig.lib.json`) — before the next
> begins. The §2 governance tasks are **Commander / Architect / Designer
> owned**; the implementer runs them but does not self-approve them.

**Goal:** Replace the current ad-hoc CodeMirror 6 live preview with a single,
Obsidian-fidelity markdown editing engine that is production-hardened, and drive
it and TipTap from **one** command/toolbar surface so the same formatting
affordances work identically in Normal, Markdown, and Text modes.

**Architecture:** Keep ProseMirror JSON as the durable SoT (ADR-0001 §2) and
markdown as a derived projection (`markdown-bridge.ts`). Rebuild the CM6 side on
Obsidian's actual model — an **extension factory** parameterised by an
`EditorSettings` object and `Compartment`s, plus a **live-preview extension pair**
(a `StateField` for block widgets + a viewport-scoped `ViewPlugin` for inline
marks, emitting `Decoration.mark` / `Decoration.replace` / `WidgetType` with
`atomicRanges`) — replacing today's single 1,722-line module. Introduce **one command descriptor registry** consumed
by both the TipTap and CM6 adapters so
`packages/ui/src/capture/formatting-toolbar.tsx` renders a single list in every
mode.

**Tech Stack:** Next.js 16 / React 19, TipTap 3.31.3 (ProseMirror), CodeMirror 6
(`@codemirror/state|view|language|commands|lang-markdown`), `tiptap-markdown`
0.9.0, Vitest 5 + jsdom, Nx targets (`test`, `typecheck`, `lint`, `build`),
`packages/ui/src/styles/tokens.css` (Mintlify token layer).

---

## 0. Evidence and current state

### 0.1 Reverse-engineering evidence (REA)

The Obsidian editor was analysed statically from the live shipped bundle.

| Field | Value |
|---|---|
| Target | `~/.config/obsidian/obsidian-1.14.4.asar` |
| SHA-256 | `146ef8470d8cbb4a6db209bdc19bf2bad13350444186c0fd93c31087b142b92f` |
| Evidence ID | `ev_c7f5023cbab1916ee56d4fcc8326a157e59cb79ab35cd88e4765949144f207f0` |
| Authority / confidence | `shipped-artifact` / `derived` (no execution observed) |
| Full bundle | `/tmp/opencode/obsidian-1.14.4-bundle.json` |

Findings that drive this design:

1. **The editor is CodeMirror 6**, bundled minified inside `app.js`
   (`@codemirror/state`, `@codemirror/view`, `@codemirror/language`,
   `@lezer/*`), exposed to plugins through the `obsidian` module. `lib/codemirror/*`
   in the asar is genuine **CodeMirror 5**, kept only for the legacy plugin API.
2. **Markdown parsing is a CM5 stream mode bridged into CM6.**
   `window.CodeMirror.defineMode("hypermd", …)` defines the mode, and
   `StreamLanguage.define(CodeMirror.getMode({}, {name:"hypermd"}))` wraps it for
   CM6. (Obsidian does **not** use `@codemirror/lang-markdown`. OmniDoc does; we
   keep Lezer markdown — it is the better-modelled choice — and note the
   divergence.)
3. **Live Preview is a `StateField` + `ViewPlugin` pair.** The state field
   (`livePreviewState`, tracks interaction like `mousedown`) plus a view plugin
   that emits `Decoration.mark` (`cm-live-strong`, `cm-live-underline`,
   `is-unresolved`, list bullets), `Decoration.replace` (folded punctuation,
   checkbox/HR/blockquote-border widgets), and `WidgetType` subclasses. It uses
   `atomicRanges` so the caret cannot land inside a folded token.
4. **Base extension set** includes `EditorView.exceptionSink`,
   `EditorState.allowMultipleSelections.of(true)`,
   `EditorView.perLineTextDirection.of(true)` (RTL), `clickAddsSelectionRange`,
   an indent-unit facet derived from `useTab`/`tabSize`, `lineWrapping`, and a
   `compositionend` handler.
5. **Settings that shape behaviour:** `useTab`, `tabSize`, `vimMode`,
   `rightToLeft`, `livePreview` (default on), `showLineNumber`,
   `showIndentGuide`, `autoPairBrackets`, `autoPairMarkdown`, `smartIndentList`,
   `foldHeading`, `foldIndent`, `defaultViewMode`.
6. **Vim mode** is an adapter (`window.CodeMirrorAdapter`, `VimMode`) over CM6.

**Licensing boundary (must be honoured):** Obsidian is proprietary. We reproduce
*behaviour* using permissively-licensed building blocks only (`@codemirror/*` MIT,
Lezer MIT, `@replit/codemirror-vim` MIT, KaTeX/Mermaid per their licences). No
Obsidian code, CSS, or assets are copied.

### 0.2 Current OmniDoc implementation (from the repo)

| File | Lines | Role today |
|---|---|---|
| `packages/ui/src/codemirror/cm-editor.tsx` | 272 | React wrapper; builds extensions inline in a `useEffect`; `mode: "text" \| "markdown"` |
| `packages/ui/src/codemirror/markdown-live-preview.ts` | 1,722 | Live-preview plugin **and** GFM table widget/editor **and** interactive table tools, all in one module |
| `packages/ui/src/codemirror/index.ts` | 12 | Public exports |
| `packages/ui/src/capture/capture-surface.tsx` | 689 | **Three-mode** surface (`normal`/`markdown`/`text` + a separate lock control); JSON↔markdown bridge at mode switch |
| `packages/ui/src/capture/formatting-toolbar.tsx` | 876 | **Two** parallel toolbars: `TipTapFormattingToolbarView` + `CodeMirrorFormattingToolbarView` |
| `packages/ui/src/capture/markdown-bridge.ts` | 194 | Headless TipTap converter for JSON↔markdown |
| `packages/ui/src/markdown/table.ts` | — | Shared table grammar (`parseMarkdownTable`, `serializeMarkdownTable`, `normalizeMarkdownTables`) |

Status reconciliation: the multi-mode surface is **F-13** (delivered; commits
`3c170f9` / `fe5a97f` / `acaa031`), tables are **F-14** (lane head
`docs/handoffs/active/lane-frontend.md`, `status: completed` 2026-10-02).
`docs/planning/implementation-tracks.md` still shows F-13 `listed` and F-14
`ready`, and `context.md`'s Active Tasks row for F-14 says `ready` — both are
stale. Task G-3 reconciles them before F-15 opens.

### 0.3 Gap table (Obsidian behaviour vs. OmniDoc today)

| Behaviour | Obsidian | OmniDoc today | Where the work lands |
|---|---|---|---|
| Extension assembly | Settings + `Compartment`s | Inline array, rebuilt on `mode` change | Phase A |
| Live-preview plugin | StateField + viewport-scoped ViewPlugin + atomicRanges | Inline pass already uses `view.visibleRanges`; the table `StateField` rescans the whole document (`findTableBlocks(state.doc)`) on every selection/doc change; no `atomicRanges` | Phase C |
| One formatting surface | n/a (ribbon) | Two divergent toolbars | Phase B |
| Auto-pair brackets/markdown | `autoPairBrackets`, `autoPairMarkdown` | None | Phase D |
| Multiple selections + Alt-click | `allowMultipleSelections`, `clickAddsSelectionRange` | None | Phase D |
| Smart list indent | `smartIndentList` | None | Phase D |
| `useTab` / `tabSize` / indent guides | Settings-driven facet | Fixed | Phase D |
| `[[wikilink]]` autocomplete | Autocomplete + suggestions | None | Phase E (deferred, G-2) |
| In-editor find/replace | `@codemirror/search` | None | Phase F |
| Heading/indent folding | `foldHeading`, fold gutter | None | Phase F |
| Vim mode | `vimMode` | None | Phase F (gated by G-1) |
| `==highlight==`, `%%comment%%`, footnotes, callouts, math, images | Rendered inline | Partial/absent | Phase C |
| Per-line direction / `rightToLeft` | `perLineTextDirection` | None | Phase G |
| Shared body typography | One CSS skin (`cm-s-obsidian`) | Duplicated in two files | Phase A |

---

## 1. Target architecture

```
packages/ui/src/capture/
  ├── capture-surface.tsx              (normal | markdown | text + lock)
  ├── editor-mode-switcher.tsx
  ├── formatting-toolbar.tsx           (renders one list from COMMAND_DEFS)
  ├── formatting/                      ← NEW: one command surface
  │     ├── commands.ts                (COMMAND_DEFS registry: id/label/icon)
  │     ├── tiptap-adapter.ts          (run/isActive/isEnabled for each id)
  │     └── codemirror-adapter.ts      (same ids, CM6 implementation)
  └── body-typography.ts               ← NEW: single source for body CSS
packages/ui/src/codemirror/
  ├── cm-editor.tsx                    (thin wrapper → createEditorExtensions)
  ├── editor-settings.ts               ← NEW: EditorSettings + defaults
  ├── editor-extensions.ts             ← NEW: extension factory + Compartments
  ├── index.ts                         (public names stay unchanged)
  └── live-preview/                    ← NEW: split, viewport-scoped
        ├── index.ts
        ├── hide-rules.ts
        ├── decorations.ts             (plugin + buildDecorations)
        ├── widgets.ts
        ├── theme.ts                   (markdownLivePreviewTheme)
        └── table/                     (today's table widget moved whole;
                                        tableLivePreview stays a StateField wiring)
packages/ui/src/markdown/              (F-12 render path — unchanged)
```

Key invariants kept: the block **never calls the API** (all data comes in via
props/ports); ProseMirror JSON is the SoT; markdown is derived; direction comes
from one locale source (logical CSS only); the body typography is defined once.

---

## 2. Governance gates (do these before the code phases)

### Task G-1: Architect pin request for new editor packages

**Objective:** Get explicit pins — and repair the existing ledger rows — before
installing or removing any dependency.

**Files:**
- Modify: `docs/research/version-ledger.md`
- Modify: `docs/adr/ADR-0003-frontend-application-toolchain.md` (only if the pin
  set changes a §4 row; editor pins live under the ADR-0001 §2 decision)

**Action (no code):** Request from `/architect` pins for the packages this plan
uses. Exact candidates and current npm versions must be re-verified at execution
time; do **not** copy the numbers below as approved:

- `@codemirror/autocomplete` — wikilink/tag completion (Phase E) **and**
  `closeBrackets()` (D-1). There is **no** installable `@codemirror/closebrackets`
  package today: that name is a deprecated pre-1.0 artifact ("merged into
  @codemirror/autocomplete"). Do not install it.
- `@codemirror/search` (find/replace, F-1).
- `@codemirror/language` — already installed; `foldGutter` / `codeFolding` /
  `foldService` / `indentUnit` / `indentOnInput` all live here. **`@codemirror/fold`
  is the same kind of deprecated artifact — do not install it.**
- `@replit/codemirror-indentation-markers` — only if D-5 does not build indent
  guides itself (MIT, still needs a ledger row and the reuse-before-custom
  check).
- Ledger reconciliation: `@codemirror/state`, `@codemirror/view`,
  `@codemirror/language`, and `@codemirror/commands` are already in
  `packages/ui/package.json` but have **no ledger rows** (only the `codemirror`
  meta package and `@codemirror/lang-markdown` 6.5.2 are recorded). Add rows for
  every installed `@codemirror/*` package.
- `@replit/codemirror-vim` (vim mode, F-3) — **needs an explicit licence/security
  review** (MIT) plus a pin; `@user` answer 2026-10-10: gated (see §13).
- `katex` + `remark-math` + `rehype-katex` (math, C-6) — only if math is
  approved; note the editor side additionally needs a Lezer math extension and
  KaTeX CSS shipping.
- `mermaid` (diagrams, C-6) — only if diagrams are approved.

**Acceptance:** a ledger row per package (version, license, date, rationale) —
new pins **and** the missing rows for already-installed packages — and an
explicit yes/no on vim, math, and mermaid. Rejected or deferred packages must
not appear in `packages/ui/package.json`.

**Commit:** `docs(version-ledger): pin candidate editor packages for redesign`

### Task G-2: Record the wikilink decision (v1: deferred)

**Objective:** Record the `@user` decision (2026-10-10) that `[[wikilinks]]` stay
literal text in v1. This is a **contract note** (`system-ux.md` §4 process), not
a UI choice.

**Files:**
- Modify: `docs/design/system-ux.md` (§2 Capture and notes: state that wikilink
  syntax is plain text until the backlog item is promoted)
- Modify: `docs/design/now.md`

**Decision (recorded, not open):** option 3 — out of scope for v1. `[[…]]`
stays literal text; the SoT (`ProseMirrorDocument`) and `docs/api/openapi.yaml`
are unchanged. The alternatives remain documented for a future slice:
a dedicated `wikilink` mark with `{ targetId, targetTitle }` (Obsidian-faithful;
needs a TipTap mark + `tiptap-markdown` serializer/parser work) or a plain
internal `omni://` link mark (cheapest; breaks on rename).

**Acceptance:** the decision is recorded in both files; Phase E is **cut from
this plan's execution order** (left in place, marked deferred, so the reasoning
is not lost). The unresolved-link half of C-5 is deferred with it.

**Commit:** `docs(design): record wikilink deferral for v1`

### Task G-3: Update the program of record and reconcile F-13/F-14

**Objective:** Make this redesign visible to the dual-lane plan, and fix the
stale status rows first so F-15 depends on facts.

**Files:**
- Modify: `docs/planning/implementation-tracks.md` — set **F-13 completed**
  (multi-mode capture delivered: commits `3c170f9`/`fe5a97f`/`acaa031`) and
  **F-14 completed** (lane head `status: completed`, 2026-10-02); then add
  **F-15 — Obsidian-parity editor redesign** under Phase 1, depending on
  completed F-13/F-14.
- Modify: `context.md` — status line **and** the Active Tasks rows for
  F-13/F-14 (both still show F-14 as `ready`).
- Modify: `docs/handoffs/current.md` — point the frontend lane pointer at F-15
  (it currently says F-12).
- Modify: `docs/handoffs/active/lane-frontend.md` — replace the completed F-14
  head with the F-15 head (single owner, write paths
  `packages/ui/src/capture/**`, `packages/ui/src/codemirror/**`).

**Acceptance:** exactly one owning lane/task; F-13/F-14 rows match what is on
`develop`; F-15 records that it **supersedes-in-part the CM6 internals delivered
by F-13/F-14** while their user-facing behaviour (modes, tables, live preview)
is preserved.

**Commit:** `docs(tracks): open F-15 and reconcile F-13/F-14 status`

### Task G-4: Sync the System UX mode contract

**Objective:** `system-ux.md` §1/§2 still describe four modes including
**Reading**, but `@user` removed Reading on 2026-10-01 (`docs/design/now.md`):
the capture surface is **three modes + a separate lock control**, and every
mode renders live. The code already matches
(`EditorMode = "normal" | "markdown" | "text"`).

**Files:**
- Modify: `docs/design/system-ux.md` (§1 "Editor modes" row and §2 Capture)
- Modify: `docs/design/now.md` (decision-log entry, if not already recorded)

**Action:** `/designer` records the delivered model — viewing is not a mode; the
lock is a control that makes any mode read-only; Reading remains a render path
(`packages/ui/src/markdown/`), not a capture mode. This plan's C-6 wording
depends on this sync.

**Acceptance:** the contract matches the shipped three-mode + lock surface; no
plan text any longer implies a fourth capture mode.

**Commit:** `docs(design): sync capture mode contract with three-mode + lock`

---

## 3. Phase A — Foundation refactor

> No behaviour change is intended in Phase A. The existing tests in
> `cm-editor.test.tsx` and `table-preview.test.tsx` are the regression net and
> **must stay green** throughout.

### Task A-1: Extract `EditorSettings` and defaults

**Objective:** One typed settings object with Obsidian's knobs and sane defaults.

**Files:**
- Create: `packages/ui/src/codemirror/editor-settings.ts`
- Test: `packages/ui/src/codemirror/editor-settings.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_EDITOR_SETTINGS, type EditorSettings } from "./editor-settings";

describe("editor settings", () => {
  it("defaults match the capture contract", () => {
    expect(DEFAULT_EDITOR_SETTINGS).toMatchObject<Partial<EditorSettings>>({
      livePreview: true,
      useTab: false,        // OmniDoc writes spaces; Obsidian's useTab default is on
      tabSize: 4,
      rightToLeft: false,
      vimMode: false,
      autoPairBrackets: true,
      autoPairMarkdown: true,
      smartIndentList: true,
      foldHeading: true,
      showLineNumbers: false,
      showIndentGuides: false,
    });
  });
});
```

**Step 2: Run to verify failure**

Run: `npx vitest run src/codemirror/editor-settings.test.ts` (cwd `packages/ui`)
Expected: FAIL — cannot resolve `./editor-settings`.

**Step 3: Write the module**

```ts
export type EditorSettings = {
  livePreview: boolean;
  useTab: boolean;
  tabSize: number;
  rightToLeft: boolean;
  vimMode: boolean;
  autoPairBrackets: boolean;
  autoPairMarkdown: boolean;
  smartIndentList: boolean;
  foldHeading: boolean;
  showLineNumbers: boolean;
  showIndentGuides: boolean;
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  livePreview: true,
  useTab: false,
  tabSize: 4,
  rightToLeft: false,
  vimMode: false,
  autoPairBrackets: true,
  autoPairMarkdown: true,
  smartIndentList: true,
  foldHeading: true,
  showLineNumbers: false,
  showIndentGuides: false,
};
```

**Step 4: Run to verify pass**

Run: `npx vitest run src/codemirror/editor-settings.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/ui/src/codemirror/editor-settings.ts packages/ui/src/codemirror/editor-settings.test.ts
git commit -m "feat(editor): add EditorSettings with Obsidian-parity defaults"
```

### Task A-2: Shared body typography module

**Objective:** Define the body CSS once; have both modes consume it (removes the
duplication between `CAPTURE_BODY_CLASSES` and `markdown-live-preview.ts`).

**Files:**
- Create: `packages/ui/src/capture/body-typography.ts`
- Modify: `packages/ui/src/capture/capture-surface.tsx:132-153`
- Modify: `packages/ui/src/codemirror/markdown-live-preview.ts:1560` (`markdownLivePreviewTheme`)
- Test: `packages/ui/src/capture/body-typography.test.ts`

**Note:** `body-typography.ts` must not import from `codemirror/` — it is the
neutral source both sides consume (`live-preview/theme.ts` imports it in A-5),
and the capture → codemirror import direction already exists.

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  BODY_TYPE_SCALE,
  BODY_TYPOGRAPHY_CLASSES,
  bodyThemeRules,
} from "./body-typography";

describe("body typography", () => {
  it("exposes the same heading scale to TipTap classes and CM6 theme", () => {
    expect(BODY_TYPOGRAPHY_CLASSES).toContain("[&_h1]:text-2xl");
    const rules = bodyThemeRules();
    expect(rules[".cm-live-h1"]?.fontSize).toBe(BODY_TYPE_SCALE.h1.fontSize);
  });
});
```

`BODY_TYPE_SCALE` is the single data source: `bodyThemeRules()` builds the CM6
rules from it, and the Tailwind class string is the TipTap projection of the
same values (a class name cannot be computed from a rem value, so the test pins
the two together; `text-2xl` is 1.5rem).

**Step 2: Run to verify failure** — `npx vitest run src/capture/body-typography.test.ts` → FAIL.

**Step 3: Implement** by moving `CAPTURE_BODY_CLASSES` into
`body-typography.ts` as `BODY_TYPOGRAPHY_CLASSES`, and deriving the CM6 theme's
heading/mark rules from the same values (a `bodyThemeRules()` returning
`{ ".cm-live-h1": { fontSize: "1.5rem", ... }, ... }`). Re-export and import in
both consumers.

**Step 4: Run to verify pass** — `npx vitest run src/capture/ src/codemirror/` → PASS (all existing tests still green).

**Step 5: Commit** — `refactor(capture): single source for body typography`

### Task A-3: Introduce the extension factory and Compartments

**Objective:** `cm-editor.tsx` stops building extensions inline; a factory takes
settings and returns `{ extensions, compartments }` so settings can be
reconfigured without rebuilding the view (Obsidian's model).

**Files:**
- Create: `packages/ui/src/codemirror/editor-extensions.ts`
- Modify: `packages/ui/src/codemirror/cm-editor.tsx:147-238`
- Test: `packages/ui/src/codemirror/editor-extensions.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { createEditorCompartments, createEditorExtensions } from "./editor-extensions";
import { DEFAULT_EDITOR_SETTINGS } from "./editor-settings";

describe("editor extension factory", () => {
  it("builds a valid state for markdown mode", () => {
    const compartments = createEditorCompartments();
    const state = EditorState.create({
      doc: "# hi",
      extensions: createEditorExtensions({
        mode: "markdown",
        settings: DEFAULT_EDITOR_SETTINGS,
        readOnly: false,
        bodyLabel: "Note body",
        compartments,
      }),
    });
    expect(state.doc.toString()).toBe("# hi");
  });
});
```

**Step 2: Run to verify failure** — FAIL, module missing.

**Step 3: Implement** `createEditorCompartments()` returning named compartments
(`editing`, `settings`, `livePreview`, `keymap`, `language`) and
`createEditorExtensions({ mode, settings, readOnly, bodyLabel, compartments })`
returning the array currently inlined in `cm-editor.tsx`. The factory is pure
(no React). Add a `settingsCompartment.of([...])` carrying the indent-unit
facet, tab size, and direction (wired properly in Phases D/G). Phase A keeps
the existing rebuild-on-mode-change behaviour; the compartments are what make
D-6's live reconfiguration possible without a rebuild.

**Step 4: Run the whole editor suite** — `npx vitest run src/codemirror/` → PASS.

**Step 5: Commit** — `refactor(editor): extension factory + compartments`

### Task A-4: Move the table machinery into `live-preview/table/`

**Objective:** Split the 1,722-line module's table half out with no logic
change.

**Files:**
- Create: `packages/ui/src/codemirror/live-preview/table/{index,interaction,widget,tools,scan}.ts`
- Move: table code from `markdown-live-preview.ts` (interaction handler,
  `TablePreviewWidget`, helper toolbar, line scanner; `index.ts` wires
  `tableDecorations` StateField + `TableRowFinisher` into `tableLivePreview`)
- Modify: `packages/ui/src/codemirror/index.ts` (import paths only)
- Test: existing `table-preview.test.tsx` unchanged

**Constraint (do not lose):** the table's block decorations **must** stay in a
`StateField` — CodeMirror refuses block decorations from view plugins (the
existing module comment says so). Comment the state-field/no-ViewPlugin
distinction when moving.

**Step 1–4:** Move code verbatim; run
`npx vitest run src/codemirror/table-preview.test.tsx` after each move; expect
PASS at every step.

**Step 5: Commit** — `refactor(editor): split live-preview table into its own folder`

### Task A-5: Move the live-preview core into `live-preview/`

**Objective:** Finish the module split with no logic change, so Phase C's tasks
modify files that already exist.

**Files:**
- Create: `packages/ui/src/codemirror/live-preview/{index,hide-rules,decorations,widgets,theme}.ts`
- Create: `packages/ui/src/codemirror/live-preview/index.ts` re-exporting the
  same public names (`markdownLivePreviewPlugin`, `markdownLivePreviewTheme`,
  `tableLivePreview`, `TablePreviewWidget`, `parseMarkdownTable`,
  `serializeMarkdownTable`)
- Delete: `packages/ui/src/codemirror/markdown-live-preview.ts`
- Modify: `packages/ui/src/codemirror/index.ts` (import paths only)
- Test: existing `cm-editor.test.tsx`, `table-preview.test.tsx` unchanged

**Mapping (verbatim move; place shared helpers where the code reads best, but
no logic change):**
- `hide-rules.ts` — `HIDE_RULES` and its helper types
- `widgets.ts` — `MarkerWidget`, `orderedMarker`, marker/decoration factories
- `decorations.ts` — `selectionTouches`, `taskItems`, `buildDecorations`,
  `LivePreviewPlugin`, `markdownLivePreviewPlugin`
- `theme.ts` — `markdownLivePreviewTheme` (already consuming A-2's
  `bodyThemeRules`)
- `index.ts` — the public re-exports above

**Step 1–4:** Move and re-run `npx vitest run src/codemirror/` after each file;
expect PASS at every step.

**Step 5: Commit** — `refactor(editor): split live-preview core into modules`

---

## 4. Phase B — One toolbar for both engines

This is the user's explicit requirement: the toolbar must work with TipTap and
CodeMirror.

### Task B-1: Command descriptor registry

**Objective:** Define every formatting command once (id, label, icon); adapters
implement behaviour per engine.

**Files:**
- Create: `packages/ui/src/capture/formatting/commands.ts`
- Test: `packages/ui/src/capture/formatting/commands.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { COMMAND_DEFS, commandIds } from "./commands";

describe("command registry", () => {
  it("has unique ids and covers the toolbar surface", () => {
    const ids = commandIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "undo", "redo",
      "h1", "h2", "h3",
      "bulletList", "orderedList", "blockquote", "codeBlock", "hr",
      "table", "tableSize",
      "bold", "italic", "strike", "code",
    ]);
  });
});
```

**Step 2: Run to verify failure** — FAIL.

**Step 3: Implement**

```ts
import type { Icon } from "@tabler/icons-react";
import {
  IconArrowBackUp, IconArrowForwardUp, IconH1, IconH2, IconH3,
  IconList, IconListNumbers, IconBlockquote, IconCodeDots, IconMinus,
  IconTable, IconBold, IconItalic, IconStrikethrough, IconCode,
  IconChevronDown,
} from "@tabler/icons-react";

export type CommandId =
  | "undo" | "redo" | "h1" | "h2" | "h3" | "bulletList" | "orderedList"
  | "blockquote" | "codeBlock" | "hr" | "table" | "tableSize"
  | "bold" | "italic" | "strike" | "code";

export type CommandDef = { id: CommandId; label: string; icon: Icon };

export const COMMAND_DEFS: CommandDef[] = [
  { id: "undo", label: "Undo", icon: IconArrowBackUp },
  { id: "redo", label: "Redo", icon: IconArrowForwardUp },
  { id: "h1", label: "Heading 1", icon: IconH1 },
  { id: "h2", label: "Heading 2", icon: IconH2 },
  { id: "h3", label: "Heading 3", icon: IconH3 },
  { id: "bulletList", label: "Bullet list", icon: IconList },
  { id: "orderedList", label: "Numbered list", icon: IconListNumbers },
  { id: "blockquote", label: "Quote", icon: IconBlockquote },
  { id: "codeBlock", label: "Code block", icon: IconCodeDots },
  { id: "hr", label: "Divider", icon: IconMinus },
  { id: "table", label: "Insert table (3x3)", icon: IconTable },
  { id: "tableSize", label: "Choose table size", icon: IconChevronDown },
  { id: "bold", label: "Bold", icon: IconBold },
  { id: "italic", label: "Italic", icon: IconItalic },
  { id: "strike", label: "Strikethrough", icon: IconStrikethrough },
  { id: "code", label: "Inline code", icon: IconCode },
];

export function commandIds(): CommandId[] { return COMMAND_DEFS.map((c) => c.id); }
```

**Step 4: Run to verify pass.**

**Step 5: Commit** — `feat(capture): single formatting command registry`

### Task B-2: TipTap adapter

**Objective:** Implement `run`/`isActive`/`isEnabled` for each id against the
TipTap editor (lifted from `TipTapFormattingToolbarView`).

**Files:**
- Create: `packages/ui/src/capture/formatting/tiptap-adapter.ts`
- Test: `packages/ui/src/capture/formatting/tiptap-adapter.test.ts`

**Test (representative):**

```ts
import { describe, expect, it, vi } from "vitest";
import { createTipTapAdapter } from "./tiptap-adapter";

describe("tiptap adapter", () => {
  it("runs bold through the editor chain", () => {
    const run = vi.fn();
    const chain = { focus: () => chain, toggleBold: () => chain, run };
    const adapter = createTipTapAdapter({ chain: () => chain } as never);
    adapter.run("bold");
    expect(run).toHaveBeenCalledOnce();
  });
});
```

**Implementation:** map each `CommandId` to `editor.chain().focus()...run()`
(`toggleHeading({level})`, `toggleBulletList`, `toggleOrderedList`,
`toggleBlockquote`, `toggleCodeBlock`, `setHorizontalRule`,
`insertTable({rows:3,cols:3,withHeaderRow:true})`, `toggleBold`, `toggleItalic`,
`toggleStrike`, `toggleCode`, `undo`/`redo`). `isActive` mirrors the current
selector object; `isEnabled("undo"/"redo")` mirrors its `can().undo()` /
`can().redo()` checks. The snippet imports `vi` explicitly — this repo's Vitest
config does not enable globals.

**Commit:** `feat(capture): tiptap adapter for the command registry`

### Task B-3: CodeMirror adapter

**Objective:** Implement the same ids against a CM6 `EditorView`.

**Files:**
- Create: `packages/ui/src/capture/formatting/codemirror-adapter.ts`
- Test: `packages/ui/src/capture/formatting/codemirror-adapter.test.ts`

**Implementation:** reuse the existing `CodeMirrorEditorHandle` verbs
(`wrapSelection`, `prefixLine`, `insertBlock`, `getEditorView`) plus
`undo`/`redo` and `undoDepth`/`redoDepth` from `@codemirror/commands`.
`isEnabled("undo")` = `undoDepth(view.state) > 0`, `isEnabled("redo")` =
`redoDepth(view.state) > 0`. Add `isActive` where cheap (e.g. heading level from
the line prefix) and default `false` otherwise.

**Commit:** `feat(capture): codemirror adapter for the command registry`

### Task B-4: Rebuild `formatting-toolbar.tsx` on the registry

**Objective:** Delete `TipTapFormattingToolbarView` and
`CodeMirrorFormattingToolbarView`; render one list driven by `COMMAND_DEFS` and
the adapter chosen by mode.

**Files:**
- Modify: `packages/ui/src/capture/formatting-toolbar.tsx` (replace the two view
  functions with one `FormattingToolbarView` and one `SelectionToolbarView`)
- Test: `packages/ui/src/capture/blocks.test.tsx` (update selectors if needed)

**Acceptance:** the sticky row exposes the identical button set and shortcuts in
Normal, Markdown, and Text — one registry, adapter chosen by mode. The
`SelectionToolbar` bubble stays **Normal-mode only**, per `system-ux.md` §2
("Normal: … bubble menu"); the CM adapter still implements `run`/`isActive` so
the bubble can be extended later by a Designer/`@user` decision. The bubble's
existing table context controls (add/remove row/column, delete table) stay
TipTap-only in this slice and are not part of `COMMAND_DEFS`. The toolbar file
stays at `packages/ui/src/capture/formatting-toolbar.tsx`; only the registry and
adapters live under `capture/formatting/`. No command is mouse-only (QA §1.1).
Keyboard reachability preserved.

**Commit:** `refactor(capture): one formatting toolbar for both engines`

---

## 5. Phase C — Live-preview fidelity

### Task C-1: Viewport-scoped table decoration building

**Objective:** The inline pass already iterates `view.visibleRanges`. The
remaining whole-document cost is the table `StateField`:
`buildTablePreviewDecorations` calls `findTableBlocks(state.doc)` (every line)
and runs on **every** transaction that sets a selection — which is every click
and keystroke. Large notes must stop paying a whole-document table scan.

**Constraint:** table blocks are `Decoration.replace({ block: true })`, and
CodeMirror only accepts block decorations from a `StateField`. Viewport
awareness therefore has to reach the field without moving it: dispatch a small
`StateEffect` carrying `view.visibleRanges` from a view plugin on
`viewportChanged` (plus an initial dispatch), and have the field compute table
decorations for the visible ranges ± margin.

**Files:**
- Modify: `packages/ui/src/codemirror/live-preview/table/*`
  (`findTableBlocks` gains range-bounded reading; the `StateField` reads the
  viewport effect)
- Test: `packages/ui/src/codemirror/live-preview/table/decorations.test.ts`

**Test:** build a 5,000-line doc; assert the scanner visits only lines inside
`view.visibleRanges` ± margin (count via an injected line-collector), and that a
selection change does not rescan the whole document.

**Commit:** `perf(editor): viewport-scoped table decorations`

### Task C-2: `atomicRanges` for folded tokens

**Objective:** The caret can never land inside a hidden `**`/`` ` ``/fence.

**Files:**
- Modify: `packages/ui/src/codemirror/live-preview/decorations.ts`
- Test: `packages/ui/src/codemirror/live-preview/atomic-ranges.test.ts`

**Test:** place a replacement decoration over a token; assert
`EditorView.atomicRanges` moves the caret past it. Expose only the folded
(replace) ranges from the plugin — marks must not become atomic. Usage shape:
`EditorView.atomicRanges.of((view) => livePreviewFoldedRanges(view))`.

**Commit:** `feat(editor): atomic ranges over folded syntax tokens`

### Task C-3: `==highlight==` and `%%comment%%`

**Objective:** Render highlights and absorb comments (Obsidian's comment token is
hidden entirely).

**Files:** Modify `live-preview/{hide-rules,decorations,theme}.ts`; Test
`live-preview/highlight-comment.test.ts`.

**Test:** `==x==` renders `x` with `cm-live-highlight`; `%%hidden%%` renders
nothing; both unfold under the caret.

**Parity note:** Normal/Text modes keep the literal source (`StarterKit` has no
Highlight mark and `%%` is not a markdown construct). The bridge round-trips
both as plain text, so there is **no SoT change** and no data loss — this is a
Markdown-mode projection, not a new document feature.

**Commit:** `feat(editor): highlight and comment live-preview tokens`

### Task C-4: Callouts (`> [!note] Title`)

**Objective:** Detect callout headers and render a callout block with the kind
label hidden.

**Files:** Modify `live-preview/{hide-rules,widgets,decorations,theme}.ts`;
Test `live-preview/callout.test.ts`.

**Parity note:** the callout is a Markdown-mode projection of a `>` blockquote;
Normal mode shows the literal `> [!warning] Heads up` line. No SoT change.

**Test:** `> [!warning] Heads up` renders a warning callout; a plain `>` stays a
blockquote.

**Commit:** `feat(editor): callout live-preview rendering`

### Task C-5: Footnote refs (unresolved-link styling deferred with G-2)

**Objective:** Render `[^1]` references. The `is-unresolved` half of this task
**only applies to wikilinks** and is deferred with G-2 (v1 keeps `[[…]]`
literal text), so it is dropped here; if the backlog item is promoted later,
the resolution input arrives as a prop to `CodeMirrorEditor`
(e.g. `resolveLink?: (target) => boolean`) — **never** an API call from the
block.

**Files:** Modify `live-preview/{hide-rules,decorations}.ts`; Test
`live-preview/footnotes.test.ts`.

**Commit:** `feat(editor): footnote refs in live preview`

### Task C-6 (gated): Math and diagrams

**Objective:** If G-1 approves KaTeX/Mermaid, render `$…$`, `$$…$$`, and
` ```mermaid ` blocks as widgets.

**Files:** Create `live-preview/math.ts`, `live-preview/mermaid.ts`; Modify
`editor-extensions.ts`; Test `live-preview/math.test.ts`.
**Depends on:** G-1 pins for `katex`, `remark-math`, `rehype-katex`, `mermaid`
(`@user` answer 2026-10-10: gated); and an F-12 change so the **`Markdown`
render path** (answer prose/previews) renders the same syntax (otherwise
surfaces disagree). Editor-side note: `$…$` needs a Lezer markdown extension
and KaTeX CSS shipped with the app — budget for that, it is not just a widget.

**Commit:** `feat(editor): math and mermaid live-preview widgets`

### Task C-7: Inline image previews

**Objective:** Show `![alt](url)` as an image widget when the caret is away;
reveal source on touch. Reuse the F-12 URL rule, do not invent a second one:
`markdownSanitizeSchema` allows `src` schemes `http`/`https` only — `data:` is
refused there on purpose (SVG/script smuggling path), so the widget must not
allow it. Relative URLs carry no scheme and stay valid. This is untrusted
content (`architecture.md` §6).

**Files:** Modify `live-preview/widgets.ts`, `hide-rules.ts`; Test
`live-preview/image.test.ts`.

**Commit:** `feat(editor): inline image previews with scheme guard`

---

## 6. Phase D — Editing ergonomics

### Task D-1: Auto-pair brackets and markdown marks

**Objective:** `autoPairBrackets` / `autoPairMarkdown` from settings.

**Files:** Modify `editor-extensions.ts`; Test
`editor-extensions.pairing.test.ts`.
**Depends on:** G-1 pin for `@codemirror/autocomplete` (Phase E's pin already
covers this — `closeBrackets()` is exported from there; do not install
`@codemirror/closebrackets`, which is deprecated).

**Implementation:** two layers, because they are different mechanisms:
1. `autoPairBrackets` → `closeBrackets()` guarded by the settings compartment
   (brackets/quotes via language data).
2. `autoPairMarkdown` → a custom `EditorView.inputHandler` that inserts the
   four-character pair for `**`, `__`, `~~`, `==`, and the backtick pair, with
   the caret between them when the selection is empty and the next character is
   not already the pair. `closeBrackets()` alone cannot do multi-character
   markdown pairs.

**Test:** typing `(` inserts `()`; typing `**` at an empty selection inserts
`****` with the caret inside; `autoPairMarkdown: false` inserts `**` only.

**Commit:** `feat(editor): configurable bracket and markdown auto-pairing`

### Task D-2: Multiple selections and Alt-click

**Objective:** `EditorState.allowMultipleSelections.of(true)` +
`EditorView.clickAddsSelectionRange.of((event) => event.altKey)` (Alt-click),
matching Obsidian. The facet takes a predicate, not a boolean.

**Files:** Modify `editor-extensions.ts`; Test `editor-extensions.selection.test.ts`.

**Commit:** `feat(editor): multiple selections with alt-click`

### Task D-3: `useTab` / `tabSize` / indent unit facet

**Objective:** Tab behaviour and indent width driven by settings.

**Files:** Modify `editor-extensions.ts` (`indentUnit` facet from
`@codemirror/language` + `indentOnInput`; both already installed, no new pin);
Test `editor-extensions.indent.test.ts`.

**Test:** with `useTab:true, tabSize:4`, Tab inserts `\t`; with `useTab:false`,
four spaces.

**Commit:** `feat(editor): settings-driven indentation`

### Task D-4: Smart list indentation and continuation

**Objective:** `smartIndentList`: pressing Enter in a list continues it; Tab
nests; Backspace at an empty item outdents/removes (Obsidian behaviour).

**Reuse first (AGENTS.md extension-first rule):** `@codemirror/lang-markdown`
already exports `insertNewlineContinueMarkup` and `deleteMarkupBackward`
(and `markdownKeymap`), which cover Enter continuation and Backspace outdent.
Use them; write custom code only for what they do not cover (Tab/Shift-Tab
nesting and the settings gate).

**Files:** Create `codemirror/list-commands.ts` (only for the custom gap);
Modify `editor-extensions.ts`; Test `codemirror/list-commands.test.ts`.

**Commit:** `feat(editor): smart list indent and continuation`

### Task D-5: Indent guides and line numbers (settings-gated)

**Objective:** Optional `showIndentGuides` / `showLineNumbers`, off by default.

**Files:** Create `codemirror/gutters.ts`; Modify `editor-extensions.ts`; Test
`codemirror/gutters.test.ts`.

**Reuse check:** line numbers come from `lineNumbers()` in `@codemirror/view`
(installed). For indent guides, evaluate `@replit/codemirror-indentation-markers`
(MIT, 6.5.3) against a small custom `ViewPlugin` **before** writing one; if the
package is chosen, G-1 must pin it and the ledger must carry a row. Record the
decision either way in the task outcome.

**Commit:** `feat(editor): optional line numbers and indent guides`

### Task D-6: Bind the settings object into the surface

**Objective:** Expose `EditorSettings` through a `CapturePreferences` prop /
component state and reconfigure the settings compartment live (no view
rebuild). `@user` decided 2026-10-10: **prop/component state in v1**, no
persistence.

**Files:** Modify `capture-surface.tsx`, `cm-editor.tsx`; Test
`capture/capture-settings.test.ts`. **Do not** put settings in
`capture-store.ts` — its contract holds the save cycle only, and a second owner
of editor state would be a new source of truth.

**Acceptance:** toggling a setting reconfigures the compartment; caret and undo
history survive. Persistence (server or localStorage) remains an open question
and is **not** in this slice.

**Commit:** `feat(capture): live editor settings`

---

## 7. Phase E — `[[Wikilink]]` autocomplete (deferred; G-2 decision = v1 out of scope)

> **Not in this slice.** `@user` decided 2026-10-10 to keep `[[…]]` literal
> text in v1 (G-2). The two tasks below are kept as the ready-made design for
> when the backlog item is promoted; do not execute them under F-15.

### Task E-1: `@codemirror/autocomplete` completion source

**Objective:** Typing `[[` (and `![[`) opens a completion list from a
`searchNotes(query)` prop.

**Files:** Create `codemirror/wikilink-completion.ts`; Modify `editor-extensions.ts`,
`cm-editor.tsx`; Test `codemirror/wikilink-completion.test.ts`.
**Depends on:** G-1 pin `@codemirror/autocomplete`; G-2 representation choice
(decided 2026-10-10: **deferred** — re-open before executing this task).

**Test:** a stub `searchNotes` returning titles yields `Completion` items; the
inserted text matches the chosen G-2 representation.

**Commit:** `feat(editor): wikilink autocomplete`

### Task E-2: Hashtag/tag completion

**Objective:** `#` suggests existing tags from a `searchTags` prop.

**Files:** Modify `codemirror/wikilink-completion.ts`; Test as above.

**Commit:** `feat(editor): tag autocomplete`

---

## 8. Phase F — Power features

### Task F-1: In-editor find/replace

**Depends on:** G-1 pin `@codemirror/search`. Modify `editor-extensions.ts`
(`search({top:true})` + `searchKeymap`); Test `editor-extensions.search.test.ts`.

**Commit:** `feat(editor): find and replace`

### Task F-2: Heading and indent folding + fold gutter

**Objective:** `foldHeading` setting; fold service for headings and list blocks.

**Reuse note:** use `@codemirror/language`'s `codeFolding` / `foldGutter` /
`foldService` (already installed) and register only a markdown fold service
(headings, list blocks). Do not build a folding system.

**Files:** Create `codemirror/markdown-fold.ts`; Modify `editor-extensions.ts`;
Test `codemirror/markdown-fold.test.ts`.

**Commit:** `feat(editor): markdown heading/indent folding`

### Task F-3: Vim mode (gated by G-1)

**Depends on:** G-1 security/licence approval for `@replit/codemirror-vim`.
Modify `editor-extensions.ts` (keymap compartment swaps in `vim()` when
`settings.vimMode`); Test `editor-extensions.vim.test.ts`.

**Commit:** `feat(editor): optional vim keybindings`

---

## 9. Phase G — RTL and directionality

### Task G-R1: `perLineTextDirection` and `rightToLeft`

**Objective:** Enable CM6 per-line direction (`EditorView.perLineTextDirection`,
on for all locales, as in Obsidian). `rightToLeft` is **not** a user-preference
UI in v1: it is derived at the app boundary from the single locale source
(`apps/web/app/locale.ts` → `architecture.md` §8) and passed down as the
settings value. When set, add `dir="rtl"` via `EditorView.contentAttributes`.
Do not hardcode direction in components.

**Files:** Modify `editor-extensions.ts`, `cm-editor.tsx`; Test
`editor-extensions.direction.test.ts`.

**Test:** with `rightToLeft:false`, no `dir` on the content element; with `true`,
`dir="rtl"`.

**Commit:** `feat(editor): per-line text direction and RTL setting`

### Task G-R2: Directionality review across new UI

**Objective:** Audit every new class/token for logical properties (`ps-`/`pe-`,
`border-s`, `text-start`) and `bdi` isolation of identifiers/code/UGC
(`quality/ui-qa-checklist.md`, `architecture.md` §8).

**Files:** Modify `body-typography.ts`, `live-preview/*` (incl. `theme.ts`),
`formatting/formatting-toolbar.tsx`; Test
`packages/ui/src/codemirror/directionality.test.ts` (asserts no physical
`padding-left`/`text-align: left` in generated theme objects).

**Commit:** `fix(editor): logical CSS and isolation across editor UI`

---

## 10. Phase H — Hardening (production-readiness)

### Task H-1: Construct-level fidelity test matrix

**Objective:** One table-driven test per markdown construct (headings, emphasis,
inline code, fences, quotes, lists, tasks, rules, tables, links, images,
callouts, highlights, comments, footnotes) asserting folded + unfolded
appearance and that the source text is never mutated by decorations.

**Files:** Create `packages/ui/src/codemirror/live-preview/fidelity.test.ts`.

**Acceptance:** every construct has both an unfocused (folded) and focused
(unfolded) assertion; a document round-trips `view.state.doc` unchanged after
decoration.

**Commit:** `test(editor): markdown construct fidelity matrix`

### Task H-2: Interaction regression suite

**Objective:** Cover caret movement, Tab/Enter in lists and tables, undo/redo
across folds, paste, and mode switching without data loss.

**Files:** Create `packages/ui/src/codemirror/interaction.test.tsx`,
extend `packages/ui/src/capture/capture-modes.test.tsx`.

**Commit:** `test(editor): interaction regression suite`

### Task H-3: Accessibility pass

**Objective:** Verify per `quality/ui-qa-checklist.md`: focus order, labels,
`aria-readonly`, keyboard reachability of every toolbar command, code/table
overflow keyboard-scrollable, reduced motion.

**Files:** Create `packages/ui/src/codemirror/a11y.test.tsx`; fix findings.

**Commit:** `fix(editor): accessibility findings from checklist pass`

### Task H-4: Performance budget

**Objective:** Assert the decoration build cost stays bounded on a 5,000-line
document and that typing does not rebuild the view.

**Files:** Create `packages/ui/src/codemirror/perf.test.ts`.

**Test design (avoid flake):** primary assertions are structural — the scanner
visits only viewport-bounded ranges, and a keystroke does not dispatch a full
document scan (instrumented counters). A wall-clock assertion, if kept at all,
must use a generous budget and a median over several runs; plain
`performance.now()` budget checks are CI-dependent and will flake.

**Commit:** `perf(editor): guard decoration build cost`

### Task H-5: Full gate and docs

**Objective:** Run the full monorepo gate; update `now.md`, the lane head, and
`context.md`; close F-15.

Run: `pnpm nx run-many -t typecheck lint test build`
Expected: all pass.

**Commit:** `docs(tracks): close F-15 editor redesign`

---

## 11. Files likely to change

**New**
- `packages/ui/src/codemirror/editor-settings.ts` (+ test)
- `packages/ui/src/codemirror/editor-extensions.ts` (+ test)
- `packages/ui/src/codemirror/live-preview/{index,hide-rules,decorations,widgets,theme}.ts`
- `packages/ui/src/codemirror/live-preview/table/*`
- `packages/ui/src/codemirror/list-commands.ts`, `gutters.ts`,
  `markdown-fold.ts`, `directionality.test.ts`
- `packages/ui/src/capture/body-typography.ts` (+ test)
- `packages/ui/src/capture/formatting/{commands,tiptap-adapter,codemirror-adapter}.ts` (+ tests)
- Test files listed per task

**Modified**
- `packages/ui/src/codemirror/cm-editor.tsx`, `index.ts`;
  `markdown-live-preview.ts` is **deleted** by A-5
- `packages/ui/src/capture/formatting-toolbar.tsx`, `capture-surface.tsx`
  (`capture-store.ts` stays save-cycle-only per D-6)
- `packages/ui/package.json` (pinned deps only, after G-1)
- `docs/research/version-ledger.md`, `docs/design/system-ux.md`,
  `docs/design/now.md`, `docs/planning/implementation-tracks.md`,
  `context.md`, `docs/handoffs/current.md`,
  `docs/handoffs/active/lane-frontend.md`

**Explicitly untouched**
- `packages/ui/src/markdown/**` (F-12 render path) — except the F-12
  `Markdown` render-path math/mermaid change in C-6, which is a separate F-12
  decision.

---

## 12. Tests and validation

| Gate | Command | Where |
|---|---|---|
| Unit | `npx vitest run` | `packages/ui` |
| Single file | `npx vitest run src/codemirror/<file>.test.ts` | `packages/ui` |
| Typecheck | `npx nx typecheck ui` | repo root |
| Lint | `npx nx lint ui` | repo root |
| Full gate | `pnpm nx run-many -t typecheck lint test build` | repo root |
| Manual (F-11 later) | Playwright + axe journeys on mocks | `apps/web` |

Every task must leave `npx vitest run` (cwd `packages/ui`) and
`npx nx typecheck ui` (repo root) green. Governance tasks G-1…G-4 have no code
gate.

---

## 13. Risks, tradeoffs, open questions

**Risks / tradeoffs**
- **Parser divergence.** Obsidian bridges CM5 `hypermd` into CM6; OmniDoc uses
  Lezer `@codemirror/lang-markdown`. Fidelity will differ at the edges (e.g.
  Obsidian-specific tokens). Accepted — Lezer is better-modelled and we control
  the `HIDE_RULES`.
- **Two-source look.** Until A-2 lands, typography can drift between modes.
- **`tiptap-markdown` vs `@codemirror/lang-markdown`.** Markdown is written by
  one and parsed by the other; any construct that one supports and the other does
  not will break round-trips. The H-1 matrix is the guard; wikilinks are
  deferred (G-2), and math needs bridge support if C-6 is approved.
- **Performance.** The table `StateField`'s whole-document scan is the main
  production cost driver; C-1 and H-4 are the mitigations.
- **Mode-projection divergences.** `==highlight==`, `%%comments%%`, callouts,
  and (if approved) math/mermaid render in Markdown mode only in this slice;
  Normal mode keeps the literal source. Round-trips stay lossless as text
  (H-1), but the modes are not pixel-identical for these constructs — accepted.
- **Vim/math/mermaid** add dependencies and (for mermaid/math) untrusted-content
  rendering — both gated behind G-1 and an F-12 decision.
- **Scope.** This is a multi-week redesign. Phase A+B deliver the structural win
  (unified toolbar, maintainable extension model) and should ship first.

**Open questions / resolved decisions**
1. **G-2 — resolved 2026-10-10:** wikilinks deferred; `[[…]]` stays literal
   text in v1. Phase E is deferred, not executed; the unresolved-link half of
   C-5 drops with it.
2. **G-1:** vim, math (KaTeX), and mermaid stay **gated** (`@user`,
   2026-10-10) — each still needs an explicit yes/no plus a pin before any
   install; C-6 and F-3 are conditional on that answer.
3. **Editor settings persistence — resolved 2026-10-10:** prop/component state
   only in v1; no server or localStorage persistence. Revisit only with a
   concrete need (it would touch `system-ux.md`, which says nothing about
   editor preferences today).
4. **Reading mode — resolved:** there is no capture mode named Reading
   (`@user` removed it 2026-10-01; G-4 syncs the contract). The F-12
   `Markdown` render path is a component consumed by previews/answer prose;
   if math/mermaid are approved (C-6), that render path needs the same
   syntax — that stays an F-12-scoped decision.
5. **Resolved:** Text mode **is** the Obsidian "Live Preview off"/source mode.
   The unfocused-or-locked live preview is the other state; no fourth mode is
   needed.

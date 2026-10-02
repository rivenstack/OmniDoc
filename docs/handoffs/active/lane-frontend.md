---
handoff_id: H-2026-10-02-P1-F14
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-14"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-10-02
updated: 2026-10-02
---

# F-14 — Markdown & editor tables

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-14 exactly. Install pinned @tiptap/extension-table* packages (3.31.3), wire the extensions into the ProseMirror schema and the bidirectional markdown-bridge, implement table horizontal scroll containment, add the interactive table popover and contextual selection bubble controls, and support live preview GFM table reveal rules. Run the full test gate.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end programmer. **allowed_task_classes:** `F-14` only.

Implement rich Markdown and GFM tables across TipTap Normal mode, CodeMirror Markdown live preview, Text mode, and the bidirectional JSON ↔ Markdown bridge.

## Required Reading

1. `architecture.md` §2, §6 (Markdown projection, sanitization, isolation)
2. `quality/ui-qa-checklist.md` §6.4 (narrow-viewport horizontal scroll containment, accessible name, focusable container)
3. `docs/design/now.md` (F-14 decisions: default 3x3 table insertion + interactive size popover, floating selection bubble controls)
4. `docs/research/version-ledger.md` (pinned versions for `@tiptap/extension-table*` at 3.31.3)
5. `packages/ui/src/capture/capture-surface.tsx`, `markdown-bridge.ts`, `formatting-toolbar.tsx`, `packages/ui/src/codemirror/markdown-live-preview.ts`

## Inputs / Evidence

- BL-20 promoted to F-14 following `@user` approval (2026-10-02)
- TipTap core and starter-kit pinned at 3.31.3
- `tiptap-markdown` 0.9.0 includes table serializing and parsing support when schema contains table nodes
- GFM table grammar parsed by `@codemirror/lang-markdown` via Lezer markdown GFM bundle

## Task details

| Concern | This task |
| --- | --- |
| Dependencies | Install `@tiptap/extension-table@3.31.3`, `@tiptap/extension-table-row@3.31.3`, `@tiptap/extension-table-cell@3.31.3`, `@tiptap/extension-table-header@3.31.3` in `packages/ui` |
| Data bridge | Register table extensions in `createConverterEditor` (`markdown-bridge.ts`) so `proseMirrorToMarkdown` and `markdownToProseMirror` preserve table structures without loss |
| Normal mode | Register table extensions in `CAPTURE_EXTENSIONS` (`capture-surface.tsx`). Add Mintlify styling and accessible horizontal scroll containment in `CAPTURE_BODY_CLASSES` |
| Toolbar | Add quick default 3x3 table insertion button and interactive size popover (rows x cols) to `formatting-toolbar.tsx` |
| Bubble menu | In `SelectionToolbarView`, detect table node selection and expose row/column insertion and deletion tools |
| Markdown mode | Add GFM table support to `markdown-live-preview.ts` under Obsidian reveal rules |
| A11y & QA | Verify `quality/ui-qa-checklist.md` §6.4 (mobile ~390px scroll containment, focusable keyboard navigation `tabIndex={0}`, logical CSS) |
| Tests | Unit tests in `markdown-bridge.test.ts`, mode switching in `capture-modes.test.tsx`, toolbar in `blocks.test.tsx` |

## Allowed Write Paths

- `packages/ui/**`
- `docs/handoffs/active/lane-frontend.md`
- `docs/design/now.md`
- `context.md`
- `docs/memory/implementer.md`

## Acceptance Criteria

- Markdown tables round-trip losslessly between ProseMirror JSON and Markdown text via `markdown-bridge.ts`
- Tables can be inserted in Normal mode via default button or size popover
- Table cell selection displays floating bubble actions (add/remove row, add/remove col, delete table)
- CodeMirror Markdown live preview formats GFM tables and unfolds into raw pipes when selection touches a row
- Wide tables scroll internally without page widening or clipping on mobile (~390px viewport, `ui-qa-checklist.md` §6.4)
- Full monorepo check passes: `pnpm nx run-many -t typecheck lint test build`

## Outcome

Completed 2026-10-02 by `/implementer` & `/phase-check`.

1. **Dependencies:** Installed `@tiptap/extension-table@3.31.3`, `@tiptap/extension-table-row@3.31.3`, `@tiptap/extension-table-cell@3.31.3`, and `@tiptap/extension-table-header@3.31.3` in `packages/ui` (matching `@tiptap/core` 3.31.3 pin).
2. **Components:** Created `packages/ui/src/components/popover.tsx` wrapping `@base-ui/react/popover` for the interactive table size matrix.
3. **Data Bridge:** Wired named table extensions into `createConverterEditor` (`packages/ui/src/capture/markdown-bridge.ts`). Tested round-trip GFM table Markdown ↔ ProseMirror JSON in `markdown-bridge.test.ts`.
4. **Normal Mode:** Configured Table extensions in `CAPTURE_EXTENSIONS` (`capture-surface.tsx`) with `renderWrapper: true`, horizontal scroll containment (`.tableWrapper: overflow-x-auto max-w-full`), logical CSS (`text-start`, `border-border`), and semantic tokens.
5. **Formatting Toolbar:** Added interactive `TableSizePicker` popover (up to 6x6 matrix hover picker) alongside quick 3x3 default table button for both TipTap and CodeMirror views.
6. **Selection Bubble Toolbar:** Added table node detection (`editor.isActive("table")`) exposing row insertion/removal, column insertion/removal, and table deletion tools.
7. **CodeMirror Markdown Live Preview:** Extended `markdownLivePreviewPlugin` in `markdown-live-preview.ts` to style `TableHeader`, `TableRow`, and fold `TableDelimiter` into subtle divider lines when unselected, unfolding raw pipes when cursor touches the row.
8. **Verification:**
   - Full monorepo gate check passed 16/16 (`pnpm nx run-many -t typecheck lint test build`).
   - Monorepo unit tests passed 5/5 projects cleanly (`--skip-nx-cache`), 376/376 UI tests green.
   - Tested table creation and mode-switch preservation in `capture-modes.test.tsx`.


---
handoff_id: H-2026-10-01-P1-F13
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-13"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-10-01
updated: 2026-10-01
---

# F-13 — Multi-mode capture & markdown editing

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-13 exactly. Implement the multi-mode capture & markdown editing architecture (Option A.2): Normal (TipTap WYSIWYG), Markdown (CodeMirror 6 inline live preview), Text (CodeMirror 6 raw source), plus the note lock control. Bridge ProseMirror JSON to/from Markdown via tiptap-markdown 0.9.0. Unify the formatting toolbar across editors. Do not touch apps/api, packages/mocks, packages/contracts authorship, docs/adr/**, docs/handoffs/current.md, or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end programmer. **allowed_task_classes:** `F-13` only.

Provide power-user markdown authoring without compromising the ProseMirror JSON durable store of truth (ADR-0001 §2). Support three live editing modes (**Normal**, **Markdown** inline live preview with Obsidian reveal rules, and **Text** raw monospace markdown source) plus a **Lock** control that renders the note read-only.

## Required Reading

1. `architecture.md` §6 — Markdown / XSS: sanitize render pipeline; isolation for identifiers, code tokens, URLs.
2. ADR-0001 §2 — ProseMirror JSON is the durable database SoT; markdown is a projection synchronized bidirectionally.
3. `docs/design/system-ux.md` §1 & §2 — capture and notes contracts, editor modes.
4. `docs/design/now.md` — Option A.2 decision log and review fixes (three modes + lock).
5. `quality/ui-qa-checklist.md` §1, §4, §6.

## Deliverables

1. Pinned installs in `packages/ui`: `codemirror@6.0.2`, `tiptap-markdown@0.9.0`.
2. Bidirectional markdown bridge: `packages/ui/src/capture/markdown-bridge.ts`.
3. CodeMirror 6 engine with Obsidian-style inline live preview plugin (`packages/ui/src/codemirror/`).
4. Editor mode switcher menu (Normal, Markdown, Text) + note lock button (`packages/ui/src/capture/editor-mode-switcher.tsx`).
5. Unified formatting toolbar working across TipTap and CodeMirror modes (`packages/ui/src/capture/formatting-toolbar.tsx`).
6. Integration into `CaptureSurface` with synchronized autosave, debounce, and focus management.
7. Comprehensive test coverage for bridge, CodeMirror, mode switching, and capture surface.

## Allowed Write Paths

- `packages/ui/**` (`src/capture/**`, `src/codemirror/**`, `package.json`, `src/index.ts`, `src/styles/globals.css`)
- `apps/web/next-env.d.ts`
- `docs/research/version-ledger.md`
- `docs/handoffs/active/lane-frontend.md`
- `docs/design/now.md`
- `context.md`
- `docs/memory/implementer.md`

**Must not touch:** `apps/api/**`, `docs/api/**`, `docs/adr/**`, `packages/contracts/**`, `packages/mocks/**`, `lane-backend.md`.

---

## Outcome

**Completed 2026-10-01.** Branch `develop` (commits `3c170f9`, `103d4d3`, `fe5a97f`).

### Delivered

| Deliverable | Where |
| --- | --- |
| Pinned dependencies | `packages/ui/package.json`, `docs/research/version-ledger.md` (`tiptap-markdown` 0.9.0, `codemirror` 6.0.2) |
| JSON ↔ Markdown bridge | `packages/ui/src/capture/markdown-bridge.ts` |
| CodeMirror 6 engine & live preview | `packages/ui/src/codemirror/cm-editor.tsx`, `markdown-live-preview.ts` |
| Mode switcher menu + Lock control | `packages/ui/src/capture/editor-mode-switcher.tsx` |
| Unified formatting toolbar | `packages/ui/src/capture/formatting-toolbar.tsx` |
| CaptureSurface integration | `packages/ui/src/capture/capture-surface.tsx` |
| Tests | `capture-modes.test.tsx`, `cm-editor.test.tsx`, `markdown-bridge.test.ts` (373 ui tests pass) |

### Verified

- `nx run-many -t typecheck lint test build --projects=ui,web,contracts,mocks` passes completely.
- TipTap Normal mode, CodeMirror Live Preview (Markdown), and CodeMirror Raw Source (Text) render correctly.
- Obsidian reveal rules verified: syntax markers fold/preview when unfocused and expand when cursor is present.
- Note lock button toggles read-only state across all modes, hiding toolbars and disabling input.
- Autosave debounce and concurrency conflict resolution work seamlessly across all editing modes.

### Next handoff

**Commander's call.** The standing candidate is **F-05 (organize)**, still blocked on the S-02 collections gap. Do not open F-05 or F-06 without an authorising handoff.

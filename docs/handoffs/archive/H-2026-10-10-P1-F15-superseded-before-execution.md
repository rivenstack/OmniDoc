---
handoff_id: H-2026-10-10-P1-F15
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "F-15"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-10-10
updated: 2026-10-11
archived: 2026-10-11
---

# F-15 — Obsidian-parity capture editor redesign

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-15 exactly, beginning with Phase A Task A-1 of docs/plans/2026-10-10_104547-obsidian-parity-editor-redesign.md. One bite-sized task at a time; commit after each; every task ends green before the next begins.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end programmer. **allowed_task_classes:** `F-15` only.

Replace the ad-hoc CodeMirror 6 live preview with a single Obsidian-fidelity markdown editing engine, and drive it and TipTap from **one** command/toolbar surface, per the plan of record:
[`docs/plans/2026-10-10_104547-obsidian-parity-editor-redesign.md`](../plans/2026-10-10_104547-obsidian-parity-editor-redesign.md).

Governance tasks **G-1…G-4 are complete** (2026-10-10): editor pins recorded in `docs/research/version-ledger.md`, the `[[wikilink]]` v1 deferral recorded, F-13/F-14 reconciled to `completed`, and the capture mode contract synced to three modes + lock. Begin at **Phase A, Task A-1**.

## Required Reading

1. `docs/plans/2026-10-10_104547-obsidian-parity-editor-redesign.md` — the full plan (phases A–H, per-task steps and commits)
2. `architecture.md` §2 (ProseMirror JSON SoT), §6 (sanitization / untrusted content), §8 (directionality)
3. `docs/design/system-ux.md` §1/§2 (three modes + lock contract)
4. `docs/design/now.md` (F-13/F-14 decisions this builds on)
5. `docs/research/version-ledger.md` — editor package rows (G-1)
6. `quality/ui-qa-checklist.md`
7. `packages/ui/src/codemirror/cm-editor.tsx`, `markdown-live-preview.ts`; `packages/ui/src/capture/capture-surface.tsx`, `formatting-toolbar.tsx`, `markdown-bridge.ts`

## Inputs / Evidence

- REA static analysis of Obsidian 1.14.4 (evidence ID `ev_c7f5023cbab1916ee56d4fcc8326a157e59cb79ab35cd88e4765949144f207f0`, bundle `/tmp/opencode/obsidian-1.14.4-bundle.json`) — behaviour only; no Obsidian code, CSS, or assets copied (licensing boundary)
- F-13 delivered commits `3c170f9` / `fe5a97f` / `acaa031`; F-14 completed 2026-10-02
- Existing regression net: `cm-editor.test.tsx` and `table-preview.test.tsx` must stay green throughout

## Allowed Write Paths

- `packages/ui/src/capture/**`
- `packages/ui/src/codemirror/**`
- `packages/ui/package.json` — **pinned deps only**, and only the G-1 ledger candidate rows (`@codemirror/autocomplete` 6.20.3, `@codemirror/search` 6.7.2) at their recorded versions, after Architect confirmation; no other dependency may be added
- `docs/handoffs/active/lane-frontend.md`
- `docs/design/now.md`
- `context.md`
- `docs/memory/implementer.md`

## Out of Scope

- `packages/ui/src/markdown/**` (F-12 render path) — untouched, except the gated C-6 math/mermaid change, which is **not** in this slice
- Backend lane, `docs/api/**`, `packages/contracts/**`
- ADR authorship/amendment (Architect only); production AI activation; RTL locale claims
- Vim mode (F-3), math/mermaid (C-6), `[[wikilink]]` autocomplete (plan Phase E) — all gated/deferred; do not install their packages

## Deliverables

Phases A–H of the plan, in order, one commit per task:

- **A** foundation: `EditorSettings`, shared body typography, extension factory + Compartments, live-preview module split (no behaviour change)
- **B** one formatting toolbar for both engines (command registry + TipTap/CodeMirror adapters)
- **C** live-preview fidelity (viewport-scoped tables, `atomicRanges`, highlight/comment, callouts, footnotes, images)
- **D** editing ergonomics (auto-pairing, multiple selections, indentation, smart lists, gutters, live settings)
- **F** power features (find/replace, folding) — vim stays gated
- **G** per-line direction + directionality audit
- **H** hardening (fidelity matrix, interaction suite, a11y pass, perf budget, full gate + docs)

## Constraints and Prohibited Decisions

- One bite-sized task per commit; each task ends green (`npx vitest run` cwd `packages/ui`; `npx nx typecheck ui` repo root) before the next begins
- ProseMirror JSON stays the durable SoT; markdown stays a derived projection; the block never calls the API
- No new dependency outside the G-1 ledger rows; rejected or deferred packages must not appear in `packages/ui/package.json`
- Logical CSS only; locale-driven direction; `bdi` isolation for identifiers/code/UGC; no physical-direction JS
- Accessibility is a release gate (focus order, keyboard, labels, reduced motion, contrast), not a cosmetic pass
- Do not self-approve governance items; Architect / Designer / Commander own those

## Acceptance Criteria

- Every plan task lands with its named commit; `npx vitest run` (packages/ui) and `npx nx typecheck ui` green at each step
- Full monorepo gate green at H-5: `pnpm nx run-many -t typecheck lint test build`
- User-facing behaviour of F-13/F-14 preserved (three modes + lock, tables, live preview); the H-1 fidelity matrix proves constructs round-trip
- The toolbar exposes the identical button set and shortcuts in Normal, Markdown, and Text; no command is mouse-only
- RTL-readiness and a11y checks pass per `quality/ui-qa-checklist.md`; no RTL locale support claimed

## Stop / Escalate Conditions

- **Soft-stop:** a cross-lane or infra dependency blocks (e.g. an F-12 render-path change for C-6 — gated anyway)
- **Hard-stop:** write collision with another lane, an ADR reopen, any production AI activation, any RTL-shipped claim, or a dependency outside the G-1 pins
- Escalate to `/commander` via `docs/handoffs/current.md`; do not reassign work silently

## Gates

- Production AI/provider activation remains gated
- RTL locale remains deferred (readiness discipline required)
- Vim, math (KaTeX), and mermaid remain gated (`@user` 2026-10-10) — no install without an explicit yes plus a pin
- `[[wikilink]]` stays literal text in v1 (G-2)

## Completion Instructions

On completion of the final task (H-5): archive this handoff to
`docs/handoffs/archive/H-2026-10-10-P1-F15-commander-implementer.md`,
rewrite `docs/handoffs/active/lane-frontend.md` with the next track ID
(or leave the lane head marked completed for Commander), update
`context.md`, and record durable lessons in `docs/memory/implementer.md`.
Same-lane iteration continues until a cross-lane dependency soft-stops
the lane.

## Outcome — superseded before execution (Commander, 2026-10-11)

Governance tasks **G-1…G-4 completed** on branch
`f15-editor-redesign-governance` (2026-10-10): editor package rows in
`docs/research/version-ledger.md` (candidates `@codemirror/autocomplete`
6.20.3 + `@codemirror/search` 6.7.2 pending Architect confirmation; vim,
math, and mermaid explicitly gated), the `[[wikilink]]` v1 deferral
recorded in the capture-mode contract, **F-13/F-14 reconciled to
`completed`**, and the **three capture modes + lock** contract synced
into `docs/design/system-ux.md`. Those records were merged into
`develop` through the Commander reconciliation of 2026-10-11
(six shared-doc conflicts resolved; `docs/design/now.md` kept the F-15
restructure plus F-05's records).

The implementation phases (**A–H** of
`docs/plans/2026-10-10_104547-obsidian-parity-editor-redesign.md`)
**never began — no F-15 code exists**. Commander re-sequenced the
frontend lane: **F-06 (retrieve)** takes the live lane head because it
is dependency-ready (S-02 search + B-07 completed) and is a core
Phase 1 CX journey. F-15 returns to **`listed`** in
`docs/planning/implementation-tracks.md` with governance complete and
the plan preserved as the editor redesign's plan of record.

This archive is **not** an acceptance of F-15 work. Reopen F-15 only
through Commander sequencing; do not execute plan phases from a lane
head assigned to another task.

---
handoff_id: H-2026-09-25-P1-F05
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "F-05"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-09-25
updated: 2026-09-27
---

# F-05 — Organize (inbox, notes list, collections)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-05 exactly. Build organize on the frontend lane: Inbox as the unfiled home and the Notes list, over the S-02 listNotes contract, with structure from docs/design/system-ux.md §1–§2. Every visual block needs a @user reference (link, pasted code, or a prompt — image welcome) before building; offer options otherwise. Soft-stop the Collections assignment sub-slice: S-02 has no collections/tags endpoint and Note carries no collection/tag field — do not fork a client-side shape. Do not open F-06. Do not touch apps/api, packages/mocks, packages/contracts authorship, docs/api/**, docs/handoffs/current.md, or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-05` only.

Make organize real: **Inbox** is the unfiled home, **Notes** lists all notes
in the workspace, rows open the capture surface, and both lists are
server-first with honest empty / loading / error / indexing states.
Collections (optional light folders or tags) is a **contract-blocked
sub-slice** — record the soft-stop and stay honest; do not invent it.

## Required Reading

1. `docs/design/system-ux.md` §1 (Inbox / Notes / Collections contract) and
   §2 (capture and notes; indexing visibility; tenancy)
2. `docs/design/now.md` — the visible plan; log reference choices
3. This file
4. `context.md` (read-only)
5. ADR-0003 — RSC + Server Actions first; Zustand only if shared state is real
6. `docs/api/openapi.yaml` — `listNotes`
   (`/api/v1/workspaces/{workspaceId}/notes`), `NotePage`, `PageLimit`,
   `PageCursor`, and `Note` (**no** collection/tag field) + `packages/contracts`
7. F-04 archive
   `docs/handoffs/archive/H-2026-09-24-P1-F04-implementer-implementer.md` — the
   notes port, save cycle and generic denials to reuse
8. `packages/ui/**` — capture blocks, shell blocks, `denials.ts`; reuse them
9. `quality/ui-qa-checklist.md` §1.4, §2.x, §5, §6 (a11y release gate)

## Inputs / Evidence

- F-04 **completed** 2026-09-25 (capture; notes port; `/notes/new` +
  `/notes/[noteId]`). Archive:
  `docs/handoffs/archive/H-2026-09-24-P1-F04-implementer-implementer.md`
- S-02 canonical contracts **completed** — `listNotes` with `PageLimit` /
  `PageCursor`; `NotePage` = `{ items: Note[], nextCursor }`
- B-04 notes CRUD **live**; S-03 fixtures **completed** (still need the
  `web → mocks` exception for in-app MSW)
- **Existing stubs to replace** (each says "arrives with F-05"):
  `apps/web/app/(app)/inbox/page.tsx`, `notes/page.tsx`, `collections/page.tsx`
- **Collections gap:** `docs/api/openapi.yaml` has **no** `collections`/`tags`
  operation and `Note` carries **no** collection/tag field. `system-ux.md` §1
  makes Collections a system contract, so adding it is a **contract change** —
  not this lane's to author

## Task details

| Concern | This task |
| --- | --- |
| API connections | Notes **port** over S-02: extend `apps/web/app/lib/notes/notes-api.ts` with `listNotes` (workspace-scoped, `limit`/`cursor`). Consume `@omnidoc/contracts` types only; no shape forks. Send the workspace selector header — the server re-binds membership. MSW fixtures **once the `web → mocks` exception exists**; otherwise adapter-first and soft-stop the MSW sub-slice |
| IA | Inbox = unfiled home; Notes = all notes, distinct from Inbox. `New note` still lands straight in the editor |
| State | Server-first lists (RSC / server actions). Selection/hover state local. No client cache library |
| Indexing | Rows reflect indexing state where the contract returns it; an incomplete index is **never** presented as complete (`system-ux.md` §2) |
| Workspace scope | Re-resolve membership server-side; a rejected workspace renders the **generic** denial and never reveals existence |
| Locale / direction | `lang`/`dir` from `apps/web/app/locale.ts` only; logical CSS (`ps/pe/ms/me`, `text-start/end`); `bdi` around identifiers/UGC (titles, snippets) |
| Accessibility | Keyboard-operable rows/links, real list semantics, focus order, skip link intact, no focus trap; empty/loading states announced appropriately; reduced motion respected |
| Look | References `@user` supplies per block (list row, inbox empty state, collection tree). No palette invention; token values change only through the token layer |

## Reference protocol (per visual block)

Blocks in scope: list row, inbox/notes list container + its states, empty
state, pagination / "load more" affordance, collection tree (blocked).

1. Before building a block's UI, ask `@user`: *do you have a reference — a
   link, pasted code, or a prompt (image welcome) — for this?*
2. No reference → offer 2–3 options and wait.
3. Log each choice in `docs/design/now.md` (Decisions log).
4. **Not** visual choices, build without asking: list semantics, the generic
   forbidden copy, indexing-completeness honesty, focus order, and the
   RTL-readiness discipline.

## Allowed Write Paths

- `packages/ui/**` (organize/list blocks as copy-in blocks; no token edits)
- `apps/web/**` (inbox / notes / collections routes, list access over the
  notes port)
- `docs/frontend/README.md` (landed conventions only)
- `docs/handoffs/active/lane-frontend.md` (status, Outcome)
- `docs/design/now.md` (Decisions log + Current slice lines)
- `context.md` (status lines only)
- `docs/memory/implementer.md` (durable lessons only)

**Must not touch:** `apps/api/**`, `docs/api/**`, `docs/adr/**`,
`docs/design/system-ux.md`, `packages/mocks/**` authorship,
`packages/contracts/**` authorship, `docs/handoffs/current.md`,
`docs/handoffs/active/lane-backend.md`, `docs/planning/**` (status lines
exception), `packages/ui/src/styles/tokens.css`.

## Out of scope

- Retrieve (F-06), ask (F-07), dual-mode chrome (F-08), sample path (F-09),
  a11y sweep (F-10), Playwright (F-11)
- Search/Ask surfaces; any index-status invention beyond what the contract
  returns
- Collections/tags **API or schema authorship** — that is a contract change
  (escalate)
- Production AI; RTL locale; AWS / DevOps I-*
- Token values, palettes, motion systems (references first)

## Deliverables

1. **Inbox** route: the unfiled home, listing notes via `listNotes`, with
   empty / loading / error / indexing states.
2. **Notes** route: all notes in the workspace, distinct from Inbox, paginated
   via `nextCursor`.
3. **List rows**: keyboard-operable, contract-typed, opening the note through
   the capture route; `bdi`-isolated titles; long/unbroken titles do not break
   layout (~390px included).
4. A **Collections** route that is honest: no folders/tags can be created or
   assigned yet, and the UI says so rather than faking a model.
5. Tests (Vitest): list rendering (empty / loading / error), pagination,
   generic denial on a rejected workspace, row keyboard activation,
   indexing-not-complete honesty, logical-CSS/`bdi` expectations where
   feasible.
6. Outcome here; decision log rows in `now.md`; status in `context.md`.

## Constraints / Prohibited Decisions

- Do not fork OpenAPI or `@omnidoc/contracts`; escalate mismatches
- Do not invent a client-side collections/folders/tags model
- Do not present an incomplete index as complete
- Do not reveal whether a forbidden workspace exists
- Do not add tokens or edit `tokens.css`
- Do not author fixtures, OpenAPI, or Java code
- Do not import provider SDKs into `apps/web` / `packages/ui`
- Do not claim RTL locale support
- Do not activate production AI
- Do not reproduce D-01 layouts

## Acceptance Criteria

- Inbox and Notes are reachable, server-backed lists over `listNotes`; rows
  open the note
- A note can still be captured without choosing a folder or tag first (F-04
  behaviour intact)
- Empty / loading / error states are present and honest; a rejected workspace
  shows the generic denial only
- No client-side collections shape exists; the Collections route states the
  gap instead
- Keyboard-only list operation with no focus trap; real list semantics; focus
  visible
- Single `lang`/`dir` source; logical CSS; `bdi` on titles/UGC
- Each built block has a logged `@user` reference or logged choice
- Contracts consumed as generated types; no local shape forks
- `packages/ui` + `apps/web` typecheck, lint, tests, build green
- `current.md`, backend lane, contracts, mocks authorship untouched

## Stop / escalate conditions

- **Soft-stop:** Collections has no S-02 contract (no endpoint, no `Note`
  field) → build the honest Collections placeholder, log the gap in `now.md`,
  and escalate the **contract change** to Commander; do not fork a shape
- **Soft-stop:** the `web → mocks` import exception is not authorized → build
  against the notes port, log the wiring gap, stop the MSW sub-slice (not the
  task)
- **Soft-stop:** a block has no reference and `@user` is unavailable → stop
  that block, log the open choice
- **Soft-stop:** `listNotes` cannot express the Inbox/Notes split or
  pagination without a contract change → log it and escalate to Commander
  rather than inventing a client-side shape
- **Hard-stop:** markdown/HTML becoming the stored body; a pin bump; client
  auth or provider SDKs; ADR reopen; production AI activation; claiming RTL
  shipped

## Dependencies / Risks

- Depends on: F-04 (completed), S-02 `listNotes` (completed), B-04 live notes
- Blocks: F-06 (retrieve), then F-07+
- Parallel: backend lane (B-05 ingestion) — no mutual dependency
- Risk: **with no collections, Inbox (unfiled) and Notes (all) are the same
  set.** Do not fabricate a difference — be honest, and treat the Collections
  contract as the fix
- Risk: pagination cursors must come from the server; do not synthesize a
  cursor client-side
- Risk: reinstating a client-side "collection" from the shell's existing
  Collections submenu would fork a second model

## Gates

- Production AI activation remains gated
- RTL locale remains deferred (readiness discipline applies)
- Collaborative editing stays an open gate
- UT-* remain unrun
- Design language: **Mintlify**; per-block references still required
- **Collections contract** — open; needs an `@user` / Commander sequencing
  decision (new track or an S-02 extension) before folders/tags can be built

## Completion Instructions

1. Complete deliverables inside Allowed Write Paths.
2. Append Outcome; set `status: completed`.
3. Archive to
   `docs/handoffs/archive/H-2026-09-25-P1-F05-implementer-implementer.md`
   (immutable).
4. **Same-lane sequence rule:** on completion, rewrite this path to
   **F-06 (retrieve)** using the same format. If a cross-lane dep is unmet,
   log the soft-stop instead.
5. Durable lessons only in `docs/memory/implementer.md`.
6. Do not overwrite `current.md` or `lane-backend.md`; update `context.md`
   status lines only.

---

## Outcome

**Superseded before execution — 2026-09-27. `status: blocked`.**

No F-05 work was ever written: the `F05-organize-lists` branch carried no
commits ahead of `develop` (`git log develop..F05-organize-lists` returned
nothing), so nothing was stranded, half-built, or lost. This handoff is
archived rather than executed.

What replaced it: `@user` triaged backlog `BL-19`, Commander promoted it into
`implementation-tracks.md` as **F-12 (sanitized markdown render pipeline)**, and
F-12 took the frontend lane head on the same day. The sequencing change was a
`@user` decision, not an abandonment of organize work.

**F-05 is not cancelled.** It returns to `listed` in
`implementation-tracks.md` and remains blocked on the same open item recorded
in this file: S-02 has no `collections`/`tags` operation and `Note` carries no
collection/tag field, so the folders/tags sub-slice cannot be built honestly.
Whoever opens F-05 next should re-issue a fresh handoff from the track block
rather than resurrect this file — the write paths, the S-02 state, and the
lane sequence may all differ by then.

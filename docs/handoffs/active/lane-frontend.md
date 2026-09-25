---
handoff_id: H-2026-09-24-P1-F04-implementer-implementer
affinity: implementation
track: parallel
status: in-progress
phase: "1"
task: "F-04"
lane: frontend
human_owner: front-end-programmer
from: implementer
to: implementer
created: 2026-09-24
updated: 2026-09-25
---

# F-04 — Capture (TipTap)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-04 exactly. Build note capture (title + rich body, autosave, save states) against the notes HTTP contract from S-02, with structure from docs/design/system-ux.md §2. For every visual block, ask @user for a reference (link, pasted code, or a prompt — image welcome) before building it. UI details stay open; do not follow D-01 layouts or inventory. Do not open F-05. Do not touch apps/api, packages/mocks, packages/contracts authorship, docs/handoffs/current.md, or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-04` only.

Make capture real: **New note lands directly in the editor**, a note is
created with a title and body only, edits autosave, and the save state is
honest (idle / saving / saved / conflict). Structure and behaviour come from
`docs/design/system-ux.md` §2 and `architecture.md` §3; **UI details stay open**
and each visual block needs a `@user` reference.

## Required Reading

1. `docs/design/system-ux.md` §2 (capture and notes) — the binding behaviours
2. `docs/design/now.md` — the visible plan; log reference choices
3. This file
4. `context.md` (read-only)
5. ADR-0001 §2 — TipTap 3.31.3; **ProseMirror JSON is the source of truth**;
   markdown exists only as a projection through one canonical serializer
6. ADR-0003 — Zustand 5.0.15 for editor/UI state; RSC + Server Actions first
7. `docs/api/openapi.yaml` + `packages/contracts` — notes CRUD + version
   concurrency (`Note`, `CreateNoteRequest`, `UpdateNoteRequest`, `ErrorBody`)
8. `docs/research/version-ledger.md` — the TipTap / Zustand pins
9. `packages/ui/**` — existing primitives and shell blocks; reuse them
10. `quality/ui-qa-checklist.md` §1.4, §2.4, §3.3, §5, §6 (a11y release gate)

## Inputs / Evidence

- F-03 completed 2026-09-24 (session entry, sign-in, sign-out). Archive:
  `docs/handoffs/archive/H-2026-09-23-P1-F03-user-implementer.md`
- S-02 canonical contracts **completed**; B-04 notes CRUD + version
  concurrency **completed** and live
- S-03 deterministic mock corpus **completed** (note fixtures available)
- **TipTap and Zustand are pinned but not installed** — no `@tiptap/*`,
  `zustand` or `codemirror` entry exists in any `package.json` yet. Installing
  them at the ledger versions is part of this task.
- Note: the FE still needs the narrowly scoped `web → mocks` import exception
  before in-app MSW wiring (see Blockers in `context.md`)

## Task details

| Concern | This task |
| --- | --- |
| API connections | Notes **port** over S-02 HTTP: create, read, update, soft-delete. Consume `@omnidoc/contracts` types only. Send the workspace selector header from the current selection; never treat it as authority. MSW note fixtures (S-03) for mocks **once the `web → mocks` exception exists**; otherwise build props-first + a thin typed adapter and soft-stop the MSW wiring sub-slice |
| Editor | TipTap **3.31.3** exactly (ledger pin; do not bump). Body durable SoT is **ProseMirror JSON** — never make markdown or HTML the stored form. CodeMirror 6 for fenced code blocks (ADR-0001 §2) |
| State management | Zustand **5.0.15** for editor/UI state only (dirty tracking, toolbar state, save status). Local form state for the title. No client cache library |
| Save states | `idle` / `saving` / `saved` / `conflict`, per `system-ux.md` §2. A conflict is **visible** and the client does **not** pick a winning version. Saving/status announcements go to a polite live region **once per state change** (ui-qa-checklist §2.3) |
| Import / paste | Paste and file import are first-class. Each imported file carries **its own** indexing status: pending, indexing, ready, partial, failed. Indexing in progress must be visible, and Search/Ask must not imply a complete index while one is indexing |
| Routing / IA | `New note` (top bar and mobile) lands **directly in the editor** — title + body only, no folder or tag required first. Existing note routes resolve through the notes port |
| Workspace scope | Notes are workspace-scoped. Re-resolve membership from the server; a rejected workspace renders the **generic** denial and never reveals whether it exists |
| Locale / direction | Single `lang`/`dir` source stays `apps/web/app/locale.ts`. Logical CSS; `bdi` around identifiers/UGC. TipTap's `textDirection` controls **content**, not layout flipping — it is not an RTL locale claim |
| Accessibility | The editor surface needs a real name/role beyond "edit text" (§2.4); keyboard-only create, format and exit with no focus trap (§1.4); reduced motion respected for progress affordances (§3.3); long unbroken strings and code blocks stay reachable (§6.1, §6.3, §6.5) |
| Look | References `@user` supplies per block (editor chrome, toolbar, save indicator, import affordance). No palette invention; token values change only through the token layer |

## Reference protocol (per visual block)

Blocks in scope: editor shell/chrome, formatting toolbar, title field, save
state indicator, import/paste affordance, conflict surface.

1. Before building a block's UI, ask `@user`: *do you have a reference —
   a link, pasted code, or a prompt (image welcome) — for this?*
2. No reference → offer 2–3 options and wait.
3. Log each choice in `docs/design/now.md` (Decisions log).
4. Save-state semantics, conflict visibility, focus order, the editor's
   accessible name, and the generic forbidden copy are **not** visual choices —
   they are gate/security requirements; build them without asking.

## Allowed Write Paths

- `packages/ui/**` (capture/editor blocks as copy-in blocks; no token edits)
- `apps/web/**` (capture route, editor client boundary, notes port client)
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

- Organize (F-05), retrieve (F-06), ask (F-07), dual-mode chrome (F-08),
  sample path (F-09), a11y sweep (F-10), Playwright (F-11)
- Collaborative editing / Yjs (an open gate; `@tiptap/y-tiptap` stays unused)
- Production AI; RTL locale; AWS / DevOps I-*
- Token values, palettes, motion systems (references first)
- Contracts / OpenAPI / Java authorship; fixtures authorship

## Deliverables

1. A capture surface: title + rich body, created with those two fields only.
2. TipTap editor on the ADR-0001 §2 pin, storing **ProseMirror JSON**.
3. Autosave with honest `idle` / `saving` / `saved` / `conflict` states; a
   conflict is visible and is never auto-resolved by the client.
4. Paste and file-import affordances, each imported file showing its own
   pending / indexing / ready / partial / failed status.
5. `New note` (top bar + mobile tab bar) landing directly in the editor.
6. Versions: conflict handling proven against the S-02 contract.
7. Tests (Vitest): save-state transitions, conflict visibility, status
   announcement once per change, editor accessible name, keyboard-only create
   and exit, long-content safety.
8. Outcome here; decision log rows in `now.md`; status in `context.md`.

## Constraints / Prohibited Decisions

- Do not make markdown or HTML the stored body; JSON is the SoT
- Do not bump the TipTap / Zustand pins, and do not add a client cache library
- Do not invent visual details no reference covers
- Do not reproduce D-01 layouts
- Do not add tokens or edit `tokens.css`
- Do not author fixtures, OpenAPI, or Java code
- Do not import provider SDKs into `apps/web` / `packages/ui`
- Do not reveal whether a forbidden workspace exists
- Do not claim RTL locale support; TipTap `textDirection` is not a locale claim
- Do not activate production AI
- Do not write an AI answer into the corpus (F-07 owns that)
- Do not imply a complete index while an import is still indexing

## Acceptance Criteria

- A note can be created with a title and body only, and New note lands in the
  editor without choosing a folder or tag first
- The stored body is ProseMirror JSON; no second durable representation
- Save states are distinguishable; a conflict is visible and unresolved by the
  client
- Each imported file shows its own indexing status; an incomplete index is not
  presented as complete
- Editor has a real accessible name/role; create, format and exit work by
  keyboard with no focus trap; status changes are announced once
- Long unbroken strings, code blocks and tables do not break layout or become
  unreachable (~390px included)
- Single `lang`/`dir` source; logical CSS; `bdi` on identifiers/UGC
- Each built block has a logged `@user` reference or logged choice
- Contracts consumed as generated types; no local shape forks
- `packages/ui` + `apps/web` typecheck, lint, tests, build green
- `current.md`, backend lane, contracts, mocks authorship untouched

## Stop / escalate conditions

- **Soft-stop:** the `web → mocks` import exception is not authorized → build
  against the notes port, log the wiring gap in `now.md`, stop the MSW sub-slice
  (not the task)
- **Soft-stop:** a block has no reference and `@user` is unavailable → stop that
  block, log the open choice
- **Soft-stop:** the S-02 notes contract cannot express autosave/conflict
  without a contract change → log it and escalate to Commander rather than
  inventing a client-side shape
- **Hard-stop:** markdown/HTML becoming the stored body; a pin bump; collab/Yjs
  wiring; client auth or provider SDKs; ADR reopen; production AI activation;
  claiming RTL shipped

## Dependencies / Risks

- Depends on: F-02 (completed), S-02 notes contract (completed), S-03 fixtures
  (completed) and/or B-04 live notes
- Blocks: F-05 (organize), then F-06+
- Parallel: backend lane (B-05 ingestion) — no mutual dependency
- Risk: **TipTap is not installed.** Adding it must not surprise the graph —
  check whether any new package needs a `pnpm-workspace.yaml` `allowBuilds`
  entry (pnpm 12 fails `--frozen-lockfile` on unlisted build scripts)
- Risk: fixtures wiring needs the `web → mocks` exception; do not fork a second
  fixture authority
- Risk: treating a client-side "last write wins" as conflict handling —
  forbidden; the client does not pick the winner
- Risk: rich-text output being serialized to markdown for storage "for
  convenience" — that breaks ADR-0001 §2

## Gates

- Production AI activation remains gated
- RTL locale remains deferred (readiness discipline applies)
- Collaborative editing stays an open gate
- UT-* remain unrun
- Design language: **Mintlify** (2026-09-23); per-block layout references
  still required

## Progress — 2026-09-25 (branch `F04-capture-tiptap`, **uncommitted pending `@user` review**)

Started. Both halves are built: the behaviour-only half is committed
(`d7ed77b`, `e324501`, `3802d9b`), and the visual half is in the working tree
awaiting review.

Blocks (`packages/ui/src/capture/`), built from the options `@user` chose on
2026-09-25 rather than from a supplied reference:

- `CaptureSurface` — document-first: title, toolbar and body sit on the page
  background with no card around them.
- `NoteTitleField` — borderless large field with a real (visually hidden) label.
- `FormattingToolbar` (static row, keyboard-complete) + `SelectionToolbar`
  (pointer bubble, positioned from the DOM selection — no new dependency).
- `SaveIndicator` — text only, no spinner; badge is `aria-hidden` so the polite
  status region is the single announcement.
- `ImportDropzone` — drop zone plus one row per file, each with its own status,
  and an "index is incomplete" notice.
- `SaveProblemBanner` — inline above the editor; `conflict` offers both versions
  as an explicit choice and nothing is auto-resolved.

Routes: `apps/web/app/(app)/notes/new/page.tsx` (lands directly in the editor),
`notes/[noteId]/page.tsx` (server-resolved through the notes port), with
`lib/notes/actions.ts` (server actions) and `lib/notes/note-loader.ts`.
`403` and `404` collapse to one generic denial
(`packages/ui/src/shell/denials.ts`) so the route cannot be used as an existence
oracle.

Verified live against the local Java API (Postgres 5433 / API 8080 / web 3311):

- a blank draft creates nothing until it has content, then lands on
  `/notes/{id}`;
- the stored body is ProseMirror JSON (bold mark + `codeBlock` node read back
  from Postgres, 5 versions recorded);
- a real `409` from a second session produces the conflict banner with local
  edits preserved and autosave stopped; "Keep my edits" re-saves on top of the
  server's version and resolves;
- code blocks carry `tabindex=0` with `overflow-x: auto`;
- toolbars apply commands and report `aria-pressed`.

Defects found and fixed during that verification (both would have shipped
silently):
- **Tailwind never scanned `packages/ui/src/capture`.** `styles/globals.css`
  registers each source directory explicitly; the missing `@source` meant every
  capture-only utility compiled to nothing while typecheck, lint and unit tests
  stayed green. Fixed in `globals.css`.
- **`editorProps.attributes.class` replaced TipTap's `ProseMirror` class**, so
  the editor's base styles and the `[&_.ProseMirror]` height rules never
  matched. Now set as `"ProseMirror od-capture-body"`.

Checks: `ui` + `web` typecheck/lint green; `web:build` green (12 routes);
**276 ui tests + 62 web tests** pass.

### Fixes from `@user` review — 2026-09-25 (second pass)

1. **The bottom of every page was hidden behind the fixed `MobileTabBar`.** The
   bar is `position: fixed`, so nothing reserved room for it and the last element
   scrolled underneath. This is a **shell** defect (F-02's bar + `SidebarInset`),
   not capture-specific — F-04 is simply the first page tall enough to show it.
   Fixed in `apps/web/app/(app)/shell.tsx` by reserving bottom clearance on
   `SidebarInset`, with the clearance value exported from
   `packages/ui/src/shell/mobile-tab-bar.tsx` beside the row height it derives
   from, so a taller bar cannot silently start covering content again.
   Measured at 390px: bar 57px, reserve 57px, 24px clear gap above the bar.
2. **Toolbar separators sat against the top of the toolbar, not centred.**
   `Separator` renders `data-vertical:self-stretch`, which beats the row's
   `items-center` for that child; with an explicit `h-5` the stretch cannot
   apply, so the rule fell back to the cross-axis start. Fixed by dropping the
   fixed height and using `my-0.5` so `stretch` resolves to "fill the row minus
   the insets" — centred by construction instead of out-specifying a variant.
   Measured: separator centre 25.5px, row centre 25.5px.
3. Observed, **not** changed: the static toolbar wraps to two rows even at
   1440px, so the inline-mark group starts a second row. `flex-wrap` is
   deliberate for 390px, but the desktop split is a judgement call — say if you
   want the groups rebalanced or the block set trimmed.

Gaps, deliberately not closed here:

- **CodeMirror 6 for fenced code** (ADR-0001 §2) is a follow-up slice, not built.
  StarterKit's code block ships.
- **No table extension** (`@tiptap/extension-table` is not a pinned package), so
  the table overflow rules are unexercised rather than proven.
- **MSW still not wired** (`web → mocks` unauthorized); tests inject through the
  notes port, and no second fixture authority was created.
- **Import end-to-end is unproven and blocked on the backend.**
  `POST /api/v1/ingestion-jobs` has no controller yet (`apps/api` carries only
  `IngestionPort` + domain models), so a dropped file lands as `Failed` with the
  honest reason. Checked live rather than assumed. B-05 owns it.

## Progress — 2026-09-25 (behaviour-only half, commit `d7ed77b`)

Landed:

1. `packages/ui` installs `@tiptap/core|react|pm|starter-kit` **3.31.3** and
   `zustand` **5.0.15** (ledger pins, `--save-exact`). No `allowBuilds` entry
   was needed; `pnpm install --frozen-lockfile` passes.
2. `apps/web/app/lib/api/transport.ts` — the server-side HTTP transport
   (origin, cookie/CSRF relay, timeout, total results), extracted from the
   identity port so the notes port does not duplicate it. Re-verified: the
   F-03 identity tests still pass unchanged.
3. `apps/web/app/lib/notes/notes-api.ts` + tests — the notes port over the S-02
   contract: create, read, update (`expectedVersion`), soft delete, list,
   ingestion-job read. `409` → `conflict`, **one attempt, no retry, no merge**.
4. `packages/ui/src/capture/save-state.ts` + `capture-store.ts` + tests — the
   save cycle as a pure reducer over revision counters. `saved` cannot be
   claimed while a newer local edit exists or while a save was in flight;
   autosave will not start over an undecided conflict; an undecided conflict
   keeps the rejected version token so a blind retry is refused rather than
   clobbering the other version.
5. `packages/ui/src/capture/import-status.ts` + tests — wire `running` → product
   `indexing`; only `ready` counts as complete (not `partial`);
   `indexIncompleteNotice()` is the single answer to "may Search/Ask imply a
   complete index?".

Feasibility confirmed: TipTap renders under this repo's jsdom setup, but only
with `immediatelyRender: false` — which is also what Next SSR requires, so the
editor block must set it.

Checks: `ui` + `web` typecheck/lint green; `web:build` green (11 routes);
frozen-lockfile install green; 62 web tests + 33 capture tests pass.

Blocked / needs `@user`:

- **Every visual block** (editor shell/chrome, formatting toolbar, title field,
  save-state indicator, import/paste affordance, conflict surface) needs a
  reference or a chosen option. Offered options are in the next message; the
  build waits on the answer per the reference protocol.
- **Save state `error`** — a fifth status beyond the four listed. See the note
  in `docs/design/now.md`; needs an explicit yes/no.
- **Pre-existing red test on `develop`, not from this change:**
  `packages/ui/src/shell/login.test.tsx` › "says why those controls are
  unavailable…" asserts `"Social sign-in isn't available yet."`, which
  `packages/ui/src/shell/login.tsx` does not render, although that file's own
  doc comment claims each disabled group carries such a note. Reproduced with
  `git stash` on a clean `develop`. That is F-03's surface, so it was left
  unfixed — but F-04's own acceptance says `packages/ui` tests green, so it
  needs an ownership call.

Not done yet: editor block, toolbar, title field, save indicator, import/paste
UI, the `notes/new` + `notes/[noteId]` routes, New-note wiring, and the
route-level tests named in the deliverables.

## Completion Instructions

1. Complete deliverables inside Allowed Write Paths.
2. Append Outcome; set `status: completed`.
3. Archive to
   `docs/handoffs/archive/H-2026-09-24-P1-F04-implementer-implementer.md`
   (immutable).
4. **Same-lane sequence rule:** on completion, rewrite this path to
   **F-05 (organize)** using the same format. If a cross-lane dep is unmet,
   log the soft-stop instead.
5. Durable lessons only in `docs/memory/implementer.md`.
6. Do not overwrite `current.md` or `lane-backend.md`; update `context.md`
   status lines only.

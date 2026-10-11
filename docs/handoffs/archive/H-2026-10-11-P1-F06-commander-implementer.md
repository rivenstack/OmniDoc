---
handoff_id: H-2026-10-11-P1-F06
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-06"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-10-11
updated: 2026-10-11
archived: 2026-10-11
branch: F06-retrieve
---

# F-06 — Retrieve (search screen)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-06 exactly. Build the retrieve slice — a search port over the frozen S-02 search contract plus the `/search` screen (server snippets, real Sample/Mine filter, honest degraded notice, pivot to Ask) — verified against the local Java API. Ask @user for a reference before building each visual block. Do not touch the backend lane, docs/api, or packages/contracts.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end programmer.
**allowed_task_classes:** `F-06` only.

Deliver the retrieve journey: **search is its own operation**, separate from Ask
(`docs/design/system-ux.md` §1/§2). Hits, snippets, ordering, and degradation
come from the server; the client renders what it receives and invents nothing.
This is a core Phase 1 journey on the CX critical path and the last named
journey step before Ask (F-07).

## Required Reading

1. `docs/design/system-ux.md` §1/§2 — Search vs Ask; server snippets/citations;
   Sample vs Mine is a real filter; indexing/degradation must be visible
2. `docs/planning/implementation-tracks.md` — F-06 row (and the F-07 boundary)
3. `docs/api/openapi.yaml` — `/api/v1/search/lexical`, `/api/v1/search/hybrid`,
   `SearchRequest`, `SearchHit`, `SearchResults`
4. `docs/quality/b07-retrieval-evaluation.md` — what B-07 actually validates
5. `apps/web/app/lib/notes/notes-api.ts`, `notes-pages.ts`, `note-loader.ts`,
   `apps/web/app/lib/api/transport.ts` — port + transport patterns to follow
6. `apps/web/app/(app)/organize-links.tsx` and `packages/ui/src/organize/**` —
   block/state conventions and the injected-link pattern
7. `apps/web/app/(app)/search/page.tsx`, `apps/web/app/(app)/nav.ts` — the stub
   route and the existing Search entry points
8. `quality/ui-qa-checklist.md` — §6 keyboard/overflow, a11y checklist
9. `docs/memory/implementer.md` — durable lessons (Tailwind `@source`, toolbars)

## Inputs / Evidence

- **B-07 is completed and Commander-validated PASS** — real lexical +
  deterministic hybrid retrieval is live on the local stack
  (`POST /api/v1/search/lexical`, `POST /api/v1/search/hybrid`). This satisfies
  F-06's "B-07 **or** search fixtures" dependency for live local verification
  (F-05 precedent: run the local Java API + Postgres).
- S-03 mock corpus (`packages/mocks`) already implements both search endpoints,
  but the `web → mocks` in-app import exception is still **unauthorized**:
  tests inject through the search port; do not import `@omnidoc/mocks` in app
  or test code.
- Server snippet semantics (B-07, `JdbcSearchAdapter`): whitespace-flattened
  **plain text** window around the best match with `...` markers — **no
  highlight markup**. Render snippets as text; do not re-highlight client-side.
- `SearchHit` carries `chunkId`, `noteId`, `versionId`, `score`, `snippet`,
  `corpusOwnership` — **no note title**. If a reference wants titles, resolve
  them server-side through the existing notes port for the current result page
  only (bounded to `topK`) and fail soft to snippet-led rows; otherwise rows
  are snippet-led from the start. Do not fork the contract.
- `corpusOwnership` (`sample` | `mine`) is the only user-facing filter the
  backend implements; other `filters` keys are internal (embedding
  model/dimensions). Sample vs Mine must be a real request field, not a label.
- `SearchResults.degraded: true` means a partial/degraded topK — show an honest
  incomplete-results notice. Never present an incomplete index as complete.
- `/search` is a stub route; the shell already exposes Search (nav + mobile tab
  + palette entry). The shell itself is done — do not redesign it.

## Allowed Write Paths

- `packages/ui/src/search/**` (new blocks) and `packages/ui/src/index.ts`
- `apps/web/app/(app)/search/**`
- `apps/web/app/(app)/organize-links.tsx` (additive link components only)
- `apps/web/app/lib/search/**`
- `docs/handoffs/active/lane-frontend.md`
- `docs/design/now.md`
- `context.md`
- `docs/memory/implementer.md`

## Out of Scope / Must Not Touch

- `apps/api/**`, `docs/api/**`, `packages/contracts/**`, `packages/mocks/**` —
  the S-02 contract and its authorship stay frozen
- `apps/web/app/(app)/ask/**` — F-07 owns Ask; F-06's pivot is a link only
- `apps/web/app/(app)/shell.tsx`, `nav.ts`, `page.tsx` (shell and entry points
  already exist)
- Collections folders/tags sub-slice (soft-stopped on the S-02 contract gap)
- F-15 editor work (deferred; do not start editor phases from this head)
- F-08 dual-mode chrome, F-09 sample workspace, F-10/F-11 passes
- Production AI activation, any RTL-locale claim, new dependencies (if one
  seems necessary, soft-stop)

## Deliverables

1. **Search port** (`apps/web/app/lib/search/`): typed over the frozen S-02
   schemas (via `@omnidoc/contracts` where applicable); reuses the shared
   server-side transport; consumes the search endpoints (hybrid as the default
   path — deterministic fusion includes lexical; do not add a user-facing
   retrieval-mode toggle). Failure mapping stays in the existing vocabulary —
   a **generic denial**, **unavailable**, and **validation** must be
   distinguishable from **empty results** and from **degraded results**.
2. **Search screen** `/search`:
   - labelled query field; as-you-type search with debounce (current
     preference, not a locked contract); submit still works without JS
   - results as a real list reaching the **existing** capture route
     (`/notes/[noteId]`) for each hit
   - **Sample/Mine filter** mapped to the real `corpusOwnership` request field
     (chips are local UI state; only contract fields may be sent)
   - honest **degraded/incomplete** notice on `degraded: true`
   - empty / loading / denied / unavailable states on the F-05 block
     conventions (one consistent block set, not a second design)
   - a quiet **pivot to Ask** affordance (link to `/ask`; F-07 owns the
     destination and behavior)
3. **Blocks** in `packages/ui/src/search/` with injected link components
   (no `next/link` in `@omnidoc/ui`), `bdi` isolation for UGC snippets, no
   cards — list conventions follow `organize` unless `@user`'s reference says
   otherwise.
4. **Tests**: port tests (success, degraded, empty, denial, unavailable),
   block tests (states, roles/names, isolation, keyboard), route tests via
   port injection; plus the full frontend gate.
5. `docs/design/now.md` decision-log update and `context.md` status line on
   completion; archive + next-head handling per Completion Instructions.

## Constraints / Prohibited Decisions

- The server is the only source of hits, snippets, ordering, and `degraded`.
  No client-side re-ranking, no client-side highlighting of snippets, no
  invented hits, no invented relevance labels from raw scores.
- No client answer cache; no Ask behavior in this slice (F-07 is a separate
  port; B-08 is building its adapter in parallel).
- Only contract fields may be sent (`query`, bounded `topK` — default 10, max
  100 — `corpusOwnership`, and internal `filters` only if the backend honors
  them; do not invent filter keys).
- If a full "indexing in progress" notice is demanded beyond `degraded`, that
  is a **contract gap** — soft-stop for a Commander decision; do not fake it.
- Ask `@user` for a reference (link, pasted code, or prompt — image welcome)
  before building each visual block; with no reference, offer options. If a
  Figma link is supplied and the Figma MCP is authenticated it may be used for
  design-system fidelity; MCP output never closes gates — continue with
  repo-native tools if unavailable.
- Logical CSS only; locale-driven `lang`/`dir`; `bdi` isolation for snippets
  and identifiers; no physical-direction JS.
- Accessibility is a release gate: keyboard-only operation, visible focus,
  labelled input, result count announced once (`role="status"` — F-05
  pattern), reduced-motion respect; ~390px viewport holds without horizontal
  widening.
- Upgrade-safe and within ADR-0003 conventions (shadcn/Base UI primitives,
  Mintlify token roles; no new visual language).

## Acceptance Criteria

- One search port consumes the frozen contract; requests carry `query` and a
  bounded `topK`, and `corpusOwnership` only when the Sample/Mine filter is
  active.
- Result rows render the server snippet verbatim as text; `corpusOwnership:
  sample` rows are visibly labelled as sample data; an empty result set is
  distinguishable from every failure class and from `degraded`.
- The Sample/Mine filter changes results via the real request field —
  demonstrated against the local Java API.
- `degraded: true` renders the incomplete-results notice.
- Denied / unavailable / validation failures each render distinct honest
  states; no fake rows, no silent fallback to unfiltered results.
- As-you-type is debounced; keyboard and screen-reader flows pass
  `quality/ui-qa-checklist.md`; layout holds at ~390px.
- **Accessibility (release gate):** focus order and visible focus on result
  updates, keyboard-only operation, labelled input, result count announced
  once (`role="status"`), reduced-motion respected, token-contrast intact.
- **LTR-now / RTL-readiness:** logical CSS only, locale-driven `lang`/`dir`,
  `bdi` isolation for snippets/identifiers; primary locale `en` (LTR) is the
  only shipping locale — no RTL-locale claim.
- Checks green: focused new suites plus the full frontend gate
  (`ui` + `web` typecheck/lint/test, `web` build) — record whether
  `--skip-nx-cache` was used.
- Live smoke against the local Java API + Postgres (temporary actor/workspace/
  notes fixture, then removed) with evidence recorded in the Outcome.
- No file changes outside Allowed Write Paths.

## Stop / Escalate Conditions

- **Soft-stop:** a required field is absent from the frozen contract (note
  title, non-corpus filter, highlight boundaries, full indexing notice), the
  `web → mocks` exception is needed, or a reference forces a new dependency —
  return the lane to Commander with the specific gap instead of forking a
  client shape.
- **Hard-stop:** write collision with another lane, any ADR reopen, production
  AI/provider activation, an RTL-shipped claim, or a dependency change outside
  this ticket.
- Escalate to `/commander`; do not reassign work silently.

## Gates

- Production AI/provider activation remains gated
- RTL locale remains deferred (readiness discipline required); `en` (LTR) is
  the only shipping locale
- Collections contract change remains an open `@user`/Commander decision — do
  not touch
- F-15 editor redesign is deferred (`listed`); do not start editor work
- Phase Check remains closed until Phase 1 Build exit

## Completion Instructions

On completion: archive this handoff to
`docs/handoffs/archive/H-2026-10-11-P1-F06-commander-implementer.md`, then
either rewrite this same `lane-frontend.md` path with the next same-lane slice
(no unmet cross-lane dependency) or set `status: blocked` with an Outcome
naming the dependency and return the lane to Commander. Update `context.md`
status lines and record durable lessons in `docs/memory/implementer.md`. Do
not open F-07/F-15 or Phase Check yourself.

---

## Outcome — F-06 built, live-verified, lane returned to Commander (2026-10-11)

**Status:** delivered on branch `F06-retrieve`. `@user` asked for the visual
check in a browser mid-slice; the render path was verified through the real
server, and the **visual/mobile pass still awaits `@user`** (no browser tooling
in the implementer session).

### What landed

| Deliverable | Where |
| --- | --- |
| Search port (hybrid default; lexical reachable by path) | `apps/web/app/lib/search/search-api.ts` |
| URL state (`?q=`, `?corpus=`) | `apps/web/app/lib/search/search-query.ts` |
| Debounce decision (pure, unit-tested) | `apps/web/app/lib/search/search-navigation.ts` |
| Route data path with injected port | `apps/web/app/lib/search/search-run.ts` |
| Session/workspace loader | `apps/web/app/lib/search/search-loader.ts` |
| Blocks: field, chips, results, six states, Ask pivot | `packages/ui/src/search/**` |
| Injected link components | `apps/web/app/(app)/search/search-links.tsx` |
| Interactive shell (URL-held state, no client search) | `apps/web/app/(app)/search/search-controls.tsx` |
| Screen | `apps/web/app/(app)/search/page.tsx` |
| Tailwind source registration | `packages/ui/src/styles/globals.css` (`@source "../search"` + test exclusions) |

Look and the snippet-led row shape were chosen by `@user` on 2026-10-11 and
logged in `docs/design/now.md`. The block set is the F-05 grammar applied to
retrieve — one design, not a second one.

### Acceptance evidence

- **One port, contract fields only.** Requests carry `query` and a bounded
  `topK` (default 10, clamped 1…100); `corpusOwnership` is sent **only** when a
  filter is active, so "All" is the absence of the field. No invented `filters`
  keys.
- **Sample/Mine is a real request field.** Verified against the local Java API:
  `corpusOwnership: mine` and `sample` change the result set through the
  request, not a label.
- **Snippets render verbatim as text.** Server text printed as-is (no
  client-side highlighting), `bdi`-isolated as UGC, `wrap-anywhere` + `min-w-0`
  on every box in the chain.
- **Empty ≠ failure ≠ degraded.** Six distinct states confirmed on rendered
  HTML: idle (no query, **no API call**), zero matches, degraded
  (`degraded: true` → incomplete-results notice inside the single announced
  count), generic denial, validation (`400`), unavailable (transport). A
  controlled-replay stub produced the failure classes a healthy API cannot.
- **Accessibility.** Labelled search field in a real GET form (works with
  JavaScript off; the active filter survives as a hidden `corpus` field), rows
  and chips are links with visible focus rings and `aria-current` on the active
  chip, result count announced once through `role="status"`, skeleton
  `aria-hidden` under a single status region.
- **LTR-now / RTL-readiness.** Logical CSS only, no physical left/right
  utilities (asserted in tests), locale-driven `lang` from the single source.
  No RTL-locale claim anywhere.
- **Focus survives a search.** The results region is a Suspense boundary inside
  the page rather than a route-level `loading.tsx`, so the field and chips are
  never unmounted mid-keystroke.

### Bug found and fixed during the live check

`@user` reported "Search is unavailable right now" for every query. Root cause
was in the new port, not the API: `SearchHit.corpusOwnership` is optional, and
the API serializes "no value" as an explicit JSON `null`
(`SearchController` maps the domain `Optional` with `.orElse(null)`). The
validator rejected `null`, discarding the entire answer and rendering
*unavailable* — "we could not ask" — for a response the server had sent. Every
note in the local dev database has `corpus_ownership` NULL, so this failed
100% of the time. `null` now reads as **absent** (unlabelled row, no guessed
corpus); a *present but unknown* value is still refused. Regression test:
`apps/web/app/lib/search/search-api.test.ts`.

### Gate

`ui` 476 / `web` 114 tests, `ui`+`web` typecheck, `ui`+`web` lint, and
`web:build` all green with `--skip-nx-cache`.

The new search suites pass 24/24 (ui) and 27/27 (web) in isolation.

**One authorized change outside the ticket's write paths:**
`packages/ui/src/shell/login.test.tsx` (test-only, `@user`-authorized
2026-10-11). The shared `ui` suite went red when this slice's suites were added
— 6 failures in 6 full-suite runs — and the cause was **pre-existing**, not the
new code: the file's helper was
`const settle = async () => Promise.resolve();`, a no-op that `waitFor` resolves
on its first tick, so the `aria-busy === "false"` assertion below it raced
React's transition and lost under CPU contention (the assertion is about the
sign-in button re-enabling, and the component code is correct). The fix replaces
that one call with `await waitFor(() => expect(...aria-busy).toBe("false"))` and
deletes the dead helper. Evidence: 6/6 red before, 6/6 green after on the same
load; the file is otherwise untouched. Reported here because it is outside
`packages/ui/src/search/**`.

### Live verification

Local Java API + Postgres with a temporary actor/note fixture (bcrypt via the
Gradle-cached `spring-security-crypto`, seed and cleanup in FK order); fixture
and temp files removed afterwards, verified by row counts. Rendered HTML was
checked for results, both filter positions, idle, zero-match, degraded, denial,
validation, and unavailable.

### Observed local-data gap (not a UI fix)

Every note in the local dev database has `corpus_ownership` NULL, so **Sample
and Mine both return nothing while All returns the hits**. That is the server's
honest answer (`mine` means `corpus_ownership = 'mine'`, not "yours"), so the
client must not infer ownership — labelling notes at creation is backend/seed
work. Flagged for Commander/`@user` sequencing.

### Left with Commander

The next slice in sequence is **F-07 (Ask UI)**, which this ticket explicitly
forbade the implementer from opening; F-08, F-09, F-10 (full pass) and F-11 all
sit behind F-07 or the still-unauthorized `web → mocks` exception. The lane is
therefore returned **blocked on Commander sequencing**, not silently
re-sequenced.


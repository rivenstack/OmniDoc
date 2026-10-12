---
handoff_id: H-2026-10-12-P1-F07
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-07"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-10-12
updated: 2026-10-12
branch: F07-ask
archived: 2026-10-12
---

# F-07 — Ask UI (ask-your-notes)

> **Archived 2026-10-12** on completion of the F-07 build slice. The lane head
> was then soft-stopped to Commander: the live against-local-API ask smoke is a
> pending cross-lane check because **B-08 has not landed**, and the `@user`
> visual/mobile pass on the frontend journeys is still open (no browser in the
> implementer session). Read the **Outcome** section at the bottom for what
> landed and the acceptance evidence.

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-07 exactly. Build the ask-your-notes slice — one answer port over the frozen S-02 ask/SSE contract plus the /ask screen (composer, streaming answer, passage-level citations, refusal/partial/conflict as success, Stop control) — verified against S-03 ask fixtures through the injected port. Ask @user for a reference before building each visual block. Do not touch the backend lane, docs/api, or packages/contracts.
```

Sits on branch `F07-ask` (created from `develop` after F-06 landed as commit
`4695774`). Confirm you are on `F07-ask` before writing code.

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end programmer.
**allowed_task_classes:** `F-07` only.

Deliver the **ask-your-notes** journey: the composer, the streaming answer, and
**passage-level citations** — with refusal / partial / conflict / no-supported-
answer treated as **success**, not errors (`docs/design/system-ux.md` §2;
`architecture.md` §4). Ask and Search are different ports; the UI never calls a
provider and never attaches a citation the server did not return. This is the
named journey that F-08, F-09 and F-11 all sit behind, and it unblocks the
Phase 2 CX gate's trust loop.

## Required Reading

1. `docs/design/system-ux.md` §1/§2 — Search vs Ask; server citations; answer
   outcomes are success; citation identity is `architecture.md` §4; indexing
   must not be faked
2. `architecture.md` §4 (answer outcome states + citation payload) and §5.6
   (answer synthesis with citations, failure vocabulary)
3. `docs/api/ask-sse.md` — the **canonical** SSE frame contract (event names,
   terminal events, pre-stream JSON errors, citations, cancel)
4. `docs/api/openapi.yaml` — `POST /api/v1/ask`, `Answer`, `Citation`,
   `AskSse*`, `ErrorBody`
5. `docs/planning/implementation-tracks.md` — F-07 row (and the F-08 boundary)
6. `apps/web/app/lib/search/**` — the F-06 port/route/URL-state/block patterns
   to follow (`search-api.ts`, `search-run.ts`, `search-loader.ts`,
   `search-navigation.ts`)
7. `apps/web/app/lib/api/transport.ts` — the shared server-side transport
8. `packages/ui/src/markdown/**` — the **only** sanitized answer-prose render
   path (F-12)
9. `packages/ui/src/search/**` and `packages/ui/src/organize/**` — block/state
   conventions and the injected-link pattern
10. `apps/web/app/(app)/ask/page.tsx` — the current stub this ticket replaces
11. `quality/ui-qa-checklist.md` — §6 keyboard/overflow, a11y checklist
12. `docs/memory/implementer.md` — durable lessons (Tailwind `@source`,
    optional-`null` contract fields, Suspense placement, replay stubs)

## Inputs / Evidence

- **S-03 is completed** — the deterministic mock corpus (`packages/mocks`)
  carries ask fixtures and both success outcomes and transport classes, so
  F-07's "S-03, and B-08 **or** ask fixtures" dependency is satisfied by
  fixtures. Tests inject the answer port; the `web → mocks` in-app import
  exception is still **unauthorized** — do not import `@omnidoc/mocks` in app
  or test code.
- **B-08 (mock ask adapter + citation assembler) is the live backend slice in
  parallel** — same frozen contract, `status: ready`, not yet landed. If B-08
  is present on the local Java API when you verify, run the F-06-style live
  smoke; if it is not, that live smoke is a **pending cross-lane check**
  (soft-stop to Commander) — see Acceptance.
- **Answer outcomes are success shapes** (`architecture.md` §4): `supported`,
  `partial`, `no_supported_answer`, `conflict`, `refused_policy`. Transport
  failures (`truncated`, `error`, pre-stream `ErrorBody`) are a **different
  class** and must be distinguishable.
- **Citations are the server's payload** (`docs/api/ask-sse.md`): `noteId`,
  `versionId`, `chunkId`, `anchor.startOffset`/`endOffset`, `preview`, optional
  `updatedAt` and `corpusOwnership`. The client never builds one.
- **`/ask` is a stub route**; the shell already exposes Ask (sidebar, mobile
  tab bar, command palette) and F-06's search screen already carries a quiet
  pivot to `/ask`. The shell is done — do not redesign it.
- Answer prose renders through the F-12 sanitized `Markdown` block. F-12
  shipped **behaviour-only**; the answer-card typography is F-07's and still
  needs an `@user` reference.

## Allowed Write Paths

- `apps/web/app/(app)/ask/**` (screen, controls, injected link components)
- `apps/web/app/lib/ask/**` (answer port, SSE frame parser, route data path,
  loader, navigation/decision helpers)
- `packages/ui/src/ask/**` (new blocks) and `packages/ui/src/index.ts`
- `packages/ui/src/styles/globals.css` (`@source "../ask"` registration +
  test exclusions — the F-05/F-06 lesson)
- `docs/handoffs/active/lane-frontend.md`
- `docs/design/now.md`
- `context.md`
- `docs/memory/implementer.md`

## Out of Scope / Must Not Touch

- `apps/api/**`, `docs/api/**`, `packages/contracts/**`, `packages/mocks/**` —
  the S-02 ask/SSE contract and its authorship stay frozen (B-08 owns the
  backend adapter)
- `apps/web/app/(app)/search/**`, `apps/web/app/lib/search/**` — F-06 is landed;
  do not reopen the search screen
- `apps/web/app/(app)/shell.tsx`, `nav.ts`, `page.tsx` (shell and entry points
  already exist)
- F-08 dual-mode chrome, F-09 sample workspace, F-10/F-11 passes
- F-15 editor work (deferred; do not start editor phases from this head)
- Collections folders/tags sub-slice (`BL-26`, soft-stopped on the S-02 gap)
- Production AI activation, any RTL-locale claim, new dependencies (if one
  seems necessary, soft-stop)
- Vault/usage/mode wiring (F-08/B-10) — this slice may **read** the current
  runtime mode but does not build the dual-mode chrome

## Deliverables

1. **Answer port** (`apps/web/app/lib/ask/`): typed over the frozen S-02 ask
   schemas (via `@omnidoc/contracts` where applicable); consumes
   `POST /api/v1/ask` and parses the canonical SSE stream. A **pure frame
   parser** for `generating` / `claim` / `completed` / `truncated` / `error`
   (exactly one terminal event, pre-stream `ErrorBody` on 4xx/5xx). Failure
   mapping stays in the existing vocabulary — a **generic denial**,
   **validation**, **unavailable**, and **mode_forbidden** are distinguishable
   from each other and from every **success outcome** and terminal-class error.
   No client answer cache; no auto-persist of answers into the corpus.
2. **Ask screen** `/ask` (replaces the stub):
   - a labelled composer (keyboard submit; submit works without over-reliance
     on client-only state)
   - **streaming** answer rendering — `generating` announced once; `claim`
     units appended with their citations; `completed` carries the final answer
     with `outcome`
   - **passage-level citations**, each a real link to the cited note
     (`/notes/[noteId]`), rendered `bdi`-isolated, showing a `Sample` label when
     `corpusOwnership` says sample
   - a **Stop control** that closes the stream → a "Stopped" state (partial text
     is **not** a `completed` outcome)
   - honest states for every success outcome and every failure class, on the
     F-05/F-06 block conventions (one consistent block set, not a new design)
3. **Blocks** in `packages/ui/src/ask/` with injected link components (no
   `next/link` in `@omnidoc/ui`), `bdi` isolation for UGC (answer text, claim
   text, previews, identifiers), no cards unless `@user`'s reference says
   otherwise. Answer prose renders through the F-12 `Markdown` block — never
   `dangerouslySetInnerHTML`.
4. **Tests**: port + frame-parser tests (all events, terminal classes,
   malformed/partial frames, pre-stream failures, cancel), block tests (states,
   roles/names, isolation, keyboard), route tests via port injection; plus the
   full frontend gate.
5. `docs/design/now.md` decision-log update and `context.md` status line on
   completion; archive + next-head handling per Completion Instructions.

## Constraints / Prohibited Decisions

- The server is the only source of the answer text, claim units, citations,
  `outcome`, and terminal events. No client invention of claims, citations,
  `outcome`, or relevance.
- `no_supported_answer` / `refused_policy` / `partial` / `conflict` are
  **success**, not errors. `truncated` / `error` are error+retry. Never render
  one class as the other.
- No citation the client did not receive; a citation the client cannot open to
  its cited note is not rendered as if openable.
- Answer prose renders only through the sanitized Markdown path (`F-12`);
  hostile content must be neutralized (no script/HTML execution).
- No answer is written back into the corpus (REC-06).
- Only contract fields may be sent; do not invent request fields or scope keys.
- Production AI stays dark; `operator_free_tier` / `customer_key` fail closed
  with the contract's `mode_forbidden` (or the existing fail-closed behavior) —
  no silent fallback to `mock`.
- **Ask `@user` for a reference** (link, pasted code, or prompt — image
  welcome) before building each visual block (composer, answer card, citation
  panel); with no reference, offer options. If a Figma link is supplied and the
  Figma MCP is authenticated it may be used for design-system fidelity; MCP
  output never closes gates — continue with repo-native tools if unavailable.
- Logical CSS only; locale-driven `lang`/`dir`; `bdi` isolation for answer
  text, previews, identifiers and code-like values; no physical-direction JS.
- Accessibility is a release gate: keyboard-only operation (composer, Stop,
  citation links), visible focus, labelled input, streaming/answer status
  announced once (`role="status"` / `aria-live` — F-05/F-06 pattern),
  reduced-motion respected, ~390px viewport holds without horizontal widening.
- Upgrade-safe and within ADR-0003 conventions (shadcn/Base UI primitives,
  Mintlify token roles; no new visual language).

## Acceptance Criteria

- One answer port consumes the frozen ask/SSE contract; SSE framing matches
  `docs/api/ask-sse.md` — the event names, exactly one terminal event per
  stream, and pre-stream JSON `ErrorBody` for 4xx/5xx.
- All **five success outcomes** render as success; `truncated` and `error`
  render as distinct error+retry states; `no_supported_answer` /
  `refused_policy` are never rendered as failures.
- Citations are passage-level; each is rendered **only** from a server payload
  and links to its cited note (`/notes/[noteId]`); a `sample` citation shows the
  `Sample` label; no citation is fabricated or de-duplicated into a different
  note.
- A **Stop** control closes the stream and yields a "Stopped" state, never a
  `completed` outcome.
- Answer prose renders through the sanitized Markdown path; hostile
  script/HTML payloads do not execute.
- **Verification (fixture-injected):** the full state machine (each success
  outcome, each failure class, terminal events, cancel) is verified against
  S-03 ask fixtures through the **injected** port, with a controlled-replay
  stub for the classes a healthy fixture path cannot produce.
- **Verification (live):** if **B-08's ask endpoint is present on the local
  Java API**, run the F-06-style live smoke (temporary actor/workspace/notes
  fixture, then removed) and record it in the Outcome. If B-08 has **not**
  landed, record the live ask smoke as a **pending cross-lane check** and
  soft-stop to Commander — do **not** claim live verification without it.
- Denied / validation / unavailable / mode_forbidden failures each render
  distinct honest states; no fake answer, no silent fallback to `mock`.
- `web:build` green with the `/ask` route replacing the stub.
- **Accessibility (release gate):** keyboard-only composer/Stop/citation links,
  visible focus, labelled input, streaming status announced once, reduced
  motion respected, token-contrast intact.
- **LTR-now / RTL-readiness:** logical CSS only, locale-driven `lang`/`dir`,
  `bdi` isolation for answer text / previews / identifiers; primary locale `en`
  (LTR) is the only shipping locale — no RTL-locale claim.
- Checks green: focused new suites plus the full frontend gate
  (`ui` + `web` typecheck/lint/test, `web` build) — record whether
  `--skip-nx-cache` was used.
- No file changes outside Allowed Write Paths.

## Stop / Escalate Conditions

- **Soft-stop:** passage-level **anchor navigation** requires the note reader to
  accept a passage anchor (out of this ticket) — link to the note and escalate
  the passage-open for a Commander decision rather than faking it; a required
  field is absent from the frozen contract; the `web → mocks` exception is
  needed; the live ask smoke needs a B-08 that has not landed; a reference
  forces a new dependency — return the lane to Commander with the specific gap.
- **Hard-stop:** write collision with another lane, any ADR reopen, production
  AI/provider activation, an RTL-shipped claim, or a dependency change outside
  this ticket.
- Escalate to `/commander`; do not reassign work silently.

## Gates

- Production AI/provider activation remains gated
- RTL locale remains deferred (readiness discipline required); `en` (LTR) is
  the only shipping locale
- Collections contract change remains an open `@user`/Commander decision
  (`BL-26`) — do not touch
- F-15 editor redesign is deferred (`listed`); do not start editor work
- Phase Check remains closed until Phase 1 Build exit

## Completion Instructions

On completion: archive this handoff to
`docs/handoffs/archive/H-2026-10-12-P1-F07-commander-implementer.md`, then
either rewrite this same `lane-frontend.md` path with the next same-lane slice
(no unmet cross-lane dependency) or set `status: blocked` with an Outcome
naming the dependency and return the lane to Commander. Update `context.md`
status lines and record durable lessons in `docs/memory/implementer.md`. Do
not open F-08/F-09/F-10/F-11, F-15, or Phase Check yourself.

---

## Outcome — completed 2026-10-12, soft-stopped to Commander

**Owner:** `/implementer` (frontend lane, `F07-ask`). **Status:** built and
verified; lane soft-stopped on the B-08 live-smoke dependency and the `@user`
visual/mobile pass.

### What landed

**Answer port + SSE frame contract** (`apps/web/app/lib/ask/`)

- `ask-sse.ts` — the pure, total frame parser. Buffers across chunk boundaries,
  handles multiple records per chunk and CRLF, ignores comments/`id`, and
  validates every payload (required fields, citation anchors, `corpusOwnership`,
  the five success outcomes) before it becomes an event. Anything it cannot
  trust is reported as `malformed`, never coerced. Also serializes events back to
  the wire for the proxy.
- `ask-api.ts` — the port over `POST /api/v1/ask`. Relays the session cookies,
  the workspace **selector** header, and the CSRF header; bounds only the connect
  phase (headers) and hands the caller an async iterable of parsed frames; maps a
  pre-stream 4xx/5xx to a failure class. It does **not** use the shared JSON
  transport (which hides the raw `Response` body and takes no abort signal) but
  re-uses its `apiOrigin` / `cookieHeader` helpers, so origin and cookie names stay
  single-sourced.
- `ask-stream.ts` — the pure session state machine: `starting → generating →
  streaming → completed | stopped | failed`. Exactly one terminal event is
  enforced (later frames are ignored), Stop yields `stopped` (never `completed`),
  and a malformed frame is an honest `malformed` failure. `failureFromResponse`
  is shared by the port and the client; a `403` becomes the **generic denial**
  and its server `detail` is **dropped** so the route cannot leak workspace
  existence. `collectCitations` prefers the final `Answer.citations`, collapses
  only exact duplicates, and never merges different notes.
- `ask-run.ts` — the proxy's framework-free decision logic: body validation
  (only `question` + the optional `corpusOwnership`), **server-side** workspace
  resolution where a non-member selector is a generic denial, the failure→HTTP
  mapping, and `askSseResponse`, which stops after the first terminal event and
  turns an unreadable frame into a terminal `error`.
- `ask-loader.ts` — the `next/headers` half: session → memberships →
  workspace preference in one pass, plus the page outcome.
- `ask-navigation.ts` — pure helpers: `canSubmitAsk`, `answerStatus`,
  `citationHref`, `askRequestBody`, `ASK_STREAM_PATH`.

**The `/ask` screen**

- `apps/web/app/(app)/ask/page.tsx` — the stub is replaced. A server component
  resolves the current workspace and renders the composer, or the honest failure
  in its place.
- `apps/web/app/(app)/ask/ask-client.tsx` — the streaming client. POSTs the
  question to `/ask/stream`, reads the response body frame by frame through the
  pure parser + reducer, and renders via the blocks. Aborting the fetch is Stop.
- `apps/web/app/(app)/ask/stream/route.ts` — the SSE proxy. The browser cannot
  reach the Java API (origin + session cookies are server-only), so this
  same-origin route handler re-authorizes the workspace from the **session** and
  pipes validated frames back. `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- `apps/web/app/(app)/ask/ask-links.tsx` — the injected `next/link` components.

**Blocks** (`packages/ui/src/ask/`, exported from `@omnidoc/ui`, registered in
`styles/globals.css` with `@source "../ask"` + test exclusions)

- `ask-composer.tsx` — chat-style composer (Sure/textarea + send arrow, Stop pill
  while streaming), a real labelled `<form>`, Enter sends, Shift+Enter newlines,
  field stays enabled during streaming (§1.6).
- `ask-answer.tsx` — the quiet, no-card streaming answer. One `role="status"`
  region announces "Answer generating" once then "Answer ready" once — claims
  appended between do not change it (§2.2). Prose renders through the F-12
  `Markdown` block.
- `ask-citations.tsx` — numbered chips as native `<details>`/`<summary>` (keyboard
  and no-JS operable), accessible name "Citation N" (§2.1), preview through the
  sanitized Markdown path (§6.6), `bdi` isolation + wrap (§6.5/§5.9), `updatedAt`
  stale cue (§5.10), `Sample` badge from `corpusOwnership`, injected "Open note"
  link.
- `ask-states.tsx` — idle, generic-denial/validation/unavailable/mode_forbidden/
  quota/session/truncated/stream-error/malformed failure states with distinct
  copy, `stopped`, the neutral success-outcome notices, and the quiet
  "Cited to your notes" marker. Refusal and partial support are never danger
  styled (§5.3, §9.3). `askFailureCopy` owns the recovery kind (`retry` vs
  `session`).

### @user look decisions (2026-10-12, logged in `docs/design/now.md`)

| Block | Choice |
| --- | --- |
| Composer | **Chat-style** — growing textarea + send arrow + Stop pill while streaming |
| Answer | **Quiet, no card** — F-05/F-06 conventions; minimal typography (answer-prose scale still open) |
| Citations | **Inline numbered chips + expandable passage** (native disclosure) |
| Outcomes | **One honest block set, distinct copy** (neutral, never danger) |

### Acceptance evidence

- **Fixture-injected state machine:** `ask-sse.test.ts` (framing, all events,
  terminal classes, malformed, split records, CRLF, serialize round-trip),
  `ask-stream.test.ts` (all five outcomes as success, truncated vs error vs
  quota vs mode_forbidden, malformed, exactly-one-terminal, stop, reset,
  `failureFromResponse`, `collectCitations`), `ask-api.test.ts` (request shape,
  cookie/CSRF/selector headers, `locale` present and **no `mode`**, stream
  frames, every pre-stream failure class, abort forwarding, early-consumer
  cancel), `ask-run.test.ts` (body validation, the **IDOR negative** — user A
  session + non-member selector → 403 with no leak and no port call —
  single-terminal enforcement, malformed→error frame), `ask-navigation.test.ts`.
- **Block tests:** `ask-blocks.test.tsx` (labelled real form, Enter submits,
  Shift+Enter and empty do not, Stop reachable and field usable, single
  announcement, sanitized prose and preview — `<script>` neutralized — citation
  names/hrefs/isolation/labels), `ask-states.test.tsx` (nine distinct failure
  titles, mode-aware copy, generic denial, detail toggle, neutral treatment for
  every outcome, `askModeLabel`).
- **End-to-end self-check (throwaway stub API in `/tmp`, removed):**
  `GET /ask` with a session cookie rendered the composer + idle state;
  `POST /ask/stream` proxied the canonical `generating`/`claim`/`completed`
  frames; a blank question returned `400 {"code":"validation"}`; a non-member
  `workspaceId` returned `403 {"code":"forbidden","detail":"The workspace is not
  available."}` (no id leak); a cookie-less request was `307`-redirected to
  sign-in by the proxy.
- **Gate (`--skip-nx-cache`):** `ui` typecheck/lint/**499 tests** and `web`
  typecheck/lint/**179 tests** PASS; `web:build` PASS — 10 routes including
  `/ask` and `/ask/stream` (`/ask` replaces the stub). Ask-only utilities are
  present in the built CSS, proving the `@source "../ask"` registration works.

### Pending / handed on

- **Live ask smoke is a pending cross-lane check.** `apps/api` has **no** ask
  controller and the backend lane head is still `status: ready`, so B-08 has not
  landed. The maintainer's self-check above used a **throwaway stub API**, not
  the Java API; live verification is **not claimed**. Re-run the F-06-style live
  smoke (temporary actor/workspace/notes fixture, removed afterwards) once B-08
  lands.
- **Visual/mobile pass awaits `@user`.** No browser in the implementer session,
  so light/dark, focus rings, ~390px behaviour and the streaming motion are
  **not** visually verified. Steps: open `/ask` signed in, ask "When is the
  launch review?" (mock/live per B-08), watch the stream, Stop mid-answer, expand
  a citation; report what looks off at desktop and ~390px.
- **Passage-level anchor navigation is deferred.** The ticket's own soft-stop
  condition: opening the *cited passage* (not just the note) needs the note
  reader to accept an anchor, which is out of this ticket. Citations link to the
  note and carry the anchor in the payload (rendered as the block id when
  present); the passage-open is a Commander decision, not faked here.
- **No Ask corpus filter.** `AskRequest.corpusOwnership` is wired through the
  port/proxy (contract-faithful) but no Sample/Mine control was added — it is not
  in this ticket's deliverables and belongs with F-08/§9.2.
- **`web → mocks` import exception** remains unauthorized (as expected); no mock
  import was added.

# OmniDoc — Live Context

## Project Identity

| Field | Value |
|-------|-------|
| Name | OmniDoc |
| Slug | `omni-doc` |
| Domain | Multi-tenant AI/RAG note and knowledge SaaS |
| Platform | Frontend TypeScript (Next.js) — ADR-0001 §1–§5, §7 `accepted`; ADR-0003/0004 `accepted`. **Backend** Java 21 / Spring Boot 4.1.x — ADR-0005 `accepted` 2026-09-15. ADR-0001 §6 identity **port** stays; Better Auth library superseded. ADR-0002: `apps/api` JVM Gradle beside Nx. |
| Primary locale | `en` (LTR) |
| Secondary locale | None |
| Target market | Global English-speaking |
| Business context | Portfolio / freelancing credibility product — production quality; **no** commerce, payments, shipping, or SMS. **6-month** hosted-demo horizon on AWS Free Tier. |

**Identity note (2026-09-13):** Canonical name **OmniDoc** was confirmed by
`@user`. Archived Phase 0 handoffs may still say OmniNote — see
`docs/handoffs/archive/README.md`.

CMS/commerce platform concepts are not applicable. See
`TEMPLATE-PLACEHOLDERS.md`.

## Customer Experience First

Validate a premium capture → organize → retrieve → ask-your-notes
experience with realistic mocks before production AI/provider activation.

Validate at minimum:

- Core note/knowledge journeys and citation trust
- Primary locale `en` (LTR); RTL deferred (not closed) with RTL-readiness
  discipline required
- Mobile usability
- Accessibility (focus, keyboard, labels, reduced motion, contrast)

## Current Phase

**Phase 1 Build — dual-lane implementation**

Goal: Front-end programmer owns F-*; back-end programmer owns B-* (and
backend-authored S-02/S-03). D-01 design close-out and S-01a/S-01b
scaffolds are **closed**. Dual-mode BYOK ports stay; production adapters
dark. Hosted AWS and live OpenRouter remain DevOps / Phase 3–4.

Program of record:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).

## Current Status

- Phase 0 complete: verification **PASS**; Task 0.7 gates answered;
  Wave C evidence (0.8 / 0.8b); ADR-0001 §1–§5, §7 and ADR-0004 `accepted`
- **2026-09-14:** serial Implementer loop superseded. Two-developer tracks
  are the plan of record
- **2026-09-15:** Backend Stack Close-out **complete** — U-BE
  accept-with-amendments → A-BE2 → ADR-0005 `accepted`
- **2026-09-16:** D-01 **Commander-accepted**; S-01a and S-01b **completed**
  and archived. Dual-lane heads opened: F-01 (FE) + B-01 (BE)
- **2026-09-17:** B-01 **Commander-validated PASS** and archived; backend
  lane advanced to **S-02**. F-01 remains live in parallel
- **2026-09-17:** S-02 **completed** and archived — canonical
  HTTP/OpenAPI/SSE contracts in `docs/api/` + `@omnidoc/contracts`.
  F-01 **completed** and archived (tokens + shadcn primitives; 121 UI
  tests pass)
- **2026-09-19:** F-01 soft-stop **cleared** — frontend lane head
  rewritten to **F-02** (app shell, nav, locale, honest workspace
  switcher). F-02 was `ready`
- **2026-09-22:** `@user` paused **F-02 before execution**. D-01 visuals
  are historical, not a build ticket. Live design authority:
  `docs/design/system-ux.md` (system contracts) and
  `docs/design/now.md` (living plan). Look is stock shadcn until a
  design language is chosen
- **2026-09-22:** `@user` chose the **visible kit** slice — **F-02a
  completed**: `/kit` page of stock shadcn primitives in `apps/web`
  (no shell, no journeys). `packages/ui` tests 121/121, typechecks green.
  Design language = swappable token layer; a future look is a token
  retune, not a component rewrite
- **2026-09-23:** `@user` confirmed the **F-01→F-11 sequence as the plan
  of record** (PM tracks it). Task format: title + short description +
  integration details (API/state/fixtures); UI details stay open. New
  rule: implementer asks `@user` for a reference (link / pasted code /
  prompt, image welcome) before building any visual block, and offers
  options on real choices. **F-02 (shell) reopened as the next step**;
  the D-01-era F-02 archive stays historical. Design language = swappable
  token layer
- **2026-09-23:** **F-01 remake** (branch `F01-ui-remake`, merged):
  **Mintlify** design language chosen and landed as token values; F-01
  primitives rebuilt on shadcn v4 `base-nova` (Base UI) sources with
  **Tabler** icons; new v4 form/empty family (Field, InputGroup, Empty);
  `/kit` remade; FE checks green (lint/typecheck/test/build). F-02 stays
  the next step; ADR-0003's icon-library row needs an Architect amendment
- **2026-09-23:** **F-02 shell landed** — nested collapsible sidebar
  (workspace switcher, nav, Collections submenu), slim utility top bar
  (search entry, New note, theme toggle, inert F-08 mode slot), centered
  content region, mobile tab bar, skip link + route-change focus, and a
  `Cmd/Ctrl+K` command palette. Shell blocks in `packages/ui/src/shell`;
  app wiring in `apps/web/app/(app)`; workspace data is a server-layout
  placeholder passed as **props** (no fetch). FE checks green (ui 189
  tests; web typecheck/lint/test/build). Frontend lane advances to
  **F-03 (auth UI)** — identity fixtures ready. (Local `api:test` fails
  only because Postgres is not running — pre-existing/environmental,
  backend lane; not touched.)
- **2026-09-25:** **F-04 started** (branch `F04-capture-tiptap`, commit
  `d7ed77b`). Behaviour-only half landed: shared server-side HTTP transport
  (`apps/web/app/lib/api/transport.ts`), the notes port over the S-02 contract
  (`apps/web/app/lib/notes/notes-api.ts`, 409 → `conflict` with no retry/merge),
  and `packages/ui/src/capture/` (save cycle `state`/`store`, per-file
  `import-status`). `@tiptap/*` 3.31.3 + `zustand` 5.0.15 installed in
  `packages/ui`; frozen-lockfile install green. ui + web typecheck/lint green,
  web build green (11 routes), 62 web + 33 capture tests pass. **No visual
  block built** — every F-04 block still awaits a `@user` reference. Two items
  need a call: a fifth save state `error` (see `docs/design/now.md`), and a
  pre-existing red `packages/ui` test on develop (`login.test.tsx` asserts an
  explanation note the sign-in block does not render)
- **2026-09-25:** **F-04 blocks built**, uncommitted pending `@user` review.
  `@user` chose per-block options (`docs/design/now.md` decisions log):
  document-first shell, static toolbar + selection bubble, borderless title,
  text-only save indicator, drop zone with per-file rows, inline conflict
  banner. `/notes/new` lands directly in the editor and `/notes/[noteId]`
  resolves through the notes port; `403`/`404` collapse to one generic denial.
  Verified live against the local stack: blank draft creates nothing; stored
  body is ProseMirror JSON (bold + codeBlock in Postgres, 5 versions); a real
  `409` from a second tab shows the conflict banner with edits preserved and
  autosave stopped; "Keep my edits" resolves on top of the server's version.
  ui + web typecheck/lint/test green (276 ui, 62 web); build green (12 routes).
  Fixed two silent defects: Tailwind never scanned `packages/ui/src/capture`
  (missing `@source`), and `editorProps.attributes.class` was replacing TipTap's
  `ProseMirror` class. Gaps: CodeMirror for fenced code deferred; no table
  extension; MSW still unauthorized; import end-to-end depends on B-05b
- **2026-09-25:** **F-04 completed and archived — Commander-validated PASS.**
  The implementer built and merged the capture slice (branch `F04-capture-tiptap`,
  `develop` at `e0070b8`) but did not append an Outcome or archive the lane head,
  so Commander re-ran the checks before accepting: `typecheck`/`lint` PASS (4
  projects), `test` PASS (**ui 277, web 77** plus contracts/mocks/api), `build`
  PASS (**12 routes**, incl. `notes/new`, `notes/[noteId]`, `collections`,
  `inbox`). Gate-critical behaviour confirmed in source: `409` → `conflict` with
  no retry/merge, `conflict` never auto-resolved, body stays ProseMirror JSON,
  and `403`/`404` collapse to one generic denial. The fifth save state `error`
  and the red `login.test.tsx` are both **closed** (`@user` 2026-09-25; fixed in
  `3802d9b`). `nx` flagged `ui:test` flaky once; three uncached re-runs passed
  277/277 — recorded, not a defect. Frontend lane advances to **F-05 (organize)**
- **2026-09-27:** `@user` triaged markdown support and the frontend lane was
  **re-sequenced**. Backlog `BL-19` was promoted into the program of record as
  **F-12 (sanitized markdown render pipeline)** — ADR-0003 §4 already pins
  `react-markdown` 10.1.0 + `remark-gfm` 4.0.1 + `rehype-sanitize` 6.0.0 and
  `docs/research/version-ledger.md:127–130` already carries those rows, so **no
  new pin decision was needed**; the backlog row's "needs an Architect fit
  check" note was wrong and is corrected in place. **F-05 (organize) is
  superseded before execution** — its branch carried no commits ahead of
  `develop` — and returns to `listed`, still blocked on the S-02 collections
  gap; archived as `status: blocked` at
  `docs/handoffs/archive/H-2026-09-25-P1-F05-commander-implementer.md`. F-12 is
  the live frontend head on branch `F12-markdown-render`; `@user` chose
  **behaviour only, stock tokens** for its look. `BL-20`…`BL-23` stay
  `proposed` — `BL-20`/`BL-21` still need a new Architect pin
- **2026-10-02:** **F-14 (Markdown & editor tables) completed and verified.** Promoted from BL-20 following `@user` review. Implemented pinned `@tiptap/extension-table*` packages (3.31.3), interactive size popover (matrix picker) + default 3x3 table button, contextual bubble controls (row/col insert/remove, table delete), live preview GFM table decorations & cursor-reveal rules, accessible horizontal scroll containment (`ui-qa-checklist.md` §6.4), and bidirectional JSON ↔ Markdown bridge. Monorepo gate check passed 16/16 (`nx run-many -t typecheck lint test build`), all 376 UI tests green.
- **2026-09-27:** **F-12 built** (branch `F12-markdown-render`) — the single
  sanitized markdown render path: `packages/ui/src/markdown/` (`Markdown` +
  `markdownSanitizeSchema`) on the accepted ADR-0003 §4 pins, installed exactly
  (`react-markdown` 10.1.0, `remark-gfm` 4.0.1, `rehype-sanitize` 6.0.0).
  Behaviour-only; no typography (`@user` 2026-09-27). ADR-0003 §Verification
  item 5 is met by test: 17 hostile payloads × 3 channel checks, plus a
  "does not execute" assertion. FE gate **14/14 green**, `ui:test` **350/350**
  across 13 files. Two findings worth keeping: `react-markdown` **drops raw HTML
  entirely** without `rehype-raw`, so the schema is defence in depth and a
  markdown-only fixture cannot distinguish it from the library default; and
  props applied through `components` overrides (e.g. `tabIndex`) are applied
  **after** sanitization. Nothing renders `Markdown` yet — F-07 is the first
  consumer — so no visual check was possible or claimed. Gaps handed on: no
  typography (F-07 + a reference), Shiki still uninstalled, `BL-20`/`BL-21`
  still need a new Architect pin, and the markdown *producer* (`BL-22`) is
  unscheduled. Awaiting Commander validation; the frontend lane has **no next
  task assigned** (F-05 remains blocked on the S-02 collections gap)
- **2026-09-25:** **Session redirect loop fixed** (`apps/web`, F-03 surface;
  found by `@user`). Two layers answered "is this browser signed in?" from
  different evidence: `proxy.ts` skipped `/sign-in` on cookie **presence**,
  while `(app)/layout.tsx` and the API decided on session **validity**. A
  `JSESSIONID` that outlived its session (Spring's 30-minute idle default, or
  an API restart with in-memory sessions) therefore ping-ponged between
  `/sign-in` and the shell **forever** — reproduced with curl, then fixed. Now
  only `resolveSignInGate` (identity port) decides to skip sign-in and the
  proxy leaves the route alone; `authenticatedDestination` also closes a second
  instance of the same loop (`?next=/sign-in`). FE checks green (77 web tests,
  typecheck, lint, build 11 routes); verified live for stale, absent, and valid
  sessions. Not yet committed
- **2026-09-24:** **F-03 completed and archived** (branch `F03-auth-ui`).
  The identity **port** landed in `apps/web/app/lib/identity/` (typed over
  `docs/api/openapi.yaml`; `JSESSIONID` + `XSRF-TOKEN` relayed by Next;
  **no** client auth library) and the shell is session-aware: `proxy.ts`
  (Next 16's renamed middleware) sends a cookie-less browser to sign-in with
  the requested path remembered, and `(app)/layout.tsx` resolves **three**
  states — authenticated → shell, rejected → sign-in, identity service
  unreachable → an honest "can't confirm" screen. Sign out and workspace
  selection are server actions; the account menu consumes the contract
  `Principal`. The **sign-in block** landed on the reference `@user` supplied
  (`packages/ui/src/shell/login.tsx` + `apps/web/app/sign-in/page.tsx`), with
  the unbacked controls (social sign-in, remember-device, recovery, account
  creation) rendered **disabled with an explanatory note** per `@user`. Adding
  the `Checkbox` primitive surfaced two registry defects, both fixed on
  copy-in (see `docs/memory/implementer.md`). FE checks green (ui + web,
  48 web tests); build green, 11 routes. Verified live: `/sign-in` reachable
  anonymously, `307` for a session holder, guard intact elsewhere, and the
  compiled CSS carries the block's utilities. Frontend lane advances to
  **F-04 (capture / TipTap)**. Gaps recorded: `Workspace` has no sample
  marker; the generic forbidden denial has no reachable trigger yet;
  sign-in was never smoke-tested against the real Java API (B-03 needs the
  `local` profile + Postgres).
- **2026-09-20:** Backend B-02→B-04 completed and archived; Commander
  B-04c eval **GO**; B-04c Implementer closeout **completed** and
  archived. **S-03** mock corpus **completed** (Commander-validated
  PASS-with-notes after Codex token exhaustion left archive/Outcome
  incomplete). Backend lane advanced to **B-05** (ingestion /
  chunking jobs + progress)
- **2026-10-06:** `@user` split B-05 before Implementer execution into
  **B-05a** (Researcher evidence → Architect design) then **B-05b**
  (Implementer). Prior B-05 implementer handoff archived as
  superseded. Researcher slice **completed** and archived
  (`H-2026-10-06-P1-B05A-commander-researcher.md`; evidence
  `docs/research/technical/16-ingestion-chunking-jobs.md`). Architect
  slice **completed** and archived
  (`H-2026-10-06-P1-B05A-ARCH-commander-architect.md`; lock in
  `architecture.md` §5.2.1; **no ADR-0006**)
- **2026-10-06:** Commander **accepted** B-05a design; backend lane
  rewritten to **B-05b Implementer** (`ready`). **B-05c** remains
  listed after B-05b
- **2026-10-09:** B-05b **completed and Commander-accepted**. Commander
  inspected the additive V4/RLS/worker/HTTP path and independently reran
  `cd apps/api && ./gradlew clean test`: **100 tests, 0 failures, 0 errors,
  0 skipped**. The backend lane advanced to **B-05c** (test closeout +
  guided verification); B-06 remained closed pending Commander acceptance of
  B-05c
- **2026-10-11:** B-05c **completed and Commander-accepted**. Commander
  reviewed the verification archive and independently reran
  `cd apps/api && ./gradlew clean test`: **136 tests, 0 failures, 0 errors,
  0 skipped**. The backend lane advanced to **B-06** (pgvector + mock embed
  adapter). Collections sequencing remains an open `@user` / Commander
  decision, but no explicit resequencing moved it ahead of B-06
- **2026-10-11:** B-06 **completed and Commander-reviewed**. Deterministic
  mock embeddings now feed real PostgreSQL/pgvector persistence and tenant/
  workspace-scoped vector search; live modes still fail closed. Commander
  independently reran `cd apps/api && ./gradlew clean test`: **140 tests, 0
  failures, 0 errors, 0 skipped**, including the four Docker-backed B-06
  retrieval IT cases. The backend lane initially advanced to B-07.
- **2026-10-11:** `@user` explicitly resequenced **B-06d before B-07** and
  supplied the AvalAI developer-documentation starting point
  `https://docs.avalai.ir/fa/`. B-07 was superseded before execution and
  preserved as the next normal slice. B-06d is live with `/researcher`; the
  sequential gates remain Researcher evidence → Architect decision →
  Implementer only after GO and a locally configured key outside the repo
- **2026-10-11:** B-06d Researcher evidence was archived and Commander
  reviewed its `GO_WITH_CONDITIONS` disposition. The later user choice of
  AvalAI `text-embedding-v4` at 1024 dimensions supersedes the archived
  handoff's earlier preferred model. Backend lane now assigns **B-06d
  Architect** to decide the bounded development probe, ADR-0004 fit,
  secret/model isolation and evaluation gates. No Implementer or live
  provider work is open. AvalAI account/terms/payment eligibility remains
  a user decision before any live smoke
- **2026-10-11:** B-06d Architect returned `GO_WITH_CONDITIONS` for a
  local S-03-only AvalAI `text-embedding-v4` / 1024 probe. `@user`
  accepted the bounded pre-CX ADR-0004 exception and authorized the
  Implementer lane. The backend head is now **B-06d Implementer ready**;
  actual account/terms/payment, balance, external key and route checks
  remain live-smoke gates. Normal API/CI stay mock-only; B-07 is deferred.
- **2026-10-11:** B-06d Implementer completed the offline slice and archived
  the bounded probe plus runbook. The checked-in run stayed
  `blocked-before-io`, so no AvalAI network call was made and actual
  account/terms/payment, balance, external key, route, charge, and live
  retrieval observations remain deferred operator evidence. Commander
  consumed that offline proof as sufficient to satisfy the user-imposed
  sequencing gate and reopened **B-07** as the live backend lane head.
- **2026-10-11:** **B-07 completed and Commander-validated PASS.** Commander
  reread the archived implementation contract, evaluation doc, search adapter
  and controller, and the focused retrieval/search HTTP tests, then reran the
  focused B-07 validation command plus `cd /home/kenzo/RivenStack/omni-note/apps/api && ./gradlew clean test`.
  The full backend gate passed at **156 tests, 0 failures, 0 errors, 0
  skipped**. Checked-in retrieval evidence remains bounded to the mock
  embedding path and records architecture §7 metrics plus zero isolation
  failures. The backend lane now awaits explicit Commander sequencing;
  **B-08 remains closed**.
- **2026-10-11:** Commander consumed the post-B-07 hold state and opened
  **B-08** as the live backend slice. The backend lane no longer idles on a
  repeat evaluation hold; it now assigns the mock ask adapter + citation
  assembler on the frozen S-02 ask/SSE contract.
- **2026-10-12:** B-08 was resequenced Researcher → Architect → Implementer
  under the user's controlled local/demo AvalAI Ask exception. Researcher
  selected Alibaba `qwen3.5-plus` with thinking disabled. The user added an
  Alibaba API package; the top-level credit fields remained zero but active
  source credit paid for model calls. The mock and gated live adapters,
  citation assembler and S-02 SSE API passed **164 backend tests** and the
  frozen S1–S6 synthetic live application API matrix with authorized,
  openable citations. Account lookup reconciled **26** successful
  Researcher/B-08 transactions at **$0.01247960**, with 27 shared ledger
  reservations. Commander validated **B-08 PASS** and opened separate
  **B-08p** Architect-first checkpoint for import → chunk → live AvalAI
  embedding → retrieval → AvalAI Ask/citation before B-09. Production AI
  and customer-note provider use remain closed. The user's later
  Gemini funding/explicit model setting is tracked separately as
  **B-08g listed**, with no automatic fallback and no B-09 dependency.
- **2026-10-11:** **F-05 (organize) completed on the frontend lane** (branch
  `F05-organize`) — resumed out of sequence at `@user` direction after the lane
  jumped F-04 → F-12/F-13/F-14. Inbox and Notes are server-first lists over
  `listNotes` with URL-based cursor pagination (`?cursor=…`, bounded at 20
  pages, only server-issued cursors); rows are keyboard-operable links with
  `bdi`-isolated titles, and empty / loading / transport-error states share one
  block set. The **Collections sub-slice stays soft-stopped**: S-02 has no
  `collections`/`tags` operation and `Note` carries no folder/tag field, so the
  route states the gap instead of forking a client-side model, and the contract
  change remains a Commander/`@user` decision. Verified live against the local
  Java API + Postgres (20-row page, `Load more`, `First page`, stale-cursor
  fallback to the server cursor, empty state); the temporary verify actor was
  removed afterwards. Gate: ui 451 / web 87 tests, typecheck, lint, and
  `web:build` green (`--skip-nx-cache`). Known pre-existing flake recorded, not
  a defect: `ui:test` failed twice in 18 full-suite runs on the untouched
  `src/shell/login.test.tsx` `aria-busy` assertion (18/18 in isolation).
- **2026-10-11:** **F-15 stream reconciled and merged; F-06 opened as the
  live frontend head.** The parallel `f15-editor-redesign-governance` branch
  (docs-only, 5 commits — governance **G-1…G-4**: editor package rows in
  `docs/research/version-ledger.md` with `@codemirror/autocomplete` 6.20.3 /
  `@codemirror/search` 6.7.2 as candidates pending Architect confirmation and
  vim/math/mermaid gated; `[[wikilink]]` v1 deferral; **three capture modes +
  lock** synced into `docs/design/system-ux.md`; **F-13/F-14 reconciled to
  completed**) was merged into `develop` with its six shared-doc conflicts
  resolved. F-14's completed lane head was archived via the merge
  (`H-2026-10-02-P1-F14-commander-implementer.md`) and F-05's completed head
  was archived on lane rotation
  (`H-2026-10-11-P1-F05-commander-implementer.md`). F-15's implementation
  phases A–H never began (no code), so its ready handoff was archived
  **superseded before execution** and F-15 returns to **`listed`** with the
  plan preserved. **F-06 (retrieve)** takes the live frontend lane head —
  dependency-ready (S-02 search + B-07 PASS) and on the core CX journey path:
  search port over the frozen contract, `/search` screen with server
  snippets, a real Sample/Mine filter, an honest degraded notice, and a
  pivot to Ask.
- **2026-10-11:** **F-06 retrieve built and live-verified; frontend lane head
  cleared.** `/search` is a real screen over the frozen S-02 search contract:
  one search port (`apps/web/app/lib/search/`, hybrid default — deterministic
  fusion already includes lexical, so no retrieval-mode toggle), URL-held
  `?q=`/`?corpus=` state, snippet-led rows rendered verbatim as text (no client
  highlighting, `bdi`-isolated, `wrap-anywhere`), a real Sample/Mine filter on
  `corpusOwnership`, a degraded/incomplete notice inside the single announced
  result count, six honest states (idle / zero-match / degraded / generic denial
  / validation / unavailable), and a quiet Ask pivot (`/ask` stays F-07's). Look
  and the snippet-led row were chosen by `@user` 2026-10-11; blocks are new
  `packages/ui/src/search/**` with injected link components and the directory
  registered in `styles/globals.css` (F-05 lesson applied). Verified against the
  local Java API + Postgres with a temporary actor/note fixture (removed
  afterwards): results, both filter positions, idle, zero-match, degraded,
  denial, validation, and unavailable all confirmed on rendered HTML; the
  controlled-replay stub covered the failure states a healthy API cannot
  produce. **Bug found and fixed during that check:** the port rejected the
  API's `"corpusOwnership": null` for unlabelled notes and reported the whole
  answer as *unavailable* — the field is optional, so `null` now reads as
  absent. Gate: ui 476 / web 114 tests, typecheck, lint, `web:build` green
  (`--skip-nx-cache`); new search suites 24/24 (ui) and 27/27 (web) in
  isolation. **One `@user`-authorized change outside the ticket's write paths:**
  `packages/ui/src/shell/login.test.tsx` (test-only). Adding this slice's suites
  exposed a pre-existing no-op helper there (`const settle = async () =>
  Promise.resolve()`), which made its `aria-busy` assertion race React's
  transition — 6/6 full-suite runs red before the one-line fix, 6/6 green after.
  **Visual/mobile pass awaits `@user`** — no browser in the implementer
  session. Observed local-data gap (not a UI fix): every note in the dev
  database has `corpus_ownership` NULL, so Sample/Mine return nothing while All
  returns the hits; labelling notes at creation is backend/seed work, and the
  client must not infer ownership.
- **2026-10-12:** **Inbox and Collections removed from the shell; the
  collections sub-slice recorded as `BL-26`.** `@user` directed a
  `system-ux.md` §1 contract change: with no collections/folders contract there
  is nothing to file, so an "unfiled" Inbox and an "all notes" Notes were the
  same list under two names, and the shell was advertising a distinction it
  could not honour. The shell now carries **New note, Notes, Search, Ask**
  (sidebar, mobile tab bar, and command palette); the `/inbox` and
  `/collections` routes, the `UnfiledNotice` / `CollectionsUnavailable` gap
  blocks, and the Collections sub-menu were removed; the app root and the
  post-sign-in default landing (`DEFAULT_AUTHENTICATED_PATH`) moved to `/notes`;
  the `proxy.ts` matcher dropped both routes. F-05's collections sub-slice is
  **not declined** — it is recorded as **`BL-26`** in
  `docs/planning/feature-backlog.md` (`proposed`) with its **backend needs**
  named: S-02 contract authorship (`collections`/`tags` operation + a folder/tag
  field on `Note`), a Flyway migration with an RLS policy, and a Java
  port/adapter (ADR-0005). `@user` will decide later whether to author the
  contract and implement it. Gate: `ui` + `web` typecheck / lint / test green
  (`--skip-nx-cache`).
- Production AI / OpenRouter live calls are **not** authorized
- DevOps I-* remain **unassigned** (split later); local Compose Postgres
  is Backend-owned (B-02 completed)

### Accepted stack (do not re-open except as noted)

| ADR | Decision |
|-----|----------|
| ADR-0001 §1 | Next.js 16.3.5 App Router |
| ADR-0001 §2 | TipTap 3.31.3; ProseMirror JSON SoT |
| ADR-0001 §3 | PostgreSQL 18; shared schema + app scope + RLS DiD |
| ADR-0001 §4 | pgvector in Postgres |
| ADR-0001 §5 + ADR-0004 | Mocks first; OpenRouter operator free-tier gateway; customer BYOK v1; dual-mode; usage port; no Assistants/`vector_stores` SoT. One accepted B-06d local synthetic-fixture exception; no product activation |
| ADR-0001 §6 | Identity **port** stays; Better Auth **library** superseded by Spring Security sessions (ADR-0005) |
| ADR-0001 §7 | AWS Free-plan topology class: EC2 and/or ECS + RDS Postgres + pgvector; 6-month window in-scope; VPS fallback only if AWS cannot cover; Railway/Render not default |
| ADR-0002 | Nx 23.2.1, pnpm 12.4.1, Node 24 for **frontend** graph. `apps/api` = JVM Gradle beside Nx; TS `packages/domain` not backend SoT; ArchUnit for Java |
| ADR-0003 | Tailwind 4.3.3 + shadcn/ui on Base UI; RSC + Server Actions; Vitest/Playwright/axe/MSW/Storybook |
| ADR-0005 | `accepted` — Java 21 + Boot 4.1.x; Gradle; Option B; sessions; Spring AI adapters only; Log4j2; Spring Data JDBC + JdbcTemplate/pgvector-java + Flyway; Python not Phase 1. [ADR-0005](docs/adr/ADR-0005-backend-application-stack.md) |

### Wave B + C evidence (do not rewrite as selection)

| Stream | Path |
|--------|------|
| Technical | `docs/research/technical/` (Wave C 05/07/09; **R-BE** 10–15, 2026-09-15) |
| UX | `docs/research/ux/` (0.8b added 09 + REC-13…19) |

## Active Tasks

| Task | Lane | Owner | Status | Handoff |
|------|------|-------|--------|---------|
| 0.1–0.9 | — | (see archive) | completed | `docs/handoffs/archive/` |
| D-01 Visual system + journey UI specs | frontend | Designer | **completed** (Commander-accepted) | `docs/handoffs/archive/H-2026-09-14-P1-D01-commander-designer.md` |
| S-01a FE Nx + boundary CI | shared | Implementer | **completed** | `docs/handoffs/archive/H-2026-09-15-P1-S01A-commander-implementer.md` |
| S-01b Java API scaffold | backend | Implementer | **completed** | `docs/handoffs/archive/H-2026-09-15-P1-S01B-commander-implementer.md` |
| F-01 Design tokens + shadcn | frontend | Implementer (front-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-16-P1-F01-commander-implementer.md` |
| F-02 App shell + honest workspace switcher | frontend | Implementer (front-end programmer) | **completed** 2026-09-23 — nested sidebar, slim top bar, bottom tab bar, centered content, skip link + route focus, Cmd/Ctrl+K palette; shell blocks in `packages/ui/src/shell` | `docs/handoffs/archive/H-2026-09-23-P1-F02-user-implementer.md` |
| F-03 Auth / session UI | frontend | Implementer (front-end programmer) | **completed** 2026-09-24 — identity port, three-state session entry, sign-out wiring, selector semantics, and the sign-in block (branch `F03-auth-ui`; ui + web checks and build green) | `docs/handoffs/archive/H-2026-09-23-P1-F03-user-implementer.md` |
| F-04 Capture (TipTap) | frontend | Implementer (front-end programmer) | **completed** 2026-09-25 (Commander-validated PASS) — notes port, shared transport, save cycle, import-status, capture blocks + `/notes/new` + `/notes/[noteId]`; ui 277 / web 77 tests, build 12 routes | `docs/handoffs/archive/H-2026-09-24-P1-F04-implementer-implementer.md` |
| F-05 Organize (notes list) | frontend | Implementer (front-end programmer) | **completed** 2026-10-11 (branch `F05-organize`) — server-first notes list over `listNotes` with URL-based server cursors; **updated 2026-10-12**: Inbox and Collections removed from the shell (no collections contract ⇒ identical lists); collections sub-slice recorded with backend needs as `BL-26` | `docs/handoffs/archive/H-2026-10-11-P1-F05-commander-implementer.md` |
| F-06 Retrieve (search) | frontend | Implementer (front-end programmer) | **completed** 2026-10-11 (branch `F06-retrieve`) — search port (hybrid default) + `/search` screen over the frozen S-02 search contract: URL-held `?q=`/`?corpus=`, snippet-led verbatim rows, real Sample/Mine filter, degraded notice, six honest states, quiet Ask pivot; live-verified against the local Java API (temporary fixture removed); **visual/mobile pass awaits `@user`** (no browser in session) | `docs/handoffs/active/lane-frontend.md` |
| F-13 Multi-mode capture & markdown editing | frontend | Implementer (front-end programmer) | **completed** 2026-10-01 (`@user`-verified) — three capture modes + lock, CodeMirror 6 live preview, JSON↔markdown bridge (commits `3c170f9`/`fe5a97f`); reconciled to `completed` 2026-10-11 via the F-15 governance stream | `docs/planning/implementation-tracks.md` |
| F-14 Markdown & editor tables | frontend | Implementer (front-end programmer) | **completed** 2026-10-02 — tables across all modes; archived 2026-10-10 via the F-15 governance stream | `docs/handoffs/archive/H-2026-10-02-P1-F14-commander-implementer.md` |
| F-15 Obsidian-parity editor redesign | frontend | Implementer (front-end programmer) — **deferred** | **listed (deferred)** — governance G-1…G-4 complete 2026-10-10; implementation phases A–H not started; ready handoff archived superseded-before-execution 2026-10-11 | `docs/plans/2026-10-10_104547-obsidian-parity-editor-redesign.md` |
| F-02a Visible UI kit (stock shadcn) | frontend | Implementer (front-end programmer) | **completed** — `/kit` page; archived `H-2026-09-22-P1-F02A` | `docs/handoffs/active/lane-frontend.md` |
| B-01 Domain port interfaces | backend | Implementer (back-end programmer) | **completed** (Commander-validated 2026-09-17) | `docs/handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md` |
| S-02 Canonical HTTP / OpenAPI / SSE | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-17-P1-S02-implementer-implementer.md` |
| B-02 Postgres schema + RLS + local Compose | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-B02-commander-implementer.md` |
| B-03 Identity sessions + membership binder | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-B03-implementer-implementer.md` |
| B-04 Notes CRUD + version concurrency | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-B04-implementer-implementer.md` |
| B-04c Commander eval (B-01–B-04) | backend | Commander | **completed** (GO) | `docs/handoffs/archive/H-2026-09-20-P1-B04C-implementer-commander.md` |
| B-04c Test + Postman closeout | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-B04C-IMPL-commander-implementer.md` |
| S-03 Deterministic mock corpus | backend | Implementer (back-end programmer) | **completed** | `docs/handoffs/archive/H-2026-09-20-P1-S03-commander-implementer.md` |
| B-05 (pre-split implementer) | backend | Implementer (back-end programmer) | **superseded** 2026-10-06 | `docs/handoffs/archive/H-2026-09-20-P1-B05-superseded-split.md` |
| B-05a Ingestion/chunking research + design | backend | Researcher → Architect (sequential) | **completed** (Commander-accepted 2026-10-06; no ADR-0006) | `docs/handoffs/archive/H-2026-10-06-P1-B05A-ARCH-commander-architect.md` |
| B-05b IngestionPort implement | backend | Implementer (back-end programmer) | **completed; Commander-accepted** 2026-10-09 | `docs/handoffs/archive/H-2026-10-06-P1-B05B-commander-implementer.md` |
| B-05c Ingestion test closeout + guided verification | backend | Implementer (back-end programmer) | **completed; Commander-accepted** 2026-10-11 | `docs/handoffs/archive/H-2026-10-09-P1-B05C-commander-implementer.md` |
| B-06 pgvector + mock embed adapter | backend | Implementer (back-end programmer) | **completed; Commander-reviewed** 2026-10-11 | `docs/handoffs/archive/H-2026-10-11-P1-B06-commander-implementer.md` |
| B-06d AvalAI development embedding-provider PoC | backend | Implementer (back-end programmer; after Researcher and Architect) | **completed offline** 2026-10-11; operator live smoke remains deferred on account/key/route checks | `docs/handoffs/archive/H-2026-10-11-P1-B06D-commander-implementer.md` |
| B-07 lexical + hybrid search | backend | Implementer (back-end programmer) | **completed; Commander-validated PASS** 2026-10-11 — B-08 opened afterward | `docs/handoffs/archive/H-2026-10-11-P1-B07-REOPEN-commander-implementer.md` |
| B-08 Ask model research, gate, mock/live adapter | backend | Researcher → Architect → Implementer; Commander validated | **completed PASS** 2026-10-12 — 164 tests, synthetic live S1–S6 API matrix, openable citations, $0.01247960 reconciled spend | `docs/handoffs/archive/H-2026-10-12-P1-B08-RETURN-implementer-commander.md` |
| B-08p full live pipeline checkpoint | backend | Architect (back-end programmer) | **ready** — design local/demo live embedding-through-app gate, then Implementer tests import → chunk → AvalAI embed → retrieval → Ask before B-09 | `docs/handoffs/active/lane-backend.md` |

Full F-01…F-11, B-01…B-12, S-02, S-03, I-01…I-09 lists:
[`docs/planning/implementation-tracks.md`](docs/planning/implementation-tracks.md).

## Blockers

- Production AI/provider activation remains gated (mock-first CX)
- RTL locale support remains deferred, not closed
- **F-03+** unblocked by **S-03** fixtures (and/or **B-03** live
  identity) — FE still needs a narrowly scoped `web → mocks`
  development/test import exception before in-app MSW wiring. `@user` chose 2026-09-24 (Option A) to leave that sub-slice **soft-stopped**: the port targets the live API and tests inject through the port, so no fixture authority was created on the FE. Granting the exception needs `packages/mocks` tags + `eslint.config.mjs` — outside the frontend lane's write paths, so it stays open and **F-05 and F-06 hit it too**
- AWS deploy and live OpenRouter are I-* / Phase 3–4 — not F-02/B-05c
- DevOps I-* have no human owner yet
- **Collections (folders/tags) API contract** remains missing from S-02;
  recorded as **`BL-26`** (`proposed`, 2026-10-12) in
  `docs/planning/feature-backlog.md` with its backend needs (contract,
  Flyway + RLS migration, Java port/adapter). The decision to sequence that
  contract change ahead of later frontend organize work is still open. There
  is no Collections or Inbox surface in the shell (removed 2026-10-12)
- **B-06d AvalAI development-provider PoC** is implemented offline under the
  accepted fixture-only ADR exception. Researcher evidence remains a dated
  snapshot; actual account/terms/payment, balance, route, charge, key, and
  live retrieval checks remain deferred operator evidence. The development key
  stays outside the repository. No live test or product activation is claimed
- **`packages/ui` suite is green again.** The `login.test.tsx` note assertion
  was a deliberate change, not a regression: `@user` decided 2026-09-25 that the
  disabled social sign-in buttons stay **unannotated** (the account-creation
  group keeps its note). Fixed in `3802d9b`; verified 277/277 ui tests
- **Collections has no contract surface** (found 2026-09-25 closing F-04).
  `docs/api/openapi.yaml` has no `collections`/`tags` operation and `Note`
  carries no collection/tag field. F-05's folders/tags sub-slice is recorded as
  **`BL-26`** (`proposed`) in `docs/planning/feature-backlog.md` (2026-10-12)
  with its backend needs. Adding it is a **contract change** (S-02 authorship,
  backend lane) and needs an `@user`/Commander decision — a new track (the
  program of record lists no backend collections item) or an S-02 extension.
  No client-side folder/tag model exists; the shell shows one notes list

## Open Gates

**Closed 2026-09-14**

- ADR-0001 §1–§5 and §7; ADR-0004 dual-mode BYOK
- Budget, self-host preference, 30-day retention, BYOK v1, data region
  none, no year-1 SSO, minimal tenants, collab much later, 6-month AWS
  Free Tier window, mock-first then labelled live, public sample workspace
- Nx Cloud remains local-cache-only
- Two-developer track model accepted (serial Implementer loop superseded)

**Closed 2026-09-15 (A-BE2)**

- ADR-0001 §6 Better Auth **library** disposition → Spring Security
  sessions (ADR-0005)
- ADR-0002 Node `apps/api` / TS domain SoT → JVM Gradle + Java ports
- ADR-0005 backend application stack → `accepted`

**Closed 2026-09-16**

- D-01 design package → Commander-accepted (bounded gaps in
  `docs/design/traceability.md` §6 remain open; F-01 resolved the
  Storybook question by folding scaffolding into F-02)
- S-01a / S-01b scaffolds → completed

**Still open / standing**

- **RTL locale support** — deferred, not closed
- **Production AI / provider activation** — open until CX-first mock
  validation
- UT-1…UT-22 — unrun hypotheses (0.8b added UT-15…22)
- **Collections (folders/tags) API contract** — missing from S-02; recorded as
  **`BL-26`** (`proposed`, 2026-10-12) with its backend needs. Needs an
  `@user`/Commander sequencing decision (contract change; a new backend track or
  an S-02 extension)
- Exact AWS Free-plan service graph / credit-burn PoC — I-03 (unassigned)
- DevOps I-* human split — later

## Active Handoffs

- **Commander index:** `docs/handoffs/current.md` (`to: commander`) —
  dual-lane board only; not an implementer work ticket
- **Frontend lane:** `docs/handoffs/active/lane-frontend.md` →
  `/implementer` (**F-06 retrieve**, `ready`, `lane: frontend`, human:
  front-end programmer; F-15 editor redesign deferred back to `listed`)
- **Backend lane:** `docs/handoffs/active/lane-backend.md` →
  `/architect` (**B-08p** full live pipeline checkpoint gate, `ready`,
  `lane: backend`; human: back-end programmer)

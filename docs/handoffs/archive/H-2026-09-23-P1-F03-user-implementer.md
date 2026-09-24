---
handoff_id: H-2026-09-23-P1-F03-user-implementer
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-03"
lane: frontend
human_owner: front-end-programmer
from: user
to: implementer
created: 2026-09-23
updated: 2026-09-24
---

# F-03 — Auth / session UI

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-03 exactly. Build sign-in / sign-out and session-aware shell entry per docs/design/system-ux.md (structure only). For every visual block, ask @user for a reference (link, pasted code, or a prompt — image welcome) before building it. UI details stay open; do not follow D-01 layouts or inventory. Do not open F-04. Do not touch apps/api, packages/mocks, packages/contracts authorship, docs/handoffs/current.md, or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-03` only.

Make the shell session-aware: a sign-in experience, sign-out, and an
authenticated vs unauthenticated entry into the F-02 shell. The workspace
switcher stays a **pure selector**. Structure and behavior come from
`docs/design/system-ux.md` and `architecture.md` §2/§5; **UI details stay
open** and each visual block needs a `@user` reference (or an offered choice
logged in `docs/design/now.md`).

## Required Reading

1. `docs/design/system-ux.md` — workspaces as a selector; generic forbidden
   denial; honest at n≈1
2. `docs/design/now.md` — the visible plan; log reference choices
3. This file
4. `context.md` (read-only)
5. F-02 shell blocks and primitives in `packages/ui` (`shell/**`,
   `components/**`) — use them; do not extend tokens
6. `docs/api/openapi.yaml` + `packages/contracts` generated types
   (`Principal`, `WorkspaceList`) — consume only
7. ADR-0001 §6 and ADR-0005 — identity is the **port**; implementation is
   Spring Security HTTP-only session cookies in the Java API. **No client
   auth library** (the Better Auth *library* is superseded)
8. `architecture.md` §2 (tenancy / selector semantics)
9. `quality/ui-qa-checklist.md` (a11y release gate)
10. F-03 history/context: S-03 identity fixtures and B-03 live identity

## Inputs / Evidence

- F-02 shell landed 2026-09-23 (`packages/ui/src/shell`,
  `apps/web/app/(app)`) — archive:
  `docs/handoffs/archive/H-2026-09-23-P1-F02-user-implementer.md`
- B-03 (Java identity sessions + membership binder) **completed**;
  S-03 canonical HTTP/OpenAPI/SSE contracts **completed**
- S-03 mock corpus **completed** (identity fixtures available to the FE)
- Canonical contracts: `docs/api/openapi.yaml`, `packages/contracts`
- Note: the FE still needs a narrowly scoped `web → mocks` import
  exception before in-app MSW wiring (see Blockers in `context.md`)

## Task details

| Concern | This task |
| --- | --- |
| API connections | Identity **port** only — the Java session API (ADR-0005). Consume `@omnidoc/contracts` types (`Principal`, `WorkspaceList`). MSW identity fixtures (S-03) for mocks **once the `web → mocks` import exception exists**; B-03 live identity is available for a live path. **No** client auth library, no provider SDK. If the exception is still unauthorized, build props-first + a thin typed adapter and soft-stop the MSW wiring sub-slice |
| State management | Form state local; server-side redirects for session entry; never trust client-only ACL. Zustand only if shared client state is real |
| Routing / IA | Sign-in route outside the authenticated shell; the shell entry becomes session-aware (unauthenticated → sign-in; authenticated → shell). Sign-out returns to the unauthenticated entry. Routes may be stubs where later slices own the body |
| Workspace switcher | Remains a **pure selector**; membership is server-resolved. A forbidden selector is a generic denial ("You don't have access to that workspace."). Honest at n≈1; sample workspace separated and labelled |
| Locale / direction | Single `lang`/`dir` source stays `apps/web/app/locale.ts` → `layout.tsx`; `DirectionProvider` is the only direction source; logical CSS; `bdi` around identifiers/UGC |
| Accessibility | Labels on every field; errors announced (`role="alert"`), not color-only; visible focus; submit keyboard-operable; no focus loss on submit/redirect; skip link + landmarks from F-02 preserved |
| Mobile | Sign-in usable at ~390px; no gesture-only controls; touch targets meet minimums |
| Look | References `@user` supplies per block (sign-in card, form fields, session-aware shell entry, sign-out control). No palette invention; token values change only through the token layer |

## Reference protocol (per visual block)

Blocks in scope: sign-in card/layout, form fields (email/password),
submit/busy/error states, session-aware shell entry state, sign-out control.

1. Before building a block's UI, ask `@user`: *do you have a reference —
   a link, pasted code, or a prompt (image welcome) — for this?*
2. No reference → offer 2–3 options (e.g. stock shadcn `Card` + `Field`
   family; a thin custom card on Base UI; reuse an existing block) and wait.
3. Log each choice in `docs/design/now.md` (Decisions log).
4. Focus management, labels, error announcement and the generic forbidden
   copy are **not** visual choices — they are gate/security requirements;
   build them without asking.

## Allowed Write Paths

- `packages/ui/**` (auth/shell blocks as copy-in blocks; no token edits)
- `apps/web/**` (sign-in route, session entry, identity port client,
  fixtures wiring **only** if the import exception is authorized)
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

- Journeys: capture (F-04), organize (F-05), retrieve (F-06), ask (F-07),
  dual-mode chrome (F-08), sample path (F-09)
- Year-1 enterprise SSO (not required)
- Production AI; RTL locale; AWS / DevOps I-*
- Token values, palettes, motion systems (references first)
- Contracts / OpenAPI / Java authorship; fixtures authorship

## Deliverables

1. Sign-in experience: form (email + password), inline validation, busy
   state, and a distinguishable failure state — all via the identity port.
2. Sign-out control wired into the shell.
3. Session-aware shell entry: unauthenticated → sign-in; authenticated →
   F-02 shell; no client-only ACL decisions.
4. Workspace switcher confirmed as a pure selector; generic forbidden
   denial; honest at n≈1; sample separated/labelled.
5. Contract-typed identity consumption (generated types); no local shape
   forks. Fixtures wiring **only** under the authorized exception, else a
   logged bounded gap.
6. Tests (Vitest) for the form states, error announcement, focus, and the
   selector semantics; `packages/ui` + `apps/web` checks green.
7. Outcome here; decision log rows in `now.md`; status in `context.md`.

## Constraints / Prohibited Decisions

- Do not add a client auth library (ADR-0001 §6 library superseded)
- Do not invent visual details no reference covers
- Do not reproduce D-01 layouts
- Do not add tokens or edit `tokens.css`
- Do not author fixtures, OpenAPI, or Java code
- Do not import provider SDKs into `apps/web` / `packages/ui`
- Do not reveal whether a forbidden workspace exists (generic copy only)
- Do not claim RTL locale support; do not activate production AI
- Do not fake enterprise scale (org charts, seats, SSO chrome)

## Acceptance Criteria

- Unauthenticated entry reaches sign-in; authenticated entry reaches the
  shell; sign-out returns to the unauthenticated entry
- Every field is labelled; errors are announced and not color-only; submit
  is keyboard-operable; visible focus everywhere; no focus loss
- Identity is consumed through the **port** only; no client auth library
- Workspace id is a selector only; forbidden copy is the generic sentence
- Single `lang`/`dir` source; logical CSS; `bdi` on identifiers/UGC
- Each built block has a logged `@user` reference or logged choice
- Contracts consumed as generated types; no local shape forks
- `packages/ui` + `apps/web` typecheck, tests, build green
- `current.md`, backend lane, contracts, mocks authorship untouched

## Stop / escalate conditions

- **Soft-stop:** the `web → mocks` import exception is not authorized →
  build the UI props-first against the identity port, log the wiring gap in
  `now.md`, and stop the MSW sub-slice (not the task)
- **Soft-stop:** a block has no reference and `@user` is unavailable → stop
  that block, log the open choice
- **Hard-stop:** client auth library pressure; write-path collision with
  backend; ADR reopen; production AI activation; claiming RTL shipped

## Dependencies / Risks

- Depends on: F-02 (completed), and B-03 (completed) **or** S-03 identity
  fixtures (completed)
- Blocks: F-04+ (capture next)
- Parallel: backend lane — no mutual dependency
- Risk: identity fixtures wiring needs the `web → mocks` exception; do not
  fork a second fixture authority or author fixtures on the FE
- Risk: treating a client-supplied workspace/tenant id as authority —
  forbidden; membership stays server-resolved

## Gates

- Production AI activation remains gated
- RTL locale remains deferred (readiness discipline applies)
- UT-* remain unrun
- Design language: **Mintlify** (2026-09-23); per-block layout references
  still required

## Completion Instructions

1. Complete deliverables inside Allowed Write Paths.
2. Append Outcome; set `status: completed`.
3. Archive to
   `docs/handoffs/archive/H-2026-09-23-P1-F03-user-implementer.md`
   (immutable).
4. **Same-lane sequence rule:** on completion, rewrite this path to
   **F-04 (capture / TipTap)** using the same format (structure from
   `system-ux.md`, references from `@user`, integration details in the Task
   details table). If a cross-lane dep is unmet (e.g. notes fixtures), log
   the soft-stop instead.
5. Durable lessons only in `docs/memory/implementer.md`.
6. Do not overwrite `current.md` or `lane-backend.md`; update `context.md`
   status lines only.

## Outcome

**Completed 2026-09-24.** Branch `F03-auth-ui`. Every deliverable is built and
verified. The sign-in block was **held** at first because `@user` had not yet
supplied a reference; once they did (a shadcn-style login card, 2026-09-24) the
block was built and F-03 closed. No part of the reference was guessed at.

**Landed**

- `apps/web/app/lib/identity/` — the identity **port** and its wiring:
  `identity-api.ts` (total, typed adapter over `docs/api/openapi.yaml` for
  `POST`/`GET`/`DELETE /api/v1/session` + `GET /api/v1/workspaces`;
  `OMNIDOC_API_ORIGIN`, server-side only), `cookies.ts` (relays `JSESSIONID`
  as httpOnly and `XSRF-TOKEN` as readable; `secure` follows the API origin),
  `session.ts` (`next/headers` binding + the three-state `getShellSession`),
  `workspace-selection.ts` (pure selector logic), `actions.ts` (sign-in /
  sign-out / workspace-selection server actions). The interim
  `sign-in-result.ts` was deleted: `packages/ui`'s `LoginForm` is now the single
  authority for the failure kinds (`LoginFailure` + `LOGIN_FAILURE_MESSAGES`),
  so the union is not declared twice.
- `apps/web/proxy.ts` — Next 16's renamed `middleware`: cookie-less browsers
  go to `/sign-in?next=…`; every other request carries its path forward as
  `x-omnidoc-requested-path` so a *stale* session can also return there.
  (Layouts receive no pathname, so this is the only way to honour "return to
  the requested route".) Added to `tsconfig.app.json` so `web:typecheck`
  covers it.
- `apps/web/app/(app)/layout.tsx` — session-aware entry: authenticated → shell
  with **server-resolved** workspaces; rejected → `signInHref(requested)`;
  identity unreachable → `IdentityUnavailable` (new block).
- `nav-user.tsx` / `app-sidebar.tsx` / `shell.tsx` — `ShellUser` **deleted**;
  the menu consumes the contract `Principal` and renders `actorId` in a `bdi`.
  Sign out is wired to the session action; workspace selection goes through a
  server action that re-checks membership before remembering a pick.

**Sign-in block — landed after the reference arrived**

- `packages/ui/src/shell/login.tsx` — `LoginForm`, built from the reference
  `@user` supplied. Four departures, each recorded in `docs/design/now.md`:
  1. **No third-party assets.** The reference loaded its logo and provider
     icons from `images.shadcnspace.com`; those are runtime requests to a host
     this project does not control, so the mark and provider icons are Tabler
     glyphs.
  2. **Unbacked controls render disabled, per `@user`'s explicit choice.**
     Social sign-in, "Remember this device", password recovery and account
     creation have no endpoint (`CreateSessionRequest` is email + password
     only). Each group carries a one-line note saying so, because a disabled
     control with no explanation is just a broken control. Enabling any of
     them is a contract change, not a frontend tweak.
  3. **`CardTitle level={1}`** — the card *is* the page, so the visible title is
     the `h1` rather than an `h1`-then-`h3` outline gap. `CardTitle` gained an
     optional `level` prop (default `3`, so existing cards are unchanged).
  4. **`min-h-dvh`** instead of the reference's `min-h-screen`, and
     `left-full` instead of `left-1/1` (same computed `left:100%`,
     verified in the built CSS).
- `packages/ui/src/components/checkbox.tsx` — `Checkbox`, added through the
  documented `npx shadcn@latest add checkbox` path from `packages/ui`. Two
  defects in the registry output were fixed on copy-in (both in
  `docs/memory/implementer.md`): the registry emits `import { cn } from "cn"`
  and added a `cn` dependency (removed — this project owns its own `cn`), and
  its `disabled:` utilities can never match because Base UI renders the
  control as `<span role="checkbox">`, so `:disabled` never applies; the
  styling now uses the `data-disabled` variant Base UI actually emits.
- `apps/web/app/sign-in/page.tsx` — the route. Sits **outside** `(app)` so it
  renders without the shell. Re-validates `next` with `safeNextPath` before it
  reaches the form (the action validates again on submit; the form input is a
  convenience, never the authority).
- `apps/web/proxy.ts` — now also matches `/sign-in`: reachable without a
  session, and skipped by anyone who already has one.
- The checkbox is named with `aria-labelledby`, not `htmlFor` alone: Base UI
  applies the consumer's `id` to its hidden native input, so a `htmlFor`-only
  label would point at an `aria-hidden` element and leave the visible
  `role="checkbox"` span anonymous.

**MSW sub-slice — soft-stopped (deliberately)**

Soft-stopped per the Stop/escalate conditions, with `@user`'s agreement
(Option A): `apps/web` may not import `@omnidoc/mocks` (tag `scope:tooling`;
`scope:app` may only depend on `scope:shared`), and both `packages/mocks/**`
and `eslint.config.mjs` are outside these write paths. Nothing was faked in its
place: tests inject through the port, and no second fixture authority was
created on the FE.

**Evidence**

- `npx nx run-many -t typecheck lint test -p ui web` green (ui + web,
  48 web tests including 10 for the server actions);
  `pnpm --filter @omnidoc/web build` green — 11 routes, `/sign-in` dynamic,
  `/kit` still static, Next 16 middleware deprecation cleared by the
  `proxy.ts` rename.
- **Sign-in route, against a running production build:** anonymous `/sign-in`
  → `200`; a request holding a session cookie → `307` to `/inbox`; anonymous
  `/inbox` → `307` to `/sign-in?next=%2Finbox`; `/kit` → `200` (outside the
  matcher). Rendered HTML checked: the card title is the `<h1>`
  ("Welcome to OmniDoc"), both social buttons carry `disabled`, the label
  notes are present, no `role="alert"` renders before a failed attempt, all
  three fields have a matching `for`/`id` pair, and the checkbox exposes
  `role="checkbox" aria-disabled="true" aria-labelledby="remember-label"`.
  Utilities confirmed in the compiled CSS (`h-650`/`w-650`/`h-175` as
  `calc(var(--spacing) * n)`, `left-full` as `left:100%`, `rounded-xs`
  as `var(--od-radius-xs)`, `data-disabled:opacity-50` matching
  `[data-disabled]`).
- Against a running production build plus a **throwaway** stub identity API
  (in `/tmp`, never committed): shell entry redirects with the query
  preserved, a stale cookie with the API down → the "can't reach the session
  service" screen with **no** shell chrome, a valid session → the shell
  rendering `actor_alex` and both server-resolved workspaces, and selector
  resolution default → first, stored → second, stale → first (with the
  selector header visible upstream and cookies relayed).
- `actions.test.ts` covers the security-relevant paths deterministically:
  empty fields never reach the API, the four failure kinds stay distinct, a
  success without a session cookie is refused, the cookie relay sets
  `JSESSIONID` httpOnly, and **four hostile `next` values**
  (`https://evil.example/steal`, `//evil.example`, `/\evil.example`, `notes`)
  all fall back to `/inbox` instead of forming an open redirect.

**Gaps handed on**

- `Workspace` has no sample marker, so "sample vs mine" cannot be separated
  without inventing data — needs a contract change + F-09. `system-ux.md`
  §1/§2 still require sample-vs-mine as real data, so this stays open.
- The generic forbidden denial exists in `WorkspaceSwitcher` but **no F-03
  surface triggers it**: a stale preference falls back to a real workspace, and
  a selector the server refuses is not reachable from the shell yet. The copy
  is therefore unreviewed in situ.
- The identity-unavailable entry screen has no reference; it uses the stock
  `Empty` primitive and is flagged for review.
- Sign-out clears the local relay even if the API refuses revocation, so a
  server-side session could outlive the click until its own timeout.
- Sign-in was never exercised against the **real** Java API: B-03's identity
  controllers are profile-gated on a live database (`local`), and local
  Postgres was not started. The port, cookie relay and redirect paths are
  covered by tests and a stub, but a real end-to-end sign-in is still unproven.
- No browser in this session: visual confirmation of the block is `@user`'s.

**Next:** same-lane sequence → **F-04 (capture / TipTap)**. Live head
rewritten to F-04 with `status: ready`; it was not started here.

---
handoff_id: H-2026-09-23-P1-F03-user-implementer
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "F-03"
lane: frontend
human_owner: front-end-programmer
from: user
to: implementer
created: 2026-09-23
updated: 2026-09-23
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

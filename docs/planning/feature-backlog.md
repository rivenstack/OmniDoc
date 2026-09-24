# OmniDoc — Feature Backlog (unscheduled)

**Requested by:** `@user`, 2026-09-24.
**Maintained by:** Commander (program level), and by any agent that surfaces
an item while working a handoff.
**Everything here is unscheduled.** Nothing in this file is committed work,
an ADR, a gate change, or a lane assignment.

Scheduled program of record:
[`implementation-tracks.md`](./implementation-tracks.md) (`F-*`, `B-*`,
`S-*`, `I-*`). Live status: [`context.md`](../../context.md).

---

## Why this file exists

`implementation-tracks.md` answers **"what are we building next"** — it is
sequenced, dependency-mapped, and lane-owned. This file answers a different
question: **"what have we noticed that nobody has scheduled?"**

That includes three kinds of thing:

1. A capability that exists only as a **disabled control** in the UI
   (F-03's four unbacked sign-in controls).
2. A **design contract with no build task** (member management, export).
3. A **known gap recorded in an archived handoff** that no lane owns.

Keeping the two files separate matters. Adding a row to
`implementation-tracks.md` implies sequencing, dependencies, and a lane
owner. A row here implies none of that. **Promotion into the program of
record is Commander's act, after `@user` triage.**

---

## Maintenance rule (standing, `@user` 2026-09-24)

> If something seems necessary and is not scheduled, suggest to `@user`
> that it goes in the backlog.

- Any agent that finds an unscheduled-but-necessary capability, gap, or
  defect must record it here — or, if this file is outside its allowed
  write path, name it explicitly and ask `@user` to add it.
- **Never leave such an item only in chat.** Same principle as the handoff
  protocol: chat-only is not durable.
- Keep entries evidence-linked with a path or command. An item with no
  citation is an opinion, and opinions do not survive handoff.

## Item states

| State | Meaning |
|---|---|
| `proposed` | Recorded, not triaged. The default. |
| `deferred` | `@user` decided: not now, revisit later. |
| `scheduled` | Promoted into `implementation-tracks.md` — keep the row, add the task code. |
| `declined` | `@user` decided against. Keep the row **and the reason**; do not re-raise without new evidence. |

## ID scheme

`BL-nn` — deliberately outside the `F-*` / `B-*` / `S-*` / `I-*`
namespaces, so a backlog row can never be mistaken for scheduled work.
A `BL-*` id is **not** a task code and must not appear in a handoff's
`allowed_task_classes`.

---

## 1. Auth & identity

F-03 (completed 2026-09-24) landed the sign-in block with four unbacked
controls rendered `disabled` with an explanatory note. Those controls are
the visible tip of this section. **None of the items below has a path in
`docs/api/openapi.yaml`** — the whole identity surface is
`POST/GET/DELETE /api/v1/session`, `GET /api/v1/workspaces`, and
`POST /api/v1/workspaces/{workspaceId}/invites`.

| ID | Item | Why it is unscheduled | Suggested necessity | State |
|---|---|---|---|---|
| BL-01 | **Self-serve sign-up** — account creation, credential set, email verification | No `register` / `users` path in `docs/api/openapi.yaml`. `packages/ui/src/shell/login.tsx` renders "Create an account" as a plain `<span>` — not a link, not even a disabled button. `V1__extension_and_core_tables.sql` defines `password_hash`, but **no migration inserts a credential**; the only local identity is `apps/api/load/seed-local-fixture.sql` (`ada@example.com`), and there is no `CommandLineRunner` / dev seeder under `apps/api/src/main/java/**` | **Product gate first.** `@user` must decide self-serve vs invite-only. Self-serve also needs anti-abuse, which no research file covers | `proposed` |
| BL-02 | **Transactional email delivery** — sender, templates, local capture | Nothing mail-related exists anywhere: no `javamail`, `spring-boot-starter-mail`, `JavaMailSender`, `smtp`, `nodemailer`, `resend`, `sendgrid`, or `postmark` in the repo. Invites persist a `workspace_invites` row and return `inviteId` only (`JdbcIdentityAdapter.invite`) — nobody is notified | **The hidden prerequisite.** Blocks BL-01 (verification), BL-03 (reset), BL-06 (email OTP), BL-08 (invite delivery). Nothing else in this section is real without it | `proposed` |
| BL-03 | **Password recovery** — forgot-password request, reset token, expiry, single use | "Forgot password?" is rendered `disabled`; no reset endpoint exists. `docs/design/now.md` (2026-09-24): "Enabling any of them is a contract change, not a frontend tweak" | High for any real user; needs BL-02 | `proposed` |
| BL-04 | **Social sign-in** — Google / GitHub via OIDC | Buttons exist and are `disabled` (`IconBrandGoogle`, `IconBrandGithub`). No OAuth client registration, no consent screen, no provider story. `06-auth-identity.md` and `12-auth-java-spring-security.md` evaluated OIDC (Spring Authorization Server / Keycloak) and called it "likely overkill" for year-1; ADR-0001 §6 and `architecture.md` §5.7 still hold "year-1 SSO not required" | **Product gate.** Note OIDC login ≠ per-tenant SSO, but it is the same infra family — decide once | `proposed` |
| BL-05 | **Remember me / remembered devices** — long-lived rotating session + revoke list | "Remember this device" checkbox is `disabled`. The session is Spring's default `JSESSIONID` (see the `sessionCookie` description in `docs/api/openapi.yaml`); there is no rotation or revocation surface | Medium. Pairs with BL-07 — a "remember me" without revoke is a liability | `proposed` |
| BL-06 | **OTP / MFA** — email OTP or TOTP | Absent from the UI, the contract, and both auth research files. Only adjacency: Clerk's Pro tier includes MFA (`06`), and `06` states SMS product flows are out of scope | Low now — but **email OTP / TOTP only**; SMS is out of scope by product rule | `proposed` |
| BL-07 | **Account & session management** — active sessions list, revoke other devices, change password, account settings | No endpoint for any of it. Meaningful only once BL-05 exists | Medium. Also the honest prerequisite for any security claim in the portfolio narrative | `proposed` |
| BL-08 | **Invite → onboard a brand-new person** — invitee identity resolution + accept flow | B-03 persists invites (`workspace_invites`, gated by `INVITE_ROLES = {owner, admin}`), but `InviteMemberRequest.invitee` is an untyped `string` and `InviteResult` returns only `inviteId`. No accept link, no notification, and **no way for an invitee who is not already a user to become one** | High *if* invites are meant to grow a workspace. Depends on BL-01 + BL-02 | `proposed` |
| BL-09 | **Workspace member management UI** — member list, roles, invite affordance, remove | Design contracts exist (`docs/design/shell/app-shell-and-navigation.md` empty-solo invite affordance; `docs/design/foundations/content-and-voice.md` "invite affordance present but honest") and the API exists (B-03) — but **no `F-*` task builds it** | Medium. A design contract with no build task is a gap, not a plan | `proposed` |

---

## 2. Account lifecycle & onboarding

| ID | Item | Why it is unscheduled | Suggested necessity | State |
|---|---|---|---|---|
| BL-10 | **Account deletion** (self-serve, with corpus-aware confirmation) | No account-deletion path exists. Notes have soft-delete + purge; identity does not. `docs/design/states/sample-vs-mine.md` §2 already requires "Export / delete — UI states the corpus in the confirmation", and B-11 is the export port — the delete counterpart is unbuilt | **Legal / privacy gate → `@user`.** Cheap to record, expensive to retrofit | `proposed` |
| BL-11 | **Post-signup activation flow** — guided sign-up → first note → first successful retrieve or ask | `docs/research/ux/03-onboarding-mobile.md` §5 has an onboarding sequence (explicitly "design-facing, not wireframes") plus REC-07/REC-08, and **no build task**. F-09 covers only the labelled sample-workspace path | Medium. Research frames conversion as "signup completion → first-note activation", so the journey is named but unowned | `proposed` |
| BL-12 | **Export UI** — workspace / notes bundle download | B-11 (export port) is scheduled backend-side and "can trail the critical path", but **no `F-*` task consumes it**; `/api/v1/exports/workspace`, `/api/v1/exports/notes`, `/api/v1/exports/{exportId}` are in the contract with no UI | Medium. Data portability without a surface is a port nobody can use | `proposed` |

---

## 3. Unscheduled gaps (defects and enablers, not features)

These are not new capabilities. They are things already known to be wrong,
missing, or blocking, that no lane currently owns. They are recorded here
because the alternative is that they live only in an archived handoff.

| ID | Item | Why it is unscheduled | Suggested necessity | State |
|---|---|---|---|---|
| BL-13 | **Real-API sign-in smoke test** | `context.md` F-03 entry: "sign-in was never smoke-tested against the real Java API (B-03 needs the `local` profile + Postgres)". The identity port has never completed one end-to-end round trip against the live API | **Necessary and cheap.** It is the only proof the port works. Needs Compose + `local` profile + seed (`docs/running-locally.md` §5) | `proposed` |
| BL-14 | **`web → mocks` import exception** — `packages/mocks` tags + `eslint.config.mjs` | `context.md` blocker: the frontend needs a narrowly scoped dev/test import exception before in-app MSW wiring. `@user` chose Option A (soft-stop) on 2026-09-24 — no fixture authority was created on the FE. "F-04 will hit it too" | **Necessary before F-04 mock wiring.** Requires edits outside the frontend lane's write paths | `proposed` |
| BL-15 | **`Workspace` sample marker** | `context.md` F-03 gaps: "`Workspace` has no sample marker". `CorpusOwnership` (`sample` / `mine`) exists in the contract but is not carried on the workspace | **Necessary for F-09 / B-09**, which are built on sample-vs-mine being real data, not decoration | `proposed` |
| BL-16 | **Reachable trigger for the generic forbidden denial** | `context.md` F-03 gaps: "the generic forbidden denial has no reachable trigger yet". The 403 path is implemented and unreachable | Needed before F-10 / F-11 can exercise the denial path honestly. Security-relevant: an untested deny path is an unverified invariant | `proposed` |
| BL-17 | **CORS origins for browser-side fetches** | `OMNIDOC_CORS_ORIGINS` defaults to `http://localhost:3000`; web dev runs on **3311** (`apps/web/package.json`). Harmless today only because the identity port is server-side | **Necessary the moment any browser-side fetch appears.** One-line config, silent failure mode if missed | `proposed` |
| BL-18 | **`apps/api/load/README.md` seed order is wrong** | The README lists seeding as step 2, but Flyway runs only when the API boots — seeding first fails with `relation "tenants" does not exist`. `docs/running-locally.md` §5 documents the correct order ("Order matters") | **Necessary and trivial.** A wrong setup doc costs every new contributor an hour | `proposed` |

---

## Not in this file

Do not duplicate these here — they have canonical homes and duplicating them
creates a second source of truth:

| Thing | Canonical home |
|---|---|
| RTL locale support (**deferred, not closed**) | `context.md` §Open Gates; `.agent/CONVENTIONS.md` |
| Production AI / OpenRouter activation (**gated**) | `context.md`; ADR-0004 |
| DevOps `I-*` work and its unassigned human owner | `implementation-tracks.md` |
| Unrun usability hypotheses `UT-1…UT-22` | `docs/research/ux/05-friction-and-hypotheses.md` |
| Accepted stack decisions | `docs/adr/` (`accepted` only) |

---

## Decision log

Every triage decision is recorded here so the same item is not re-litigated
without new evidence. A `BL-*` row that changes state must gain a line here.

| Date | Item | Decision | By |
|---|---|---|---|
| 2026-09-24 | — | File created; BL-01…BL-18 recorded as `proposed`. No triage yet | `@user` (request) |

---

## How to promote an item

1. `@user` triages: `deferred`, `scheduled`, or `declined`.
2. If `scheduled`, Commander adds a real task code and a block to
   `implementation-tracks.md`, with dependencies and a lane owner.
3. This file keeps the row, flips its state to `scheduled`, and names the
   task code — so the trail from "noticed" to "built" stays intact.

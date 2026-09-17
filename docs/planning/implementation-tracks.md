# OmniDoc — Implementation Tracks (Program of Record)

**Authority:** Commander, 2026-09-15 (Backend Stack Close-out). This file is the durable backlog
for two human developers (frontend and backend), each running their own
agents. Live handoffs stay small; **this list must stay complete and
visible.** Do not hide remaining work as “downstream.”

**Do not reopen:** Phase 0 UX package, ADR-0001 §1–§5 and §7, ADR-0003,
ADR-0004, or architecture **ports** (§5 contracts). Providers and hosting
**class** stay accepted. Production AI activation and RTL locale remain
gated / deferred.

**Reopened 2026-09-15 (`@user`):** backend **application** stack — Node
`apps/api`, Better Auth (ADR-0001 §6), ADR-0002 API-as-Node /
`packages/domain` TypeScript SoT. Close-out: **R-BE → A-BE → U-BE**
before any API scaffold. Do **not** execute archived S-01.

Live status: root [`context.md`](../../context.md). Commander index:
[`docs/handoffs/current.md`](../handoffs/current.md). Live work:
[`docs/handoffs/active/lane-frontend.md`](../handoffs/active/lane-frontend.md)
and
[`docs/handoffs/active/lane-backend.md`](../handoffs/active/lane-backend.md).

---

## How to use this file

| Lane | Human | Typical agents | Write path (implementation) |
|------|-------|----------------|-----------------------------|
| `frontend` | Frontend developer | `/designer`, then `/implementer` | `docs/design/**` (D-01 only); then `apps/web`, `packages/ui` |
| `backend` | Backend developer | `/implementer` | Java API module (path per ADR-0005 after U-BE); `packages/mocks` (producer) + `packages/contracts` (with S-02). **Not** Node `apps/api` until/unless U-BE keeps Node |
| `shared` | Either; use only for true shared slices | `/implementer` | Paths listed on the handoff only |
| `devops` | Unassigned — split later | — | AWS / deploy / prod secrets. **Not** on the Phase 1 critical path |

**Live concurrency:** one live handoff **per lane** at stable paths
`lane-frontend.md` / `lane-backend.md` (optional `lane-shared.md` /
`lane-devops.md`). Two developers may each have one `/implementer`
session if `lane` and Allowed Write Paths differ. Same-lane iteration
continues until a soft-stop on a cross-lane or infra dependency.
`current.md` is the Commander integration index during dual-track build
— not an implementer work ticket. Parallel handoffs must not overlap
writes.

**API handshake:** Backend authors `docs/api/` + `packages/contracts`.
Frontend consumes via MSW / `packages/ui` / `apps/web` and must **not**
import Java domain packages, Spring AI, or provider SDKs.
`packages/domain` is **not** the backend SoT (ADR-0005). Contract changes
follow [`.cursor/skills/api-contract-change/SKILL.md`](../../.cursor/skills/api-contract-change/SKILL.md).

**Local Docker Postgres** is Backend-owned (developer machine). **AWS /
RDS / ECS / hosted deploy / prod secrets** stay in the DevOps list.

**Phase Check** runs at Phase 1 Build exit (and later CX / live gates),
not after every F/B ticket.

Commander opens the next live handoff from this list when a dependency
is satisfied. Tasks marked **listed** are owned here but have no live
handoff yet.

---

## Phase model (gates, not a single-agent queue)

| Phase | Status | Meaning |
|-------|--------|---------|
| 0 Discovery | **closed** | Research, UX, ADRs, architecture |
| Design close-out (D-01) | **closed** | Visual system + journey specs — Commander-accepted 2026-09-16 |
| Backend Stack Close-out | **closed** | R-BE → A-BE → U-BE → A-BE2; ADR-0005 `accepted` |
| 1 Build | **in progress** — F-01 + S-02 live dual-lane | Parallel FE / BE implementation + mocks |
| 2 CX gate | blocked | `/phase-check` + `@user` on four journeys with mocks |
| 3 Labelled live | gated | Operator OpenRouter free-tier after CX |
| 4 Hosted demo | devops unassigned | AWS Free-plan 6-month window |

Phase 1 **exit is mock journeys**, not AWS. Do not stall F-* or B-* on
I-*.

---

## Dependency graph

```text
Phase 0 (closed)
    → D-01 (frontend /designer)              // continues; no BE-stack dep
    → R-BE (/researcher)                     // Backend Stack Close-out
         → A-BE (/architect, ADR-0005 proposed)
              → U-BE (@user accept-with-amendments)  // completed
                   → A-BE2 (/architect, ADR-0005 accepted + pins)
                        → S-01a FE Nx scaffold
                        → S-01b Java API scaffold
                             → S-02 OpenAPI/SSE
                             → B-01 ports (in API language)
                             → B-02 local Compose Postgres
    D-01 + S-01a → F-01
    S-02 → F-02+, B-03+, B-04+
    S-02 + S-01a/S-01b → S-03
    B-01 does not wait on D-01
    Archived S-01 (Node apps/api) MUST NOT run
    I-* do not block Phase 1 mocks
```

---

## Design close-out — `frontend` / `/designer`

### D-01 — Visual system and journey UI specs

| | |
|--|--|
| **Status** | **completed** — archived `docs/handoffs/archive/H-2026-09-14-P1-D01-commander-designer.md` (Commander-accepted 2026-09-16) |
| **Lane / agent** | `frontend` / `/designer` |
| **Depends on** | Phase 0 (done) |
| **Blocks** | F-01+ journey UI (F-01 now unblocked). Did **not** block R-BE, S-01a, or B-01+ |
| **Write path** | `docs/design/**`; may extend `quality/ui-qa-checklist.md` without weakening it |

Create implementation-ready specs for capture, organize, retrieve, ask,
plus dual-mode Ask chrome, cookbook/wizard, usage strip, public sample
labelling, and honest workspace chrome — from **accepted** UX (REC-01…
REC-19) and **accepted** architecture. Stack: Next.js 16 + Tailwind 4 +
shadcn/ui (Base UI) in `packages/ui`.

Deliverables: tokens (incl. `next-themes` dark mode; Base UI `Direction`
as single direction source); app shell; desktop + mobile journey specs;
empty/loading/error/indexing/sample-vs-mine; a11y + RTL-readiness notes;
`packages/ui` component inventory (names + states only). **No** `apps/`
or `packages/` source.

---

## Backend Stack Close-out — **closed** 2026-09-15

Completed: R-BE → A-BE → U-BE (accept-with-amendments) → A-BE2
(ADR-0005 `accepted`). **D-01 continues in parallel.** Live scaffolds
are S-01a / S-01b below.

### R-BE — Backend language / Spring / auth / ops evidence

| | |
|--|--|
| **Status** | **completed** — `docs/handoffs/archive/H-2026-09-15-P0B-RBE-commander-researcher.md` |
| **Lane / agent** | `shared` / `/researcher` |
| **Depends on** | Phase 0 (done); `@user` reopen 2026-09-15 |
| **Blocks** | A-BE |
| **Write path** | `docs/research/technical/10–15-*`, ledger, matrix/shortlist supplements |

Classified evidence only. No vendor selection.

### A-BE — ADR-0005 backend application stack

| | |
|--|--|
| **Status** | **completed** — `docs/handoffs/archive/H-2026-09-15-P0B-ABE-commander-architect.md`; ADR-0005 `proposed` |
| **Lane / agent** | `shared` / `/architect` |
| **Depends on** | R-BE |
| **Blocks** | U-BE |
| **Write path** | `docs/adr/ADR-0005-*` (`proposed`); amend notes on ADR-0001 §6 / ADR-0002; `architecture.md` reopen banners |

### U-BE — `@user` accept / reject / change ADR-0005

| | |
|--|--|
| **Status** | **completed** — `docs/handoffs/archive/H-2026-09-15-P0B-UBE-commander-user.md` |
| **Lane** | `shared` (`to: user`) |
| **Depends on** | A-BE `proposed` |
| **Blocks** | A-BE2 |

`@user` **accepted with amendments:** Java 21 + Boot 4.1.x; monorepo
Option B (Gradle beside Nx); Spring Security sessions; Spring AI adapters
only; Python not Phase 1; Gradle; **Log4j2**; tests within Free Tier CI
minutes; **Architect** pins persistence/migrations. OTel optional;
log sink waits for I-*.

### A-BE2 — Finalize ADR-0005 (`accepted` + pins)

| | |
|--|--|
| **Status** | **completed** — `docs/handoffs/archive/H-2026-09-15-P0B-ABE2-commander-architect.md` |
| **Lane / agent** | `shared` / `/architect` |
| **Depends on** | U-BE completed |
| **Blocks** | (unblocked) S-01a, S-01b |

ADR-0005 `accepted`. Pins: Log4j2; Spring Data JDBC (CRUD);
JdbcTemplate + pgvector-java 0.1.6 (vector/RLS); Flyway; CI-minute
budget. ADR-0001 §6 / ADR-0002 amended.

---

## Shared foundation

### S-01 — Nx workspace + Node `apps/api` (superseded)

| | |
|--|--|
| **Status** | **blocked** — archived `docs/handoffs/archive/H-2026-09-15-P1-S01-commander-implementer.md` |
| **Lane / agent** | `shared` / `/implementer` — **do not execute** |
| **Depends on** | — |
| **Blocks** | nothing (replaced by S-01a + S-01b) |

Original S-01 assumed a Node `apps/api` health route and TypeScript
`packages/domain` stubs. **Superseded before execution.**

### S-01a — Frontend Nx workspace + boundary CI

| | |
|--|--|
| **Status** | **completed** — archived `docs/handoffs/archive/H-2026-09-15-P1-S01A-commander-implementer.md` |
| **Lane / agent** | `shared` / `/implementer` — Frontend reviews `apps/web` + TS tags |
| **Depends on** | A-BE2 (ADR-0005 `accepted`) |
| **Blocks** | F-01+ source work (now unblocked) |
| **Write path** | workspace config, `apps/web`, `packages/ui|contracts|mocks` stubs, TS typecheck/lint/test CI |

Nx 23.2.1, pnpm 12.4.1, Node 24 for the **JS graph only**.
`@nx/enforce-module-boundaries` must still **fail** on an illegal
`apps/web` → provider SDK import. **No** Node API app. Java module
boundaries are ArchUnit + CI (S-01b / ADR-0005), not Nx tags.

### S-01b — Java API module scaffold

| | |
|--|--|
| **Status** | **completed** — archived `docs/handoffs/archive/H-2026-09-15-P1-S01B-commander-implementer.md` |
| **Lane / agent** | `backend` / `/implementer` |
| **Depends on** | A-BE2 (ADR-0005 `accepted`) |
| **Blocks** | B-01, B-02 (Compose may start here or with B-02), S-02 authoring from a running health endpoint |
| **Write path** | `apps/api` JVM (Gradle); health endpoint |

Spring Boot health + module layout. **No** production OpenRouter
adapters. **No** Better Auth. Pins: Java 21, Boot 4.1.x, Gradle,
Log4j2, ArchUnit baseline.

### S-02 — Canonical HTTP / OpenAPI / SSE contracts

| | |
|--|--|
| **Status** | **live** — `docs/handoffs/active/lane-backend.md` (Commander-authorized 2026-09-17 after B-01 PASS) |
| **Lane** | `backend` (author) + Frontend review (no overlapping write: review via PR) |
| **Depends on** | S-01a, S-01b, and B-01 (vocabulary) |
| **Blocks** | F-03+ and B-03+ / B-04+ that speak HTTP |
| **Write path** | `docs/api/**`, `packages/contracts` |

Surfaces from `architecture.md` §5: identity/workspaces, notes+versions,
ingestion jobs, search, ask SSE (answer states in §4), vault
**metadata** (never plaintext), usage, mode, corpus label (sample vs
mine), export stub.

### S-03 — Deterministic mock corpus

| | |
|--|--|
| **Status** | listed |
| **Lane** | `backend` produces `packages/mocks`; Frontend consumes via MSW |
| **Depends on** | S-01a, S-02 (and S-01b if fixtures are served from the API) |
| **Blocks** | F-07 Ask UI; B-08 mock ask adapter |
| **Write path** | `packages/mocks` (producer). Frontend must not fork a second fixture authority |

Themes: `architecture.md` §9. Include `no_supported_answer` / `partial`
/ `conflict` as **success** shapes, distinct from transport errors.

---

## Frontend lane — `frontend` / `/implementer`

Write path: `apps/web`, `packages/ui`, Playwright / Storybook / axe,
`docs/frontend/README.md`. **Must not** touch `apps/api`,
`packages/domain`, `docs/adr/**`, or AWS.

May start **F-01** as soon as D-01 + **S-01a** land. Do not wait for
Postgres, AWS, or S-01b.

### F-01 — Design tokens + shadcn primitives

| | |
|--|--|
| **Status** | **live** — `docs/handoffs/active/lane-frontend.md` |
| **Lane / agent** | `frontend` / `/implementer` (human: front-end programmer) |
| **Depends on** | D-01, S-01a |
| **Blocks** | F-02+ (also need S-02) |
| **Write path** | `packages/ui/**`; needed `apps/web` token wiring; `docs/frontend/README.md` |

Depends: D-01, S-01a. Map D-01 tokens into `packages/ui` (Tailwind 4 +
shadcn/Base UI). Refresh stale ADR status in `docs/frontend/README.md`
(§6 auth implementation is ADR-0005 Spring sessions).

### F-02 — App shell, nav, locale, honest workspace switcher

Depends: F-01, S-02. Single `lang`/`dir` source; REC-18 honest
org/workspace chrome at n≈1–few; no fake enterprise teams.

### F-03 — Auth / session UI against mock identity

Depends: F-02, and B-03 **or** S-03 identity fixtures. Sign-in;
workspace selector is a **selector** only (server authority).

### F-04 — Capture (TipTap)

Depends: F-02, S-02 notes. TipTap 3.31.3; ProseMirror JSON SoT; autosave;
paste/import CTAs (REC-01, REC-02).

### F-05 — Organize

Depends: F-04. Inbox + light optional folders/tags (REC-03).

### F-06 — Retrieve

Depends: F-02, S-02 search, and B-07 **or** search fixtures. Snippets;
indexing progress (REC-02).

### F-07 — Ask UI

Depends: S-03, and B-08 **or** ask fixtures. Streaming chrome;
passage-level citations; refusal / partial / conflict as **success**
(REC-04, REC-05, REC-10).

### F-08 — Dual-mode chrome

Depends: F-07, S-02 vault/usage/mode (**metadata only**). Mode×corpus
labels, cookbook/wizard, usage strip, failure copy that names the mode
(REC-13–17). Cookbook is not a trust-boundary bypass. No provider SDK
in the client.

### F-09 — Public labelled sample workspace UI

Depends: F-07, S-03 sample fixtures, B-09. REC-08.

### F-10 — Empty / loading / error / indexing + a11y / RTL-readiness

Incremental on touched surfaces; full pass before Phase 2. Checklist:
[`quality/ui-qa-checklist.md`](../../quality/ui-qa-checklist.md). Do not
claim RTL locale support.

### F-11 — Playwright + axe journeys on mocks

Depends: F-04–F-09. Feeds Phase 2 CX gate.

---

## Backend lane — `backend` / `/implementer`

Write path: Java API module (path per ADR-0005 after U-BE),
`packages/mocks` (producer), `packages/contracts` (with S-02),
migrations. **Must not** implement production OpenRouter adapters until
Phase 3. **Must not** own visual tokens. **Must not** start on TypeScript
`packages/domain` ports or Better Auth while ADR-0005 is not `accepted`.

May start **B-01** as soon as **S-01b** lands — **no design dependency**.

### B-01 — Domain port interfaces

| | |
|--|--|
| **Status** | **completed** — archived `docs/handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md` (Commander-validated PASS 2026-09-17) |
| **Lane / agent** | `backend` / `/implementer` (human: back-end programmer) |
| **Depends on** | S-01b |
| **Blocks** | Clarifies S-02; B-03+ need S-02 |
| **Write path** | `apps/api/**` port packages |

Depends: S-01b. Language-native port interfaces for `architecture.md`
§5.1–§5.11 **inside the API module** (Java), aligned with S-02 OpenAPI.
No production adapters. **Not** TypeScript interfaces in
`packages/domain` as the backend SoT. Next same-lane handoff after B-01:
**S-02**, then **B-02**.

### B-02 — Postgres schema + RLS + local Compose

Depends: S-01b. PostgreSQL 18; tenants/workspaces/membership;
notes/versions; RLS on a non-owner, non-`BYPASSRLS` role (ADR-0001 §3).
**Local Docker Compose Postgres+pgvector is this lane**, not DevOps.
Migrations: **Flyway** (ADR-0005). CRUD: Spring Data JDBC; vector/RLS:
JdbcTemplate + pgvector-java.

### B-03 — Identity adapter (Java auth class per ADR-0005)

Depends: B-02, S-02 identity, U-BE. Server-authoritative membership;
client workspace id is a selector (`architecture.md` §2). Year-1 SSO
not required. **Replaces** “Better Auth + organization plugin” —
Better Auth is TypeScript-native and is not the Java implementation.
First-party org/membership tables remain required.

### B-04 — Notes CRUD + version concurrency

Depends: B-02, S-02.

### B-05 — Ingestion / chunking jobs + progress port

Depends: B-04. Indexing lag is a first-class state (REC-02).

### B-06 — pgvector + mock embed adapter

Depends: B-02, B-05. Hash/pseudo-vectors; `embedding_model_id` + dims
recorded; **tenant filter mandatory** on similarity. Zero cross-tenant
hits tolerated.

### B-07 — Lexical / hybrid search

Depends: B-04. Same tenant/ACL rules as vector path.

### B-08 — Ask port mock adapter + citation assembler

Depends: S-02, S-03, and B-06 **or** fixture ranking. All §4 states
including `no_supported_answer` as success. Passage-level citations.
No auto-persist of answers into the corpus (REC-06).

### B-09 — Sample vs mine labelling

Depends: B-04, B-08. First-class API field on list, ask scope, and
citations (REC-08, REC-17).

### B-10 — Vault + usage + mode ports (mocks)

Depends: B-03, S-02. Mock adapters; production adapters **dark**
(ADR-0004). Never return full keys to UI after save; never silently mix
operator vs customer credentials.

### B-11 — Export port

Depends: B-04. Can trail the critical path. Secrets excluded;
tenant-scoped bundle.

### B-12 — Isolation tests

Depends: B-03–B-08. Zero cross-tenant retrieval; IDOR negatives.
**Required before Phase 2.**

### Gated (Phase 3, still Backend-owned application code)

Live OpenRouter adapters, real embeddings, production vault encryption
as go-live. **Not** authorized until CX-first + `@user`. Do not schedule
as a Phase 1 live handoff.

---

## DevOps / infra — `devops` (unassigned)

Split between the two developers later. **Do not** put these on the FE
or BE critical path except as noted. Hosted demo needs S-01a + S-01b images and enough of B-02/B-03 to boot,
but that does not block mock journeys.

### I-01 — GitHub Actions beyond S-01a/S-01b

Depends: S-01a (and S-01b when Java CI exists). Dual CI: pnpm/Nx for FE
+ Maven/Gradle for BE. Caching policy, required checks. Optional early.
Nx Cloud remains **off** (see I-09).

### I-02 — AWS account + Free-plan eligibility / credit clock

Depends: none. Blocks I-03+. 6-month Free-plan window is an accepted
fit (do not prefer VPS because duration is 6 months).

### I-03 — SKU PoC (EC2 and/or ECS + RDS Postgres + pgvector)

Depends: I-02, S-01a/S-01b images. Topology class already accepted (ADR-0001
§7). Exact SKUs remain PoC. JVM RAM on Free Tier (`t3.micro` = 1 GiB)
is a PoC risk. **Does not block Phase 1 mocks.**

### I-04 — Container images + deploy path

Depends: S-01a, S-01b, I-03, enough of B-02/B-03 to boot. Next.js web +
JVM API (+ optional worker).

### I-05 — Secrets / env in deploy

Depends: I-04. Operator key in deploy secrets only; no keys in repo.
`.env.example` placeholders belong in S-01a/S-01b. **Production OpenRouter key
still gated by CX.**

### I-06 — Credit-burn / always-on monitoring

Depends: I-03. 6-month hosted-demo window.

### I-07 — DNS / TLS for hosted demo

Depends: I-04.

### I-08 — VPS + Docker Compose fallback runbook

Depends: **I-03 fail** only — if AWS cannot host web + worker +
Postgres(+pgvector) for those 6 months. Not the default.

### I-09 — Nx Cloud / remote cache

**Not scheduled.** Remains local-cache-only until `@user` (ADR-0002).

---

## Phase 1 Build exit (both lanes, still no live AI)

- D-01 specs exist and F-01 tokens match them
- Four journeys usable on deterministic mocks; refusal / partial /
  conflict are success states
- Zero cross-tenant failures in B-12
- A11y + LTR-now / RTL-readiness discipline on touched UI (F-10 / F-11)
- Dual-mode / cookbook / usage **chrome + mock ports** exist; production
  adapters dark
- Public labelled sample path exists (F-09 + B-09)
- Production AI and RTL locale remain open / deferred

Then **Phase 2** `/phase-check` + `@user`. Then labelled live OpenRouter
only with `@user`. Then Phase 4 hosted demo from the I-* list.

---

## Live handoffs (this cycle only)

D-01, S-01a, and S-01b are **completed**. Dual-lane heads are live.
`current.md` is the Commander integration index only.

| ID | Handoff |
|----|---------|
| Commander index | [`docs/handoffs/current.md`](../handoffs/current.md) |
| F-01 | [`docs/handoffs/active/lane-frontend.md`](../handoffs/active/lane-frontend.md) |
| S-02 | [`docs/handoffs/active/lane-backend.md`](../handoffs/active/lane-backend.md) |
| B-01 | archived completed — [`../handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md`](../handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md) |
| D-01 | archived accepted — [`../handoffs/archive/H-2026-09-14-P1-D01-commander-designer.md`](../handoffs/archive/H-2026-09-14-P1-D01-commander-designer.md) |
| S-01a | archived completed — [`../handoffs/archive/H-2026-09-15-P1-S01A-commander-implementer.md`](../handoffs/archive/H-2026-09-15-P1-S01A-commander-implementer.md) |
| S-01b | archived completed — [`../handoffs/archive/H-2026-09-15-P1-S01B-commander-implementer.md`](../handoffs/archive/H-2026-09-15-P1-S01B-commander-implementer.md) |
| A-BE2 | archived completed — [`../handoffs/archive/H-2026-09-15-P0B-ABE2-commander-architect.md`](../handoffs/archive/H-2026-09-15-P0B-ABE2-commander-architect.md) |
| U-BE | archived completed — [`../handoffs/archive/H-2026-09-15-P0B-UBE-commander-user.md`](../handoffs/archive/H-2026-09-15-P0B-UBE-commander-user.md) |
| R-BE | archived completed — [`../handoffs/archive/H-2026-09-15-P0B-RBE-commander-researcher.md`](../handoffs/archive/H-2026-09-15-P0B-RBE-commander-researcher.md) |
| A-BE | archived completed — [`../handoffs/archive/H-2026-09-15-P0B-ABE-commander-architect.md`](../handoffs/archive/H-2026-09-15-P0B-ABE-commander-architect.md) |
| S-01 (Node API) | archived blocked — [`../handoffs/archive/H-2026-09-15-P1-S01-commander-implementer.md`](../handoffs/archive/H-2026-09-15-P1-S01-commander-implementer.md) |

---

## Related

- [`architecture.md`](../../architecture.md) — ports, tenancy, fixtures
- [`docs/adr/README.md`](../adr/README.md) — accepted and proposed decisions
- [`docs/adr/ADR-0005-backend-application-stack.md`](../adr/ADR-0005-backend-application-stack.md) — backend stack (`accepted`)
- [`docs/handoffs/README.md`](../handoffs/README.md) — `lane:` protocol
- [`quality/ui-qa-checklist.md`](../../quality/ui-qa-checklist.md)

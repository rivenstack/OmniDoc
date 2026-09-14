# OmniDoc — Implementation Tracks (Program of Record)

**Authority:** Commander, 2026-09-14. This file is the durable backlog
for two human developers (frontend and backend), each running their own
agents. Live handoffs stay small; **this list must stay complete and
visible.** Do not hide remaining work as “downstream.”

**Do not reopen:** Phase 0 research, UX package, ADR-0001 §1–§7,
ADR-0002/0003/0004, or architecture ports. Stack, providers, and hosting
**class** are accepted. Production AI activation and RTL locale remain
gated / deferred.

Live status: root [`context.md`](../../context.md). Active assignments:
[`docs/handoffs/current.md`](../handoffs/current.md) and
[`docs/handoffs/active/`](../handoffs/active/).

---

## How to use this file

| Lane | Human | Typical agents | Write path (implementation) |
|------|-------|----------------|-----------------------------|
| `frontend` | Frontend developer | `/designer`, then `/implementer` | `docs/design/**` (D-01 only); then `apps/web`, `packages/ui` |
| `backend` | Backend developer | `/implementer` | `apps/api`, `packages/domain`, `packages/mocks` (producer), `packages/contracts` (with S-02) |
| `shared` | Either; **S-01 recommended Backend** | `/implementer` | Nx workspace + CI skeleton; Frontend reviews `apps/web` + boundary tags |
| `devops` | Unassigned — split later | — | AWS / deploy / prod secrets. **Not** on the Phase 1 critical path |

**Live concurrency:** one live handoff **per lane**. Two developers may
each have one `/implementer` session if `lane` and Allowed Write Paths
differ. Parallel handoffs must not overlap writes.

**API handshake:** Backend authors `docs/api/` + `packages/contracts`.
Frontend consumes via MSW / `packages/ui` / `apps/web` and must **not**
import `packages/domain` or provider SDKs (ADR-0002). Contract changes
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
| Design close-out (D-01) | **in progress** | Last planning artifact — visual system + journey specs |
| 1 Build | **ready** after D-01 + S-01 for journey UI; Backend after S-01 | Parallel FE / BE on mocks |
| 2 CX gate | blocked | `/phase-check` + `@user` on four journeys with mocks |
| 3 Labelled live | gated | Operator OpenRouter free-tier after CX |
| 4 Hosted demo | devops unassigned | AWS Free-plan 6-month window |

Phase 1 **exit is mock journeys**, not AWS. Do not stall F-* or B-* on
I-*.

---

## Dependency graph

```text
Phase 0 (closed)
    → D-01 (frontend /designer)     // parallel with S-01
    → S-01 (shared /implementer)    // recommended Backend owner
         → S-02 (backend authors; frontend reviews)
         → B-01
         → B-02 (local Compose Postgres — backend, not DevOps)
    D-01 + S-01 → F-01
    S-02 → F-02+, B-03+, B-04+
    S-02 + S-01 → S-03
    B-01 does not wait on D-01
    I-* do not block Phase 1 mocks
```

---

## Design close-out — `frontend` / `/designer`

### D-01 — Visual system and journey UI specs

| | |
|--|--|
| **Status** | **live** — `docs/handoffs/current.md` |
| **Lane / agent** | `frontend` / `/designer` |
| **Depends on** | Phase 0 (done) |
| **Blocks** | F-01+ journey UI. Does **not** block S-01 or B-01+ |
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

## Shared foundation

### S-01 — Nx workspace + boundary CI

| | |
|--|--|
| **Status** | **live** — `docs/handoffs/active/phase-1-task-s-01-implementer.md` |
| **Lane / agent** | `shared` / `/implementer` — **recommended human: Backend**; Frontend reviews `apps/web` + boundary tags |
| **Depends on** | Phase 0 (done). **Parallel with D-01** |
| **Blocks** | All F-* and B-* source work |
| **Write path** | workspace config, `apps/**`, `packages/**` placeholders, typecheck/lint/test CI only |

Nx 23.2.1, pnpm 12.4.1, Node 24; `apps/web`, `apps/api`,
`packages/ui|contracts|domain|mocks`. `@nx/enforce-module-boundaries`
must **fail** on an illegal `apps/web` → provider SDK import (then
revert). CI: typecheck/lint/test — **no AWS, no secrets**. Placeholder
packages only: health route on `apps/api`; shadcn primitives in
`packages/ui`; empty/stub `contracts`, `domain`, `mocks` so the graph
exists.

**Defer to later tasks:** full §5 port interfaces (B-01), canonical
OpenAPI/SSE (S-02), architecture §9 fixture corpus (S-03), TipTap,
Better Auth, Postgres migrations, AWS.

This is **workspace bootstrap**, not AWS DevOps. It must not wait for
the I-* split.

### S-02 — Canonical HTTP / OpenAPI / SSE contracts

| | |
|--|--|
| **Status** | listed — Backend authors; Frontend reviews |
| **Lane** | `backend` (author) + Frontend review (no overlapping write: review via PR) |
| **Depends on** | S-01 |
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
| **Depends on** | S-01, S-02 |
| **Blocks** | F-07 Ask UI; B-08 mock ask adapter |
| **Write path** | `packages/mocks` (producer). Frontend must not fork a second fixture authority |

Themes: `architecture.md` §9. Include `no_supported_answer` / `partial`
/ `conflict` as **success** shapes, distinct from transport errors.

---

## Frontend lane — `frontend` / `/implementer`

Write path: `apps/web`, `packages/ui`, Playwright / Storybook / axe,
`docs/frontend/README.md`. **Must not** touch `apps/api`,
`packages/domain`, `docs/adr/**`, or AWS.

May start **F-01** as soon as D-01 + S-01 land. Do not wait for Postgres
or AWS.

### F-01 — Design tokens + shadcn primitives

Depends: D-01, S-01. Map D-01 tokens into `packages/ui` (Tailwind 4 +
shadcn/Base UI). Refresh stale ADR status in `docs/frontend/README.md`
(categories 3–7 are `accepted`, not `proposed`).

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

Write path: `apps/api`, `packages/domain`, `packages/mocks` (producer),
`packages/contracts` (with S-02), migrations. **Must not** implement
production OpenRouter adapters until Phase 3. **Must not** own visual
tokens.

May start **B-01** as soon as S-01 lands — **no design dependency**.

### B-01 — Domain port interfaces

Depends: S-01. TypeScript interfaces for `architecture.md` §5.1–§5.11 in
`packages/domain`. No production adapters.

### B-02 — Postgres schema + RLS + local Compose

Depends: S-01. PostgreSQL 18; tenants/workspaces/membership;
notes/versions; RLS on a non-owner, non-`BYPASSRLS` role (ADR-0001 §3).
**Local Docker Compose Postgres+pgvector is this lane**, not DevOps.

### B-03 — Better Auth + organization plugin

Depends: B-02, S-02 identity. Server-authoritative membership; client
workspace id is a selector (`architecture.md` §2). Year-1 SSO not
required.

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
or BE critical path except as noted. Hosted demo needs S-01 images and
enough of B-02/B-03 to boot, but that does not block mock journeys.

### I-01 — GitHub Actions beyond S-01

Depends: S-01. Caching policy, required checks. Optional early. Nx
Cloud remains **off** (see I-09).

### I-02 — AWS account + Free-plan eligibility / credit clock

Depends: none. Blocks I-03+. 6-month Free-plan window is an accepted
fit (do not prefer VPS because duration is 6 months).

### I-03 — SKU PoC (EC2 and/or ECS + RDS Postgres + pgvector)

Depends: I-02, S-01 images. Topology class already accepted (ADR-0001
§7). Exact SKUs remain PoC. **Does not block Phase 1 mocks.**

### I-04 — Container images + deploy path

Depends: S-01, I-03, enough of B-02/B-03 to boot. `apps/web` +
`apps/api` + worker.

### I-05 — Secrets / env in deploy

Depends: I-04. Operator key in deploy secrets only; no keys in repo.
`.env.example` placeholders belong in S-01. **Production OpenRouter key
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

Commander opened **only** D-01 and S-01 so both developers can start.
F-02+ and B-02+ stay **listed** here until dependencies land and
Commander issues a handoff.

| ID | Handoff |
|----|---------|
| D-01 | [`docs/handoffs/current.md`](../handoffs/current.md) |
| S-01 | [`docs/handoffs/active/phase-1-task-s-01-implementer.md`](../handoffs/active/phase-1-task-s-01-implementer.md) |

---

## Related

- [`architecture.md`](../../architecture.md) — ports, tenancy, fixtures
- [`docs/adr/README.md`](../adr/README.md) — accepted decisions
- [`docs/handoffs/README.md`](../handoffs/README.md) — `lane:` protocol
- [`quality/ui-qa-checklist.md`](../../quality/ui-qa-checklist.md)

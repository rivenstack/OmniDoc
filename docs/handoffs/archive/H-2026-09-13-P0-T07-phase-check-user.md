---
handoff_id: H-2026-09-13-P0-T07
affinity: decision-gate
track: main
status: completed
phase: "0"
task: "0.7"
from: phase-check
to: user
created: 2026-09-13
answered: 2026-09-14
completed: 2026-09-14
---

# Phase 0 — Task 0.7 `@user` ADR-0001 Decision Gate (ARCHIVED)

## Outcome Summary

Completed 2026-09-14 by `@user` (answers) + `/commander` (persist +
re-plan). All Task 0.7 questions are answered or Commander-interpreted
as recorded in `context.md`. ADR-0001 categories **3, 4, 6** are
`@user`-accepted pending Architect status flip. Categories **5** and
**7** are **rejected/amended** and require Wave C evidence before
Architect rewrite. Scaffolding remains unauthorized.

### ADR-0001 per category

| # | Category | Decision |
|---|---------|----------|
| 1 | Frontend | **Accepted** (reconfirmed): Next.js 16.3.5 |
| 2 | Editor | **Accepted** (reconfirmed): TipTap 3.31.3; ProseMirror JSON SoT |
| 3 | Relational DB | **Accepted**: PostgreSQL, shared schema + app scoping + RLS DiD |
| 4 | Vector | **Accepted**: pgvector in Postgres |
| 5 | Embedding/LLM | **Rejected / amend**: customer BYOK is a v1 feature, not later |
| 6 | Auth | **Accepted**: Better Auth + organization plugin; year-1 SSO not required |
| 7 | Hosting | **Rejected / amend**: reject Railway/Render default; prefer AWS Free Tier; VPS worst case |

### Product / budget / legal gates

- Portfolio / freelance credibility product; 6-month horizon
- Infra budget: prefer $0; ceiling ~$20/month
- AI budget: OpenRouter free-tier now; ~$10 credit after operational
- Self-host preferred because free; managed OK if no extra cost
- Accept standard ~30-day abuse-log retention; no ZDR sales motion
- Customer BYOK **yes in v1**; dual-mode operator free-tier + customer key
- Usage/charges visible if provider APIs allow
- Cookbook/wizard for API-key creation; grows as tools are added
- Data region: none
- Enterprise SSO: not required year-1
- Year-1 tenants: minimal; teams/workspaces UI must be real
- Collab editing: much later
- Hosted demo: AWS Free Tier for the **6-month** window is accepted; VPS only if AWS cannot host web + worker + Postgres(+pgvector) for those 6 months

### Commander interpretations (explicit)

- Mock-first Ask until Customer Experience First is validated; live
  OpenRouter is the hosted path **after** that gate
- Public labelled sample workspace (REC-08) plus clone-and-run fixtures
- RTL stays deferred, not closed
- Production AI activation remains gated

### Next

Wave C evidence: Task 0.8 `/researcher` (main) + Task 0.8b
`/ux_researcher` (parallel). Architect Task 0.9 is blocked until both
land. Scaffolding still unauthorized.

---

# Original handoff body (immutable historical record)

The original Task 0.7 body follows. Live status is in `context.md`.

---

handoff_id: H-2026-09-13-P0-T07 (original)

# Phase 0 — Task 0.7 `@user` ADR-0001 Decision Gate

> **Status 2026-09-14: PARTIALLY ANSWERED** at the time this handoff
> was live. `@user` later completed the remaining categories and gates
> (see Outcome Summary above). The body below is the decision request
> as it stood, preserved for ledger integrity.

## Start Command

```text
@user Read docs/handoffs/current.md. Decide ADR-0001 (accept / reject / amend, per category) and answer the listed open gates. The frontend contributor track in docs/frontend/README.md is already unblocked and does not require this decision to begin.
```

## Objective

Owner: **`@user`**

Phase 0 passed independent verification
(`docs/reviews/phase-0-verification.md`, Phase Decision: **PASS**).
`ADR-0001` (`status: accepted (partial)` since 2026-09-14) is ready for
your decision on the remaining categories.

## Decisions you are asked to make

### 1. ADR-0001 — accept / reject / amend, per category

Categories 1–2 were already accepted (Next.js 16.3.5; TipTap 3.31.3 +
ProseMirror JSON SoT). Categories 3–7 were proposed: PostgreSQL;
pgvector; ports + mocks first with operator keys and BYOK later;
Better Auth; Railway/Render.

### 2–5. Open gates

Researcher-surfaced budget/self-host/ZDR/BYOK/region/SSO; UX-surfaced
mock vs live demos, public sample vs local fixtures, UT-1…UT-14;
ADR-added tenant count, collab, SoT, always-on hosting, React-only,
package manager; standing RTL and production-AI gates.

## Acceptance Criteria (resolved 2026-09-14)

- [x] Accept / reject / amend stated for each of the 7 ADR-0001 categories
- [x] Gates in sections 2–5 answered or Commander-interpreted
- [x] `/commander` received answers and opened Task 0.8 / 0.8b

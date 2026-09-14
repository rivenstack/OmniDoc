---
handoff_id: H-2026-09-14-P0-T08
affinity: research
track: main
status: completed
phase: "0"
task: "0.8"
from: commander
to: researcher
created: 2026-09-14
completed: 2026-09-14
---

# Phase 0 — Task 0.8 Wave C Technical Evidence (AWS Free Tier + OpenRouter + BYOK/usage)

## Start Command

```text
/researcher Read docs/handoffs/current.md and execute Task 0.8 exactly. Produce AWS Free Tier + OpenRouter + BYOK/usage evidence only under the allowed technical write paths. Do not edit ADRs or architecture.md.
```

## Objective

Owner: `/researcher`

Close the evidence gaps that block Architect rewrite of ADR-0001
categories **5** (embedding/LLM posture) and **7** (hosting). Wave B
never evaluated AWS or OpenRouter. `@user` has now rejected those ADR
sections as written. Produce classified, dated evidence only — **do not
select** a host SKU or mark OpenRouter accepted.

A parallel UX package (Task 0.8b) runs at the same time. Do not wait
for it. Do not write UX files.

## Required Reading

1. `context.md` (read-only except you must not write it)
2. `architecture.md` (read-only) — especially §5.3, §5.6, §6
3. `AGENTS.md` Extension-First criteria
4. `MEMORY.md` and `docs/memory/researcher.md`
5. `docs/handoffs/README.md` and this file
6. `docs/adr/ADR-0001-frontend-and-platform-stack.md` §5–§7 (read-only amendment targets)
7. Existing Wave B: `docs/research/technical/05-embedding-llm-providers.md`, `07-hosting-deployment.md`, `00-evidence-matrix.md`, `08-candidate-shortlist.md`
8. `docs/research/version-ledger.md`
9. `.cursor/skills/threat-model/SKILL.md` (awareness — do not author a threat model)

## Inputs / Evidence

`@user` answers recorded 2026-09-14 (Task 0.7 archived):

- Customer BYOK is a **v1** feature (not later). Dual mode: (a) operator
  free-tier for hosted demo/test, (b) customer-entered key for paid scale.
  Show usage/charges if provider APIs allow. Cookbook/wizard is a UX
  surface (owned by 0.8b); Researcher covers secret-storage and usage-API
  feasibility only.
- AI path: OpenRouter free-tier first; ~$10 credit after the product is
  operational. Do not spend $10 in this task.
- Accept standard ~30-day abuse-log retention; no ZDR sales motion.
- Hosting: reject Railway/Render as default. Prefer AWS Free Tier.
  **6-month Free Tier window is an accepted fit** — project plans are for
  6 months. Do **not** penalize AWS for lacking a 12-month always-on
  offer. VPS is worst-case fallback only if AWS cannot actually host
  Next.js web + worker + Postgres(+pgvector) for those 6 months
  (coverage, always-on, credit burn) — not because 6 months is too short.
- Infra prefer $0; ceiling ~$20/month. Self-host preferred because free;
  managed OK if it costs nothing extra. Data region: none.
- Distinguish **OmniDoc customer-BYOK** (customer key in project vault)
  from **OpenRouter-upstream-BYOK** (OpenRouter calling a provider with
  the customer's upstream key). They are not the same.

Chat notes about OpenRouter limits or AWS Free Tier 2025-07-15 are
**not evidence**. Re-fetch primary docs with access dates.

## Allowed Write Paths

- `docs/research/technical/05-embedding-llm-providers.md`
- `docs/research/technical/07-hosting-deployment.md`
- `docs/research/technical/00-evidence-matrix.md`
- `docs/research/technical/08-candidate-shortlist.md`
- `docs/research/technical/README.md` (index row only, if a new file is added)
- `docs/research/technical/09-byok-and-usage-metering.md` (optional; create only if vault/usage APIs need a dedicated note)
- `docs/research/version-ledger.md` (AWS Free Tier + OpenRouter rows)
- `docs/memory/researcher.md` (durable lessons only)

**Must not touch:** `context.md`, `architecture.md`, `docs/adr/**`,
`docs/handoffs/current.md` (except you do not overwrite this file's
assignment — Commander owns replacement), `docs/research/ux/**`,
application source, or Task 0.8b write paths.

Status/outcome for this main-track task: Commander will archive after
integration. You may append an **Outcome** section at the bottom of this
file if you are still the active `to:` when you finish; do not change
`to:` or replace the next main-track handoff.

## Deliverables

1. Updated `07-hosting-deployment.md`: AWS Free Tier after 2025-07-15
   (credits vs always-free, duration, EC2/RDS/Lightsail/App Runner as
   applicable), whether web + worker + Postgres(+pgvector) can run for
   **6 months** at $0, sleep/cold-start, credit-burn risks. Keep
   Railway/Render as compared non-defaults. VPS as fallback only if AWS
   cannot cover the 6-month workload.
2. Updated `05-embedding-llm-providers.md`: OpenRouter (`:free` models,
   rate limits, metadata vs prompt/completion logging, upstream provider
   retention still applies, usage/limits API). Dual-mode operator
   free-tier vs customer-key billing. What can be shown as usage/charges
   without inventing a billing product.
3. Optional `09-byok-and-usage-metering.md` if secret-vault patterns and
   usage APIs would overfill `05`.
4. Matrix + shortlist deltas; version-ledger pins/access dates.
5. Short **Architect inputs** summary at the end of `05` and `07` (or in
   `09`): classified findings, no selection.

## Constraints / Prohibited Decisions

- Do **not** select an AWS product graph as “the” host
- Do **not** mark OpenRouter `accepted`
- Do **not** write or amend ADR-0001 / `architecture.md`
- Do **not** invent UX journeys (Task 0.8b)
- Do **not** treat this chat's AWS/OpenRouter bullets as verified
- Popularity is not fitness; include adverse evidence
- Do not claim RTL locale support

## Acceptance Criteria

- Every AWS/OpenRouter claim cites primary docs with access date
- OmniDoc-BYOK vs OpenRouter-upstream-BYOK is explicitly distinguished
- 6-month hosted-demo window is treated as in-scope and sufficient;
  AWS is scored on whether the topology fits that window, not on lacking
  12-month always-on
- Free-tier credit expiry and sleep/cold-start called out for honesty
  without treating 6-month expiry as a current blocker
- No vendor “chosen”; no ADR/architecture edits
- Budget frame ($0 prefer / ~$20 ceiling / OpenRouter free then later
  $10) used as evaluation lens only

## Directionality / accessibility checks

N/A for infra docs. If any UI-adjacent threat notes appear, remind RTL
deferred + a11y as release gates — do not claim RTL support.

## Dependencies / Risks

- Parallel with Task 0.8b (non-overlapping writes).
- Risk: treating chat AWS/OpenRouter bullets as verified — **forbidden**.
- Risk: recommending paid PaaS that breaks the budget — flag explicitly.
- Task 0.9 `/architect` is **blocked** until 0.8 and 0.8b both land.

## Gates

- Production AI activation remains gated (do not close).
- RTL remains deferred (do not close).
- Do not close ADR-0001; this task only supplies evidence.

## Completion Instructions

1. Write the evidence files under Allowed Write Paths.
2. Append an Outcome summary to this file (status may become
   `completed` in the body; Commander archives and opens 0.9).
3. Add only durable lessons to `docs/memory/researcher.md`.
4. Do not replace `docs/handoffs/current.md` with the Architect handoff —
   Commander does that after integrating 0.8 + 0.8b.

---

## Outcome (Researcher — 2026-09-14)

**Status:** `completed` (frontmatter). Evidence only — **no host SKU
selected**; OpenRouter **not** marked accepted. ADRs / `architecture.md`
untouched.

### Wrote / updated

| Path | Change |
|------|--------|
| `docs/research/technical/07-hosting-deployment.md` | AWS Free Tier post–2025-07-15; 6-mo Free plan; EC2/RDS/pgvector; Lightsail/App Runner adverse; Railway/Render non-defaults; VPS fallback rule |
| `docs/research/technical/05-embedding-llm-providers.md` | OpenRouter `:free`, limits, privacy, usage APIs; OmniDoc vs OR-upstream BYOK; dual-mode lens |
| `docs/research/technical/09-byok-and-usage-metering.md` | **New** — vault patterns + usage metering |
| `docs/research/technical/00-evidence-matrix.md` | OpenRouter + AWS Free Tier rows |
| `docs/research/technical/08-candidate-shortlist.md` | Hosting/LLM shortlist deltas; gate status |
| `docs/research/technical/README.md` | Index + `09` |
| `docs/research/version-ledger.md` | Wave C policy pins |
| `docs/memory/researcher.md` | Durable lessons only |
| `docs/handoffs/current.md` | This Outcome; status `completed` |

### Architect inputs (10 lines)

1. AWS Free plan = credits + **6 months** (or credit exhaustion); fits demo horizon — do not reject for lacking 12-mo Free always-on.  
2. Topology **feasible** at $0 cash: Free-plan **EC2 and/or ECS + RDS Postgres + pgvector**; confirm live account eligibility.  
3. **Credit burn** can end Free plan early; expiry **closes** account (90d Paid reopen) — ops/export risk, not current blocker.  
4. Lightsail = Paid **90-day** trial; App Runner = **Paid-plan** list — not Free-plan primaries.  
5. Railway/Render remain compared **non-defaults** only.  
6. VPS only if AWS cannot host web+worker+Postgres(+pgvector) for 6 months within credits/eligibility.  
7. OpenRouter is a **shortlist gateway** for operator free-tier; **not accepted**.  
8. Distinguish **OmniDoc customer-BYOK** (v1 vault) from **OpenRouter-upstream-BYOK**.  
9. Usage UI can wrap `GET /api/v1/key` (+ management `/credits`, `/activity`) — no billing product.  
10. Keep Assistants/`vector_stores` forbidden as corpus SoT; privacy honesty = OR metadata + upstream ~30d abuse when used.

### Next

Commander integrates with Task **0.8b**, then opens Task **0.9** `/architect`.

```text
/architect Read docs/handoffs/current.md after Commander opens Task 0.9; amend ADR-0001 §5 and §7 using Wave C evidence in docs/research/technical/05, 07, 09 — do not treat Researcher shortlists as selections.
```

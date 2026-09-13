---
handoff_id: H-2026-09-13-P0-T02
affinity: research
track: parallel
status: completed
phase: "0"
task: "0.2"
from: commander
to: researcher
created: 2026-09-13
completed: 2026-09-13
---

# Phase 0 — Task 0.2 Technical Platform Evidence

## Start Command

```text
/researcher Read docs/handoffs/active/phase-0-task-0-2-researcher.md and execute it exactly.
```

## Objective

Owner: `/researcher`

Produce bounded, dated technical/platform evidence for OmniNote so
`/architect` can later write ADR-0001. Evidence and a candidate shortlist
with tradeoffs only — **do not select** the stack, vendors, or providers.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` (read-only — starter skeleton; not accepted)
3. `AGENTS.md` (Extension-First criteria)
4. `MEMORY.md` and `docs/memory/researcher.md`
5. `docs/handoffs/README.md`
6. This handoff file
7. `.cursor/skills/adr-decision/SKILL.md` (for evidence shape only — do not author ADR-0001)
8. `.cursor/skills/rag-evaluation/SKILL.md` and `.cursor/skills/threat-model/SKILL.md` (awareness of OmniNote risk surfaces)

## Inputs / Evidence

- Resolved identity in `TEMPLATE-PLACEHOLDERS.md` / `context.md`
- Portfolio / freelancing credibility product; no commerce/payments/shipping/SMS
- Primary locale `en` (LTR); secondary locale none; RTL deferred (not closed)
- Concrete TypeScript web stack is **pending ADR-0001**

## Allowed Write Paths

- `docs/research/technical/**`
- `docs/handoffs/active/phase-0-task-0-2-researcher.md` (status + outcome only)
- `docs/memory/researcher.md` (durable lessons only)

**Must not touch:** `context.md`, `architecture.md`, `docs/handoffs/current.md`,
`MEMORY.md`, application source, or any other agent's write paths.

## Deliverables

1. Evidence package under `docs/research/technical/` including at least:
   - Frontend framework candidates (e.g. Next.js, Remix, Vite+React, SvelteKit)
     evaluated against Extension-First criteria in `AGENTS.md`
   - Multi-tenant isolation approaches (Postgres RLS vs application-layer scoping)
   - Postgres + pgvector vs a dedicated vector store
   - Embedding and LLM provider posture including BYOK and data-retention terms
   - Hosting/deployment options
   - Auth options
2. A dated **evidence matrix** with sources (publication/access dates)
3. A **candidate shortlist with tradeoffs** — explicitly non-binding; no selection
4. Update this handoff file to `status: completed` with an outcome summary

## Constraints / Prohibited Decisions

- Do **not** select frameworks, hosts, auth vendors, vector stores, or AI providers
- Do **not** write or close ADR-0001
- Do **not** invent customer-behavior findings (route UX questions to `/ux_researcher`)
- Do **not** recommend WordPress, WooCommerce, PHP, or commerce stacks
- Do **not** claim RTL locale support; discuss RTL-readiness only as discipline
- Popularity alone is insufficient; include adverse evidence
- At most three serious options per category unless the matrix requires a brief fourth for exclusion

## Acceptance Criteria

- [x] Evidence matrix covers all scoped categories with dated sources
- [x] Each option includes maintenance, lock-in, security/privacy, accessibility,
      tenant-isolation fitness, and upgrade/exit notes where relevant
- [x] BYOK and provider data-retention terms are addressed for embedding/LLM candidates
- [x] Cross-tenant leakage is treated as a security failure mode in isolation evidence
- [x] Shortlist states tradeoffs without naming a winner
- [x] Unknowns and `@user` confirmation items are explicitly listed
- [x] No double-brace template placeholders and no commerce residue in written research
- [x] This handoff file updated with `status: completed` and outcome summary

## Directionality / Accessibility Checks

- Primary locale `en` (LTR) only in Phase 0
- RTL / mixed-BiDi **deferred, not closed** — record as open item if research
  touches i18n/CSS frameworks
- Note whether candidates support logical CSS / locale-driven `lang`/`dir`
- Accessibility posture of candidates is a matrix column, not an afterthought

## Dependencies / Risks

- Parallel with Tasks 0.3 and 0.4; no shared write paths
- Stale or marketing-only sources → mark weak and seek primary docs
- Over-scoping into UX or architecture selection → reject and stay bounded

## Gates

- Selection gate: closed until `/architect` ADR-0001 + `@user` confirmation
- Production AI/provider activation: remains open
- RTL locale support: remains deferred (not closed)

## Completion Instructions

1. Write the research package under `docs/research/technical/`
2. Set this file's frontmatter `status: completed` and append an Outcome Summary
3. Do **not** overwrite `docs/handoffs/current.md`
4. Do **not** update `context.md` (Commander integrates after all Wave-B tasks complete)
5. Final chat response must state the artifact path(s) and that Commander
   integration awaits the other parallel handoffs

---

## Outcome Summary

**Completed:** 2026-09-13  
**Owner:** `/researcher`  
**Selection:** none (explicitly deferred to ADR-0001 + `@user`)

### Files produced

- `docs/research/technical/README.md`
- `docs/research/technical/00-evidence-matrix.md`
- `docs/research/technical/01-frontend-frameworks.md`
- `docs/research/technical/02-rich-text-editors.md`
- `docs/research/technical/03-multi-tenant-isolation.md`
- `docs/research/technical/04-vector-storage.md`
- `docs/research/technical/05-embedding-llm-providers.md`
- `docs/research/technical/06-auth-identity.md`
- `docs/research/technical/07-hosting-deployment.md`
- `docs/research/technical/08-candidate-shortlist.md`
- `docs/memory/researcher.md` (durable lessons only)

### Key open questions

- Year-1 tenant count / corpus size; collab editing in v1; markdown vs JSON
  editor storage; React vs Svelte openness; always-on demo vs cold starts;
  self-host mandatory vs managed OK for vectors/auth/app.

### `@user` gates surfaced

- Monthly budget ceiling (infra + AI)
- Self-host vs managed preference (app, auth, vectors)
- Privacy / ZDR ambition vs standard ~30-day abuse retention
- Customer BYOK yes/no/later
- Data region preference (none / US / EU)
- Enterprise SSO in year-1
- ADR-0001 acceptance (still closed)

### Next

Commander integrates after Tasks 0.3 and 0.4 are also `completed`; do not
consume `docs/handoffs/current.md` from this parallel track.

```text
/commander Read docs/handoffs/current.md after Wave-B parallel handoffs 0.2/0.3/0.4 are completed; integrate research and open Task 0.5.
```

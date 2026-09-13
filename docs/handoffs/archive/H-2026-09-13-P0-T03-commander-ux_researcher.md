---
handoff_id: H-2026-09-13-P0-T03
affinity: ux-research
track: parallel
status: completed
phase: "0"
task: "0.3"
from: commander
to: ux_researcher
created: 2026-09-13
---

# Phase 0 — Task 0.3 UX Journey and Trust Evidence

## Start Command

```text
/ux_researcher Read docs/handoffs/active/phase-0-task-0-3-ux-researcher.md and execute it exactly.
```

## Objective

Owner: `/ux_researcher` (prose: `/ux-researcher`)

Produce customer-behavior and journey evidence for OmniNote note/knowledge
UX so Designer and Architect can later work from labelled evidence — not
invented findings. Unrun usability tests must be labelled **hypotheses**,
never findings.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` (read-only — starter only)
3. `AGENTS.md`
4. `MEMORY.md` and `docs/memory/ux-researcher.md`
5. `docs/handoffs/README.md`
6. This handoff file
7. `docs/research/README.md`

## Inputs / Evidence

- Domain: multi-tenant AI/RAG note and knowledge SaaS
- Business context: portfolio / freelancing credibility showcase
- No commerce, payments, shipping, or SMS
- Primary locale `en` (LTR); RTL deferred (not closed)

## Allowed Write Paths

- `docs/research/ux/**`
- `docs/handoffs/active/phase-0-task-0-3-ux-researcher.md` (status + outcome only)
- `docs/memory/ux-researcher.md` (durable lessons only)

**Must not touch:** `context.md`, `architecture.md`, `docs/handoffs/current.md`,
technical research paths, application source, or other agents' write paths.

## Deliverables

1. UX evidence package under `docs/research/ux/` covering:
   - Capture, organize, retrieve, and ask-your-notes journeys
   - Trust in AI-generated answers and the role of citations
   - Onboarding and empty states
   - Mobile capture
   - Competitor UX teardown: Notion, Obsidian, Mem, NotebookLM, Apple Notes
   - Friction and abandonment patterns (sourced or labelled hypothesis)
   - Portfolio-credibility signals appropriate to a freelancing showcase
2. Design-facing recommendations with evidence traceability
3. Explicit list of unrun tests labelled as hypotheses (e.g. UT-1…)
4. Update this handoff to `status: completed` with outcome summary

## Constraints / Prohibited Decisions

- Do **not** invent customer findings, interviews, quotes, or analytics
- Do **not** choose technical architecture, frameworks, or providers
- Do **not** treat competitor patterns as law or conversion proof
- Do **not** claim RTL locale research while RTL is deferred
- Do **not** invent commerce/checkout conversion funnels
- Desk research ≠ user validation

## Acceptance Criteria

- [x] All four journeys (capture, organize, retrieve, ask) are documented
- [x] Citation trust is explicitly analyzed with evidence labels
- [x] Competitor teardown covers the named products (or documents access limits)
- [x] Every unrun usability test is labelled a hypothesis, never a finding
- [x] Design-facing recommendations cite evidence IDs/sections
- [x] Portfolio-credibility signals are present and non-commerce
- [x] No technical stack selection
- [x] This handoff file updated with `status: completed` and outcome summary

## Directionality / Accessibility Checks

- Primary locale `en` (LTR) only
- RTL deferred (not closed) — do not invent Persian/RTL shopping findings
- Note mixed-content readability (code, URLs, identifiers in notes)
- Accessibility friction (keyboard, focus, labels, reduced motion, contrast)
  carries weight formerly given to RTL locale checks
- Recommend OmniNote fixtures for later tests: long titles, code blocks,
  inline URLs/identifiers, markdown tables, long unbroken strings,
  empty/error states

## Dependencies / Risks

- Parallel with Tasks 0.2 and 0.4
- Risk of inventing findings under time pressure — refuse and label unknowns
- Risk of drifting into architecture — stay in UX ownership

## Gates

- User-validation gates for unrun tests remain open
- No production activation implications from desk research alone
- RTL locale support remains deferred (not closed)

## Completion Instructions

1. Write the UX package under `docs/research/ux/`
2. Set this file's frontmatter `status: completed` and append an Outcome Summary
3. Do **not** overwrite `docs/handoffs/current.md`
4. Do **not** update `context.md`
5. Do **not** route directly to `/designer` — Commander accepts first
6. Final chat response must state artifact path(s) and await Commander integration

---

## Outcome Summary

**Completed:** 2026-09-13  
**Owner:** `/ux_researcher`

### Artifacts produced

| Path | Role |
|------|------|
| `docs/research/ux/README.md` | Package index + evidence taxonomy + counts |
| `docs/research/ux/01-journeys.md` | Capture / organize / retrieve / ask journey maps |
| `docs/research/ux/02-citation-trust.md` | Citation trust, refusal, streaming, recovery |
| `docs/research/ux/03-onboarding-mobile.md` | Cold start, empty states, activation, mobile |
| `docs/research/ux/04-competitor-teardown.md` | Notion, Obsidian, Mem, NotebookLM, Apple Notes |
| `docs/research/ux/05-friction-and-hypotheses.md` | Prioritized friction + UT-1…UT-14 |
| `docs/research/ux/06-portfolio-credibility.md` | First-60s freelance-client demo signals |
| `docs/research/ux/07-accessibility-friction.md` | A11y as customer experience |
| `docs/research/ux/08-design-facing-recommendations.md` | REC-01…REC-12 with evidence IDs |
| `docs/memory/ux-researcher.md` | Durable lessons only (updated) |

### Evidence inventory

- **Cited evidence:** 20 (CITE-01 … CITE-20)
- **Competitor observations:** 22 (OBS-01 … OBS-22)
- **Labelled hypotheses / unrun tests:** 14 (UT-1 … UT-14)
- **Design-facing recommendations:** 12 (REC-01 … REC-12)

### Highest-priority design-facing recommendations

1. **REC-01** — Write-first capture; defer organization  
2. **REC-04** — Passage-level citation inspection as primary trust loop  
3. **REC-10** — First-class no-supported-answer / partial-support states  
4. **REC-08** — Activation = note + (retrieve | cited ask | honest refusal); labelled sample corpus  
5. **REC-09** — Mobile capture-first with mobile-viable citation verify  

### @user gates (open — not closed by this task)

- Whether demos use **mock-only deterministic Ask** vs live provider (experience-first prefers validated mocks before production AI)
- Whether a **public sample workspace** ships for portfolio demos vs local-only fixtures  
- All **UT-1…UT-14** remain unrun — user-validation gates open  
- **RTL locale** remains deferred (not closed)

### Next step

Await `/commander` Wave-B integration (`docs/handoffs/current.md`). Do **not** hand off directly to `/designer`.

```text
/commander Read docs/handoffs/current.md and integrate completed Wave-B parallel outcomes when 0.2, 0.3, and 0.4 are all completed.
```

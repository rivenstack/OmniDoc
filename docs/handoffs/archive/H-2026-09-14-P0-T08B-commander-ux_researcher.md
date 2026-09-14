---
handoff_id: H-2026-09-14-P0-T08B
affinity: ux-research
track: parallel
status: completed
phase: "0"
task: "0.8b"
from: commander
to: ux_researcher
created: 2026-09-14
completed: 2026-09-14
---

# Phase 0 — Task 0.8b Dual-mode Demo, BYOK Cookbook, Sample Workspace UX

## Start Command

```text
/ux_researcher Read docs/handoffs/active/phase-0-task-0-8b-ux-researcher.md and execute it exactly.
```

## Objective

Owner: `/ux_researcher` (prose: `/ux-researcher`)

Produce design-facing recommendations and labelled hypotheses for:
mock-first → labelled live demo → customer BYOK; cookbook/wizard for
API-key creation; usage/charge visibility; public labelled sample
workspace vs “mine”; honest workspace/team chrome at minimal year-1
tenant count.

Do not choose providers. Do not treat UT-* as findings. Do not write
technical research files (Task 0.8 owns those).

## Outcome (2026-09-14)

**Status: completed.**

Delivered dual-mode / BYOK cookbook UX package under `docs/research/ux/`:

- New `09-byok-cookbook-and-dual-mode.md` — journeys (mock → operator
  free-tier live demo → customer BYOK), cookbook grow-as-tools pattern,
  usage/charges hypotheses, failure states, trust copy (no ZDR
  implication; sample vs mine), honest minimal workspace chrome, a11y +
  LTR-now / RTL-readiness.
- Amended `01-journeys.md`, `05-friction-and-hypotheses.md`,
  `06-portfolio-credibility.md`, `08-design-facing-recommendations.md`,
  `README.md`.
- New IDs: CITE-21…23, OBS-23…27, UT-15…22, REC-13…19; friction F-16…F-23.
- UT-1…UT-22 remain **unrun hypotheses** (not findings).
- No provider/vendor selection; language is operator free-tier / customer
  key only.
- No writes under `docs/research/technical/` or `context.md` /
  `docs/handoffs/current.md`.

**Architect/Designer input:** ports must expose runtime mode + quota
class + verify-vs-Ask failures + usage availability; Designer consumes
REC-13…19 as behavioural requirements after Commander acceptance.

**Next:** Commander incorporates into main track; Task 0.9 `/architect`
remains blocked until Task 0.8 technical evidence also lands.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §1, §4, §9 (read-only)
3. `AGENTS.md` UX Research Scope
4. `MEMORY.md` and `docs/memory/ux-researcher.md`
5. `docs/handoffs/README.md` and this file
6. `docs/research/ux/01-journeys.md`, `02-citation-trust.md`, `06-portfolio-credibility.md`, `08-design-facing-recommendations.md` (esp. REC-08)
7. `docs/research/ux/README.md` (update the index if you add a file)

## Inputs / Evidence

Commander-recorded `@user` answers and interpretations (2026-09-14):

- Dual-mode AI: operator-provided free-tier for hosted demo/test **and**
  customer-entered keys for paid scale. Cookbook/wizard (or better) so
  customers can create and use API keys on the website; the cookbook
  grows as tools are added. Show usage/charges if possible.
- Mock-first Ask remains mandatory until Customer Experience First is
  validated. Live operator path is **after** that gate, not instead of
  mocks. Do not design live-AI-first onboarding that skips mocks.
- Public labelled sample workspace for portfolio demos (REC-08) **plus**
  clone-and-run fixtures. Sample vs “mine” labelling is mandatory.
- Teams/workspaces shown on the website must be correct in design — no
  fake enterprise scale. Year-1 tenant count is minimal.
- Portfolio / freelance credibility; 6-month horizon.
- RTL stays deferred, not closed. Primary locale `en` (LTR).
- UT-1…UT-14 remain unrun hypotheses.

Provider names (OpenRouter, AWS) are technical inputs from Commander;
UX may refer to “operator free-tier” / “customer key” without selecting
vendors.

## Allowed Write Paths

- `docs/research/ux/**` (new `09-byok-cookbook-and-dual-mode.md` plus
  amendments to journeys / REC list / portfolio / hypotheses / README
  as needed)
- `docs/handoffs/active/phase-0-task-0-8b-ux-researcher.md` (status +
  outcome only)
- `docs/memory/ux-researcher.md` (durable lessons only)

**Must not touch:** `context.md`, `architecture.md`, `docs/adr/**`,
`docs/handoffs/current.md`, `docs/research/technical/**`, application
source.

## Deliverables

1. New `docs/research/ux/09-byok-cookbook-and-dual-mode.md` covering:
   - Journeys: mock Ask → labelled live demo → BYOK scale
   - Cookbook/wizard: create key elsewhere → paste → verify → first Ask
   - Grow-as-tools-added pattern for the cookbook
   - Usage/charges display (hypotheses if unrun)
   - Failure states: invalid key, quota exhausted, operator quota vs
     customer key, revoke/rotate
   - Trust copy: do not imply zero-retention; sample vs mine
2. Amendments to `08-design-facing-recommendations.md` (new REC-13+ as
   needed), `01-journeys.md`, `05-friction-and-hypotheses.md`,
   `06-portfolio-credibility.md`, and `README.md` counts/index
3. New UT-* only as labelled hypotheses
4. Input summary for Architect/Designer (UX does not co-own ADR)
5. This file updated to `status: completed` with outcome

## Constraints / Prohibited Decisions

- Do **not** invent customer findings, interviews, quotes, or analytics
- Do **not** choose technical architecture, hosts, or providers
- Do **not** promote UT-* to findings
- Do **not** claim RTL locale support
- Do **not** over-build enterprise billing UX — keep portfolio scale
- Do **not** skip mock-first CX validation in the recommended journey

## Acceptance Criteria

- Explicit alignment with mock-first before production AI
- YES public labelled sample + clone fixtures
- No UT-* promoted to findings
- Teams/workspaces honesty at minimal scale
- A11y + LTR-now / RTL-readiness called out for wizard, usage, and Ask
  trust chrome
- No technical provider selection
- No writes under `docs/research/technical/`

## Directionality / accessibility checks

- Primary locale `en` LTR; RTL deferred, not closed
- Logical CSS / `lang`/`dir` / `bdi` for keys, URLs, usage IDs
- Keyboard, focus, labels, contrast, reduced-motion for cookbook and
  citation/usage surfaces
- Accessibility is a release gate, not polish

## Dependencies / Risks

- Parallel with Task 0.8; non-overlapping writes
- Risk: live-AI-first onboarding that skips mocks — reject in package
- Risk: enterprise billing UX — keep portfolio-scale
- Task 0.9 `/architect` is blocked until 0.8 and 0.8b both land

## Gates

- Production AI activation remains gated
- RTL remains deferred
- UT-1…UT-14 remain unrun (new UT-* are also unrun)

## Completion Instructions

1. Write the UX package under Allowed Write Paths.
2. Set this file `status: completed` with an outcome summary.
3. Add only durable lessons to `docs/memory/ux-researcher.md`.
4. Do not overwrite `docs/handoffs/current.md`.

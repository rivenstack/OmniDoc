---
handoff_id: H-2026-09-13-P0-T01
affinity: coordination
track: main
status: completed
phase: "0"
task: "0.1"
from: user
to: commander
created: 2026-09-13
---

# Phase 0 — Task 0.1 Commander Baseline Plan (ARCHIVED)

## Outcome Summary

Completed 2026-09-13. Commander de-templatized the OmniNote operating
layer (contracts, skills, memory, copilot instructions), resolved
project identity, opened Wave-B parallel Tasks 0.2 / 0.3 / 0.4, archived
this starter handoff, and replaced `docs/handoffs/current.md` with the
Commander integration/re-plan handoff (execute only after all three
active handoffs complete). Downstream Task 0.5 (`/architect`) and
Task 0.6 (`/phase-check`) remain planned for the next Commander cycle.

## Start Command (historical)

```text
/commander Read docs/handoffs/current.md and execute the handoff exactly. Propose the first 1–3 Phase 0 tasks for OmniNote. Update context.md and write the next persistent handoff before finishing.
```

## Objective

Owner: `/commander`

Establish the first verifiable Phase 0 plan for OmniNote: one to three
concrete tasks, single owners, measurable acceptance criteria,
directionality/accessibility checks, and explicit gates. Do not select
vendors or close production gates.

## Required Reading

1. `context.md`
2. `architecture.md`
3. `AGENTS.md`
4. `MEMORY.md`
5. `docs/handoffs/README.md`
6. `docs/memory/commander.md`

## Inputs / evidence

- Template bootstrap only; domain evidence not yet gathered
- Project identity confirmed by `@user` this session

## Deliverables and files to update

1. Short Phase 0 plan (1–3 tasks) with owners and acceptance criteria
2. Updated `context.md` status
3. Next `docs/handoffs/current.md` for the first executing owner
4. Archive this starter handoff when consumed

## Constraints and prohibited decisions

- Do not select providers or close production gates
- Do not invent customer-behavior findings
- Do not skip Researcher / UX Researcher when evidence is required
- No dual ownership of one handoff
- No commit unless `@user` requests one

## Acceptance criteria

- [x] 1–3 tasks proposed with objective, owner, inputs, deliverables,
      acceptance criteria, directionality checks, dependencies/risks
- [x] Next handoff persisted with valid YAML `to:` one agent
- [x] `context.md` updated with handoff path
- [x] Open gates listed; none falsely closed

## Directionality / accessibility checks

Primary locale `en` (LTR) only; RTL deferred (not closed); RTL-readiness
discipline and accessibility required on UI-relevant tasks.

## User / professional-confirmation gates

Route unresolved legal, commercial, or vendor onboarding decisions to
`@user` after research.

## Completion instructions

1. Archive this handoff under `docs/handoffs/archive/`
2. Replace `docs/handoffs/current.md` with the next owner handoff
3. Update `context.md`

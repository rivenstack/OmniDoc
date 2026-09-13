---
handoff_id: H-2026-09-13-P0-T04
affinity: implementation-docs
track: parallel
status: completed
phase: "0"
task: "0.4"
from: commander
to: implementer
created: 2026-09-13
---

# Phase 0 — Task 0.4 Frontend Contributor Onboarding Pack

## Start Command

```text
/implementer Read docs/handoffs/active/phase-0-task-0-4-implementer.md and execute it exactly.
```

## Objective

Owner: `/implementer`

Deliver a **stack-agnostic** frontend contributor onboarding pack so a
human coworker can clone the repository and start contributing on the
frontend without guessing undecided stack choices. This is a direct
`@user` requirement.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` (read-only — starter; ports idea only)
3. `AGENTS.md`
4. `docs/handoffs/README.md`
5. This handoff file
6. Current `README.md` (template docs — replace)
7. `.cursor/skills/api-contract-change/SKILL.md`
8. `.cursor/skills/handoff-authoring/SKILL.md` (awareness of handoff rules to document for humans)

## Inputs / Evidence

- OmniNote identity resolved; template README is wrong for this product
- ADR-0001 (stack) is **not** accepted yet — docs must stay stack-agnostic
- Parallel research (0.2 / 0.3) may still be in flight — do not wait on them
- No application source exists yet; do not create scaffolding

## Allowed Write Paths

- `README.md`
- `CONTRIBUTING.md`
- `docs/frontend/**`
- `.gitignore`
- `.editorconfig`
- `docs/handoffs/active/phase-0-task-0-4-implementer.md` (status + outcome only)
- `docs/memory/implementer.md` (durable lessons only)

**Must not touch:** `context.md`, `architecture.md`, `docs/handoffs/current.md`,
`package.json`, source/scaffolding, vendor lock-in files, or other agents'
write paths.

## Deliverables

1. Rewrite root `README.md` as OmniNote's product/repo README (not the template README)
2. Create `docs/frontend/README.md` as the frontend contributor entry point covering:
   - What OmniNote is
   - What is settled vs pending ADR-0001
   - Clone and prerequisites (Node LTS, package manager, editor setup)
   - Repo map
   - How a human works inside the handoff system (`context.md` then
     `docs/handoffs/current.md`, one owner per task, handoffs persisted in
     markdown, chat-only handoffs invalid)
   - Where frontend code will land once ADR-0001 is accepted
   - Stack-independent non-negotiables:
     - UI calls project-owned ports only — never providers directly
     - Mock-first with deterministic fixtures
     - API contract changes follow `.cursor/skills/api-contract-change/SKILL.md`
     - Accessibility plus LTR-now / RTL-ready CSS discipline
     - No secrets in the repo
   - Branch / PR / definition-of-done conventions
   - **What you can start today** — concrete non-blocked work
   - **Still undecided** — explicit list so contributors do not guess
3. Create `CONTRIBUTING.md`
4. Create `.gitignore` (Node/TypeScript/editor/OS/env appropriate)
5. Create `.editorconfig`
6. Update this handoff to `status: completed` with outcome summary

## Constraints / Prohibited Decisions

- No `package.json`
- No scaffolding code, apps, or framework lock-in
- No vendor/framework selection (waits for ADR-0001)
- No inventing accepted architecture beyond what `architecture.md` already states as starter invariants
- Do not close production or RTL-locale gates
- Do not overwrite research or Commander files

## Acceptance Criteria

- [ ] `README.md` describes OmniNote the product/repo, not the agentic template
- [ ] `docs/frontend/README.md` includes all sections listed in Deliverables
- [ ] Settled vs pending ADR-0001 is unambiguous
- [ ] Handoff-system instructions for humans are accurate per `docs/handoffs/README.md`
- [ ] Non-negotiables include ports-only UI, mock-first, API contract skill,
      a11y + LTR-now/RTL-ready discipline, no secrets
- [ ] “What you can start today” and “Still undecided” lists are both present
- [ ] `CONTRIBUTING.md`, `.gitignore`, and `.editorconfig` exist and are sensible
- [ ] No `package.json` or framework scaffolding introduced
- [ ] This handoff file updated with `status: completed` and outcome summary

## Directionality / Accessibility Checks

- Document primary locale `en` (LTR) as the only Phase 0 locale
- Document RTL / mixed-BiDi as **deferred, not closed**
- Require RTL-readiness discipline in contributor rules: logical CSS
  (`margin-inline`, `padding-inline`, `inline-size`), `lang`/`dir` from a
  single locale source, `bdi`/isolation for identifiers/code/URLs,
  no physical-direction JS assumptions
- Accessibility (focus, keyboard, labels, reduced motion, contrast) is a
  definition-of-done item
- Suggested fixtures for future UI work: long note titles, code blocks,
  inline identifiers/URLs, markdown tables, long unbroken strings,
  empty/error states

## Dependencies / Risks

- Runs in parallel with 0.2 and 0.3; must remain stack-agnostic
- Risk of sneaking in Next/Vite opinions — forbid
- Risk of leaving template README residue — replace fully

## Gates

- ADR-0001 stack selection: open (do not close)
- RTL locale support: deferred (not closed)
- Production provider activation: open

## Completion Instructions

1. Write all deliverable files within Allowed Write Paths
2. Set this file's frontmatter `status: completed` and append an Outcome Summary
3. Do **not** overwrite `docs/handoffs/current.md`
4. Do **not** update `context.md`
5. Final chat response must list created/updated paths and note that
   Commander integration runs after all three Wave-B handoffs complete

## MCP note (optional)

Docs-only task: design/motion/asset MCPs are not required. If used for
any supporting diagram/asset, MCP output does not close architecture
gates or Phase Check.

## Outcome Summary

Completed 2026-09-13 by `/implementer`.

### Files produced

- `README.md` — OmniNote product/repo README (replaced template self-docs)
- `CONTRIBUTING.md` — human contribution rules; links to frontend guide
- `docs/frontend/README.md` — frontend contributor entry point
- `.gitignore` — Node/TypeScript/editor/OS/env, framework-neutral
- `.editorconfig` — UTF-8, LF, final newline, per-type indent; MD keeps trailing whitespace

### Deliberately left open

- ADR-0001 stack selection (framework, editor, DB, vector, auth, hosting, package manager)
- Exact `frontend/` / `backend/` layout — documented as expected contract pending Architect acceptance
- RTL locale shipping (deferred, not closed)
- Production AI/provider activation
- No scaffolding / `package.json` created

### Coworker still blocked on

- Installing or running an application (no app exists until ADR-0001 + implementation handoff)
- Choosing a package manager or framework as decided
- Production provider wiring and RTL locale claim

### Verification performed (manual, docs-only)

- Linked paths resolve to existing files
- No double-brace template placeholder tokens in written files
- No framework/package manager named as decided
- No secrets present; no `package.json` introduced

### Next

Do **not** touch `docs/handoffs/current.md`. Commander integrates after
Wave-B tasks 0.2, 0.3, and 0.4 are all `completed`.

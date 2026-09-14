---
handoff_id: H-2026-09-14-P1-T01
affinity: design
track: main
status: ready
phase: "1"
task: "1.1"
from: commander
to: designer
created: 2026-09-14
---

# Phase 1 — Task 1.1 Visual System and Journey UI Specs

## Start Command

```text
/designer Read docs/handoffs/current.md and execute Task 1.1 exactly. Produce implementation-ready visual system and journey UI specs from accepted UX + architecture. Do not invent customer findings. Do not scaffold application code.
```

## Objective

Owner: `/designer`

Create the OmniDoc visual system and implementation-ready UI specs for
the four core journeys (capture, organize, retrieve, ask) plus dual-mode
Ask chrome, cookbook/wizard, usage strip, public sample labelling, and
honest workspace chrome — from **accepted** UX research and **accepted**
architecture. Specs must be implementable on Next.js 16 + Tailwind 4 +
shadcn/ui (Base UI) in `packages/ui` (ADR-0002/0003).

A parallel Implementer task (1.2) scaffolds the Nx workspace. Do not
wait for it. Do not write `apps/` or `packages/`.

Consider Figma MCP (`plugin-figma-figma`) if authenticated and useful
for design-system fidelity; GSAP Master only if motion specs need it;
Canva MCP only for supporting marketing assets. MCP output does not
close architecture or Phase Check gates. If an MCP is unauthenticated,
note that and continue with repo-native Markdown/spec files.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` (accepted ports, answer states, locale, §5.9–§5.11)
3. `AGENTS.md` Design Scope
4. `docs/memory/designer.md`
5. ADR-0001, ADR-0002, ADR-0003, ADR-0004 (all `accepted`)
6. `docs/research/ux/08-design-facing-recommendations.md` (REC-01…REC-19)
7. `docs/research/ux/09-byok-cookbook-and-dual-mode.md`
8. `docs/research/ux/01-journeys.md`, `02-citation-trust.md`,
   `03-onboarding-mobile.md`, `06-portfolio-credibility.md`,
   `07-accessibility-friction.md`
9. `quality/ui-qa-checklist.md` (starting point, not final)
10. This handoff

## Inputs / Evidence

- Stack: Next.js 16.3.5, TipTap 3.31.3, Tailwind 4.3.3, shadcn/ui on
  Base UI, Better Auth orgs, ProseMirror JSON SoT
- Dual-mode: `mock` | `operator_free_tier` | `customer_key` (ADR-0004)
- Mock-first until CX gate; public labelled sample + clone fixtures
- Minimal year-1 tenants; no fake enterprise teams
- `en` LTR now; RTL deferred with RTL-readiness discipline
- Production AI still gated — design live chrome as labelled, not as
  the default first-run path
- UT-* remain unrun hypotheses — do not treat as findings

## Allowed Write Paths

- `docs/design/**` (create the tree)
- `quality/ui-qa-checklist.md` (extend if spec-driven, do not weaken)
- `docs/memory/designer.md` (durable lessons only)
- This file: append Outcome; set `status: completed` when done

**Must not touch:** `context.md`, `architecture.md`, `docs/adr/**`,
`docs/research/**`, `apps/**`, `packages/**`, workspace scaffold files,
`docs/handoffs/active/**` (Implementer 1.2).

## Deliverables

1. Design-system foundation: color/type/spacing/elevation tokens mapped
   to Tailwind v4 + shadcn conventions; dark mode via `next-themes`;
   Base UI `Direction` as single direction source.
2. App shell + navigation for authenticated workspace (honest
   org/workspace switcher — REC-18).
3. Journey specs (desktop + mobile): capture (write-first TipTap),
   organize (light optional structure), retrieve, ask with passage-level
   citations and first-class refusal/partial/conflict.
4. Dual-mode / cookbook / usage specs: mode×corpus labelling (REC-13,
   REC-17); cookbook chapters (REC-14); compact usage strip (REC-15);
   failure copy that names the mode (REC-16).
5. Empty, loading, error, indexing-progress, and sample-vs-mine states.
6. Accessibility and RTL-readiness notes per component (focus, keyboard,
   labels, contrast, reduced motion, logical CSS, `bdi` for keys/URLs/
   usage IDs/code). Do not claim RTL locale support.
7. Component inventory for `packages/ui` (names only + states) so
   Implementer can copy-in shadcn pieces without inventing IA.
8. Outcome on this handoff.

## Constraints / Prohibited Decisions

- Do not invent customer findings or conversion claims
- Do not choose new stack, providers, or hosts
- Do not skip mock-first in first-run / portfolio 60s script
- Do not design enterprise billing, SSO, or collab-editing chrome
- Do not require unmaintainable custom components when shadcn/Base UI
  covers the need (Extension-First)
- Cookbook is a settings/help surface, not a trust-boundary bypass

## Acceptance Criteria

- Specs trace to REC-01…REC-19 and architecture ports
- Four journeys + dual-mode surfaces have implementation-ready states
- LTR-now excellence; RTL-readiness discipline documented
- Accessibility is specified as a gate, not polish
- No application source generated
- No provider SDK implied in the client

## Directionality / accessibility checks

- Primary locale `en`; single `lang`/`dir` source
- Logical CSS only except true exceptions
- `bdi` for identifiers, keys, URLs, usage IDs, UGC fragments
- Keyboard, visible focus, labels, contrast, `prefers-reduced-motion`
  on Ask streaming chrome (REC-05, REC-11, REC-19)

## Dependencies / Risks

- Parallel with Task 1.2 (Nx scaffold). Specs must not assume generated
  file names beyond ADR-0002 (`apps/web`, `packages/ui`).
- Risk: live-AI-first onboarding — forbidden.
- Risk: fake enterprise teams chrome — forbidden (REC-18).

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- UT-* remain unrun

## Completion Instructions

1. Write `docs/design/**` specs.
2. Append Outcome; set this file `status: completed`.
3. Durable lessons only in `docs/memory/designer.md`.
4. Do not open the next Implementer journey task — Commander integrates
   1.1 + 1.2 and opens Task 1.3.

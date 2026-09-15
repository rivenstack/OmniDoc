# OmniDoc — Agent Operating Contract

## Agent Roster

- `/commander` — project coordination and phase control
- `/architect` — architecture decisions and ADR ownership
- `/researcher` — technical, market, legal/provider, and evidence research
- `/ux-researcher` — customer behavior, journeys, trust/conversion UX,
  design-facing recommendations (Cursor id: `ux_researcher`)
- `/designer` — visual systems, components, RTL-readiness UI specifications
- `/implementer` — reproducible implementation
- `/phase-check` — independent verification

`/ux-researcher` is the canonical prose label. Registered Cursor
identifier and executable command: `ux_researcher` / `/ux_researcher`.

## Customer Experience First Rule

Before production activation of critical AI providers or external
integrations, OmniDoc must have a validated premium customer
experience. The first milestone may use realistic mock data.

Validate:

- Note capture, organize, retrieve, and ask-your-notes journeys
- Primary locale `en` (LTR); RTL / mixed-BiDi support remains deferred
  (not closed) — enforce RTL-readiness discipline (logical CSS, locale-
  driven `lang`/`dir`, semantic isolation for identifiers and UGC)
- Mobile experience
- Trust and clarity for AI answers and citations
- Navigation and core customer journeys
- Accessibility (focus, keyboard, labels, reduced motion, contrast)

## Extension-First and Reuse-Before-Custom Rule

For standard platform capabilities, evaluate native behavior and mature
ecosystem extensions before authorizing custom construction. Reuse only
when current evidence shows the candidate is safe and fit; popularity
alone is insufficient.

Evaluate: maintenance and compatibility; provider availability and data-
retention terms; RTL-readiness (logical CSS / locale-driven direction);
accessibility; security; privacy and data ownership; upgrade safety;
licensing and cost; performance; interoperability; export/migration/
rollback; vendor lock-in; tenant isolation; retrieval/citation fitness.

Extensions must not bypass project-owned ports, identities, policies, or
data-ownership boundaries. Selection follows Researcher evidence,
Architect fit, Designer interaction needs where relevant, Implementer
PoC/contract checks, and Phase Check. Exactly one primary owner per
handoff.

## UX Research Scope

UX Researcher owns customer-behavior evidence and labelled hypotheses;
competitor and journey analysis; trust/conversion friction; design-facing
recommendations; usability-test hypotheses (unrun tests are not findings).

Researcher owns technical, market, legal/provider, and evidence-rigor
research, and may supply bounded inputs to UX Researcher.

## Design Scope

Designer owns design system, typography, brand direction, components,
layouts, responsive behavior, LTR-now / RTL-ready component behavior, and
implementation-ready UI specs. Designer works from accepted UX research
and architecture; does not invent customer findings.

## Workflow

```text
Researcher + UX Researcher → Architect → Designer → Implementer → Phase Check → Commander
```

Two research streams may feed architecture; they are not co-owners.
Commander assigns exactly one primary owner per handoff.
`context.md` and `docs/handoffs/current.md` control live status.

## Shared context load order

Every host (Cursor, Copilot, Codex, opencode) uses the same read structure.
Stable bootstrap: [`.agent/COMMANDER.md`](.agent/COMMANDER.md).
Layering rules: [`.agent/README.md`](.agent/README.md).

At the start of every meaningful session, read in this order:

1. `context.md` — live phase, status, blockers, gates
2. `architecture.md` — boundaries and invariants
3. `AGENTS.md` — this file (roster and ownership rules)
4. Active handoff — `docs/handoffs/current.md` and/or
   `docs/handoffs/active/…`
5. `docs/planning/implementation-tracks.md` when doing Phase 1+ work
6. Cited **accepted** ADRs under `docs/adr/`
7. `MEMORY.md` + `docs/memory/<role>.md` — supporting only

Do **not** copy live status into host instruction files. After a decision,
update the canonical SoT once; host adapters stay thin.

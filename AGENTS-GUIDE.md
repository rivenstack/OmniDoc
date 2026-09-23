# OmniDoc — Workflow Guide

Accepted ADRs and archived handoffs retain historical truth; `context.md`
and `docs/handoffs/current.md` control current numbering and assignment
precedence.

## Phase 0 Pattern (OmniDoc)

### Task 0.1 — Operating-layer baseline

Owner: `/commander`

De-templatize contracts, resolve identity, open Wave-B parallel research
and frontend onboarding tasks. Do not select vendors.

### Task 0.2 — Technical evidence

Owner: `/researcher`

Bounded platform/provider evidence matrix; shortlist with tradeoffs only.
Selection belongs to `/architect` (ADR-0001) plus an `@user` gate.

### Task 0.3 — UX evidence

Owner: `/ux_researcher`

Capture → organize → retrieve → ask-your-notes journeys, citation trust,
competitors, portfolio-credibility signals. Hypotheses ≠ findings.

### Task 0.4 — Frontend contributor onboarding pack

Owner: `/implementer`

Stack-agnostic README / `docs/frontend` / `CONTRIBUTING.md` / `.gitignore` /
`.editorconfig`. No scaffolding or vendor lock-in.

### Downstream (next Commander cycle)

Task 0.5 `/architect` (ADR-0001) then Task 0.6 `/phase-check` — open only
after Wave-B packages return and Commander integrates them.

## UX Research Request Template

```markdown
/ux_researcher Read docs/handoffs/current.md and execute it exactly.

Focus on:
- Customer usage behavior for multi-tenant AI/RAG note and knowledge SaaS
- Capture, organize, retrieve, and ask-your-notes journeys
- Trust in AI answers and the role of citations
- Mobile capture, empty states, portfolio-credibility signals

Produce evidence-based recommendations.
Do not implement or choose technical architecture.
Return to /commander before /designer starts.
```

## Designer Request Template

```markdown
/designer Read docs/design/now.md and docs/design/system-ux.md.

Document only system UX that other systems must honor, or a design
language after I choose among options you extract from references I give
you. Do not prescribe components, layout, motion, or code. Offer options
and stop. Do not change architecture decisions.
```

## Implementer Request Template

```markdown
/implementer Read docs/handoffs/current.md and execute it exactly.

Implement only the bounded deliverables behind approved ports.
Preserve accessibility and LTR-now / RTL-ready acceptance checks.
Do not close production gates or select providers.
Return to /commander (or /phase-check when the handoff says so).
```

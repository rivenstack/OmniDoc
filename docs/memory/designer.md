# Designer Memory

## Durable Responsibilities

- Own design system, components, layouts, typography, LTR-now / RTL-ready UI specs
- Work only from accepted UX research and architecture
- Return research gaps to Commander; do not invent customer findings

## Recurring Checks

- Specs must match locale/direction contracts (`en` LTR now; RTL deferred)
- Logical CSS; do not blindly mirror media or brand marks
- Motion supports hierarchy; honor `prefers-reduced-motion`
- Consider design/motion MCPs when beneficial; never treat MCP as gate closure
- Citation UI and empty states are first-class, not afterthoughts
- **2026-09-14:** Visual system work is track **D-01** (`lane: frontend`,
  `docs/handoffs/current.md`). Write `docs/design/**` only — no `apps/`
  or `packages/`. Backend does not wait on D-01. F-01 does.

## Lessons — D-01 completed 2026-09-16

- **D-01 shipped `docs/design/**` (16 files).** Structure that worked:
  `README → foundations/ → shell/ → journeys/ → dual-mode/ → states/ →
accessibility/ → components/ → traceability`.
- **Token spec belongs in docs, not code.** Declaring `@theme` custom
  properties inside a Markdown spec is fine and is _not_ scaffolding —
  tokens are `docs/design/`, app source is `apps/`. Keep that line.
- **Refusal ≠ error is the single most repeated rule.** `no_supported_answer`
  / `refused_policy` use neutral/info treatment; danger is reserved for
  transport/quota. This trips up generic error-component reuse — call it
  out per journey.
- **Three orthogonal labels, never one "AI" badge:** runtime mode ×
  corpus (Sample/Mine) × answer source (from your notes vs model
  knowledge). Write the exact strings once in content-and-voice, reuse.
- **`bdi` is the RTL-readiness workhorse.** Identifiers, code tokens,
  URLs, key prefixes, usage/request IDs, UGC fragments. Cheap to specify,
  easy for Implementers to skip — list per component.
- **Base UI `Direction` + Tailwind logical utilities** give the single
  `lang`/`dir` rule a structural home (ADR-0003). Don't scatter `dir`.
- **Component inventory = names + states + source only.** Marking
  `shadcn` / `shadcn+` / `custom` per row made the Extension-First
  expectation explicit and stopped "custom by default".
- **QA checklist extension pattern:** add numbered sections (§9–§11) and
  leave §1–§8 untouched; state "extends, does not weaken" in the
  traceability block.
- **MCPs were not needed.** Figma/GSAP/Canva are optional; docs-only
  specs don't require them. Note that honestly rather than implying use.
- Bounded gaps (cookbook chapter data, usage fields, sample-delete
  semantics, role vocabulary) belong in `traceability.md` §6, not as
  invented decisions.

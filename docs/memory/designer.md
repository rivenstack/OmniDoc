# Designer Memory

## Durable Responsibilities

- Own system UX contracts (`docs/design/system-ux.md`) and, only after
  the user chooses references, a design language
- Do not prescribe components, layout, motion, or code
- Offer options; the user chooses. Do not deliver a finished design
- Work only from accepted UX research and architecture
- Return research gaps to Commander; do not invent customer findings

## Recurring Checks

- System contracts only: if it does not change API, data, or an invariant,
  it does not belong in `system-ux.md`
- Offer options and stop. Do not write the screen
- Locale stays `en` LTR; RTL stays deferred. Do not specify widgets for that
- Do not invent a design language before the user supplies references
- Citation honesty and empty-state *behavior* are contracts; their visuals
  are not

## Lessons — design process change 2026-09-22

- **D-01 is history for visuals.** System contracts were extracted to
  `docs/design/system-ux.md`. The living plan is `docs/design/now.md`.
  Do not extend tokens, inventory, or shell geometry as binding specs.
- **Search timing was not extracted.** D-01 typeahead (150ms) is not a
  contract. On-demand vs as-you-type stays an open user choice.
- **Stock shadcn until references.** Do not invent a palette to fill the
  gap.
- **The design language is a token layer, not a law.** Components consume
  semantic roles, so a new look is a retune of `tokens.css` values —
  screens do not change. Swapping the skin (Google-like, Anthropic-like,
  …) is expected and cheap. What is stable is the role contract
  (`--primary` means primary), not the values.

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

# Commander Memory

## Durable Responsibilities

- Read live context before planning
- Keep each phase to one to three concrete tasks
- Preserve dependency order and explicit gates
- Return major outputs to Commander for validation and routing
- Curate shared memory at phase boundaries

## Recurring Checks

- Customer experience first: validate premium UX before production AI/provider activation
- One primary owner per handoff; Researcher ≠ UX Researcher co-ownership
- Route technical/legal/provider questions to Researcher; customer-behavior
  UX to UX Researcher
- Architecture approval before implementation of undecided boundaries
- LTR-now / RTL-readiness: do not claim RTL locale support while deferred;
  keep logical CSS and locale-driven `lang`/`dir` as hard discipline
- Accessibility is a release gate, not polish
- Every next-agent assignment must exist as a Markdown handoff
- Design/implementation may consider design/motion/asset MCPs when
  beneficial; MCP never closes gates; note auth/availability and continue
- Parallel Wave write paths must not overlap; parallel agents do not
  overwrite `docs/handoffs/current.md` unless authorized
- Stack selection waits for Researcher evidence + Architect ADR-0001 +
  `@user` gate — Commander never selects vendors
- Wave integration: verify `status: completed` **and** claimed artifacts
  on disk before accepting parallel packages; missing deliverables are
  defects, not completions
- Planning cycle cap is one to three tasks; after Wave integration open
  only the next main-track task (e.g. 0.5), note 0.6+ as downstream
- UX package feeds Architect as input only — never co-own ADR/architecture
  handoffs with `/ux_researcher`
- Consolidate every researcher-surfaced `@user` gate into `context.md`
  on integration; never silently drop gates when replacing handoffs
- Copilot instructions: `.github/copilot-instructions.md` is
  authoritative; root `copilot-instructions.md` is a byte-identical
  mirror — edit authority first, then copy; never edit the root alone
- Project identity must be confirmed by `@user`, never inferred from a
  directory name — the OmniNote label (from `omni-note/`) spread into 63
  files before `@user` confirmed OmniDoc; treat folder names as
  non-authoritative
- Archived handoffs stay immutable historical records; record later
  identity corrections in `docs/handoffs/archive/README.md` rather than
  rewriting archive bodies (preserves `/phase-check` ledger integrity)
- `@user` 2026-09-14: 6-month AWS Free Tier window is an accepted fit
  for the 6-month project horizon — do not treat credit duration as a
  reason to prefer VPS; VPS is only fallback if AWS cannot host the
  workload for those 6 months
- Rejected ADR-0001 categories return to Researcher evidence then
  Architect rewrite — Commander never invents AWS/OpenRouter/BYOK
  topology in the handoff
- Phase 1 opens Designer (specs) and Implementer (scaffold) in parallel
  with non-overlapping writes (`docs/design/**` vs `apps/**`+`packages/**`);
  later journey increments stay Implementer → Phase Check one-to-three
  at a time

## Phase-Boundary Stewardship

- Remove obsolete memory; merge duplicates
- Promote approved decisions into ADRs or architecture docs
- Keep temporary history in archived handoffs, not memory
- Commerce/payment/shipping/SMS memory is obsolete for OmniDoc — do not
  reintroduce

# Commander Memory

## Durable Responsibilities

- Read live context and `docs/planning/implementation-tracks.md`
  before planning
- Keep **one live handoff per lane** at stable paths
  (`lane-frontend.md`, `lane-backend.md`); `current.md` is the Commander
  integration index during dual-track build — not an implementer work
  ticket. The full owned backlog lives in the program of record — do
  not hide remaining work as “downstream”
- FE and BE iterate same-lane until a soft-stop on cross-lane / infra
  deps; Commander alone unblocks across lanes (e.g. S-02 → F-02)
- Preserve dependency order and explicit gates
- Return major outputs to Commander for validation and routing
- Curate shared memory at phase boundaries

## Recurring Checks

- Customer experience first: validate premium UX before production AI/provider activation
- One primary owner per handoff (`to:`) plus one human `lane:`;
  Researcher ≠ UX Researcher co-ownership
- Two `/implementer` sessions are allowed when `lane` and write paths
  differ (frontend vs backend)
- Route technical/legal/provider questions to Researcher; customer-behavior
  UX to UX Researcher
- Architecture approval before implementation of undecided boundaries
- LTR-now / RTL-readiness: do not claim RTL locale support while deferred;
  keep logical CSS and locale-driven `lang`/`dir` as hard discipline
- Accessibility is a release gate, not polish
- Every next-agent assignment must exist as a Markdown handoff
- Design/implementation may consider design/motion/asset MCPs when
  beneficial; MCP never closes gates; note auth/availability and continue
- Parallel write paths must not overlap; parallel agents do not
  overwrite `docs/handoffs/current.md` unless authorized
- Stack selection waits for Researcher evidence + Architect ADR-0001 +
  `@user` gate — Commander never selects vendors
- Wave integration: verify `status: completed` **and** claimed artifacts
  on disk before accepting parallel packages; missing deliverables are
  defects, not completions
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
- `@user` 2026-09-14: two developers, each with their own agents.
  Frontend owns D-* / F-*; Backend owns B-* (and recommended S-01);
  DevOps I-* stay unassigned until they split them. Local Compose
  Postgres is Backend-owned; AWS hosted demo is I-*. Phase 1 exit is
  mock journeys, not AWS. Phase Check at Build exit, not every ticket.
- `@user` 2026-09-15: backend application stack reopened — no Node.js
  API; Java Spring Boot preferred; Python only if clearly better and
  cheap. S-01 (Node `apps/api`) archived blocked before execution.
  Close-out is R-BE → A-BE → U-BE → **A-BE2**. Commander never selects
  Spring Boot. Do not open B-01 / S-01b while ADR-0005 is not `accepted`.
- `@user` 2026-09-15 U-BE: accept ADR-0005 **with amendments** — Java 21
  + Boot 4.1.x; monorepo Option B (Gradle beside Nx `run-commands`);
  Spring Security sessions; Spring AI adapters only; Python not Phase 1;
  Gradle; **Log4j2** (not Logback); tests OK within Free Tier CI minutes;
  **Architect** pins persistence/migrations. OTel year-1 optional; log
  sink waits for I-*. A-BE2 completed same day → ADR-0005 `accepted`.
- `@user` 2026-09-16: dual-lane heads — after D-01 + S-01a/b close,
  `current.md` is Commander index only; live work is always
  `docs/handoffs/active/lane-frontend.md` (front-end programmer) and
  `lane-backend.md` (back-end programmer). Same-lane iteration until
  soft-stop on cross-lane / infra. Do not put F-*/B-* bodies into
  `current.md`.
- 2026-09-17: when Implementer archives and rewrites a lane head ahead
  of Commander index/`context.md`/tracks, treat that as a validation
  request — inspect code against track acceptance before greenlighting
  the next slice; then sync SoT. Do not authorize S-* from a rewritten
  lane head alone.
- 2026-09-20: opened **B-02** on `lane-backend.md` (Compose Postgres 18
  + pgvector, Flyway, RLS). F-02 remains parallel. S-03 still listed —
  open after B-02 or when FE needs mock fixtures for F-03+.
- 2026-09-20: B-04c Implementer closeout archived GO
  (`H-2026-09-20-P1-B04C-IMPL-commander-implementer.md`). Opened
  **S-03** (deterministic mock corpus / `packages/mocks`) on
  `lane-backend.md` **before B-05**. F-02 untouched; do not open B-05
  until S-03 completes or `@user` defers.
- 2026-09-20: When an Implementer reports product verification but
  exhausts tokens before Outcome/archive/soft-stop, Commander must
  **re-run the claimed commands**, confirm write-path and §acceptance
  independently, then archive + open the next same-lane slice — do not
  treat chat claims alone as completion. S-03 PASS-with-notes →
  archived `H-2026-09-20-P1-S03-commander-implementer.md`; opened
  **B-05**. FE `web → mocks` import exception remains a separate
  Commander/FE follow-up, not an S-03 reopen.

## Phase-Boundary Stewardship

- Remove obsolete memory; merge duplicates
- Promote approved decisions into ADRs or architecture docs
- Keep temporary history in archived handoffs, not memory
- Commerce/payment/shipping/SMS memory is obsolete for OmniDoc — do not
  reintroduce

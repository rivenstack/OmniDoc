# OmniDoc — Live Context

## Project Identity

| Field | Value |
|-------|-------|
| Name | OmniDoc |
| Slug | `omni-doc` |
| Domain | Multi-tenant AI/RAG note and knowledge SaaS |
| Platform | TypeScript web SaaS (concrete stack **pending ADR-0001**) |
| Primary locale | `en` (LTR) |
| Secondary locale | None in Phase 0 |
| Target market | Global English-speaking |
| Business context | Portfolio / freelancing credibility product — production quality; **no** commerce, payments, shipping, or SMS |

**Identity note (2026-09-13):** Canonical name **OmniDoc** was confirmed by
`@user`. Earlier Phase 0 docs used **OmniNote** / `omni-note`, inferred
from the local workspace folder and never user-confirmed. Product
definition is unchanged; only the name was corrected. See
`docs/handoffs/archive/README.md` for why archived handoffs still say
OmniNote.

CMS/commerce platform concepts are not applicable. See
`TEMPLATE-PLACEHOLDERS.md`.

## Customer Experience First

Validate a premium capture → organize → retrieve → ask-your-notes
experience with realistic mocks before production AI/provider activation.

Validate at minimum:

- Core note/knowledge journeys and citation trust
- Primary locale `en` (LTR); RTL deferred (not closed) with RTL-readiness
  discipline required
- Mobile usability
- Accessibility (focus, keyboard, labels, reduced motion, contrast)

## Current Phase

**Phase 0 — Project Setup and Decision Baseline**

Goal: de-templatize the operating layer, gather technical and UX evidence,
land stack-agnostic frontend contributor docs, propose stack (ADR-0001),
verify Phase 0, then `@user` accepts/rejects ADR-0001.

## Current Status

- Tasks 0.1, 0.1b, 0.2, 0.3, 0.4, 0.5 completed (Wave B integrated;
  architecture + ADR-0001 proposed)
- **Task 0.6 completed** (`/phase-check`): independent Phase 0
  verification — **Phase Decision: PASS**. Full report:
  `docs/reviews/phase-0-verification.md`. New QA checklist:
  `quality/ui-qa-checklist.md`.
- **Re-verification completed (2026-09-13, `/phase-check`):** DEF-001
  (Medium, `/implementer`) and DEF-002 (Low, `/commander`) remediations
  independently re-verified against on-disk evidence (checksums,
  section-accurate quoting, full-tree greps) — both **CLOSED**. **Phase
  0 now exits with zero open defects** — only `@user` gates remain. A
  pre-publish secrets/privacy sweep of the full tree found no keys,
  tokens, personal data, or machine-identifying paths; **repository is
  safe to push to a public GitHub remote.** No new defects raised. Full
  evidence: re-verification section of `docs/reviews/phase-0-verification.md`.
- **Identity-correction verification completed (2026-09-13,
  `/phase-check`):** OmniNote → OmniDoc rename (63 files) independently
  re-verified. **Complete and self-explanatory** — zero live `OmniNote`/
  `omni-note` strings outside the dated, documented
  `docs/handoffs/archive/README.md` exception; no phrasing damage found
  across a broad sample; product definition, locale policy, port
  definitions, ADR-0001 `proposed` status, the open-gate list, and the
  20/22/14/12 evidence counts are all unchanged. Clone instructions
  correct/followable; no machine-path leakage; no false CI claim.
  Pre-publish secrets sweep re-run clean — **repository remains safe to
  publish.** Full evidence: Identity-Correction-Verification section of
  `docs/reviews/phase-0-verification.md`.
- **DEF-003 CLOSED (2026-09-13, `/phase-check`):** `/commander`'s text
  remediation (stale DEF-001/DEF-002 "still open" wording in
  `docs/handoffs/current.md` and this file's Blockers section, corrected
  to reflect both as closed, plus the OmniDoc/archived-OmniNote name
  note) was independently re-verified against disk — accurate, no
  `@user` gate removed/weakened/closed, ADR-0001 still `proposed`, no
  vendor "chosen," frontmatter/single-ownership intact. Full evidence:
  DEF-003 Closure Verification section of
  `docs/reviews/phase-0-verification.md`.
- **Phase 0 final defect ledger: DEF-001, DEF-002, DEF-003 all CLOSED —
  zero open defects.** Phase Decision reaffirmed **PASS**. Repository
  remains safe to publish.
- **Research-review refinements landed (2026-09-14,
  `@user`-directed):** `docs/research/version-ledger.md` created as the
  single authority for version-bound claims (pinning + re-verify rules);
  stale version cells across the technical package corrected after the
  evidence set was found to have gone stale within a day of being
  written — Next.js "v15+" → **16.3.5**, React Router 7 → **8**
  (v8 had shipped 2026-06-17), TipTap 3.27.3 → **3.31.3**, Lexical
  ~0.43 → **0.50.0**.
- **ADR-0001 amended and partially accepted (2026-09-14, `@user`):**
  category 1 (frontend framework) → **Next.js 16.3.5**, replacing the
  proposal's React Router 7; category 2 (editor) → **TipTap 3.31.3**
  with **ProseMirror JSON as the note source of truth** (markdown
  produced only by one canonical serializer for export + chunking).
  Categories 3–7 remain `proposed`. Decision record: ADR-0001
  §Decision record.
- **ADR-0002 `accepted` (2026-09-14):** **Nx 23.2.1** + **pnpm 12.4.1**
  + **Node 24 LTS**, `apps/web` + `apps/api` + `packages/*`, with
  `@nx/enforce-module-boundaries` making the ports-only invariant
  mechanically checkable. **Supersedes** the previously "confirmed"
  `frontend/` + `backend/` directory contract.
- **ADR-0003 `accepted` (2026-09-14):** Tailwind CSS 4.3.3 + shadcn/ui
  4.21.0 on Base UI 1.8.0; RSC + Server Actions first with Zustand
  5.0.15 for editor/UI state (no client cache library in v1); Vitest
  5.0.0 + Testing Library 16.3.3 + Playwright 1.63.0 + axe 4.13.0 +
  MSW 2.15.0 + Storybook 10.6.0.
- **Active:** Task 0.7 → **`@user`** ADR-0001 decision gate —
  **partially answered 2026-09-14**; the remaining categories and gates
  in `docs/handoffs/current.md` are still live
- Expected next: `/commander` re-plans Phase 1 with `/designer` and
  `/implementer` on the accepted stack (Next.js 16 + Nx workspace),
  and rolls Task 0.7 forward; scaffolding still requires an Implementer
  handoff

### Wave B packages (accepted evidence; do not rewrite)

| Stream | Path |
|--------|------|
| Technical evidence | `docs/research/technical/` |
| UX evidence | `docs/research/ux/` |
| Frontend onboarding | `README.md`, `docs/frontend/README.md`, `CONTRIBUTING.md`, `.gitignore`, `.editorconfig` |

### Architecture package (proposed; not `@user`-accepted)

| Artifact | Path |
|----------|------|
| Architecture baseline | `architecture.md` |
| ADR index | `docs/adr/README.md` |
| Stack ADR | `docs/adr/ADR-0001-frontend-and-platform-stack.md` (`proposed`) |

## Active Tasks

| Task | Owner | Status | Handoff |
|------|-------|--------|---------|
| 0.1 Operating baseline & Wave-B plan | Commander | completed | `docs/handoffs/archive/H-2026-09-13-P0-T01-user-commander.md` |
| 0.2 Technical platform evidence | Researcher | completed | `docs/handoffs/archive/H-2026-09-13-P0-T02-commander-researcher.md` |
| 0.3 UX journey & trust evidence | UX Researcher | completed | `docs/handoffs/archive/H-2026-09-13-P0-T03-commander-ux_researcher.md` |
| 0.4 Frontend contributor onboarding | Implementer | completed | `docs/handoffs/archive/H-2026-09-13-P0-T04-commander-implementer.md` |
| 0.1b Integrate Wave B → open 0.5 | Commander | completed | `docs/handoffs/archive/H-2026-09-13-P0-T01B-commander-commander.md` |
| 0.5 Architecture + ADR-0001 proposed | Architect | completed | `docs/handoffs/archive/H-2026-09-13-P0-T05-commander-architect.md` |
| 0.6 Independent Phase 0 verification | Phase Check | completed (PASS) | `docs/handoffs/archive/H-2026-09-13-P0-T06-architect-phase-check.md` |
| 0.7 `@user` ADR-0001 decision gate | `@user` | partially answered 2026-09-14 (categories 1–2; 3–7 + gates open) | `docs/handoffs/current.md` |

## Blockers

- **ADR-0001 categories 3–7 remain `proposed`** (database, vector,
  embedding/LLM posture, auth, hosting) — categories 1–2 are accepted
  (2026-09-14)
- Scaffolding is authorized in *shape* by ADR-0002 but still requires an
  **Implementer handoff** before any app is generated
- Production AI/provider activation remains gated
- Phase 0 verification complete (PASS) with **zero open defects**
  (DEF-001, DEF-002, DEF-003 all closed). Phase 0 fully closes once
  `@user` finishes the ADR-0001 gate (Task 0.7)

## Open Gates

**ADR / stack**

- **ADR-0001** — `accepted (partial)` 2026-09-14: category 1 (frontend
  framework) and category 2 (editor + note source of truth) accepted;
  categories 3–7 remain `proposed` and await `@user`
- **ADR-0002** — `accepted` 2026-09-14 (Nx workspace, pnpm, layout,
  boundary enforcement)
- **ADR-0003** — `accepted` 2026-09-14 (frontend application toolchain)

**Researcher-surfaced `@user` gates**

- Monthly budget ceiling (infra + AI)
- Self-host vs managed preference (app, auth, vectors)
- Privacy / zero-data-retention ambition vs standard abuse-retention
- Customer BYOK yes / no / later
- Data region preference (none / US / EU)
- Enterprise SSO in year-1

**UX-surfaced `@user` gates**

- Mock-only deterministic Ask vs live provider for demos
- Public sample workspace vs local-only fixtures
- UT-1…UT-14 unrun — user-validation open

**ADR-0001-added decision inputs**

- **Answered 2026-09-14:** note source of truth → ProseMirror JSON
  (markdown via one canonical serializer); React-only (Svelte closed);
  package manager → pnpm 12.4.1
- Still open: year-1 tenant count / corpus size; collaborative editing
  in v1; always-on demo hosting required
- **New inputs added by the 2026-09-14 decisions:** Nx generator choices
  and `@nx/enforce-module-boundaries` tag taxonomy (ADR-0002); whether
  Nx remote/cloud caching is ever enabled (currently **local cache
  only**, data-ownership question)

**Standing**

- **RTL locale support** — deferred, **not closed**; RTL-readiness
  discipline mandatory now
- **Production AI / provider activation** — open
- Architecture rewrite subject to Phase Check + ADR gate (not final
  accepted truth until those complete)

## Active Handoffs

- Main track: `docs/handoffs/current.md` → `@user` (Task 0.7 — ADR-0001
  decision gate)
- Parallel: none (`docs/handoffs/active/` holds README only)

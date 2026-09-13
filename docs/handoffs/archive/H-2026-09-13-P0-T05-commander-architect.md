---
handoff_id: H-2026-09-13-P0-T05
affinity: architecture
track: main
status: completed
phase: "0"
task: "0.5"
from: commander
to: architect
created: 2026-09-13
completed: 2026-09-13
---

# Phase 0 — Task 0.5 Architecture Baseline and ADR-0001 (Proposed) (ARCHIVED)

## Outcome Summary

Completed 2026-09-13 by `/architect`.

### Files produced

- `architecture.md` — OmniNote domain rewrite (ports, tenancy-at-retrieval,
  answer/citation states including first-class refusal, threats, rag-eval
  bar, locale/RTL-readiness, mock fixture themes); zero `{{` tokens;
  commerce framing removed
- `docs/adr/README.md` — ADR convention (statuses, `@user` acceptance path)
- `docs/adr/ADR-0001-frontend-and-platform-stack.md` — `status: proposed`
  only; cited Wave-B evidence; `@user` gates listed; not accepted

### ADR-0001 recommendations (proposed, not accepted)

- Frontend: React Router 7 Framework Mode
- Editor: TipTap (ProseMirror); CodeMirror for fenced code
- Database: PostgreSQL (+ shared schema, app scope + RLS defense-in-depth)
- Vector: pgvector in Postgres
- Embedding/LLM: ports + mocks first; operator keys; OpenAI embeddings;
  Anthropic or OpenAI LLM at activation; no Assistants vector_store SoT;
  customer BYOK later
- Auth: Better Auth + organization plugin
- Hosting: Railway (or Render); VPS if self-host mandated

### Explicitly undecided without `@user` (gates remain open)

Budget; self-host vs managed; ZDR ambition; BYOK yes/no/later; data
region; enterprise SSO year-1; mock-only Ask vs live demo provider;
public sample vs local fixtures; year-1 scale; collab editing v1;
markdown vs JSON SoT; always-on demo; React-vs-Svelte openness; package
manager; ADR-0001 acceptance; RTL locale; production AI activation.

### Next

Task 0.6 → `/phase-check` via `docs/handoffs/current.md`.

## Start Command (historical)

```text
/architect Read docs/handoffs/current.md and execute the handoff exactly. Rewrite architecture.md for OmniNote, define provider-neutral ports (including first-class refusal), and author ADR-0001 as status: proposed — do not accept. Then archive this handoff and write the next main-track handoff to /phase-check for Task 0.6.
```

## Objective (historical)

Owner: `/architect`

Produce the OmniNote architecture baseline and a **proposed** ADR-0001
stack decision package from Wave-B evidence. Recommend one option per
category with drivers, alternatives, consequences, and verification —
**do not** mark ADR-0001 `accepted` and **do not** close any `@user` gate.

UX research is an **input** only (citation-trust and REC-01…REC-12 shape
ports and the answer/citation boundary). `/ux_researcher` is not a
co-owner. Unrun hypotheses UT-1…UT-14 are **not** findings.

## Required Reading

1. `context.md`
2. `architecture.md` (starter skeleton — rewrite; currently has template tokens)
3. `AGENTS.md` (Extension-First / Reuse-Before-Custom; Customer Experience First)
4. `docs/handoffs/README.md`
5. This handoff
6. Technical evidence (cite; do not rewrite):
   - `docs/research/technical/README.md`
   - `docs/research/technical/00-evidence-matrix.md`
   - `docs/research/technical/01-frontend-frameworks.md`
   - `docs/research/technical/02-rich-text-editors.md`
   - `docs/research/technical/03-multi-tenant-isolation.md`
   - `docs/research/technical/04-vector-storage.md`
   - `docs/research/technical/05-embedding-llm-providers.md`
   - `docs/research/technical/06-auth-identity.md`
   - `docs/research/technical/07-hosting-deployment.md`
   - `docs/research/technical/08-candidate-shortlist.md`
7. UX evidence (consume as input; do not rewrite; do not treat UT-* as findings):
   - `docs/research/ux/README.md`
   - `docs/research/ux/01-journeys.md`
   - `docs/research/ux/02-citation-trust.md`
   - `docs/research/ux/03-onboarding-mobile.md`
   - `docs/research/ux/08-design-facing-recommendations.md` (REC-01…REC-12)
8. Implementer fixture contract (align mocks; do not overwrite):
   - `docs/frontend/README.md` (mock-first / deterministic fixture sections)
9. Skills:
   - `.cursor/skills/adr-decision/SKILL.md`
   - `.cursor/skills/threat-model/SKILL.md`
   - `.cursor/skills/rag-evaluation/SKILL.md`
   - `.cursor/skills/tenant-security-review/SKILL.md`
10. `MEMORY.md` and `docs/memory/architect.md` (supporting context only)

## Inputs / Evidence

- Project identity resolved in `context.md` (OmniNote; portfolio credibility;
  no commerce/payments/shipping/SMS)
- Primary locale `en` (LTR) only; RTL / mixed-BiDi **deferred, not closed**;
  RTL-readiness discipline remains an invariant
- Wave-B technical package: evidence + non-binding shortlist (no selection
  made by Researcher)
- Wave-B UX package: journeys, citation trust, REC-01…REC-12; 14 unrun
  hypotheses (UT-1…UT-14)
- Frontend onboarding pack already landed (stack-agnostic); human coworker
  fixture work is assigned in `docs/frontend/README.md`

## Allowed Write Paths

- `architecture.md`
- `docs/adr/**`
- `docs/handoffs/current.md` (archive this handoff, then write Task 0.6)
- `docs/handoffs/archive/**` (archive consumed `current.md` only)
- `context.md` (concise status / handoff path / blockers only — do not paste
  ADR or research bodies)
- `docs/memory/architect.md` (durable lessons only)
- `MEMORY.md` only if a durable shared lesson must be corrected (prefer
  agent memory)

**Must not write:** `docs/research/**`, `README.md`, `CONTRIBUTING.md`,
`docs/frontend/**`, `.gitignore`, `.editorconfig`, application source,
`package.json`, scaffolding, or other agents' exclusive paths.

## Deliverables

### 1. Rewrite `architecture.md` for OmniNote

Replace all `{{...}}` tokens and all commerce/storefront framing. Cover:

- Tenancy and identity boundary
- Note / document domain
- Ingestion, chunking, and embedding
- Retrieval (tenant-scoped)
- AI answer and citation boundary (including first-class
  refusal / no-supported-answer and partial-support as **states**, not
  errors — per UX REC-10 / citation-trust)
- Search
- Export and deletion

Locale: `en` LTR only in Phase 0; RTL deferred-not-closed with
RTL-readiness discipline preserved as an invariant (logical CSS,
locale-driven `lang`/`dir`, semantic isolation for identifiers/UGC).
Timestamps stored in UTC; formatted at presentation.

### 2. Provider-neutral ports

For every durable capability, define:

- Contract sketch
- Mock adapter path
- Future production adapter path
- Explicit failure states

Must include the refusal / no-supported-answer path as a first-class
answer-boundary state (not a transport error). UI must call ports only —
never providers directly.

### 3. Tenant isolation invariant

Tenant isolation holds at **retrieval time**, not only at query time.
Cross-tenant retrieval is a **security failure**, never a relevance miss.

### 4. Mock corpus and deterministic fixtures

Specify architecture-level requirements for a mock corpus and
deterministic fixtures so the frontend can be built before any provider
exists. Align with fixture themes already assigned to the human coworker
in `docs/frontend/README.md` (do not overwrite that file).

### 5. ADR package (`status: proposed` only)

- `docs/adr/README.md`
- `docs/adr/ADR-0001-frontend-and-platform-stack.md` with
  `status: proposed` — **never** `accepted`

ADR-0001 must, from Researcher evidence, recommend **one option per
category**:

- Frontend framework
- Editor library
- Database
- Vector storage
- Embedding and LLM provider posture (including BYOK)
- Auth
- Hosting

Each recommendation must include: drivers, alternatives considered,
consequences, migration/rollback path, security/privacy implications,
and verification that would confirm the choice. Cite
`docs/research/technical/` findings; do not assert fitness without
evidence. Apply Extension-First / Reuse-Before-Custom from `AGENTS.md`.
Explicitly list every `@user` gate that blocks acceptance.

## Constraints / Prohibited Decisions

- Propose — do **not** accept ADR-0001
- Do **not** close any open `@user` gate or the deferred RTL item
- Do **not** write application code, `package.json`, or scaffolding
- Do **not** overwrite Implementer or Researcher deliverables
- Do **not** treat UT-1…UT-14 as validated findings
- Do **not** invent legal/compliance conclusions
- Do **not** select vendors as final without listing the `@user` acceptance
  gate
- MCP (Figma / motion / Canva) may be considered if helpful for diagrams;
  MCP output does **not** close architecture gates or Phase Check — if
  unauthenticated/missing, continue with repo-native tools

## Acceptance Criteria

- [ ] `architecture.md` has zero `{{` tokens; commerce framing removed;
      OmniNote domain sections listed above are present
- [ ] Ports defined with contract sketch, mock path, production path, and
      failure states; refusal is first-class
- [ ] Tenant isolation at retrieval time is an explicit invariant;
      cross-tenant retrieval = security failure
- [ ] Mock corpus / deterministic fixture requirements align with
      `docs/frontend/README.md`
- [ ] `docs/adr/README.md` and `docs/adr/ADR-0001-frontend-and-platform-stack.md`
      exist with ADR-0001 `status: proposed`
- [ ] ADR-0001 cites technical research, applies Extension-First, lists
      `@user` gates blocking acceptance
- [ ] UX REC-01…REC-12 and citation-trust requirements shape ports /
      answer-citation boundary; UT-* not treated as findings
- [ ] Locale: `en` LTR; RTL deferred-not-closed; RTL-readiness + a11y
      called out as invariants / release surfaces
- [ ] This handoff archived; next `current.md` is Task 0.6 → `/phase-check`
- [ ] `context.md` updated with concise status and new handoff path

## Directionality / Accessibility Checks

- Primary locale `en` (LTR) only
- RTL / mixed-BiDi deferred, **not closed**; preserve RTL-readiness
  discipline in architecture invariants
- Accessibility (focus, keyboard, labels, reduced motion, contrast) is a
  hard acceptance surface for later UI phases — call it out in architecture
  non-negotiables where relevant
- Semantic isolation for identifiers, code, and URLs in notes

## Dependencies / Risks

- Depends on Wave-B evidence (complete); do not wait on further research
  unless a critical evidence gap blocks a recommendation — if so, document
  the gap and keep ADR `proposed`
- Risk: over-accepting vendors without `@user` gates — forbid
- Risk: treating UX hypotheses as requirements — forbid
- Risk: bypassing ports with direct provider calls in architecture text —
  forbid

## Gates (remain open — list in ADR and do not close)

**From Researcher (`docs/research/technical/`):**

- Monthly budget ceiling (infra + AI)
- Self-host vs managed preference (app, auth, vectors)
- Privacy / zero-data-retention ambition vs standard abuse-retention
- Customer BYOK yes / no / later
- Data region preference (none / US / EU)
- Enterprise SSO in year-1
- ADR-0001 acceptance (Architect proposes; `@user` accepts later)

**From UX Researcher (`docs/research/ux/`):**

- Mock-only deterministic Ask vs live provider for demos
- Public sample workspace vs local-only fixtures
- UT-1…UT-14 remain unrun (user-validation open)

**Standing:**

- RTL locale support — deferred, not closed
- Production AI / provider activation — open
- Starter architecture was not accepted; this rewrite is still subject to
  Phase Check + `@user` ADR gate

## Completion Instructions

1. Write `architecture.md`, `docs/adr/README.md`, and proposed ADR-0001
2. Archive this consumed handoff to
   `docs/handoffs/archive/H-2026-09-13-P0-T05-commander-architect.md`
   with `status: completed` and an outcome summary
3. Replace `docs/handoffs/current.md` with Task **0.6** → `/phase-check`
   (independent Phase 0 verification of architecture + ADR-0001 proposed
   package + Wave-B evidence integrity + frontend onboarding pack)
4. Update `context.md` (concise status, blockers, open gates, active
   handoff path)
5. Final response must state the archive path, the new handoff path, and
   the one-line `/phase-check` start command

## Downstream (do not open now)

After Task 0.6 verification: `@user` gate on ADR-0001 acceptance, then
Phase 1 with `/designer` once UX recommendations and architecture are
accepted. Commander opens those in a later cycle.

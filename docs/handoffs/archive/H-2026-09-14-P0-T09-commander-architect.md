---
handoff_id: H-2026-09-14-P0-T09
affinity: architecture
track: main
status: completed
phase: "0"
task: "0.9"
from: commander
to: architect
created: 2026-09-14
completed: 2026-09-14
---

# Phase 0 — Task 0.9 Amend ADR-0001 §3–§7 and architecture ports

## Start Command

```text
/architect Read docs/handoffs/current.md and execute Task 0.9 exactly. Accept ADR-0001 §3, §4, §6 from @user. Rewrite §5 and §7 from Wave C + UX 0.8b. Extend architecture.md ports. Do not scaffold.
```

## Objective

Owner: `/architect`

Make ADR-0001 categories 3–7 binding from `@user` answers plus Wave C
evidence. Extend `architecture.md` so dual-mode BYOK, usage metering,
and cookbook are ports — not “later.” Production AI activation and RTL
remain gated. Do **not** scaffold code.

UX research is an **input** only (REC-13…REC-19). `/ux_researcher` is
not a co-owner.

## Required Reading

1. `context.md`
2. `architecture.md`
3. `AGENTS.md`
4. `.cursor/skills/adr-decision/SKILL.md`
5. `.cursor/skills/threat-model/SKILL.md` (BYOK/vault)
6. `docs/adr/ADR-0001-frontend-and-platform-stack.md`
7. `docs/adr/ADR-0002-workspace-and-tooling.md`
8. `docs/adr/ADR-0003-frontend-application-toolchain.md`
9. `docs/adr/README.md`
10. Wave C technical: `docs/research/technical/05-embedding-llm-providers.md`, `07-hosting-deployment.md`, `09-byok-and-usage-metering.md`, `08-candidate-shortlist.md`, `00-evidence-matrix.md`
11. UX input: `docs/research/ux/09-byok-cookbook-and-dual-mode.md`, `08-design-facing-recommendations.md` (REC-13…19)
12. This handoff

## Inputs / Evidence

`@user` 2026-09-14 (Task 0.7 archive):

- §3 PostgreSQL shared schema + app scoping + RLS DiD — **accept**
- §4 pgvector — **accept**
- §5 reject “BYOK later”; customer BYOK is **v1**; dual-mode operator
  free-tier + customer key; usage display if APIs allow; cookbook is a
  UX surface; OpenRouter free-tier first; ~$10 after operational;
  accept ~30-day abuse-log retention
- §6 Better Auth + org plugin — **accept**; year-1 SSO not required
- §7 reject Railway/Render default; prefer AWS Free Tier; **6-month
  window is an accepted fit**; VPS only if AWS cannot host web + worker
  + Postgres(+pgvector) for those 6 months
- Minimal year-1 tenants; honest workspaces; collab much later
- Mock-first until CX validated; public labelled sample workspace

Wave C: AWS Free plan credits + 6 months can host that topology at $0
cash while the Free plan lasts; OpenRouter is a shortlist gateway (not
Researcher-selected); OmniDoc-BYOK ≠ OpenRouter-upstream-BYOK.

## Allowed Write Paths

- `architecture.md`
- `docs/adr/ADR-0001-frontend-and-platform-stack.md`
- `docs/adr/ADR-0004-*.md` (create only if BYOK + usage + dual-mode
  key-resolution exceeds ADR-0001 §5 coherence — Architect decides)
- `docs/adr/README.md` (index)
- `docs/memory/architect.md` (durable lessons only)

**Must not touch:** `context.md`, `docs/handoffs/current.md` replacement
(Commander archives), `docs/research/**` (except you may cite; do not
rewrite evidence), application source, scaffolding.

You may append an Outcome to this file when done; do not open Designer
or Implementer handoffs.

## Deliverables

1. ADR-0001 §3, §4, §6 → `accepted` with `@user` date and existing
   evidence citations.
2. ADR-0001 §5 **rewritten**: mocks first; dual-mode key resolution
   (operator demo quota vs customer vault); OpenRouter (or evidence-
   backed alternative) as the operator free-tier **candidate you now
   decide**; customer BYOK in v1; usage port; no Assistants/
   `vector_stores` as corpus SoT; distinguish OmniDoc-BYOK vs
   OpenRouter-upstream-BYOK. Status `accepted` citing Wave C + `@user`.
3. ADR-0001 §7 **rewritten**: Railway/Render not default; AWS Free Tier
   as preferred 6-month hosted-demo path (containerize web+worker;
   Postgres+pgvector); VPS fallback only if AWS cannot cover the
   workload; document credit-expiry honesty without treating expiry as
   a current blocker. Status `accepted` citing Wave C + `@user`.
   **Do not pick a single EC2 instance SKU** if research left that as
   PoC — pick the **topology class** (e.g. Free-plan EC2/ECS + RDS
   Postgres + pgvector) that evidence supports.
4. Decision record 2026-09-14 completed; summary table all seven
   `accepted`; remaining standing gates listed (RTL, production AI).
5. `architecture.md`: dual-mode in §5.3/§5.6; new ports for credential
   vault, usage/metering, key-resolution policy; §6 BYOK in-scope;
   §2/§9 minimal year-1 tenancy + public sample workspace; collab much
   later; §11 table updated.
6. Optional ADR-0004 if you split BYOK/usage/cookbook architecture from
   the stack ADR. If split, ADR-0001 §5 points at it.

## Constraints / Prohibited Decisions

- Do not scaffold, create `package.json`, or activate production AI
- Do not claim RTL locale support
- Do not treat UT-* as findings
- Do not invent AWS SKUs or OpenRouter model IDs beyond Wave C citations
- Do not enable Nx Cloud
- Cookbook is UX (Designer later); Architect owns ports and invariants
  only

## Acceptance Criteria

- ADR-0001 §1–§7 all `accepted` **or** §5/§7 remain `proposed` only if
  evidence is still insufficient (must list gaps — no silent invent)
- Every fitness claim in rewritten §5/§7 cites Wave C files
- BYOK is no longer “later”
- Railway/Render are not the default
- New ports have contract / mock / production / failure states
- Production AI and RTL remain gated in architecture text
- Scaffolding still not authorized

## Directionality / accessibility checks

Locale/dir invariants unchanged (`en` LTR; RTL deferred). Accessibility
remains a release gate. `bdi` isolation for keys, URLs, usage IDs stays
in §8/§9.

## Dependencies / Risks

- Hard dependency on completed 0.8 + 0.8b (both archived).
- Risk: selecting a concrete AWS SKU without evidence — use topology
  class instead.
- Risk: treating Researcher shortlist as already-accepted — Architect
  must **decide** §5/§7 now that `@user` directed the amendments.

## Gates

- Production AI activation — remains open
- RTL locale — remains deferred, not closed
- Nx Cloud — remains local-cache-only

## Completion Instructions

1. Write ADR + architecture updates.
2. Append Outcome to this file; set status `completed` in frontmatter.
3. Durable lessons only in `docs/memory/architect.md`.
4. Do not replace this handoff with Designer/Implementer — Commander
   opens Phase 1 after integrating 0.9.

---

## Outcome (2026-09-14)

**Status:** `completed` by `/architect`.

### Delivered

1. **ADR-0001** §3, §4, §6 → `accepted`; §5 and §7 **rewritten** then
   `accepted`. Summary table §1–§7 all `accepted`. Standing gates remain:
   production AI activation; RTL locale deferred; Nx Cloud local-only.
2. **ADR-0004** created (`accepted`): dual-mode BYOK, credential vault,
   usage/metering, runtime key-resolution; OpenRouter as operator
   free-tier gateway; OmniDoc-BYOK ≠ OpenRouter-upstream-BYOK. ADR-0001
   §5 points at it.
3. **`architecture.md`:** dual-mode in §5.3 / §5.6; new ports §5.9
   Credential vault, §5.10 Usage / metering, §5.11 Runtime
   key-resolution / mode; §6 BYOK in-scope; §2 minimal year-1 tenancy;
   §9 sample vs mine + public sample workspace; §11 ADR-accepted table.
4. **`docs/adr/README.md`** indexed ADR-0004; ADR-0001 status `accepted`.
5. Durable lessons appended to `docs/memory/architect.md`.
6. Did **not** write `context.md`, scaffold, or open Designer/Implementer
   handoffs.

### Next owner

`/commander` — integrate Task 0.9, update `context.md`, open Phase 1.

```text
/commander Read docs/handoffs/current.md Outcome for Task 0.9. Integrate ADR-0001 fully accepted + ADR-0004. Update context.md and open Phase 1 Designer/Implementer handoffs. Do not treat scaffolding as already authorized until you open Implementer.
```

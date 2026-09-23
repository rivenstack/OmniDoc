# OmniDoc — Shared Durable Memory

## Purpose

Concise durable lessons and user preferences that survive sessions.
Supporting context only — not authority for live status or architecture.

## User Preferences

- Provide exact, ready-to-run start commands rather than vague advice
- Persist every agent handoff in Markdown
- Keep agent sessions focused when context is large
- Prefer handoff-scoped section reads over attaching huge design docs
- Design work offers a few options; `@user` chooses. Do not deliver a
  finished visual design for review
- Designer documents system UX and (only after references are chosen) a
  design language. Do not prescribe layout, motion, or implementation.
  Until a language is chosen, UI uses stock shadcn defaults (ADR-0003)
- The design language is a swappable token layer: copied-in shadcn
  components consume semantic roles, so a new look = retune token values
  in `packages/ui` — components and screens do not change. The role
  contract is stable; the values are not
- The visible UI plan is `docs/design/now.md`. D-01 visual specs are
  historical, not a build ticket
- The F-01→F-11 sequence is the plan of record (PM tracks it); tasks are
  title + short description + integration details, UI details open
- Implementer asks the user for a reference (link / pasted code /
  prompt, image welcome) before building any visual block; offers
  options where the plan leaves a real choice; logs choices in
  `docs/design/now.md`
- Treat accessibility and LTR-now / RTL-readiness discipline as release
  gates (do not claim RTL locale support exists while it is deferred)
- Portfolio / freelancing credibility project: look and behave production-
  quality; no commerce, payments, shipping, or SMS in scope
- Canonical product name is **OmniDoc** (slug `omni-doc`), confirmed by
  `@user` on 2026-09-13 — never infer identity from the workspace folder
  name (the earlier OmniNote label was wrong)

## Durable Workflow Lessons

- Project identity must be confirmed by `@user`; folder/repo directory
  names are not authority (OmniNote inference polluted 63 files before
  correction)
- Cursor project subagents live under `.cursor/agents/*.md`
- `AGENTS.md` is persistent repo guidance; it does not register subagents
- Agents that write reports need write permission; behavioral boundaries
  still limit scope
- `context.md` = live status · `docs/handoffs/current.md` = main assignment
- Parallel work uses `docs/handoffs/active/`
- Phase 1+ program of record:
  `docs/planning/implementation-tracks.md` (frontend / backend / shared /
  devops). One live handoff **per lane**; do not hide remaining work as
  “downstream.” Local Compose Postgres is backend-owned; AWS is DevOps
  (unassigned until the two developers split I-*)
- Research evidence is not an architecture decision
- Evaluate native platform capabilities and mature extensions before
  custom work; adopt only through evidence, ports, PoCs, and gates
- Researcher vs UX Researcher scopes stay separate; one owner per handoff
- `/ux-researcher` prose · `ux_researcher` / `/ux_researcher` executable
- Accepted ADRs and approved architecture outrank memory
- Concrete stack selection waits for ADR-0001 plus `@user` gate
- ADR-0001 may be authored `proposed` from evidence; only `@user`
  acceptance closes the stack gate
- Unrun UX hypotheses (UT-*) are never findings and must not drive
  accepted requirements
- Refusal / no-supported-answer is a first-class answer state, not an
  error path
- Cross-tenant leakage is a security failure, never a relevance miss
- Tenant isolation must hold at retrieval time, not only at query time
- Untrusted note content is an injection surface; citations are a trust
  surface

## Shared Terminology

- **Architecture-ready:** boundary can be designed from approved evidence
- **Mock-ready:** implementation may use deterministic local/test behavior
- **Sandbox-ready:** official provider test environment available
- **Production-gated:** activation awaits user/legal/provider confirmation
- **Production-approved:** required gates and verification passed
- **RTL deferred:** no RTL locale in scope yet; RTL-readiness discipline
  remains mandatory; item stays open until explicitly closed

## Known Recurring Risks

- Treating market practice as law
- Treating extension marketing as verified compatibility
- Claiming RTL support when only LTR/`en` is in scope
- Marking critical state from untrusted client-only signals
- Letting UI call embedding/LLM providers directly (bypass ports)
- Storing BYOK or provider secrets in the repository
- Copying temporary task detail into memory (context bloat)

## Memory Hygiene

- Target fewer than 150 lines here; under 100 lines per agent memory file
- Status → `context.md` · Assignments → handoffs · Truth → architecture/ADRs

## MCP Conventions

- `.cursor/mcp.json` configures project MCP servers
- Never place tokens in repository JSON or Markdown
- Repository Markdown is authoritative; MCP memory is supplemental
- Design/implementation may *consider* design/motion/asset MCPs when
  beneficial; MCP never closes architecture gates or Phase Check

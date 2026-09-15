# Codex Instructions — OmniDoc

High-signal rules for Codex. Keep diffs small. Prefer reading over guessing.

## Always do first

1. Read [`.agent/COMMANDER.md`](../.agent/COMMANDER.md)
2. Follow its **shared context load order** (canonical SoT — do not skip):
   - `context.md`
   - `architecture.md`
   - `AGENTS.md`
   - active handoff (`docs/handoffs/current.md` and/or `docs/handoffs/active/…`)
   - `docs/planning/implementation-tracks.md` for Phase 1+
   - cited **accepted** ADRs only
   - `MEMORY.md` + `docs/memory/<role>.md` as supporting only
3. Apply [`.agent/CONVENTIONS.md`](../.agent/CONVENTIONS.md)

If the handoff `to:` is not your role, stop and say so.

## Codex working style

- Be direct; state assumptions only when blocked
- Stay inside Allowed Write Paths from the handoff
- Prefer the smallest change that satisfies acceptance criteria
- Run or add tests when auth, tenancy, contracts, or journeys change
- Ask before committing; never push unless told

## Hard constraints

- **No Node `apps/api`** — API is Java 21 / Spring Boot (Gradle) beside Nx
- **No production AI / live OpenRouter** unless an explicit gate says so
- **Do not invent** features, vendors, or ADRs
- **Do not overwrite** `docs/handoffs/current.md` unless authorized
- **Do not fork status** into `.codex/`, `.agent/`, or Copilot instructions —
  update `context.md` / handoffs / ADRs when authorized
- Secrets never enter the repo

## Parallel lanes

Two implementer sessions may run when `lane` and write paths differ
(frontend vs backend). Do not touch the other lane’s files. Local Compose
Postgres is backend-owned; AWS deploy is DevOps (often unassigned).

## When unsure

| Topic | Route |
|-------|-------|
| Phase / ownership | `/commander` (or tell `@user`) |
| Boundaries / ADRs | `/architect` |
| Evidence / vendors | `/researcher` |
| Customer UX claims | `/ux-researcher` |
| Visual specs | `/designer` |
| Construction | `/implementer` |
| Verification | `/phase-check` |

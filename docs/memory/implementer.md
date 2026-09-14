# Implementer Memory

## Durable Responsibilities

- Implement only bounded handoff deliverables
- Stay behind approved ports and mocks until production adapters are authorized
- Keep changes reproducible and upgrade-safe
- Stack-agnostic docs work must not lock frameworks before ADR-0001

## Recurring Checks

- Logical CSS / LTR-now / RTL-readiness and accessibility acceptance in UI work
- Do not close OQ/production gates from implementation alone
- Prefer evidence-backed extensions behind adapters over ad-hoc custom
- Avoid attaching entire large design docs when a section is named
- Never commit secrets, `.env` values, or BYOK keys

## Durable Lessons

- Parallel docs tasks: write only Allowed Write Paths; never touch
  `context.md` / `current.md` / research trees owned by sibling agents
- Frontend onboarding before ADR-0001: settle product/workflow/rules and
  unblocked fixture/contract work; present directory shape as pending
  Architect acceptance, not as decided stack
- Ignore secret-bearing local MCP overrides; keep tracked `.cursor/mcp.json`
  non-secret
- When verifying docs packs: check no double-brace placeholders, no vendor
  named as decided, and that relative links resolve

- After Architect rewrites `architecture.md`, refresh onboarding docs in
  the same wave or immediately after — stale “starter skeleton” wording
  is a Medium defect (DEF-001 class). Point at `docs/adr/` for decisions.
- **2026-09-14:** ADR-0001 §1–§7 and ADR-0004 are `accepted`. Task 1.2
  may scaffold the Nx workspace. Keep production adapters dark. Do not
  frame the stack as `proposed` in new onboarding text.
- Fixture work for humans should cross-reference `architecture.md` mock
  corpus requirements rather than duplicating a second authority.
- Answer-port `no_supported_answer` / `refused_policy` are success
  states; tenant isolation must hold at retrieval time.

- Canonical product name is **OmniDoc** (not OmniNote). After mechanical
  renames, re-read owned prose for awkward substitutions and fix clone/`cd`
  paths to match GitHub’s default directory (`OmniDoc`).
- Public remote: `https://github.com/rivenstack/OmniDoc.git` (default branch
  `main`). Do not claim CI exists until it is actually configured.


# Implementer Memory

## Durable Responsibilities

- Implement only bounded handoff deliverables for the assigned **`lane:`**
- Stay behind approved ports and mocks until production adapters are
  authorized
- Keep changes reproducible and upgrade-safe
- OmniDoc is **polyglot**: Next.js FE (ADR-0001/0002/0003) + Java 21 /
  Spring Boot API (ADR-0005). Do not treat the agent as FE-only or
  “stack-agnostic pending ADR-0001”

## Recurring Checks

- Read handoff `lane:` and Allowed Write Paths before writing
- Logical CSS / LTR-now / RTL-readiness and accessibility acceptance in
  UI work
- Backend: ArchUnit, RLS/`NOBYPASSRLS`, tenant GUC on same connection,
  no Spring AI types on the wire, production adapters dark
- Do not close OQ/production gates from implementation alone
- Prefer evidence-backed extensions behind adapters over ad-hoc custom
- Never commit secrets, `.env` values, or BYOK keys
- Free Tier CI minutes constrain Testcontainers / dual CI intensity

## Durable Lessons

- Parallel docs tasks: write only Allowed Write Paths; never touch
  `context.md` / `current.md` / research trees owned by sibling agents
- Ignore secret-bearing local MCP overrides; keep tracked `.cursor/mcp.json`
  non-secret
- When verifying docs packs: check no double-brace placeholders, no vendor
  named as decided, and that relative links resolve
- After Architect rewrites `architecture.md`, refresh onboarding docs in
  the same wave or immediately after — stale “starter skeleton” wording
  is a Medium defect (DEF-001 class). Point at `docs/adr/` for decisions.
- Fixture work for humans should cross-reference `architecture.md` mock
  corpus requirements rather than duplicating a second authority.
- Answer-port `no_supported_answer` / `refused_policy` are success
  states; tenant isolation must hold at retrieval time.
- Canonical product name is **OmniDoc** (not OmniNote). Public remote:
  `https://github.com/rivenstack/OmniDoc.git` (default branch `main`).
  Do not claim CI exists until it is actually configured.
- **2026-09-15:** Node S-01 archived `blocked` before execution. Do **not**
  scaffold Node `apps/api` or Better Auth. Successors: **S-01a** (FE Nx)
  and **S-01b** (Gradle Spring Boot). Domain ports are Java interfaces in
  the API module — not TS `packages/domain` as backend SoT.
- **2026-09-15 ADR-0005 accepted pins:** Java 21 + Boot 4.1.x; Gradle
  beside Nx (`run-commands`); Spring Security sessions; Spring AI adapters
  only; Spring Data JDBC (CRUD); JdbcTemplate + pgvector for vector/RLS;
  Flyway; Log4j2 JSON; Python not Phase 1.
- Two `/implementer` sessions OK when `lane` and write paths differ
  (frontend vs backend).

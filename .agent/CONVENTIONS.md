# OmniDoc — Coding Conventions

Stable conventions for frontend and backend work. Material stack or
boundary changes belong in ADRs (`docs/adr/`), not here. Live status
belongs in `context.md`.

## Polyglot layout

| Area | Location | Runtime |
|------|----------|---------|
| Frontend app / UI packages | `apps/web`, `packages/*` (Nx graph) | Node 24, pnpm, Nx |
| API / workers | `apps/api` (JVM Gradle module beside Nx) | Java 21, Spring Boot 4.1.x |
| HTTP / OpenAPI / SSE contracts | `docs/api/`, `packages/contracts` | Shared handshake |
| Deterministic mocks | `packages/mocks` (and MSW on FE) | No live provider I/O |

**Do not:**

- Create a Node `apps/api` BFF
- Treat TypeScript `packages/domain` as the backend source of truth
- Import Java domain types, Spring AI, or provider SDKs from UI packages
- Call providers from the browser or from RSC without going through ports

Frontend consumes the API via OpenAPI clients / MSW. Backend owns
contract authorship with the API handshake skill when contracts change.

## Naming

- Product name in docs and UI: **OmniDoc** (not OmniNote)
- Prefer descriptive module and package names aligned with Nx/Gradle
  project names once scaffolded
- Handoff ids and task codes stay as assigned (`D-01`, `S-01a`, `B-01`, …)
- Role prose: `/ux-researcher`; executable id: `ux_researcher`

## Error handling

- Prefer typed, actionable errors at API boundaries; do not leak internal
  stack traces or secrets to clients
- AuthZ failures are deny-by-default (403 on membership mismatch)
- Refusal / no-supported-answer is a first-class Ask state, not an
  exception path (`architecture.md`)
- Background jobs re-verify tenant membership; never trust client-only
  tenant claims

## Security practices

- Tenant identity comes from the **server-authoritative** session, not
  from client-supplied `tenantId` / `orgId` as authority
- Every note / chunk / embedding / citation row is tenant-scoped
- Vector and hybrid search apply tenant (and ACL) filters in the
  retrieval path; re-check before citation assembly
- Cache keys include tenant; do not serve cross-tenant stale authz
- Untrusted note content is an injection surface; citations are a trust
  surface — sanitize render paths
- Never commit API keys, BYOK material, real `.env` files, or
  secret-bearing MCP overrides
- Prefer the project skills under `.cursor/skills/` for tenant review,
  threat model, migration safety, AI content safety, and API contract
  changes when the task touches those surfaces

## Directionality and accessibility

- Primary locale: `en` (LTR)
- RTL / mixed-BiDi locale support is **deferred, not closed**
- Enforce RTL-readiness now: logical CSS, locale-driven `lang`/`dir`,
  semantic isolation for identifiers / code / URLs / UGC
- Accessibility is a release gate: focus order, keyboard, labels,
  reduced motion, contrast, narrow viewport (~390)

## Testing expectations

| Lane | Expectation |
|------|-------------|
| Frontend | Vitest, Playwright, axe checks, MSW for API mocks, Storybook where UI specs require it (ADR-0003) |
| Backend | JUnit, ArchUnit for package boundaries, Testcontainers within Free Tier CI-minute budget (ADR-0005) |
| Contracts | Keep FE mocks and OpenAPI aligned; follow `.cursor/skills/api-contract-change/SKILL.md` |

Add or update tests with behavior changes that affect auth, tenancy,
retrieval, citations, or public journeys. Prefer deterministic mocks
until production AI gates open.

## Change hygiene

- Small, reviewable diffs scoped to the handoff
- Do not reopen accepted ADRs in implementation PRs
- Do not hide remaining backlog work as “downstream” — the program of
  record is `docs/planning/implementation-tracks.md`
- Update canonical SoT (`context.md`, handoffs, ADRs) when authorized;
  do not fork status into `.agent/`, `.codex/`, or Copilot instructions

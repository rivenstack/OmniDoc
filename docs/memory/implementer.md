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
- **2026-09-15 (S-01a):** pnpm 12 ignores the `pnpm` key in
  `package.json` — build approval lives as `allowBuilds:` in
  `pnpm-workspace.yaml` (`pnpm approve-builds <pkg>` writes it there).
- **2026-09-15 (S-01a):** `@nx/eslint-plugin@23.2.1`
  `enforce-module-boundaries` schema puts `bannedExternalImports` and
  `allowedExternalImports` **per depConstraint** (not top-level) and
  names the tag list `onlyDependOnLibsWithTags` (not `onlyDependOn`).
  The rule bails silently on **uninstalled** npm imports — proving the
  banned-external path needs the package temporarily installed.
- **2026-09-15 (S-01a):** `flat/typescript` needs `@eslint/js` +
  `typescript-eslint` peers; `flat/react` additionally pulls
  `eslint-plugin-import` et al. — base+typescript suffices for
  boundary-only lint.
- **2026-09-15 (S-01a):** keep Nx cache under `node_modules/.cache/nx`
  via `cacheDirectory` to avoid touching `.gitignore` outside
  Allowed Write Paths.
- **2026-09-16 (S-01b):** Boot **4.1.1** Initializr maps Web →
  `spring-boot-starter-webmvc` (not `spring-boot-starter-web`). MockMvc
  autoconfigure lives under
  `org.springframework.boot.webmvc.test.autoconfigure`. Prefer MockMvc
  over TestRestTemplate unless also adding `spring-boot-restclient`
  (`RestTemplateBuilder` moved).
- **2026-09-16 (S-01b):** ArchUnit 1.4+ fails empty `should()` sets —
  keep at least one class in `com.omnidoc.api.web` (e.g. marker) or set
  `allowEmptyShould(true)`. Deliberate Spring AI leak proof needs a
  temporary `org.springframework.ai` artifact on the classpath.
- **2026-09-16 (S-01b):** put `.gradle/` in `apps/api/.gitignore` rather
  than editing root `.gitignore` outside Allowed Write Paths. Option B
  Gradle-at-`apps/api` + Nx `run-commands` works without `@nx/gradle`.
- **2026-09-16 (S-01b):** exclude `UserDetailsServiceAutoConfiguration`
  on the scaffold app so Security does not log a generated password
  before B-03 session wiring.
- **2026-09-17 (S-02):** Canonical HTTP SoT is `docs/api/openapi.yaml`.
  Generate TS with `openapi-typescript` 7.13.0 into
  `packages/contracts/src/generated/openapi.ts` — do not hand-edit that
  file. Ask SSE event *names* live in `docs/api/ask-sse.md`; JSON
  payloads are OpenAPI `AskSse*` components. Keep `export const appName`
  — `apps/web` still imports it and is outside this write path.
- **2026-09-17 (S-02):** `partial` and `conflict` are legal on both
  `AskOutcome` and `ErrorCode` but mean different things; distinguish by
  field (`Answer.outcome` vs `ErrorBody.code`), not by banning the token.
- **2026-09-17 (S-02):** Adding contracts codegen deps updates the root
  `pnpm-lock.yaml` as a workspace consequence. Springdoc in `apps/api`
  must later match `docs/api/`, not become a second authority.


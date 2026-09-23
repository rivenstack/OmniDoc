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
  file. Ask SSE event _names_ live in `docs/api/ask-sse.md`; JSON
  payloads are OpenAPI `AskSse*` components. Keep `export const appName`
  — `apps/web` still imports it and is outside this write path.
- **2026-09-17 (S-02):** `partial` and `conflict` are legal on both
  `AskOutcome` and `ErrorCode` but mean different things; distinguish by
  field (`Answer.outcome` vs `ErrorBody.code`), not by banning the token.
- **2026-09-17 (S-02):** Adding contracts codegen deps updates the root
  `pnpm-lock.yaml` as a workspace consequence. Springdoc in `apps/api`
  must later match `docs/api/`, not become a second authority.

- **2026-09-17 (F-01):** Tailwind v4 needs two project-level hooks for a
  copy-in UI package: `@source` globs **inside the CSS entry** (a pnpm
  workspace package is symlinked under `node_modules`, which Tailwind's
  auto-detection skips) and `transpilePackages: ["@omnidoc/ui"]` in
  `next.config.mjs` (the package ships TS source, not built JS).
- **2026-09-17 (F-01):** `@custom-variant` declared in an **imported** CSS
  file does register globally, and `@theme inline` re-exposes non-Tailwind
  role names (`--od-*`) under Tailwind's namespaces as 1:1 aliases. Verify
  by inspecting the built CSS, not by assuming.
- **2026-09-17 (F-01):** Tailwind v4 **tree-shakes unused `@theme`
  variables** — a token referenced by nothing is absent from the output.
  Fine for utilities (they pull their variables back in when used), but a
  raw-CSS consumer of an unused token would get an undefined variable.
- **2026-09-17 (F-01):** two `@types/react` copies make `tsc` fail with
  "Two different types with this name exist, but they are unrelated" —
  `node_modules/@types` at the workspace root is **auto-included**, so a
  package pinning a different `@types/react` than the root breaks. Keep
  `@types/react` / `@types/react-dom` on the root's version everywhere.
- **2026-09-17 (F-01):** likewise pin a UI package's **devDependency**
  `react`/`react-dom` to the app's exact version, or the app bundle ends up
  with two React copies and invalid hook calls. (`@omnidoc/ui` uses
  19.2.7 to match `apps/web`; the ledger's 19.3.0 there would duplicate.)
- **2026-09-17 (F-01):** under Vitest 5 `import.meta.url` is not a `file:`
  URL, so `fileURLToPath(new URL(...))` throws "The URL must be of scheme
  file". Read fixtures with `path.join(process.cwd(), ...)` and rely on the
  Nx target's `cwd`.
- **2026-09-17 (F-01):** Vitest/Vite rejects `esbuild: { jsx: "automatic" }`
  ("'jsx' does not exist in type 'ESBuildOptions'"). Set
  `"jsx": "react-jsx"` in the package tsconfig instead — the shared base's
  `preserve` (for Next) does not emit a runtime.
- **2026-09-17 (F-01):** jsdom has no `matchMedia`, which `next-themes`
  calls; add a stub via `test.setupFiles`. Also RTL only auto-cleans up
  when vitest globals are on — call `afterEach(cleanup)` explicitly.
- **2026-09-17 (F-01):** lint traps in test/setup code: literal
  `false && x` trips `no-constant-binary-expression` (use a variable), and
  `() => {}` trips `@typescript-eslint/no-empty-function` (use
  `() => undefined`).
- **2026-09-17 (F-01):** do **not** add `api` to a frontend
  `nx run-many` verification — `api:build`/`api:test` need a Java 21
  toolchain that is absent locally, and it is another lane's problem.
  Scope to `--projects=ui,web,contracts,mocks`.
- **2026-09-20 (B-02):** default Spring profile must exclude Boot 4 JDBC /
  Flyway autoconfig (`org.springframework.boot.jdbc.autoconfigure.*`,
  `...flyway.autoconfigure.FlywayAutoConfiguration`) so health/ArchUnit
  stay green without a live DB; enable under profile `local` only.
- **2026-09-20 (B-02):** `CREATE EXTENSION vector` needs superuser — put it
  in Compose/init (or Testcontainers admin), not Flyway as migrator.
  Migrator is table owner + `BYPASSRLS` (FORCE RLS otherwise blocks owner
  seed); runtime `omnidoc_app` stays `NOBYPASSRLS` non-owner. Tenant GUC
  `app.current_tenant_id` via `set_config(..., true)` inside a txn;
  missing GUC → empty (fail closed). Testcontainers 2.x artifacts are
  `testcontainers-junit-jupiter` / `testcontainers-postgresql` and
  `org.testcontainers.postgresql.PostgreSQLContainer` (non-generic).
- **2026-09-20 (B-03):** Boot 4 ships **Jackson 3** —
  `tools.jackson.databind.ObjectMapper` (annotations stay
  `com.fasterxml.jackson.annotation`). The autoconfigured bean is a
  `JsonMapper`; inject by `ObjectMapper` supertype. `writeValueAsString` /
  `readValue` no longer throw checked exceptions.
- **2026-09-20 (B-03):** Spring Security 7 —
  `AntPathRequestMatcher` is gone; use
  `PathPatternRequestMatcher.pathPattern(HttpMethod, path)` for
  method-scoped matchers (needed to exempt only `POST /api/v1/session`
  from CSRF). `csrf().spa()` = `CookieCsrfTokenRepository.withHttpOnlyFalse()`
  (`XSRF-TOKEN` cookie / `X-XSRF-TOKEN` header) + `SpaCsrfTokenRequestHandler`,
  which accepts the **raw** token when it arrives as a header and the
  XOR-masked value otherwise.
- **2026-09-20 (B-03):** the SPA CSRF cookie is written lazily — nothing
  emits `XSRF-TOKEN` unless something calls `CsrfToken.getToken()`. Touch
  the `CsrfToken.class.getName()` request attribute at sign-in instead of
  adding a separate token endpoint.
- **2026-09-20 (B-03):** manual (non-filter) login must
  `securityContextRepository.saveContext(...)` explicitly —
  `SecurityContextHolderFilter` only loads and clears. Invalidate any
  existing session first for fixation defence.
- **2026-09-20 (B-03):** with Boot's default security dispatcher types the
  `/error` forward is authorized too — `permitAll` `/error`, or an
  unauthenticated 400 surfaces as 401.
- **2026-09-20 (B-03):** keep the `SecurityFilterChain` free of DataSource
  dependencies and profile-gate only the adapter + controllers
  (`@Profile` works directly on `@RestController` / `@RestControllerAdvice`).
  That keeps `HealthEndpointTest` green on the default profile.
- **2026-09-20 (B-03):** RLS needs a second GUC for membership discovery
  (`app.current_actor_id`) because an actor must find its workspaces
  *before* a tenant is known. Permissive Postgres policies OR together, so
  an actor-scoped `FOR SELECT` policy coexists with the V2 tenant policy
  without weakening it. FK checks bypass RLS, so tenant-scoped inserts
  referencing parent rows still work.
- **2026-09-20 (B-03):** `IdentityModels.SessionHandle` has no transport
  meaning in a JDBC adapter — define it as the server-resolved actor id
  (`IdentitySessions`) rather than the container session id, otherwise
  `listWorkspaces`/`resolveMembership` cannot resolve an actor.
- **2026-09-20 (B-03):** Spring Boot IT pattern for the `local` profile:
  `@ActiveProfiles("local")` + `@DynamicPropertySource` pointing at a
  Testcontainers Postgres, with `spring.flyway.enabled=false` because
  roles/extension/migration/seed must run in `@BeforeAll` (which executes
  before the context loads). MockMvc has no cookie jar — carry
  `MockHttpSession` from `result.getRequest().getSession(false)` and replay
  the `XSRF-TOKEN` cookie plus header by hand.
- **2026-09-20 (B-04):** optional note-by-id workspace headers require two
  secure paths: a supplied selector is membership-bound before a tenant-GUC
  lookup and rejects a workspace mismatch; headerless lookup starts from the
  session actor's memberships, probes only distinct member tenants with a
  membership-scoped query, then re-binds the discovered server-side workspace.
  A `noteId` is never tenant or workspace authority.
- **2026-09-20 (B-04):** ordinary get/update resolution must exclude
  `soft_deleted_at`, but purge needs an explicit tombstone-inclusive resolution
  path before it locks the note and deletes versions + note. Reusing normal get
  for purge makes soft-deleted notes impossible to purge.
- **2026-09-20 (B-04):** optimistic note updates use one conditional Postgres
  `UPDATE ... WHERE current_version_id = ? RETURNING ...` inside the tenant-GUC
  transaction, then append the version only on success. The row lock and
  predicate recheck make interleaved writers yield one success and one conflict.
- **2026-09-20 (B-04c):** closeout is tests/Postman/load only — do not duplicate
  green `NotesHttpIT` / `IdentitySessionIT` scenarios; add CSRF negatives on
  remaining notes mutators and one MockMvc lifecycle e2e instead. Local load /
  Postman need an explicit migrator seed (`apps/api/load/seed-local-fixture.sql`)
  because Flyway ships schema without actors. After closeout soft-stop the lane
  for Commander **S-03** (before B-05); do not open either from Implementer.
- **2026-09-23 (F-01 remake):** shadcn v4 config is `style: base-nova`
  (Base UI variants) + `iconLibrary: tabler`. Run `shadcn add` from
  `packages/ui` (framework "Manual") so files and deps land in the library,
  not the app. The CLI rewrites registry icons to the configured library
  (lucide `Loader2Icon` → tabler `IconLoader`).
- **2026-09-23 (F-01 remake):** the CLI also wants to install its `cn`
  package; this project keeps its own `cn` in `packages/ui/src/lib/utils.ts`
  and rewrites `from "cn"` imports after copy-in.
- **2026-09-23 (F-01 remake):** upstream shadcn v4 focus rings are
  `ring-ring/50`; at 50% over white even a dark green ring is ~1.9:1 and
  fails the 3:1 non-text contrast bar. Copied-in components use
  full-opacity `ring-ring`, and status colors were darkened until they pass
  ≥4.5:1 on their own 10% tint. Never copy upstream class strings without a
  contrast pass.
- **2026-09-23 (F-01 remake):** base-nova components depend on
  `shadcn/tailwind.css` custom variants (`data-checked`, `data-horizontal`,
  …). This design system inlines that block in `tokens.css` (attributed)
  instead of adding the CLI as a dependency; re-sync it on shadcn upgrades.
- **2026-09-23 (F-01 remake):** pnpm 12 `allowBuilds` is strict — any
  package with a build script that is not listed fails
  `pnpm install --frozen-lockfile` (msw here). List it explicitly
  (`msw: false`, its postinstall is a no-op without `msw.workerDirectory`).
  `pnpm add --ignore-scripts` still works for adding deps meanwhile.
- **2026-09-23 (F-01 remake):** Tailwind v4 compiles `rounded-full` to
  `border-radius:3.40282e38px` (not `9999px`), and `@custom-variant` /
  `@utility` declared inside an imported package CSS do register globally —
  verify tokens and variants in the built CSS, not by inspection of source.
- **2026-09-23 (F-01 remake):** `next/font` self-hosts Inter + Geist Mono
  and exposes `--font-inter` / `--font-geist-mono`; the token layer keeps a
  system fallback stack so tests, Storybook, and plain-CSS consumers still
  render without the app.
- **2026-09-23 (F-01 remake):** no browser in the session ≠ visually
  verified. Ask `@user` to open the page and report back (light/dark,
  focus order, what looks off) — the user has the real rendering and their
  feedback is faster and safer than more AI inference. Never write
  "visually verified" without a browser or a human.

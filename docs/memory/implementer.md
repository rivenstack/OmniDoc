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
- **2026-09-23 (F-02):** `shadcn add` pulls `registryDependencies` and
  **overwrites** already-customized primitives (`button`, `input`,
  `separator`, `skeleton`, `textarea`, `input-group`). Back them up (or
  `git checkout` after) before adding. It also installs its own `cn` npm
  package and writes `from "cn"` — remove that dependency and rewrite the
  imports to the project's `../lib/utils`.
- **2026-09-23 (F-02):** the base-nova `sidebar` needs `--sidebar*` color
  tokens this project does not carry, and `bg-sidebar` would not even
  generate without an `@theme` alias. Since copied-in components are
  project-owned, adapt its classes to existing semantic roles
  (`bg-background`/`text-foreground`/`border-border`/`bg-muted`/`ring-ring`)
  and set the width via the existing layout tokens — do **not** edit
  `tokens.css`.
- **2026-09-23 (F-02):** upstream v4 components use physical utilities
  (`pl-`/`pr-`/`ml-`/`mr-`, `text-left`), which fails F-01's source-scan
  RTL-readiness test. Normalize the whole copied-in tier to logical
  (`ps/pe/ms/me`, `text-start/end`) as part of the copy-in.
- **2026-09-23 (F-02):** `@nx/enforce-module-boundaries` rejects
  `@omnidoc/ui/...` self-imports inside `packages/ui`; use relative imports
  (`./dialog`, `../hooks/use-mobile`) even though the package alias resolves.
- **2026-09-23 (F-02):** jsdom needs more than `matchMedia` to render
  Base UI overlays: add inert `ResizeObserver` and
  `Element.prototype.scrollIntoView` stubs. `cmdk` (Command) throws without
  them. Empty class methods trip `@typescript-eslint/no-empty-function` —
  put a comment or `return` in the body.
- **2026-09-23 (F-02):** a `SidebarMenuButton` with `tooltip` returns a
  Base UI `Tooltip` wrapper, not the button. Never pass it as another
  trigger's `render` target (`CollapsibleTrigger render={...}`) — the merged
  trigger props land on `Tooltip`, not the button. Use the plain
  (no-`tooltip`) menu button in that position.
- **2026-09-23 (F-02):** the root `pnpm test` also runs `api:test`, which
  needs a running Postgres (Flyway connects at context load). Verify the FE
  lane with `npx nx run-many -t typecheck lint test -p ui web`; an
  `api:test` connection failure is the backend lane / environment, not your
  change.
- **2026-09-23 (F-02 revision):** shadcn v4 overlay motion classes
  (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`) are **no-ops**
  until `tw-animate-css` is imported in the Tailwind entry
  (`packages/ui/src/styles/globals.css`). The base-nova components already
  ship those classes; the dependency was the missing piece.
- **2026-09-23 (F-02 revision):** Base UI `Button`/`IconButton` default to
  `nativeButton: true`; passing `render={<Link/>}` warns and strips button
  semantics unless you also pass `nativeButton={false}`. This is separate
  from `useRender` (SidebarMenuButton), which does not warn.
- **2026-09-23 (F-02 revision):** `sidebar-09` is a **double sidebar** — an
  outer `Sidebar collapsible="icon"` with `*:data-[sidebar=sidebar]:flex-row`
  wrapping an always-narrow rail (`w-[calc(var(--sidebar-width-icon)+1px)]!`)
  plus a secondary panel (`flex flex-1`). Collapsing the outer clips the
  panel via `overflow-hidden`; the rail stays. Reproduce the geometry rather
  than hand-rolling a single sidebar.
- **2026-09-23 (F-02 revision):** a compact workspace trigger that hides its
  text with `hidden` also removes the accessible name (the mark is
  `aria-hidden`). Add an explicit `aria-label` in compact mode.
- **2026-09-23 (F-02 revision):** no browser in the session — the user
  reviewed the shell and reported the Base UI warning plus visual issues
  (motion, spacing, collapsed switcher, mobile New note, palette position).
  Treat a user visual review as the verification loop; log each fix.
- **2026-09-23 (sidebar-09 migration):** `@tabler/icons-react` has no
  `IconChevronsUpDown`/`IconChevronsDownUp` at 3.48 — use `IconSelector`
  for the "expand me" affordance (matches the workspace switcher).
- **2026-09-23 (sidebar-09 migration):** a `SidebarInput` used as a palette
  **launcher** must not reopen on focus return: make it `readOnly`, open on
  `onMouseDown` with `preventDefault()` (no focus stolen, no
  close→focus→reopen loop), plus Enter/Space in `onKeyDown`. Do **not** wire
  `onFocus` — dialog focus restoration re-fires it.
- **2026-09-24 (F-03):** Next 16 renamed the file convention:
  `middleware.ts` → **`proxy.ts`** with `export function proxy`. The old name
  still builds but warns. `proxy.ts` sits at the app root, so add it to
  `tsconfig.app.json` `include` or `web:typecheck` silently skips it.
- **2026-09-24 (F-03):** `apps/web` **cannot** import `@omnidoc/mocks`
  (`scope:tooling`; `scope:app` may only depend on `scope:shared`). The FE
  mock-wiring exception is a boundary change —
  `packages/mocks/project.json` tags **and** `eslint.config.mjs` — so it is
  not something a frontend-lane session can grant itself. Verify with
  `npx nx lint web` before planning any fixture import.
- **2026-09-24 (F-03):** layouts receive **no pathname**, so a session
  redirect cannot return the user to the requested route on its own. The
  working pattern is a cookie-less-check redirect in `proxy.ts` (with `next`
  in the URL) plus a request header carrying the path for the stale-session
  case. `safeNextPath` must reject `//host`, absolute URLs and backslashes —
  otherwise sign-in becomes an open redirect.
- **2026-09-24 (F-03):** Spring Security details the FE must respect: the
  session cookie is `JSESSIONID` (httpOnly), CSRF is `spa()` (readable
  `XSRF-TOKEN` + `X-XSRF-TOKEN` header), **POST `/api/v1/session` is
  CSRF-exempt** while `DELETE` is not, and the identity controllers are
  profile-gated on a live DataSource — so a bare API answers **404** on
  sign-in, which must not be reported to the user as a wrong password.
- **2026-09-24 (F-03):** when Next calls the API server-side, relay cookies
  explicitly (`Cookie` upstream, re-issue `Set-Cookie` downstream). Read
  multiple cookies with `headers.getSetCookie()` — never split the
  comma-joined `get("set-cookie")`, since `Expires` contains a comma.
  `secure` must follow the API origin or the browser drops the cookie on
  http localhost.
- **2026-09-24 (F-03):** verifying session UI **without a browser**: build,
  `npx next start -p <spare port>`, run a throwaway stub identity API in
  `/tmp` (never in the repo), and assert with `curl`. Client-component props
  appear in the RSC flight payload with escaped quotes
  (`currentWorkspaceId\":\"…\"`), which makes server-resolved state directly
  assertable from HTML.
- **2026-09-24 (F-03):** `Principal` is `actorId` and nothing else. Rendering
  a name/email means inventing a contract shape — the honest move is to show
  the identifier and let a profile schema be a contract change.
- **2026-09-24 (F-03, sign-in block):** `npx shadcn@latest add <name>` run from
  `packages/ui` works, but its output **always** needs a pass: it emits
  `import { cn } from "cn"` and adds a real `cn` dependency (rewrite the import
  to `../lib/utils`, then `pnpm remove cn`), its focus/error rings are
  half-opacity (raise to full — same 3:1 rule as F-01), and `rounded-[4px]`
  should become `rounded-xs`. Verify `git status` afterwards for unexpected
  `tokens.css` or lockfile churn.
- **2026-09-24 (F-03, sign-in block):** Base UI renders `Checkbox` as
  `<span role="checkbox">` plus a visually-hidden native input. Two
  consequences, both real bugs if missed: (1) upstream `disabled:` utilities
  can never match — style the `data-disabled` attribute instead (the custom
  variant already exists in `tokens.css`); (2) the consumer's `id` lands on the
  **hidden input**, so a `htmlFor`-only label points at an `aria-hidden`
  element and the visible control has no accessible name — use
  `aria-labelledby` pointing at the label's `id`.
- **2026-09-24 (F-03, sign-in block):** a `packages/ui` block that must submit
  to a server action takes the action as a **prop** and uses `useActionState`
  internally. That keeps `packages/ui` free of app imports, gives the pending
  state for free, and still submits as a plain form post before hydration.
  Corollary: a `"use server"` module may only export async functions, so shared
  constants (paths, `safeNextPath`) live in a separate plain module.
- **2026-09-24 (F-03, sign-in block):** a URL-supplied post-login destination
  is attacker-controlled. `safeNextPath` must reject absolute URLs,
  protocol-relative `//host` and backslashes, and it must be applied **twice** —
  in the page (before it reaches the form) and in the action (on submit). The
  form input is a convenience, never the authority.
- **2026-09-24 (F-03, sign-in block):** when a UI package block is testable only
  by rendering, `vi.fn()` with no parameters types `mock.calls[0]` as `[]` —
  pass the function type explicitly
  (`vi.fn<(state: S, form: FormData) => Promise<S>>(…)`) or the destructured
  `FormData` argument fails typecheck. Mock factories referencing outer
  variables need `vi.hoisted`, and stubbing a value for a **loop** needs
  `mockResolvedValue`, not `mockResolvedValueOnce`.
- **2026-09-24 (F-03, sign-in block):** Base UI's `Checkbox` also ships an
  optional indeterminate state that the registry output does **not** wire. It
  is deliberately left out here rather than half-implemented (a half-checked box
  that cannot report `aria-checked="mixed"` is worse than none) — add it with
  the ARIA value when a surface needs tri-state.
- **2026-09-24 (F-03, environment):** **never use `path` (or `status`,
  `commands`, `pipestatus`) as a shell variable name in zsh.** `path` is a tied
  array for `$PATH`, so `path=/inbox` in a loop silently wipes PATH for the rest
  of the session (`command not found: node`, `curl`, `tail`). Recovery is
  `export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"`
  — on this machine `node`, `npx`, `pnpm` and `curl` all live under `/usr/sbin`.
- **2026-09-25 (F-04, foundation):** TipTap 3.31.3 renders under this repo's
  jsdom/Vitest setup, but **only** with `immediatelyRender: false`. The default
  throws on the server, so that flag is required for Next SSR too — set it on
  every `useEditor` call rather than discovering it in the browser.
- **2026-09-25 (F-04):** Zustand v5 keeps actions **inside** state. The store
  handle exposes only `getState`/`setState`/`subscribe`, so `store.dispatch(...)`
  is `undefined` at runtime — `store.getState().dispatch(...)` is the call. The
  failure mode is a `TypeError` in tests, not a type error, when the test's
  store handle is typed loosely.
- **2026-09-25 (F-04):** do not hand-roll a second `fetch` wrapper for a new
  port. `apps/web/app/lib/api/transport.ts` owns origin + cookie/CSRF relay +
  timeout and returns `null` on transport failure; each port maps that onto its
  own `unavailable`. The F-03 identity tests passed unchanged after the
  extraction, which is the cheap proof the refactor was behaviour-preserving.
- **2026-09-25 (F-04):** save status must be derived from revision counters, not
  a boolean `dirty` flag. A save captures the revision it sends; if the user
  types while it is in flight, the counter moves past `savedRevision` and the
  badge stops claiming `saved`. A boolean cannot express that without a race,
  and the race is exactly how an editor starts lying about persistence.
- **2026-09-25 (environment):** `next build` rewrites
  `apps/web/next-env.d.ts` to import from `.next/types/...`; `next dev` writes
  the `.next/dev/types/...` form back. The repo tracks the **dev** variant, so
  after running a build, `git checkout HEAD -- apps/web/next-env.d.ts` before
  committing or the diff carries pure churn.
- **2026-09-25 (F-04, silent CSS failure — important):** Tailwind v4 source
  detection roots at the consuming app and ignores `node_modules`, so
  `packages/ui/src/styles/globals.css` registers every directory of component
  source with `@source`. **A new directory under `packages/ui/src` produces no
  CSS at all until it is registered.** Symptoms: utilities used only in the new
  directory compile to nothing (`min-h-[50vh]` absent from the stylesheet,
  computed `min-height: 0px`) while the component still renders and typechecks
  and its unit tests still pass, because jsdom does not apply the app CSS.
  Nothing fails until you look at the page. Adding `@source "../capture"` (plus
  the matching `@source not` test exclusions) fixed it. Always check a new
  `packages/ui/src/<dir>` against this file.
- **2026-09-25 (F-04):** TipTap's `editorProps.attributes.class` **replaces**
  the editor view's default class instead of adding to it. Setting
  `class: "od-capture-body"` silently drops `ProseMirror`, which removes the
  editor's base styles and breaks every `[&_.ProseMirror]:…` rule. Write
  `class: "ProseMirror od-capture-body"`.
- **2026-09-25 (F-04, a11y pattern):** a visible badge and a polite live region
  carrying the same words ("Saving…") is read twice by AT. Make the visible one
  `aria-hidden="true"` and let the status region own the exposed text. In tests,
  `getByText` still matches both (it ignores `aria-hidden`), so assert on
  `getByRole("status")` for the announcement and query the badge by DOM.
- **2026-09-25 (F-04):** hiding a focusable `<input type="file">` behind a
  styled `<label>` leaves keyboard focus invisible unless the input is a `peer`
  and the label mirrors the ring
  (`peer-focus-visible:ring-3 peer-focus-visible:ring-ring`). Keep the input in
  the DOM with `sr-only peer` — never `display: none`.
- **2026-09-25 (browser verification):** a Playwright click in a **backgrounded**
  tab can time out with "waiting for element to be visible, enabled and stable"
  even though the element resolved. Dispatch the click inside
  `page.evaluate(el => el.click())` when driving a second tab for a
  two-session test.
- **2026-09-25 (shell layout):** `MobileTabBar` is `position: fixed`, so it is
  out of flow and **nothing reserves room for it**. Any page whose content
  reaches the viewport bottom on `< md` has its last element hidden underneath.
  The reserve lives on `SidebarInset` in `apps/web/app/(app)/shell.tsx` and its
  value comes from `MOBILE_TAB_BAR_CLEARANCE_CLASS` in
  `packages/ui/src/shell/mobile-tab-bar.tsx`, beside the row height it derives
  from (56px row + 1px `border-t` + `env(safe-area-inset-bottom)`), so the two
  cannot drift. Symptom to recognise: "the last control on the page is cut off
  on mobile" is never a page bug — check the shell first.
- **2026-09-25 (Base UI / primitives):** `Separator orientation="vertical"` emits
  `data-vertical:self-stretch`, and `align-self` **overrides the parent's
  `items-center`** for that child. If you also set an explicit height, stretch
  cannot apply and the rule drops to the cross-axis start — it looks glued to the
  top. Do not fight it with `self-center` (equal specificity, order-dependent):
  drop the height and use symmetric margin so `stretch` yields a centred rule.

---
handoff_id: H-2026-09-20-P1-B03
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "B-03"
lane: backend
human_owner: back-end-programmer
from: implementer
to: implementer
created: 2026-09-20
completed: 2026-09-20
---

# B-03 — Identity adapter (Spring Security sessions)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-03 exactly. Implement Spring Security HTTP-only session cookies + first-party membership against the B-02 schema. Do not implement B-04 notes HTTP, S-03 mocks, or production AI. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `B-*` only (this handoff = B-03).

Wire the ADR-0005 identity adapter: Spring Security HTTP-only session
cookies, CSRF spa() as required by S-02, and server-authoritative
workspace membership resolution. Client `workspace_id` is a **selector**
only (`architecture.md` §2). Year-1 SSO is not required. Better Auth is
**not** the Java implementation.

B-02 persistence + RLS is **completed** and archived — build on
`omnidoc_app` + `TenantRlsSession` + membership tables.

## Required Reading

1. `context.md` (read-only)
2. `architecture.md` §2 (tenancy/identity), §5.7 (identity port), §10
3. `AGENTS.md`
4. `docs/planning/implementation-tracks.md` B-03 row
5. ADR-0005 (`accepted`) — Spring Security sessions; first-party membership
6. ADR-0001 §6 identity **port** (library superseded by ADR-0005)
7. S-02 OpenAPI identity/session/workspace paths —
   `docs/api/openapi.yaml` (consume; do not fork)
8. Archived B-02 —
   `docs/handoffs/archive/H-2026-09-20-P1-B02-commander-implementer.md`
9. Archived B-01 identity port + `IdentityPort` / `IdentityModels`
10. `docs/memory/implementer.md`
11. This handoff

## Inputs / Evidence

- B-02: Compose Postgres, Flyway V1/V2, RLS, `TenantRlsSession`, roles
  `omnidoc_migrator` / `omnidoc_app`, GUC `app.current_tenant_id`
- S-02: `/sessions`, workspaces list/invite, CSRF header contracts
- B-01: `IdentityPort` Java interfaces (implement behind adapters)

## Allowed Write Paths

- `apps/api/**` (Security config, identity adapter, session/membership
  repositories, tests; Flyway only if B-03 needs additive auth columns)
- `docs/memory/implementer.md` (durable lessons only)
- This backend lane handoff and its archive

## Must Not Touch

- `packages/mocks/**` (S-03)
- `packages/contracts/**`, `docs/api/openapi.yaml`, `docs/api/ask-sse.md`
- `apps/web/**`, `packages/ui/**`
- `context.md`, `architecture.md`, `docs/adr/**`
- `docs/handoffs/current.md`
- `docs/handoffs/active/lane-frontend.md`
- Better Auth, Node `apps/api`, production OpenRouter, B-04 notes HTTP

## Out of Scope

- Notes CRUD / version concurrency (B-04)
- Deterministic mock corpus / MSW (S-03)
- Vault / usage / mode adapters (B-10)
- Production AI activation
- SSO / IdP federation (year-1 out)

## Deliverables

1. Spring Security HTTP-only session cookie auth aligned with S-02
   session endpoints (create/get/delete).
2. CSRF spa() (or S-02-documented equivalent) for mutating routes.
3. Server-authoritative membership: resolve tenant + roles from session;
   workspace selector mismatch → 403.
4. Minimal actors/credentials persistence against B-02 tables (additive
   migration only if required).
5. Automated tests: login session, membership bind, IDOR/wrong-workspace
   selector → 403; health remains green without forcing live DB on
   default profile.

## Constraints / Prohibited Decisions

- Do not reintroduce Better Auth or a Node identity service
- Do not treat client `tenant_id` / `workspace_id` as authority
- Do not disable RLS or grant `BYPASSRLS` to `omnidoc_app`
- Do not invent a second OpenAPI SoT from Java
- Do not claim production AI or RTL locale closed

## Acceptance Criteria

- Session create/get/delete match S-02 shapes (springdoc may lag; do not
  rewrite OpenAPI in this handoff unless Commander authorizes)
- Membership resolution is server-side; wrong selector → 403
- `./gradlew test` PASS including new identity tests
- Default (non-`local`) profile still boots health/ArchUnit without live DB
- No changes outside Allowed Write Paths

## Stop / escalate conditions

- Soft-stop: S-02 session/CSRF detail conflict — escalate to Commander
  with evidence; do not silently fork the contract
- Hard-stop: pressure to use Better Auth, disable RLS, or activate live
  OpenRouter — stop and escalate

## Dependencies / Risks

- Depends on: B-02 (done), S-02 (done), U-BE
- Blocks: B-04 (partially), B-10, B-12, F-03+ when identity fixtures needed
- Parallel: F-02 (frontend) — no write overlap
- Risk: CSRF + SPA cookie domain/path for local FE↔API

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- Year-1 SSO not required

## Completion Instructions

1. Record commands and results in this handoff Outcome.
2. Set `status: completed` and archive under
   `docs/handoffs/archive/H-2026-09-20-P1-B03-implementer-implementer.md`
   (or dated equivalent).
3. Same-lane next slice: rewrite this file to **B-04** (notes CRUD) **or**
   soft-stop if S-03 should interleave — do **not** edit `current.md` or
   `lane-frontend.md`.
4. Durable lessons only in `docs/memory/implementer.md`.
5. Do not open Phase Check.

## Outcome

**Completed 2026-09-20.** All B-03 acceptance criteria satisfied. Lane
rewritten to B-04. No Phase Check opened. No writes outside
`apps/api/**`, `docs/memory/implementer.md`, and this lane head + its
archive — `current.md`, `lane-frontend.md`, `docs/api/openapi.yaml`,
`packages/contracts`, `packages/mocks`, `apps/web`, `context.md`,
`architecture.md`, and `docs/adr/**` were not touched.

### Commands and results

```text
cd apps/api && ./gradlew clean build   # BUILD SUCCESSFUL
```

| Suite | Tests | Skipped | Failures | Errors |
|-------|-------|---------|----------|--------|
| `ArchitectureBoundaryTest` | 2 | 0 | 0 | 0 |
| `DomainPortContractTest` | 7 | 0 | 0 | 0 |
| `HealthEndpointTest` (default profile, no DB) | 1 | 0 | 0 | 0 |
| `IdentitySessionIT` (Testcontainers pg18 + pgvector) | 8 | 0 | 0 | 0 |
| `RlsIsolationTest` | 4 | 0 | 0 | 0 |

`IdentitySessionIT` covers: sign-in → cookie session, `GET /api/v1/session`
returning the same `actorId`, wrong password → 401 `unauthenticated`,
no-cookie → 401, workspace list limited to own membership, invite into own
workspace → 201 with the row persisted under the bound tenant, invite into
the other tenant's workspace → 403 `forbidden` with zero rows written to
tenant B, mutating request without `X-XSRF-TOKEN` → 403, and
`DELETE /api/v1/session` with CSRF → 204 with the session invalidated.

### Delivered

1. **`SecurityConfig`** — `csrf.spa()` (XSRF-TOKEN cookie / `X-XSRF-TOKEN`
   header) with `POST /api/v1/session` ignored; HTTP-only `JSESSIONID`
   session; `permitAll` on `/actuator/health/**`, `/error`, and sign-in;
   everything else authenticated; JSON `ErrorBody` 401/403 via
   `AuthenticationEntryPoint` + `AccessDeniedHandler`; credentialed CORS
   from `omnidoc.cors.allowed-origins`; `httpBasic`/`formLogin`/`logout`
   disabled; BCrypt `PasswordEncoder`. The chain holds no DataSource
   dependency, so the default profile still boots.
2. **Flyway `V3__identity_actor_guc_and_invites.sql`** — documents both
   GUCs, adds actor-scoped SELECT policies on `workspace_memberships` and
   `workspaces`, and adds `workspace_invites` with FORCE RLS + tenant
   policy + `omnidoc_app` grants. V2 tenant policies untouched;
   `omnidoc_app` stays `NOBYPASSRLS` and non-owner.
3. **Persistence** — `ActorRls.GUC_NAME = app.current_actor_id`;
   `TenantRlsSession.callWithinActor` / `callWithinActorAndTenant`;
   `LocalPersistenceConfig` registers `TransactionTemplate` and the
   `IdentityPort` JDBC adapter under profile `local`.
4. **`JdbcIdentityAdapter`** — password authenticate (BCrypt, constant-work
   compare on unknown email), workspace list, membership resolution (miss →
   `FORBIDDEN`), and invite gated on `owner`/`admin`. Credential handle
   convention is the JSON document `{"email","password"}`;
   `SessionHandle` carries the server-resolved actor id (`IdentitySessions`).
5. **HTTP** — `com.omnidoc.api.web.identity` with `SessionController`
   (POST/GET/DELETE), `WorkspaceController` (list + invites),
   OpenAPI-shaped DTOs, `WorkspaceMembershipBinder`, `OmniDocUserDetails`
   (actor id only), and `PortFailure` → HTTP mapping. Package is free of
   Spring AI (ArchUnit green). Controllers, binder, advice and adapter are
   all `@Profile("local")` so the default profile keeps health green.
6. **`application.yml`** — `omnidoc.cors.allowed-origins`, HTTP-only /
   `SameSite=Lax` session cookie.

### Notes for Commander

- OpenAPI was **not** modified. The implementation consumes the S-02
  shapes as-is; no contract conflict was found, so no escalation.
- Identity HTTP requires profile `local` (or any future profile that
  enables JDBC). A hosted profile for I-04 is DevOps-owned.
- Springdoc is still not wired in `apps/api`; `docs/api/openapi.yaml`
  remains the single contract authority.
- F-03 can now be unblocked on identity fixtures at Commander's
  discretion (cross-lane call, not made here).

# OmniDoc HTTP / OpenAPI / SSE handshake

Canonical contract for Phase 1 frontend and backend. Backend authors this
tree; frontend consumes generated TypeScript in `@omnidoc/contracts` and
MSW fixtures (S-03). Java controllers (later) must match these files —
they are not a second authority.

| File | Role |
|------|------|
| [openapi.yaml](./openapi.yaml) | HTTP paths, JSON schemas, error envelope |
| [ask-sse.md](./ask-sse.md) | Ask stream events (`text/event-stream`) |
| [health.md](./health.md) | Existing S-01b actuator probe |
| [local-postgres.md](./local-postgres.md) | Local Compose Postgres 18 + pgvector + Flyway / RLS |

Springdoc in `apps/api` is **not** the SoT until controllers exist and are
proven identical to this document (ADR-0005). Do not generate a competing
spec from Java in S-02.

## Invariants

- Tenant identity comes from the **server session**, never from a
  client-supplied `tenantId` / `orgId` as authority.
- `OmniDoc-Workspace-Id` (and workspace path ids) are **selectors**. The
  API re-binds membership; mismatch → `403` `forbidden`.
- Search and Ask preserve workspace ACL from the bound session.
- Ask outcomes `supported`, `partial`, `no_supported_answer`, `conflict`,
  and `refused_policy` are **HTTP 200 stream successes**, not transport
  errors.
- Runtime mode values are exactly `mock`, `operator_free_tier`, and
  `customer_key`. The server never silently falls back across modes.
- Vault **responses** expose masked metadata only. Plaintext keys are
  write-only on store/rotate and must not appear in any response schema.
- Usage may be `unavailable` (HTTP 200). Do not invent billing or currency.
- Production AI activation remains gated: live modes return
  `mode_forbidden` until that gate closes.

## Auth and CSRF

- Session: HTTP-only cookie (Spring Security default `JSESSIONID` until
  B-03 names it).
- CSRF: readable `XSRF-TOKEN` cookie; unsafe methods send `X-XSRF-TOKEN`
  (Spring Security SPA). `POST /api/v1/session` (login) is exempt.
- Workspace selector header: `OmniDoc-Workspace-Id`.

## Generate and verify TypeScript

From the monorepo root:

```bash
nx run contracts:generate
nx run contracts:typecheck
nx run contracts:test
nx run contracts:lint
```

Equivalent filter form:

```bash
pnpm --filter @omnidoc/contracts run generate
pnpm --filter @omnidoc/contracts run typecheck
pnpm --filter @omnidoc/contracts run test
pnpm --filter @omnidoc/contracts run lint
```

`packages/contracts/src/generated/openapi.ts` is produced from
`openapi.yaml`. Do not hand-edit it. SSE event names are aligned in
`packages/contracts/src/ask-sse.ts` with [ask-sse.md](./ask-sse.md);
payload shapes come from OpenAPI components.

## Out of HTTP scope

These B-01 ports stay off the wire: embedding, vector search, ingestion
`chunkVersion`, runtime-mode `stampOutbound`.

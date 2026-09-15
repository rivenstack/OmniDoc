# OmniDoc — Gemini Attach Snapshot

> **Snapshot for Gemini Chat / AI Studio.**  
> Live authority in the repo: `context.md`, `architecture.md`, `docs/adr/`,
> `docs/handoffs/`, `docs/planning/implementation-tracks.md`.  
> **Refresh this file from those sources before attaching** after any
> material decision or phase change. Do not treat this snapshot as a
> second source of truth.

Snapshot date: **2026-09-15**

---

## Who we are

**RivenStack** — building **OmniDoc** (slug `omni-doc`), a multi-tenant
AI/RAG note and knowledge SaaS: capture notes and documents, chunk and
embed them, search, and ask questions with answers cited to the user’s
own sources.

Portfolio / freelancing credibility product — production quality. **No**
commerce, payments, shipping, or SMS. Primary locale: `en` (LTR). RTL
locale support is deferred (not closed); RTL-readiness discipline still
applies.

Repo folder name `omni-note` is historical — product name is **OmniDoc**.

---

## Full tech stack (accepted)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16.3.5 App Router |
| Editor | TipTap 3.31.3; ProseMirror JSON source of truth |
| FE styling / UI | Tailwind 4.3.3 + shadcn/ui on Base UI |
| FE workspace | Nx 23.2.1, pnpm 12.4.1, Node 24 |
| FE tests | Vitest, Playwright, axe, MSW, Storybook |
| API | **Java 21** + **Spring Boot 4.1.x**, Gradle module `apps/api` beside Nx (**not** Node) |
| Auth | Spring Security HTTP-only session cookies (identity **port** stays; Better Auth library superseded) |
| Persistence | Spring Data JDBC + JdbcTemplate / pgvector-java + Flyway; Log4j2 |
| Database | PostgreSQL 18; shared schema + app scope + RLS defense-in-depth |
| Vectors | pgvector in Postgres |
| AI posture | Mocks first; OpenRouter operator free-tier gateway later; customer BYOK v1; dual-mode; usage port; no Assistants/`vector_stores` SoT |
| Hosting class | AWS Free-plan (EC2 and/or ECS + RDS Postgres + pgvector); 6-month window; VPS only if AWS cannot cover |
| Java boundaries | ArchUnit (Nx tags do not enforce Java imports) |
| Python | Not Phase 1 |

---

## Architecture overview

Experience-first layering:

```text
Customer Experience Layer (UI)
        ↓  project-owned ports / application APIs only
Application / Domain orchestration
        ↓
Mock / deterministic adapters  →  Future production adapters
        ↓
External providers (embedding, LLM, vector, storage, IdP, …)
```

Invariants:

- UI never calls embedding, LLM, vector, or object-storage providers directly
- Tenant isolation must hold at **retrieval time**; cross-tenant leakage is a security failure
- Tenant identity comes from the server session; client `tenantId` is a selector, not authority
- Frontend ↔ backend handshake is HTTP / OpenAPI / SSE — not shared Java/TS domain packages
- Production AI activation and RTL locale remain gated / deferred

---

## Key conventions

- Prefer small, reviewable, production-ready changes
- Ports-first; extension-first when evidence shows fit
- No secrets in the repo
- Logical CSS; locale-driven `lang`/`dir`; accessibility is a release gate
- FE does not import Spring AI or Java domain types
- Do **not** scaffold a Node `apps/api`
- Agent workflow: one primary owner per handoff; persist assignments in Markdown handoffs

Shared agent bootstrap in-repo (for Cursor/Codex/Copilot): `.agent/COMMANDER.md`
and `.agent/CONVENTIONS.md`. Host adapters stay thin and point at canonical docs.

---

## Current status (as of snapshot date)

**Phase:** Design close-out (D-01) + Phase 1 scaffolds (S-01a / S-01b)

**Done:**

- Phase 0 complete (verification PASS)
- Backend Stack Close-out complete; ADR-0005 `accepted` (2026-09-15)
- ADR-0001 §1–§5, §7; ADR-0002; ADR-0003; ADR-0004 accepted
- Two-developer track model (frontend / backend)

**In progress / ready:**

| Task | Owner | Notes |
|------|-------|-------|
| D-01 Visual system + journey UI specs | `/designer` | `docs/handoffs/current.md` |
| S-01a FE Nx + boundary CI | `/implementer` | No Node `apps/api` |
| S-01b Java API scaffold | `/implementer` | JVM Gradle `apps/api` |

**Not started / gated:**

- Application scaffolds not on disk yet
- Production AI / live OpenRouter not authorized
- AWS hosted deploy (DevOps I-*) unassigned
- F-01 waits on D-01 + S-01a; B-01 waits on S-01b

---

## How Gemini should help

1. Be **direct** and concrete; prefer production-ready suggestions that fit the stack above
2. **Follow our stack** — Next.js FE + Java/Spring Boot API; never recommend a Node API as the system of record
3. Prefer **mocks / ports** over live provider wiring until CX gates close
4. Do **not invent** features, vendors, or decisions that are not in this snapshot or that contradict accepted ADRs
5. Respect security: tenant isolation, no secrets, no client-trusted tenant authority
6. Prefer small, implementable steps over large speculative redesigns
7. When advising on “what’s next,” assume D-01 / S-01a / S-01b are the live priorities unless told otherwise
8. If the user asks for something that reopens an accepted ADR or production AI early, flag the gate instead of complying silently

When working against the full repo (not this attach), agents should read
`context.md` first — this file may lag.

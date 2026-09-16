---
handoff_id: H-2026-09-16-P1-B01
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "B-01"
lane: backend
human_owner: back-end-programmer
from: commander
to: implementer
created: 2026-09-16
---

# B-01 — Domain port interfaces (Java)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-backend.md and execute B-01 exactly. Add Java port interfaces for architecture.md §5.1–§5.11 inside apps/api. No production adapters. Do not touch apps/web or packages/ui. Do not overwrite docs/handoffs/current.md or lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `backend`. **Human:** back-end
programmer. **allowed_task_classes:** `B-*` plus backend-authored
`S-02` / `S-03` (this handoff = B-01 only).

Create language-native **Java** port interfaces for
`architecture.md` §5.1–§5.11 **inside** `apps/api` (ADR-0005). Align
naming toward upcoming S-02 OpenAPI. **No** production adapters. **Not**
TypeScript `packages/domain` as backend SoT.

S-01b is **closed**. B-01 does **not** wait on D-01 or F-01.

## Required Reading

1. `context.md` (read-only)
2. `docs/planning/implementation-tracks.md` (B-01 row)
3. `architecture.md` §5.1–§5.11 (ports)
4. `AGENTS.md`
5. ADR-0005 (`accepted`), ADR-0001 §3–§5 / §6 identity **port**,
   ADR-0004, ADR-0002 polyglot layout
6. Existing `apps/api` scaffold (S-01b)
7. `docs/memory/implementer.md`
8. This handoff

## Inputs / Evidence

- JVM scaffold: Gradle + Spring Boot 4.1.x health + ArchUnit (S-01b)
- Ports are provider-neutral contracts; Spring AI adapters stay dark
- Identity: Spring Security sessions class (ADR-0005) — not Better Auth

## Allowed Write Paths

- `apps/api/**` (domain/application port packages; tests; ArchUnit stays
  green)
- `docs/memory/implementer.md` (durable lessons only)
- This file: status, Outcome; archive + rewrite rules in Completion

**Must not touch:** `apps/web/**`, `packages/ui/**`, `docs/design/**`,
`docs/frontend/**`, visual tokens, `docs/adr/**`,
`docs/handoffs/current.md`, `docs/handoffs/active/lane-frontend.md`,
`context.md`, `architecture.md`

## Out of scope

- OpenAPI / SSE file authorship (**S-02** — next same-lane handoff)
- Flyway schema + Compose Postgres (**B-02**)
- Production OpenRouter / Spring AI live clients
- FE packages, journey UI, design tokens
- Better Auth library

## Deliverables

1. Java port interfaces covering §5.1–§5.11 surfaces inside `apps/api`
   (notes, ingestion, embedding, vector, search, answer, identity,
   export, vault metadata, usage, runtime mode).
2. Naming ready to align with upcoming S-02 OpenAPI (no dual authority).
3. ArchUnit + module tests green; health endpoint still up.
4. No production adapter implementations.
5. Outcome on this handoff.

## Constraints / Prohibited Decisions

- Do not make TypeScript `packages/domain` the backend SoT
- Do not create a Node `apps/api`
- Do not enable production AI / OpenRouter
- Do not implement full Flyway schema here (B-02)
- Do not author the OpenAPI file here (S-02 next)
- Do not touch FE write paths

## Acceptance Criteria

- Ports compile and map 1:1 to `architecture.md` §5.1–§5.11
- No production adapters; no provider SDK live calls
- ArchUnit baseline green; health still serves
- No FE package ownership; no Better Auth

## Directionality / accessibility checks

- N/A for pure Java ports — do not claim UI directionality work

## Stop / escalate conditions

- **Soft-stop:** None inside B-01. After B-01, the **next authorized
  same-lane handoff is S-02** (preferred before deep B-03+ so FE is not
  parked after F-01), then **B-02**. If a later slice needs FE UI
  decisions, soft-stop with `waiting on F-<ID>`.
- **Hard-stop:** write-path collision with frontend; pressure to reopen
  ADR-0005 / Node API; production AI activation; inventing a second
  contract authority outside upcoming S-02.

## Dependencies / Risks

- Depends on: S-01b (closed)
- Unblocks: S-02 authoring clarity; B-03+ eventually need S-02
- Parallel: F-01 on frontend — no mutual dependency
- Risk: drifting port names away from OpenAPI — mitigate by S-02 next

## Gates

- Production AI activation remains gated
- RTL locale remains deferred (FE concern)
- DevOps I-* unassigned — do not stall on AWS

## Completion Instructions

1. Implement B-01 deliverables inside Allowed Write Paths.
2. Append Outcome; set this file `status: completed`.
3. Archive a copy to
   `docs/handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md`.
4. **Rewrite this same path** (`lane-backend.md`) as the next handoff
   **S-02** (Canonical HTTP / OpenAPI / SSE contracts) with
   `status: ready`, unless Commander has already opened it. Allowed
   Write Paths for S-02 must include `docs/api/**` and
   `packages/contracts/**` per tracks — draft from
   `docs/planning/implementation-tracks.md` S-02 row; keep
   `human_owner: back-end-programmer` and `lane: backend`.
5. If unable to author a complete S-02 handoff, set Outcome
   `ready for Commander to open S-02` and leave this file completed
   without opening F-02 or FE work.
6. Durable lessons only in `docs/memory/implementer.md`.
7. Do **not** overwrite `lane-frontend.md` or put work into `current.md`.

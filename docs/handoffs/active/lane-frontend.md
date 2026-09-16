---
handoff_id: H-2026-09-16-P1-F01
affinity: implementation
track: parallel
status: ready
phase: "1"
task: "F-01"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-09-16
---

# F-01 — Design tokens + shadcn primitives

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-01 exactly. Map D-01 tokens into packages/ui. Do not open F-02. Do not touch apps/api. Do not activate production AI. Do not overwrite docs/handoffs/current.md or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-*` only (this handoff = F-01).

Map D-01 design tokens into `packages/ui` (Tailwind 4 + shadcn/ui on
Base UI per ADR-0003). Establish dark mode via `next-themes` and Base UI
`Direction` as the single direction source. Refresh stale auth wording in
`docs/frontend/README.md` (ADR-0005 Spring sessions — not Better Auth).

D-01 is **accepted**. S-01a is **closed**. Do not invent tokens absent
from `docs/design/foundations/tokens.md`.

## Required Reading

1. `context.md` (read-only)
2. `docs/planning/implementation-tracks.md` (F-01 row; do not edit status
   tables beyond what Completion Instructions allow)
3. `architecture.md` §8 locale/direction
4. `AGENTS.md`
5. ADR-0001 §1–§5/§7, ADR-0002 (FE graph), ADR-0003, ADR-0004 (chrome only)
6. `docs/design/foundations/tokens.md`
7. `docs/design/components/inventory.md` (names + states — copy-in guide)
8. `docs/design/accessibility/a11y-and-rtl-readiness.md`
9. `docs/frontend/README.md`
10. This handoff

## Inputs / Evidence

- Design package: `docs/design/**` (Commander-accepted 2026-09-16)
- Scaffold: `apps/web`, `packages/ui|contracts|mocks` from S-01a
- Auth SoT: Spring Security sessions (ADR-0005); identity **port** only
  in the client

## Allowed Write Paths

- `packages/ui/**`
- `apps/web/**` only as needed for token / theme / Direction wiring stubs
- `docs/frontend/README.md` (auth wording refresh)
- `docs/memory/implementer.md` (durable lessons only)
- This file: status, Outcome; archive + rewrite rules in Completion

**Must not touch:** `apps/api/**`, `docs/api/**`, `docs/adr/**`,
`docs/design/**` (consume only), `packages/mocks` corpus authorship,
`packages/contracts` OpenAPI authorship, `docs/handoffs/current.md`,
`docs/handoffs/active/lane-backend.md`, `context.md`, `architecture.md`

## Out of scope

- Journey pages / app shell IA (F-02+)
- OpenAPI / SSE contracts (S-02 — backend)
- Mock corpus production (`packages/mocks` — backend)
- Production AI / provider SDKs
- AWS / DevOps I-*

## Deliverables

1. Token mapping in `packages/ui` aligned to
   `docs/design/foundations/tokens.md` (color/type/spacing/elevation/
   radius/motion; light + dark).
2. shadcn/Base UI primitives copy-in for inventory foundations without
   inventing IA.
3. `next-themes` dark mode wiring; Base UI `Direction` as single
   direction source; `lang`/`dir` preserved for `en` LTR.
4. Logical CSS only (except true exceptions); `bdi` hooks where
   identifiers will land.
5. `docs/frontend/README.md` auth wording updated to ADR-0005 sessions /
   identity port (no Better Auth library).
6. Outcome on this handoff.

## Constraints / Prohibited Decisions

- Do not invent tokens or components not in D-01 inventory
- Do not import provider SDKs into `apps/web` or `packages/ui`
- Do not claim RTL locale support
- Do not start F-02 in this handoff
- Do not author OpenAPI or Java ports

## Acceptance Criteria

- Tokens match `docs/design/foundations/tokens.md`
- Inventory foundation primitives are copy-in ready without inventing IA
- LTR-now + logical CSS + single `lang`/`dir` source preserved
- No provider SDK; no `apps/api` writes
- Auth docs no longer claim Better Auth as the implementation library
- Scaffold tests / typecheck for touched FE packages stay green

## Directionality / accessibility checks

- Primary locale `en`; single `lang`/`dir` source
- Logical CSS; Base UI `Direction` only
- Visible focus / contrast hooks not regressing scaffold
- `prefers-reduced-motion` respected for any motion tokens wired

## Stop / escalate conditions

- **Soft-stop:** After F-01 completes, do **not** open F-02 until
  Commander marks **S-02** ready on the backend lane / index. Set this
  file `status: blocked` with Outcome `waiting on S-02` if rewriting to
  F-02 is attempted early — prefer leaving F-01 completed and waiting
  for Commander to open F-02.
- **Hard-stop:** write-path collision with backend; pressure to reopen
  ADRs; production AI activation; claiming RTL locale shipped; inventing
  tokens not in D-01.

## Dependencies / Risks

- Depends on: D-01 (accepted), S-01a (closed)
- Blocks: F-02+ (also need S-02)
- Parallel: B-01 on backend — no mutual dependency
- Risk: inventing a second fixture authority — forbidden

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- UT-* remain unrun

## Completion Instructions

1. Implement F-01 deliverables inside Allowed Write Paths.
2. Append Outcome; set this file `status: completed`.
3. Archive a copy to
   `docs/handoffs/archive/H-2026-09-16-P1-F01-commander-implementer.md`
   (immutable).
4. **Do not** rewrite this path to F-02. Soft-stop: notify that the lane
   waits on **S-02**. Commander opens F-02 on `lane-frontend.md` when
   S-02 is ready.
5. Durable lessons only in `docs/memory/implementer.md`.
6. Do **not** update `context.md` or `current.md` unless Commander
   authorizes — prefer Outcome here for Commander integration.

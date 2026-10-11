---
handoff_id: H-2026-09-16-P1-DUAL
affinity: coordination
track: main
status: ready
phase: "1"
task: "dual-lane-index"
lane: shared
human_owner: unassigned
from: commander
to: commander
created: 2026-09-16
updated: 2026-10-11
---

# Phase 1 — Dual-lane integration index

## Start Command

```text
/commander Read docs/handoffs/current.md and the live lane heads under docs/handoffs/active/. Coordinate cross-lane dependencies only. Do not execute B-06d, B-07, or B-08 implementation yourself.
```

## Objective

Owner: `/commander`. This file is the **integration board**, not an
implementer work assignment.

D-01, S-01a, S-01b, B-01, F-01, F-02, F-02a, F-03, F-04, S-02, B-02,
B-03, B-04, B-04c Commander eval, B-04c Implementer closeout, **S-03**,
**B-05a** (Researcher + Architect), **B-05b**, **B-05c**, and **B-06** are
**closed and archived**. Two
humans own parallel lanes:

| Human | Lane head | Live task |
|-------|-----------|-----------|
| Front-end programmer | [`active/lane-frontend.md`](active/lane-frontend.md) | **F-14 completed** per live head; next assignment awaits Commander sequencing |
| Back-end programmer | [`active/lane-backend.md`](active/lane-backend.md) | **B-06d Implementer ready** (local S-03 AvalAI v4/1024 probe) |

Commander keeps this index accurate, unblocks cross-lane deps, and does
not serialize FE behind BE (or vice versa) when dependencies are clear.

## Live lane pointers

- Frontend: `docs/handoffs/active/lane-frontend.md` → **F-14 completed**
  per its Outcome; this index does not assign a new frontend task. F-05
  remains listed with its Collections sub-slice blocked by the contract gap.
- Backend: `docs/handoffs/active/lane-backend.md` → **B-06d Implementer
  ready**. Researcher and Architect are archived; `@user` accepted the
  scoped ADR-0004 pre-CX exception on 2026-10-11. Implementer owns the
  local S-03-only AvalAI `text-embedding-v4` / 1024 probe under
  `architecture.md` §5.3.1. Actual account/terms/payment, key, route and
  charge remain live-smoke checks. B-07 remains listed for resumption
  after B-06d completion or NO-GO.
- Shared / DevOps heads: none live

## Cross-lane dependencies

| Dependency | Status | Effect |
|------------|--------|--------|
| **S-02** | **completed** (archived 2026-09-17) | F-02 unblocked; B-03+/B-04+ unblocked |
| **B-02**–**B-04** | **completed** (archived) | Identity + notes HTTP live |
| **B-04c** Commander eval | **GO** (archived 2026-09-20) | Unblocked Implementer closeout |
| **B-04c** Implementer closeout | **completed** (archived 2026-09-20) | Unblocked S-03 |
| **S-03** (mock corpus, BE) | **completed** (archived 2026-09-20) | Unblocks F-03+ / F-04+ fixtures; unblocked B-05a. FE still needs a narrowly scoped `web → mocks` import exception before wiring MSW in-app |
| **B-05a** | **completed** (Architect accepted 2026-10-06) | Design lock in `architecture.md` §5.2.1; no ADR-0006 |
| **B-05b** | **completed** (Commander-accepted 2026-10-09) | Product code for ingestion/chunking/jobs landed; unblocked B-05c |
| **B-05c** | **completed** (Commander-accepted 2026-10-11) | Verification closeout landed; unblocked B-06 |
| **B-06** | **completed** (Commander-reviewed 2026-10-11) | Deterministic mock embeddings + real pgvector persistence/search landed; unblocked B-07/B-08 retrieval work |
| **B-06d** | **Implementer ready / live** | Architect design is `GO_WITH_CONDITIONS`; `@user` accepted the bounded ADR-0004 exception. Default runtime stays mock-only; local fixture smoke requires actual account/terms/payment and external key checks before a call |
| **B-07** | **listed; superseded before execution** | Preserved unchanged and resumes after B-06d completes or returns NO-GO |
| **Collections contract** | **open** | S-02 has no `collections`/`tags` operation and `Note` has no collection/tag field. F-05's folders/tags sub-slice stays soft-stopped, and F-05 is now back to `listed` — the remediation is unchanged: an `@user`/Commander sequencing decision (contract change). |
| **Markdown serializer** (`BL-22`) | **open** | F-12 ships the sanitized render **consumer**; the canonical JSON→markdown producer that feeds it is unscheduled (B-11 is only the export port). Not a Phase 1 blocker — F-12 is testable against literal markdown strings. Java `pm-md-v1` is corpus SoT for chunking (B-05b); FE bridge remains editor tooling only. |
| I-* DevOps | Unassigned | Do not block Phase 1 mocks |

## Recently archived

- B-06d Architect **completed** (2026-10-11):
  `docs/handoffs/archive/H-2026-10-11-P1-B06D-ARCH-commander-architect.md`;
  consumed Commander return:
  `docs/handoffs/archive/H-2026-10-11-P1-B06D-ARCH-RETURN-architect-commander.md`.
  `@user` accepted the scoped exception; ADR-0004 records the decision.
- B-06d Researcher **completed** (2026-10-11):
  `docs/handoffs/archive/H-2026-10-11-P1-B06D-RES-commander-researcher.md`;
  consumed Commander return:
  `docs/handoffs/archive/H-2026-10-11-P1-B06D-RETURN-researcher-commander.md`.
  The live research report incorporates the later user choice of v4/1024;
  the immutable Researcher handoff still records its earlier preference.
- B-07 Implementer **superseded before execution** (2026-10-11 — `@user`
  sequenced B-06d first; no B-07 implementation occurred):
  `docs/handoffs/archive/H-2026-10-11-P1-B07-superseded-before-execution.md`
- B-06 Implementer **completed and Commander-reviewed** (2026-10-11 —
  independent `./gradlew clean test`: 140 tests, 0 failures/errors/skips):
  `docs/handoffs/archive/H-2026-10-11-P1-B06-commander-implementer.md`;
  consumed return:
  `docs/handoffs/archive/H-2026-10-11-P1-B06-RETURN-implementer-commander.md`
- B-05b Implementer **completed and Commander-accepted** (2026-10-09 —
  independent `./gradlew clean test`: 100 tests, 0 failures/errors/skips):
  `docs/handoffs/archive/H-2026-10-06-P1-B05B-commander-implementer.md`;
  consumed soft-stop:
  `docs/handoffs/archive/H-2026-10-09-P1-B05B-SOFTSTOP-implementer-commander.md`
- B-05c Implementer **completed and Commander-accepted** (2026-10-11 —
  independent `./gradlew clean test`: 136 tests, 0 failures/errors/skips):
  `docs/handoffs/archive/H-2026-10-09-P1-B05C-commander-implementer.md`;
  consumed soft-stop:
  `docs/handoffs/archive/H-2026-10-09-P1-B05C-SOFTSTOP-implementer-commander.md`
- B-05a Architect soft-stop **consumed** (2026-10-06 — Commander
  accepted design; opened B-05b):
  `docs/handoffs/archive/H-2026-10-06-P1-B05A-SOFTSTOP-architect-commander.md`
- B-05a Architect **completed** (2026-10-06 — design lock
  `architecture.md` §5.2.1; no ADR-0006):
  `docs/handoffs/archive/H-2026-10-06-P1-B05A-ARCH-commander-architect.md`
- B-05a Researcher **completed** (2026-10-06 — evidence pack
  `docs/research/technical/16-ingestion-chunking-jobs.md`; no vendor
  selection):
  `docs/handoffs/archive/H-2026-10-06-P1-B05A-commander-researcher.md`
- B-05 implementer handoff **superseded before execution** (2026-10-06 —
  split into B-05a research/design then B-05b implement):
  `docs/handoffs/archive/H-2026-09-20-P1-B05-superseded-split.md`
- F-05 **superseded before execution** (`status: blocked`, 2026-09-27 — F-12
  took the lane head; no F-05 work existed):
  `docs/handoffs/archive/H-2026-09-25-P1-F05-commander-implementer.md`
- F-04 completed (Commander-validated PASS 2026-09-25):
  `docs/handoffs/archive/H-2026-09-24-P1-F04-implementer-implementer.md`
- F-03 completed (2026-09-24):
  `docs/handoffs/archive/H-2026-09-23-P1-F03-user-implementer.md`
- F-02 completed (2026-09-23):
  `docs/handoffs/archive/H-2026-09-23-P1-F02-user-implementer.md`
- S-03 completed (Commander-validated PASS-with-notes):
  `docs/handoffs/archive/H-2026-09-20-P1-S03-commander-implementer.md`
- B-04c Implementer closeout completed:
  `docs/handoffs/archive/H-2026-09-20-P1-B04C-IMPL-commander-implementer.md`
- B-04c Commander eval GO:
  `docs/handoffs/archive/H-2026-09-20-P1-B04C-implementer-commander.md`
- B-04 completed:
  `docs/handoffs/archive/H-2026-09-20-P1-B04-implementer-implementer.md`
- B-03 completed:
  `docs/handoffs/archive/H-2026-09-20-P1-B03-implementer-implementer.md`
- B-02 completed:
  `docs/handoffs/archive/H-2026-09-20-P1-B02-commander-implementer.md`
- S-02 completed:
  `docs/handoffs/archive/H-2026-09-17-P1-S02-implementer-implementer.md`
- F-01 completed:
  `docs/handoffs/archive/H-2026-09-16-P1-F01-commander-implementer.md`
- B-01 completed (Commander-validated 2026-09-17):
  `docs/handoffs/archive/H-2026-09-16-P1-B01-commander-implementer.md`
- D-01 accepted:
  `docs/handoffs/archive/H-2026-09-14-P1-D01-commander-designer.md`
- S-01a completed:
  `docs/handoffs/archive/H-2026-09-15-P1-S01A-commander-implementer.md`
- S-01b completed:
  `docs/handoffs/archive/H-2026-09-15-P1-S01B-commander-implementer.md`

## Commander actions this cycle

1. **F-14 is completed in the frontend lane head**. A next frontend task
   has not been assigned in this cycle. F-05 remains listed; its Collections
   sub-slice is soft-stopped on the missing S-02 contract.
2. **B-06 is reviewed and accepted for lane sequencing**. After initially
   opening B-07, `@user` explicitly sequenced **B-06d before B-07** and supplied
   `https://docs.avalai.ir/fa/`. B-07 was archived as superseded before
   execution; its scope remains listed and unchanged.
3. B-06d Architect design and the accepted ADR-0004 exception were
   reviewed and persisted. **Implementer is the sole backend owner now**
   for the local fixture-only v4/1024 runner. No product live mode or
   production AI activation follows from this exception.
4. Keep every API key outside the repository, handoffs, logs, and chat.
   Implementer verifies actual account/terms/payment, balance and route
   conditions before a bounded opt-in smoke; no paid top-up is authorized.
   B-07 resumes after B-06d completes or returns NO-GO.
5. **Open decision for `@user`:** whether to sequence a **Collections
   contract change** (a new backend track or an S-02 extension) before
   F-06+, since F-05's folders/tags work cannot be built against the frozen
   contract.
6. Each F-* step: structure from `system-ux.md`, references from `@user`,
   integration details per the tracks file.
7. Update `context.md` when lane statuses change.
8. Do not open Phase Check until Phase 1 Build exit criteria in
   `docs/planning/implementation-tracks.md`.

## Allowed Write Paths (Commander only)

- `docs/handoffs/current.md` (this index)
- `docs/handoffs/active/lane-*.md` (open/close/unblock only)
- `docs/handoffs/archive/**`
- `context.md`
- `docs/planning/implementation-tracks.md` (status lines)
- `docs/memory/commander.md`
- Handoff protocol docs under `docs/handoffs/**` and
  `.cursor/skills/handoff-authoring/SKILL.md` when adjusting process

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- UT-* remain unrun
- DevOps I-* unassigned
- **Collections contract** — open; F-05 folders/tags soft-stopped until
  `@user`/Commander sequences the contract change
- **B-06d AvalAI PoC** — Implementer slice is live after `@user` accepted
  the scoped ADR exception. Actual account/terms/payment, balance, key
  and route checks precede any live smoke. The development key stays
  outside the repository; normal API and CI remain offline/mock-only
- **B-07** — listed after being superseded before execution; resumes after
  B-06d completion or NO-GO

## Completion Instructions

This index stays live for the dual-track build. Replace it only when
Commander closes the dual-lane phase or opens a different coordination
mode. Do not assign F-*/B-* work bodies into this file.

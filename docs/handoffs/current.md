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
updated: 2026-10-12
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
**B-05a** (Researcher + Architect), **B-05b**, **B-05c**, **B-06**, the
offline **B-06d** implementation slice, **B-07**, and **F-05** are
**closed and archived**; **F-13/F-14** are reconciled to `completed`, and
the parallel **F-15** governance stream was merged and deferred
(2026-10-11). Two humans own parallel lanes:

| Human | Lane head | Live task |
|-------|-----------|-----------|
| Front-end programmer | [`active/lane-frontend.md`](active/lane-frontend.md) | **F-07 ready** — ask-your-notes: one answer port over the frozen S-02 ask/SSE contract plus the `/ask` screen (composer, streaming answer, passage-level citations, refusal/partial/conflict as success, Stop control), verified against S-03 ask fixtures through the injected port; branch `F07-ask` (opened 2026-10-12 after **F-06** landed on `develop` as `4695774`) |
| Back-end programmer | [`active/lane-backend.md`](active/lane-backend.md) | **B-08 ready**; mock ask adapter + citation assembler is now the live backend slice |

Commander keeps this index accurate, unblocks cross-lane deps, and does
not serialize FE behind BE (or vice versa) when dependencies are clear.

## Live lane pointers

- Frontend: `docs/handoffs/active/lane-frontend.md` → **F-07 ready**
  (ask-your-notes: one answer port over the frozen S-02 ask/SSE contract
  plus the `/ask` screen — composer, streaming answer, passage-level
  citations, refusal/partial/conflict/no-supported-answer as success, Stop
  control — verified against S-03 ask fixtures through the injected port;
  branch `F07-ask`). **F-06 is completed and landed on `develop`**
  (`4695774`; the return head is archived). F-05 is **completed and
  archived**; its collections sub-slice is recorded as `BL-26`
  (`proposed`) in
  [`../planning/feature-backlog.md`](../planning/feature-backlog.md), and
  Inbox/Collections left the shell on 2026-10-12. **F-15's editor
  redesign is deferred** (`listed`, governance G-1…G-4 complete) — do not
  exit this head into editor phases.
- Backend: `docs/handoffs/active/lane-backend.md` → **B-08 ready**.
  Commander accepted B-07, consumed the duplicate sequencing hold, and opened
  the dependency-ready ask/citation backend slice. The live backend work is now
  the mock ask adapter plus citation assembler on the frozen S-02 ask/SSE
  contract; the AvalAI local probe remains implemented and archived while
  actual account/terms/payment, key, route, charge, and live retrieval
  observations stay deferred as a separate operator live-smoke gate.
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
| **B-06d** | **offline implementation completed; operator live smoke deferred** | Local probe landed and was verified offline; the checked-in run stopped `blocked-before-io`. Account/terms/payment, key, route, charge, and live retrieval observations remain a separate operator gate |
| **B-07** | **completed; Commander-validated PASS** | Lexical retrieval, deterministic hybrid fusion, and architecture §7 evidence are accepted; **F-06 live search consumes this** (sequenced 2026-10-11). B-08 is the live backend slice and B-12 remains unopened |
| **F-06 retrieve** | **completed and landed on `develop`** (`4695774`, 2026-10-11) | `/search` port + screen accepted in the lane; return head archived 2026-10-12. Visual/mobile pass still awaits `@user` (no browser in the implementer session) — a separate `@user` check, not a blocker on F-07 |
| **F-07 ask deps** | **met via fixtures** (S-03 ask fixtures completed); **B-08 in parallel** | `/ask` answer port + screen are dependency-ready on fixtures; tests inject through the port (no `web → mocks` import). Live ask smoke depends on the parallel **B-08** endpoint — if B-08 has not landed, the live smoke is a pending cross-lane check (soft-stop), not a hard block |
| **F-08 dual-mode chrome** | **blocked on F-07** | Do not open F-08 until F-07 lands and Commander sequences it |
| **F-15** (editor redesign) | **governance merged; superseded-before-execution** (2026-10-11) | Parallel stream's rewrite of `lane-frontend.md` reconciled into `develop`; F-15 returns to `listed` (G-1…G-4 complete); F-06 takes the head; archive `H-2026-10-10-P1-F15-superseded-before-execution.md` |
| **Collections contract** | **open** | S-02 has no `collections`/`tags` operation and `Note` has no collection/tag field. F-05 is **completed**; its collections sub-slice is `BL-26` (`proposed`, 2026-10-12) with its backend needs named, and Inbox/Collections were removed from the shell the same day. Remediation unchanged: an `@user`/Commander decision on whether to author the contract. |
| **Markdown serializer** (`BL-22`) | **open** | F-12 ships the sanitized render **consumer**; the canonical JSON→markdown producer that feeds it is unscheduled (B-11 is only the export port). Not a Phase 1 blocker — F-12 is testable against literal markdown strings. Java `pm-md-v1` is corpus SoT for chunking (B-05b); FE bridge remains editor tooling only. |
| I-* DevOps | Unassigned | Do not block Phase 1 mocks |

## Recently archived

- F-06 retrieve **return head archived on lane rotation** (2026-10-12 —
  the implementer returned the built, live-verified lane to Commander while
  F-07 was Commander-sequenced; F-06's work is on `develop` as `4695774`):
  `docs/handoffs/archive/H-2026-10-11-P1-F06-RETURN-implementer-commander.md`.
  F-06's implementation ticket: `docs/handoffs/archive/H-2026-10-11-P1-F06-commander-implementer.md`.
- F-15 Obsidian-parity editor redesign **superseded before execution**
  (2026-10-11 — governance G-1…G-4 merged to `develop`; implementation
  phases A–H never began; F-06 took the frontend head):
  `docs/handoffs/archive/H-2026-10-10-P1-F15-superseded-before-execution.md`
- F-05 **completed head archived on lane rotation** (2026-10-11 —
  the implementer left the completed head in place; Commander archived it
  when opening F-06):
  `docs/handoffs/archive/H-2026-10-11-P1-F05-commander-implementer.md`
- F-14 **completed and archived** (2026-10-10 via the F-15 governance
  stream; merged to `develop` 2026-10-11 — the lane head had sat at
  `status: completed` since 2026-10-02):
  `docs/handoffs/archive/H-2026-10-02-P1-F14-commander-implementer.md`
- B-07 Implementer **completed and Commander-validated PASS** (2026-10-11 —
  independent focused search validation passed; independent
  `./gradlew clean test`: **156 tests, 0 failures/errors/skips**):
  `docs/handoffs/archive/H-2026-10-11-P1-B07-REOPEN-commander-implementer.md`;
  consumed return:
  `docs/handoffs/archive/H-2026-10-11-P1-B07-RETURN-implementer-commander.md`.
  Backend lane advanced after Commander sequencing; B-08 is now live.

- B-07 post-pass Commander holds **consumed and archived** (2026-10-11):
  `docs/handoffs/archive/H-2026-10-11-P1-B07-HOLD-commander-commander.md`;
  refreshed hold:
  `docs/handoffs/archive/H-2026-10-11-P1-B07-HOLD-REFRESH-commander-commander.md`.
  Duplicate evaluation is closed; the backend lane now points at B-08.

- B-06d Implementer **completed offline; Commander consumed return and reopened
  B-07** (2026-10-11):
  `docs/handoffs/archive/H-2026-10-11-P1-B06D-commander-implementer.md`;
  consumed return:
  `docs/handoffs/archive/H-2026-10-11-P1-B06D-RETURN-implementer-commander.md`.
  The checked-in probe remained `blocked-before-io`, so the live smoke gate is
  preserved separately and does not keep the backend lane idle.

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

1. **F-07 (Ask UI) is the live frontend ticket** (opened 2026-10-12 on
   branch `F07-ask`, after **F-06** landed on `develop` as `4695774`). Scope:
   one answer port over the frozen S-02 ask/SSE contract plus the `/ask`
   screen — composer, streaming answer, passage-level citations,
   refusal/partial/conflict/`no_supported_answer` as **success**, and a Stop
   control. Dependency-ready: **S-03** ask fixtures are completed, and
   **B-08** (the mock ask adapter + citation assembler) is the parallel
   backend slice. The lane does **not** wait on B-08 to start — tests inject
   the port — but the live-against-local-API smoke is a pending cross-lane
   check if B-08 has not landed. The **Collections** (folders/tags)
   sub-slice is **not scheduled** — it is `BL-26` (`proposed`, 2026-10-12)
   with its backend needs named, and Inbox/Collections were removed from the
   shell the same day.
2. **F-15 (Obsidian-parity editor redesign) is reconciled and deferred.**
   Governance G-1…G-4 (editor pins, wikilink deferral, mode-contract sync,
   F-13/F-14 reconciliation) merged to `develop`; the ready handoff was
   archived **superseded before execution** (no F-15 code exists); F-15
   returns to `listed` with its plan preserved. Do not execute editor
   phases from the F-06 head.
3. **B-07 is accepted** (unchanged) and **B-08 is the live backend slice**
   (opened 2026-10-11): mock ask adapter + citation assembler on the frozen
   S-02 ask/SSE contract.
4. B-06d's actual AvalAI account/terms/payment, balance, external key,
   route, charge, and live retrieval observations remain a separate
   deferred operator gate. No product live mode or production AI activation
   follows from the accepted exception or from the accepted B-07 slice.
5. **Open decision for `@user`:** whether to author and sequence the
   **Collections contract change** (a new backend track or an S-02 extension).
   F-05 is completed; the sub-slice is recorded as `BL-26` (`proposed`) with
   its backend needs, and nothing in the product shows Collections.
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
- **Collections contract** — open; the sub-slice is `BL-26` (`proposed`,
  2026-10-12) in `feature-backlog.md`, and Inbox/Collections are not in the
  shell; `@user` decides whether to author the contract
- **F-15 editor redesign** — deferred (`listed`, governance complete);
  editor phases A–H are not assigned to any live head

## Completion Instructions

This index stays live for the dual-track build. Replace it only when
Commander closes the dual-lane phase or opens a different coordination
mode. Do not assign F-*/B-* work bodies into this file.

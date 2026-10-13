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
updated: 2026-10-13
---

# Phase 1 — Dual-lane integration index

## Start Command

```text
/commander Read docs/handoffs/current.md and the live lane heads under docs/handoffs/active/. Coordinate cross-lane dependencies only. Do not execute F-15 or B-08 implementation yourself.
```

## Objective

Owner: `/commander`. This file is the **integration board**, not an
implementer work assignment.

D-01, S-01a, S-01b, B-01, F-01, F-02, F-02a, F-03, F-04, S-02, B-02,
B-03, B-04, B-04c Commander eval, B-04c Implementer closeout, **S-03**,
**B-05a** (Researcher + Architect), **B-05b**, **B-05c**, **B-06**, the
offline **B-06d** implementation slice, **B-07**, and **F-05** are
**closed and archived**; **F-06** is **completed and merged to `develop`**
(git-verified 2026-10-13); **F-13/F-14** are reconciled to `completed`;
the parallel **F-15** governance stream was merged 2026-10-11, and
**F-15 Rev 2** is now the live frontend slice (`@user`, 2026-10-13). Two
humans own parallel lanes:

| Human | Lane head | Live task |
|-------|-----------|-----------|
| Front-end programmer | [`active/lane-frontend.md`](active/lane-frontend.md) | **F-15 Rev 2 ready** — Obsidian-fidelity editor, branch `F15-obsidian-fidelity-editor`; first slice = Plan Phase 0 ([Rev 2 plan](../plans/2026-10-13_181100-obsidian-fidelity-editor.md)); opened 2026-10-13 per `@user` |
| Back-end programmer | [`active/lane-backend.md`](active/lane-backend.md) | **B-08 ready**; mock ask adapter + citation assembler is now the live backend slice |

Commander keeps this index accurate, unblocks cross-lane deps, and does
not serialize FE behind BE (or vice versa) when dependencies are clear.

## Live lane pointers

- Frontend: `docs/handoffs/active/lane-frontend.md` → **F-15 Rev 2 ready**
  (Obsidian-fidelity editor; branch `F15-obsidian-fidelity-editor`; plan
  [`../plans/2026-10-13_181100-obsidian-fidelity-editor.md`](../plans/2026-10-13_181100-obsidian-fidelity-editor.md)
  supersedes Rev 1; **first slice = Plan Phase 0**; owner `/implementer`;
  opened 2026-10-13 per `@user`). **F-06** is **completed and merged** to
  `develop` (git-verified 2026-10-13 — `F06-retrieve` is contained in
  `develop`; both at `7db930c`); its consumed return head is archived at
  [`archive/H-2026-10-11-P1-F06-RETURN-implementer-commander.md`](archive/H-2026-10-11-P1-F06-RETURN-implementer-commander.md),
  and the **`@user` visual/mobile pass on `/search` stays open**. F-05 is
  completed; Collections stays `BL-26` (`proposed`).
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
| **F-06** (retrieve) | **completed; merged to `develop`** (git-verified 2026-10-13 — branch contained; both at `7db930c`) | Search port + `/search` screen landed; **the `@user` visual/mobile pass on `/search` stays open** (no browser in the implementer session) |
| **F-15 Rev 2** (editor redesign) | **live — opened 2026-10-13** | `@user` adopted the Rev 2 plan (ten decisions locked) and directed it as the immediate frontend slice; branch `F15-obsidian-fidelity-editor`; lane head = F-15 ready; next = Plan Task 0.1; governance G-1…G-4 are inputs. Deferred/gated sub-scopes: images (Task 3.4), math/Mermaid (Task 3.5), tag click/autocomplete (`BL-26`) |
| **`BL-26`** — Collections (folders/tags) contract | **open** | S-02 has no `collections`/`tags` operation and `Note` has no collection/tag field. F-05 is **completed**; its collections sub-slice is `BL-26` (`proposed`, 2026-10-12) with its backend needs named, and Inbox/Collections were removed from the shell the same day. Remediation unchanged: an `@user`/Commander decision. **Also the re-open trigger for F-15 `TAG-002`/`TAG-004`** (tag autocomplete + tag click stay deferred in Task 2.9). |
| **Markdown serializer** (`BL-22`) | **open** | F-12 ships the sanitized render **consumer**; the canonical JSON→markdown producer that feeds it is unscheduled (B-11 is only the export port). Not a Phase 1 blocker — F-12 is testable against literal markdown strings. Java `pm-md-v1` is corpus SoT for chunking (B-05b); FE bridge remains editor tooling only. |
| **F-12 render path** (F-15 Task 2.7) | **coordination note** | F-15 Task 2.7 adds one comment reading-path plugin under `packages/ui/src/markdown/**`; **F-12 stays the render-path authority** — keep the plugin additive; no contract/schema change |
| **Attachment storage** (`EMBED-001…005`, `CLIP-004`) | **deferred** | No attachment storage contract exists; F-15 Task 3.4 records the image/embed designs only. Re-open trigger: attachment / `BL-26`-class storage work |
| **F-07 Ask UI** (branch `F07-ask`) | **built, soft-stopped, not merged** — detected 2026-10-13 | Branch `F07-ask` (local + `origin`) is **2 commits ahead of `develop`** (`1d29050`, `b76a385`): an ask slice built + self-verified 2026-10-12, soft-stopped on B-08 landing + the `@user` visual/mobile pass. F-07 stays **queued** behind F-15 Rev 2 (`@user` 2026-10-13); merging/validating is a Commander/`@user` decision — do not merge or rebase without one |
| I-* DevOps | Unassigned | Do not block Phase 1 mocks |

## Recently archived

- F-06 **return head archived on resequencing** (2026-10-13 — F-15 Rev 2
  took the frontend head; F-06 git-verified **merged to `develop`**):
  `docs/handoffs/archive/H-2026-10-11-P1-F06-RETURN-implementer-commander.md`
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

1. **F-15 Rev 2 is the live frontend ticket** (opened 2026-10-13 on `@user`
   direction; ten decisions locked 2026-10-13). Scope: the Rev 2 plan,
   executed one task per commit with both gates green; first slice = Plan
   Phase 0; branch `F15-obsidian-fidelity-editor`. The earlier
   "deferred — do not enter editor phases" instruction is **superseded by
   this resequencing**.
2. **F-06 (retrieve) is completed and merged** (git-verified 2026-10-13);
   its consumed return head is archived. The **`@user` visual/mobile pass
   on `/search` remains open** and must not be lost. **F-07 stays queued** —
   a built, soft-stopped ask slice exists on the unmerged `F07-ask` branch
   (B-08 + `@user` pass pending); sequencing it is a Commander/`@user`
   decision, not an action to take here.
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
   its backend needs, and nothing in the product shows Collections. This is
   **also the re-open trigger for F-15 `TAG-002`/`TAG-004`**.
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
- **F-15 Rev 2** — live (opened 2026-10-13); images deferred (Task 3.4
  design-only), math/Mermaid gated (Task 3.5), tag click/autocomplete wait
  on `BL-26`, and the Task 8.5 visual pass waits on `@user`

## Completion Instructions

This index stays live for the dual-track build. Replace it only when
Commander closes the dual-lane phase or opens a different coordination
mode. Do not assign F-*/B-* work bodies into this file.

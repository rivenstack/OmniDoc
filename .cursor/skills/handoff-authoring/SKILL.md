---
name: handoff-authoring
description: "Create, archive, or repair an OmniDoc persistent handoff with exactly one owner, explicit write boundaries, acceptance criteria, gates, and a valid next start command."
paths:
  - "docs/handoffs/**/*.md"
---

# Handoff Authoring

Use when creating/replacing/returning a persistent handoff.

## Procedure

1. Read `docs/handoffs/README.md`.
2. Identify:
   - phase/task (Phase 1+ uses track IDs: `D-01`, `S-01`, `F-01`,
     `B-01`, `I-01` from `docs/planning/implementation-tracks.md`);
   - one owner (`to:`);
   - one human `lane:` (`frontend` | `backend` | `shared` | `devops`);
   - `human_owner:` when known (`front-end-programmer` |
     `back-end-programmer` | …);
   - whether this is a **lane work head** or the Commander **index**;
   - source handoff being consumed;
   - required inputs;
   - allowed write paths.
3. Write YAML metadata with exactly one `to:` and exactly one `lane:`.
4. For **lane work heads**, write (or rewrite) the stable path:
   - Frontend → `docs/handoffs/active/lane-frontend.md`
   - Backend → `docs/handoffs/active/lane-backend.md`
   - Shared / DevOps → `lane-shared.md` / `lane-devops.md` only when live
5. Include:
   - Objective (with `allowed_task_classes`);
   - Required Reading;
   - Inputs/Evidence;
   - Allowed Write Paths;
   - Out of scope (other lane);
   - Deliverables;
   - Constraints/Prohibited Decisions;
   - Acceptance Criteria;
   - Stop / escalate conditions;
   - Dependencies/Risks;
   - Gates;
   - Completion Instructions + next iterative handoff rule.
6. Under parallel execution:
   - do not grant `context.md`, `architecture.md`, `MEMORY.md`, or
     `current.md` unless exclusive authority is intentional;
   - avoid overlapping write paths with another active lane;
   - do not overwrite another lane’s `lane-*.md`.
7. Archive the consumed handoff to `archive/` **before** rewriting the
   stable lane path (or before replacing the Commander index).
8. Ensure the final handoff includes an executable one-line Cursor start
   command pointing at the stable lane file.
9. Verify no task has dual ownership.
10. Update `docs/handoffs/current.md` **index** (Commander) with lane
    pointers and cross-lane deps — do not put F-*/B-* work bodies into
    `current.md` during dual-track build.

## Iterative same-lane rule

When a lane completes and the next same-lane slice has **no** unmet
cross-lane dependency, archive → rewrite the **same** `lane-*.md` with
the next track ID. Soft-stop (`status: blocked`, waiting on `<ID>`) when
the next slice needs the other lane or infra; return to Commander.

## Reject / Repair

Repair a handoff if it contains:

- `to:` with multiple agents;
- missing `lane:` on a Phase 1+ implementation handoff;
- vague "research everything" scope;
- acceptance criteria without evidence requirements;
- no write boundary under parallel execution;
- chat-only dependencies;
- permission to silently make unresolved architecture choices;
- authorization to overwrite the other lane’s head;
- missing stop/escalate conditions on a Phase 1+ lane head.

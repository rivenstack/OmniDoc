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
   - phase/task;
   - one owner;
   - main vs parallel track;
   - source handoff being consumed;
   - required inputs;
   - allowed write paths.
3. Write YAML metadata with exactly one `to:`.
4. Include:
   - Objective;
   - Required Reading;
   - Inputs/Evidence;
   - Allowed Write Paths;
   - Deliverables;
   - Constraints/Prohibited Decisions;
   - Acceptance Criteria;
   - Dependencies/Risks;
   - Gates;
   - Completion Instructions.
5. For a parallel handoff:
   - do not grant `context.md`, `architecture.md`, `MEMORY.md`, or `current.md` unless exclusive authority is intentional;
   - avoid overlapping write paths with another active handoff.
6. Archive the consumed handoff before replacing `current.md`.
7. Ensure the final handoff includes an executable one-line Cursor start command.
8. Verify no task has dual ownership.

## Reject / Repair

Repair a handoff if it contains:

- `to:` with multiple agents;
- vague "research everything" scope;
- acceptance criteria without evidence requirements;
- no write boundary under parallel execution;
- chat-only dependencies;
- permission to silently make unresolved architecture choices.

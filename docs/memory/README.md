# Agent Memory Protocol

## Files

- `/MEMORY.md` — shared durable project lessons and user preferences.
- `docs/memory/<agent>.md` — concise role-specific durable lessons.

## Precedence

When information conflicts, use this order:

1. Latest explicit user instruction.
2. Accepted ADRs and approved architecture decisions.
3. `context.md`.
4. Active handoff under `docs/handoffs/`.
5. Current task-specific evidence or source files.
6. Root `MEMORY.md`.
7. Agent-specific memory.
8. Archived handoffs and historical notes.

Memory never overrides newer project state or approved decisions.

## What Belongs in Memory

- Stable user preferences.
- Reusable workflow lessons.
- Recurring pitfalls.
- Durable role-specific checks.
- Agreed terminology.

## What Does Not Belong in Memory

- Current task status.
- Complete handoffs.
- Large research summaries or tables.
- Full ADR content.
- Temporary blockers.
- Chat transcripts or execution logs.

## Maintenance

- Agents update memory only when a lesson is durable and reusable.
- Commander reviews shared memory at phase boundaries.
- Recommended limits: root memory under 150 lines; each agent memory under 100 lines.

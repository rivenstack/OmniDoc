# Parallel Active Handoffs

Commander creates one bounded Markdown file here for each parallel task.
Preferred name: `phase-N-task-<track-id>-<owner>.md` (for example
`phase-1-task-s-01-implementer.md`).

Each **lane** (`frontend`, `backend`, `shared`, `devops`) may have one
live handoff. Two `/implementer` sessions may run when lanes and write
paths differ.

Parallel agents update **only** their assigned file (status + outcome).
They must not overwrite `../current.md` unless the main-track handoff
explicitly authorizes it.

Write paths across active handoffs must not overlap.

Backlog (not an assignment):
[`docs/planning/implementation-tracks.md`](../../planning/implementation-tracks.md).

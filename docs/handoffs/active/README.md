# Parallel Active Handoffs

Commander creates one bounded Markdown file here for each parallel task.
Preferred name: `phase-0-task-0-N-<owner>.md`.

Parallel agents update **only** their assigned file (status + outcome).
They must not overwrite `../current.md` unless the main-track handoff
explicitly authorizes it.

Write paths across active handoffs must not overlap.

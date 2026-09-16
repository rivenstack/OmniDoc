# Active Lane Handoffs

Phase 1+ uses **stable lane heads** — not rotating task filenames.

| Path | Lane | Human |
|------|------|-------|
| [`lane-frontend.md`](lane-frontend.md) | `frontend` | Front-end programmer |
| [`lane-backend.md`](lane-backend.md) | `backend` | Back-end programmer |
| `lane-shared.md` | `shared` | Only when a true shared slice is live |
| `lane-devops.md` | `devops` | Only when I-* is assigned |

Each lane may have **one** live handoff. Two `/implementer` sessions may
run when lanes and Allowed Write Paths differ.

**Start commands**

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute it exactly.
/implementer Read docs/handoffs/active/lane-backend.md and execute it exactly.
```

Lane agents update **only** their assigned file (status + outcome), then
either rewrite the same path with the next same-lane slice or soft-stop
when blocked on the other lane / infra. They must not overwrite
`../current.md` unless the Commander index explicitly authorizes it.

Write paths across active handoffs must not overlap.

Commander integration index: [`../current.md`](../current.md).

Backlog (not an assignment):
[`docs/planning/implementation-tracks.md`](../../planning/implementation-tracks.md).

Legacy `phase-N-task-<id>-<owner>.md` names are archive-only.

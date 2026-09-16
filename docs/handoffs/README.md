# OmniDoc — Persistent Agent Handoff Protocol

Agent handoffs are repository state, not chat-only text. Every agent must
read its assigned handoff file and persist the next handoff before ending
its work.

## Directory layout

```text
docs/handoffs/
├── README.md
├── current.md                         # Commander integration index ONLY
├── active/
│   ├── lane-frontend.md               # ALWAYS the live FE work handoff
│   ├── lane-backend.md                # ALWAYS the live BE work handoff
│   ├── lane-shared.md                 # optional; only when a true shared slice is live
│   └── lane-devops.md                 # optional; I-* when assigned
└── archive/                           # Completed/consumed immutable handoffs
    └── H-YYYY-MM-DD-PN-<ID>-from-to.md
```

During Phase 1 dual-track build, **`current.md` is not a work
assignment** for `/implementer` or `/designer`. It is the Commander
board: phase status, both lane pointers, open cross-lane deps, and the
next Commander action.

The **complete owned backlog** (frontend / backend / shared / devops)
lives in [`docs/planning/implementation-tracks.md`](../planning/implementation-tracks.md).
Live handoffs stay small; that file must stay complete and visible. Do
not treat unopened track IDs as “not planned.”

## Starting a new Cursor session

**Front-end programmer / FE agents** — always:

```text
/<target-agent> Read docs/handoffs/active/lane-frontend.md and execute it exactly.
```

**Back-end programmer / BE agents** — always:

```text
/<target-agent> Read docs/handoffs/active/lane-backend.md and execute it exactly.
```

**Commander** — read the integration index, then the live lane heads:

```text
/commander Read docs/handoffs/current.md and the live lane-*.md files under docs/handoffs/active/. Coordinate cross-lane deps; do not execute F-* or B-* implementation yourself.
```

Canonical role labels use hyphens in prose (for example,
`/ux-researcher`). Where a registered Cursor identifier differs, the
frontmatter and executable command use the registered form. The UX
Researcher is registered as `ux_researcher`, so use
`to: ux_researcher` and `/ux_researcher` in executable commands.

Legacy rotating names (`phase-N-task-<id>-<owner>.md`) may appear in
`archive/` only. Do not create new live heads under those names.

## Required handoff metadata

Every **work** handoff file must contain YAML frontmatter with:

```yaml
handoff_id: H-YYYY-MM-DD-PN-TNN
track: parallel
status: ready | in-progress | completed | blocked
phase: "N"
task: "D-01" | "S-01" | "F-01" | "B-01" | "I-01" | …
lane: frontend | backend | shared | devops
human_owner: front-end-programmer | back-end-programmer | unassigned | …
from: commander | architect | researcher | ux_researcher | designer | implementer | phase-check | user
to: commander | architect | researcher | ux_researcher | designer | implementer | phase-check | user
created: YYYY-MM-DD
```

`lane` is the **human** owner track. `human_owner` names the role
(front-end programmer vs back-end programmer). `to` is the **agent**.
Two `/implementer` sessions may run at once when `lane` values differ
**and** Allowed Write Paths do not overlap.

Phase 1+ `task` values use track IDs from
`docs/planning/implementation-tracks.md` (`D-01`, `S-01`, `F-01`,
`B-01`, `I-01`, …). Historical Phase 0 handoffs keep `"N.N"` numbering.

The body must include:

1. Start Command.
2. Objective (include `allowed_task_classes:` e.g. `F-*` only).
3. Required Reading.
4. Inputs and evidence.
5. Allowed Write Paths (mandatory under parallel execution).
6. Out of scope (explicit other-lane paths).
7. Deliverables and files to update.
8. Constraints and prohibited decisions.
9. Acceptance criteria, including LTR-now / RTL-readiness and
   accessibility checks where relevant.
10. **Stop / escalate conditions** (soft-stop on cross-lane dep; hard-stop
    on write collision, ADR reopen, production AI, RTL-shipped claim).
11. Gates.
12. Completion instructions and **next iterative handoff** rules.

The Commander **index** (`current.md`) uses `to: commander` and may omit
Allowed Write Paths for implementation; it must list both live lane
paths and open cross-lane dependencies.

## Dual-lane lifecycle (Phase 1+)

1. Exactly **one live work handoff per lane** at the stable path
   (`lane-frontend.md`, `lane-backend.md`, …).
2. The assigned agent reads its lane file and confirms `to` matches its
   role.
3. It may change `status` to `in-progress`.
4. It performs only the bounded task inside Allowed Write Paths.
5. On **same-lane** completion when the next slice has no unmet
   cross-lane dependency:
   - Copy the completed handoff to `archive/` (immutable).
   - Rewrite the **same** `lane-*.md` path with the next track ID.
   - Update `context.md` status lines; do not treat `current.md` as the
     work ticket.
6. On **soft-stop** (next slice needs the other lane or infra):
   - Set `status: blocked`; Outcome states `waiting on <ID>`.
   - Do **not** invent the other lane’s work.
   - Return to Commander; Commander unblocks when the dependency lands.
7. On **hard-stop** (write-path collision, ADR reopen pressure,
   production AI activation, claiming RTL locale shipped): stop and
   escalate to Commander immediately.
8. Commander alone opens/closes lane heads across lanes, updates the
   `current.md` index, and marks FE/BE unblocked after cross-lane
   milestones (e.g. S-02 → F-02).
9. Phase Check runs at Build exit / CX — not after every F/B ticket.

A ready handoff superseded before work begins is archived with
`status: blocked` and an outcome stating that it was superseded before
execution.

## Safety rules

- Exactly one target agent per handoff file.
- A handoff written only in chat is invalid.
- Do not delete unresolved user gates when creating a new handoff.
- Do not silently change accepted architecture or evidence classifications
  in a handoff.
- Do not store credentials, private keys, BYOK secrets, or personal data
  in handoff files.
- Parallel handoffs must not share overlapping write paths.
- Do not open a second live handoff in the same `lane` until the current
  one is completed or blocked.
- Do not overwrite another lane’s `lane-*.md`.
- Do not treat `docs/planning/implementation-tracks.md` as a second
  assignment — it is the backlog; only live `lane-*.md` (and any
  authorized shared/devops head) authorize work.
- Lane agents must not overwrite `current.md` unless the index handoff
  explicitly authorizes it (rare).

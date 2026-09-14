# OmniDoc — Persistent Agent Handoff Protocol

Agent handoffs are repository state, not chat-only text. Every agent must read its assigned handoff file and persist the next handoff before ending its work.

## Directory layout

```text
docs/handoffs/
├── README.md
├── current.md                         # Main critical-path handoff
├── active/                            # Parallel task handoffs
│   └── phase-N-task-<id>-<agent>.md
└── archive/                           # Completed/consumed immutable handoffs
    └── H-YYYY-MM-DD-PN-TNN-from-to.md
```

The **complete owned backlog** (frontend / backend / shared / devops)
lives in [`docs/planning/implementation-tracks.md`](../planning/implementation-tracks.md).
Live handoffs stay small; that file must stay complete and visible. Do
not treat unopened track IDs as “not planned.”

## Starting a new Cursor session

For the main critical path, inspect `docs/handoffs/current.md`, then run the command in its **Start Command** section. The stable fallback is:

```text
/<target-agent> Read docs/handoffs/current.md and execute the handoff exactly. Update the required files, context.md, and the next persistent handoff before finishing.
```

Canonical role labels use hyphens in prose (for example,
`/ux-researcher`). Where a registered Cursor identifier differs, the
frontmatter and executable command use the registered form. The UX
Researcher is registered as `ux_researcher`, so use
`to: ux_researcher` and `/ux_researcher` in executable commands.

For a parallel task, use the exact file under `docs/handoffs/active/`:

```text
/<target-agent> Read docs/handoffs/active/<assigned-file>.md and execute it exactly.
```

## Required handoff metadata

Every handoff file must contain YAML frontmatter with:

```yaml
handoff_id: H-YYYY-MM-DD-PN-TNN
track: main | parallel
status: ready | in-progress | completed | blocked
phase: "N"
task: "N.N" | "D-01" | "S-01" | "F-01" | "B-01" | "I-01"
lane: frontend | backend | shared | devops
from: commander | architect | researcher | ux_researcher | designer | implementer | phase-check | user
to: commander | architect | researcher | ux_researcher | designer | implementer | phase-check | user
created: YYYY-MM-DD
```

`lane` is the **human** owner track. `to` is the **agent**. Two
`/implementer` sessions may run at once when `lane` values differ **and**
Allowed Write Paths do not overlap.

Phase 1+ `task` values use track IDs from
`docs/planning/implementation-tracks.md` (`D-01`, `S-01`, `F-01`,
`B-01`, `I-01`, …). Historical Phase 0 handoffs keep `"N.N"` numbering.
Use `"N.N.N"` only for a bounded inserted prerequisite that preserves
accepted historical numbering, such as Task `"0.5.1"`.

`lane: shared` may name a **recommended** human owner in the Objective
(S-01 recommends Backend). Recommendation is not dual ownership — the
handoff still has exactly one `to:`.

The body must include:

1. Start Command.
2. Objective.
3. Required Reading.
4. Inputs and evidence.
5. Allowed Write Paths (mandatory under parallel execution).
6. Deliverables and files to update.
7. Constraints and prohibited decisions.
8. Acceptance criteria, including LTR-now / RTL-readiness and
   accessibility checks where relevant.
9. User or professional-confirmation gates.
10. Completion instructions and next-handoff requirements.

## Main-track lifecycle

1. The assigned agent reads `current.md` and confirms that `to` matches its role.
2. It may change `status` to `in-progress`.
3. It performs only the bounded task.
4. Before replacing `current.md`, it copies the consumed handoff to `archive/`, sets the archived copy to `completed` or `blocked`, and adds an outcome summary.
5. It writes the next complete main-track handoff to `current.md`.
6. It updates `context.md` with a short status summary and the handoff path. Do not duplicate the full handoff in `context.md`.
7. Its final chat response states the result and the next handoff path; the handoff itself must already exist in the repository.

A ready handoff superseded before work begins is archived with
`status: blocked` and an outcome stating that it was superseded before
execution; this records the workflow correction without claiming the
assigned work failed or completed.

## Parallel-track lifecycle

- Commander creates one file per parallel assignment under `active/`.
- Preferred name: `phase-N-task-<track-id>-<owner>.md` (for example
  `phase-1-task-s-01-implementer.md`).
- Each **lane** may have one live handoff at a time (frontend, backend,
  shared, devops). Two developers may each run `/implementer` when lanes
  and write paths differ.
- The assigned agent updates that same file with status and outcome.
- A parallel agent must not overwrite `current.md` unless the main-track handoff explicitly authorizes it.
- When the task is complete, Commander or the assigned agent moves/copies the file to `archive/` and Commander incorporates the result into the main track and updates `docs/planning/implementation-tracks.md` status.

## Safety rules

- Exactly one target agent per handoff file.
- A handoff written only in chat is invalid.
- Do not delete unresolved user gates when creating a new handoff.
- Do not silently change accepted architecture or evidence classifications in a handoff.
- Do not store credentials, private keys, BYOK secrets, or personal data in handoff files.
- Parallel handoffs must not share overlapping write paths.
- Do not open a second live handoff in the same `lane` until the current
  one is completed or blocked.
- Do not treat `docs/planning/implementation-tracks.md` as a second
  assignment — it is the backlog; only `current.md` / `active/` files
  authorize work.

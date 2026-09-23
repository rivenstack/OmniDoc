---
handoff_id: H-2026-09-22-P1-F02
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "F-02"
lane: frontend
human_owner: front-end-programmer
from: user
to: implementer
created: 2026-09-22
---

# F-02 — paused before execution

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and stop. F-02 is paused. Do not build the app shell. Do not follow D-01 layouts, tokens, or the component inventory. Read docs/design/now.md and docs/design/system-ux.md. Do not open F-03. Do not touch apps/api, packages/mocks, packages/contracts, docs/handoffs/current.md, or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** none until this pause is lifted.

F-02 was `ready` and had not been executed. On 2026-09-22 `@user`
superseded it. The D-01 package is historical for visuals. It must not
drive the shell.

Live design authority:

- `docs/design/system-ux.md` — behavior and information that bind the
  API, database, and product invariants. Not layout.
- `docs/design/now.md` — short living plan. Edit it. Do not replace it
  with a spec.

Look is stock shadcn (ADR-0003) until `@user` supplies references and
chooses a design language. That language doc does not exist yet.

## Required Reading

1. `docs/design/now.md`
2. `docs/design/system-ux.md`
3. This file
4. `context.md` (read-only)

Do not treat `docs/design/shell/`, `docs/design/components/inventory.md`,
or `docs/design/foundations/tokens.md` as tickets.

## Inputs / Evidence

- Archived ready handoff (superseded, not executed):
  `docs/handoffs/archive/H-2026-09-19-P1-F02-commander-implementer.md`
- F-01 primitives already in `packages/ui` — not a design language, and
  not a whitelist

## Allowed Write Paths

None for product UI while `status: blocked`.

If `@user` lifts the pause by choosing a slice in `docs/design/now.md`,
Commander rewrites this file before any implementer work. Do not
self-unpause.

## Out of scope

- App shell, nav, workspace switcher, journeys, Storybook expansion
- Token or palette changes
- `apps/api/**`, `docs/api/**`, `packages/mocks/**`, `packages/contracts/**`
- `docs/handoffs/active/lane-backend.md` (B-05 continues)
- Production AI

## Deliverables

None. The pause is the deliverable.

## Constraints / Prohibited Decisions

- Do not implement the archived F-02 start command
- Do not invent a replacement shell "in the spirit of" D-01
- Do not claim a design language has been chosen
- Do not reopen ADRs
- Do not activate production AI or claim RTL locale support

## Acceptance Criteria

- No new shell or journey UI landed under this pause
- `docs/design/now.md` remains the visible plan
- Backend lane untouched

## Stop / escalate conditions

- **This file is the stop.** Waiting on `@user` to choose the next UI
  slice in `docs/design/now.md` (search interaction and MVP shape are
  open there).
- **Hard-stop:** any pressure to build F-02 from the D-01 shell spec,
  write-path collision with backend, ADR reopen, production AI.

## Dependencies / Risks

- Risk: an agent executes the archived F-02 start command. That command
  is marked do-not-run. This file is the live head.
- Backend B-05 does not depend on F-02 and is not blocked by this pause.

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- UT-* remain unrun
- Design language remains unchosen

## Completion Instructions

1. Do not set this file `completed`.
2. Do not rewrite it to F-03.
3. When `@user` chooses the next slice, Commander archives this pause
   and rewrites this path with a small ticket taken from
   `docs/design/now.md` — not from the D-01 inventory.

## Outcome

**Superseded the same day (2026-09-22).** `@user` chose the visible-kit
slice. The live lane head was rewritten to the kit ticket
`H-2026-09-22-P1-F02A-user-implementer.md` (archived completed). The
F-02 product shell remained unbuilt through 2026-09-22. On 2026-09-23
`@user` confirmed the F-01→F-11 sequence and **reopened F-02** under the
new design rules — live head `H-2026-09-23-P1-F02-user-implementer`
(`docs/handoffs/active/lane-frontend.md`).

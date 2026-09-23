---
handoff_id: H-2026-09-22-P1-F02A-user-implementer
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-02a"
lane: frontend
human_owner: front-end-programmer
from: user
to: implementer
created: 2026-09-22
---

# F-02a — Visible UI kit (stock shadcn)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-02a exactly. Build the visible kit per docs/design/now.md: stock shadcn primitives, one page, no app shell, no product screens. Do not follow D-01 layouts, tokens, or the component inventory. Do not open F-02 or F-03. Do not touch apps/api, packages/mocks, packages/contracts, docs/handoffs/current.md, or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-02a` only.

`@user` chose the **visible kit** slice on 2026-09-22
(`docs/design/now.md`): one page of the existing stock shadcn
primitives, so the look can be reviewed before any product screen. The
F-02 product shell stays paused. This ticket is authorization only for
the kit — not a revival of the D-01 shell.

## Required Reading

1. `docs/design/now.md` — the visible plan and the decision
2. `docs/design/system-ux.md` — contracts only; not layout
3. This file
4. `context.md` (read-only)

Do not treat D-01 files (`docs/design/foundations/tokens.md`,
`components/inventory.md`, `shell/`, `journeys/`) as authority.

## Inputs / Evidence

- F-01 primitives in `packages/ui`: Button, IconButton, Input, Textarea,
  Label, Badge, Card family, Separator, Skeleton, Spinner; plus
  DirectionProvider / ThemeProvider
- Pause archive (why the shell is not this ticket):
  `docs/handoffs/archive/H-2026-09-22-P1-F02-user-implementer.md`

## Allowed Write Paths

- `apps/web/app/kit/**` (page + gallery client component)
- `apps/web/app/page.tsx` (stub pointer to `/kit` only)
- `docs/handoffs/active/lane-frontend.md` (status, Outcome)
- `docs/design/now.md` (Current slice + Decisions log rows only)
- `context.md` (F-02/F-02a status lines only)
- `docs/memory/implementer.md` (durable lessons only)

**Must not touch:** `packages/ui/**` source (no new primitives, no token
edits), `apps/web/app/layout.tsx` (locale/direction stays as F-01
landed), `apps/web/app/globals.css`, the other lane's files,
`docs/handoffs/current.md`, `docs/planning/**`, `docs/adr/**`,
`docs/design/system-ux.md` content.

## Out of scope

- App shell, nav, workspace switcher, journeys (F-02 stays paused)
- Storybook install (ADR-0003 pins 10.6.0; remains a bounded gap)
- New `@omnidoc/ui` components; shadcn pieces get copied in when a
  product screen first needs them
- Token or palette changes
- Production AI; RTL locale; AWS

## Deliverables

1. `/kit` route in `apps/web`: a client gallery of the existing
   primitives with all their variants visible (buttons + states, fields,
   badges, card, skeleton, spinner) and a light/dark/system switch.
2. Home stub links to `/kit`; nothing else changes.
3. Outcome here; status rows in `now.md` and `context.md`.

## Constraints / Prohibited Decisions

- No design language invention: stock shadcn look only
- No new tokens; do not extend `tokens.css`
- No component authoring; render existing exports from `@omnidoc/ui`
- No shell structure, landmarks beyond `<main>`, or routing decisions
- Do not claim RTL locale support; do not close any gate

## Acceptance Criteria

- `/kit` renders with zero new dependencies and no `packages/ui` source
  changes
- `apps/web` typecheck green; `packages/ui` typecheck + tests (121) green
- No D-01 layout, width, or motion is reproduced
- Home stub keeps its scaffold identity (`@omnidoc/contracts` import)
- Backend lane and `current.md` untouched

## Stop / escalate conditions

- **Soft-stop:** none expected; the slice is self-contained.
- **Hard-stop:** write-path collision, ADR reopen pressure, production
  AI activation, pressure to build F-02 from D-01.

## Dependencies / Risks

- Depends on: F-01 (completed)
- Blocks: nothing. The next ticket is chosen by `@user` in `now.md`.
- Risk: the theme switch uses `next-themes` directly in `apps/web`;
  keep it as a page-level control, not a new provider.

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- UT-* remain unrun
- Design language remains unchosen (stock shadcn is the stand-in)

## Completion Instructions

1. Complete deliverables inside Allowed Write Paths.
2. Append Outcome; set `status: completed`.
3. Archive to
   `docs/handoffs/archive/H-2026-09-22-P1-F02A-user-implementer.md`
   (immutable). Leave the pause archive untouched.
4. Do **not** rewrite this file to the next ticket. Next slice waits for
   `@user` in `docs/design/now.md`.
5. Durable lessons only in `docs/memory/implementer.md`.

## Outcome

**Completed 2026-09-22.** Visible kit landed:

- `apps/web/app/kit/page.tsx` + `kit/kit-gallery.tsx` — stock primitives
  only, all variants, light/dark/system switch via `next-themes`
- `apps/web/app/page.tsx` — stub now links to `/kit`
- No `packages/ui` source changes; no tokens touched
- `packages/ui`: typecheck green, 121/121 tests pass
- `apps/web`: typecheck green (`tsc --noEmit`), eslint clean,
  production build green (`/` and `/kit` prerendered)
- `/kit` is explicitly not a product screen and not a shell

Next: `@user` reviews `/kit`, supplies references when ready; a design
language later lands as token values, not component rewrites.

---
handoff_id: H-2026-10-11-P1-F05
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-05"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-09-25
updated: 2026-10-11
archived: 2026-10-11
---

# F-05 — Organize (inbox, notes list, honest Collections)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute it exactly. F-05 is completed on this branch; take the next task this head assigns, or stop and ask Commander to sequence one.
```

## Status

**Completed 2026-10-11** on branch `F05-organize` — resumed out of sequence at
`@user` direction (the lane had jumped F-04 → F-12/F-13/F-14; F-05 is
back-filled before F-06+). The archived ticket carrying the original scope,
risks and soft-stop rules is
`docs/handoffs/archive/H-2026-09-25-P1-F05-commander-implementer.md`; this head
records what was actually built and what stayed stopped.

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end programmer.

## What landed

1. **List block set** — `packages/ui/src/organize/`: `NoteList` (real
   `ul`/`li`; rows are links into the capture route; `bdi`-isolated UGC titles
   that truncate without widening ~390px; `Updated <time>` from the contract;
   `Sample` badge only when the server says so; `Load more` / `First page`
   pagination), `NoteListSkeleton` / `NoteListEmpty` / `NoteListUnavailable` /
   `NoteListDenied`, `UnfiledNotice`, `CollectionsUnavailable`. Link components
   are injected (`OrganizeLink`), so `@omnidoc/ui` keeps no `next/link`
   dependency.
2. **Server-first lists** — `apps/web/app/lib/notes/notes-pages.ts` walks the
   server's cursor chain (bounded at 20 pages) and `note-list-loader.ts`
   resolves the workspace server-side; the routes build their hrefs from the
   chain the server vouched for, never from the URL's stale one.
3. **Routes** — `inbox/page.tsx` and `notes/page.tsx` (list + `denied` +
   `unavailable` + empty states), `inbox/loading.tsx`, `notes/loading.tsx`, and
   `collections/page.tsx` stating the contract gap. Navigation is composed in
   `organize-links.tsx` (`NoteRowLink`, `NotePaginationLink` with
   `scroll={false}`).
4. **Tests** — organize blocks (`packages/ui`, 18) and cursor-chain/loader tests
   (`apps/web`, 10).

## Post-completion fix (2026-10-11)

`@user` reported the Inbox rows had **no separators** and read as one compact
block. Cause: the new `packages/ui/src/organize/` directory was never added to
the `@source` list in `packages/ui/src/styles/globals.css`, so Tailwind emitted
none of its utilities (`divide-y`, `divide-border`, `border-y`,
`focus-visible:ring-inset`) — verified against the pre-fix bundle CSS (zero
occurrences) and the rebuilt CSS (rules present). Fixed by registering the
directory; `packages/ui/src/styles/globals.test.ts` now fails when a source
directory that renders classes is unregistered. Re-verified in a real browser at
1280px and 390px (dark). Row density was reviewed with `@user` and **kept as
is** (12px vertical padding, 14px title, 12px meta, 4px gap).

## Soft-stops that remain

- **Collections** — S-02 has no `collections`/`tags` operation and `Note`
  carries no folder/tag field. No client model was forked: the route states the
  gap, and the contract change stays a Commander / `@user` sequencing decision.
- **`web → mocks` import exception** — still unauthorized, so tests inject
  through the notes port; no second fixture authority was created.
- **Inbox and Notes are the same set today** (every note is unfiled).
  `UNFILED_NOTICE` says so on both routes instead of faking a difference.

## Verification

- Gate green with `--skip-nx-cache`: `ui:typecheck/lint/test` (451 tests) and
  `web:typecheck/lint/test/build` (87 tests); `contracts`/`mocks` unaffected
  and green.
- **Known pre-existing flake (recorded, not a defect):** `ui:test` failed twice
  in 18 full-suite runs on `src/shell/login.test.tsx` — *"reports progress once:
  the submit is disabled and the form is busy"* (`aria-busy` still `true` when
  the assertion runs). That test and the block it covers are untouched by F-05;
  it passes 18/18 in isolation over 3 runs, and a 5-run baseline without the
  organize slice did not reproduce it. Same finding as the F-04 verification.
  Also aware: **none of the 18 organize tests failed in any of those runs.**
- Live against the local Java API + Postgres: 25 notes → Inbox page 1 renders
  20 rows + `Load more`; following the server cursor renders 25 rows +
  `First page`; a stale `?cursor=` renders the first page and offers the
  **server's** cursor; after deleting the notes the empty state renders
  (one primary `New note` CTA); `/notes` and `/collections` render as designed.
  The temporary verify actor/workspace/notes were removed afterwards.

## Allowed Write Paths (this slice)

- `packages/ui/src/organize/**`, `packages/ui/src/index.ts`
- `apps/web/app/(app)/inbox/**`, `notes/**`, `collections/**`,
  `organize-links.tsx`
- `apps/web/app/lib/notes/notes-pages.ts`, `note-list-loader.ts`
- `docs/design/now.md`, `context.md`, `docs/frontend/README.md`,
  `docs/memory/implementer.md`

## Next

**No live frontend task is assigned by this head.** F-06 (retrieve) is
dependency-ready per `context.md` (S-02 search + B-07 completed), but sequencing
belongs to Commander. The parallel **F-15** Obsidian-parity editor stream holds
its own rewrite of this lane head on branch `f15-editor-redesign-governance`;
Commander reconciles the two at merge.

## Outcome — archived on lane rotation (Commander, 2026-10-11)

F-05 stands **completed** as verified above; this head carried no further work
and the implementer correctly left the next-slice decision with Commander.
Commander archived this file when rewriting the same lane path for **F-06
(retrieve)** on 2026-10-11, after merging the F-15 governance stream and
reconciling this head's open question (see the F-15 archive
`H-2026-10-10-P1-F15-superseded-before-execution.md` and
`docs/handoffs/current.md`). The original F-05 ticket remains archived at
`H-2026-09-25-P1-F05-commander-implementer.md`.

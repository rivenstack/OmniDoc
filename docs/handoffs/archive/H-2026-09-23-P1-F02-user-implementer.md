---
handoff_id: H-2026-09-23-P1-F02-user-implementer
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-02"
lane: frontend
human_owner: front-end-programmer
from: user
to: implementer
created: 2026-09-23
updated: 2026-09-23
---

# F-02 — App shell + navigation (structure, not pixels)

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-02 exactly. Build the app shell + nav per docs/design/system-ux.md (structure only). For every visual block, ask @user for a reference (link, pasted code, or a prompt — image welcome) before building it. UI details stay open; do not follow D-01 layouts or inventory. Do not open F-03. Do not touch apps/api, packages/mocks, packages/contracts authorship, docs/handoffs/current.md, or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-02` only.

Build the authenticated app shell — sidebar, top bar, mobile tab bar,
skip link, content region, command palette — and the honest workspace
switcher. The **old sequence is the plan of record** (F-01 → F-02 →
F-03 → …), so this step happens now, but under the new design system:

- **Structure and behavior** come from `docs/design/system-ux.md`
  (destinations, honest workspace chrome, selector-not-authority,
  single `lang`/`dir` source).
- **UI details stay open.** Sidebar width, placement, motion, palette —
  none are fixed. For every visual block, ask `@user` for a reference
  (link / pasted code / prompt, images welcome); if none exists, offer
  options and let `@user` choose. Do not reproduce D-01 layouts.
- Non-visual work (state management, data wiring, contracts types) is
  yours to implement as planned below. Where the plan leaves a real
  choice, ask.

## Required Reading

1. `docs/design/system-ux.md` — what must exist and what binds the API
2. `docs/design/now.md` — the visible plan; log your reference choices
   in its Decisions log
3. This file
4. `context.md` (read-only)
5. `packages/ui` exports (F-01 primitives — use them; do not extend
   tokens)
6. `docs/api/openapi.yaml` + `packages/contracts` generated types
   (consume only)
7. ADR-0003 (component source rules: copy-in shadcn on Base UI; RSC +
   Server Actions; Zustand only where client state is real)
8. Superseded D-01-era F-02 (history only — scope reference, not
   authority):
   `docs/handoffs/archive/H-2026-09-19-P1-F02-commander-implementer.md`

## Inputs / Evidence

- System contracts: `docs/design/system-ux.md` §1 (destinations:
  New note, Inbox, Notes, Collections, Search, Ask, workspace switcher,
  search entry, mode, corpus, citation inspection, usage) and §2
  (tenancy: selector-not-authority, generic forbidden denial)
- F-01 primitives + token role layer in `packages/ui` — **remade
  2026-09-23** on shadcn v4 `base-nova` (Base UI) sources with the Mintlify
  token layer and Tabler icons
- S-02 canonical contracts; S-03 mock fixtures exist (backend lane),
  but this handoff wires **types only** — no data fetching
- Visible kit at `/kit` (F-02a, remade 2026-09-23) — the primitive gallery
  to build from

## Task details

| Concern | This task |
| --- | --- |
| API connections | `@omnidoc/contracts` types only (`Workspace`, `WorkspaceList`, `Principal`, `CorpusOwnership` where the switcher needs them). **No fetching.** Components receive data via props; live wiring waits for a later slice with MSW |
| State management | Server-first shell (RSC). Client state kept minimal: sidebar collapse / palette open — local state first; Zustand (ADR-0003) only if state must be shared across distant components. Ask if unsure |
| Routing / IA | Destinations from `system-ux.md` §1 (New note, Inbox, Notes, Collections, Search, Ask). Routes may be stub pages; structure over completeness |
| Workspace switcher | Selector, never authority; generic forbidden copy ("You don't have access to that workspace."); sample workspace separated and labelled; honest at n≈1 ("Solo workspace" is fine — do not fake org scale) |
| Locale / direction | Single `lang`/`dir` source stays `apps/web/app/locale.ts` → `layout.tsx`; `DirectionProvider` is the only direction source; logical CSS; `bdi` around workspace names / identifiers |
| Accessibility | Release gate per `quality/ui-qa-checklist.md`: skip link first focusable, landmarks, visible focus, keyboard-operable nav and palette, Escape dismiss, focus restore |
| Mobile | Capture/nav reachable without gestures; a mobile tab bar or equivalent is part of the shell's job |
| Look | Mintlify token layer (chosen 2026-09-23, values in `packages/ui/src/styles/tokens.css`) + whatever layout references `@user` gives per block. No palette invention; token values change only through the token layer |

## Reference protocol (per visual block)

Blocks in scope: sidebar, top bar, mobile nav, content region frame,
command palette, workspace switcher, skip link.

1. Before building a block's UI, ask `@user`: *do you have a reference —
   a link, pasted code, or a prompt (image welcome) — for this?*
2. No reference → offer 2–3 options (e.g. default shadcn composition;
   thin custom block on Base UI; skip the block this slice) and wait.
3. Log each choice in `docs/design/now.md` (Decisions log).
4. Skip link and focus management are **not** optional and not visual
   choices — they are gate requirements; build them without asking.

## Allowed Write Paths

- `packages/ui/**` (shell components as copy-in blocks; Storybook
  scaffolding only if `@user` opts in)
- `apps/web/**` shell wiring (layout, landmarks, routes, focus
  management, palette hotkey)
- `docs/frontend/README.md` (landed conventions only)
- `docs/handoffs/active/lane-frontend.md` (status, Outcome)
- `docs/design/now.md` (Decisions log + Current slice lines)
- `context.md` (status lines only)
- `docs/memory/implementer.md` (durable lessons only)

**Must not touch:** `apps/api/**`, `docs/api/**`, `docs/adr/**`,
`docs/design/system-ux.md` (contracts change only via `@user`),
`packages/mocks/**`, `packages/contracts/**` authorship,
`docs/handoffs/current.md`, `docs/handoffs/active/lane-backend.md`,
`docs/planning/**` (status lines above are the exception),
`packages/ui/src/styles/tokens.css`.

## Out of scope

- Journeys: auth (F-03), capture (F-04), organize (F-05), retrieve
  (F-06), ask (F-07), dual-mode chrome (F-08), sample path (F-09)
- Fetching / MSW wiring in-app; fixtures authorship
- Token values, palettes, motion systems (references first)
- Production AI; RTL locale; AWS

## Deliverables

1. Shell structure with the §1 destinations present and navigable
   (stub routes fine).
2. Honest workspace switcher per the Task details table.
3. Skip link + landmarks + focus management per the a11y gate.
4. Shell components as copy-in blocks in `packages/ui`, consuming token
   roles; every block's look traceable to a `@user` reference or an
   explicit logged choice.
5. Stub `New note` action (no editor yet — F-04 owns TipTap).
6. Outcome here; decision log rows in `now.md`; status in `context.md`.

## Constraints / Prohibited Decisions

- Do not invent visual details no reference covers
- Do not reproduce D-01 widths, layout diagrams, or inventory states
- Do not add tokens or edit `tokens.css`
- Do not author fixtures, OpenAPI, or Java code
- Do not import provider SDKs into `apps/web` / `packages/ui`
- Do not claim RTL locale support; do not activate production AI
- Do not fake enterprise scale (org charts, seats, SSO chrome)

## Acceptance Criteria

- Every §1 destination reachable; nav states honest (no fake scale)
- Workspace id used as selector only; forbidden copy is generic
- Skip link first focusable; landmarks present; palette
  keyboard-complete with focus restore; visible focus everywhere
- Single `lang`/`dir` source; logical CSS; `bdi` on identifiers/UGC
- Each built block has a logged `@user` reference or logged choice
- Contracts consumed as generated types; no local shape forks; no
  fetching in this task
- `packages/ui` + `apps/web` typecheck, tests, build green
- `current.md`, backend lane, contracts, mocks untouched

## Stop / escalate conditions

- **Soft-stop:** a block has no reference and `@user` is unavailable →
  stop that block, not the task; log the open choice in `now.md`.
- **Hard-stop:** pressure to build from D-01 specs; write-path
  collision with backend; ADR reopen; production AI activation;
  claiming RTL shipped.

## Dependencies / Risks

- Depends on: F-01 (completed), F-02a (completed — kit exists)
- Blocks: F-03+ (auth next in sequence; identity fixtures from S-03/B-03
  are ready)
- Parallel: backend B-06 — no mutual dependency
- Risk: stub routes without data could tempt fetching — keep props-only
- Risk: "honest chrome" copy drift — the generic forbidden denial is a
  system contract; copy it exactly

## Gates

- Production AI activation remains gated
- RTL locale remains deferred (readiness discipline applies)
- UT-* remain unrun
- Design language chosen: **Mintlify** (2026-09-23). Layout references per
  visual block still apply

## Completion Instructions

1. Complete deliverables inside Allowed Write Paths.
2. Append Outcome; set `status: completed`.
3. Archive to
   `docs/handoffs/archive/H-2026-09-23-P1-F02-user-implementer.md`
   (immutable). The older F-02 archives stay as history.
4. **Same-lane sequence rule:** the F-01→F-11 order is the plan of
   record. On completion, rewrite this path to **F-03 (auth UI)** —
   identity fixtures (S-03/B-03) are ready — using the same format:
   structure from `system-ux.md`, references from `@user`, integration
   details in the Task details table. If a cross-lane dep is unmet,
   soft-stop instead.
5. Durable lessons only in `docs/memory/implementer.md`.
6. Do not overwrite `current.md` or `lane-backend.md`; update
   `context.md` status lines only.

## Outcome

**Completed 2026-09-23.** The F-02 authenticated shell is built and green.

**Landed**

- Shell blocks in `packages/ui/src/shell`: `SkipLink`, `WorkspaceSwitcher`
  (+ `WORKSPACE_FORBIDDEN_MESSAGE`), `MobileTabBar`, `CommandPalette`,
  `useCommandPalette`, `ContentRegion`, `PageHeader`, and contract-derived
  aliases (`Workspace`, `WorkspaceList`, `Principal`, `CorpusOwnership`) in
  `shell/types.ts`.
- Copy-in primitives added to `packages/ui/src/components`: `sidebar`,
  `command` (+ `cmdk`), `dialog`, `sheet`, `dropdown-menu`, `tooltip`,
  `collapsible`, `avatar`, `breadcrumb`; `hooks/use-mobile`. The
  `sidebar.tsx` was adapted off the absent `--sidebar*` tokens to existing
  semantic roles and the layout width tokens; all new components were
  normalized to logical CSS.
- App wiring in `apps/web/app/(app)`: server `layout.tsx` passing workspace
  data as **props**, `shell.tsx` client boundary (nested collapsible
  sidebar + switcher + Collections submenu, slim utility top bar with
  search entry / New note / theme toggle / inert F-08 mode slot, centered
  content region, mobile tab bar, palette), `route-focus.tsx`, `nav.ts`,
  and stub routes `/inbox`, `/notes`, `/notes/new`, `/collections`,
  `/search`, `/ask`; `/` redirects to `/inbox`. Root layout adds
  `TooltipProvider`.
- `docs/design/now.md` Decisions log; `docs/frontend/README.md` shell
  conventions; `context.md` status lines; durable lessons in
  `docs/memory/implementer.md`.

**Reference choices (`@user`, 2026-09-23):** sidebar = nested/collapsible
(shadcn `sidebar-09`, customized to the token layer and content); top bar =
slim utility bar; mobile = bottom tab bar; content = centered column;
palette = shadcn `Command` (+`cmdk`); switcher = dropdown from the sidebar
top; Storybook **not** added (Vitest used).

**Evidence:** `npx nx run-many -t typecheck lint test -p ui web` green
(ui 189 tests, web 1); `pnpm --filter @omnidoc/web build` green (10 routes).
Root `pnpm test` also runs `api:test`, which fails only because local
Postgres is not running (Flyway connection on context load) — backend lane
and environmental, not touched by F-02.

**Honesty / scope notes**

- Workspace data is a server-layout **placeholder passed as props** (types
  only) — not a fixture authority and not live; the MSW/identity wiring
  slice replaces it. No fetching was introduced.
- The workspace switcher is a selector only; a forbidden selector renders
  the generic denial and never reveals existence; single real workspace
  reads "Solo workspace"; the sample corpus is separated and labelled.
- No D-01 layouts, no token edits, no provider SDKs, no contracts/mocks
  authorship.
- **No browser in this session:** visual confirmation of the shell (light/
  dark, real focus order, what looks off) is handed to `@user`.

**Gates:** production AI remains gated; RTL locale remains deferred (shell
uses logical CSS and a single `lang`/`dir` source); UT-* remain unrun.

**Next:** same-lane sequence → **F-03 (auth UI)**; identity fixtures
(S-03 / B-03) are ready. Live head rewritten to F-03.

## Revision (post-review, 2026-09-23)

`@user` reviewed the running shell and reported one runtime warning plus
visual issues. All addressed in the same F-02 ticket:

- **Base UI warning:** `Button`/`IconButton` rendering a `<Link>` now pass
  `nativeButton={false}` (native button semantics preserved/accurate).
- **Sidebar rebuilt to `sidebar-09`:** outer `Sidebar collapsible="icon"`
  with an always-narrow icon rail + secondary labeled panel (was a single
  sidebar-07-style collapse).
- **Collapsed workspace switcher:** shows one circular mark + `aria-label`;
  no clipped text, no stray selector icon.
- **Motion:** added `tw-animate-css` (shadcn v4 overlay classes were
  no-ops) plus scoped theme/background transitions.
- **Palette:** centered; **`⌘ K`** spacing fixed.
- **Mobile:** New note is an icon-only control; tab-bar type reduced;
  sidebar panel carries full labeled nav.
- **Spacing:** more gap between sidebar items.

Checks re-run green: `ui` typecheck/lint/test (190 tests), `web`
typecheck/lint/test/build.

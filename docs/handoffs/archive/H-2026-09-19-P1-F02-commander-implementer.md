---
handoff_id: H-2026-09-19-P1-F02
affinity: implementation
track: parallel
status: blocked
phase: "1"
task: "F-02"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-09-19
---

# F-02 — App shell, nav, locale, honest workspace switcher

> **Superseded before execution (2026-09-22).** `@user` paused this
> handoff. Do not implement it. D-01 layouts and the component inventory
> are no longer implementation authority. Live plan:
> `docs/design/now.md`. Live lane head:
> `docs/handoffs/active/lane-frontend.md`.

## Start Command

```text
DO NOT RUN. Superseded before execution on 2026-09-22. Read docs/design/now.md and docs/handoffs/active/lane-frontend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-*` only (this handoff = F-02).

Build the authenticated app shell — sidebar, top bar, mobile tab bar,
skip link, command palette, content region — and the **honest workspace
switcher** (REC-18) in `packages/ui`, wired into `apps/web`. Consume the
S-02 canonical contracts (`@omnidoc/contracts`) as **types only**. Keep
the single `lang`/`dir` source and LTR-now discipline established in
F-01.

The F-01 soft-stop is **cleared**: S-02 is completed and archived
(`docs/handoffs/archive/H-2026-09-17-P1-S02-implementer-implementer.md`),
so F-02 is unblocked.

## Required Reading

1. `context.md` (read-only)
2. `docs/planning/implementation-tracks.md` (F-02 row; do not edit status
   tables beyond what Completion Instructions allow)
3. `architecture.md` §2 (tenancy / selector semantics), §8 (locale /
   direction), §9 (sample-vs-mine)
4. `AGENTS.md`
5. ADR-0001 §1–§5/§7, ADR-0002 (FE graph), ADR-0003, ADR-0004 (chrome only)
6. `docs/design/shell/app-shell-and-navigation.md` (the shell spec —
   primary authority for this task)
7. `docs/design/components/inventory.md` §1–§2 (names + states), §12
   (state-coverage rule), §13 (import boundary)
8. `docs/design/accessibility/a11y-and-rtl-readiness.md` (§2 focus
   contract, §3 keyboard map, §4 SR patterns)
9. `docs/design/states/sample-vs-mine.md` (switcher + sample separation)
10. `docs/api/README.md` + `docs/api/openapi.yaml` (consume only —
    `Workspace`, `WorkspaceList`, `Principal`, `CorpusOwnership`)
11. Archived F-01 outcome —
    `docs/handoffs/archive/H-2026-09-16-P1-F01-commander-implementer.md`
    (token layer, providers, copy-in conventions, bounded gaps)
12. `docs/frontend/README.md`
13. This handoff

## Inputs / Evidence

- D-01 design package: `docs/design/**` (accepted; consume only)
- S-02 contracts: `packages/contracts` generated types + `docs/api/`
  (consume only — backend-authored SoT)
- F-01 foundation: tokens, `cn()`, DirectionProvider/ThemeProvider, and
  foundation primitives already in `packages/ui`
- Auth SoT: Spring Security sessions (ADR-0005); identity **port** only
  in the client; workspace id is a **selector**, never authority

## Allowed Write Paths

- `packages/ui/**` (shell components, Storybook scaffolding, tests)
- `apps/web/**` only as needed for shell wiring (layout, landmarks,
  focus management, palette hotkey)
- `docs/frontend/README.md` (only to reflect shell conventions actually
  landed; no status essays)
- `docs/memory/implementer.md` (durable lessons only)
- This file: status, Outcome; archive + rewrite rules in Completion

**Must not touch:** `apps/api/**`, `docs/api/**`, `docs/adr/**`,
`docs/design/**` (consume only), `packages/mocks/**` (S-03 owns
fixtures), `packages/contracts/**` authorship (consume generated types
only), `docs/handoffs/current.md`,
`docs/handoffs/active/lane-backend.md`, `context.md`, `architecture.md`,
`docs/planning/**`

## Out of scope

- Auth / sign-in UI (F-03 — also needs B-03 or S-03 identity fixtures)
- Capture / editor (F-04), organize (F-05), retrieve (F-06), Ask (F-07)
- `ModeChip` / `ModeDetailsPopover` / corpus usage chrome (F-08 dual-mode
  chrome) — reserve a TopBar slot only; render nothing in it yet
- Mock corpus / MSW handlers (`packages/mocks` — S-03, backend-produced)
- OpenAPI / SSE contract authorship (backend lane)
- Production AI / provider SDKs
- AWS / DevOps I-*

## Deliverables

1. **Shell components copy-in** per inventory §1–§2, each with **every
   state in its row**: `AppShell`, `Sidebar`, `SidebarNavItem`,
   `MobileTabBar`, `TopBar`, `PageHeader`, `SkipLink`, `CommandPalette`,
   `ContentRegion`, `WorkspaceSwitcher`, `WorkspaceSwitcherItem`,
   `SoloWorkspaceBadge`, `MembersPanel`, `MemberRow`, `ThemeToggle`.
   No components outside the inventory (§12 rule).
2. **Shell wiring in `apps/web`**: skip link as first focusable element;
   `banner` / `navigation` / `main` landmarks; focus order per shell spec
   §2.4; route-change focus to the content heading; `Cmd/Ctrl+K` palette
   (focus-trapped, Escape-dismissible, focus restored to trigger);
   `Cmd/Ctrl+N` new-note hook point (action itself lands with F-04).
3. **Honest workspace switcher** (REC-18): single-workspace label +
   "Solo workspace" badge; few-workspaces real list; sample workspace
   separated and labelled "Sample — public demo notes"; selector-not-
   authority semantics with the generic forbidden copy ("You don't have
   access to that workspace."); no fake org scale, member directories,
   or SSO theatre.
4. **Typed against S-02 contracts**: switcher/nav props use
   `@omnidoc/contracts` types (`Workspace`, `WorkspaceList`,
   `CorpusOwnership`). Components receive data via props — **no fetching
   and no fixture authorship**; live wiring waits for S-03 MSW fixtures.
5. **Storybook 10.6.0 scaffolding in `packages/ui`** — closes F-01
   bounded gap #1 — plus stories covering **every state** of every
   component delivered here (inventory §12), with reduced-motion variants
   where motion is listed.
6. **Locale / direction preserved**: single `lang`/`dir` source remains
   `apps/web/app/locale.ts` → `layout.tsx`; Base UI `Direction` remains
   the only direction source; logical CSS only; `bdi` isolation where
   workspace names / identifiers render.
7. Outcome on this handoff.

## Constraints / Prohibited Decisions

- Do not invent tokens or components not in the D-01 inventory
- Do not author MSW handlers, fixtures, or a second fixture authority
- Do not hand-edit `packages/contracts/src/generated/openapi.ts` or fork
  contract shapes locally
- Do not import provider SDKs into `apps/web` or `packages/ui`
- Do not claim RTL locale support
- Do not start F-03 / F-04 in this handoff
- Do not author OpenAPI or Java ports
- No simulated enterprise scale in any shell copy (REC-18)

## Acceptance Criteria

- Inventory §1–§2 shell components exist with all listed states
- Storybook stories exist for every state of every delivered component
- Shell a11y: skip link first focusable, landmarks present, focus order
  per spec §2.4, palette keyboard-complete with focus restore
- Workspace switcher is honest at n≈1–few; sample vs Mine separated and
  labelled; failure copy is the generic forbidden message
- Contracts consumed as generated types; no local shape forks
- LTR-now + logical CSS + single `lang`/`dir` source preserved
- No provider SDK; no `apps/api`, `packages/mocks`, or contracts-author
  writes
- Scaffold tests / typecheck / lint / build for touched FE packages stay
  green; Storybook build (or `storybook:build` equivalent) passes

## Directionality / accessibility checks

- Primary locale `en`; single `lang`/`dir` source; `DirectionProvider`
  sets no DOM `dir`
- Logical CSS only; no physical-direction insets; expand/collapse and
  chevron semantics are start/end aware (shell spec §8)
- Visible focus everywhere; ring meets non-text contrast in both themes
- Mode chip slot is inert this handoff — no status announcements wired
  until F-08
- `prefers-reduced-motion` respected for palette/sheet/sidebar motion
- Mobile (~390px): bottom tab bar per shell spec §3; no gesture-only
  actions; capture never depends on a swipe

## Stop / escalate conditions

- **Soft-stop:** After F-02 completes, do **not** open F-03 until
  Commander marks **S-03** (mock corpus / MSW) or **B-03** (identity)
  ready — F-03 needs identity fixtures. Set this file `status: blocked`
  with Outcome `waiting on S-03/B-03` if rewriting early is attempted —
  prefer leaving F-02 completed and waiting for Commander.
- **Hard-stop:** write-path collision with backend; pressure to reopen
  ADRs; production AI activation; claiming RTL locale shipped; inventing
  components or fixtures not authorized here.

## Dependencies / Risks

- Depends on: F-01 (completed), S-02 (completed 2026-09-17)
- Blocks: F-03+ (F-03 additionally needs S-03/B-03; F-04 needs S-03
  fixtures for data)
- Parallel: B-02 on backend — no mutual dependency
- Risk: inventing a second fixture authority — forbidden; render from
  typed props only
- Risk: Storybook 10 + Next 16 / React 19 integration friction — if the
  pinned Storybook 10.6.0 cannot be made to build within this handoff,
  return it as a bounded gap instead of substituting an unpinned version

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- UT-* remain unrun

## Completion Instructions

1. Implement F-02 deliverables inside Allowed Write Paths.
2. Append Outcome; set this file `status: completed`.
3. Archive a copy to
   `docs/handoffs/archive/H-2026-09-19-P1-F02-commander-implementer.md`
   (immutable).
4. **Do not** rewrite this path to F-03. Soft-stop: notify that the lane
   waits on **S-03 / B-03**. Commander opens F-03 on this same path when
   fixtures are ready.
5. Durable lessons only in `docs/memory/implementer.md`.
6. Do **not** update `context.md` or `current.md` unless Commander
   authorizes — prefer Outcome here for Commander integration.

## Outcome

**Superseded before execution (2026-09-22).** Status `blocked`. No shell
code was written under this handoff. `@user` replaced the D-01
implementation-spec model with `docs/design/system-ux.md` (stable
contracts only) and `docs/design/now.md` (living plan). Visual
prescriptions in this ticket — inventory §1–§2 as a whitelist, shell
spec widths, Storybook-for-every-inventory-state — are not binding.

F-02 was later **reopened 2026-09-23** under the new design system
(live head: `docs/handoffs/active/lane-frontend.md`). This archive
stays the record of the D-01-era attempt; do not implement from it.

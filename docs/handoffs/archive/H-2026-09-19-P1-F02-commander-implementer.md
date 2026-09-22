---
handoff_id: H-2026-09-19-P1-F02
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-02"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-09-19
---

# F-02 — App shell, nav, locale, honest workspace switcher

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-02 exactly. Build the app shell and honest workspace switcher per D-01 shell spec and inventory §1–§2, wired against @omnidoc/contracts types. Do not open F-03. Do not touch apps/api, packages/mocks, or packages/contracts authorship. Do not activate production AI. Do not overwrite docs/handoffs/current.md or lane-backend.md.
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

---

# Outcome

**Status:** `completed` · **Outcome:** F-02 delivered. **Soft-stop — the
frontend lane now waits on `S-03` (mock corpus / MSW) or `B-03` (identity)
before F-03.** This lane head was intentionally **not** rewritten to F-03.

**Branch / commit:** `F02-app-shell-honest-workspace-switcher` — changes are
**uncommitted** in the working tree (no commit, no push, no PR; Commander /
`@user` own the remote flow, matching the F-01 precedent). Note `apps/api`
sources from B-01 are also still uncommitted in the same tree.

## Files changed

Design system — `packages/ui/`

| Path | Purpose |
|------|---------|
| `src/components/shell/types.ts` | **New.** Shell types **derived** from `@omnidoc/contracts` (`Workspace`, `WorkspaceList`, `CorpusOwnership`) + `toWorkspaceEntries` adapter. No contract shape is re-declared. |
| `src/components/shell/copy.ts` | **New.** All shell copy in one auditable place, with the prohibited phrasings documented next to the honest ones. |
| `src/components/shell/app-shell.tsx` | **New.** `AppShell` — CSS-grid shell; column 1 is inline-start in any direction; reads `--od-layout-sidebar` / `-rail`. |
| `src/components/shell/skip-link.tsx` | **New.** `SkipLink` — first focusable element; logical `start-2` reveal. |
| `src/components/shell/sidebar.tsx` | **New.** `Sidebar` (expanded · rail · loading · overflow) + `SidebarNavItem` (default · hover · focus · active). |
| `src/components/shell/mobile-tab-bar.tsx` | **New.** `MobileTabBar` (default · active tab · gated tab); capture is its own list item. |
| `src/components/shell/top-bar.tsx` | **New.** `TopBar` (default · loading); the sole `banner`; F-08 mode-chip slot reserved and inert. |
| `src/components/shell/page-header.tsx` | **New.** `PageHeader` (default · with actions · with corpus chip); route-change focus target; root is a `<div>` (see gap 2). |
| `src/components/shell/content-region.tsx` | **New.** `ContentRegion` (default · loading · error · empty) — `main#main` + `tabIndex={-1}` + retryable error. |
| `src/components/shell/command-palette.tsx` | **New.** `CommandPalette` (closed · open · loading · empty · results) — Base UI `Dialog` + keyboard-complete results list. |
| `src/components/shell/workspace-switcher.tsx` | **New.** `WorkspaceSwitcher` (single-workspace · few · sample-present · open · forbidden), `WorkspaceSwitcherItem` (default · selected · sample-tagged), `SoloWorkspaceBadge`. |
| `src/components/shell/members-panel.tsx` | **New.** `MembersPanel` (solo-empty · list · loading · error) + `MemberRow` (default · owner · member). |
| `src/components/shell/theme-toggle.tsx` | **New.** `ThemeToggle` (light · dark · system) — Base UI `Menu.RadioGroup`. |
| `src/components/shell/index.ts` | **New.** Barrel. |
| `src/components/shell/shell.test.tsx` | **New.** 38 tests: every component state, REC-18 honesty, plus source-discipline greps. |
| `src/components/avatar.tsx` | **New.** Inventory §3 row, first needed here (switcher + members) — image · initials · fallback. |
| `src/components/index.ts` | Exports `Avatar` and the shell barrel; documents which §3 rows remain deferred. |
| `src/components/shell/shell.story-data.tsx` | **New.** Catalogue sample data, imported only by `*.stories.tsx`. |
| `*.stories.tsx` (13 files) | **New.** Every state of every delivered component, incl. `ReducedMotion` variants for the two overlay surfaces. |
| `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/preview.css` | **New.** Storybook 10.6.0 scaffolding + provider stack + Theme/Motion globals + a11y addon. |
| `package.json` | Adds `@omnidoc/contracts` dependency; Storybook/Vite toolchain devDeps; `storybook` / `storybook:build` scripts. |
| `project.json` | Adds `storybook:build` target; lint target ignores `storybook-static/**`. |

Application — `apps/web/`

| Path | Purpose |
|------|---------|
| `app/(app)/layout.tsx` | **New.** Authenticated route group; renders the shell so unauthenticated routes can sit outside it. |
| `app/(app)/page.tsx` | **Moved** from `app/page.tsx` (git rename) and rewritten as the Inbox landing — real chrome, **no fixtures**. |
| `app/shell/app-shell-host.tsx` | **New.** The only shell behaviour: landmarks, focus order, `Cmd/Ctrl+K`, `Cmd/Ctrl+N` hook point, route-change focus. No data. |
| `app/shell/nav.tsx` | **New.** Primary-nav IA (structure, not data) + `isActiveRoute`. |
| `app/globals.css` | Removed the now-unused S-01a `.shell` helper (the shell owns its grid in `packages/ui`). |

Documentation / workspace config

| Path | Purpose |
|------|---------|
| `docs/frontend/README.md` | Added **Shell conventions (F-02)**; updated the repo map, workspace tree, "start today" item 5, and the blocked list. |
| `docs/memory/implementer.md` | Durable F-02 lessons. |
| `pnpm-workspace.yaml` | **Root file, outside the handoff write paths — flagged below (gap 3).** `allowBuilds: esbuild: true`. |
| `pnpm-lock.yaml` | Workspace consequence of the new devDeps. |

Not changed: `context.md`, `docs/handoffs/current.md`, `architecture.md`,
`docs/adr/**`, `docs/design/**`, `docs/planning/**`, `docs/api/**`,
`packages/contracts/**`, `packages/mocks/**`, `apps/api/**`,
`docs/handoffs/active/lane-backend.md`.

## Verification (all commands actually run)

| Check | Command | Result |
|-------|---------|--------|
| FE graph typecheck/lint/test/build | `nx run-many -t typecheck lint test build --projects=ui,web --skip-nx-cache` | **7/7 pass** |
| Whole FE graph incl. contracts + mocks | `nx run-many -t typecheck lint test --projects=ui,web,contracts,mocks --skip-nx-cache` | **12/12 pass** |
| UI unit tests | `nx run ui:test` | **159 passed** (6 files; 121 → 159, +38) |
| Storybook build | `pnpm --filter @omnidoc/ui storybook:build` | **Passes** — `storybook-static/` emitted; every story compiles |
| Full workspace gate | `nx run-many -t lint typecheck test build --skip-nx-cache` | 13 pass; **`api:build` + `api:test` fail — environmental** (no JDK 21 toolchain on this machine; `java -version` = 26). Unrelated to F-02; no `apps/api` change exists. |

### Browser verification (production build, `next start` on :4321)

Measured in the integrated browser against `nx run web:build` output:

| Claim | Evidence |
|-------|----------|
| Skip link is first focusable | `app-shell.firstElementChild[data-slot="skip-link"]`; `href="#main"` |
| Exactly one `banner` | `document.querySelectorAll("header").length === 1` at 390 / 1010 / 1164 / 1400 px |
| Landmarks | visible `navigation` = 1 (sidebar **or** tab bar, never both); `main#main` present |
| Desktop layout | 1164 px: top bar `w=1164 h=57`, sidebar `x=0 y=57 w=240 h=671`, main `x=240 w=924`; grid `240px 1fr`; tab bar `display:none` |
| Mobile layout (390 px) | tab bar visible, sidebar `display:none`; 5 `<li>` = 4 tabs + capture as its own item; content column `padding-bottom: 80px` clears the fixed bar; **no horizontal scroll** |
| Palette `Cmd/Ctrl+K` | dialog opens with accessible name "Search and commands"; focus lands on the `searchbox`; focus guards present; `Escape` closes and focus returns to the trigger |
| `Cmd/Ctrl+N` hook point | focus moves to the rendered capture control (`aria-label="New note"`) |
| Sidebar collapse | `data-sidebar-collapsed` on shell, `data-collapsed` on sidebar, grid `52px 1fr` (rail = 3.25rem), toggle `aria-expanded="false"` + name flips to "Expand sidebar", rail item label keeps `sr-only` accessible name |
| Theme toggle | 3 `menuitemradio` with `aria-checked` (System default); selecting Dark sets `html.dark` and the token-remapped background; `Escape` restores focus to the trigger |
| Single direction source | `html lang="en" dir="ltr"`; no component sets `dir` (asserted by test) |

**Not run / not claimed:** axe-core (`@axe-core/playwright` is pinned in
ADR-0003 but not installed; the Storybook a11y addon is wired and
`parameters.a11y.test = "error"`, but the interaction runner was not
executed). Manual keyboard-only and forced-reduced-motion sweeps were
**not** performed end-to-end; reduced motion is covered by the global
token rule, the `motion-reduce:` pairing test, and reviewable Storybook
`ReducedMotion` stories. UT-* remain unrun.

## Deliberate scope decisions (for Phase Check review)

1. **No fixtures anywhere in the FE.** `apps/web` mounts `WorkspaceSwitcher`
   with an **empty list** (it renders `null` — its documented guard) and
   renders no notes/members. `packages/mocks` (S-03) stays the single
   fixture authority. Storybook sample data lives in
   `shell.story-data.tsx`, is imported only by stories, and is documented as
   catalogue-only.
2. **`PageHeader` root is a `<div>`, not `<header>`.** A `<header>` nested in
   `<main>` is still resolved as a `banner` landmark by AT heuristics, which
   gave the shell two banners. The regression test asserts exactly one. This
   was found by the test, not by inspection.
3. **`WorkspaceSwitcher` composes the corpus label.** The S-02 `Workspace`
   schema carries **no** corpus-ownership field, so `WorkspaceEntry` wraps
   the contract type with `CorpusOwnership` supplied by the caller
   (`toWorkspaceEntries`). No contract field was invented; see gap 1.
4. **`CommandPalette` is Base UI `Dialog` + a plain results list, not `cmdk`.**
   shadcn's `command` is built on `cmdk`, which ADR-0003 does not pin;
   introducing it from an F-* slice would be a new component-base decision.
   Focus trap, `Escape`, focus restore, and keyboard-complete navigation are
   all present and verified.
5. **`@storybook/react-vite` instead of the ledger's `@storybook/nextjs`.**
   Version stays at the pinned **10.6.0**; Vite is the ledger's **8.3.0**.
   `packages/ui` is a framework-agnostic `scope:shared` package — the Next
   framework would add `next` + a Next config to it. See gap 4.
6. **`@vitejs/plugin-react` deliberately not added.** Vite 8 handles JSX
   automatically and the framework does not require the plugin; adding it
   would be an unpinned dependency.
7. **Route group `(app)`.** The shell wraps only authenticated routes, so
   F-03's sign-in / re-auth surfaces do not need a later restructure. URLs
   are unchanged.
8. **No new tokens.** D-01 defines no scrim/overlay token; the palette
   backdrop uses the `--od-neutral-950` primitive at 50 % with an inline
   comment naming it as a bounded gap rather than inventing a role. The
   `Avatar` row added is inventory §3, not a new component class.
9. **`.shell` helper removed from `apps/web/app/globals.css`.** `AppShell`
   owns shell geometry; keeping a second width helper would be a second
   authority.
10. **Hover state in Storybook is a rendering, not a forced pseudo-class.**
    No pseudo-states addon is published for Storybook 10.6.0, so
    `SidebarNavItem`'s `Hover` story applies the hover tokens directly and
    says so in its description.

## Bounded gaps returned to Commander (not silently dropped)

1. **S-02 has no corpus-ownership field on `Workspace`.** The switcher can
   therefore not read "sample vs mine" off the wire; the caller supplies it.
   Recommend Architect/Backend decide whether `Workspace` gains a corpus
   field before S-03 freezes fixtures.
2. **Member list has no schema.** `MembersPanel` / `MemberRow` take a local
   `MemberView` presentation type; S-02 exposes only `InviteMemberRequest`
   (roles) and `InviteResult`. The panel is story-complete but cannot be
   wired until a member-list shape exists.
3. **Root `pnpm-workspace.yaml` was edited** (`allowBuilds: esbuild: true`)
   because pnpm 12 blocks esbuild's install script with
   `ERR_PNPM_IGNORED_BUILDS`, which fails *installs*, not just builds. This
   file is outside the handoff's Allowed Write Paths; it is a mechanical
   prerequisite of the authorized Storybook deliverable and cannot collide
   with the Gradle backend lane. Flagged for Commander/Phase Check.
4. **Storybook framework deviation** (decision 5). If the ledger's
   `@storybook/nextjs` is a hard requirement for `packages/ui`, that is an
   ADR-0003/ledger amendment — please rule on it.
5. **axe-core / Playwright not installed**, so the automated a11y gate is
   still manual + Storybook-addon only. `@axe-core/playwright` 4.13.0 and
   Playwright 1.63.0 are pinned but not yet in the FE graph.
6. **`AppShell` inner-scroll model.** The shell owns the viewport
   (`h-dvh`) and the content column scrolls. If Designer intends
   document-level scrolling (e.g. for anchor links or print), that is a
   one-line change but a visible behaviour choice — please confirm.
7. **Nav links target routes that do not exist yet** (`/inbox`, `/notes`,
   `/search`, `/ask`), so they 404 until F-04…F-07. Expected, not a defect.

## Gates — unchanged

- Production AI / provider activation: **still gated**; no provider SDK was
  introduced and the boundary lint is green.
- RTL locale: **still deferred, not closed.** No RTL claim exists in copy or
  docs; only readiness discipline (logical CSS, single `lang`/`dir` source,
  `<bdi>` isolation, a test that forbids the claim).
- UT-1…UT-22: still unrun hypotheses.
- No secret, BYOK key, or provider credential was added. Nx Cloud stays off.

## Next action

**Commander** — this lane is soft-stopped. Do **not** treat this completed
F-02 head as an F-03 assignment. Open **F-03** on this same path
(`docs/handoffs/active/lane-frontend.md`) once **S-03** (mock corpus / MSW)
or **B-03** (identity fixtures) is ready, since F-03 needs identity fixtures.
`context.md` and `docs/handoffs/current.md` were deliberately **not** updated
(Completion Instruction 6) — integrate from this Outcome.

Suggested Commander handoff to open:

```text
task: "F-03" — Auth / sign-in UI (identity port)
depends on: F-02 (done) + S-03 or B-03 (identity fixtures)
lane: frontend · to: implementer
```

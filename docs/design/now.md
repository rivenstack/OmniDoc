# Now — UI plan

**Living page.** Edit this during the build. Keep it short.
**Updated:** 2026-09-24

Choose here. Do not wait for a finished mock to review.

## Authority

| Question | Read |
| --- | --- |
| What must the API and data honor? | [`system-ux.md`](./system-ux.md) |
| What are we building now? | This file |
| How should it look? | **Mintlify** design language — values in `packages/ui/src/styles/tokens.css` |
| Old visual spec | Other files in `docs/design/` — history only (D-01) |

## Stable vs flexible

| Stable (change rarely; you choose) | Flexible (change while building) |
| --- | --- |
| Destinations and header items in `system-ux.md` | Where those items sit |
| Search and Ask as different operations | Shortcuts, result layout, motion |
| Answer states, citation identity, no silent mode fallback | Color, density, component composition |
| Sample vs Mine; no zero-retention claim | How those labels are drawn |
| shadcn/Base UI as the component source (ADR-0003) | Which primitive, until a screen needs one |
| Token **roles** (`--primary` = primary action, `--muted` = muted surface) | Token **values** — swapping them re-skins the app without touching screens |

The design language is a token layer, not a hardcoded spec. A new look
(Google-like, Anthropic-like, whatever you pick from references) is a
retune of `packages/ui/src/styles/tokens.css` values, plus density or
radius choices. Components are copied-in shadcn blocks and do not move.

## Current slice

**F-04 capture — foundation landed 2026-09-25 (branch `F04-capture-tiptap`); no visual block built yet.** The parts that are behaviour, not look, are in: `apps/web/app/lib/notes/notes-api.ts` (notes port over the S-02 contract; a `409` is reported as a conflict with no retry and no merge), `apps/web/app/lib/api/transport.ts` (server-side HTTP transport shared by the ports), and `packages/ui/src/capture/` (`save-state.ts` / `capture-store.ts` for the save cycle, `import-status.ts` for the per-file indexing vocabulary). Editor pins `@tiptap/*` 3.31.3 + `zustand` 5.0.15 are installed in `packages/ui`, and TipTap was verified to render under this repo's jsdom setup with `immediatelyRender: false`. **Every visual block below still needs a reference.**

**F-03 session identity — done 2026-09-24 (branch `F03-auth-ui`).**
The shell is session-aware and sign-in is real. `apps/web/app/lib/identity/` is
the identity **port** (typed over `docs/api/openapi.yaml`); `proxy.ts` sends a
browser with no session cookie to sign-in and remembers the requested path;
the `(app)` layout resolves the session server-side — authenticated → shell,
rejected → sign-in, identity service unreachable → an honest "can't confirm"
screen. Sign out and workspace selection are server actions, and the account
menu consumes the contract `Principal`. The **sign-in block**
(`packages/ui/src/shell/login.tsx`, route `apps/web/app/sign-in/page.tsx`) was
built from the reference `@user` supplied on 2026-09-24.

**F-04 capture — next in sequence.** Not started. `@user` references per block
are required before each visual piece (see Open choices).

**F-02 shell — landed 2026-09-23.** The authenticated shell now exists:
collapsible nested sidebar (workspace switcher at top, nav, Collections
submenu), slim utility top bar (search entry opens the palette, New note,
theme toggle, inert F-08 mode slot), centered content region, mobile tab bar,
skip link, and a `Cmd/Ctrl+K` command palette. `/` lands in Inbox; Inbox,
Notes, New note, Collections, Search and Ask are reachable stub routes. Shell
blocks live in `packages/ui/src/shell`; app wiring in `apps/web/app/(app)`.
F-03 (auth UI) is next in sequence — identity fixtures are ready.

**F-01 remake — done 2026-09-23 (branch `F01-ui-remake`).** The F-01
primitives were rebuilt on the current shadcn v4 (`base-nova`, Base UI)
sources, the icon library moved to Tabler, and the token layer was retuned
to the **Mintlify** design language. `/kit` is the visible proof.

**Landed 2026-09-22:** `/kit` in `apps/web` — primitives on one page.
Remade 2026-09-23 (below). Run `pnpm --filter @omnidoc/web dev` and open
`/kit`.

**Landed 2026-09-23 (F-01 remake):** `packages/ui` now carries the shadcn
v4 `base-nova` component sources (Button, IconButton, Input, Textarea,
Label, Badge, Card, Separator, Skeleton, Spinner) plus the v4 form family
(Field/FieldGroup/FieldLabel/FieldError, InputGroup) and Empty. `Button`
lost its `loading` prop (compose `Spinner` + `disabled`), and `IconButton`
gained icon size steps. `components.json` is `style: base-nova`,
`iconLibrary: tabler` in both packages.

**Backend:** unchanged. B-05 stays on the backend lane.

**Sequence:** the old F-01→F-11 order is the plan of record again —
F-02 shell → F-03 auth → F-04 capture → F-05 organize → F-06 retrieve →
F-07 ask → F-08 dual-mode → F-09 sample → F-10 a11y → F-11 Playwright.
The F-* IDs are labels for those steps; the D-01 specs behind them are
not binding. Cross-lane gates (S-03, B-07, B-08, B-09) still apply.

**Open choices**

**F-04 (capture / TipTap):** every visual block is open until `@user` supplies
a reference or chooses among offered options — editor shell/chrome,
formatting toolbar, title field, save-state indicator, import/paste
affordance, conflict surface. Bound and **not** choices: save-state semantics
(`idle`/`saving`/`saved`/`conflict`), conflict visibility without a client-side
winner, ProseMirror JSON as the stored body, per-file indexing status, the
editor's accessible name, and the generic forbidden copy.

**Needs `@user` confirmation (added 2026-09-25):** F-04 lists four save states.
A **fifth**, `error`, was implemented for a failed save (transport failure,
5xx, unreadable response). Without it a failed save would render as nothing — or
worse, as `saved` — which is silent data loss, and it is kept distinct from
`conflict` because "the server has a newer version" and "we could not reach the
server" call for different user actions. This is an addition to the listed
behaviour, so it needs an explicit yes/no rather than being assumed.

**Closed 2026-09-24 (F-03):** the sign-in card and form-field look `@user`
supplied are built. Three things F-03 could **not** decide remain open:
`Workspace` in `@omnidoc/contracts` carries no sample marker, so no sample
corpus can be separated in the switcher yet (F-09 + a contract change); the
generic forbidden denial has no reachable trigger on any F-03 surface, so its
copy is unreviewed in situ; and the identity-unavailable entry screen has no
reference, so it uses the stock `Empty` primitive and is open to review.

## Rules for anyone editing this page

- Record a decision only after the user picks it. Move it from Open
  choices into the log below.
- Do not paste layouts, token values, or component recipes here.
- Do not harden UI details a reference has not covered.
- If a change belongs in `system-ux.md`, edit that file in the same pass.
- The F-01→F-11 sequence is the plan of record; the D-01 specs behind
  those IDs are not.

## Decisions log

| Date | Choice |
| --- | --- |
| 2026-09-22 | D-01 visuals are historical. System contracts live in `system-ux.md`. |
| 2026-09-22 | F-02 paused before any shell code. |
| 2026-09-22 | Look is stock shadcn until references are supplied and chosen. No language doc yet. |
| 2026-09-22 | This file is the visible plan. Not a second spec, and not the backend lane. |
| 2026-09-22 | Search: as-you-type is the current preference. Not a locked contract. Can change later. |
| 2026-09-22 | Next frontend slice: visible stock-shadcn kit. No shell. |
| 2026-09-22 | Kit landed at `/kit` (page, not Storybook — Storybook 10 stays a later gap). |
| 2026-09-22 | Design language clarified: a swappable token layer. New look = retune `tokens.css` values; components and screens stay. |
| 2026-09-23 | Sequence confirmed: F-01→F-11 order is the plan of record. Task format = title + short description + integration details; UI details stay open. |
| 2026-09-23 | F-02 (shell) reopened as next step under the new rules. Reference protocol live: implementer asks for a reference per block, offers options on real choices. |
| 2026-09-23 | **Design language chosen: Mintlify** (from the popular-web-designs references). White canvas, near-black text, brand green accent, pill controls, border-driven depth. Lands as token values + component shape — not a new spec. |
| 2026-09-23 | Icon library: **Tabler** (`@tabler/icons-react` 3.48.0) replaces lucide in both `components.json` files and all components. |
| 2026-09-23 | shadcn config moved to v4 **`base-nova`** (Base UI variants) so `shadcn add` fetches current components; F-01 primitives were re-copied on those sources. |
| 2026-09-23 | New v4 form/empty family added: `Field`/`FieldGroup`/`FieldLabel`/`FieldError`, `InputGroup`, `Empty`. Raw `Label`+`Input` layout is no longer the form pattern. |
| 2026-09-23 | `Button` has no `loading` prop; compose `Spinner` + `disabled` (v4 pattern). `IconButton` keeps the label-by-type guarantee. |
| 2026-09-23 | Fonts: Inter + Geist Mono self-hosted through `next/font` (build-time fetch, no runtime third-party request). Token layer keeps a system fallback stack. |
| 2026-09-23 | A11y-over-template deviations: focus rings are full-opacity `ring-ring` (upstream `/50` fails 3:1 on white), and status/focus colors are darkened until they pass WCAG contrast. |
| 2026-09-23 | Phase-check follow-up: destructive tints retuned (danger step `#ad3f3f`, hover tints at 15%) and error rings/borders made full-opacity, so destructive/invalid states pass contrast too. |
| 2026-09-23 | Logged deviation: control borders stay whisper-thin (below the 3:1 boundary bar) per the Mintlify look; fields are identified by label + placeholder + a passing focus ring. **User-confirmed 2026-09-23.** |
| 2026-09-23 | No browser in the implementer session: visual check handed to `@user` — `/kit` checked in light and dark, result **"looks good"**. Implementer rule updated to ask rather than infer. |
| 2026-09-23 | **F-02 references chosen by `@user`:** sidebar = nested/collapsible (shadcn `sidebar-09`, customized to the token layer and OmniDoc content); top bar = slim utility bar (search entry, New note, theme toggle, inert F-08 mode slot); mobile = bottom tab bar; content region = centered column; command palette = shadcn `Command` (adds `cmdk`); workspace switcher = dropdown from the sidebar top; Storybook **not** added (Vitest instead). |
| 2026-09-23 | **F-02 shell landed.** Shell blocks live in `packages/ui/src/shell` (SkipLink, WorkspaceSwitcher, MobileTabBar, CommandPalette + `useCommandPalette`, ContentRegion, PageHeader); app wiring in `apps/web/app/(app)`. Workspace data is a server-layout **placeholder passed as props** (types only, no fetch) — not a fixture authority; S-03/B-03 replace it with MSW/identity wiring. |
| 2026-09-23 | `shadcn add` pulled the sidebar's `--sidebar*` color tokens, which this project does not carry. The copied-in `sidebar.tsx` was adapted to existing semantic roles (`bg-background`, `text-foreground`, `border-border`, `bg-muted`, `ring-ring`) and the width tokens; **no** `tokens.css` edit. Upstream physical utilities in all new components were normalized to logical (`ps/pe/ms/me`, `text-start/end`). |
| 2026-09-23 | **F-02 revision after `@user` review:** sidebar rebuilt to the **`sidebar-09` double-sidebar** structure (always-narrow icon rail + contextual/labeled panel), replacing the single sidebar-07-style collapse. The workspace switcher collapses to a single circular mark with an `aria-label` (no clipped text, no stray selector icon). `@user`-requested fixes: responsive icon-only New note on mobile, `⌘ K` spacing, centered palette, more nav spacing, mobile tab type reduced, and motion added via **`tw-animate-css`** plus scoped theme/background transitions. |
| 2026-09-23 | **Motion is a dependency, not free:** shadcn v4 overlay classes (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`) only work with `tw-animate-css` imported in the Tailwind entry; without it, dialogs/dropdowns open with no motion. |
| 2026-09-23 | **Base UI `nativeButton`:** `Button`/`IconButton` with `render={<Link/>}` must pass `nativeButton={false}` or Base UI warns and drops native semantics. |
| 2026-09-23 | **Sidebar block migrated to the upstream `sidebar-09` composition** (reference: `ui.shadcn.com/r/styles/new-york-v4/sidebar-09.json`; `@user` chose composition-only over a new-york-v4 Radix tier swap — the base-nova/Base UI primitives stay). The block now mirrors the upstream file layout: `apps/web/app/(app)/app-sidebar.tsx` (double-sidebar geometry) + `nav-user.tsx` (account dropdown footer). Content mapping: upstream brand block → workspace switcher; upstream mail-list demo → OmniDoc labeled nav; upstream "Unreads" `Switch` → **omitted** (no honest analog); panel-header `SidebarInput` → launcher that opens the command palette (`readOnly`; `onMouseDown` + `preventDefault`, Enter/Space — avoids a focus-return reopen loop). Upstream Upgrade/Billing items have no analog (no commerce); the rail-footer theme button moved into the NavUser dropdown (top bar ThemeToggle stays). Sign out renders **only** when an `onSignOut` handler is passed — F-03 (session UI) wires it and replaces the `ShellUser` render placeholder with contract-typed `Principal` consumption. |
| 2026-09-23 | **Sidebar block migrated again, to the upstream `sidebar-07` composition** (reference: `ui.shadcn.com/r/styles/new-york-v4/sidebar-07.json`; `@user` request). One `Sidebar collapsible="icon"` replaces the sidebar-09 rail+panel pair, and the block now mirrors the upstream file layout: `apps/web/app/(app)/app-sidebar.tsx` (header/content/footer + `SidebarRail`) + the new `nav-main.tsx` (grouped, collapsible nav) + `nav-user.tsx` (unchanged — sidebar-07 and -09 share it). Content mapping: upstream brand/team block → the project-owned `WorkspaceSwitcher` block (reused, not re-implemented); upstream `NavMain` "Platform" group → one `Workspace` group of OmniDoc destinations; upstream second group (`NavProjects`) → **omitted** (a list of user-owned containers with per-row View/Share/Delete actions; no collection shape in `@omnidoc/contracts` and F-05 owns that surface, so it would mean invented fixtures and dead menu items); upstream `page.tsx` demo breadcrumb header + placeholder tiles → **not adopted** (demo content, not the sidebar block — the shell keeps its own top bar and `ContentRegion`). The panel-header palette launcher is gone with the panel; `system-ux.md` §1's "search entry" stays satisfied by the top bar. Upstream physical utilities normalized to logical (`ms-auto`, `rtl:-scale-x-100` on the chevron) and Radix's `group-data-[state=open]/collapsible:` retargeted to Base UI's `group-data-open/collapsible:`. Only items that actually have children render a collapsible, so no item shows a chevron that toggles nothing. |
| 2026-09-24 | **Two `@user` review fixes to the F-02 shell.** (1) *Top-bar separator alignment + spacing.* The primitive's vertical default is `self-stretch`, which beats a definite `h-*` and pins the rule to the flex start, so the 20px separator hugged the top; the consumer now passes `data-vertical:self-auto` to hand alignment back to the container (`items-center`), and `me-1.5` evens the two *optical* gaps (the trigger's 16px glyph sits in a 28px hit box, so its perceived gap is 8 + 6 = 14px, matching the search field's 8 + 6 = 14px). The override holds because `cn` runs tailwind-merge, which drops the primitive's conflicting class — the generated CSS actually orders `self-stretch` last, so this must not be "simplified" into relying on source order. (2) *Trigger glyph.* `SidebarTrigger` now advertises the action it performs instead of a fixed "sidebar" glyph: `IconLayoutSidebarLeft/RightCollapse` when the panel is visible, `…Expand` when it is hidden, with the pair chosen by the sidebar `side` (a right-hand sidebar must not borrow the left-hand pair) and the accessible name left stable as "Toggle Sidebar". Two unit tests pin the state/side mapping. |
| 2026-09-24 | **Two `@user` review fixes.** (1) *Workspace avatar letter vanished on dropdown hover.* `DropdownMenuItem` forces every **descendant** to `accent-foreground` while highlighted (`focus:**:text-accent-foreground`), which repainted the initial in the accent colour on the `primary` circle — invisible. `WorkspaceMark` now sets its foreground with the important modifier (`text-primary-foreground!`), because a filled chip's foreground is paired with its own background, not the row's. Verified in the built CSS: `!important` beats the non-important descendant rule. (2) *Skip link.* Kept — it is a required a11y affordance (ui-qa-checklist §1.7), and appearing on Tab is its whole purpose, not a bug. It gained `focus:shadow-lg` so it reads as a transient overlay rather than a collision with the sidebar header it covers, and its comment now records the real cascade dependency: `focus:not-sr-only` resets `position` to `static`, and `focus:fixed` only wins because Tailwind emits it later (checked in the built CSS). Losing that would turn the link into a flex item and shove the sidebar sideways. |
| 2026-09-23 | **Two follow-ups after `@user` review of the sidebar-07 shell.** (1) `SidebarTrigger` no longer draws a fixed `IconLayoutSidebar`: it now picks the Tabler collapse/expand pair from the live `state` (and `side`), so the glyph advertises what the click will do; on mobile it always shows "expand", since the sidebar there is a closed sheet. Accessible name stays "Toggle Sidebar". (2) The top-bar `Separator` was pinned to the top instead of centred: the primitive's vertical default is `self-stretch`, and `align-self: stretch` with a definite height behaves as `flex-start`. Fixed at the call site with `data-vertical:h-5 data-vertical:self-auto` (same variant as the primitive, so it wins under `twMerge`) plus `me-1.5` to optically match the trigger-side gap. The primitive itself still matches upstream `base-nova` verbatim — no local fork. |
| 2026-09-24 | **F-03 identity wiring landed.** Session identity is a server-side port (`apps/web/app/lib/identity/`) over `POST/GET/DELETE /api/v1/session` + `GET /api/v1/workspaces`, typed by `@omnidoc/contracts`. No client auth library; the browser never talks to the API, so no CORS, and Next relays `JSESSIONID` (httpOnly) + `XSRF-TOKEN`. |
| 2026-09-24 | **Signed-in entry has three states, not two** — a correctness rule, not a look: authenticated → shell; rejected session → sign-in (with the requested path remembered); identity service unreachable → an honest "can't confirm" screen. Collapsing the third into "signed out" would show a sign-in form that cannot work. |
| 2026-09-24 | **The account menu shows the contract `actorId`.** `Principal` carries no name or email, and adding one is a contract change — so the F-02 placeholder name was deleted rather than kept alongside it. |
| 2026-09-24 | **A stale workspace preference falls back to the first server-resolved workspace** instead of dead-ending on the generic denial. That denial stays reserved for a selector the *server* refuses (`system-ux.md` §2); no F-03 surface triggers it yet. |
| 2026-09-24 | **Next 16 file convention:** `middleware.ts` → `proxy.ts` (`export function proxy`), per the framework deprecation. `proxy.ts` was added to `tsconfig.app.json` so the fast typecheck target covers it too. |
| 2026-09-24 | **Gap — sample vs mine (`F-09` + contract):** `Workspace` carries `id`/`tenantId`/`name` only, so the switcher cannot separate a sample corpus without inventing data. `system-ux.md` §1/§2 still require sample-vs-mine as real data. |
| 2026-09-24 | **Gap — unreviewed screen:** the identity-unavailable entry screen is built from the stock `Empty` primitive with plain copy; no reference covers it, so it is flagged for `@user` rather than presented as designed. |
| 2026-09-24 | **Sign-in block built from `@user`'s reference.** The pending choice was resolved by a supplied shadcn-style login card, so the block was built rather than guessed. `/sign-in` now exists as a real route. |
| 2026-09-24 | **Unbacked controls render disabled, with a note — `@user`'s explicit choice over omitting them.** Social sign-in, "Remember this device", password recovery and account creation have no endpoint in `docs/api/openapi.yaml`, so they are `disabled` and each group says so in one short line. Enabling any of them is a contract change, not a frontend tweak. |
| 2026-09-24 | **No third-party assets in the sign-in block.** The reference loaded its logo and provider icons from `images.shadcnspace.com`; those became a Tabler mark and Tabler brand icons, because a runtime request to a host we do not control is the same problem the self-hosted fonts avoid. |
| 2026-09-24 | **The sign-in card title is the page `h1`.** `CardTitle` gained an optional `level` (default `3`, so existing cards are untouched) instead of shipping an `h1`→`h3` outline gap or a duplicate hidden heading. |
| 2026-09-24 | **Reference-exact utilities substituted where they are equal:** `min-h-dvh` for `min-h-screen` (mobile toolbars), `left-full` for `left-1/1` (both compile to `left:100%` — verified in the built CSS). |
| 2026-09-24 | **Two shadcn-registry defects fixed on copy-in (Checkbox).** The registry imports `cn` from an npm package and adds it as a dependency (removed — this project owns its `cn`); and its `disabled:` utilities can never match, because Base UI renders the control as `<span role="checkbox">` where `:disabled` does not apply, so the styling uses the `data-disabled` variant Base UI actually emits. |
| 2026-09-24 | **The sign-in checkbox is named with `aria-labelledby`, not `htmlFor` alone.** Base UI applies the consumer's `id` to its hidden native input, so an `htmlFor`-only label points at an `aria-hidden` element and leaves the visible control anonymous. |
| 2026-09-24 | **`bg-white/10` kept as a literal on the sign-in arcs.** The surface above is deliberately inverted (dark in both themes), so a light tint is needed in both; a token like `bg-foreground/10` would vanish into the surface it sits on. Same reasoning recorded in the block's comment. |
| 2026-09-24 | **F-03 closed.** Sign-in, sign-out, three-state session entry and selector semantics are all landed and green. Gaps handed on are recorded in the handoff archive (no sample marker on `Workspace`; the forbidden denial has no reachable trigger; no real-API sign-in smoke test; visual confirmation is `@user`'s). |
| 2026-09-25 | **Two `@user` review fixes.** (1) *Sign out did nothing — and neither did the theme-toggle item nor workspace picking.* All three were wired with `onSelect`, which is **Radix's** `DropdownMenu.Item` prop. This project's `base-nova` tier is Base UI, whose `Menu.Item` handler is `onClick`; the dead `onSelect` reached the item as a native DOM `select` handler on a `<div>`, which a click never fires. Fixed in `apps/web/app/(app)/nav-user.tsx` and `packages/ui/src/shell/workspace-switcher.tsx`, with a unit test pinning the item callback. The sign-out handler is **wrapped** (`onClick={() => onSignOut()}`) rather than passed through, so a click event is never handed to the server action as an argument it cannot serialise. (2) *The workspace switcher opened straight down over the nav.* Its content carried no `side`/`align`, so it inherited the `DropdownMenuContent` defaults (`bottom` / `start`) and dropped a panel across the sidebar list. It now mirrors `NavUser` — `side={isMobile ? "bottom" : "right"}`, `align="end"` — so both menus anchor identically out of the sidebar. `WorkspaceSwitcher` now reads `useSidebar`, so like `NavUser` it must sit inside a `SidebarProvider` (recorded in the block's JSDoc). |
| 2026-09-25 | **Gap — the social sign-in note is missing.** `packages/ui/src/shell/login.test.tsx` asserts *"Social sign-in isn't available yet."* and no such string exists in `login.tsx`, so `ui:test` carries one red test (confirmed pre-existing by re-running it against a stashed tree). The 2026-09-24 entry *"Unbacked controls render disabled, with a note"* is therefore only half-implemented: the disabled Google/GitHub buttons render with no explanation, while the account-creation/password-recovery group does carry its line. Restoring the sentence or amending the recorded choice is `@user`'s call, so it is left open rather than guessed. |

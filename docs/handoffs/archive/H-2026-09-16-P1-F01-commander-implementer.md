---
handoff_id: H-2026-09-16-P1-F01
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-01"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-09-16
---

# F-01 — Design tokens + shadcn primitives

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-01 exactly. Map D-01 tokens into packages/ui. Do not open F-02. Do not touch apps/api. Do not activate production AI. Do not overwrite docs/handoffs/current.md or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-*` only (this handoff = F-01).

Map D-01 design tokens into `packages/ui` (Tailwind 4 + shadcn/ui on
Base UI per ADR-0003). Establish dark mode via `next-themes` and Base UI
`Direction` as the single direction source. Refresh stale auth wording in
`docs/frontend/README.md` (ADR-0005 Spring sessions — not Better Auth).

D-01 is **accepted**. S-01a is **closed**. Do not invent tokens absent
from `docs/design/foundations/tokens.md`.

## Required Reading

1. `context.md` (read-only)
2. `docs/planning/implementation-tracks.md` (F-01 row; do not edit status
   tables beyond what Completion Instructions allow)
3. `architecture.md` §8 locale/direction
4. `AGENTS.md`
5. ADR-0001 §1–§5/§7, ADR-0002 (FE graph), ADR-0003, ADR-0004 (chrome only)
6. `docs/design/foundations/tokens.md`
7. `docs/design/components/inventory.md` (names + states — copy-in guide)
8. `docs/design/accessibility/a11y-and-rtl-readiness.md`
9. `docs/frontend/README.md`
10. This handoff

## Inputs / Evidence

- Design package: `docs/design/**` (Commander-accepted 2026-09-16)
- Scaffold: `apps/web`, `packages/ui|contracts|mocks` from S-01a
- Auth SoT: Spring Security sessions (ADR-0005); identity **port** only
  in the client

## Allowed Write Paths

- `packages/ui/**`
- `apps/web/**` only as needed for token / theme / Direction wiring stubs
- `docs/frontend/README.md` (auth wording refresh)
- `docs/memory/implementer.md` (durable lessons only)
- This file: status, Outcome; archive + rewrite rules in Completion

**Must not touch:** `apps/api/**`, `docs/api/**`, `docs/adr/**`,
`docs/design/**` (consume only), `packages/mocks` corpus authorship,
`packages/contracts` OpenAPI authorship, `docs/handoffs/current.md`,
`docs/handoffs/active/lane-backend.md`, `context.md`, `architecture.md`

## Out of scope

- Journey pages / app shell IA (F-02+)
- OpenAPI / SSE contracts (S-02 — backend)
- Mock corpus production (`packages/mocks` — backend)
- Production AI / provider SDKs
- AWS / DevOps I-*

## Deliverables

1. Token mapping in `packages/ui` aligned to
   `docs/design/foundations/tokens.md` (color/type/spacing/elevation/
   radius/motion; light + dark).
2. shadcn/Base UI primitives copy-in for inventory foundations without
   inventing IA.
3. `next-themes` dark mode wiring; Base UI `Direction` as single
   direction source; `lang`/`dir` preserved for `en` LTR.
4. Logical CSS only (except true exceptions); `bdi` hooks where
   identifiers will land.
5. `docs/frontend/README.md` auth wording updated to ADR-0005 sessions /
   identity port (no Better Auth library).
6. Outcome on this handoff.

## Constraints / Prohibited Decisions

- Do not invent tokens or components not in D-01 inventory
- Do not import provider SDKs into `apps/web` or `packages/ui`
- Do not claim RTL locale support
- Do not start F-02 in this handoff
- Do not author OpenAPI or Java ports

## Acceptance Criteria

- Tokens match `docs/design/foundations/tokens.md`
- Inventory foundation primitives are copy-in ready without inventing IA
- LTR-now + logical CSS + single `lang`/`dir` source preserved
- No provider SDK; no `apps/api` writes
- Auth docs no longer claim Better Auth as the implementation library
- Scaffold tests / typecheck for touched FE packages stay green

## Directionality / accessibility checks

- Primary locale `en`; single `lang`/`dir` source
- Logical CSS; Base UI `Direction` only
- Visible focus / contrast hooks not regressing scaffold
- `prefers-reduced-motion` respected for any motion tokens wired

## Stop / escalate conditions

- **Soft-stop:** After F-01 completes, do **not** open F-02 until
  Commander marks **S-02** ready on the backend lane / index. Set this
  file `status: blocked` with Outcome `waiting on S-02` if rewriting to
  F-02 is attempted early — prefer leaving F-01 completed and waiting
  for Commander to open F-02.
- **Hard-stop:** write-path collision with backend; pressure to reopen
  ADRs; production AI activation; claiming RTL locale shipped; inventing
  tokens not in D-01.

## Dependencies / Risks

- Depends on: D-01 (accepted), S-01a (closed)
- Blocks: F-02+ (also need S-02)
- Parallel: B-01 on backend — no mutual dependency
- Risk: inventing a second fixture authority — forbidden

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- UT-* remain unrun

## Completion Instructions

1. Implement F-01 deliverables inside Allowed Write Paths.
2. Append Outcome; set this file `status: completed`.
3. Archive a copy to
   `docs/handoffs/archive/H-2026-09-16-P1-F01-commander-implementer.md`
   (immutable).
4. **Do not** rewrite this path to F-02. Soft-stop: notify that the lane
   waits on **S-02**. Commander opens F-02 on `lane-frontend.md` when
   S-02 is ready.
5. Durable lessons only in `docs/memory/implementer.md`.
6. Do **not** update `context.md` or `current.md` unless Commander
   authorizes — prefer Outcome here for Commander integration.

---

# Outcome

**Status:** `completed` · **Outcome:** F-01 delivered. **Soft-stop — the
frontend lane now waits on `S-02`.** This lane head was intentionally **not**
rewritten to F-02.

**Branch / commit:** `F01-design-tokens-shadcn-primitives`, commit
`3fe453f` (not pushed; no PR opened — Commander/`@user` own remote flow).

## Files changed

Design system — `packages/ui/`

| Path | Purpose |
|------|---------|
| `src/styles/tokens.css` | **New.** The single D-01 token mirror: primitive scales, semantic shadcn + OmniDoc roles (light), `.dark` remap, Tailwind bridge, base layer, reduced-motion rule, logical/content utilities. |
| `src/styles/globals.css` | **New.** Only Tailwind v4 entry. Imports `tailwindcss` + `tokens.css` and registers UI-package source via `@source`. |
| `src/lib/utils.ts` | **New.** `cn()` (clsx + tailwind-merge) — the copy-in convention. |
| `src/components/*.tsx` | **New.** Button, IconButton, Input, Textarea, Label, Badge, Card, Separator, Skeleton, Spinner. |
| `src/providers/*.tsx` | **New.** `DirectionProvider` (Base UI), `ThemeProvider` (next-themes). |
| `src/styles/tokens.test.ts` | **New.** 112 assertions: every D-01 token name is present, both themes exist, dark is class-driven not media-driven, reduced motion is global, utilities exist, no physical-direction overrides. |
| `src/components/primitives.test.tsx`, `src/lib/utils.test.ts`, `src/providers/providers.test.tsx` | **New.** Behavioural state coverage for the copied-in tier. |
| `src/index.test.ts` | Rewritten: guards the public surface and asserts the S-01a placeholder stub is gone. |
| `src/test-setup.ts` | **New.** `matchMedia` stub (jsdom lacks it; `next-themes` needs it). |
| `package.json`, `tsconfig.lib.json`, `vitest.config.ts`, `components.json` | Deps (`@base-ui/react` 1.8.0, `lucide-react` 1.46.0, `next-themes` 0.4.6, cva/clsx/tailwind-merge), `exports` map for styles, jsdom + React 19 test setup, shadcn config. |

Application — `apps/web/`

| Path | Purpose |
|------|---------|
| `app/globals.css` | Imports the design-system entry; `.shell` re-expressed with D-01 layout tokens. |
| `app/layout.tsx` | Wraps the tree in `DirectionProvider` + `ThemeProvider`; `<html lang dir>` still read only from `./locale`. |
| `app/page.tsx` | Drops the removed `placeholderToken`; keeps a `<bdi class="od-isolate">` identifier-isolation example. |
| `next.config.mjs` | `transpilePackages: ["@omnidoc/ui"]` (the package ships TS source). |
| `postcss.config.mjs` | **New.** `@tailwindcss/postcss`. |
| `components.json` | **New.** Identical `style`/`iconLibrary`/`baseColor` to `packages/ui`; empty Tailwind config key (ADR-0003). |
| `package.json` | Links `@omnidoc/ui`, adds Tailwind toolchain. |

Documentation — `docs/frontend/README.md`: added an **Auth / session** row
(identity **port**; implementation is Spring Security HTTP-only sessions per
ADR-0005 — **not** Better Auth) plus a day-to-day note forbidding an auth
library in the frontend graph; added a note that tokens/tailwind entry live in
`packages/ui`; corrected stale "F-01+" scaffold and "collect design-token
input" wording.

Not changed: `context.md`, `current.md`, `architecture.md`, `docs/adr/**`,
`docs/design/**`, `docs/planning/**`, `apps/api/**`, `packages/contracts`,
`packages/mocks`, `docs/handoffs/active/lane-backend.md`.

## Verification (all commands actually run)

| Check | Command | Result |
|-------|---------|--------|
| Typecheck, lint, test, build (FE graph) | `pnpm exec nx run-many -t lint typecheck test build --projects=ui,web,contracts,mocks --skip-nx-cache` | **13/13 tasks pass** |
| UI tests | `nx run ui:test` | **121 passed** (5 files) |
| Production CSS | inspect `apps/web/.next/static/**/*.css` | tokens + utilities confirmed below |

Compiled-CSS evidence (the D-01 bridge is real, not just declared):

- `.rounded-md{border-radius:var(--od-radius-md)}` — radius roles override
  Tailwind defaults as intended.
- `.bg-background{background-color:var(--background)}`,
  `.bg-destructive{background-color:var(--destructive)}` — shadcn variable
  contract is live.
- `.text-od-h3{font-size:var(--od-text-h3);line-height:…;font-weight:…}` —
  D-01 type scale emits as utilities with the split size/leading/weight.
- `.shadow-od-1{--tw-shadow:var(--od-elevation-1);…}`,
  `.ease-standard{…var(--od-ease-standard)}`.
- `.ps-3{padding-inline-start:calc(var(--spacing) * 3)}` — **logical**, not
  `padding-left`.
- `.od-inline-full{inline-size:100%}` — logical inline sizing.
- `aria-invalid\:border-destructive[aria-invalid=true]{border-color:var(--destructive)}`
  — error styling is attribute-driven, so visual and a11y state cannot drift.
- Global reduced-motion rule plus `.motion-reduce\:animate-none`.
- `.dark{…}` remap intact, and `@custom-variant dark` declared inside the
  *imported* `tokens.css` does register globally — verified by building once
  with a temporary `dark:bg-background` probe
  (`.dark\:bg-background:where(.dark,.dark *){background-color:var(--background)}`),
  then reverting the probe.

Directionality / accessibility checks:

- Single `lang`/`dir` source: `apps/web/app/locale.ts` → `layout.tsx` only.
  `DirectionProvider` sets no DOM `dir` (asserted by test).
- Logical CSS only; no physical `left`/`right` insets, no `[dir="rtl"]`
  overrides (asserted by the token-mirror test).
- Focus is never removed; the token layer owns one `:focus-visible` ring with
  a 2px offset, so no component can ship an invisible focus state.
- `IconButton` requires an accessible name **by type**; `Spinner` keeps an
  accessible name in both motion states; `Skeleton` is `aria-hidden` and
  static; `Badge` documents icon+text and never colour-only.
- Skeleton/Spinner reduced-motion states covered by tests.
- Manual keyboard/contrast spot-checks were **not** run in a browser: the only
  rendered surface today is the scaffold stub, which has no interactive
  controls. Recorded as expected-not-run rather than claimed.

Backend isolation / OpenAPI checks: **N/A** — `lane: frontend`; no
`apps/api`, contract, or provider touch. ArchUnit/OpenAPI checks belong to the
backend lane.

## Deliberate scope decisions (for Phase Check review)

1. **`@theme inline` bridge added.** Tailwind only generates utilities from
   fixed namespaces, so D-01 roles are re-exposed as strict 1:1 aliases. It
   introduces **no** new value and **no** new role; a comment states this.
2. **Three D-01 rows were decomposed mechanically.** Two-value or
   three-value rows cannot each live in one custom property, so they were
   split and labelled as such in the CSS: type roles → size/leading/weight;
   D-01 §4 sidebar → `--od-layout-sidebar` + `--od-layout-sidebar-rail`.
3. **Contrast for `success`/`warning`/`info` badges.** D-01 defines no
   foreground pairing for those ramps, so the variants keep `--foreground`
   text on a 10% tint and carry status through border + icon + label. Inventing
   an unverified text-on-status pair was rejected. `danger` uses D-01's own
   explicit `--destructive`/`--destructive-foreground` pair.
4. **No new React components beyond inventory §3.** The `bdi` requirement is
   met with the documented `od-isolate` utility plus the native `<bdi>`
   pattern, so inventory §12's "do not invent components" rule is respected.
5. **React pinned to 19.2.7 in `packages/ui` devDependencies** to match
   `apps/web`. Using the ledger's 19.3.0 there would have produced two React
   copies in the app bundle. Also deduped `@types/react` to the root's 19.3.0
   (a second copy auto-included via root `node_modules/@types` was breaking
   typecheck).

## Gates — unchanged

- Production AI / provider activation: **still gated**, no provider SDK was
  introduced (boundary lint still green).
- RTL locale: **still deferred, not closed.** No RTL claim was added to any
  copy or doc; only readiness discipline.
- UT-1…UT-22: still unrun hypotheses.
- No secret, BYOK key, or provider credential was added. Nx Cloud stays off.

## Bounded gaps returned to Commander (not silently dropped)

1. **Storybook state coverage is not in place.** ADR-0003 pins Storybook
   10.6.0 and inventory §12 requires every state in a component's row to exist
   as a story. Storybook is **not installed** and no handoff authorized
   setting it up, so F-01 lands components + behavioural tests but **not** the
   story surface. Recommend Commander decide whether Storybook scaffolding is
   its own `shared` slice before the journey F-* tickets accumulate more
   components.
2. **The remaining inventory §3 rows are deferred on purpose** (Select,
   Combobox, Popover, Tooltip, Sheet, Dialog, AlertDialog, DropdownMenu, Tabs,
   Avatar, ScrollArea, Checkbox, RadioGroup, Switch, PasswordInput, FieldHint,
   Kbd). `components.json` is configured so each F-* slice can copy them in via
   the same path. Not a defect — a documented boundary.
3. **Tailwind token tree-shaking is real.** Unused `@theme` variables are not
   emitted (e.g. `--od-measure-reading` today). Utilities resolve correctly
   once used, but a future hand-rolled raw-CSS consumer that references an
   unused token could get an undefined variable. Worth a Phase Check note.

## Next action

**Commander** — this lane is soft-stopped on **S-02** (backend-authored
canonical HTTP/OpenAPI/SSE contracts). When S-02 is ready, open **F-02** on
this same path (`docs/handoffs/active/lane-frontend.md`). Do not treat this
completed F-01 head as an F-02 assignment.

Suggested Commander handoff to open:

```text
task: "F-02" — App shell, nav, locale, honest workspace switcher
depends on: F-01 (done) + S-02
lane: frontend · to: implementer
write path: apps/web (shell), packages/ui (shell primitives per inventory §1–§2)
```

Cursor start command for the next frontend session (once F-02 is opened):

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute it exactly.
```

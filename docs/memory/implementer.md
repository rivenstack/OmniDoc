# Implementer Memory

## Durable Responsibilities

- Implement only bounded handoff deliverables for the assigned **`lane:`**
- Stay behind approved ports and mocks until production adapters are
  authorized
- Keep changes reproducible and upgrade-safe
- OmniDoc is **polyglot**: Next.js FE (ADR-0001/0002/0003) + Java 21 /
  Spring Boot API (ADR-0005). Do not treat the agent as FE-only or
  “stack-agnostic pending ADR-0001”

## Recurring Checks

- Read handoff `lane:` and Allowed Write Paths before writing
- Logical CSS / LTR-now / RTL-readiness and accessibility acceptance in
  UI work
- Backend: ArchUnit, RLS/`NOBYPASSRLS`, tenant GUC on same connection,
  no Spring AI types on the wire, production adapters dark
- Do not close OQ/production gates from implementation alone
- Prefer evidence-backed extensions behind adapters over ad-hoc custom
- Never commit secrets, `.env` values, or BYOK keys
- Free Tier CI minutes constrain Testcontainers / dual CI intensity

## Durable Lessons

Task-specific detail lives in the archived handoff
(`docs/handoffs/archive/`), not here. Keep entries short and reusable by
a future session with a **different** task.

- Write only Allowed Write Paths; never touch `context.md` / `current.md`
  / sibling agents' trees. Two parallel `/implementer` sessions are OK
  when `lane` and write paths differ.
- Ignore secret-bearing local MCP overrides; keep tracked
  `.cursor/mcp.json` non-secret.
- Canonical product name is **OmniDoc**; remote
  `https://github.com/rivenstack/OmniDoc.git` (`main`). Never claim CI
  exists until configured.
- Do **not** scaffold Node `apps/api` or Better Auth; domain ports are
  Java interfaces in `apps/api` (ADR-0005). Stack pins live in the ADRs —
  do not restate them here.
- After Architect rewrites `architecture.md`, refresh onboarding docs in
  the same wave — stale wording is a defect (DEF-001 class).
- Fixture work cross-references `architecture.md` §9, never forks a
  second fixture authority. Answer-port `no_supported_answer` /
  `refused_policy` are success states; tenant isolation holds at
  retrieval time.
- pnpm 12 ignores the `pnpm` key in `package.json` — build approvals
  (`allowBuilds:`) live in `pnpm-workspace.yaml`.
- Keep `@types/react` / `react` / `react-dom` on the root's exact version
  everywhere (including UI devDeps) or duplicate-React/type errors follow.
- Keep Nx cache under `node_modules/.cache/nx` and per-app ignores inside
  the app (e.g. `.gradle/`, `storybook-static/`) rather than editing the
  root `.gitignore`/flat config outside Allowed Write Paths.
- `@nx/enforce-module-boundaries`: `bannedExternalImports` /
  `allowedExternalImports` are per-`depConstraint`; the rule bails
  silently on uninstalled imports. Flat eslint: base+typescript suffices
  for boundary-only lint.
- Verification: scope FE `nx run-many` to JS projects
  (`ui,web,contracts,mocks`) — `api:*` needs a Java toolchain that is
  another lane's problem.
- Copy-in UI package wiring: `@source` globs inside the CSS entry +
  `transpilePackages: ["@omnidoc/ui"]`; contracts codegen writes
  `packages/contracts/src/generated/openapi.ts` (never hand-edit); the
  canonical HTTP SoT is `docs/api/openapi.yaml`, not generated TS.
- Storybook for a copy-in TS UI package uses `@storybook/react-vite` (not
  `nextjs`); Tailwind v4 needs `@tailwindcss/vite` in `viteFinal`; never
  add a second token/CSS entry. No pseudo-states addon in 10.6.0 — render
  hover tokens directly; reduced motion via a Storybook-only harness
  class on `documentElement`, kept out of product CSS.
- Base UI: `Tooltip.Trigger` has no `nativeButton`; `Menu.Trigger` /
  `Dialog.Close` must render `ref`-forwarding elements or popup placement
  breaks. `Dialog.Popup` traps focus, escapes, and restores focus. Focus
  assertions need a short wait after open.
- A `<header>` inside `<main>` still resolves as a `banner` landmark —
  `PageHeader` uses `<div>`; a regression test enforces exactly one
  `banner`.
- Cheap drift guards that catch real regressions: source-discipline tests
  (logical-CSS-only, no component-set `dir`, every `transition-` paired
  with `motion-reduce:transition-none`).
- **Dead Tailwind classes are silent.** `inset-inline-0` and
  `border-inline-end` are CSS *property* names, not utilities — Tailwind
  emits no rule, nothing warns, and the element just loses its anchoring or
  its separator. The logical names are `start-*`/`end-*` and
  `border-s`/`border-e`. Grep the compiled CSS for a class before believing
  it works; a source-discipline test now fails on that whole family.
- **A `fixed` element with no inline anchor is not full-width.** It
  shrink-wraps and sits at its static position. Always assert both inline
  edges (`start-0` + `end-0`) rather than eyeballing a screenshot.
- **Base UI animates only what its state attributes select.** A
  `transition-*` class with no `data-[starting-style]`/`data-[ending-style]`
  rule compiles fine and does nothing — opacity stays pinned and the surface
  pops in and out. The class list looks correct, so only a live frame sample
  catches it. Anchored menus also want `origin-[var(--transform-origin)]`.
- **`grid-template-columns` is animatable** when both track lists
  interpolate (`15rem 1fr` ↔ `3.25rem 1fr`); a bare track swap otherwise
  reflows the whole shell in one frame.
- **Overflow direction decides alignment.** When an item is wider than its
  content box, a block-level item overflows toward `inline-end` only while a
  flex-centred sibling splits the overflow across both sides — so two
  controls meant to share an inline line sit a pixel or two apart. Centre
  both the same way instead of tuning padding.
- **Nav lists must not duplicate a dedicated action.** If the shell renders
  a capture control from a slot, the nav data must not also list it —
  `mobileNav` filtered it and the sidebar did not, which produced two
  identical buttons and two identical rail icons. Keep the spine data-only.
- **Split JSX out of modules you want to unit-test in `apps/web`.** The
  app's test transform cannot parse JSX (`jsx: "preserve"` for Next; Vite
  8's SSR transform rejects it and `esbuild: { jsx }` does not override it).
  A `.ts` module for structure plus a `.tsx` module for icons keeps the
  rules testable without touching test config.
- Correct repository docs that teach a defect:
  `docs/frontend/README.md` listed `border-inline-end` as the logical border
  utility, i.e. it was the source of the dead class.
- jsdom has no `matchMedia` (stub via `setupFiles`); RTL auto-cleanup
  needs vitest globals, else call `afterEach(cleanup)`. Under Vitest 5
  `import.meta.url` is not `file:` — use `path.join(process.cwd(), …)`.
- `apps/web/next-env.d.ts` flips between `.next/dev/types/*` and
  `.next/types/*` after `next build` — `git checkout --` it to keep
  diffs intentional. Integrated-browser screenshots can be stale right
  after `setViewportSize`; trust DOM measurements / the a11y snapshot.
- **`tailwind-merge` only knows Tailwind's default scales.** Custom role
  utilities (`text-od-body-sm`, `text-od-micro`, …) are classified as
  *colours*, so they collapse against a real colour (`text-od-text-secondary`)
  and the last one wins — the size is silently dropped with no build error.
  The class list is wrong at *composition* time, so grepping the compiled CSS
  or the DOM still shows the size rule exists; only reading the rendered
  `class` attribute reveals the loss. Extend the merge config
  (`extendTailwindMerge`) and unit-test the merge, not just the utility.
- **Collapse should animate the item's own box, not swap snapped classes.**
  Animate the shell's grid track and give each nav item `w-full` so it follows
  the track, plus `transition-[width,padding,gap]` and a label that fades
  (clipped, never `sr-only`). Swapping `size-10` ↔ `h-10 ps-3` in one frame
  makes the items jump while the track is still moving. Size the rail square
  with padding (`w-9` + `px-2.5` around a `1rem` glyph) so centring does not
  depend on a `justify-center` that fights the label's flex growth.

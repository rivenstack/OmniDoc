# ADR-0003 — Frontend Application Toolchain

- **Status:** `accepted` (accepted by `@user` 2026-09-14)
- **Date:** 2026-09-14
- **Deciders:** Architect records; `@user` decided each item
- **Related:** ADR-0001 §1 (Next.js 16.3.5), ADR-0002 (Nx workspace),
  `docs/research/version-ledger.md` (pins)
- **Scope:** application-level front-end libraries. Workspace tooling is
  ADR-0002; framework and editor are ADR-0001.

---

## Context

ADR-0001 chose Next.js but left the ordinary application-level choices
open — styling, component layer, data/state, testing, and supporting
libraries. Those decisions were previously listed as "still undecided"
in `docs/frontend/README.md` (component library, styling approach,
client state management, test runner / e2e tooling). `@user` decided
them on 2026-09-14 during research review; this ADR records them with
the exact pins and the reasoning, and states what is deliberately
deferred.

Every version below is from `docs/research/version-ledger.md`
(verified 2026-09-14). Licenses were checked at pin time.

---

## 1. Styling and component layer — **decided**

**Tailwind CSS 4.3.3 (MIT) + shadcn/ui CLI 4.21.0 (MIT) on Base UI
`@base-ui/react` 1.8.0 (MIT).**

**Why this combination**

- shadcn/ui is a **copy-in** distribution, not a runtime dependency: the
  component source lands in `packages/ui` and is owned by the project
  (ADR-0002). That fits "Extension-First, reuse-before-custom" without
  introducing a component-library lock-in or a styling runtime.
- **Base UI is shadcn/ui's default base as of July 2026** ("Base UI as
  the Default", ui.shadcn.com changelog), built by the same authors as
  Radix. It is at 1.8.0 — released, MIT, and the path new projects are
  pushed toward, not a preview.
- **RTL-readiness becomes structural, not textual.** Base UI ships a
  direction provider (shadcn exposes it as the `Direction` component)
  and Tailwind's logical utilities are the default way to write spacing
  and sizing. That gives the repo's single-`dir`-source rule a real
  home, instead of a rule repeated in prose.
- Component chrome is app-owned, which matches the a11y ownership the
  editor brief already assigns to the implementer (REC-11) — no library
  is treated as supplying WCAG compliance.

**Alternatives considered**

| Option | Why not chosen |
|--------|----------------|
| Radix (`radix-ui` 1.6.7) | Still fully supported by shadcn and battle-tested for years. Lost on being the previous-generation base now that Base UI is the default and actively developed by the same authors. Retained as the **documented fallback** if Base UI interaction semantics or a11y behaviour fight our release bar. |
| React Aria (shadcn `--base aria`; `react-aria-components` 1.21.1) | The strongest accessibility pedigree of the three and available as a first-class shadcn base. Lost on heavier API surface and a third registry base to maintain for a solo build. **Fallback if the a11y bar cannot be met on Base UI.** |
| Mantine 9.6.1 | Fastest path to a polished app, batteries included. Lost because it owns styling and componentry as a dependency rather than as copied source, weakening the ownership/extension posture and duplicating Tailwind. |
| Tailwind alone, hand-written primitives | Maximum control. Lost on cost: re-implementing accessible dialogs, comboboxes, and menus is not a good use of a solo budget, and it is exactly what the Extension-First rule says to avoid. |

**Configuration requirements (from shadcn's monorepo guidance)**

- One `components.json` per workspace that installs components:
  `apps/web` and `packages/ui`.
- Identical `style`, `iconLibrary`, and `baseColor` in both files.
- **Tailwind v4: leave the `tailwind` config key empty** in
  `components.json`.
- Shared components import from the UI package alias (shadcn's default
  is `@workspace/ui`; this repo uses the `@omnidoc/ui` scope) via
  `package.json#imports`.
- Deviation to watch: shadcn's scaffolder assumes **Turborepo**, not Nx
  (ADR-0002). Take its conventions, never let `shadcn create` rewrite
  the Nx workspace config.

---

## 2. Data fetching and client state — **decided**

**React Server Components + Server Actions first. Zustand 5.0.15 (MIT)
for editor and local UI state only. No client cache library in v1.**

**Why**

- The server is where project-owned ports and adapters live
  (`architecture.md` §1, §5). Keeping data access on the server keeps
  provider SDKs structurally out of the browser and makes the ports-only
  invariant enforceable (ADR-0002), rather than a rule the client is
  trusted to respect.
- A client cache layer would duplicate server-side caching semantics for
  an app whose primary surface (the editor) is local-state-heavy anyway.
- **Scope limit on Server Actions:** they may call project-owned ports /
  route handlers only. No Server Action may call an embedding, LLM,
  vector, or storage provider directly, and none may be passed to the
  client as a provider proxy.

**Deferred, not rejected**

- **TanStack Query 5.102.8 (MIT)** — adopt only when a concrete client
  cache need appears (long list virtualization, offline/edit-while-
  offline, optimistic multi-surface updates). Revisit with evidence, not
  pre-emptively.
- Server Actions are not a substitute for the canonical API contract:
  `docs/api/` remains the authority for request/response/stream shapes
  (API-contract skill), and Actions call into it like any other client.

---

## 3. Testing and accessibility tooling — **decided**

**Vitest 5.0.0 + Testing Library 16.3.3 + Playwright 1.63.0 +
`@axe-core/playwright` 4.13.0 + MSW 2.15.0 + Storybook 10.6.0
(`@storybook/nextjs`).**

| Layer | Tool | Role |
|-------|------|------|
| Unit / integration | Vitest 5.0.0 | Component and port-adapter logic; jsdom/happy-dom environment; native ESM and TS |
| Component assertions | Testing Library 16.3.3 | Behavioural queries (roles/labels), not implementation detail |
| Port mocks | MSW 2.15.0 | Deterministic fixtures per `architecture.md` §9, including `no_supported_answer` / `refused_policy` / `partial` / `conflict` as **success** states |
| E2E | Playwright 1.63.0 | The four journeys (capture, organize, retrieve, ask) on a real build |
| Accessibility gate | `@axe-core/playwright` 4.13.0 (**MPL-2.0**) | Automated a11y assertions in E2E; supplements, never replaces, manual keyboard/focus checks |
| Component docs | Storybook 10.6.0 | Visual states per journey, interaction tests, and the Designer↔Implementer handoff surface |

**Why not Jest + Cypress:** Vitest 5 shares the Vite/TS toolchain already
implied by the ecosystem and avoids a second transform pipeline; Jest
+ Cypress means two legacy-shaped configs to maintain for no capability
gain here. Playwright's a11y integration is also what makes the release
gate (accessibility as a *gate*, per `docs/frontend/README.md` §4)
mechanically checkable.

**Accepted cost:** Storybook is real upkeep for a one-person project.
It is accepted because this repo has a Designer role producing
implementation-ready specs and a documented UI-state inventory — the
component catalogue is the cheapest place for that to live.

---

## 4. Supporting libraries — **decided (defaults)**

These were presented as defaults and not objected to; they are recorded
so implementers stop re-deciding them.

| Concern | Pin | Note |
|---------|-----|------|
| Forms | react-hook-form 7.88.0 (MIT) | Uncontrolled-first; fits editor-adjacent forms |
| Validation | Zod 4.6.5 (MIT) + `@hookform/resolvers` 5.9.1 | One schema vocabulary shared with the `docs/api/` contract layer |
| Markdown / note render | react-markdown 10.1.0 + remark-gfm 4.0.1 + **rehype-sanitize 6.0.0** | Sanitization is a mandatory architecture control (`architecture.md` §6) — note content is untrusted UGC. Applies to the markdown projection of the note SoT (ADR-0001 §2). |
| Code highlighting | Shiki 4.4.3 | Server-side rendering of fenced code; no client highlight payload |
| Icons | lucide-react 1.46.0 (ISC) | Matches shadcn's default icon library |
| Theming | next-themes 0.4.6 | Dark mode; pairs with Tailwind v4 tokens |
| Lint / format | ESLint 10.10.0 (flat config) + Prettier 3.9.6 | Stylelint (logical-property rule) to be added with the RTL-readiness work |
| i18n | **none yet** | `en` only. One `lang`/`dir` source at the root layout; next-intl 4.14.5 enters only if RTL locale is actually scheduled |
| Answer streaming | Vercel AI SDK 7.0.99 — **server adapter only** | Never in the client bundle; it must sit behind the answer port like any other provider-facing code |

---

## Consequences

**Liked**

- Every layer is copy-in or MIT/ISC/MPL and swappable behind the layout
  in ADR-0002; nothing here creates a vendor runtime dependency.
- RTL-readiness gains a structural home (Base UI direction provider +
  logical utilities) instead of another policy paragraph.
- The a11y release gate becomes automatable (axe in Playwright + axe in
  Storybook) while staying explicitly manual for keyboard and focus.

**Disliked / accepted costs**

- **Base UI is younger than Radix.** 1.8.0 is the current line, but it
  has not had Radix's decade of production exposure. Mitigation: the
  Radix fallback is one registry base away, and component source is
  ours to edit.
- **Copy-in components are a maintenance surface.** Upgrades mean
  re-running the CLI/registry and reconciling local edits, per
  component, forever. Accepted in exchange for ownership.
- **No client cache in v1** means any future client-side cache need is a
  deliberate addition, not a default that quietly accumulates.
- **Storybook upkeep** for a solo project (see above).
- **Tailwind v4's config-in-CSS** model plus the empty `tailwind` key in
  `components.json` is a foot-gun for anyone used to v3; document it
  where the config lives.

---

## RTL-readiness hooks (not a locale commitment)

`en` (LTR) remains the only shipped locale and RTL stays **deferred, not
closed** (ADR-0001 standing gate). This ADR does not create a new RTL
plan; it records the concrete hooks this toolchain now provides so the
existing discipline is cheap to keep:

- Base UI / shadcn `Direction` provider = the single direction source.
- Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `inline-*`)
  as the layout default; no broad `[dir="rtl"] *` overrides.
- `bdi` wrapping for identifiers, URLs, code tokens, and UGC fragments.

**Unknown to PoC:** Base UI's behaviour under mixed-BiDi content and its
RTL component semantics are **not verified by this project**. That is a
PoC item for whichever phase brings RTL forward — do not claim RTL
support on the strength of the provider existing.

---

## Verification

1. A clean `pnpm install` + `nx run-many -t typecheck lint test` passes
   with the ADR-0002 boundary rules active.
2. Bundle inspection confirms no provider SDK, no server-only secret
   path, and no AI SDK in the `apps/web` client graph.
3. Playwright + axe runs on the four journeys; keyboard-only pass on the
   editor shell and Ask/citation controls.
4. MSW fixtures reproduce their answers deterministically across runs.
5. A sanitization test proves a hostile markdown payload cannot execute
   through the note render path.
6. Falsify the styling decision if Base UI cannot meet the a11y bar at
   acceptable cost — swap the registry base to Radix or React Aria
   (component source is owned, so this is a bounded change, not a
   rewrite).

---

## References

- `docs/research/version-ledger.md` — pins, licenses, verification dates
- ADR-0001 — framework, editor, note source of truth
- ADR-0002 — workspace layout, boundary enforcement, `packages/ui`
- `docs/frontend/README.md` — contributor contract (non-negotiables)
- `architecture.md` §1, §5, §6, §9
- shadcn/ui — Base UI default changelog (July 2026), monorepo guide
- `quality/ui-qa-checklist.md`

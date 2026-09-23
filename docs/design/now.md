# Now — UI plan

**Living page.** Edit this during the build. Keep it short.
**Updated:** 2026-09-23

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

**F-01 remake — done 2026-09-23 (branch `F01-ui-remake`).** The F-01
primitives were rebuilt on the current shadcn v4 (`base-nova`, Base UI)
sources, the icon library moved to Tabler, and the token layer was retuned
to the **Mintlify** design language. `/kit` is the visible proof. F-02
(shell) is the next step and keeps its reference protocol: UI details stay
open, one reference per visual block. Live head:
`docs/handoffs/active/lane-frontend.md`.

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

## Open choices

None for the current slice. Next screen, placement, and motion stay open
until a product screen is actually next.

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

# Now — UI plan

**Living page.** Edit this during the build. Keep it short.
**Updated:** 2026-09-22

Choose here. Do not wait for a finished mock to review.

## Authority

| Question | Read |
| --- | --- |
| What must the API and data honor? | [`system-ux.md`](./system-ux.md) |
| What are we building now? | This file |
| How should it look? | Stock shadcn until you supply references and choose a language |
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

**F-02 — app shell + navigation** (next step in the F-01→F-11 sequence,
reopened 2026-09-23 under this system): structure and behavior from
`system-ux.md`; UI details stay open — the implementer asks you for a
reference (link / pasted code / prompt, image welcome) before building
each block. Live head:
`docs/handoffs/active/lane-frontend.md`.

**Landed 2026-09-22:** `/kit` in `apps/web` — stock primitives on one
page (buttons, fields, badges, card, skeleton, spinner, theme switch).
No shell, no journeys. Run `pnpm nx run @omnidoc/web:dev` and open
`/kit`.

**Already in the repo (F-01):** `packages/ui` has a token file and a few
shadcn primitives (button, input, badge, card, and related). The token
values are the current shadcn-ish skin, not a lock. Retuning them is
exactly how a chosen design language lands later.

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

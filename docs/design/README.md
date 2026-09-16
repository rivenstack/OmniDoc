# OmniDoc — Design Package (D-01)

**Owner:** `/designer`
**Handoff:** `H-2026-09-14-P1-D01` (`docs/handoffs/current.md`)
**Lane:** `frontend`
**Status:** implementation-ready specs (last planning deliverable,
2026-09-16)
**Locale scope:** primary `en` (LTR) only. RTL / mixed-BiDi is
**deferred, not closed** — these specs define **readiness discipline**,
not shipped RTL support.

This package turns **accepted UX research** (`REC-01…REC-19`) and
**accepted architecture** (`architecture.md` ports, §4 answer states,
§8 locale, §9 fixtures, §5.9–§5.11 dual-mode) into an
implementation-ready visual and interaction system for
Next.js 16 + Tailwind 4 + shadcn/ui on Base UI (ADR-0002/0003).

It contains **no application source**. Tokens, component names, and state
tables are specifications for the Implementer to copy into
`apps/web` / `packages/ui` under a later handoff.

---

## What this package is / is not

| Is                                                   | Is not                                                  |
| ---------------------------------------------------- | ------------------------------------------------------- |
| Specification of tokens, components, layouts, states | `apps/` or `packages/` source code                      |
| Traceable to REC-01…REC-19 and architecture ports    | New customer findings or conversion claims              |
| A visual system for the accepted stack               | A new stack, provider, or hosting choice                |
| Definition of a11y / RTL-readiness **gates**         | Certification of WCAG conformance or RTL shipping       |
| Implementation-ready states for journeys + dual-mode | Enterprise billing, SSO walls, or collab-editing chrome |
| Honest at minimal year-1 tenancy (n≈1–few)           | Fake enterprise org charts / seat theatre (REC-18)      |

Every UT-* referenced is an **unrun hypothesis**, not a finding. Nothing
here closes the production-AI gate, the RTL locale gate, or any `@user`
gate.

---

## Read order

| #   | Document                                                                               | Purpose                                                                                                             |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | [`foundations/tokens.md`](./foundations/tokens.md)                                     | Color, type, spacing, elevation, radius, motion tokens → Tailwind v4 + shadcn; dark mode; single `Direction` source |
| 2   | [`foundations/content-and-voice.md`](./foundations/content-and-voice.md)               | Microcopy system: mode × corpus labels, failure copy, refusal copy, honest limits                                   |
| 3   | [`shell/app-shell-and-navigation.md`](./shell/app-shell-and-navigation.md)             | Authenticated shell, nav, workspace/org switcher, responsive behavior                                               |
| 4   | [`journeys/capture.md`](./journeys/capture.md)                                         | Write-first TipTap capture, paste, import, save confidence (REC-01/02)                                              |
| 5   | [`journeys/organize.md`](./journeys/organize.md)                                       | Light optional structure, inbox, tags/folders (REC-03)                                                              |
| 6   | [`journeys/retrieve.md`](./journeys/retrieve.md)                                       | Search, snippets, lists, trust cues                                                                                 |
| 7   | [`journeys/ask.md`](./journeys/ask.md)                                                 | Ask + passage-level citations + refusal/partial/conflict (REC-04/05/10)                                             |
| 8   | [`dual-mode/mode-corpus-and-usage.md`](./dual-mode/mode-corpus-and-usage.md)           | Runtime-mode × corpus labelling, usage strip (REC-13/15/17)                                                         |
| 9   | [`dual-mode/cookbook-wizard.md`](./dual-mode/cookbook-wizard.md)                       | Chapter-based BYOK cookbook (REC-14)                                                                                |
| 10  | [`dual-mode/failure-states.md`](./dual-mode/failure-states.md)                         | Mode-naming failure copy, no silent fallback (REC-16)                                                               |
| 11  | [`states/empty-loading-error-indexing.md`](./states/empty-loading-error-indexing.md)   | Empty / loading / error / indexing-progress states                                                                  |
| 12  | [`states/sample-vs-mine.md`](./states/sample-vs-mine.md)                               | First-class corpus ownership labelling (REC-08/17)                                                                  |
| 13  | [`accessibility/a11y-and-rtl-readiness.md`](./accessibility/a11y-and-rtl-readiness.md) | Focus, keyboard, labels, contrast, reduced motion, logical CSS, `bdi`                                               |
| 14  | [`components/inventory.md`](./components/inventory.md)                                 | `packages/ui` component inventory (names + states only)                                                             |
| 15  | [`traceability.md`](./traceability.md)                                                 | REC ↔ architecture port ↔ spec ↔ QA-check mapping                                                                   |

---

## Non-negotiable design rules

1. **UI never calls providers.** All data arrives through project-owned
   ports; the client implies no provider SDK.
2. **`en` LTR is the only shipping locale.** Single `lang`/`dir` source;
   logical CSS; `bdi` for identifiers/keys/URLs/usage IDs/UGC fragments.
   Never claim RTL is available.
3. **Refusal is a success state, not an error.** `supported`,
   `partial`, `no_supported_answer`, `conflict`, `refused_policy` are
   first-class answer outcomes (`architecture.md` §4).
4. **No citation is preferred to a mismatched citation.** Citations are
   passage-level and entailment-honest (REC-04, architecture §4).
5. **Mock-first.** First-run and the 60-second portfolio path use the
   labelled sample + mock Ask. Live AI is a labelled upgrade, never the
   first-run prerequisite (REC-08, REC-13).
6. **Honest at n≈1.** Solo workspace chrome over simulated enterprise
   scale (REC-18).
7. **Never imply zero retention.** Privacy copy matches the accepted
   ~30-day abuse-log posture — no ZDR chrome (REC-17).
8. **Accessibility is a gate.** Focus, keyboard, labels, contrast,
   reduced motion are part of the design bar, not a polish pass.
9. **AI answers are not auto-written to the corpus.** Saving an answer as
   a note is explicit and labelled "AI-generated" (REC-06).
10. **Extension-first.** Prefer shadcn/Base UI primitives over custom
    components; do not require unmaintainable custom code.

---

## Stack mapping summary (accepted — do not re-open)

| Concern                | Accepted choice                                                     | Design consequence                                                      |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Framework              | Next.js 16.3.5 App Router (ADR-0001 §1)                             | Server-first shell; client components only for editor/UI state          |
| Editor                 | TipTap 3.31.3, ProseMirror JSON SoT (ADR-0001 §2)                   | Capture spec targets a real rich-text surface, not a textarea           |
| Styling / components   | Tailwind 4.3.3 + shadcn/ui on Base UI 1.8.0 (ADR-0003)              | Tokens are CSS custom properties; components copy-in to `packages/ui`   |
| Theming                | `next-themes` 0.4.6 (ADR-0003)                                      | Light + dark token parity required                                      |
| Direction              | Base UI `Direction` provider (ADR-0003)                             | Single direction source — no per-component `dir` overrides              |
| Data / state           | RSC + Server Actions; Zustand for editor/UI state (ADR-0003)        | Loading/streaming states are server-driven; no client cache assumptions |
| Markdown / code render | react-markdown + remark-gfm + **rehype-sanitize**; Shiki (ADR-0003) | Note/citation previews are sanitized; code is server-highlighted        |

---

## What this package does **not** decide

- Provider, host, or model selection (Architect / Researcher).
- Key storage or proxying internals (Architect; §5.9 vault).
- Retrieval algorithm, chunking, or embedding strategy.
- Closing the production-AI or RTL-locale gate (`@user` / Commander).
- Any UT-* result — all remain unrun.

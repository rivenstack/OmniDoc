---
handoff_id: H-2026-09-14-P1-D01
affinity: design
track: main
status: completed
phase: "1"
task: "D-01"
lane: frontend
from: commander
to: designer
created: 2026-09-14
---

# D-01 — Visual System and Journey UI Specs

## Start Command

```text
/designer Read docs/handoffs/current.md and execute D-01 exactly. Produce implementation-ready visual system and journey UI specs from accepted UX + architecture. Do not invent customer findings. Do not scaffold application code.
```

## Objective

Owner: `/designer`. **Lane:** `frontend` (frontend developer).

Create the OmniDoc visual system and implementation-ready UI specs for
the four core journeys (capture, organize, retrieve, ask) plus dual-mode
Ask chrome, cookbook/wizard, usage strip, public sample labelling, and
honest workspace chrome — from **accepted** UX research and **accepted**
architecture. Specs must be implementable on Next.js 16 + Tailwind 4 +
shadcn/ui (Base UI) in `packages/ui` (ADR-0002/0003).

This is the last **planning** deliverable. It finishes design so the
frontend lane can implement F-01+ from specs. A parallel **S-01**
Implementer task scaffolds the Nx workspace. Do **not** wait for S-01.
Do **not** write `apps/` or `packages/`. Backend B-01+ does **not** wait
on these specs.

Consider Figma MCP (`plugin-figma-figma`) if authenticated and useful
for design-system fidelity; GSAP Master only if motion specs need it;
Canva MCP only for supporting marketing assets. MCP output does not
close architecture or Phase Check gates. If an MCP is unauthenticated,
note that and continue with repo-native Markdown/spec files.

## Required Reading

1. `context.md` (read-only)
2. `docs/planning/implementation-tracks.md` (D-01 row; do not edit)
3. `architecture.md` (accepted ports, answer states, locale, §5.9–§5.11)
4. `AGENTS.md` Design Scope
5. `docs/memory/designer.md`
6. ADR-0001, ADR-0002, ADR-0003, ADR-0004 (all `accepted`)
7. `docs/research/ux/08-design-facing-recommendations.md` (REC-01…REC-19)
8. `docs/research/ux/09-byok-cookbook-and-dual-mode.md`
9. `docs/research/ux/01-journeys.md`, `02-citation-trust.md`,
   `03-onboarding-mobile.md`, `06-portfolio-credibility.md`,
   `07-accessibility-friction.md`
10. `quality/ui-qa-checklist.md` (starting point, not final)
11. This handoff

## Inputs / Evidence

- Stack: Next.js 16.3.5, TipTap 3.31.3, Tailwind 4.3.3, shadcn/ui on
  Base UI, Better Auth orgs, ProseMirror JSON SoT
- Dual-mode: `mock` | `operator_free_tier` | `customer_key` (ADR-0004)
- Mock-first until CX gate; public labelled sample + clone fixtures
- Minimal year-1 tenants; no fake enterprise teams
- `en` LTR now; RTL deferred with RTL-readiness discipline
- Production AI still gated — design live chrome as labelled, not as
  the default first-run path
- UT-* remain unrun hypotheses — do not treat as findings

## Allowed Write Paths

- `docs/design/**` (create the tree)
- `quality/ui-qa-checklist.md` (extend if spec-driven, do not weaken)
- `docs/memory/designer.md` (durable lessons only)
- This file: append Outcome; set `status: completed` when done

**Must not touch:** `context.md`, `architecture.md`, `docs/adr/**`,
`docs/research/**`, `docs/planning/**`, `apps/**`, `packages/**`,
workspace scaffold files, `docs/handoffs/active/**` (S-01).

## Deliverables

1. Design-system foundation: color/type/spacing/elevation tokens mapped
   to Tailwind v4 + shadcn conventions; dark mode via `next-themes`;
   Base UI `Direction` as single direction source.
2. App shell + navigation for authenticated workspace (honest
   org/workspace switcher — REC-18).
3. Journey specs (desktop + mobile): capture (write-first TipTap),
   organize (light optional structure), retrieve, ask with passage-level
   citations and first-class refusal/partial/conflict.
4. Dual-mode / cookbook / usage specs: mode×corpus labelling (REC-13,
   REC-17); cookbook chapters (REC-14); compact usage strip (REC-15);
   failure copy that names the mode (REC-16).
5. Empty, loading, error, indexing-progress, and sample-vs-mine states.
6. Accessibility and RTL-readiness notes per component (focus, keyboard,
   labels, contrast, reduced motion, logical CSS, `bdi` for keys/URLs/
   usage IDs/code). Do not claim RTL locale support.
7. Component inventory for `packages/ui` (names only + states) so
   Implementer can copy-in shadcn pieces without inventing IA.
8. Outcome on this handoff.

## Constraints / Prohibited Decisions

- Do not invent customer findings or conversion claims
- Do not choose new stack, providers, or hosts
- Do not skip mock-first in first-run / portfolio 60s script
- Do not design enterprise billing, SSO, or collab-editing chrome
- Do not require unmaintainable custom components when shadcn/Base UI
  covers the need (Extension-First)
- Cookbook is a settings/help surface, not a trust-boundary bypass

## Acceptance Criteria

- Specs trace to REC-01…REC-19 and architecture ports
- Four journeys + dual-mode surfaces have implementation-ready states
- LTR-now excellence; RTL-readiness discipline documented
- Accessibility is specified as a gate, not polish
- No application source generated
- No provider SDK implied in the client

## Directionality / accessibility checks

- Primary locale `en`; single `lang`/`dir` source
- Logical CSS only except true exceptions
- `bdi` for identifiers, keys, URLs, usage IDs, UGC fragments
- Keyboard, visible focus, labels, contrast, `prefers-reduced-motion`
  on Ask streaming chrome (REC-05, REC-11, REC-19)

## Dependencies / Risks

- Parallel with **S-01** (Nx scaffold). Specs must not assume generated
  file names beyond ADR-0002 (`apps/web`, `packages/ui`).
- Does **not** block Backend B-01+.
- Blocks Frontend F-01+ (tokens and journey UI).
- Risk: live-AI-first onboarding — forbidden.
- Risk: fake enterprise teams chrome — forbidden (REC-18).

## Gates

- Production AI activation remains gated
- RTL locale remains deferred
- UT-* remain unrun

## Completion Instructions

1. Write `docs/design/**` specs.
2. Append Outcome; set this file `status: completed`.
3. Durable lessons only in `docs/memory/designer.md`.
4. Do **not** open F-01, S-02, or any Implementer journey task —
   Commander integrates D-01 + S-01 and opens the next **frontend** live
   handoff (F-01) from `docs/planning/implementation-tracks.md`.

---

## Outcome

**Status:** completed — 2026-09-16
**Owner:** `/designer` (lane `frontend`)

### Delivered

`docs/design/**` created (16 files). No `apps/` or `packages/` source
written; no provider SDK implied.

| File                                                  | Deliverable                                                                                                                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/README.md`                               | Package index, authority, non-negotiable rules, stack mapping, non-claims                                                                                                                     |
| `docs/design/foundations/tokens.md`                   | Color/type/spacing/elevation/radius/motion tokens → Tailwind v4 + shadcn contract; light+dark via `next-themes`; Base UI `Direction` as the single direction source; a11y contract for tokens |
| `docs/design/foundations/content-and-voice.md`        | Microcopy system: three-axis mode × corpus × source labelling, refusal/partial copy, streaming+AT copy, failure template, cookbook/usage copy, workspace copy                                 |
| `docs/design/shell/app-shell-and-navigation.md`       | Auth shell (desktop + mobile), nav, command palette, honest workspace/switcher at n≈1 (REC-18), members panel, shell error/loading                                                            |
| `docs/design/journeys/capture.md`                     | Write-first TipTap capture, paste/import parity, save-confidence states, ingestion, mixed-content handling                                                                                    |
| `docs/design/journeys/organize.md`                    | Inbox-first light structure, optional collections/labels, bulk actions, tenant-safe moves                                                                                                     |
| `docs/design/journeys/retrieve.md`                    | Search/hybrid UX, filters, snippet safety, true/filtered/indexing no-result split, pivot-to-Ask                                                                                               |
| `docs/design/journeys/ask.md`                         | Composer, answer card, passage-level citation loop (rail/sheet), all five answer states, streaming+AT, save/copy/feedback, mobile verify path                                                 |
| `docs/design/dual-mode/mode-corpus-and-usage.md`      | Mode spine, three labelling axes, mode switching with payer confirmation, compact usage strip + honest `unavailable`, no-ZDR copy                                                             |
| `docs/design/dual-mode/cookbook-wizard.md`            | Chapter index, create-elsewhere→paste→verify→first-Ask→manage flow, write-once masked prefix, rotate/revoke, a11y gate                                                                        |
| `docs/design/dual-mode/failure-states.md`             | Failure taxonomy + 13-entry catalogue, mode-named copy template, no silent payer fallback, recovery map                                                                                       |
| `docs/design/states/empty-loading-error-indexing.md`  | Empty inventory (E1–E10), loading skeletons, error classes, indexing/import progress, state×journey matrix                                                                                    |
| `docs/design/states/sample-vs-mine.md`                | Corpus label system, surfaces, public sample rules, clone fixtures, first-run flow, 60-second portfolio script                                                                                |
| `docs/design/accessibility/a11y-and-rtl-readiness.md` | Focus contract, keyboard map, SR patterns, reduced motion, contrast, RTL-readiness discipline (logical CSS + `bdi` + single `lang`/`dir`), per-component matrix                               |
| `docs/design/components/inventory.md`                 | `packages/ui` component inventory (names + states + source: shadcn / shadcn+ / custom) across 11 groups                                                                                       |
| `docs/design/traceability.md`                         | REC-01…REC-19 → spec, architecture → spec, acceptance mapping, QA cross-reference, preserved gates, bounded open questions                                                                    |

Also extended: `quality/ui-qa-checklist.md` with §9 (dual-mode/mode
honesty/corpus labelling), §10 (enterprise-scale + commerce honesty), and
§11 (design-spec conformance). Existing §1–§8 unchanged — extended, not
weakened.

Durable lessons recorded in `docs/memory/designer.md`.

### Acceptance

- Specs trace to REC-01…REC-19 and architecture ports — ✅ `traceability.md` §1–§2
- Four journeys + dual-mode surfaces have implementation-ready states — ✅ `journeys/*`, `dual-mode/*`, `states/*`, component inventory
- LTR-now excellence; RTL-readiness discipline documented — ✅ `accessibility/…` §7 + per-journey RTL sections
- Accessibility specified as a gate, not polish — ✅ `accessibility/…` §1/§9; per-journey a11y gates; checklist §1–§3
- No application source generated — ✅ only `docs/design/**`, checklist, memory, this Outcome
- No provider SDK implied in the client — ✅ `README.md` non-negotiable 1; `components/inventory.md` §13

### MCP usage

Figma MCP (`plugin-figma-figma`), GSAP Master, and Canva MCP were **not
used** for this task. D-01 is a docs-only specification deliverable with
no visual-asset or motion-prototype dependency, so repo-native Markdown
specs were sufficient; none of these MCPs were consulted and none were
required to close a gate. No `needsAuth` state was encountered because no
MCP call was made.

### Gates preserved (unchanged by D-01)

- Production AI / provider activation — **open**; mock-first is the
  designed default surface
- RTL locale — **deferred, not closed**; readiness discipline specified
  only, no claim of shipped RTL
- UT-1…UT-22 — **unrun hypotheses**, not findings
- AWS / hosted deploy, provider/host/model selection — untouched

### Bounded gaps returned to Commander

Not blocking F-01; detailed in `docs/design/traceability.md` §6:

1. Cookbook chapter data (tool names, external steps, verify-probe
   meaning) depends on `docs/api/` (S-02); shell ships with a
   `Coming soon` variant meanwhile.
2. Usage fields available per live mode are provider-dependent; design
   specifies honest `available`/`unavailable` states.
3. Sample-workspace deletion semantics (hide vs delete) affect one empty-state copy.
4. Exact role vocabulary for the members panel should be confirmed against
   the identity port when S-02 lands.

### Next

`/commander` — accept or return the design package and integrate D-01
with S-01. F-01 (frontend journey implementation) is unblocked by D-01
but still waits on **S-01a**. D-01 did **not** open F-01/S-02.

---

## Commander Acceptance

**Status:** accepted — 2026-09-16
**Owner:** `/commander`

### Validation checklist

| Check | Result |
|-------|--------|
| 16-file design package under `docs/design/**` | Pass |
| REC + architecture trace (`traceability.md` §1–§2) | Pass |
| Journeys, dual-mode, states, inventory implementation-ready | Pass |
| A11y + RTL-readiness as gates | Pass |
| `quality/ui-qa-checklist.md` §9–§11 extended; §1–§8 intact | Pass |
| No D-01 writes under `apps/**` or `packages/**` | Pass |
| Gates preserved (AI open; RTL deferred; UT-* unrun) | Pass |
| Stale Better Auth wording in Inputs line | Noted — ADR-0005 sessions are SoT; design package correct |

### Bounded gaps (do not block F-01)

Per `docs/design/traceability.md` §6: cookbook chapter data (S-02), usage field availability, sample deletion semantics, identity role vocabulary.

### Disposition

D-01 package **accepted**. Unblocks **F-01**. Dual-lane heads open next (F-01 + B-01). Phase Check remains at Phase 1 Build exit, not this ticket.


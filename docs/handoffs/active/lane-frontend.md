---
handoff_id: H-2026-09-27-P1-F12
affinity: implementation
track: parallel
status: completed
phase: "1"
task: "F-12"
lane: frontend
human_owner: front-end-programmer
from: commander
to: implementer
created: 2026-09-27
updated: 2026-09-27
---

# F-12 — Sanitized markdown render pipeline

## Start Command

```text
/implementer Read docs/handoffs/active/lane-frontend.md and execute F-12 exactly. Build the one sanitized markdown render path in packages/ui: react-markdown 10.1.0 + remark-gfm 4.0.1 behind rehype-sanitize 6.0.0 (ADR-0003 §4, already accepted), plus the hostile-payload test ADR-0003 §Verification item 5 requires. Behaviour only — @user chose stock tokens with no typography work (2026-09-27). Do not add @tiptap/extension-table or codemirror: both need a new Architect pin (backlog BL-20/BL-21). Do not parse markdown into the store, do not read ProseMirror JSON, do not fetch data, and do not build the F-07 answer card. Do not touch apps/api, packages/mocks, packages/contracts authorship, docs/adr/**, docs/handoffs/current.md, or lane-backend.md.
```

## Objective

Owner: `/implementer`. **Lane:** `frontend`. **Human:** front-end
programmer. **allowed_task_classes:** `F-12` only.

Make the markdown projection of the note SoT **renderable safely**. Note
content is untrusted UGC (`architecture.md` §6), so sanitization is a
mandatory architecture control — and it must be *proven* to hold against a
hostile payload, not asserted. This slice ships the pipeline only; the
answer surface that consumes it (F-07) is later work.

## Required Reading

1. `architecture.md` §6 — "Markdown / XSS: sanitize render pipeline; block
   dangerous schemes"; and its directionality row — isolation for
   identifiers, code tokens, URLs, UGC fragments
2. ADR-0003 §4 (the three pins) and §Verification item 5 (the sanitization
   test this task must satisfy)
3. ADR-0001 §2 — markdown is a projection; **never** parse it back into the
   store
4. `docs/research/version-ledger.md:127–130` — pinned versions and rationale
5. `docs/design/components/inventory.md` — `AnswerProse`, `MarkdownTable`,
   `CodeBlock` contracts (names + states only; **not** layout authority)
6. `docs/design/now.md` — the living plan; log non-obvious choices
7. This file, and `context.md` (read-only)
8. `quality/ui-qa-checklist.md` §4, §5, §6 (contrast, keyboard, long-token /
   table overflow)
9. `packages/ui/**` — `src/lib/utils.ts` (`cn`) and the existing block
   conventions (`src/capture/index.ts` shows the barrel style)

## Inputs / Evidence

- F-01 completed — tokens + primitives; `cn` lives at
  `packages/ui/src/lib/utils.ts`
- ADR-0003 §4 pins **accepted** 2026-09-14; ledger rows already exist
  (`version-ledger.md:127–130`). **No new pin decision is required for this
  task** — installing the accepted pins is execution, not a stack choice
- Verified 2026-09-27: `react-markdown`, `remark-gfm`, `rehype-sanitize`,
  `shiki` and `codemirror` appear in **no** `package.json`, and no source file
  under `apps/web/app/**` or `packages/ui/src/**` imports them
- Promoted from backlog `BL-19`; `BL-20`…`BL-23` remain unscheduled
- `packages/ui` has no Storybook stories in `src/**` — do not add one

## Task details

| Concern | This task |
| --- | --- |
| API connections | **None.** The block takes a markdown **string** prop. No fetching, no ports, no contracts consumption |
| Data boundary | Renders the markdown *projection* only. It must not parse markdown back into a document model (ADR-0001 §2) and must not read ProseMirror JSON |
| Sanitization | `rehype-sanitize` runs on every render with an explicit, reviewed schema. No raw HTML pass-through, no `style`, no event handlers, and dangerous URL schemes (`javascript:`, `vbscript:`, and `data:` outside safe image types) are inert |
| Isolation | Identifiers, code tokens and URLs are `bdi`-isolated (or equivalent) so a BiDi payload cannot reorder surrounding text (`architecture.md` §directionality) |
| Overflow | Fenced code and GFM tables stay keyboard-reachable with internal horizontal scroll; never clipped columns (`ui-qa-checklist` §6.1 / §6.3 / §6.4) |
| Locale / direction | No direction logic in JS. Logical CSS only (`ps/pe/ms/me`, `text-start/end`); direction continues to come from the existing `DirectionProvider` |
| Accessibility | Real table semantics from GFM (header cells and scopes), code exposed as text, no keyboard trap, contrast from tokens (§4.4) |
| Look | **Stock tokens only.** Do not invent typography, spacing, or a prose scale — `@user` chose behaviour-only on 2026-09-27. Answer-prose typography is F-07 work and needs a reference first |
| Tests | Vitest + RTL. The hostile-payload suite **is** the point of the task |

## Reference protocol

This slice has **no visual block**. `@user` chose behaviour-only with stock
tokens on 2026-09-27, so there is no reference to request and no options to
offer. If you find yourself about to choose a type scale, a colour, or
spacing values, **stop** — that is the F-07 answer card, not F-12.

## Allowed Write Paths

- `packages/ui/**` (new `src/markdown/`; `package.json` dependency rows;
  `src/index.ts` export line)
- `docs/frontend/README.md` (landed conventions only)
- `docs/handoffs/active/lane-frontend.md` (status, Outcome)
- `docs/design/now.md` (Current slice + Decisions log)
- `context.md` (status lines only)
- `docs/memory/implementer.md` (durable lessons only)

**Must not touch:** `apps/api/**`, `docs/api/**`, `docs/adr/**`,
`docs/design/system-ux.md`, `packages/mocks/**` authorship,
`packages/contracts/**` authorship, `docs/handoffs/current.md`,
`docs/handoffs/active/lane-backend.md`, `docs/planning/**` (status lines
exception), `packages/ui/src/styles/tokens.css`.

## Out of scope

- `@tiptap/extension-table` and CodeMirror 6 — backlog `BL-20` / `BL-21`;
  both need a **new pin** from Architect
- The canonical JSON→markdown serializer — backlog `BL-22`, backend /
  cross-lane (it *produces* the string this block consumes)
- Markdown import (`.md` → note body) — backlog `BL-23`, an
  architecture/product decision
- The F-07 answer card: citations, unsupported spans, answer states
- Note / citation preview **screens** — F-06 and F-09 own the surfaces
- Shiki syntax highlighting (pin exists; no consumer in this slice)
- Production AI; RTL locale; AWS / DevOps `I-*`

## Deliverables

1. Pinned installs in `packages/ui`: `react-markdown@10.1.0`,
   `remark-gfm@4.0.1`, `rehype-sanitize@6.0.0` (exact ledger versions).
2. A sanitize-schema module whose documentation states what it **refuses**,
   not just what it allows.
3. A markdown render block under `packages/ui/src/markdown/` that consumes
   the schema, isolates identifiers/URLs, and keeps overflow keyboard-reachable.
4. A `src/markdown/index.ts` barrel in the `capture/index.ts` style, exported
   from `packages/ui/src/index.ts`.
5. Tests: hostile payload blocked; dangerous schemes inert; raw HTML and
   event handlers do not survive; GFM tables render with real semantics;
   code/table overflow reachable; `bdi` isolation present.
6. Outcome here; rows in `now.md`; status lines in `context.md`.

## Constraints / Prohibited Decisions

- Do not bump any pin; install the ledger versions **exactly**
- Do not make markdown the stored body; do not parse markdown into a
  document model
- Do not add `rehype-raw`, raw-HTML mode, or `dangerouslySetInnerHTML`
- Do not add token values or edit `tokens.css`
- Do not invent typography, palettes, or prose scales (no visual block here)
- Do not add dependencies beyond the three pinned packages
- Do not import provider SDKs, Java/Spring types, or `packages/mocks`
  production paths
- Do not claim RTL locale support; do not activate production AI

## Acceptance Criteria

- A hostile markdown payload cannot execute through the render path,
  **proven by an automated test** (ADR-0003 §Verification item 5)
- Dangerous URL schemes are inert; raw HTML and inline event handlers do not
  survive sanitization
- GFM tables and fenced code render, with keyboard-reachable internal scroll
  and no clipped columns at ~390px
- Identifiers / code tokens / URLs are BiDi-isolated; CSS is logical; no
  direction logic in JS
- No typography, colour, or spacing decisions beyond stock tokens
- `packages/ui` typecheck, lint, tests and build green; `apps/web` unaffected
- `tokens.css`, `docs/adr/**`, `packages/contracts/**` authorship,
  `packages/mocks/**` authorship, `current.md` and `lane-backend.md` untouched

## Stop / escalate conditions

- **Hard-stop:** a needed capability requires a **new pin** (a table
  extension, CodeMirror, a highlighter) → stop and escalate; that is
  `BL-20`/`BL-21` work with an Architect decision, not a lane-local install
- **Hard-stop:** the sanitizer cannot block a payload class without dropping
  a GFM feature the design contracts promise → escalate to Commander +
  Architect rather than loosening the schema silently
- **Hard-stop:** ADR reopen pressure; production AI activation; claiming RTL
  locale shipped; markdown/HTML becoming the stored body
- **Soft-stop:** a tidy-up would require touching `tokens.css` → leave it and
  log the gap instead

## Dependencies / Risks

- Depends on: F-01 (completed); ADR-0003 §4 pins (accepted)
- Blocks: F-07 answer prose (partially); note / citation previews
- Parallel: backend `B-05` — no mutual dependency
- Risk: **a permissive schema is the failure mode that looks like success.**
  `rehype-sanitize` defaults to an allowlist; do not "fix" a blocked feature
  by widening it without evidence
- Risk: a broad `className`/`style` pass-through re-opens XSS-adjacent
  surface — keep the prop surface narrow
- Risk: a second markdown authority appearing. Previews must call this block
  rather than adding their own pipeline
- Note: the markdown *source* is the server's canonical serializer
  (`BL-22`, unscheduled), so this slice ships the **consumer**, not the
  producer — do not implement a serializer here

## Gates

- Production AI activation remains gated
- RTL locale remains deferred (readiness discipline applies)
- Phase Check runs at Phase 1 Build exit, not for this ticket
- Design language: **Mintlify** tokens; no visual reference required for this
  slice by `@user` decision (2026-09-27)

## Completion Instructions

1. Complete deliverables inside Allowed Write Paths, then run the frontend
   gate: `nx run-many -t typecheck lint test build --projects=ui,web,contracts,mocks`.
   Do **not** include `api` — it needs a Java 21 toolchain and is another
   lane's concern.
2. Append Outcome; set `status: completed`.
3. Archive to
   `docs/handoffs/archive/H-2026-09-27-P1-F12-implementer-implementer.md`
   (immutable).
4. **Same-lane sequence rule:** on completion, raise the next candidate with
   Commander rather than rewriting this path unilaterally. **F-05 (organize)**
   is the standing candidate but is still blocked on the S-02 collections
   gap; do not open it, and do not open F-06 without Commander's go-ahead.
5. Durable lessons only in `docs/memory/implementer.md`.
6. Do not overwrite `current.md` or `lane-backend.md`; update `context.md`
   status lines only.

---

## Outcome

**Completed 2026-09-27.** Branch `F12-markdown-render`, uncommitted at time of
writing. Behaviour-only slice, exactly as scoped.

### Delivered

| Deliverable | Where |
| --- | --- |
| Accepted pins installed **exactly** (no pin bumps) | `packages/ui/package.json` |
| The sanitize control, written as explicit refusals | `packages/ui/src/markdown/sanitize-schema.ts` |
| The single render block (`Markdown`) | `packages/ui/src/markdown/markdown.tsx` |
| Barrel + package export | `packages/ui/src/markdown/index.ts`, `packages/ui/src/index.ts` |
| ADR-0003 §Verification item 5 | `packages/ui/src/markdown/markdown.test.tsx` — 17 hostile payloads × 3 channel checks + a "does not execute" assertion |
| Schema regression lock | `packages/ui/src/markdown/sanitize-schema.test.ts` |

### Verified

- `nx run-many -t typecheck lint test build --projects=ui,web,contracts,mocks`
  → **14/14 green** (`--skip-nx-cache`). `ui:test` **350/350**, 13 files
  (277 at F-04 close).
- The sanitize control was written against the **installed**
  `hast-util-sanitize` 5.0.2 default schema, read from `node_modules/.pnpm/…`
  first — the narrowings are evidence-based, not recollection.
- Nothing renders `Markdown` yet (F-07 owns the first surface), so there is
  **no visual check to run** and none is claimed.

### Findings worth keeping

1. **Raw HTML never reaches the DOM.** Without `rehype-raw`, React-Markdown
   **drops** authored HTML entirely (a `<script>` payload yields
   `textContent === ""`, not inert text and not an element). The schema is
   therefore **defence in depth**, and a markdown-only fixture can never
   distinguish our narrowed schema from the library default — every channel we
   narrowed is raw-HTML-only. That is why the refusals are **also** locked by
   schema-level tests rather than only by rendering tests.
2. An earlier draft of the hostile-payload suite asserted the payload stayed
   visible as inert text. **It does not** — it is dropped. The test now asserts
   the drop, which makes adding `rehype-raw` fail here first.
3. Props applied through `components` overrides (`tabIndex`, `className`) are
   **post**-sanitization, so the schema does not constrain them. `bdi`
   isolation and focusability are added the same way.

### Gaps handed on (recorded, not silently dropped)

- **No typography — deliberate.** `@user` chose behaviour-only. Answer-prose
  styling is the F-07 answer card and still needs a reference.
- **Shiki remains uninstalled.** Its pin exists (ADR-0003 §4, ledger `:130`) but
  this slice has no highlighting consumer.
- **`BL-20` (table extension) and `BL-21` (CodeMirror 6) remain unscheduled** —
  both need a **new Architect pin**. This handoff's hard-stop was hit
  deliberately instead of installing around the pin process.
- **The markdown *producer* does not exist yet** (`BL-22`, unscheduled): this
  slice ships the consumer, testable against literal markdown strings.

### Protocol note

This handoff is **not archived** yet, on purpose. Archiving happens when the
Commander rewrites `lane-frontend.md` for the next task; keeping the completed
handoff at the live path means there is no window with **no** frontend head.
The archived copy is owed with that rewrite.

### Next handoff

**Commander's call.** The standing candidate is **F-05 (organize)**, still
blocked on the S-02 collections gap. Do not open F-05 or F-06 without an
authorising handoff.

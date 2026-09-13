# OmniDoc — UI Accessibility & LTR-now / RTL-Readiness QA Checklist

**Owner:** `/phase-check` (written under Task 0.6; maintained by Phase
Check at each future gate).
**Status:** No prior checklist existed for this repository. This is a
new, OmniDoc-specific checklist for a multi-tenant AI/RAG note and
knowledge SaaS — **not** a Persian auto-parts / forced-RTL commerce
checklist, and none such exists to replace.
**Applies to:** All UI work from Phase 1 onward (Designer specs,
Implementer builds). Use this as a definition-of-done gate, not optional
polish.
**Locale scope:** Primary locale `en` (LTR) only. RTL / mixed-BiDi
support is **deferred, not closed** — this checklist verifies
**readiness discipline**, not shipped RTL support. Do not check any RTL
item as "passed = RTL ships"; RTL items pass when the *discipline* is
present while only `en` (LTR) is live.

---

## How to use this checklist

- Run it against real, rendered UI (or a reproducible fixture/demo), not
  against intentions described in a PR description.
- Any check that cannot be verified from available evidence is
  **Not Verified**, not Pass.
- A single Critical/High finding (see Severity) fails the release gate
  for the touched surface even if every other row passes.

## Severity guide (for findings raised while running this checklist)

- **Critical:** Core journey (capture, retrieve, ask) is unusable via
  keyboard or AT; cross-tenant content leak visible in UI.
- **High:** Major a11y failure on a primary control; citation cannot be
  verified; refusal/error state is missing or misleading.
- **Medium:** Workaround exists but journey is degraded.
- **Low:** Cosmetic; does not block the journey.

---

## 1. Keyboard operability and focus management

| # | Check | Journey | Pass criteria |
|---|-------|---------|----------------|
| 1.1 | Every interactive control (buttons, links, editor toolbar, citation chips, filters, menus) is reachable and operable via keyboard alone | All | No mouse-only trap; visible actionable order matches DOM/tab order |
| 1.2 | Focus is visible at all times during keyboard navigation | All | Non-color-only focus indicator meets contrast; never suppressed by CSS reset |
| 1.3 | Focus moves predictably on route change, dialog/drawer open, and dialog/drawer close (returns to trigger) | Capture, Organize, Retrieve, Ask | No focus loss to `<body>`; no re-trapping in a closed dialog |
| 1.4 | Editor (TipTap/ProseMirror or equivalent) supports keyboard-only create, format, and exit — no focus trap in the editing surface | Capture | Tab/Shift+Tab and Escape behave predictably; toolbar buttons are reachable and labelled |
| 1.5 | Citation open / source preview / feedback / cancel controls are keyboard-reachable — **never hover-only** | Ask | Trust controls behave identically for keyboard and mouse |
| 1.6 | Streaming Ask response does **not** steal focus from the composer unless the user explicitly requests "jump to answer" | Ask | Focus remains under user control during generation |
| 1.7 | Skip-to-content / landmark navigation exists for the app shell | All | Screen-reader and keyboard users can bypass repeated nav |
| 1.8 | Mobile capture entry point (quick-note / new-note action) is reachable via keyboard-equivalent (switch control, external keyboard) on mobile browsers | Capture / Mobile | No gesture-only capture trigger |

## 2. Screen-reader behavior

| # | Check | Journey | Pass criteria |
|---|-------|---------|----------------|
| 2.1 | All controls have accessible names (not just visual icons/color) | All | Citation numbers/marks have a real accessible name, not just "1" |
| 2.2 | Streaming Ask tokens are **not** piped into an `aria-live` region word-by-word | Ask | Announce "generating…" once, then "response ready" once; no token-level speech stutter |
| 2.3 | Status regions (saving, indexing/import progress, search loading) are announced once per state change, not on every re-render | Capture, Retrieve | Polite live region; no announcement spam |
| 2.4 | Editor surface has an accessible name/role beyond generic "edit text" | Capture | AT users can identify what they are editing (note title vs body vs code block) |
| 2.5 | Empty, error, and refusal states are announced, not conveyed by color/icon alone | Retrieve, Ask | Text content of the state is exposed to AT |
| 2.6 | Citation → source-passage navigation is announced (e.g. "opened source passage, note X") | Ask | AT users know the view changed and where |
| 2.7 | Long unbroken strings (tokens, base64-like fragments, long URLs) do not force the screen reader to spell out the entire string with no way to skip | Retrieve, Ask, Capture | Reasonable chunking/labeling; not a hard requirement to fully solve in Phase 1, but must not be silently ignored |

## 3. Reduced motion

| # | Check | Journey | Pass criteria |
|---|-------|---------|----------------|
| 3.1 | `prefers-reduced-motion: reduce` disables/minimizes non-essential animation (skeleton shimmer, answer-stream chrome, transition flourishes) | All | No motion-triggered nausea/distraction risk under the OS preference |
| 3.2 | Streaming Ask visual affordance (typing/shimmer effect) degrades to a static/low-motion equivalent under reduced motion | Ask | Content is still comprehensible without the animation |
| 3.3 | Loading/progress indicators for import/indexing respect reduced motion | Capture | Progress is still legible without spinner animation |

## 4. Contrast

| # | Check | Journey | Pass criteria |
|---|-------|---------|----------------|
| 4.1 | Body text, labels, and placeholder text meet WCAG contrast minimums | All | No low-contrast gray-on-gray placeholder-as-instruction pattern |
| 4.2 | Citation chips/links/badges are readable against their background in all states (default, hover, focus, visited) | Ask | Trust UI is never the lowest-contrast element on the page |
| 4.3 | Focus indicator itself meets non-text contrast requirements | All | Focus ring visible against both light and dark surfaces if theming exists |
| 4.4 | Error/refusal/empty-state text is not conveyed by color alone (red text with no icon/label) | Retrieve, Ask | Text + icon/label, not color-only signal |

## 5. Long-content, empty, error, and refusal states

| # | Check | Journey | Pass criteria |
|---|-------|---------|----------------|
| 5.1 | First-run empty state (no notes) answers What / Why / one primary Next | Onboarding | Single primary CTA (write or import); no dead end |
| 5.2 | Ask-with-empty-corpus explains *why* it cannot answer and offers a next step (capture/import) | Ask | Not a generic error; explains the actual cause |
| 5.3 | `no_supported_answer` (refusal) renders as a **first-class, honest state** — not styled as a broken/error page | Ask | Distinguishable from `timeout`/`unavailable`/`quota_exhausted` transport errors |
| 5.4 | Partial-support answers visibly mark which claims are cited vs unsupported | Ask | No visual conflation of supported and unsupported spans |
| 5.5 | Conflict state shows both disagreeing sources, not a silently picked "winner" | Ask | User can see the disagreement, not just one answer |
| 5.6 | Search-no-results state offers a next step (clear filters / try Ask / create note), not a bare "no results" | Retrieve | One clear recovery action |
| 5.7 | Import/indexing-in-progress state is visible before Ask is encouraged | Capture → Ask | User is not invited to "Ask" while the corpus is still indexing without warning |
| 5.8 | Transport errors (`timeout`, `unavailable`, `quota_exhausted`) are distinguishable from refusal and from "no results" | Retrieve, Ask | Three visually/textually distinct failure classes, not one generic "something went wrong" |
| 5.9 | Long note titles, nested quotes, and very long unbroken strings do not break layout (overflow, clipping, horizontal scroll hijack) | Capture, Retrieve | Text wraps or truncates predictably; no clipped English text |
| 5.10 | Stale-source cue (last-updated) is visible when available and does not silently over-claim freshness | Ask | Honest staleness signal, not omitted |

## 6. Code blocks, markdown tables, inline identifiers, and URLs

| # | Check | Journey | Pass criteria |
|---|-------|---------|----------------|
| 6.1 | Fenced code blocks render with a monospace, non-reflowing surface and are keyboard-scrollable when they overflow | Capture, Retrieve, Ask | No code content lost or unreachable via keyboard |
| 6.2 | Inline `` `identifiers` `` and mixed-case technical tokens (e.g. `pgvector`, `BYOK`) remain intact and copyable, never reordered or visually mangled | All | Copy-paste round-trips exactly |
| 6.3 | Inline URLs and file paths remain ordered, copyable, and are not auto-"corrected" or silently truncated in display | Capture, Retrieve, Ask | Full URL/path recoverable by the user |
| 6.4 | Markdown tables render legibly at narrow (~390px) viewport width — horizontal scroll or reflow, not clipped columns | Retrieve, Ask, Mobile | Table content remains fully accessible on mobile |
| 6.5 | Identifiers, code tokens, and URLs are semantically isolated (e.g. `bdi`-equivalent wrapper) even while only `en` (LTR) ships | All | Directional isolation is present as **discipline**, verifiable by inspecting markup, not by visual RTL testing (no RTL locale exists yet) |
| 6.6 | Citation preview text containing code/URLs/tables renders safely (no raw HTML execution; sanitized Markdown pipeline) | Ask | XSS-safe rendering per the ai-content-safety threat boundary |

## 7. Logical-CSS and `dir` / `lang` readiness

| # | Check | Journey | Pass criteria |
|---|-------|---------|----------------|
| 7.1 | `lang` and `dir` attributes are driven from a **single locale source**, never hardcoded per-component | All | One place sets `lang="en" dir="ltr"`; no scattered overrides |
| 7.2 | Layout uses logical CSS properties (`margin-inline`, `padding-inline`, `inline-size`, `border-inline`, logical positioning) rather than physical `left`/`right` for anything that should flip under a future RTL locale | All | Spot-check stylesheet/tokens for physical-direction properties on flippable layout |
| 7.3 | No component forces an entire note body to one direction solely because it contains code or a URL | Capture, Retrieve | Direction handling is per-fragment (via isolation), not whole-note override |
| 7.4 | JavaScript logic does not assume "next" means visually right (uses start/end or logical equivalents where the API allows) | All | No `ArrowRight === next` assumption baked into logic that should be direction-aware later |
| 7.5 | No UI copy or marketing claims an RTL locale is shipped, live, or available | All | Grep/inspect copy for RTL-shipped claims — must be absent while RTL remains deferred |
| 7.6 | Timestamps are stored in UTC and only formatted at presentation time | All | No locale/timezone assumption baked into stored data |

## 8. Mobile capture

| # | Check | Journey | Pass criteria |
|---|-------|---------|----------------|
| 8.1 | New-note / quick-capture entry point is reachable in ≤2 actions from app open on a phone-width viewport | Capture / Mobile | Fast open-to-type; no forced folder/tag decision before typing |
| 8.2 | Mobile citation inspection has a workable passage-verify path — not a shrunk desktop dual-pane layout | Ask / Mobile | Citation → passage preview usable within reach of a thumb, target ≤2 taps |
| 8.3 | Autosave / save-confirmation state is unambiguous on mobile (network delay, background/foreground transitions) | Capture / Mobile | User can tell whether content is saved without guessing |
| 8.4 | Touch targets for trust controls (citation chip, feedback, retry) meet minimum touch-target size | Ask / Mobile | No accidental mis-tap risk on dense citation UI |
| 8.5 | Narrow-viewport (~390px) layout does not clip or overlap English UI text | All / Mobile | No text truncated without an explicit, intentional ellipsis + full-text access |

---

## Traceability

This checklist operationalizes:

- `architecture.md` §8 (Locale, direction, and time) and §6 (Threat and
  safety boundaries — Markdown/XSS row)
- `AGENTS.md` Customer Experience First Rule (accessibility as a release
  gate; RTL-readiness discipline while RTL remains deferred)
- UX evidence: `docs/research/ux/02-citation-trust.md` (REC-04, REC-05,
  REC-10, REC-11), `docs/research/ux/07-accessibility-friction.md`,
  `docs/research/ux/03-onboarding-mobile.md` (REC-09)
- `docs/frontend/README.md` §"Stack-independent non-negotiables" items 4
  and 5

## What this checklist does not do

- Does not certify WCAG conformance on its own (a full audit needs
  automated + manual testing tools against real rendered UI).
- Does not claim RTL locale support exists or is validated — RTL items
  here verify **readiness discipline** only.
- Does not replace the rag-evaluation, tenant-security-review, or
  threat-model skill outputs for non-UI concerns.
- Does not close any open `@user` gate.

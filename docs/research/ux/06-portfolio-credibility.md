# Portfolio-credibility signals (freelance client evaluation)

**Research date:** 2026-09-13  
**Audience:** Prospective freelance/client evaluating the developer’s work via OmniDoc demo.  
**Not in scope:** Commerce funnels, pricing pages as conversion engines, fabricated analytics.

---

## Framing

Portfolio evaluation ≠ end-user onboarding, but they share surfaces. Clients often judge in **the first ~60 seconds**: does this feel like a real product or a tutorial CRUD app?

### Cited / sourced inputs (adjacent)

| ID | Input | Label |
|----|-------|-------|
| CITE-16 | Agency/portfolio evaluators notice scan clarity, navigation sense, and craft details (spacing, alignment, micro-interactions) within first minutes | Dribbble resources: portfolio evaluation guidance — accessed 2026-09-13 https://dribbble.com/resources/tips/ui-ux-design-agency-portfolio |
| CITE-17 | Hiring managers over-index on visuals but stronger signal is problem understanding, empty/error handling, and process — portfolios that only show pretty screens are weak | Lumi Studio / Evalon assessment articles — accessed 2026-09-13 |
| CITE-18 | Accessibility treated as design principle is increasingly part of professional evaluation | Evalon a11y note (EAA/ADA context) — accessed 2026-09-13 |

These sources address **designer portfolios** and **hiring**, not OmniDoc users. Applied here by analogy to **product demos as portfolio artifacts** — labelled as **project recommendation / inference**, not OmniDoc user research.

---

## First-60-second checklist (what clients notice)

| Signal | Production-quality read | Tutorial-project read | Evidence basis |
|--------|-------------------------|----------------------|----------------|
| Immediate clarity of job | “Capture notes → ask with sources” obvious | Generic dashboard chrome, no story | Inference + empty-state practice |
| Realistic content | Believable notes, citations, mixed content fixtures | “Lorem ipsum”, empty tables | Portfolio practice; REC-08 |
| Trust surface | Citation opens a real passage | Answer text only / fake “Source 1” | CITE-09–12 |
| Empty/error states | Designed no-results / no-supported-answer | Broken blank or console errors | Common practice + CITE-17 |
| Motion | Purposeful, respects reduced motion | None or chaotic | A11y + craft |
| Keyboard / focus | Visible focus, usable without mouse | Mouse-only traps | CITE-07–08, CITE-18 |
| Performance feel | Snappy capture; Ask progress honest | Sluggish; infinite spinner | CITE-01 analogy |
| Ownership clarity | Sample vs my data labelled | Unclear demo data | UT-2 |
| No fake commerce | No cart/checkout leftovers | Template commerce residue | Project identity |
| Responsive | Mobile capture usable | Desktop-only collapse | OBS-01, REC-09 |

---

## Experience details that signal production quality

**Project recommendations (portfolio-specific):**

1. **Demo script path:** Import/sample → Ask → click citation → see highlight (shows RAG competence).
2. **Refusal demo:** Ask something unsupported → graceful no-supported-answer (shows honesty > magic).
3. **Mixed-content note:** Code + URL + long title in search results (shows real notes, not toy text).
4. **Loading & failure:** Skeleton/progress + recoverable error (shows engineering maturity).
5. **Accessibility basics visible:** Focus ring, labelled controls, reduced-motion safe Answer chrome.
6. **Locale honesty:** `en` LTR polished; no pretend RTL locale claims while deferred.

---

## What not to fake

- Invented testimonials, user counts, or conversion rates.
- “AI accuracy 99%” badges without measurement.
- Commerce/checkout flows (out of scope).
- Claiming RTL support.

---

## Hypotheses

| ID | Hypothesis |
|----|------------|
| UT-2 | Sample corpus improves client demo success |
| — | Clients rate demos with working citation inspection higher than demos with prettier but non-inspectable answers (**Hypothesis** — validate with 3–5 client-style walkthroughs) |

**@user gate:** Confirm whether public demo uses mock-only deterministic answers vs live provider (affects credibility and cost; experience-first rule prefers validated mock journey before production AI).

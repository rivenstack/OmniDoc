# OmniDoc — UX Research Package (Phase 0 / Tasks 0.3 + 0.8b)

**Owner:** `/ux_researcher`  
**Research dates:** 2026-09-13 (Task 0.3 core package); 2026-09-14 (Task 0.8b dual-mode / BYOK cookbook)  
**Locale scope:** Primary `en` (LTR). RTL deferred (not closed) — no RTL-locale customer findings invented.  
**Business framing:** Portfolio / freelancing credibility product. “Conversion” maps to signup completion, first-note activation, retrieval trust, and retention — **not** commerce checkout.

## Evidence taxonomy (mandatory)

Every claim in this package is labelled as one of:

| Label | Meaning |
|-------|---------|
| **Cited evidence** | Sourced fact or study finding with URL/citation and date |
| **Competitor observation** | Direct/desk observation of a product pattern; not customer proof |
| **Common practice** | Widely repeated industry pattern; not OmniDoc validation |
| **Project recommendation** | Design-facing guidance derived from labelled evidence |
| **Hypothesis** | Unvalidated behaviour claim; awaiting a named test (UT-*) |
| **Unknown** | Gap explicitly left open |

**Hard rule (AGENTS.md):** Unrun usability tests are **hypotheses**, never findings. Desk research ≠ user validation.

## Package index

| File | Contents |
|------|----------|
| [01-journeys.md](./01-journeys.md) | Capture, organize, retrieve, ask + dual-mode spine — step maps, friction, drop-off risks |
| [02-citation-trust.md](./02-citation-trust.md) | AI-answer trust, citations, refusal, hallucination/stale risk, recovery |
| [03-onboarding-mobile.md](./03-onboarding-mobile.md) | Cold start, empty states, activation definition, mobile vs desktop |
| [04-competitor-teardown.md](./04-competitor-teardown.md) | Notion, Obsidian, Mem, NotebookLM, Apple Notes (+ access limits) |
| [05-friction-and-hypotheses.md](./05-friction-and-hypotheses.md) | Prioritized friction list + labelled UT-1…UT-22 hypotheses |
| [06-portfolio-credibility.md](./06-portfolio-credibility.md) | First-60-second demo signals for freelance-client evaluation |
| [07-accessibility-friction.md](./07-accessibility-friction.md) | Customer-experienced a11y friction (not implementation specs) |
| [08-design-facing-recommendations.md](./08-design-facing-recommendations.md) | Prioritized recommendations with evidence IDs for Designer/Architect |
| [09-byok-cookbook-and-dual-mode.md](./09-byok-cookbook-and-dual-mode.md) | Mock → labelled live demo → BYOK; cookbook; usage; failures; trust copy |

## Counts (package snapshot)

Inventory after Task 0.8b (see individual files for IDs):

- **Cited evidence items:** 23 (CITE-01 … CITE-23)
- **Competitor observations:** 27 (OBS-01 … OBS-27)
- **Labelled hypotheses / unrun tests:** 22 (UT-1 … UT-22)
- **Design-facing recommendations:** 19 (REC-01 … REC-19)

## Fixtures for later validation

Recommend OmniDoc usability / Phase Check fixtures include:

- Long note titles; long unbroken strings
- Inline code, fenced code blocks, URLs, opaque identifiers
- Markdown tables; mixed Latin + numerals in titles
- Empty, no-results, error, and “no supported answer” states
- Keyboard-only capture → search → ask path
- Reduced-motion preference on answer streaming chrome
- Sample vs **Mine** labelling; mock vs operator free-tier vs customer-key mode chrome
- Cookbook: invalid key, verify vs Ask error, operator quota exhausted, revoke/rotate
- Usage strip: available metrics vs honest “unavailable”
- `bdi` isolation for key prefixes, cookbook URLs, usage/request IDs

## Ownership boundaries

- This package does **not** select stack, providers, or architecture (→ `/researcher`, `/architect`).
- This package does **not** specify visual systems or components (→ `/designer`).
- Dual-mode UX refers to **operator free-tier** / **customer key** only — no vendor selection.
- Commander accepts this package before Designer consumption.
- UT-* remain unrun hypotheses and must not drive accepted requirements.

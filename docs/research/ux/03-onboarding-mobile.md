# Onboarding, empty states, activation, and mobile

**Research date:** 2026-09-13  
**SaaS “conversion” mapping:** signup completion → first-note activation → retrieval/ask trust → retention.

---

## 1. Cold-start problem for corpus-dependent products

OmniDoc’s differentiating value (ask-your-notes with citations) requires **user-owned content**. A new account has none.

| Claim | Label | Source |
|-------|-------|--------|
| For data-dependent SaaS, the first-use empty state *is* the product experience | **Common practice** / industry UX writing | Kompassify empty-states guide (2026); SaaS empty-state playbooks — accessed 2026-09-13 |
| Empty states that explain What / Why / Next reduce dead-ends | **Common practice** | SaaS Factor / Pixxen / 72Technologies empty-state articles — accessed 2026-09-13 |
| Demo/sample content can illustrate success before user investment | **Common practice** | Same; classic onboarding pattern (UserOnboard empty states) |
| NotebookLM value proposition assumes sources are already present; creation UX emphasizes turning sources into useful artifacts | **Cited / official** | Google Blog, 2025-07-29, “How Google developed and tested NotebookLM” — **CITE-15** https://blog.google/innovation-and-ai/products/developing-notebooklm/ |

**CITE-15 implication:** Competitive “ask your sources” products succeed when users can get sources in quickly and immediately do something useful with them (suggest questions, cite answers). OmniDoc should optimize **time-to-first-grounded-answer**, not time-to-empty-dashboard.

---

## 2. Empty-state inventory (OmniDoc-relevant)

| Empty state | User question | One primary next step (recommendation) | Evidence |
|-------------|---------------|----------------------------------------|----------|
| First login / no notes | “What do I do?” | Create note **or** Import | Common practice; REC-07 |
| Notes exist, never Asked | “Why is this better than Notes?” | Ask a starter question on sample or first note | OBS-14; REC-08 |
| Search no results | “Did I lose it?” | Clear filters / try Ask / create note | Common practice |
| Ask with empty corpus | “Why can’t it answer?” | Explain need for notes + capture/import CTA | CITE-13 logic |
| Ask with no support | “Is the AI broken?” | No supported answer + browse sources | CITE-10, CITE-13 |
| Import in progress | “Is it working?” | Progress + partial availability rules | Hypothesis UT-3 |

**Rule (project recommendation REC-07):** One primary CTA per empty state; secondary escape hatch OK (import, sample corpus, skip).

---

## 3. Import paths and time-to-first-value

| Path | Role in activation | Friction | Label |
|------|--------------------|----------|-------|
| Type first note | Fastest emotional win | Blank-page anxiety | Common practice |
| Paste from clipboard | High for power users | Format loss | Hypothesis |
| File import (md/pdf/txt) | Fast corpus for Ask demo | Wait for indexing; silent failure | Hypothesis UT-3 |
| Sample / demo corpus | Portfolio demo + onboarding | Must be clearly marked non-user data | Portfolio need; REC-08 |
| Sync from other apps | High desire | Out of Phase 0; unknown | Unknown |

**Time-to-first-value (TTFV) definition — project recommendation:**

> **Activated** = user has (a) at least one retained note **and** (b) completed either a successful retrieve (opened a found note via search/recents) **or** an Ask that showed at least one inspectable citation **or** an explicit no-supported-answer state after a real question.

Signup alone is **not** activation. Organization/taxonomy is **not** required for activation.

**Hypothesis UT-1:** Users who reach a cited Ask within first session retain better at D7 than users who only create notes. *(Unrun — not a finding.)*

**Hypothesis UT-2:** Offering a delete-able sample notebook shortens TTFV for evaluators (freelance clients) without confusing “my data” ownership if labelled clearly.

---

## 4. Mobile capture vs desktop reading / asking

### Cited / observed evidence

| ID | Finding | Label |
|----|---------|-------|
| CITE-01 | Capture apps win/lose on open-to-type speed | Cited comparison article |
| CITE-02 | List-first mobile Notes UX adds decision cost | Competitor comparison article |
| OBS-01 | Apple Notes Quick Note / Control Center / Action Button / hot corners = system-level capture | Competitor observation (Apple help + how-to articles) |
| OBS-02 | Notion mobile still slower / heavier than native Notes for quick capture | Competitor observation (Dockling 2026 comparison) |
| OBS-17 | NotebookLM mobile lagged desktop for source management / studio editing in 2026 third-party review | Competitor observation |
| CITE-15 | Google reports mobile app drove usage growth; Audio Overviews created on mobile | Official blog Jul 2025 |

### Behavioural split (labelled)

| Context | Dominant job | UX priority | Label |
|---------|--------------|-------------|-------|
| Mobile | Capture, voice/photo later, light review | Speed, write-first, defer organize, offline-ish honesty | Project recommendation from CITE-01/02 + OBS-01 |
| Desktop | Read long notes, Ask with citation panel, import | Dual-pane source inspection, keyboard, density | CITE-11/12 + OBS-14 |

**Hypothesis UT-5:** Mobile users will abandon Ask if citation inspection requires >2 taps or horizontal source panels that don’t fit.

**Project recommendation (REC-09):** Design mobile for capture-first; ensure Ask citation verification has a mobile-specific inspection path (not a shrunk desktop).

---

## 5. Onboarding sequence (design-facing, not wireframes)

Suggested journey for later Designer work (evidence-linked):

1. **Account created** → empty notes with single CTA: “Write your first note” (secondary: Import / Try sample).
2. **First note saved** → soft prompt: “Ask a question about this note” with 1–2 suggested questions (OBS-14 pattern).
3. **First Ask** → teach citation click once (tooltip/coach only once).
4. **Defer** folders/tags until after activation (CITE-03–CITE-06).

---

## 6. Portfolio / demo cold-start

Freelance clients evaluating OmniDoc in ≤60s will not build a personal corpus. Therefore:

- Sample corpus + pre-seeded Ask examples are **activation for evaluators**, distinct from end-user activation (see [06-portfolio-credibility.md](./06-portfolio-credibility.md)).
- Mark sample content clearly (ownership clarity = trust).

**@user gate (open):** Whether production demos ship with a public sample workspace vs local mock-only — product/demo decision, not closed by this research.

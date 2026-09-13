# Prioritized friction list and labelled hypotheses

**Research date:** 2026-09-13  
**Priority key:** P0 = blocks activation or destroys trust; P1 = major journey friction; P2 = polish / secondary.

---

## Prioritized friction list

| Pri | Friction | Journey | Basis | ID |
|-----|----------|---------|-------|-----|
| P0 | Captures require folder/tag/database choice before typing | Capture / Organize | CITE-03–06, OBS-04–06 | F-01 |
| P0 | Answers without inspectable passage-level citations | Ask | CITE-09–12, OBS-14 | F-02 |
| P0 | System answers when corpus does not support (no refusal UX) | Ask | CITE-13, CITE-10 | F-03 |
| P0 | Empty first session with no path to first note or sample Ask | Onboarding | Common practice + CITE-15 | F-04 |
| P0 | Wrong/mismatched citations that look authoritative | Ask | CITE-11, CITE-14 | F-05 |
| P1 | Slow open-to-type on mobile | Capture | CITE-01, OBS-01–02 | F-06 |
| P1 | Citation inspection impractical on mobile | Ask / Mobile | OBS-17; UT-5 | F-07 |
| P1 | Search/Ask miss content user knows exists | Retrieve / Ask | OBS-13 | F-08 |
| P1 | Stale notes summarized as current | Ask | OBS-16 | F-09 |
| P1 | Import/index lag with no status → “Ask doesn’t work yet” | Onboarding | UT-3 | F-10 |
| P1 | Streaming answers break screen-reader comprehension | Ask / A11y | CITE-07–08 | F-11 |
| P2 | Over-rich organization UI before activation | Organize | CITE-04–06 | F-12 |
| P2 | No recovery when answer is wrong | Ask | UT-9 | F-13 |
| P2 | Ambiguous autosave / “did it save?” | Capture | UT-4 | F-14 |
| P2 | Mixed-content notes (URLs, code) hard to scan in results | Retrieve | Fixtures need; hypothesis | F-15 |

Friction rows marked with only UT-* remain **hypotheses** until tested.

---

## Labelled hypotheses and unrun tests (UT-1 … UT-14)

> **None of the following are findings.** They are validation plans.

| ID | Hypothesis | Method | Success signal (suggested) | Related friction |
|----|------------|--------|----------------------------|------------------|
| UT-1 | Users who complete a cited Ask in session 1 show higher D7 return than note-only users | Cohort analytics **or** moderated longitudinal (n≈8–12) | Higher return / stated intent | F-04 |
| UT-2 | Labelled sample corpus shortens evaluator TTFV without ownership confusion | Moderated first-run with freelancers/clients as stand-ins | Can complete Ask <3 min; correctly identify sample vs mine | F-04, portfolio |
| UT-3 | Visible import/index progress reduces “Ask is broken” false reports | Usability + task: import then Ask | Fewer premature Ask attempts; correct wait | F-10 |
| UT-4 | Explicit saved state reduces duplicate notes | Capture task with network delay simulation | Lower duplicate rate; higher confidence | F-14 |
| UT-5 | Mobile Ask with ≤2-tap passage preview beats title-only citations for verification | Mobile moderated test | Higher verification accuracy | F-07 |
| UT-6 | Recents + inbox outperform folder browse for re-find in first week | Retrieve tasks | Faster successful open | Retrieve |
| UT-7 | Showing last-updated on source chips reduces stale over-trust | A/B Ask UI | More “check date” behaviors; lower false confidence | F-09 |
| UT-8 | After ~20+ notes, users prefer Ask over browse **if** citations work | Diary study / interview | Stated preference shift | Retrieve→Ask |
| UT-9 | Wrong-answer recovery (open source + re-ask + feedback) restores willingness to use Ask | Scenario with planted bad answer | Willingness Likert recovers | F-13 |
| UT-10 | Passage-preview citations improve verification vs title-only | Controlled A/B | Higher catch rate of unsupported claims | F-02, F-05 |
| UT-11 | Explicit no-supported-answer preferred over hedged speculation | Scenario insufficient corpus | Higher post-task trust | F-03 |
| UT-12 | Unlabelled general-knowledge answers are noticed and punished | Planted leakage scenario | Detection rate; trust drop | Ask integrity |
| UT-13 | Sighted users prefer streaming for answers >~80 words | Preference test | Preference + task time | Ask |
| UT-14 | Citations appearing only after stream completes reduce unchecked acceptance vs mid-stream badges | A/B | More citation clicks before decision | Ask trust |

### Planned but unnamed follow-ons

- Keyboard-only full journey (capture → search → ask → citation) — tie to a11y fixtures.
- Contrast / focus visibility under demo projector conditions (portfolio).

---

## Evidence vs hypothesis count (this file)

- Friction rows grounded primarily in cited/competitor evidence: **11** (F-01–F-11, with F-07/F-10 partially hyp)
- Pure hypothesis-driven friction: **4** (F-12–F-15 mix)
- Unrun tests: **14** (UT-1–UT-14)

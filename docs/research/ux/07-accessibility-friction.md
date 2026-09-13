# Accessibility-related friction (customer experience)

**Research date:** 2026-09-13  
**Framing:** How accessibility failures feel to customers — **not** implementation specifications.  
**Locale:** `en` LTR. RTL deferred — do not invent RTL shopping/locale findings. Mixed-content readability (code, URLs, identifiers) is in scope.

---

## 1. Keyboard-only capture and navigation

| Friction users feel | Why it matters for OmniDoc | Evidence |
|---------------------|----------------------------|----------|
| Cannot reach “New note” or editor without mouse | Capture journey fails for keyboard users | Common a11y practice; WCAG keyboard operable |
| Focus lost after save / route change | Disorientation; duplicate capture | Common practice |
| Search and Ask not in logical tab order | Retrieve/Ask unreachable efficiently | Common practice |
| Citation controls hover-only | Cannot verify answers — trust journey breaks | CITE-07 guidance (reveal on focus) |

**Hypothesis:** Keyboard-only users will abandon Ask if citation targets are not keyboard-reachable (validate with keyboard fixture pass).

---

## 2. Screen readers in editors and answer streams

### Cited evidence

| ID | Finding | Source |
|----|---------|--------|
| CITE-07 | Streaming tokens into live regions produces unusable stutter; announce generating + response ready; keep focus in composer; provide explicit “go to latest” | https://accessibility.build/guides/accessible-ai-chat — accessed 2026-09-13 |
| CITE-08 | Streaming’s visual skim benefit does not transfer to serial audio; live polite/assertive both fail under token streams | Multigrid / WPS accessibility essays — accessed 2026-09-13 |
| CITE-19 | `aria-live` semantics and polite vs assertive behaviour | MDN ARIA live regions — accessed 2026-09-13 |
| CITE-20 | Rich text editors need labelled editing surface, toolbar pattern, predictable Tab/Escape — otherwise authors cannot format or exit | Accessible RTE design articles summarizing WAI-ARIA patterns — accessed 2026-09-13 |

### Customer-experienced outcomes

- Answer “speaks” gibberish mid-stream → user stops using Ask.
- Focus jumps to streaming text → user loses place in composer.
- Editor announced as cryptic “edit” without name → cannot capture confidently.
- Citation “1” without accessible name → cannot verify.

---

## 3. Reduced motion, contrast, focus

| Area | User friction if ignored | Label |
|------|--------------------------|-------|
| Reduced motion | Nausea / distraction from answer shimmer, skeleton thrash | WCAG / preference common practice |
| Contrast | Citations/chips unreadable; trust UI fails | WCAG; CITE-18 professional expectation |
| Focus visibility | Keyboard users cannot see where they are | WCAG 2.4.7 |
| Hover-only tips | Touch and keyboard miss coaching | WCAG 1.4.13 related |

---

## 4. Mixed-content readability (notes UX)

Notes contain code, URLs, IDs, tables. Friction:

- Screen readers may spell endless URLs; users need skip/structure.
- Visual users lose keywords inside long unbroken strings in search snippets.
- Directionality: even in LTR `en`, inline code/identifiers should remain semantically isolated for future RTL-readiness (**discipline**, not RTL locale research).

**Fixtures (recommend):** long URLs, fenced code, markdown tables, long tokens — for both usability and Phase Check.

---

## 5. Design-facing recommendations (experience-level)

See REC-10, REC-11 in [08-design-facing-recommendations.md](./08-design-facing-recommendations.md).

Summary:

- Treat Ask streaming as a **visual** affordance with **status** announcements, not live token speech.
- Make every trust control (citation, source open, feedback) keyboard and AT reachable.
- Empty/error/refusal states must be announced and not rely on color alone.

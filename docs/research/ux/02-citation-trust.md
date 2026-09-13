# Citation trust and AI-answer skepticism

**Research date:** 2026-09-13  
**Scope:** Ask-your-notes answers grounded in the user’s own corpus.  
**Not in scope:** General web chatbots, commerce trust badges.

---

## 1. What makes users believe or disbelieve an answer

### Cited evidence

| ID | Finding | Source | Notes |
|----|---------|--------|-------|
| CITE-09 | Presence of citations **significantly increased** self-reported trust in LLM answers — **even when citations were random**. Trust **decreased** when participants actually checked citations. | Ding et al., arXiv:2501.01303 (2025) https://ar5iv.labs.arxiv.org/html/2501.01303 | Critical for OmniDoc: citations are a trust *surface*, not automatically a truth surface |
| CITE-10 | When systems are intermittently wrong, users struggle to know when to trust; ignorable footers are weak mitigations; source drill-downs and support breadth help | NN/g, “AI Hallucinations: What Designers Need to Know” https://www.nngroup.com/articles/ai-hallucinations/ | Design guidance from expert review + cited studies |
| CITE-11 | A citation that cannot be cheaply verified is a credibility badge without information; **mismatched real sources are more dangerous than missing citations** because they suppress skepticism | Multigrid, “Citations and Sources in an AI Interface” https://multigrid.ai/learn/citation-ux | Practitioner analysis; treat as strong design logic, not OmniDoc user study |
| CITE-12 | Experts recommend claim↔source co-location, indexed refs, color/linking, short paths to original PDF/passage; communicate uncertainty without numeric fake precision | ACM CUI ’25 “Un-trusting the Chat…” https://dl.acm.org/doi/10.1145/3719160.3737620 | Co-design with HCI/AI experts — **not** end-user validation |
| CITE-13 | Trustworthy RAG includes **learning to refuse** when documents lack support; metrics cover grounded refusals, citation support, citation relevance | Zhou et al., arXiv:2409.11242 https://arxiv.org/html/2409.11242v4 | Model/eval paper — UX implication: refusal must be a first-class UI state |

### Hypotheses (OmniDoc — unvalidated)

| ID | Hypothesis | Validation |
|----|------------|------------|
| UT-10 | Users will rate answers with **passage previews** as more trustworthy *and* will catch more unsupported claims than answers with title-only citations | Moderated usability: same questions, A/B citation UI; measure trust Likert + verification accuracy |
| UT-11 | Explicit “No supported answer in your notes” will retain more trust after a hard question than a hedged speculative answer | Scenario test with empty/insufficient corpus |

---

## 2. Role of citations, source previews, and passage traceability

### Competitor observations

| ID | Observation | Product | Access limit |
|----|-------------|---------|--------------|
| OBS-14 | Inline citations were an early user-requested feature; answers grounded in user-selected sources; citation click → source location | NotebookLM | Official Google blog 2025-07-29 describes feature genesis; full interaction verified via secondary guides |
| OBS-15 | Users can scope which sources are in play for a question | NotebookLM | Documented in product guides (2026) |
| OBS-18 | Clickable citations to pages consulted; useful for audit | Notion AI | Third-party reviews 2026; enterprise search variants |
| OBS-19 | Independent testing claims high “pointer” rate to supporting text but nonzero mismatch; mobile source UX weaker than desktop | NotebookLM reviews (2026) | Third-party benchmarks — treat numbers as **observation of published tests**, not OmniDoc metrics |

### Design-facing principles (from evidence)

1. **Minimize verify_time** (CITE-11): citation → highlighted passage in context, same session, ≤2 interactions ideally (CITE-12).
2. **Claim-level linking beats dump-of-sources** (CITE-11, CITE-12): users need to know *which sentence* is supported.
3. **Do not show a citation that fails entailment** (CITE-11): no citation > wrong citation.
4. **Warn that grounding ≠ accuracy** (OBS-guide pattern; Google warns NotebookLM can err): corpus can be wrong, outdated, or incomplete.

**Project recommendation (REC-04):** Ask UI must treat citation inspection as the primary trust loop, not a footnote.

---

## 3. When the corpus does not support an answer

### Cited evidence

- **CITE-13:** Refusal capability is part of RAG trustworthiness (answerability detection).
- **CITE-10:** Transparent communication of limits beats silent confidence.

### Recommended UI states (recommendations, not designs)

| State | User-facing meaning | Risk if missing |
|-------|---------------------|-----------------|
| Supported answer | Claims linked to passages | — |
| Partial / weak support | Some claims cited; others marked unsupported | Users assume full support |
| No supported answer | Explicit refusal + suggestions (browse notes, import, rephrase, broaden scope) | Fabrication |
| Conflict | Sources disagree; show both | Hidden contradiction |
| Stale risk | Source last updated long ago / user-marked outdated | Silent over-trust (OBS-16) |

**Hypothesis UT-11** covers refusal preference.

---

## 4. Hallucination and stale-source risk in the interface

| Risk | How it surfaces in UX | Evidence |
|------|----------------------|----------|
| Fluent wrong answer | Confident prose, no doubt markers | CITE-10 |
| Citation halo | Badge next to unsupported claim | CITE-09, CITE-11 |
| Hallucinated / dead citation | Click goes nowhere or wrong place | Academic critique of NotebookLM fact-checking (arXiv:2505.01955, 2025) → **CITE-14** |
| Stale source | Summarizes abandoned project notes as current | OBS-16 (Notion AI pilot anecdote in 2026 DEV review — **competitor observation / anecdote**, not OmniDoc data) |
| Out-of-corpus leakage | Answer uses general knowledge as if from notes | Core RAG failure mode; UX must label “from your notes” vs “model knowledge” — **Hypothesis UT-12** that users notice and punish unlabeled leakage |

**CITE-14:** Wu et al. / related NotebookLM medical-education critique (arXiv:2505.01955, May 2025) — documents cases of unsupported outputs and problematic citations even with uploaded sources.  
https://arxiv.org/pdf/2505.01955

---

## 5. Streaming vs complete answers

| Audience | Streaming effect | Evidence |
|----------|------------------|----------|
| Sighted users | Early skim; perceived speed | Common practice; **Hypothesis UT-13** that OmniDoc users prefer streaming for long answers |
| Screen-reader users | Token-live announcements are harmful; announce start + ready | CITE-07, CITE-08 |
| Trust | Incomplete stream may show claims before citations attach | **Hypothesis UT-14**: deferred citation attachment during stream increases unchecked acceptance |

**Project recommendation (REC-05):** Visual streaming OK; status announcements for AT; commit citations with completed/stable claim units; never auto-steal focus (see a11y file).

---

## 6. Recovery when an answer is wrong

Observed / recommended recovery paths (mix of common practice + hypotheses):

1. Open cited passage → user sees mismatch → distrust that claim.
2. “Show sources used” / “Open note” always available.
3. Feedback on answer (helpful / wrong) — portfolio signal + future eval fuel (**Hypothesis** that users will use it if low-friction).
4. Edit source note → re-ask (indexing lag must be communicated — technical ownership elsewhere; UX needs honest “updating…” state).
5. Save answer as note only when user opts in (avoid polluting corpus with unverified AI text) — **project recommendation REC-06**.

**Unknown:** Optimal recovery chrome for OmniDoc — validate in UT-9.

---

## 7. Traceability checklist for Designer / Architect consumption

| Requirement | Evidence IDs | Validation |
|-------------|--------------|------------|
| Claim ↔ passage link | CITE-11, CITE-12, OBS-14 | UT-10 |
| Passage preview without leaving Ask | CITE-11 | UT-10 |
| First-class no-supported-answer | CITE-13, CITE-10 | UT-11 |
| No decorative citations | CITE-09, CITE-11 | Phase Check + UT-10 |
| Stale / last-updated cue on sources | OBS-16 | UT-7 / future |
| Wrong-answer recovery path | — | UT-9 |
| Streaming + a11y status pattern | CITE-07, CITE-08 | a11y fixtures |

---

## What this file does **not** decide

- Retrieval algorithm, chunking, or provider choice (`/researcher`, `/architect`).
- Visual citation component specs (`/designer`).
- Production AI activation (open gate).

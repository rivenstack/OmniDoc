# Design-facing recommendations

**Research date:** 2026-09-13  
**Consumers:** `/designer` (interaction/visual later), `/architect` (experience constraints), `/commander` (acceptance).  
**Not included:** Visual system, components, stack, providers.

Each recommendation cites evidence IDs. Unrun tests remain hypotheses.

---

## Priority ordered recommendations

### REC-01 — Write-first capture; defer organization

**Recommendation:** Default new-note flow should place the cursor in an editor with **no required** folder/tag/database decision. Offer optional organize after save or from an inbox.

**Evidence:** CITE-01, CITE-02, CITE-03, CITE-04, CITE-05, CITE-06, OBS-01, OBS-06, F-01  
**Validates via:** UT-4 (save confidence), capture tasks in future UT suite  
**Architect note:** Experience constraint only — no storage model mandated.

---

### REC-02 — Paste and import are first-class capture

**Recommendation:** Parity CTAs for type / paste / import on empty and shell surfaces. Import must expose progress before Ask is encouraged.

**Evidence:** CITE-15, F-04, F-10, empty-state common practice  
**Validates via:** UT-3

---

### REC-03 — Light optional structure; invest in retrieve + ask

**Recommendation:** Do not center IA on deep taxonomy for v1 activation. Prefer inbox + search + Ask; folders/tags optional and simple.

**Evidence:** CITE-04–CITE-06, OBS-06–OBS-10, F-12  
**Validates via:** UT-6, UT-8

---

### REC-04 — Citation inspection is the primary Ask trust loop

**Recommendation:** Every supported claim should link to an inspectable **passage** (not only note title). Prefer same-view preview; avoid citations that cannot be checked cheaply. Prefer no citation over a mismatched one.

**Evidence:** CITE-09, CITE-10, CITE-11, CITE-12, OBS-14, OBS-18, F-02, F-05  
**Validates via:** UT-10  
**Architect note:** Citation payload must include passage anchors — UX requires it; retrieval design owned elsewhere.

---

### REC-05 — Streaming for sighted skim; status for assistive tech

**Recommendation:** Allow visual streaming; do not expose token streams as live-region speech. Announce generating / ready; keep focus in composer unless user requests jump.

**Evidence:** CITE-07, CITE-08, CITE-19, F-11  
**Validates via:** a11y fixtures; UT-13, UT-14

---

### REC-06 — Do not auto-write AI answers into the corpus

**Recommendation:** Saving an answer as a note is explicit/opt-in, with clear “AI-generated” labelling if saved.

**Evidence:** OBS-14 (save responses as notes as a deliberate feature); trust risk inference from CITE-10  
**Validates via:** UT-9 adjacent

---

### REC-07 — Empty states: What / Why / one Next

**Recommendation:** First-run and Ask-empty states answer what this is, why it’s empty, and offer **one** primary CTA (write or import); secondary sample/demo allowed.

**Evidence:** Empty-state common practice sources (2026 guides); F-04  
**Validates via:** UT-1, UT-2

---

### REC-08 — Define activation; ship sample path for demos

**Recommendation:** Treat activation as note + (retrieve success **or** cited Ask **or** honest refusal). Provide a clearly labelled sample corpus for portfolio demos and cold start.

**Evidence:** CITE-15, portfolio CITE-16–17, F-04  
**Validates via:** UT-1, UT-2  
**@user gate:** Mock-only vs live provider in demos (experience-first).

---

### REC-09 — Mobile capture-first; mobile-specific citation inspection

**Recommendation:** Optimize phone for fast capture. Do not ship Ask on mobile without a workable passage-verify path (≤2 taps target — **hypothesis UT-5**).

**Evidence:** CITE-01, OBS-01, OBS-17, F-06, F-07  
**Validates via:** UT-5

---

### REC-10 — Refusal and partial-support are first-class UI states

**Recommendation:** Support: full answer, partial (unsupported spans marked), no-supported-answer with next steps, and conflict. Never fail open into speculative “helpful” prose when corpus lacks support.

**Evidence:** CITE-13, CITE-10, CITE-14, F-03  
**Validates via:** UT-11, UT-12

---

### REC-11 — Trust controls are accessible

**Recommendation:** Citation open, source preview, feedback, and cancel must work with keyboard and screen readers; no hover-only trust actions; visible focus; contrast for chips/links; respect reduced motion on Ask chrome.

**Evidence:** CITE-07, CITE-08, CITE-18, CITE-20, F-11  
**Validates via:** keyboard/AT fixtures

---

### REC-12 — Portfolio demo script baked into experience quality bar

**Recommendation:** Phase acceptance should include a 60-second path: sample/import → Ask → passage citation → refusal example → mixed-content note visible. Absence of these reads as tutorial-grade.

**Evidence:** CITE-16–18, F-02–F-04, portfolio file  
**Validates via:** Client-style walkthrough hypothesis; Phase Check later

---

## Mapping to Architect (constraints only)

| Experience constraint | Recs |
|-----------------------|------|
| Passage-level citation data available to UI | REC-04 |
| Answerability / refusal signal available to UI | REC-10 |
| Indexing/import job state visible | REC-02, UT-3 |
| AI outputs not silently persisted | REC-06 |
| Mock deterministic Ask available pre-production | REC-08, experience-first rule |

No framework or provider selection implied.

---

## Mapping to Designer (later)

Designer should consume REC-01–REC-12 as **behavioural requirements**, then specify visuals/components. Do not invent additional customer findings beyond this package + future UT results.

---

## Top 5 for Commander summary

1. **REC-01** Write-first capture  
2. **REC-04** Passage-level citation trust loop  
3. **REC-10** Honest refusal / no-supported-answer  
4. **REC-08** Activation + sample corpus for cold start/demo  
5. **REC-09** Mobile capture + verifiable Ask  

# Design-facing recommendations

**Research date:** 2026-09-13; **amended** 2026-09-14 (Task 0.8b — REC-13…REC-19)  
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

**Recommendation:** Treat activation as note + (retrieve success **or** cited Ask **or** honest refusal). Provide a clearly labelled sample corpus for portfolio demos and cold start. Ship **public labelled sample** plus **clone-and-run fixtures**. Mock Ask satisfies activation; customer keys are not required for first value (see REC-13).

**Evidence:** CITE-15, portfolio CITE-16–17, F-04; Commander YES sample + fixtures (2026-09-14)  
**Validates via:** UT-1, UT-2  
**Gate:** Live operator path only after CX-first mock validation (REC-13).

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

### REC-13 — Mock-first dual-mode spine (mock → labelled live demo → BYOK)

**Recommendation:** Default onboarding and portfolio Ask path stays on **mock / deterministic** answers until Customer Experience First is validated. After that gate, offer an explicitly labelled **live demo (operator free-tier)**. Introduce **customer key (BYOK)** as scale — never as the first-session prerequisite. Do not design live-AI-first onboarding that skips mocks.

**Evidence:** Experience-first rule (`context.md`); CITE-15; REC-08; F-04; [09-byok-cookbook-and-dual-mode.md](./09-byok-cookbook-and-dual-mode.md)  
**Validates via:** UT-15, UT-16, UT-17  
**Architect note:** Ports must expose runtime mode (mock | operator free-tier | customer key); UI never calls providers.

---

### REC-14 — Cookbook/wizard: create elsewhere → paste → verify → first Ask

**Recommendation:** Ship a chapter-based cookbook that grows as tools are added. Shared shell: why BYOK → external create steps → paste → verify → guided first Ask → revoke/rotate. OmniDoc does not mint provider keys. Mask keys after save; require re-entry to replace.

**Evidence:** CITE-22, CITE-23, OBS-23–OBS-27, Commander dual-mode input  
**Validates via:** UT-21  
**Architect note:** Verify and Ask failure signals must be distinguishable to the UI.

---

### REC-15 — Portfolio-scale usage / charges chrome

**Recommendation:** Show a compact usage strip near Ask: active mode + period usage when APIs allow + link to cookbook. Soft-warn before operator-quota hard stop. If usage is unavailable, say so honestly. Do **not** ship enterprise billing dashboards, seat matrices, or fabricated dollar burn.

**Evidence:** CITE-22–23; Commander “usage if possible”; portfolio framing  
**Validates via:** UT-19, UT-20

---

### REC-16 — Dual-mode failure states name the mode and what still works

**Recommendation:** Cover invalid key, wrong-chapter/scope, operator quota exhausted, customer key quota/rate limit, revoke, rotate, and transport errors. Copy must state **which mode failed** and that **mock Ask remains available** when only live paths fail (unless the whole product is down). Never silent fallback between operator free-tier and customer key.

**Evidence:** OBS-26–27, architecture §9 transport/quota themes, F-03 adjacent honesty  
**Validates via:** UT-18, UT-21

---

### REC-17 — Trust copy: no ZDR implication; sample vs mine; mode honesty

**Recommendation:** Do not imply zero-retention while ~30-day abuse-log retention is accepted. Always label **Sample** vs **Mine** corpus and **Mock** vs **Live · operator free-tier** vs **Live · your key**. Keep “from your notes” vs model-knowledge labelling (UT-12).

**Evidence:** CITE-21, CITE-09–12, REC-08, UT-2, UT-12  
**Validates via:** UT-16, UT-17

---

### REC-18 — Honest workspace/team chrome at minimal year-1 scale

**Recommendation:** Workspace and team UI must be correct for solo / few tenants. Prefer honest empty “solo workspace” over fake enterprise org charts, SSO walls, or placeholder team directories. Design for later scale without simulating it now.

**Evidence:** Commander year-1 minimal tenants gate; CITE-17 (empty/error honesty analogy); portfolio credibility  
**Validates via:** UT-22

---

### REC-19 — Cookbook, usage, and mode chrome meet the trust a11y bar

**Recommendation:** Keyboard-complete cookbook and mode switch; labelled controls; status announcements for verify/mode (not key characters); visible focus; contrast; reduced motion. Document `lang`/`dir` from locale shell; logical CSS; `bdi` (or equivalent) for key prefixes, cookbook URLs, usage/request IDs. RTL locale remains deferred — do not claim RTL support.

**Evidence:** CITE-07–08, CITE-18–20, REC-11, architecture §8, F-11, F-15  
**Validates via:** keyboard/AT fixtures; Phase Check

---

## Mapping to Architect (constraints only)

| Experience constraint | Recs |
|-----------------------|------|
| Passage-level citation data available to UI | REC-04 |
| Answerability / refusal signal available to UI | REC-10 |
| Indexing/import job state visible | REC-02, UT-3 |
| AI outputs not silently persisted | REC-06 |
| Mock deterministic Ask available pre-production | REC-08, REC-13, experience-first rule |
| Runtime mode exposed to UI (mock / operator free-tier / customer key) | REC-13, REC-16, REC-17 |
| Key verify vs Ask failure distinguishable; quota class (operator vs customer) | REC-14, REC-16 |
| Usage availability flag (present or honest unavailable) | REC-15 |
| Sample vs mine labelling in fixtures and APIs | REC-08, REC-17, architecture §9 |

No framework or provider selection implied.

---

## Mapping to Designer (later)

Designer should consume REC-01–REC-19 as **behavioural requirements**, then specify visuals/components. Do not invent additional customer findings beyond this package + future UT results. Dual-mode / cookbook detail: [09-byok-cookbook-and-dual-mode.md](./09-byok-cookbook-and-dual-mode.md).

---

## Top recommendations for Commander summary

1. **REC-01** Write-first capture  
2. **REC-04** Passage-level citation trust loop  
3. **REC-10** Honest refusal / no-supported-answer  
4. **REC-08** / **REC-13** Activation + sample corpus; mock-first dual-mode spine  
5. **REC-09** Mobile capture + verifiable Ask  
6. **REC-14**–**REC-17** Cookbook, usage strip, failure honesty, no-ZDR / sample-vs-mine labelling  
7. **REC-18**–**REC-19** Minimal-scale workspace honesty + cookbook/usage a11y  

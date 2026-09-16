# Traceability — D-01 Design Package

**Owner:** `/designer` · **Handoff:** D-01
**Purpose:** prove every design decision traces to accepted UX evidence
(`REC-01…REC-19`) and/or accepted architecture (ports, §4 answer states,
§8 locale, §9 fixtures) — and provide the acceptance map Phase Check can
run.

**Non-claims:** no UT-* is treated as a finding; nothing here closes the
production-AI gate, the RTL-locale gate, or any `@user` gate.

---

## 1. REC-01…REC-19 → spec trace

| REC    | Statement (short)                                | Spec location(s)                                                                                               |
| ------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| REC-01 | Write-first capture; defer organization          | `journeys/capture.md` §1, §2, §4; `shell/…` §2.2                                                               |
| REC-02 | Paste & import are first-class                   | `journeys/capture.md` §1, §6; `states/empty-loading-error-indexing.md` §6                                      |
| REC-03 | Light optional structure; invest in retrieve/ask | `journeys/organize.md` §1–§3; `shell/…` §1                                                                     |
| REC-04 | Passage-level citation is the trust loop         | `journeys/ask.md` §2, §3; `foundations/tokens.md` §2.4                                                         |
| REC-05 | Streaming for sighted; status for AT             | `journeys/ask.md` §5; `foundations/content-and-voice.md` §5; `accessibility/…` §4                              |
| REC-06 | No auto-write AI answers into corpus             | `journeys/ask.md` §6; `journeys/capture.md` §1; `components/inventory.md` `SaveAnswerAsNoteAction`             |
| REC-07 | Empty states What/Why/one Next                   | `states/empty-loading-error-indexing.md` §1–§3                                                                 |
| REC-08 | Define activation; labelled sample path          | `states/sample-vs-mine.md` §5, §6; `states/…indexing` §2                                                       |
| REC-09 | Mobile capture-first; mobile citation path       | `journeys/capture.md` §3; `journeys/ask.md` §9; `shell/…` §3                                                   |
| REC-10 | Refusal/partial first-class                      | `journeys/ask.md` §4; `dual-mode/failure-states.md` §1; `foundations/content-and-voice.md` §4                  |
| REC-11 | Trust controls accessible                        | `accessibility/…` §1–§8; `journeys/ask.md` §8                                                                  |
| REC-12 | 60-second portfolio script                       | `states/sample-vs-mine.md` §6                                                                                  |
| REC-13 | Mock-first dual-mode spine                       | `dual-mode/mode-corpus-and-usage.md` §1, §2; `README.md` §Non-negotiable 5                                     |
| REC-14 | Cookbook create→paste→verify→Ask                 | `dual-mode/cookbook-wizard.md` §2, §3                                                                          |
| REC-15 | Portfolio-scale usage strip                      | `dual-mode/mode-corpus-and-usage.md` §3                                                                        |
| REC-16 | Failures name mode + what still works            | `dual-mode/failure-states.md` §1–§6                                                                            |
| REC-17 | No ZDR; sample vs mine; mode honesty             | `foundations/content-and-voice.md` §2; `dual-mode/mode-corpus-and-usage.md` §2, §4; `states/sample-vs-mine.md` |
| REC-18 | Honest workspace chrome at n≈1                   | `shell/app-shell-and-navigation.md` §4; `foundations/content-and-voice.md` §8                                  |
| REC-19 | Cookbook/usage meet trust a11y bar               | `dual-mode/cookbook-wizard.md` §5; `dual-mode/mode-corpus-and-usage.md` §7; `accessibility/…` §8               |

---

## 2. Architecture → spec trace

| Architecture                                                      | Requirement                                                                                     | Spec location(s)                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| §1 experience-first boundary (UI → ports only)                    | No provider SDK in client                                                                       | `README.md` §Non-negotiable 1; `components/inventory.md` §13                    |
| §2 tenancy / server-authoritative membership                      | Client never invents authz; forbidden is generic                                                | `shell/…` §4.3; `dual-mode/failure-states.md` F10; `journeys/organize.md` §6    |
| §3 notes/documents; version identity                              | Version-aware citations, save conflict                                                          | `journeys/capture.md` §5; `journeys/ask.md` §2                                  |
| §3 indexing is first-class                                        | Visible progress before Ask                                                                     | `states/empty-loading-error-indexing.md` §6                                     |
| §4 answer states                                                  | `supported`/`partial`/`no_supported_answer`/`conflict`/`refused_policy` all rendered as success | `journeys/ask.md` §4; `foundations/content-and-voice.md` §4                     |
| §4 citation payload (note/version/chunk/offset/preview/updatedAt) | Passage preview + stale cue                                                                     | `journeys/ask.md` §2, §3                                                        |
| §4 refusal is a success outcome                                   | Neutral styling, never error                                                                    | `foundations/tokens.md` §2.4; `states/…indexing` §2 (E8)                        |
| §5.1 notes port                                                   | Save states derived from port                                                                   | `journeys/capture.md` §5                                                        |
| §5.2 ingestion port                                               | Per-file status, partial support                                                                | `journeys/capture.md` §6; `states/…indexing` §6                                 |
| §5.5 search port                                                  | Snippet safety, no leakage                                                                      | `journeys/retrieve.md` §3, §4                                                   |
| §5.6 answer port failures                                         | Mode-named transport/quota copy                                                                 | `dual-mode/failure-states.md` §3                                                |
| §5.9 vault (metadata only)                                        | Masked prefix, write-once, verify                                                               | `dual-mode/cookbook-wizard.md` §3                                               |
| §5.10 usage (`unavailable` first-class)                           | Neutral empty, no fabricated cost                                                               | `dual-mode/mode-corpus-and-usage.md` §3                                         |
| §5.11 runtime mode                                                | Three modes, no silent fallback                                                                 | `dual-mode/mode-corpus-and-usage.md` §1, §2; `failure-states.md` §4             |
| §6 threat boundary                                                | Sanitized render; no secret leakage                                                             | `accessibility/…` §4; `dual-mode/cookbook-wizard.md` §6; `failure-states.md` §6 |
| §8 locale/direction/time                                          | Single `lang`/`dir`; logical CSS; `bdi`; UTC                                                    | `foundations/tokens.md` §8; `accessibility/…` §7                                |
| §9 fixture themes                                                 | Sample/Mine; refusal/partial/conflict; mixed content                                            | `states/sample-vs-mine.md`; `states/…indexing`; `journeys/capture.md` §7        |
| §9 sample vs mine first-class                                     | Chip on every surface                                                                           | `states/sample-vs-mine.md` §2                                                   |
| §10 invariants                                                    | Refusal success; no dual authority; RTL discipline                                              | `README.md` §Non-negotiable; distributed                                        |

---

## 3. Acceptance criteria mapping (handoff §Acceptance)

| Acceptance criterion                                                | Evidence in package                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Specs trace to REC-01…REC-19 and architecture ports                 | §1, §2 above                                                              |
| Four journeys + dual-mode surfaces have implementation-ready states | `journeys/*`, `dual-mode/*`, `states/*`, `components/inventory.md` §1–§11 |
| LTR-now excellence; RTL-readiness documented                        | `accessibility/a11y-and-rtl-readiness.md` §7; per-journey RTL sections    |
| Accessibility specified as a gate, not polish                       | `accessibility/…` §1, §9; per-journey a11y gates; §4 below                |
| No application source generated                                     | Only `docs/design/**` + checklist + memory + handoff Outcome              |
| No provider SDK implied in client                                   | `README.md` §Non-negotiable 1; `components/inventory.md` §13              |

---

## 4. QA checklist cross-reference

`quality/ui-qa-checklist.md` remains the operational gate. This package
**extends** it with design-side acceptance; it does not weaken any check.

| QA section                     | Design spec that satisfies it                                      |
| ------------------------------ | ------------------------------------------------------------------ |
| 1 Keyboard & focus             | `accessibility/…` §2, §3, §8                                       |
| 2 Screen reader                | `accessibility/…` §4; `journeys/ask.md` §5, §8                     |
| 3 Reduced motion               | `foundations/tokens.md` §6; `accessibility/…` §5                   |
| 4 Contrast                     | `foundations/tokens.md` §2.5, §7; `accessibility/…` §6             |
| 5 Long/empty/error/refusal     | `states/empty-loading-error-indexing.md`; `journeys/ask.md` §4, §7 |
| 6 Code/tables/identifiers/URLs | `foundations/tokens.md` §3.2, §3.3; `journeys/capture.md` §4       |
| 7 Logical CSS & `dir`/`lang`   | `accessibility/…` §7                                               |
| 8 Mobile capture               | `journeys/capture.md` §3; `journeys/ask.md` §9; `shell/…` §3       |

---

## 5. Gates preserved (not closed by this package)

| Gate                                | Status after D-01                                    |
| ----------------------------------- | ---------------------------------------------------- |
| Production AI / provider activation | **Open** — mock-first is the designed default        |
| RTL locale support                  | **Deferred, not closed** — readiness discipline only |
| UT-1…UT-22                          | **Unrun** — hypotheses only                          |
| AWS / hosted deploy                 | DevOps I-*; untouched                                |
| Provider / host / model selection   | Architect/Researcher; untouched                      |

---

## 6. Design-side open questions returned to Commander

These are **bounded gaps**, not invented findings. They do not block F-01
and can be answered during implementation:

1. **Exact chapter data** for the cookbook (tool names, external steps,
   verify-probe meaning) depends on `docs/api/` (S-02) and the accepted
   provider posture. Until then, the cookbook shell ships with the
   `Coming soon` placeholder variant.
2. **Usage field availability** per live mode (requests vs tokens vs
   cost) is provider-dependent; the design specifies honest
   `available`/`unavailable` states so the Implementer can wire whichever
   fields exist (§5.10).
3. **Sample workspace deletion semantics** (hide vs delete) affect E10
   copy; design assumes "hide from my view without affecting real data"
   (`states/sample-vs-mine.md` §3).
4. **Second-person membership copy** ("You're the only member" vs role
   labels) is detailed enough to build; confirm exact role vocabulary
   with the identity port when S-02 lands.

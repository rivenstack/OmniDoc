# States — Sample vs Mine (Corpus Ownership)

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-08, REC-17; UT-2 (unrun); CITE-15, CITE-17.
**Architecture:** §9 sample-vs-mine as a **first-class domain/API
concern**; Commander gate (public labelled sample + clone-and-run
fixtures).

**Job:** make corpus ownership unmissable so nobody mistakes public demo
data for their own, and so demos do not look like fake personalization.

> Sample vs Mine is **not** a styling detail. It is a domain/API label
> that must survive from the list row to the citation card.

---

## 1. Label system

| Corpus                 | Label                        | Chip style                    | Persisted in API?                                  |
| ---------------------- | ---------------------------- | ----------------------------- | -------------------------------------------------- |
| Public demo            | **Sample**                   | Neutral outline + layers icon | ✅ (`.corpus: sample`)                             |
| User-owned             | **Mine** (or workspace name) | Accent-subtle + user icon     | ✅ (`.corpus: mine`)                               |
| Clone-and-run fixtures | _(not a UI corpus)_          | —                             | Documented as fixtures, never rendered as a tenant |

**Rule:** the label is **text + icon**, never color-only (QA 4.4), and it
is driven by the API response — never inferred by the client.

---

## 2. Where the label must appear

| Surface                         | Requirement                                                               |
| ------------------------------- | ------------------------------------------------------------------------- |
| Sample workspace banner         | Persistent above canvas: "**Sample** — public demo notes. Not your data." |
| Workspace switcher              | "Sample (public demo notes)" separated from "Mine"                        |
| Notes list rows                 | Per-row corpus chip                                                       |
| Search results                  | Per-row chip **and** a `Corpus` filter (Sample / Mine / Both)             |
| Note reader                     | Chip in the header next to the title                                      |
| Ask composer                    | Corpus scope selector (`Sample` / `Mine` / `Both`)                        |
| Answer card                     | Chip in the header (alongside mode chip)                                  |
| Citation card / passage preview | Chip on each source, so a Sample passage is never read as personal        |
| Export / delete                 | Explicitly scoped; UI states the corpus in the confirmation               |

---

## 3. Sample workspace rules

1. The public sample is a **real workspace record** marked non-personal at
   the API level (architecture §9) — not a client-side mock.
2. It is **read-only** for tenant data purposes: users may explore and
   Ask, and may clone sample notes into "Mine" via an explicit action
   ("Copy to my workspace") which produces a **new** user-owned note.
3. Asking with corpus scope = `Sample` shows a mode + corpus hint in the
   answer header: "Mock · sample answers · Sample corpus".
4. Sample content must not include fabricated testimonials, user counts,
   or accuracy badges (portfolio guardrails).
5. The sample must be **deletable** from the user's view (hide the sample
   workspace) without affecting real data (UT-2 context).

---

## 4. Clone-and-run fixtures (engineer path)

- Fixtures are **not** rendered as a tenant in the UI.
- Documentation (not this design package) describes `packages/mocks`
  fixtures; the UI never presents them as "Sample" tenant data.
- A note opened from a fixture in a dev build must still carry a
  `Sample`/fixture marker so screenshots are not mistaken for real data.

---

## 5. First-run flow (mock-first — REC-08/13)

```text
1. Empty Inbox            → Write your first note · Import · Try the sample
2. User types a note      → lands in Inbox (Mine)
3. Soft prompt            → "Ask a question about this note" (1–2 suggested)
4. First Ask              → Mock answers on Mine (or Sample if chosen)
5. Soft prompt (once)     → teach citation click (dismissible, shown once)
6. Organize deferred      → folders/tags offered only after first value
```

Rules:

- The sample path is a **secondary** CTA, never the only path.
- Sample and Mine notes can coexist; the list makes the difference
  obvious.
- No live provider key is required at any first-run step (REC-13).
- A key wall before first value is a **defect**.

---

## 6. Portfolio 60-second path (REC-12)

The design must make this path work without setup:

```text
Labelled sample → Mock Ask → click citation → see highlighted passage
                → trigger a refusal example → mixed-content note visible
                → mode chip reads "Mock" → workspace chrome shows solo/minimal
```

| Step              | Surface requirement                                 |
| ----------------- | --------------------------------------------------- |
| Sample labelled   | Banner + chips on every list/answer/citation        |
| Mock Ask          | Answer card shows "Mock · sample answers"           |
| Citation          | Passage preview in rail/sheet, highlighted          |
| Refusal           | Reachable from a fixture question (architecture §9) |
| Mixed content     | Code + URL + long title render correctly            |
| Mode chip         | Visible without opening settings                    |
| Workspace honesty | No fake enterprise scale (REC-18)                   |

Optional (post-CX gate only): a labelled switch to **Live ·
operator-funded demo** with retention-honest copy. Never in the mandatory
first 60 seconds if it forces key entry.

---

## 7. Honesty guardrails

| Prohibited                                                 | Why                              |
| ---------------------------------------------------------- | -------------------------------- |
| Sample data presented without a label                      | UT-2 ownership confusion; REC-17 |
| "Sample" styled as an enterprise tenant                    | Portfolio guardrail              |
| Fake personalization (sample notes framed as "your notes") | Trust damage                     |
| Claiming RTL support in sample/demo copy                   | RTL is deferred (QA 7.5)         |
| ZDR / "never logged" chips                                 | Contradicts CITE-21              |
| Accuracy percentages / invented user counts                | Portfolio guardrails             |

---

## 8. Accessibility requirements (gate)

| #   | Requirement                                                                                   |
| --- | --------------------------------------------------------------------------------------------- |
| 1   | Corpus chip conveys meaning via text + icon, not color (QA 4.4)                               |
| 2   | Sample banner is a landmark-region heading reachable by AT                                    |
| 3   | Corpus filter is keyboard complete and its active state is exposed                            |
| 4   | "Copy to my workspace" is a labelled action with a clear result announcement                  |
| 5   | Chips announce with their context ("Sample corpus", not just "Sample") where ambiguity exists |
| 6   | No motion required to distinguish sample vs mine (QA 3.1)                                     |

---

## 9. RTL-readiness notes

- Chip order uses logical flow; the chip sits at `inline-end` of a title
  via `ms-auto`, not `ml-auto`.
- `<bdi>` wraps workspace names and note titles adjacent to chips and
  counts (QA 6.5).
- No arrow/chevron glyph implies a direction-specific "sample → mine"
  migration.

---

## 10. Traceability

| Spec element                      | Evidence       | Port / architecture |
| --------------------------------- | -------------- | ------------------- |
| Sample vs Mine first-class label  | REC-08/17      | §9                  |
| Public sample + clone fixtures    | Commander gate | §9                  |
| Mock-first first-run, no key wall | REC-13         | §5.11               |
| 60-second script                  | REC-12         | §9                  |
| Honest workspace chrome           | REC-18         | §2                  |
| Ownership honesty guardrails      | REC-17         | —                   |

# Journey — Ask (ask-your-notes)

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-04 (passage citation loop), REC-05 (streaming/AT),
REC-06 (no auto-persist), REC-10 (refusal first-class), REC-11 (trust
controls a11y); CITE-07–CITE-14; UT-10…UT-14 (unrun).
**Architecture:** §4 answer/citation boundary, §5.6 answer port, §5.11
mode, §9 fixtures.

**Job:** ask a natural-language question and get an answer grounded in
**my** corpus, with a _cheap, honest_ path to verify each claim.

> **Citation inspection is the trust loop, not a footnote** (REC-04).
> **Prefer no citation over a mismatched citation** (CITE-11).

---

## 1. Composer (entry)

```text
┌──────────────────────────── Ask ───────────────────────────────────┐
│ [icon] Mock · sample answers   ·   Corpus: [Sample ▾]              │  ← mode×corpus chips (persistent)
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Ask anything about your notes…                                  │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ Suggested: "What did I decide about indexing?"  ·  [Ask]           │
└────────────────────────────────────────────────────────────────────┘
```

| Element             | Spec                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Mode chip           | Persistent, exact labels from [`../foundations/content-and-voice.md`](../foundations/content-and-voice.md) §2 |
| Corpus scope        | Sample / Mine / (Both) selector; server-authoritative                                                         |
| Input               | Multiline, grows to ~6 lines, `Enter` = submit, `Shift+Enter` = newline                                       |
| Suggested questions | 1–2 starter chips when corpus is non-empty (OBS-14 pattern)                                                   |
| Submit              | Primary button; disabled state explained in text, not just greyed                                             |
| Cancel              | Visible while generating; also `Escape`                                                                       |

**No key requirement:** first-run Ask never blocks on a provider key
(REC-13). The mock path is the default.

---

## 2. Answer card anatomy

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [icon] Mock · sample answers · Sample corpus        [Feedback ▾]     │
│                                                                     │
│ Answer prose … claim one [1], claim two [2], unsupported claim here…│
│                                                                     │
│ Sources (2)                                                         │
│ ┌ [1] Note title · passage preview (2 lines) · updated 3d ago ───┐  │
│ └ [2] Note title · passage preview (2 lines) · updated 8mo ago ──┘  │
│                                                                     │
│ [Open source]  [Save as note…]  [Copy]                              │
└─────────────────────────────────────────────────────────────────────┘
```

- **Inline citation marker** `[n]` is a button, keyboard reachable, with
  accessible name like "Source 1: Note title, passage" (QA 2.1) — never a
  bare number.
- **Sources list** repeats citations with a 2-line preview and the
  last-updated cue when available (stale-risk, OBS-16).
- **Actions** are secondary and never compete with the citation chips.

**No decorative citations:** every marker resolves to an authorized
passage; a citation that cannot be opened is never emitted (§4, §7).

---

## 3. Passage inspection (the trust loop — REC-04, CITE-12)

| Viewport            | Pattern                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop (≥1024px)   | **Citation rail** docks at `inline-end` (22rem). Activating `[n]` highlights the passage in place and scrolls it into view within the rail. |
| Tablet (640–1023px) | Rail becomes an overlay sheet from `inline-end`; same content                                                                               |
| Mobile (≤640px)     | **Bottom sheet** with the passage, note title, and "Open note" (REC-09: not a shrunk dual pane)                                             |

Requirements:

- Passage preview shows the surrounding context, with the cited span
  highlighted — **not** just the note title (CITE-11).
- `≤2 interactions` from answer to highlighted passage (CITE-12).
- Rail/sheet is `complementary` / dialog with a labelled heading; Escape
  closes and returns focus to the `[n]` marker.
- Feedback controls live in the rail too (helpful / not helpful / wrong
  source) with an optional free-text note.
- **Never hover-only:** every trust control (citation, open, feedback,
  cancel) works by keyboard and touch (REC-11, QA 1.5).

---

## 4. Answer outcome states (architecture §4 — all are _success_)

| State                 | Rendering                                                                                                                          | Treatment                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `supported`           | Prose with inline `[n]` markers; sources list                                                                                      | Neutral reading surface                                   |
| `partial`             | Prose with **unsupported spans visibly marked** (dotted underline + "unsupported" label on hover/focus); header "Partly supported" | Warning-tinted marker + text (QA 5.4)                     |
| `no_supported_answer` | Heading **"No supported answer in your notes"**; body explains; next steps                                                         | **Neutral/info** — never danger (QA 5.3)                  |
| `conflict`            | Heading **"Your notes disagree"**; both sources shown side by side / stacked with their claims                                     | Warning marker; **both** shown, no silent winner (QA 5.5) |
| `refused_policy`      | Heading **"This request can't be answered"**; brief explanation; next step                                                         | Neutral/info; distinct from transport error               |

**Rules:**

- Unsupported spans are never visually conflated with supported ones
  (QA 5.4).
- **Never** fail open into speculative prose (REC-10, CITE-13).
- Refusal is styled as a legitimate state, not a broken page (QA 5.3).
- `partial`/`conflict`/`no_supported_answer` must be reachable in mock
  fixtures (architecture §9) so they can be demoed in the 60-second path
  (REC-12).

---

## 5. Streaming (REC-05, CITE-07/08)

| Aspect                           | Spec                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Visual                           | Token reveal allowed; citations attach as completed claim units, not mid-token                             |
| Indicator                        | Non-animated "Generating answer…" under reduced motion                                                     |
| AT                               | Announce **"Generating answer"** once and **"Answer ready"** once; **no token-level live speech** (QA 2.2) |
| Focus                            | Composer retains focus; a discreet "Jump to answer" control appears (not auto-focus) (QA 1.6)              |
| Cancel                           | Stops the stream; leaves partial text marked "Stopped" with an honest note                                 |
| Transport truncation (`partial`) | "Response stopped early." + Retry — an **error** class, distinct from trust-withholding refusal            |
| Reduced motion                   | Streaming chrome (caret/shimmer) becomes static text (QA 3.2)                                              |

---

## 6. Save / copy / follow-up

| Action                   | Spec                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Save as note**         | Explicit, opt-in; the created note is labelled **AI-generated** in its title area (REC-06)            |
| **Copy**                 | Copies the answer text with citation markers as plain text; never copies hidden metadata              |
| **Feedback**             | Rate helpful / wrong; low-friction; announced politely on submit                                      |
| **Re-ask**               | Edit the question in place; previous answer stays until replaced                                      |
| **Edit source → re-ask** | If a source is edited, an honest "This note has been updated since this answer" cue appears (QA 5.10) |

Never auto-write an answer into the corpus (REC-06, architecture §5.6
invariant).

---

## 7. Empty, loading, error states (Ask-local)

| State                                     | Copy                                                                                                                              | Treatment                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Empty corpus                              | "Your notes are empty, so there's nothing to answer from yet." + **Write your first note** / Import / Try sample (REC-07, QA 5.2) | Primary CTA                    |
| Indexing (partial corpus)                 | "Some notes are still indexing. Answers may be incomplete." + progress                                                            | Info, non-blocking (QA 5.7)    |
| Generating                                | "Generating answer…"                                                                                                              | Status                         |
| Transport error (`timeout`/`unavailable`) | "Couldn't reach the answer service." + Retry; **mock remains available**                                                          | Danger, retryable              |
| Quota (`quota_exhausted`)                 | Mode-named failure copy — see [`../dual-mode/failure-states.md`](../dual-mode/failure-states.md)                                  | Danger; **mock still offered** |
| Mode forbidden (`mode_forbidden`)         | "Live mode isn't available yet." + keep mock                                                                                      | Info                           |

Three failure classes must be visually/textually distinct: **refusal**
(neutral), **no results** (neutral), **transport error** (danger) — QA 5.8.

---

## 8. Accessibility requirements (gate)

| #   | Requirement                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Citation markers, source open, feedback, cancel are keyboard reachable — never hover-only (QA 1.5, REC-11) |
| 2   | Focus stays in the composer during generation unless the user jumps (QA 1.6)                               |
| 3   | No token-level `aria-live` streaming; one "generating" + one "ready" announcement (QA 2.2)                 |
| 4   | Citation → passage navigation is announced ("Opened source passage, note X") (QA 2.6)                      |
| 5   | Refusal/partial/conflict exposed as text + icon, not color alone (QA 2.5, 4.4)                             |
| 6   | Unsupported spans identifiable to AT (not decoration-only)                                                 |
| 7   | Citation chips meet contrast in default/hover/focus/visited (QA 4.2)                                       |
| 8   | Reduced motion on streaming chrome (QA 3.2)                                                                |
| 9   | Code/URLs inside answer or passage preview render sanitized and keyboard-scrollable (QA 6.1, 6.6)          |

---

## 9. Mobile specifics

- Composer sticky above the keyboard; answer scrolls behind.
- Citation opens a bottom sheet with the passage; "Open note" is one tap
  away (target ≤2 taps — UT-5).
- Trust controls meet minimum touch-target size (QA 8.4).
- No horizontal dual-pane layout is ever flattened from desktop (REC-09).
- Mode + corpus chips compress to icon + short label but keep full
  accessible names.

---

## 10. RTL-readiness notes

- Citation rail is docked with `inset-inline-end`; the sheet likewise.
- Inline `[n]` markers flow with text direction but the **number itself**
  is isolated (`<bdi>`) so digits don't reorder.
- Passage highlight uses logical offsets (`padding-inline`, `border-inline-start`).
- Note titles, quotes, and code inside previews are isolated (QA 6.5).
- No `ArrowRight`/`ArrowLeft` semantics for "next/previous source".

---

## 11. Traceability

| Spec element                             | Evidence           | Port / architecture     |
| ---------------------------------------- | ------------------ | ----------------------- |
| Passage-level citation + preview         | REC-04, CITE-11/12 | §4 citation payload     |
| Refusal / partial / conflict first-class | REC-10, CITE-13    | §4 answer states        |
| Streaming + AT pattern                   | REC-05, CITE-07/08 | §5.6 stream events      |
| No auto-persist                          | REC-06             | §5.6 invariant          |
| Trust-control a11y                       | REC-11, REC-19     | §8                      |
| Mode × corpus labels on answer           | REC-13/17          | §5.11, §9               |
| Quota/failure mode naming                | REC-16             | §5.6 failures           |
| Stale-source cue                         | OBS-16             | §4 optional `updatedAt` |
| Mobile verify path                       | REC-09             | —                       |

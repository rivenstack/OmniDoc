# Foundations — Content, Voice, and Labelling

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-07, REC-10, REC-13, REC-16, REC-17, REC-18; CITE-09,
CITE-10, CITE-13, CITE-21.
**Architecture:** §4 answer states, §5.11 runtime mode, §9 fixtures.

This is the **microcopy system**. It exists so the four journeys,
dual-mode chrome, and all failure states speak in one honest voice — and
so the Implementer never has to invent trust copy under deadline.

---

## 1. Voice principles

| Principle                   | Do                                   | Don't                                                |
| --------------------------- | ------------------------------------ | ---------------------------------------------------- |
| **Honest**                  | "No supported answer in your notes." | "I couldn't find anything, but here's what I think…" |
| **Specific**                | "Mock · sample answers"              | "AI is on"                                           |
| **Calm**                    | Neutral tone for refusals and limits | Alarming red error language for honest refusals      |
| **Non-magical**             | "Generating answer…"                 | "Thinking…" / "AI magic"                             |
| **Ownership-clear**         | "Sample" vs "Mine" always labelled   | Unlabelled demo data that looks personal             |
| **No fabricated precision** | "Usage not available from provider"  | Invented dollar figures or "99% accurate"            |

**Hard prohibitions in copy** (REC-17, portfolio guardrails):

- No zero-retention / ZDR / "we never log" claims (~30-day abuse-log
  retention is accepted — CITE-21).
- No accuracy percentages or fabricated testimonials/counts.
- No claim that RTL locales are supported.
- No enterprise-scale implications (seats, org charts, SSO) at n≈1
  (REC-18).
- No commerce/pricing/billing vocabulary.

---

## 2. The labelling system (mode × corpus)

Three **orthogonal** labels must be visible wherever an answer is
produced or consumed (REC-17). This is the single most trust-critical
copy rule.

### 2.1 Axis A — Runtime mode

| Value                | Label                           | Supporting copy                                                                    |
| -------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| `mock`               | **Mock · sample answers**       | "Answers come from a fixed demo dataset — no provider is called."                  |
| `operator_free_tier` | **Live · operator-funded demo** | "Responses are live, funded by the operator's free tier. Shared quota; may pause." |
| `customer_key`       | **Live · your key**             | "Responses are live, billed to the key you provided."                              |

### 2.2 Axis B — Corpus ownership

| Value    | Label                        | Supporting copy                                      |
| -------- | ---------------------------- | ---------------------------------------------------- |
| `sample` | **Sample**                   | "Public demo notes. Not your data; safe to explore." |
| `mine`   | **Mine** (or workspace name) | "Answers stay within this workspace."                |

### 2.3 Axis C — Answer source

| Value           | Label                 | Note                                                                                                 |
| --------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| corpus-grounded | **From your notes**   | Default, expected for ask-your-notes                                                                 |
| model knowledge | **Not in your notes** | Used only when the corpus lacks support; must be visually distinct (UT-12 hypothesis, not a finding) |

**Rule:** Axis A + B appear together near the Ask composer and on every
answer card. Axis C is per-answer. Never collapse the three into one
"AI" badge.

### 2.4 Chip anatomy (spec)

```
[icon] Mock · sample answers        (mode chip, persistent near composer)
[icon] Sample                        (corpus chip, near scope selector + on citations)
```

- Always **icon + text**; never color-only (QA 4.4).
- Mode chip is a **status**, announced politely on change — never
  announced per keystroke (QA 2.3, REC-19).
- Chips are not interactive unless they open a details/popover surface;
  if interactive they are buttons with accessible names like
  "Runtime mode: Mock, sample answers. Open details."

---

## 3. Empty-state copy pattern (REC-07)

Every first-run and empty state answers **What → Why → one Next**.

```text
[What]  OmniDoc turns your notes into answers you can check.
[Why]   There's nothing here yet.
[Next]  [Write your first note]   (primary)
        Import a file · Try the sample   (secondary)
```

Rules:

- **One** primary CTA per empty state; secondaries are visibly secondary.
- Why-line explains the _actual_ cause, never a generic error (QA 5.2).
- No dead ends (QA 5.1, 5.6).

---

## 4. Ask answer-state copy (REC-10, architecture §4)

Refusal and partial support are **success** states with their own tone.

| State                 | Headline                              | Body pattern                                                                                                      | Treatment                                   |
| --------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `supported`           | _(no headline; answer prose)_         | Answer + inline citation chips                                                                                    | Neutral reading surface                     |
| `partial`             | **Partly supported**                  | "Some parts of this answer aren't backed by your notes." Unsupported spans marked inline.                         | Warning-tinted marker + text, not danger    |
| `no_supported_answer` | **No supported answer in your notes** | "Your notes don't contain enough to answer this." + next steps (browse notes · import · rephrase · broaden scope) | **Neutral/info**, never red (QA 5.3)        |
| `conflict`            | **Your notes disagree**               | "Two sources say different things. Both are shown."                                                               | Warning marker + both sources (QA 5.5)      |
| `refused_policy`      | **This request can't be answered**    | Brief, policy-neutral explanation + next step                                                                     | Neutral/info; distinct from transport error |

**Never** style `no_supported_answer` / `refused_policy` as a broken page
(QA 5.3). Never fail open into speculative prose (CITE-13, REC-10).

Stale-source cue copy: "Last updated <relative time>" or "Updated over a
year ago" — honest, no implied freshness (QA 5.10, OBS-16).

---

## 5. Streaming copy and AT behavior (REC-05)

| Moment                | Visual                                                      | Assistive tech                                               |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Start                 | "Generating answer…" + non-animated indicator               | Polite status announced **once** ("Generating answer")       |
| Mid-stream            | Visual token reveal allowed                                 | **No** token-level live announcements (CITE-07/08, QA 2.2)   |
| Stable claim complete | Citation chips attach with the completed claim unit         | Chip announced as part of the readable answer, not mid-token |
| Done                  | "Answer ready"                                              | Polite status announced **once**                             |
| Focus                 | Composer keeps focus unless user activates "Jump to answer" | Focus never stolen (REC-05, QA 1.6)                          |

Partial stream (transport truncation) is copy-distinct from refusal:
"Response stopped early. Retry?" — an **error** class
(`partial` transport), not a trust-withholding state.

---

## 6. Failure copy (REC-16 — detail in `../dual-mode/failure-states.md`)

Every failure names **which mode failed** and **what still works**.

```text
[Mode] Your key
[What] This key was rejected.
[Next] Paste a valid key in the cookbook. Mock answers still work.
```

Rules:

- Name the mode explicitly (`Mock` / `operator-funded demo` / `your key`).
- State that **mock Ask remains available** whenever only a live path
  failed (unless the product is entirely down).
- Never silently fall back between `operator_free_tier` and
  `customer_key` (REC-16, architecture §5.11). If a fallback ever
  happens, it is an **explicit, confirmed** mode change with a visible
  chip update.
- Distinguish **verify** failure from **Ask** failure (UT-21
  hypothesis).

---

## 7. Cookbook and usage copy (REC-14, REC-15)

- Cookbook chapter title: "Connect **<tool>**" — create-elsewhere steps
  are numbered and external-linked.
- After save: **masked prefix only** (`sk-…4f9c`), write-once display,
  re-entry means replace (OBS-25).
- Verify result: "Key verified" / "Key rejected" / "Key belongs to a
  different tool" (scope mismatch) — announced as **status**, never
  echoing key characters (REC-19).
- Usage strip: "Usage not available from provider" is a **valid, styled
  empty**, not an error (REC-15, §5.10 `unavailable`).
- Soft quota warning: "Operator demo quota is running low. Mock answers
  keep working." with a link to the cookbook.
- **No** invoices, seats, tax, or team-spend analytics (portfolio scale).

---

## 8. Workspace / team copy (REC-18)

| Situation        | Copy                                                         |
| ---------------- | ------------------------------------------------------------ |
| Single member    | "Solo workspace" badge; invite affordance present but honest |
| Multiple members | Member list with real roles, no fake directory theatre       |
| Sample workspace | "Sample workspace — public demo notes"                       |
| Empty team       | "You're the only member." + invite CTA                       |

Never: "Enterprise tenant", "12 organizations", org charts, SSO walls,
placeholder team directories.

---

## 9. Copy source-of-truth discipline

- All user-facing strings are specified here and reused verbatim by the
  Implementer; strings are **not** to be invented ad hoc during F-* work.
- No i18n runtime in v1 (ADR-0003). Strings may live in a single module
  for future extraction, but the **only** live locale is `en`.
- Any string implying RTL support, ZDR, or enterprise scale is a defect
  (QA 7.5).

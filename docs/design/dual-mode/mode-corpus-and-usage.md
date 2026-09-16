# Dual-Mode — Mode, Corpus, and Usage Chrome

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-13 (mock-first spine), REC-15 (portfolio usage strip),
REC-17 (labelling + no-ZDR); CITE-21, CITE-22, CITE-23; UT-16, UT-17,
UT-19, UT-20 (unrun).
**Architecture:** §5.10 usage port, §5.11 runtime mode port, §9 corpus
labelling; ADR-0004.

This spec defines how the UI communicates **who is answering, on whose
corpus, and on whose quota** — the three-orthogonal-axes model. It exists
so no surface can imply "AI magic", live billing, or zero retention.

---

## 1. The mode spine (REC-13)

```text
Mock Ask  →  labelled live demo (operator free-tier)  →  customer key (BYOK)
  (default, first-run, 60s script)     (after CX gate)          (opt-in scale)
```

| Stage | Mode value           | Customer-facing label           | First-run default?                 |
| ----- | -------------------- | ------------------------------- | ---------------------------------- |
| A     | `mock`               | **Mock · sample answers**       | **Yes**                            |
| B     | `operator_free_tier` | **Live · operator-funded demo** | No — explicit opt-in after CX gate |
| C     | `customer_key`       | **Live · your key**             | No — opt-in via cookbook           |

**Forbidden design:** live-AI-first onboarding that requires a key before
first value (REC-13). **Forbidden:** any UI that hides which stage is
active.

---

## 2. Three labelling axes (REC-17)

| Axis              | Values                                 | Where it appears                                               |
| ----------------- | -------------------------------------- | -------------------------------------------------------------- |
| **Runtime**       | Mock · operator-funded demo · your key | Ask composer, answer card header, settings, cookbook           |
| **Corpus**        | Sample · Mine                          | Ask scope selector, result rows, citation cards, sample banner |
| **Answer source** | From your notes · Not in your notes    | Per answer card                                                |

Copy strings are fixed in
[`../foundations/content-and-voice.md`](../foundations/content-and-voice.md)
§2. Do not paraphrase them ad hoc.

### 2.1 Mode details popover

The mode chip is a button opening a popover:

```text
Runtime mode: Mock · sample answers
Answers come from a fixed demo dataset. No provider is called.
Quota: not applicable in mock mode.
[Learn about live modes →]   (links to cookbook landing; does not force key entry)
```

For live modes the popover additionally states who pays and that shared
operator quota may pause.

### 2.2 Mode switching

| Transition               | Spec                                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mock → operator demo     | Explicit action; **confirm dialog** stating who pays; requires the CX gate to be closed (server returns `mode_forbidden` otherwise, which the UI shows honestly) |
| Operator demo → your key | Explicit; via cookbook; confirms payer change                                                                                                                    |
| Your key → operator demo | Explicit; confirms payer change                                                                                                                                  |
| Any silent fallback      | **Forbidden** (REC-16, §5.11)                                                                                                                                    |

On a completed switch, the mode chip updates and is announced as a
**polite status** (REC-19). A mode change never silently re-runs an
existing answer.

---

## 3. Usage strip (REC-15)

A **compact** strip, not a billing console. Portfolio-scale only.

```text
┌─────────────────────────────────────────────────────────────────┐
│ [icon] Mock · sample answers   ·   Usage: not applicable        │
│                                     [Manage AI connections →]   │
└─────────────────────────────────────────────────────────────────┘
```

| Mode          | Left      | Right                                                                                     |
| ------------- | --------- | ----------------------------------------------------------------------------------------- |
| Mock          | Mode chip | "Usage: not applicable in mock mode" + cookbook link                                      |
| Operator demo | Mode chip | "Period usage: <n> requests / <n> tokens" **or** "Usage not available from provider"      |
| Your key      | Mode chip | "Period usage on your key: <n> requests / <n> tokens" **or** the honest unavailable state |

### 3.1 Usage states

| State                                     | Rendering                                                                        | Treatment                               |
| ----------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------- |
| Available                                 | Tabular figures + period label ("last 30 days")                                  | Neutral                                 |
| Unavailable (`unavailable` — first-class) | "Usage not available from provider."                                             | **Neutral/info**, not an error (REC-15) |
| Operator quota low                        | "Operator demo quota is running low. Mock answers keep working." + cookbook link | Warning                                 |
| Operator quota exhausted                  | Mode-named failure copy (`failure-states.md`)                                    | Danger + mock remains                   |
| Forbidden                                 | "Usage isn't available for this workspace."                                      | Neutral                                 |
| Loading                                   | Static placeholder (no shimmer)                                                  | Reduced-motion safe                     |

### 3.2 Hard prohibitions

- No invoices, tax, seats, team-spend analytics, or currency conversion.
- **Never fabricate dollar burn** — no cost figure unless grounded in
  provider-reported usage, and then always labelled "estimate — may
  differ from your provider bill" (UT-20 hypothesis: undisclaimed
  estimates harm trust).
- No "unlimited" claims.

---

## 4. Privacy and retention copy (REC-17, CITE-21)

Where live modes are shown, a short, factual line may appear:

> "Abuse and security logs may be retained up to ~30 days."

Rules:

- **No** ZDR / "we never log" / "zero retention" claims (CITE-21).
- Detail can be deferred to a privacy note, but the UI must not imply
  stronger retention guarantees than accepted policy.
- This line is **not** a marketing chip; it is small, neutral, and
  proximate to the mode that carries the risk.

---

## 5. Where the chrome lives

| Surface                   | Mode chip     | Corpus chip         | Usage                         |
| ------------------------- | ------------- | ------------------- | ----------------------------- |
| Ask composer              | ✅ persistent | ✅ selector         | compact strip                 |
| Answer card header        | ✅            | ✅                  | —                             |
| Search results            | —             | ✅ per row + filter | —                             |
| Note reader               | —             | ✅                  | —                             |
| App shell top bar         | ✅ (compact)  | —                   | —                             |
| Settings → AI connections | ✅            | —                   | full strip + link to cookbook |
| Sample workspace banner   | —             | ✅ "Sample"         | —                             |

---

## 6. Mock determinism cue

Because mock answers are deterministic fixtures, the UI may show a subtle
"Demo data" marker in the sources list. It must **not** imply real-time
model behaviour, and it must not be so loud that it breaks the
60-second portfolio demo's credibility (REC-12) — the mode chip carries
the honesty, the marker is secondary.

---

## 7. Accessibility requirements (gate — REC-19)

| #   | Requirement                                                                                      |
| --- | ------------------------------------------------------------------------------------------------ |
| 1   | Mode chip, corpus selector, and usage figures have accessible names                              |
| 2   | Mode changes announced as **status** — never include key characters or secret fragments (REC-19) |
| 3   | Mode/corpus popovers are keyboard complete: open, navigate, Escape dismiss, focus restore        |
| 4   | Usage figures use tabular figures and are readable at AA contrast (QA 4.1–4.2)                   |
| 5   | Quota warnings announced politely once, not on re-render                                         |
| 6   | No motion required to convey quota state (QA 3.3)                                                |
| 7   | Available/unavailable usage states are exposed as text, not color-only (QA 4.4)                  |

---

## 8. RTL-readiness notes

- Usage IDs and request IDs are wrapped in `<bdi>` (QA 6.5) — they are
  opaque tokens that must not reorder.
- The strip uses logical gap/padding; the cookbook link sits at
  `inline-end` via `ms-auto`, not `ml-auto`.
- Numbers use tabular figures; no direction-dependent number formatting
  assumptions (QA 7.4).
- No RTL-locale claim appears in any mode/privacy copy (QA 7.5).

---

## 9. Traceability

| Spec element                             | Evidence         | Port / architecture |
| ---------------------------------------- | ---------------- | ------------------- |
| Mode spine + mock-first default          | REC-13           | §5.11               |
| Triple labelling                         | REC-17, UT-16    | §5.11, §9           |
| Compact usage strip + honest unavailable | REC-15, UT-19/20 | §5.10               |
| No silent mode fallback                  | REC-16           | §5.11 invariant     |
| No-ZDR copy                              | REC-17, CITE-21  | —                   |
| Usage a11y                               | REC-19           | §8                  |

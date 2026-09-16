# States — Empty, Loading, Error, Indexing

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-02, REC-07, REC-08, REC-10; CITE-13; UT-3 (unrun).
**Architecture:** §3 indexing as first-class state, §5.2 ingestion,
§9 fixture themes.

---

## 1. Principles

1. Every empty state answers **What / Why / one Next** (REC-07).
2. **One primary CTA** per empty state; secondaries are visibly
   secondary.
3. Loading never blocks understanding; skeletons mirror final layout to
   avoid shift.
4. Errors are **scoped** to the affected surface, never a full-page
   takeover for a local failure.
5. Refusal (`no_supported_answer`) is **not** an error and never uses
   error treatment (QA 5.3).
6. Indexing is a **first-class state** — never silent success (REC-02,
   architecture §3).
7. All motion respects `prefers-reduced-motion` (QA 3.x).

---

## 2. Empty-state inventory

| #   | Surface                      | What                                                           | Why                                               | Next (primary)                      | Secondary                         |
| --- | ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------- | --------------------------------- |
| E1  | First-run Inbox              | "OmniDoc turns your notes into answers you can check."         | "There's nothing here yet."                       | **Write your first note**           | Import a file · Try the sample    |
| E2  | All notes                    | "Your notes will appear here."                                 | "No notes yet."                                   | **Write your first note**           | Import                            |
| E3  | Inbox zero                   | "Inbox zero."                                                  | "Everything's filed."                             | **Capture something new**           | Browse all notes                  |
| E4  | Empty collection             | "Nothing in here yet."                                         | "This collection is empty."                       | **Move notes here**                 | —                                 |
| E5  | Search — true empty          | "No notes match **"<q>"**."                                    | "Nothing in your corpus matches that yet."        | **Clear filters** / **Create note** | Ask about this                    |
| E6  | Search — filtered empty      | "No notes match these filters."                                | "3 filters are active."                           | **Clear 3 filters**                 | —                                 |
| E7  | Ask — empty corpus           | "Your notes are empty, so there's nothing to answer from yet." | Explains the real cause (CITE-13 logic)           | **Write your first note**           | Import · Try sample               |
| E8  | Ask — no supported answer    | "No supported answer in your notes"                            | "Your notes don't contain enough to answer this." | Browse sources                      | Import · Rephrase · Broaden scope |
| E9  | Usage unavailable            | "Usage not available from provider."                           | —                                                 | Manage AI connections               | —                                 |
| E10 | Cookbook — nothing connected | "No keys connected."                                           | "You're using the mock path."                     | **Start a chapter**                 | Back to Ask                       |

E8 is a **success-shaped trust state**, styled neutral/info (REC-10).
E9 is a styled empty, not an error (REC-15).

---

## 3. Empty-state layout spec

```text
┌──────────────────────────────────────────┐
│                  [icon]                  │   ← decorative, aria-hidden
│              What (h2)                   │
│         Why (body, muted)                │
│                                          │
│      [ Primary CTA ]   secondary · secondary │
└──────────────────────────────────────────┘
```

- Heading is a real `h2`/`h3` so AT users can navigate to it.
- Icon is `aria-hidden="true"`; the text carries the meaning.
- Empty states never use error (danger) treatment.
- Max width `--od-layout-reading`; centered in the surface.

---

## 4. Loading states

| Surface         | Skeleton                                                           | Notes                          |
| --------------- | ------------------------------------------------------------------ | ------------------------------ |
| Shell initial   | Static nav + content blocks                                        | No shimmer; no layout shift    |
| Note list       | 6–8 static rows matching row height                                | Reduced-motion safe            |
| Note reader     | Title bar + paragraph blocks                                       | —                              |
| Search results  | 4–6 static rows                                                    | —                              |
| Ask answer      | Composer stays interactive; answer area shows "Generating answer…" | Not a skeleton — a live status |
| Citation rail   | Static preview lines                                               | —                              |
| Usage strip     | Static placeholder digits                                          | —                              |
| Cookbook verify | "Verifying…" static text                                           | —                              |

**Rule:** skeletons are **static** under `prefers-reduced-motion: reduce`
(no shimmer sweep) — QA 3.1.

Skeletons must not be announced as content; a polite "Loading…" status
covers AT where the wait is meaningful.

---

## 5. Error states

| Class                                        | Visual                            | Announced            | Recovery            |
| -------------------------------------------- | --------------------------------- | -------------------- | ------------------- |
| Transport (`timeout`, `unavailable`)         | Inline banner, danger             | `role="alert"` once  | Retry               |
| Quota (`quota_exhausted`)                    | Inline banner, danger, mode-named | `role="alert"` once  | Mock / connect key  |
| Mode forbidden                               | Inline info                       | Polite status        | Continue in mock    |
| Validation (`unsupported_type`, `too_large`) | Per-file row, danger              | Polite, per file     | Choose another file |
| Authz (`forbidden`)                          | Generic access message            | `role="alert"`       | Return to workspace |
| Save conflict                                | Modal alert-dialog                | `role="alertdialog"` | Reload / keep mine  |
| Session expired                              | Full-page prompt                  | `role="alertdialog"` | Sign in again       |

**Rule:** errors never leak other tenants' data or secrets; generic
messages + request ID only (§2, §6).

---

## 6. Indexing / import progress (REC-02)

Indexing is a **first-class, visible** state.

### 6.1 Per-note / per-file status

| Status     | Chip                                                                 | Meaning                |
| ---------- | -------------------------------------------------------------------- | ---------------------- |
| `pending`  | "Queued" (neutral)                                                   | Waiting for the worker |
| `indexing` | "Indexing…" (info) + determinate bar if %, else indeterminate static | In progress            |
| `ready`    | "Ready" (success)                                                    | Searchable/askable     |
| `failed`   | "Failed" (danger)                                                    | Retry available        |
| `partial`  | "Partly ready" (warning)                                             | Some files ok          |

### 6.2 Corpus-level banner

When any note is not `ready`, a persistent banner appears above
retrieve/ask surfaces **before** the user is invited to trust results:

```text
[icon] Some notes are still indexing. Answers may be incomplete.
       12 of 15 ready · [View progress]
```

Rules:

- Banner is informational, not blocking.
- "Ask about these" only appears when ≥1 source is `ready`.
- Progress announcements are **once per state change**, not per tick
  (QA 2.3).
- Determinate progress uses a numeric label; indeterminate uses a static
  bar under reduced motion (QA 3.3).
- The UI never fabricates progress; it renders the §5.2 job state.

### 6.3 Import result summary

```text
Import complete
  ✅ 10 files ready
  ⚠️ 2 files partly indexed
  ❌ 1 file failed — "report.pdf" (unsupported type)
  [Retry failed]   [Ask about these notes]
```

---

## 7. State × journey matrix

| Journey     | Empty    | Loading    | Error             | Indexing          |
| ----------- | -------- | ---------- | ----------------- | ----------------- |
| Capture     | E1/E2/E3 | skeleton   | save/import error | per-file chips    |
| Organize    | E1/E4    | skeleton   | move error        | status dot        |
| Retrieve    | E5/E6    | skeleton   | search error      | incomplete banner |
| Ask         | E7/E8    | generating | transport/quota   | incomplete notice |
| Settings/AI | E10      | verify     | key errors        | —                 |

---

## 8. Accessibility requirements (gate)

| #   | Requirement                                                                   |
| --- | ----------------------------------------------------------------------------- |
| 1   | Empty states have a real heading; icon is decorative (QA 2.5)                 |
| 2   | Empty/error/refusal text is exposed to AT, not color/icon-only (QA 2.5, 4.4)  |
| 3   | Loading announced once, not per render (QA 2.3)                               |
| 4   | Progress announced once per state change (QA 2.3, 3.3)                        |
| 5   | Skeletons static under reduced motion (QA 3.1)                                |
| 6   | Alerts use `role="alert"`; dialogs `role="alertdialog"` with focus management |
| 7   | One primary CTA, keyboard reachable, labelled (QA 1.1)                        |

---

## 9. RTL-readiness notes

- Skeleton bars and progress fills use `inline-size` / logical inset, not
  fixed `left`.
- Status chips wrap with logical margins.
- Import file names / paths isolated with `<bdi>` (QA 6.5).
- Progress percentages use tabular figures; no direction-dependent
  ordering.

---

## 10. Traceability

| Spec element                | Evidence        | Port / architecture |
| --------------------------- | --------------- | ------------------- |
| What/Why/Next empties       | REC-07          | —                   |
| One primary CTA             | REC-07          | —                   |
| Indexing visible before Ask | REC-02, UT-3    | §5.2, §3            |
| Refusal as neutral success  | REC-10, CITE-13 | §4                  |
| Usage unavailable as empty  | REC-15          | §5.10               |
| Scoped, non-leaking errors  | —               | §2, §6              |
| Reduced-motion loading      | REC-11          | §8                  |

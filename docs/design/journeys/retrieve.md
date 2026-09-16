# Journey — Retrieve (search and browse)

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-03 (invest in retrieve), REC-11 (a11y of trust
controls); OBS-11, OBS-12, OBS-13; UT-6, UT-7, UT-8 (unrun hypotheses).
**Architecture:** §5.5 lexical/hybrid search, §3 search safety, §9
fixtures.

**Job:** re-find a known note, or discover related material, via browse,
search, filters, or recency — with honest snippets and no dead ends.

---

## 1. Entry points

| Entry             | Surface                                                | Behavior                                     |
| ----------------- | ------------------------------------------------------ | -------------------------------------------- |
| Search field      | Top bar / mobile Search tab                            | Focused via `Cmd/Ctrl+K` palette or directly |
| Command palette   | `Cmd/Ctrl+K`                                           | Search + quick nav actions                   |
| Recents           | Sidebar shortcut / mobile tab                          | Last-updated notes                           |
| Inbox / All notes | Sidebar                                                | Chronological browse                         |
| Collection browse | Sidebar tree                                           | Optional structure                           |
| Pivot to Ask      | "Ask about this" from a search result or empty results | Hand-off to Ask with query prefilled (UT-8)  |

---

## 2. Desktop layout

```text
┌── Sidebar ──┐ ┌──────────────── Retrieve ─────────────────────────────┐
│ …           │ │ [ Search…                             ]  [Filters ▾] │
│             │ │ Filters: [Type ▾] [Updated ▾] [Label ▾] [Corpus ▾]  │
│             │ │ 12 results · searched: "onboarding latency"         │
│             │ │ ┌────────────────────────────────────────────────┐  │
│             │ │ │ Note title                    [Mine] · 2d ago  │  │
│             │ │ │ …snippet with <mark>onboarding</mark>…        │  │
│             │ │ └────────────────────────────────────────────────┘  │
│             │ │ (indexing notice if corpus incomplete → see below)  │
└─────────────┘ └──────────────────────────────────────────────────────┘
```

---

## 3. Search behavior

| Aspect        | Spec                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modes         | Lexical + hybrid behind one field; **no mode picker exposed to users** (implementation detail)                                                     |
| Debounce      | Visible search-as-you-type with a minimum 150ms debounce; results announced politely once settled                                                  |
| Snippets      | Server-provided snippet with highlight boundaries; UI applies `<mark>` only to authorized hits                                                     |
| Highlight     | Presentation over authorized content; never fetched separately (§3)                                                                                |
| Empty query   | Shows Recents, not a blank canvas                                                                                                                  |
| No results    | See §6                                                                                                                                             |
| Corpus filter | **Sample / Mine** filter is first-class (REC-08/17)                                                                                                |
| Indexing      | If the corpus is still indexing, a persistent inline notice warns results may be incomplete **before** the user trusts a zero-result page (QA 5.7) |

**Leakage rule:** a snippet must never contain another tenant's content;
highlighting never references an unauthorized chunk (§3, §7).

---

## 4. Result row anatomy

| Part        | Spec                                                                                    |
| ----------- | --------------------------------------------------------------------------------------- |
| Title       | Priority text; 1-line, full value in accessible name; 2-line clamp option in Cards view |
| Corpus chip | **Sample** or **Mine** — text + icon, not color-only (QA 4.4)                           |
| Updated cue | Relative time; UTC stored, formatted at presentation (QA 7.6)                           |
| Snippet     | 2-line clamp with highlight; code/URLs isolated with `<bdi>` (QA 6.5)                   |
| Status dot  | Indexing/pending/failed per note, when relevant                                         |
| Row actions | Open, Ask about this, Move to… (keyboard reachable)                                     |

---

## 5. Filters

| Filter           | Values                        | Rules                                      |
| ---------------- | ----------------------------- | ------------------------------------------ |
| Type             | Note / Imported doc           | —                                          |
| Updated          | Any / 24h / 7d / 30d / Custom | Date math in UTC, displayed local (QA 7.6) |
| Label/Collection | Real values only              | No placeholder taxonomy                    |
| Corpus           | Sample / Mine / Both          | Default: Both, clearly labelled            |

Filter chips are removable (`×` with accessible name), keyboard
navigable, and always show an **active-filter count** so a false-empty
page is explainable (friction: over-filter → false empty).

---

## 6. States

| State                          | Copy                                                                                       | Treatment                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Loading (first)                | Static skeleton rows                                                                       | Reduced-motion safe                             |
| Loading (refine)               | Inline "Searching…" status, results stay visible                                           | Polite, once                                    |
| No results (true)              | "No notes match **"<query>"**." + next steps: Clear filters · Ask about this · Create note | Neutral; **one** primary action (Clear filters) |
| No results (filtered)          | "No notes match these filters." + "Clear 3 filters"                                        | Neutral                                         |
| No results (indexing)          | "Results may be incomplete — still indexing." + progress                                   | Info                                            |
| Search unavailable (transport) | "Search is temporarily unavailable." + Retry                                               | Danger, retryable                               |
| Error                          | "Couldn't run that search." + Retry                                                        | Danger, retryable                               |

**Rule (QA 5.6):** a no-results state is never a bare "No results" — it
offers a next step, and distinguishes _true_ empty from _filtered_ empty
from _indexing_ incomplete.

---

## 7. Browse / recents

- Recents: last-updated first; each row shows corpus chip and status.
- Empty Recents falls back to the first-run empty state (REC-07).
- Long titles clamp with a full-value accessible name (QA 8.5).
- No infinite scroll without a keyboard-reachable "Load more" fallback.

---

## 8. Mobile layout

| Aspect       | Spec                                                                 |
| ------------ | -------------------------------------------------------------------- |
| Search tab   | Dedicated bottom-tab entry; field autofocuses on tab open            |
| Filters      | Bottom sheet with applied-filter summary                             |
| Results      | Single column; snippet 2-line clamp                                  |
| Open         | Navigates to reader; back returns to the same scroll/filter state    |
| Ask hand-off | "Ask about this" opens Ask with the query and corpus scope prefilled |

---

## 9. Accessibility requirements (gate)

| #   | Requirement                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Results are a `list` with each row as a link/`listitem`; count announced once on settle (QA 2.3)                       |
| 2   | Snippet highlights are not the only signal — the matched term is also conveyed in text/accessible name                 |
| 3   | Filters keyboard complete: open, select, remove, Escape dismiss, focus restore (QA 1.1)                                |
| 4   | No-results and error states exposed as text, not color/icon alone (QA 2.5, 4.4)                                        |
| 5   | Corpus chip readable at all states; contrast meets minimums (QA 4.2)                                                   |
| 6   | Long unbroken strings do not force screen-reader spelling marathons where avoidable; label + truncate pattern (QA 2.7) |
| 7   | Reduced motion on any load transitions (QA 3.1)                                                                        |

---

## 10. RTL-readiness notes

- Highlight `<mark>` and snippet truncation are direction-neutral.
- Filter chip separators use logical margins; `×` affordance sits at
  `inline-end`.
- Snippets containing identifiers/URLs wrap in `<bdi>` (QA 6.5), so a
  future RTL locale cannot reorder them.
- Result metadata order (title → chip → time) uses logical flow, not
  hard-coded left→right assumptions (QA 7.4).

---

## 11. Traceability

| Spec element                                  | Evidence           | Port / architecture |
| --------------------------------------------- | ------------------ | ------------------- |
| Search + browse + recents                     | REC-03             | §5.5                |
| Honest no-results / filtered / indexing split | REC-07, QA 5.6/5.7 | §5.5, §3            |
| Sample/Mine filter                            | REC-08/17          | §9                  |
| Snippet safety                                | —                  | §3, §7 invariants   |
| Pivot to Ask                                  | UT-8 (hypothesis)  | §5.6                |
| Trust-control a11y                            | REC-11             | §8                  |

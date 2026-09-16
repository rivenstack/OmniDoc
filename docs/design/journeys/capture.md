# Journey — Capture (write-first)

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-01 (write-first), REC-02 (paste/import first-class);
CITE-01, CITE-02, CITE-03, CITE-15; OBS-01, OBS-03, OBS-04, OBS-05.
**Architecture:** §3 notes/documents, §5.1 notes port, §5.2 ingestion
port, §9 fixtures.

**Job:** get a thought, paste, or document into OmniDoc _before it
disappears_ — with **no required organizational decision**.

> **Time-to-cursor is the primary metric of this journey.** Nothing may
> precede the editor.

---

## 1. Entry points

| Entry                  | Surface                                                      | Behavior                                                              |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| **New note** (primary) | Sidebar top (desktop), floating action (mobile)              | Opens editor with cursor placed; no folder/tag prompt                 |
| **Quick capture**      | Global shortcut (desktop), share/action target (mobile)      | Opens editor focused; saves to Inbox                                  |
| **Paste**              | Paste into empty Inbox canvas, or "Paste" CTA on empty state | Creates a note from clipboard content; format loss noted honestly     |
| **Import file**        | "Import" CTA (parity with paste, REC-02)                     | Enqueues ingestion via §5.2; shows progress before any Ask invitation |
| **Convert to note**    | From a saved Ask answer (explicit, opt-in)                   | Creates a note labelled **AI-generated** (REC-06)                     |

**Parity rule (REC-02):** on the empty state and in the shell, _Write_,
_Paste_, and _Import_ are presented as co-equal capture paths — not
Write-only with import hidden in a menu.

---

## 2. Desktop layout

```text
┌────────────────────────────── Canvas ──────────────────────────────┐
│  [Title — placeholder "Untitled note"]                             │
│  ┌──────────────────────── Editor (TipTap) ────────────────────┐   │
│  │  cursor starts here; no chrome before it                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  Save status · Word count · (optional) Collection/Labels            │
└─────────────────────────────────────────────────────────────────────┘
```

- Title is a plain text field, not a modal prompt.
- Editor gets focus on open; the title is reachable with `Shift+Tab`.
- **Deferred organize** (REC-01): collection/label controls appear
  _after_ content exists, in a secondary row; never as a pre-write gate.
- Optional structure lives in an **"Organize" affordance** on the editor
  footer, not inline above the cursor.

---

## 3. Mobile layout (capture-first — REC-09)

| Aspect                         | Spec                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| Open→type                      | ≤2 actions (app open → capture action → keyboard). UT-5 family; CITE-01                    |
| Editor                         | Full-width, keyboard-first; title collapses to a single line above                         |
| Toolbar                        | Compact, sticky above keyboard; icon buttons with accessible names                         |
| Save                           | Autosave with a **visible, unambiguous** status (see §5)                                   |
| Organize                       | Hidden until after save; a single "Add to…" action                                         |
| Offline/foreground transitions | Save status must survive backgrounding; honest "Saving…" / "Offline — will retry" (QA 8.3) |

**No gesture-only capture** (QA 1.8). Photo/voice capture is out of v1
scope; do not draw chrome for it.

---

## 4. Editor surface (TipTap) — interaction spec

| Element              | Spec                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Editing surface role | Labelled (`aria-label="Note body"`); title field labelled "Note title" (QA 2.4)               |
| Toolbar              | `toolbar` role; roving tabindex; buttons labelled; state exposed via `aria-pressed`           |
| Keyboard             | Tab enters body; `Escape` exits toolbar to body; Tab does **not** trap in the editor (QA 1.4) |
| Fenced code          | CodeMirror 6 block; monospace, non-reflowing, keyboard-scrollable overflow (QA 6.1)           |
| Inline identifiers   | Rendered in `<bdi>`-equivalent isolation (QA 6.2, 6.5)                                        |
| URLs / paths         | Isolated, copyable, not auto-truncated into loss (QA 6.3)                                     |
| Tables               | Markdown table block; internal horizontal scroll on narrow viewports (QA 6.4)                 |
| Slash commands       | Optional; if present, keyboard-complete with Escape dismiss and focus restore                 |

**Direction:** the body never forces a single direction because it
contains code (QA 7.3). Isolation is per-fragment.

---

## 5. Save confidence (REC-01, QA 8.3)

Save state must be **unambiguous at a glance and to AT**, never a silent
success.

| State              | Visual                                            | AT                                                         |
| ------------------ | ------------------------------------------------- | ---------------------------------------------------------- |
| Idle/clean         | "Saved" with check icon                           | Static text; not announced repeatedly                      |
| Saving             | "Saving…" + subtle non-animated indicator         | Polite status announced **once** per state change (QA 2.3) |
| Saved              | "Saved · just now" → relative time                | Same                                                       |
| Conflict (version) | "This note changed elsewhere. Reload / Keep mine" | Alert-dialog, focus moved, explicit resolution             |
| Offline/pending    | "Offline — changes saved locally, will retry"     | Polite status once                                         |
| Failed             | "Couldn't save. Retry" (danger treatment)         | Alert, retry action focused                                |

**Rule:** a save failure is a **transport** error class — allowed to use
danger treatment. Do _not_ reuse refusal styling.

---

## 6. Import and ingestion

| Step            | Surface                                                              | Spec                                                                     |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Choose files | File picker / drop zone                                              | Drop zone has a keyboard-equivalent "Choose files" button                |
| 2. Validate     | Client-side pre-check only for size/type (server is authority)       | `unsupported_type` / `too_large` explained with the offending file named |
| 3. Progress     | Per-file progress list                                               | Visible **before** any Ask invitation (REC-02, QA 5.7)                   |
| 4. Result       | Ready / pending / failed per file                                    | Partial success supported (`partial` — some files ok)                    |
| 5. Follow-up    | "Ask about these" appears **only** when at least one file is `ready` | Clear corpus-state copy                                                  |

Ingestion progress detail:
[`../states/empty-loading-error-indexing.md`](../states/empty-loading-error-indexing.md).
The UI never calls a parser/provider; all state comes via the §5.2 port.

---

## 7. Long-content and mixed-content handling

Fixtures that must render correctly (architecture §9):

- Long titles (2-line clamp in lists; full in reader)
- Nested quotes (max 3 visual indent levels)
- Fenced code + inline `` `identifiers` ``
- Inline URLs / file paths
- Markdown tables
- Mixed-case tokens (`pgvector`, `BYOK`)
- Very long unbroken strings

No horizontal page scroll; overflow is handled inside the block (QA 5.9).

---

## 8. Empty, loading, error states (capture-local)

| State               | Copy (What / Why / Next)                                                                                                             | Treatment            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| First-run Inbox     | "OmniDoc turns your notes into answers you can check." / "Nothing here yet." / **Write your first note** + Paste, Import, Try sample | Primary CTA; neutral |
| Editor loading      | Static skeleton bar                                                                                                                  | Reduced-motion safe  |
| Import failed       | Per-file failure with reason                                                                                                         | Danger, retryable    |
| Save conflict       | Resolution dialog                                                                                                                    | Alert                |
| Quota/storage error | "Couldn't save — storage unavailable."                                                                                               | Danger, retry        |

---

## 9. Accessibility requirements (gate)

| #   | Requirement                                                                       |
| --- | --------------------------------------------------------------------------------- |
| 1   | Keyboard-only: create note, type, format, save, and exit — no mouse (QA 1.1, 1.4) |
| 2   | Title and body have distinct accessible names (QA 2.4)                            |
| 3   | Save status announced once per change, not per keystroke (QA 2.3)                 |
| 4   | Import progress announced per state change, not per tick (QA 2.3)                 |
| 5   | Visible focus everywhere; focus returns predictably from dialogs (QA 1.2, 1.3)    |
| 6   | Code/URL/token content keyboard-scrollable and copyable (QA 6.1–6.3)              |
| 7   | Reduced motion: skeleton and save indicators static (QA 3.1)                      |

---

## 10. RTL-readiness notes

- Editor paragraph alignment uses `text-align: start`, never `left`.
- Toolbar order and indent controls use logical `padding-inline-start`
  for indentation; icon set carries start/end semantics.
- `<bdi>` isolation on inline identifiers/URLs/code prevents reordering
  in a future RTL locale (QA 6.5, 7.3).
- Timestamps stored UTC, formatted at presentation (QA 7.6).

---

## 11. Traceability

| Spec element                       | Evidence           | Port / architecture |
| ---------------------------------- | ------------------ | ------------------- |
| Write-first, no pre-write organize | REC-01, CITE-02/03 | §3                  |
| Paste/import parity                | REC-02             | §5.2                |
| Save confidence states             | REC-01             | §5.1, §3            |
| Indexing visible before Ask        | REC-02             | §5.2, §3            |
| AI answers not auto-saved          | REC-06             | §4                  |
| Mixed-content rendering            | REC-11             | §8, §9              |
| Mobile capture ≤2 actions          | REC-09             | —                   |
| Code/URL isolation                 | REC-19             | §8                  |

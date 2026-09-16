# Journey — Organize (light, optional)

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-03; CITE-04, CITE-05, CITE-06 (folders vs tags effort);
OBS-06–OBS-10 (maintenance/discipline costs).
**Architecture:** §3 workspace/collection structure, §5.1 notes port, §9
fixtures.

**Job:** keep notes findable later **without turning the product into a
filing chore**. Organization is _available_, _optional_, and _simple_ —
never a prerequisite for value (REC-03).

---

## 1. Design stance

| Decision                                                           | Rationale                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Inbox is the default landing for new notes                         | Removes location decision at capture (CITE-03, OBS-06)                    |
| Folders/collections are **optional and single-membership-leaning** | Folders outperform tags for storage/retrieval in cited evidence (CITE-04) |
| Tags exist but are not the primary retrieval path                  | Tags carry higher manual/mental effort (CITE-06)                          |
| No graph/link visualization in v1                                  | Maintenance becomes the hobby; not an activation need (OBS-07/08)         |
| No AI auto-structure in v1                                         | Trust surrender + opaque wrong links (OBS-09/10)                          |
| Retrieval is the investment area, not taxonomy                     | REC-03; search + Ask carry the load                                       |

**Explicit non-goal:** OmniDoc does **not** require any organization step
for activation. Retention works with Inbox + Search + Ask alone.

---

## 2. Information surfaces

| Surface                   | Purpose                       | Default state                 |
| ------------------------- | ----------------------------- | ----------------------------- |
| **Inbox**                 | Notes not yet filed           | Default landing after capture |
| **All notes**             | Flat chronological list       | Sortable by updated/created   |
| **Collections** (folders) | Optional single-home grouping | Collapsed; created on demand  |
| **Labels** (tags)         | Optional cross-cutting marks  | Hidden behind "Add label"     |
| **Recents**               | Fast re-find                  | Sidebar shortcut / mobile tab |

No "database", no "view builder", no property schemas (that is Notion
territory and conflicts with light-structure discipline).

---

## 3. Desktop layout

```text
┌── Sidebar ──┐ ┌──────────────────── List / Canvas ─────────────────────┐
│ Inbox (n)   │ │  Filter bar: [Inbox ▾] [Sort ▾] [View: List|Cards]     │
│ All notes   │ │  ┌──────────────────────────────────────────────────┐  │
│ Recents     │ │  │ Title · snippet · [Sample|Mine] · updated        │  │
│ Collections │ │  │ …                                                │  │
│  ├ Work     │ │  └──────────────────────────────────────────────────┘  │
│  └ Reading  │ │  Multi-select → [Move to…] [Add label] [Delete]        │
│ Labels ▸    │ │                                                        │
└─────────────┘ └────────────────────────────────────────────────────────┘
```

- List rows show: title, snippet, corpus chip (**Sample** vs **Mine**),
  updated time, and (when indexing) a status dot.
- Snippets must not leak cross-tenant content; highlighting is
  presentation over authorized hits (§3 search).

---

## 4. Mobile layout

| Aspect       | Spec                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Tabs         | **Inbox · Notes · Search · Ask** (bottom bar)                                                       |
| Collections  | Accessed via an "Organize" sheet, not the primary tab                                               |
| Row          | Title + snippet (2-line clamp) + corpus chip                                                        |
| Bulk actions | Long-press opens a selection mode with visible checkboxes and a keyboard-equivalent "Select" button |
| Move/label   | Sheet with searchable target list; one tap to confirm                                               |

---

## 5. Interaction states

### 5.1 Inbox

| State     | Spec                                                            |
| --------- | --------------------------------------------------------------- |
| Empty     | "Inbox zero. Everything's filed." + "Capture something new" CTA |
| Has items | Chronological list; "File" action per row and in bulk           |
| Filing    | Optional; never auto-files without user action                  |

### 5.2 Collections (folders)

| State            | Spec                                                       |
| ---------------- | ---------------------------------------------------------- |
| None yet         | Collapsed section; "New collection" affordance             |
| Create           | Inline text field with name; Enter creates; Escape cancels |
| Rename           | Inline; Escape reverts                                     |
| Delete           | Confirm dialog; "Notes move to Inbox, not deleted"         |
| Empty collection | "Nothing in here yet." + "Move notes here"                 |

### 5.3 Labels (tags)

| State           | Spec                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| Add             | Combobox with typeahead + create-new; keyboard-complete (Base UI `Combobox`) |
| Remove          | Chip `×` with accessible name "Remove label <name>"                          |
| Overflow        | "+N more" opens a popover listing all                                        |
| No labels exist | Field is simply empty; no empty-taxonomy nag                                 |

**Anti-pattern guard:** no modal that blocks save until a label is chosen.
No "required" indicators on organize fields.

---

## 6. Bulk actions

| Action    | Spec                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| Selection | Checkboxes in list; header checkbox for all-visible (with honest count: "Select all 12 shown") |
| Move      | Pick collection or Inbox                                                                       |
| Label     | Add/remove one or more labels                                                                  |
| Delete    | Soft delete with undo toast; hard delete only in settings with explicit confirmation           |
| Feedback  | Result summary announced politely: "Moved 12 notes to Work"                                    |

**Tenant safety:** bulk operations are server-authoritative; a selection
that spans workspaces is impossible — the selector is workspace-bound
(§2). If the server returns `forbidden`, show a generic access message,
never another tenant's data.

---

## 7. Empty, loading, error states

| State                    | Copy                                    | Treatment                       |
| ------------------------ | --------------------------------------- | ------------------------------- |
| No notes at all          | First-run What/Why/Next (REC-07)        | Primary CTA                     |
| No notes in collection   | "Nothing in here yet."                  | Secondary CTA "Move notes here" |
| Organize list loading    | Static skeleton rows                    | Reduced-motion safe             |
| Move failed              | "Couldn't move those notes. Try again." | Danger, retry                   |
| Version conflict on edit | See capture save-conflict               | Alert                           |

---

## 8. Accessibility requirements (gate)

| #   | Requirement                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Collections/labels fully keyboard operable (create, rename, move, remove) (QA 1.1)                         |
| 2   | Combobox follows WAI-ARIA combobox pattern: label, `aria-expanded`, listbox, Escape dismiss, focus restore |
| 3   | Multi-select state exposed via `aria-selected` / checkboxes with labels, not color                         |
| 4   | Bulk action results announced politely once (QA 2.3)                                                       |
| 5   | Corpus chip (Sample/Mine) is text, never color-only (QA 4.4)                                               |
| 6   | Inline rename has a label and predictable focus (QA 1.3)                                                   |
| 7   | Drag-and-drop (if offered) always has a keyboard-equivalent "Move to…" (QA 1.1)                            |

---

## 9. RTL-readiness notes

- Indentation of nested collections uses `padding-inline-start`.
- Tree expand/collapse chevrons are direction-aware (start/end), not
  hard-coded right-pointing (QA 7.4).
- Chips and tag lists wrap with logical margins; no `margin-left` on the
  chip separator.
- Names/labels are user content — wrap in `<bdi>` where they sit next to
  counts or timestamps (QA 6.5).

---

## 10. Traceability

| Spec element                    | Evidence           | Port / architecture |
| ------------------------------- | ------------------ | ------------------- |
| Inbox default, no location gate | REC-03, CITE-03/06 | §3                  |
| Folders primary, tags secondary | CITE-04, CITE-06   | §3                  |
| Light optional structure        | REC-03             | §3                  |
| Sample/Mine per row             | REC-08/17          | §9                  |
| No graph / no AI auto-structure | OBS-07–10          | §3                  |
| Bulk tenant safety              | —                  | §2 tenancy          |

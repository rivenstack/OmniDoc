# App Shell and Navigation

> **Historical (2026-09-22).** F-02 was paused before this layout was
> built; it proceeded on 2026-09-23 under the new rules (structure from
> `../system-ux.md`, look from user references). Widths, regions, and
> component recipes here are still not binding.
> The plan is [`../now.md`](../now.md).

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-03, REC-07, REC-13, REC-18; CITE-01/CITE-02 (capture
speed), CITE-17 (empty/error honesty analogy).
**Architecture:** §2 tenancy (server-authoritative membership), §8
locale/direction, §9 sample-vs-mine.

The shell must make **capture one action from anywhere**, keep **Ask**
reachable without burying it in a taxonomy, and present workspace/team
chrome that is **true at n≈1–few** (REC-18).

---

## 1. Information architecture

```text
App shell (authenticated)
├── Sidebar (primary nav)
│   ├── New note                       ← primary capture action
│   ├── Inbox                          ← unFiled capture default landing
│   ├── Notes (all)
│   ├── Collections (optional, light)  ← folders/tags, collapsible
│   ├── Search
│   └── Ask
├── Top bar
│   ├── Workspace switcher             ← honest org/workspace chrome
│   ├── Global search field            ← focusable via keyboard shortcut
│   └── Mode chip (Mock / Live …)      ← persistent honesty
└── Content region
    ├── Canvas (list / reader / editor / ask)
    └── Citation rail (desktop) / sheet (mobile)
```

**IA rules (REC-03):** no deep taxonomy as an activation prerequisite.
Inbox + search + Ask are the spine; folders/tags are optional and simple.
No graph view in v1.

---

## 2. Desktop shell (> 1024px)

### 2.1 Layout

| Region        | Width                                | Notes                                       |
| ------------- | ------------------------------------ | ------------------------------------------- |
| Sidebar       | 15rem expanded / 3.25rem rail        | Collapsible; persists per user              |
| Content       | fluid, max `--od-layout-content-max` | Reading measure separate                    |
| Citation rail | 22rem                                | Opens on citation activate; resizable later |

Logical CSS only: sidebar uses `border-inline-end`, content uses
`padding-inline` (QA 7.2).

### 2.2 Sidebar

- Persistent **New note** button at the top (primary), opening directly
  into the editor with the cursor placed — no folder/tag decision
  (REC-01, QA 8.1 analog on desktop).
- Nav items are links with `aria-current="page"`.
- Collections section is collapsed by default when empty; first folder/tag
  creation appears there.
- Keyboard: sidebar is a `<nav>` landmark; skip-to-content link precedes
  it (QA 1.7).

### 2.3 Top bar

- **Workspace switcher** (§4) at the inline-start edge.
- **Search** field opens a command palette (`Cmd/Ctrl + K`) rather than
  living only in the sidebar; palette is focus-trapped and Escape-dismissible.
- **Mode chip** is always visible near the Ask entry, never only inside
  settings (REC-15/17).
- **Theme toggle** (light/dark/system) via `next-themes`; icon-button with
  accessible name "Switch theme".

### 2.4 Focus order

`Skip to content → Sidebar nav → New note → Workspace switcher → Search →
Mode chip → Canvas → Citation rail (when open)`.

Route change moves focus to the content region heading (QA 1.3); returning
from a dialog returns focus to its trigger.

---

## 3. Mobile shell (≤ 640px, target ~390px)

| Aspect         | Spec                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------- |
| Primary action | Floating **New note** action, reachable in ≤2 actions from app open (REC-09, QA 8.1)        |
| Nav            | Bottom tab bar: **Inbox · Notes · Search · Ask** + a capture action                         |
| Sidebar        | Not used; workspace switcher moves to a header sheet                                        |
| Reading        | Single column; citation opens as a **sheet** (not a shrunk dual pane — REC-09, QA 8.2)      |
| Ask            | Composer sticky to the bottom; answer flows above; citation sheet ≤2 taps (UT-5 hypothesis) |
| Mode chip      | Compact form: icon + short label ("Mock"), full text via accessible name                    |

**Gesture discipline:** no gesture-only actions; every gesture has a
visible, keyboard-reachable equivalent (QA 1.8). Capture must never depend
on a swipe.

---

## 4. Workspace switcher (honest chrome — REC-18)

### 4.1 Correct at n≈1

| State                    | Presentation                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------- |
| One workspace            | A label, not a fake multi-org menu. Shows workspace name + "Solo workspace" badge. |
| Few workspaces           | Real switcher listing only actual memberships                                      |
| Sample workspace present | Clearly labelled "Sample — public demo notes" and visually separated from "Mine"   |

### 4.2 Anatomy

```
[workspace avatar/initials]  Workspace name           ▾
  ├── Mine
  │     └── Personal workspace
  ├── Sample (public demo notes)
  │     └── Demo corpus  [Sample]
  └── Create workspace…
```

### 4.3 Rules

- **No simulated scale:** no org chart, no "12 organizations", no
  placeholder member directories, no SSO upsell wall (REC-18).
- Membership labels are accurate: owner/member reflect real server state
  (§2 tenancy). The client never invents membership.
- Switching workspace is a **selector**, not authority; the server
  re-binds membership (architecture §2). UI copy on failure: "You don't
  have access to that workspace." (no leakage of existence beyond a
  generic forbidden message).
- Sample vs Mine is carried through to lists, Ask scope, and citations
  (see [`../states/sample-vs-mine.md`](../states/sample-vs-mine.md)).

### 4.4 Team surface (minimal)

A **Members** panel shows real members only:

- Empty (solo): "You're the only member." + invite affordance.
- Few: list with role chips; no admin suites, no directory sync theatre.

---

## 5. Navigation states

| State                       | Spec                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Collapsed sidebar (rail)    | Icon-only with tooltips; tooltip on focus **and** hover; `aria-label` on each item |
| Active item                 | Weight + surface tint + `aria-current`; never color-only                           |
| Disabled/blocked item       | Only when a real gate exists; explain why in text                                  |
| Overflow (many collections) | Scroll inside sidebar; no hidden truncation without access                         |
| Sample workspace active     | Persistent "Sample" banner above canvas                                            |

---

## 6. Loading, error, offline in the shell

| State                       | Behavior                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Initial shell load          | Static skeleton (motion-reduced safe); no layout shift when nav resolves                                     |
| Session expired             | Full-page re-auth prompt; unsaved editor content preserved in memory and warned about                        |
| Transport error             | Inline banner in content region, retryable; shell stays usable                                               |
| Provider/AI transport error | Scoped to the Ask surface (see `../dual-mode/failure-states.md`); shell and mock path remain usable (REC-16) |
| Indexing in progress        | Non-blocking; shell shows progress affordance and warns before inviting Ask (REC-02, QA 5.7)                 |

**Rule:** the shell itself never becomes unusable because a provider path
failed. Mock-first means the product remains demonstrable (REC-13).

---

## 7. Accessibility requirements (gate)

| #   | Requirement                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------ |
| 1   | `Skip to content` link is the first focusable element (QA 1.7)                                               |
| 2   | Landmarks: `banner`, `navigation`, `main`, `complementary` (citation rail)                                   |
| 3   | Workspace switcher is a labelled button + menu (Base UI `Menu`), keyboard complete, returns focus to trigger |
| 4   | Command palette (`Cmd/Ctrl+K`) is a `Dialog` with focus trap, Escape close, focus restore                    |
| 5   | Mode chip changes announced politely as status, not on every render (QA 2.3)                                 |
| 6   | Visible focus on every nav control; ring meets non-text contrast in both themes (QA 1.2, 4.3)                |
| 7   | No motion beyond token durations; all respect reduced motion (QA 3.x)                                        |

---

## 8. RTL-readiness notes

- Sidebar expands toward `inline-start`; rail toggle icon is direction-
  aware via logical placement, not a mirrored hard-coded arrow.
- Citation rail docks to `inline-end`.
- `chevron-*` icons that communicate "expand/next" use start/end semantics
  (QA 7.4) — no `ArrowRight === next`.
- Workspace switcher menu opens **out of the sidebar** toward
  `inline-end` (`side="right"`, `align="end"`), mirroring the account
  menu so the two anchor identically; Base UI `Direction` supplies the
  logical mapping, and the popup keeps the bottom sheet on mobile.
- No component sets its own `dir`; the single `lang`/`dir` source
  (layouts) governs (QA 7.1).

---

## 9. Traceability

| Shell element                       | Evidence           | Architecture           |
| ----------------------------------- | ------------------ | ---------------------- |
| One-action capture                  | REC-01, CITE-01/02 | —                      |
| Optional light collections          | REC-03             | §3 workspace structure |
| Honest workspace switcher           | REC-18             | §2 tenancy             |
| Persistent mode chip                | REC-13/15/17       | §5.11                  |
| Sample banner                       | REC-08/17          | §9                     |
| Skip link + landmarks               | REC-11             | §8                     |
| Mock remains usable on live failure | REC-16             | §1 boundary            |

Component names: see [`../components/inventory.md`](../components/inventory.md).

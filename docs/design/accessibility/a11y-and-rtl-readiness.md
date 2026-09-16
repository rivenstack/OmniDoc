# Accessibility and RTL-Readiness

**Owner:** `/designer` · **Handoff:** D-01
**Evidence:** REC-05, REC-11, REC-19; CITE-07, CITE-08, CITE-18,
CITE-19, CITE-20; `docs/research/ux/07-accessibility-friction.md`.
**Architecture:** §8 locale/direction/time; §6 sanitization.
**Gate:** accessibility is a **release gate**, not a polish pass
(`AGENTS.md`, `quality/ui-qa-checklist.md`).
**Locale status:** primary `en` (LTR) only. RTL / mixed-BiDi is
**deferred, not closed** — everything below is **readiness discipline**,
never a claim that RTL ships.

---

## 1. Non-negotiables

1. Every interactive control is keyboard reachable and operable.
2. Focus is always visible and never lost to `<body>`.
3. Every control has an accessible name.
4. Status changes are announced **once**, politely.
5. Streaming answer text is **never** piped token-by-token into a live
   region.
6. Empty / error / refusal states are text-exposed, never color-only.
7. `prefers-reduced-motion: reduce` resolves every animation to a static
   equivalent.
8. Contrast meets WCAG AA for text and non-text (focus ring).
9. One `lang`/`dir` source; logical CSS by default; `bdi` isolation for
   identifiers, code tokens, URLs, key prefixes, usage/request IDs, and
   UGC fragments.
10. **No RTL-locale claim** appears anywhere in UI copy.

---

## 2. Focus management contract

| Event                          | Required behavior                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Route change                   | Move focus to the content region's `h1`/`h2`                                              |
| Dialog / sheet / popover open  | Trap focus inside; `Escape` closes                                                        |
| Dialog / sheet / popover close | Return focus to the trigger                                                               |
| Citation open                  | Focus the passage heading in the rail/sheet; on close return to the `[n]` marker (QA 2.6) |
| Streaming start                | **Do not** move focus from the composer; offer "Jump to answer" (QA 1.6)                  |
| Save state change              | Do not move focus; announce via status                                                    |
| Verify result (cookbook)       | Move focus to a predictable status region (REC-19)                                        |
| Inline rename create           | Focus the input; `Escape` reverts and restores focus                                      |
| Failure appears                | Focus stays in context; the failure's primary action is next in tab order                 |

Focus indicator spec: 2px ring (`--od-focus-ring`) + 2px offset, plus a
1px inset fallback for high-contrast contexts. Non-text contrast ≥ 3:1 on
both light and dark surfaces (QA 1.2, 4.3).

---

## 3. Keyboard map (global)

| Key                 | Action                                                 |
| ------------------- | ------------------------------------------------------ |
| `Tab` / `Shift+Tab` | Move focus (logical DOM order)                         |
| `Cmd/Ctrl + K`      | Open command palette / search                          |
| `Cmd/Ctrl + N`      | New note                                               |
| `Escape`            | Close overlay / cancel streaming / exit editor toolbar |
| `Enter`             | Submit Ask (with `Shift+Enter` for newline)            |
| `Enter` (list row)  | Open the focused note                                  |

**No mouse-only or hover-only action exists anywhere** (QA 1.5, REC-11).
Any drag-and-drop has a keyboard-equivalent "Move to…" action (QA 1.1).

---

## 4. Screen-reader patterns

| Pattern          | Spec                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Landmarks        | `banner`, `navigation`, `main`, `complementary` (citation rail), `search`                                                         |
| Skip link        | First focusable element; targets `#main` (QA 1.7)                                                                                 |
| Live regions     | One polite region for status (saving, indexing, search counts); one assertive region reserved for `role="alert"` transport errors |
| Streaming        | Announce "Generating answer" once, "Answer ready" once; **never** per token (QA 2.2, CITE-07)                                     |
| Citation marker  | Button with name "Source 1: <note title>, passage N" — never a bare number (QA 2.1)                                               |
| Unsupported span | Exposed to AT as marked text (e.g. `<mark>` + visually-hidden "unsupported" label), not decoration-only                           |
| Long strings     | Truncate visually with an accessible full-value pattern; avoid forcing AT to spell entire URLs where avoidable (QA 2.7)           |
| Editor           | Title and body have distinct accessible names; toolbar uses `toolbar` role with roving tabindex (QA 2.4, CITE-20)                 |
| Tables           | Real `<table>` semantics with header association; internal scroll container is focusable and labelled (QA 6.4)                    |
| Code             | `<pre><code>`; scroll container focusable with accessible name "Code block" (QA 6.1)                                              |

---

## 5. Reduced motion

| Element                  | Default                             | `prefers-reduced-motion: reduce` |
| ------------------------ | ----------------------------------- | -------------------------------- |
| Skeleton loaders         | Static blocks (already non-shimmer) | Same                             |
| Streaming caret          | Subtle loop                         | Static "Generating…" label       |
| Progress bars            | Determinate/indeterminate animated  | Static bar + numeric label       |
| Sheet/dialog transitions | `--od-duration-base`                | Instant                          |
| Hover/focus tints        | `--od-duration-instant`             | Instant                          |
| Toast enter/exit         | `--od-duration-fast`                | Instant                          |

Implementation: a single global CSS rule plus per-component
`motion-reduce:` utilities — no per-component bespoke logic (QA 3.1–3.3).

---

## 6. Contrast

| Element                     | Requirement                                               |
| --------------------------- | --------------------------------------------------------- |
| Body / labels               | ≥ 4.5:1                                                   |
| Placeholder                 | ≥ 4.5:1 and never the only label                          |
| Citation chips (all states) | ≥ 4.5:1 text; ≥ 3:1 for boundaries (QA 4.2)               |
| Mode / corpus chips         | ≥ 4.5:1 in both themes; icon + text                       |
| Focus ring                  | ≥ 3:1 against adjacent colors                             |
| Status text (error/refusal) | ≥ 4.5:1; refusal uses neutral/info, not low-contrast grey |

---

## 7. RTL-readiness discipline (no RTL shipping)

### 7.1 Single direction source

- `apps/web/app/layout.tsx` sets `lang` and `dir` from the locale module
  — the **only** place either attribute is set on `<html>`.
- Base UI `Direction` provider wraps the tree and supplies runtime
  direction to primitives (ADR-0003).
- No component sets its own `dir`, and no component branches business
  logic on direction (QA 7.1).

### 7.2 Logical CSS

Default to logical properties/utilities:

| Instead of                | Use                                           |
| ------------------------- | --------------------------------------------- |
| `margin-left/right`       | `margin-inline-start/end` (`ms-*`, `me-*`)    |
| `padding-left/right`      | `padding-inline-start/end` (`ps-*`, `pe-*`)   |
| `left/right`              | `inset-inline-start/end` (`start-*`, `end-*`) |
| `border-left/right`       | `border-inline-start/end`                     |
| `text-align: left/right`  | `text-align: start/end`                       |
| `width` for inline sizing | `inline-size`                                 |

Physical properties require an inline comment naming the true exception
(e.g. a directional glyph that must **not** mirror). QA 7.2 spot-checks
for these.

### 7.3 Isolation (`bdi` equivalent)

Wrap in `<bdi>` (or an equivalent `unicode-bidi: isolate` element):

- Inline code and identifiers (`pgvector`, `--od-accent-500`)
- URLs and file paths
- API key masked prefixes (`sk-···4f9c`)
- Usage / request IDs and provider error codes
- User-generated fragments (titles, labels) adjacent to numbers or
  chassis punctuation

Never force a whole note body to one direction because it contains code
(QA 7.3).

### 7.4 JS direction discipline

- Use `start`/`end` semantics; no `ArrowRight === next` (QA 7.4).
- Overlay placement uses Base UI's direction-aware positioning.
- Timestamps stored **UTC**, formatted only at presentation (QA 7.6).

### 7.5 Copy discipline

- No string may claim RTL is available, live, or planned for a specific
  date (QA 7.5).
- The design package itself states RTL is deferred, not closed.

---

## 8. Component-level requirements

| Component           | Keyboard           | Focus                         | Labels                            | Reduced motion   | Isolation                  |
| ------------------- | ------------------ | ----------------------------- | --------------------------------- | ---------------- | -------------------------- |
| Workspace switcher  | ✅ menu pattern    | Returns to trigger            | Button + menu labelled            | Instant open     | Workspace names in `<bdi>` |
| Sidebar nav         | ✅                 | Visible ring                  | Items labelled; `aria-current`    | —                | —                          |
| Editor toolbar      | ✅ roving tabindex | Toolbar → body                | Each button labelled              | —                | —                          |
| Save status         | —                  | No focus move                 | Polite status                     | Static indicator | —                          |
| Import progress     | ✅ retry           | Alert on failure              | Per-file labelled                 | Static bar       | File names `<bdi>`         |
| Search field        | ✅                 | Visible ring                  | Labelled `search` landmark        | —                | —                          |
| Filter chips        | ✅                 | Returns to chip               | "Remove filter X"                 | —                | —                          |
| Result row          | ✅                 | Visible ring                  | Link name includes title + corpus | —                | Snippet `<bdi>`            |
| Citation marker     | ✅                 | Returns to marker             | "Source n: title, passage"        | —                | Number in `<bdi>`          |
| Citation rail/sheet | ✅                 | Enters heading; Escape closes | `complementary`/dialog labelled   | Instant under RM | Passage code `<bdi>`       |
| Ask composer        | ✅                 | Retains during stream         | Labelled textarea + mode/corpus   | —                | —                          |
| Mode chip           | ✅ (opens popover) | Returns to chip               | Full mode name                    | Instant          | —                          |
| Usage strip         | —                  | —                             | Figures labelled; tabular         | Static           | Usage IDs `<bdi>`          |
| Cookbook key field  | ✅                 | Show/Hide toggle              | Labelled; `aria-pressed`          | Static verifying | Prefix `<bdi>`             |
| Failure banner      | ✅                 | Alert announced once          | Text + icon                       | Static           | Request ID `<bdi>`         |
| Empty state         | ✅ CTA             | CTA focusable                 | Real heading                      | —                | —                          |

---

## 9. Verification hooks (for Phase Check later)

The Implementer should make these mechanically checkable:

- `@axe-core/playwright` on every journey route (ADR-0003) — supplements,
  never replaces, manual keyboard checks.
- A keyboard-only sweep of: capture → save → search → Ask → citation open
  → feedback → cancel.
- A reduced-motion pass with the OS preference forced on.
- A `bdi`/logical-CSS grep for physical properties on flippable layout.
- A copy grep for prohibited claims (`zero retention`, `RTL`, `99%`).

`quality/ui-qa-checklist.md` remains the operational gate; this spec adds
design-side requirements. See [`../traceability.md`](../traceability.md).

---

## 10. Traceability

| Spec element                      | Evidence           | Architecture |
| --------------------------------- | ------------------ | ------------ |
| Streaming + AT status             | REC-05, CITE-07/08 | §5.6         |
| Trust controls keyboard reachable | REC-11             | §8           |
| Cookbook/usage a11y               | REC-19             | §5.9, §5.10  |
| Single `lang`/`dir` source        | REC-19             | §8, ADR-0003 |
| Logical CSS                       | architecture §8    | §8           |
| `bdi` isolation                   | REC-19             | §8, §9       |
| Reduced motion                    | REC-11             | §8           |
| Sanitized markdown/code           | —                  | §6           |

# Foundations — Design Tokens

> **Historical (2026-09-22).** Not a token lock. Do not require new UI to
> match these values. Look is stock shadcn until a design language is
> chosen. See [`../now.md`](../now.md).

**Owner:** `/designer` · **Handoff:** D-01
**Stack mapping:** Tailwind CSS 4.3.3 + shadcn/ui on Base UI (`@base-ui/react` 1.8.0),
`next-themes` 0.4.6 (ADR-0003).
**Locale:** `en` (LTR) only. Logical properties by default; RTL-readiness
discipline (see [`../accessibility/a11y-and-rtl-readiness.md`](../accessibility/a11y-and-rtl-readiness.md)).

This document is the **token authority** for the OmniDoc UI. Tokens are
declared once as CSS custom properties and consumed through Tailwind v4
utilities and shadcn component variables. Component source is copy-in and
owned in `packages/ui` (ADR-0002/0003); it must consume these tokens, not
hard-coded values.

> Token **names and roles** are implementation-ready. Exact hex/step
> values below are the Designer's specified starting palette; the
> Implementer may tune numeric lightness steps during F-01 while
> preserving **roles, contrast results, and semantic naming**.

---

## 1. Architecture of the token system

Three layers, in increasing specificity:

```text
1. Primitive scales   --od-<scale>-<step>          (raw values; never used directly in components)
2. Semantic tokens    --od-<role> / shadcn vars      (roles; used by components)
3. Component tokens   --od-<component>-<part>        (only where a component needs a scoped override)
```

**Rule:** components consume **semantic** tokens (layer 2). Primitives
(layer 1) exist so light/dark and future density changes remap cleanly.
Component tokens (layer 3) are the exception, added only when a component
has a genuinely distinct need (e.g. citation chip surface).

`components.json` in both `apps/web` and `packages/ui` stays identical in
`style`, `iconLibrary`, and `baseColor`; the Tailwind key stays empty for
v4 (ADR-0003).

---

## 2. Color

### 2.1 Primitive ramps

Neutral ramp for surfaces/text + a single accent + semantic status hues.
Only **roles** are normative; steps are guidance.

```css
@theme {
  /* Neutral (slate-leaning, cool) */
  --od-neutral-0: oklch(1 0 0);
  --od-neutral-50: oklch(0.985 0.002 265);
  --od-neutral-100: oklch(0.968 0.004 265);
  --od-neutral-200: oklch(0.93 0.006 265);
  --od-neutral-300: oklch(0.87 0.008 265);
  --od-neutral-400: oklch(0.7 0.01 265);
  --od-neutral-500: oklch(0.56 0.012 265);
  --od-neutral-600: oklch(0.45 0.013 265);
  --od-neutral-700: oklch(0.36 0.013 265);
  --od-neutral-800: oklch(0.265 0.012 265);
  --od-neutral-900: oklch(0.185 0.01 265);
  --od-neutral-950: oklch(0.13 0.008 265);

  /* Accent — single product accent (calm, non-neon) */
  --od-accent-400: oklch(0.72 0.13 250);
  --od-accent-500: oklch(0.62 0.16 252);
  --od-accent-600: oklch(0.54 0.17 254);

  /* Status */
  --od-success-500: oklch(0.62 0.13 155);
  --od-warning-500: oklch(0.75 0.14 80);
  --od-danger-500: oklch(0.58 0.19 25);
  --od-info-500: oklch(0.62 0.13 240);
}
```

**Constraint:** no decorative color that competes with citation/trust
chrome. Citation chips, mode chips, and trust controls must never be the
lowest-contrast elements on a page (QA 4.2).

### 2.2 Semantic roles (shadcn-compatible)

Map to shadcn's variable contract so copy-in components theme correctly.

```css
:root {
  --background: var(--od-neutral-0);
  --foreground: var(--od-neutral-900);

  --card: var(--od-neutral-0);
  --card-foreground: var(--od-neutral-900);

  --popover: var(--od-neutral-0);
  --popover-foreground: var(--od-neutral-900);

  --primary: var(--od-accent-600);
  --primary-foreground: var(--od-neutral-0);

  --secondary: var(--od-neutral-100);
  --secondary-foreground: var(--od-neutral-800);

  --muted: var(--od-neutral-100);
  --muted-foreground: var(--od-neutral-600);

  --accent: var(--od-neutral-100);
  --accent-foreground: var(--od-neutral-900);

  --destructive: var(--od-danger-500);
  --destructive-foreground: var(--od-neutral-0);

  --border: var(--od-neutral-200);
  --input: var(--od-neutral-200);
  --ring: var(--od-accent-500);

  /* OmniDoc domain roles */
  --od-surface-canvas: var(--od-neutral-50);
  --od-surface-raised: var(--od-neutral-0);
  --od-surface-sunken: var(--od-neutral-100);
  --od-text-primary: var(--od-neutral-900);
  --od-text-secondary: var(--od-neutral-600);
  --od-text-tertiary: var(--od-neutral-500);
  --od-focus-ring: var(--od-accent-500);

  --od-status-supported: var(--od-success-500);
  --od-status-partial: var(--od-warning-500);
  --od-status-unsupported: var(--od-neutral-500);
  --od-status-conflict: var(--od-warning-500);
  --od-status-error: var(--od-danger-500);
  --od-status-info: var(--od-info-500);
}
```

### 2.3 Dark mode

Driven by `next-themes` (`attribute="class"`), tokens remapped under
`.dark`. No component may branch on theme in JS beyond `useTheme` for an
icon; all theming is token-level.

```css
.dark {
  --background: var(--od-neutral-950);
  --foreground: var(--od-neutral-50);
  --card: var(--od-neutral-900);
  --card-foreground: var(--od-neutral-50);
  --popover: var(--od-neutral-900);
  --popover-foreground: var(--od-neutral-50);
  --primary: var(--od-accent-400);
  --primary-foreground: var(--od-neutral-950);
  --secondary: var(--od-neutral-800);
  --secondary-foreground: var(--od-neutral-100);
  --muted: var(--od-neutral-800);
  --muted-foreground: var(--od-neutral-400);
  --accent: var(--od-neutral-800);
  --accent-foreground: var(--od-neutral-50);
  --border: oklch(1 0 0 / 0.12);
  --input: oklch(1 0 0 / 0.16);
  --ring: var(--od-accent-400);
  --od-surface-canvas: var(--od-neutral-950);
  --od-surface-raised: var(--od-neutral-900);
  --od-surface-sunken: oklch(0 0 0 / 0.28);
  --od-text-primary: var(--od-neutral-50);
  --od-text-secondary: var(--od-neutral-300);
  --od-text-tertiary: var(--od-neutral-400);
}
```

**Requirements:** both themes must pass contrast (see §7); focus ring must
be visible on both (QA 4.3); status hues must not rely on hue alone —
pair every status with an icon **and** a text label (QA 4.4, 2.5).

### 2.4 Domain color semantics

| Semantic token            | Used for                                                             | Never for                                                                    |
| ------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `--od-status-supported`   | Supported-claim marker, citation chip accent                         | "AI is accurate" badges                                                      |
| `--od-status-partial`     | Partial-support marker, unsupported-span styling                     | Errors                                                                       |
| `--od-status-unsupported` | Unsupported span, "no citation here"                                 | Disabled controls                                                            |
| `--od-status-conflict`    | Conflict state (two disagreeing sources)                             | Warning banners unrelated to sources                                         |
| `--od-status-error`       | **Transport** failures (`timeout`, `unavailable`, `quota_exhausted`) | `no_supported_answer` / `refused_policy` (these are success states — QA 5.3) |
| `--od-status-info`        | Neutral guidance, honest "usage unavailable"                         | Success                                                                      |

**Rule (QA 5.8):** refusal (`no_supported_answer`) must be **visually
distinct** from transport error. Refusal uses neutral/info treatment, not
danger. Danger is reserved for transport errors and unsafe actions.

### 2.5 Mode × corpus chip colors

| Chip                        | Light surface   | Icon      | Text label (always present)   |
| --------------------------- | --------------- | --------- | ----------------------------- |
| `Mock`                      | neutral sunken  | flask/lab | "Mock · sample answers"       |
| `Live · operator free-tier` | info tint       | broadcast | "Live · operator-funded demo" |
| `Live · your key`           | accent tint     | key       | "Live · your key"             |
| `Sample` corpus             | neutral outline | layers    | "Sample"                      |
| `Mine` corpus               | accent-subtle   | user      | workspace name or "Mine"      |

Chips are **always** icon + text, never color-only (QA 2.1, 4.4), and
never claim capabilities the run mode does not have (REC-17).

---

## 3. Typography

**Typeface:** system UI stack for body/UI (performance + no network
font; CITE-01 latency analogy), one mono family for code/identifiers.

```css
@theme {
  --od-font-sans:
    ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji",
    "Segoe UI Emoji";
  --od-font-mono:
    ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono",
    monospace;
}
```

> If a licensed display face is later wanted for marketing surfaces, it
> must not touch the app shell or editor (perf + FOUT risk).

### 3.1 Scale

| Token               | Size / line-height | Weight | Use                            |
| ------------------- | ------------------ | ------ | ------------------------------ |
| `--od-text-display` | 2.25rem / 1.15     | 650    | Marketing hero only (not app)  |
| `--od-text-h1`      | 1.75rem / 1.2      | 620    | Page title                     |
| `--od-text-h2`      | 1.375rem / 1.25    | 600    | Section / note title in reader |
| `--od-text-h3`      | 1.125rem / 1.3     | 600    | Subsection / card title        |
| `--od-text-body`    | 1rem / 1.6         | 400    | Note body, answer body         |
| `--od-text-body-sm` | 0.875rem / 1.55    | 400    | Lists, metadata, snippets      |
| `--od-text-caption` | 0.8125rem / 1.45   | 500    | Labels, chips, timestamps      |
| `--od-text-micro`   | 0.75rem / 1.4      | 500    | Badge counts, footnotes        |

**Reading surface:** note/answer body measures **60–75ch**
(`--od-measure-reading: 68ch`). Answer prose caps at that measure even on
wide desktop; citation rail sits outside it.

**Numbers:** tabular figures (`font-variant-numeric: tabular-nums`) for
usage counters, offsets, timestamps, and token counts.

### 3.2 Code / identifiers / URLs

- Fenced code uses `--od-font-mono`, a non-reflowing scroll container,
  keyboard-scrollable (QA 6.1), Shiki server-rendered theming (ADR-0003).
- Inline code/identifiers (`pgvector`, `BYOK`, `--od-accent-500`) render
  in mono and are wrapped in a `<bdi>`-equivalent isolation element
  (QA 6.5) so a future RTL locale cannot reorder them.
- URLs and file paths are isolated, copyable, never auto-truncated in a
  way that loses the full value (QA 6.3) — truncate visually with a
  copy-affordance and full-value accessible name.
- **Never** force a whole note body to one direction because it contains
  code (QA 7.3).

### 3.3 Long-content behavior

| Content                           | Behavior                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Long titles                       | 2-line clamp in lists, full title on reader/detail; ellipsis is explicit, full text available to AT (QA 8.5) |
| Unbroken strings (tokens, base64) | `overflow-wrap: anywhere` with `word-break: normal`; no horizontal page scroll                               |
| Markdown tables                   | Horizontal scroll container inside the reading surface at ≤ ~640px; never clipped columns (QA 6.4)           |
| Nested quotes                     | Indent with logical `padding-inline-start`, max 3 visual levels then flatten                                 |

---

## 4. Spacing and layout

4px base grid. Only logical properties for inline/block spacing.

```css
@theme {
  --od-space-0: 0;
  --od-space-1: 0.25rem;
  --od-space-2: 0.5rem;
  --od-space-3: 0.75rem;
  --od-space-4: 1rem;
  --od-space-5: 1.25rem;
  --od-space-6: 1.5rem;
  --od-space-8: 2rem;
  --od-space-10: 2.5rem;
  --od-space-12: 3rem;
  --od-space-16: 4rem;
}
```

**Layout constants**

| Token                       | Value                             | Use                    |
| --------------------------- | --------------------------------- | ---------------------- |
| `--od-layout-sidebar`       | 15rem (expanded) / 3.25rem (rail) | Workspace sidebar      |
| `--od-layout-reading`       | 68ch                              | Note/answer measure    |
| `--od-layout-citation-rail` | 22rem                             | Desktop source panel   |
| `--od-layout-content-max`   | 80rem                             | App content max width  |
| `--od-layout-composer-max`  | 46rem                             | Ask composer max width |

**Rule:** use `padding-inline`, `margin-inline`, `inset-inline`,
`border-inline` — never physical `left`/`right` for flippable layout
(QA 7.2, architecture §8).

---

## 5. Elevation, radius, borders

```css
@theme {
  --od-radius-xs: 0.25rem;
  --od-radius-sm: 0.375rem;
  --od-radius-md: 0.5rem;
  --od-radius-lg: 0.75rem;
  --od-radius-full: 9999px;

  --od-elevation-0: none;
  --od-elevation-1: 0 1px 2px oklch(0 0 0 / 0.06);
  --od-elevation-2: 0 4px 12px oklch(0 0 0 / 0.08);
  --od-elevation-3: 0 12px 32px oklch(0 0 0 / 0.12);
}
```

| Elevation | Use                                                    |
| --------- | ------------------------------------------------------ |
| 0         | App canvas, reading surface, list rows                 |
| 1         | Cards, citation chips at rest                          |
| 2         | Popovers, dropdowns, citation preview, command palette |
| 3         | Dialogs, mobile sheets                                 |

**Rule:** elevation is hierarchical and restrained; it never signals
trust level. Trust status is carried by **label + icon + structure**, not
by shadow (CITE-09 caution: visual "badges" can over-signal accuracy).

---

## 6. Motion

```css
@theme {
  --od-duration-instant: 80ms;
  --od-duration-fast: 140ms;
  --od-duration-base: 200ms;
  --od-duration-slow: 320ms;
  --od-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --od-ease-emphasis: cubic-bezier(0.2, 0, 0.2, 1);
}
```

**Motion philosophy:** motion supports hierarchy and state change only.
It never creates urgency or implies AI "thinking magic".

### 6.1 Reduced motion (gate — QA 3.x)

Every transition must resolve to a static equivalent under
`prefers-reduced-motion: reduce`:

- Answer streaming chrome (caret/shimmer) → static "generating" label with
  a determinate/indeterminate **non-animated** indicator.
- Skeleton loaders → static neutral blocks (no shimmer sweep).
- Progress indicators → text percentage or static bar, still legible.
- Dialog/sheet transitions → instant show/hide.
- No autoplaying motion in empty/error states.

Implementation pattern (spec): a single `motion-safe:` / `motion-reduce:`
convention applied at the token-utility boundary, not per-component
guesswork. No component may animate by default without a
`motion-reduce:` fallback.

### 6.2 Motion inventory

| Interaction                  | Duration    | Reduced-motion fallback |
| ---------------------------- | ----------- | ----------------------- |
| Hover/focus tint             | `instant`   | Instant state change    |
| Chip appear                  | `fast`      | Instant                 |
| Citation rail open (desktop) | `base`      | Instant                 |
| Mobile sheet open            | `base`      | Instant                 |
| Streaming caret              | `slow` loop | Static label            |
| Save confirmation            | `fast`      | Non-animated check      |
| Mode switch confirm          | `base`      | Instant                 |

---

## 7. Accessibility contract for tokens

| Requirement        | Token-level guarantee                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Body text contrast | `--od-text-primary` on `--background` ≥ 4.5:1 (both themes)                                      |
| Secondary text     | `--od-text-secondary` ≥ 4.5:1 on canvas/raised                                                   |
| Tertiary text      | Used for non-essential metadata only; ≥ 4.5:1 where it conveys meaning (QA 4.1)                  |
| Focus ring         | `--od-focus-ring` non-text contrast ≥ 3:1 on both surfaces; 2px offset ring + 1px inset fallback |
| Placeholder text   | Never used as the only label; `--od-text-tertiary` minimum, label always present (QA 4.1)        |
| Status             | Always icon + text; never hue-only (QA 4.4)                                                      |
| Citation chips     | Default/hover/focus/visited all meet contrast (QA 4.2)                                           |

---

## 8. Direction source (single source of truth)

- **One** place sets `lang` and `dir` on `<html>` from the locale shell
  (`apps/web/app/layout.tsx` reads the locale module). Phase 0 value:
  `lang="en" dir="ltr"`.
- **Base UI `Direction` provider** wraps the app tree and is the runtime
  direction value for Base UI primitives. No component sets its own
  `dir` attribute; no component reads direction to change business logic.
- Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`,
  `end-*`, `border-s`, `border-e`) are the default for flippable layout.
  Physical utilities require an inline comment explaining the true
  exception (e.g. a directional glyph that must not mirror).
- JS uses `start`/`end` semantics; no `ArrowRight === next` assumptions
  (QA 7.4).

Full detail and per-component checks:
[`../accessibility/a11y-and-rtl-readiness.md`](../accessibility/a11y-and-rtl-readiness.md).

---

## 9. Token → spec traceability

| Token group                                            | Evidence               | Architecture     |
| ------------------------------------------------------ | ---------------------- | ---------------- |
| Status colors (supported/partial/unsupported/conflict) | REC-10, CITE-13        | §4 answer states |
| Mode × corpus chip colors                              | REC-13, REC-17         | §5.11, §9        |
| Refusal ≠ error styling                                | REC-10                 | §4               |
| Reading measure + mono/code treatment                  | REC-11, CITE-20        | §8               |
| Logical spacing                                        | architecture §8        | §8               |
| Reduced-motion tokens                                  | REC-05, REC-11, REC-19 | §8               |
| Direction single-source                                | REC-19                 | §8, ADR-0003     |

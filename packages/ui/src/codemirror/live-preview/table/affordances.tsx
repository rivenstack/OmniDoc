"use client";

/**
 * The table's hover affordances (F-15 Task 3.3 Rev 2, plan Task D.1).
 *
 * `@user` directed this block on 2026-10-16 (B-4; screenshot S3) and amended it
 * on 2026-10-23: there are **two** affordances, and neither is a circular
 * button. Each is a **full-size ghost strip** that hugs one edge of the table
 * and is invisible until the pointer (or keyboard focus) is on *that strip*:
 *
 * - the **column** strip is a full-height sliver immediately outside the
 *   table's inline-end edge, with a centred `+` and the tooltip
 *   "Add column to the right";
 * - the **row** strip is a full-width sliver immediately below the table, with
 *   a centred `+` and the tooltip "Add row below".
 *
 * The table itself reveals nothing: moving across cells must not pop controls
 * into existence. Because a strip occupies its own edge band, it can still be
 * hovered while invisible — that is what makes the reveal possible without a
 * table-wide hover state. Both strips are always mounted (when the note is
 * editable), stay in the tab order, and announce themselves with an
 * `aria-label`; `data-visible` is the structural contract the suite asserts and
 * the styling hook.
 *
 * The row `+` overrides the plan's §9 out-of-scope line for that control: it is
 * now `@user`-directed, and it is recorded as directed — never a parity claim.
 *
 * Task D.2 adds a third affordance that is not a strip: the **column grip**
 * ({@link ColumnGrip}). One grip is mounted per column, each revealing only
 * itself — `@user` (2026-10-24) required the D.1 reveal model here too.
 *
 * ## Why `mousedown` + `preventDefault`
 *
 * A strip sits next to a table whose cells are independent editing hosts. A
 * plain press would move focus out of the cell, the cell's `focusout` would
 * commit the table, and the write would **rebuild the widget under the
 * pointer** — the click would then land on a brand-new DOM node (the failure
 * mode the old toolbar had). So the press is cancelled before the browser moves
 * focus (`mousedown` + `preventDefault`, the same press the tail strip under
 * the table uses), and the action itself hangs off `click`:
 *
 * - a mouse press cancels focus transfer, then the click runs the command;
 * - a keyboard press runs the command from `keydown` and cancels the browser's
 *   own activation, so a single press is exactly one append.
 *
 * ## Why the tooltip is the project one
 *
 * `Tooltip` / `TooltipTrigger` / `TooltipContent` are Base UI (`tooltip.tsx`);
 * `TooltipTrigger` composes with the strip through its `render` prop, so the
 * trigger **is** the strip rather than a wrapper around it — the project's
 * `ToolbarButton` and `SidebarMenuButton` do the same. `side="bottom"` follows
 * the directed reference: the tooltip sits below the control. The tooltip text
 * is the strip's accessible name as well: an icon has no text of its own, and
 * the label is what a screen reader announces.
 */

import { IconGripHorizontal, IconPlus } from "@tabler/icons-react";
import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/tooltip";

/**
 * The column strip's tooltip text **and** accessible name.
 *
 * Exported so the suite can pin the exact string the plan (§4.3 / D.1) asks
 * for, and so a later menu item (D.3, "Add column to the right") can reuse the
 * wording instead of drifting from it.
 */
export const ADD_COLUMN_LABEL = "Add column to the right";

/** The row strip's tooltip text **and** accessible name. */
export const ADD_ROW_LABEL = "Add row below";

/**
 * What both strips share: the look, the reveal and the press discipline.
 *
 * No border, no shadow and no circular shell — the directed look is a ghost
 * strip that only shows a faint neutral wash (`--accent`, a neutral surface
 * role in this design system) under a centred glyph. Every colour and size is
 * an existing token/utility; no `tokens.css` entry is added.
 *
 * `opacity-0` rather than `hidden`/`pointer-events-none` is load-bearing: the
 * strip must keep its box so it can be hovered while invisible, and it must
 * keep its focusability so it can be reached from the keyboard.
 */
const STRIP_BASE =
  "cm-live-table-strip flex cursor-pointer items-center justify-center rounded-sm bg-transparent text-muted-foreground opacity-0 outline-none transition focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[visible=true]:bg-accent data-[visible=true]:opacity-100";

type AffordanceStripProps = {
  readonly label: string;
  /** Placement classes: which edge of the table the strip hugs. */
  readonly placement: string;
  /** Stable class for the suite and for styling (`cm-live-table-add-…`). */
  readonly testClass: string;
  readonly onActivate: () => void;
};

/**
 * One ghost strip: the shared reveal, press and keyboard behaviour.
 *
 * `visible` is per strip, so hovering or focusing the column strip cannot
 * reveal the row strip (or the other way round). Focus is part of it on
 * purpose: the strip is invisible but focusable, and a keyboard user who tabs
 * onto it must see what they are on.
 */
function AffordanceStrip({
  label,
  placement,
  testClass,
  onActivate,
}: AffordanceStripProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={`${STRIP_BASE} ${testClass} ${placement}`}
            aria-label={label}
            data-visible={visible ? "true" : "false"}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
            // See the module header: the press must not move focus, or the
            // commit it causes rebuilds the widget before the click arrives.
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={onActivate}
            onKeyDown={(event) => {
              // Run from the key and cancel the browser's own activation: a
              // plain `<button>` fires `click` on Enter/Space, so without the
              // `preventDefault` one key press would append two rows/columns.
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onActivate();
            }}
          >
            <IconPlus size={14} stroke={2} aria-hidden="true" />
          </button>
        }
      />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export type AddColumnAffordanceProps = {
  /** Append one empty column on the table's inline-end edge. */
  readonly onAddColumn: () => void;
};

/**
 * The column `+` (plan §4.3 S3, Task D.1).
 *
 * A full-height strip immediately *outside* the table's inline-end edge. The
 * grid's frame reserves the gutter it sits in (`pe-6` in `grid.tsx`), so the
 * strip is never clipped for a table as wide as the note; positioning is the
 * frame's, which hugs the table. `start-full` is the logical
 * `inset-inline-start: 100%`, so an RTL resolution flips the strip to the
 * other edge with the writing direction rather than needing a second rule.
 * `top-0 h-full` makes it exactly the table's block size: the strip's
 * containing block is the table's own wrapper, not the grid (which also spans
 * the row strip and the tail). The vertical axis has no direction-dependent
 * meaning, so those two stay physical.
 */
export function AddColumnAffordance({ onAddColumn }: AddColumnAffordanceProps) {
  return (
    <AffordanceStrip
      label={ADD_COLUMN_LABEL}
      testClass="cm-live-table-add-column"
      placement="absolute start-full top-0 h-full w-6"
      onActivate={onAddColumn}
    />
  );
}

/** The column grip's accessible name (plan §4.3, Task D.2). */
export const COLUMN_GRIP_LABEL = "Drag to reorder column";

export type ColumnGripProps = {
  /** The column the grip belongs to; `data-column` carries it to the suite. */
  readonly column: number;
  /**
   * Controlled reveal for a live drag: the grip of the **lifted source** column
   * is shown and every other one is hidden. `undefined` (no drag) hands the
   * reveal back to the grip's own hover/focus state.
   */
  readonly visible?: boolean;
  /**
   * How far the grip has travelled from the grab point, in px (positive = right,
   * D.2 `@user` 2026-10-25). Defined **only** while that grip is the one being
   * dragged: it is what makes the grip follow the pointer and what marks it as
   * the drag source (`data-drag-source`). `undefined` at rest, so a stationary
   * grip writes no inline style at all.
   */
  readonly offset?: number;
  readonly onPointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
};

/**
 * The six-dot column grip (S1; plan §4.3, Task D.2; `@user`-directed).
 *
 * A ghost control, like the D.1 strips: no shell, no shadow, just a centred
 * `IconGripHorizontal` (2 × 3 dots). `@user` reviewed the first cut on
 * 2026-10-24 and rejected hover-on-the-column revealing it ("the six-dot grip
 * must only appear when the pointer is exactly on it — the same model as the
 * D.1 `+` strips"). So one grip is mounted **per column**, invisible by default
 * but keeping its box and focusability, and it reveals **only itself** on its
 * own hover or keyboard focus — the same `opacity-0` +
 * `data-[visible=true]:opacity-100` contract as {@link AffordanceStrip}.
 * Hovering a cell or the table reveals nothing.
 *
 * `start-[calc(50%-0.75rem)]` centres the `w-6` grip on the column's centre
 * **without** a transform: half of 1.5rem is the grip's own width divided by
 * two, so the grip's inline-start sits exactly half a grip before the column's
 * centre. `start-…` is the **logical** `inset-inline-start`, so an RTL resolution
 * places the grip over the same column without a second rule. That matters more
 * now than it did for the old `-translate-x-1/2` version: the inline `transform`
 * below is the drag offset (physical px, `@user` 2026-10-25: "it should really
 * move with my pointer"), and a translation used for *centring* would fight it —
 * the grip would jump half its width when the drag began. The grip sits in the
 * block gutter the grid reserves above the table (see `grid.tsx`), so it is above
 * the column's top edge rather than clipping against the widget's scroll box.
 *
 * The grip is **CSS-anchored inside its own header cell** (`inset-inline-start:
 * 50%` of that cell, `-top-5` into the grid's `pt-5` gutter), not placed from a
 * JavaScript measurement. A `getBoundingClientRect()` pass ran before the nested
 * cell editors mounted and saw only each header's `min-inline-size` floor, so
 * every grip was misaligned; and no re-measure followed a column widening as
 * the user typed. Anchoring it in the cell means it can never desync from its
 * column (`@user`, 2026-10-25: "The position of the grips are not aligned
 * correctly with the columns").
 *
 * The offset is an inline `transform` because it changes on every
 * `pointermove`: a CSS transition on it would make the grip lag the pointer
 * instead of following it, so `theme.ts` restricts the drag source's transition
 * to the non-position properties and lifts it with a shadow.
 *
 * `mousedown` is cancelled for the same reason the D.1 strips cancel it: a press
 * must not blur the cell that holds uncommitted text, or the commit would
 * rebuild the widget under the pointer before the pointerdown handler sees it.
 * The press is also **stopped** here: the grip now lives inside a
 * `[data-row][data-col]` cell, and without `stopPropagation` the grid's
 * range-drag `mousedown` would read the grip press as a press on the cell.
 * The drag itself starts on `pointerdown` and is owned by the grid (document
 * listeners, Escape/pointercancel aborts).
 */
export function ColumnGrip({
  column,
  visible,
  offset,
  onPointerDown,
}: ColumnGripProps) {
  const [hovered, setHovered] = React.useState(false);
  // A live drag owns the reveal; otherwise the grip reveals itself.
  const shown = visible ?? hovered;
  const dragging = offset !== undefined;

  return (
    <button
      type="button"
      className="cm-live-table-column-grip absolute -top-5 start-[calc(50%-0.75rem)] z-10 flex h-5 w-6 cursor-grab items-center justify-center rounded-sm bg-transparent text-muted-foreground opacity-0 outline-none transition hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing data-[visible=true]:opacity-100"
      aria-label={COLUMN_GRIP_LABEL}
      data-column={column}
      data-slot="column-grip"
      data-visible={shown ? "true" : "false"}
      data-drag-source={dragging ? "true" : undefined}
      // Physical px on purpose: the grip must track the pointer, including under
      // an RTL resolution, where "right" is not the inline end.
      style={dragging ? { transform: `translateX(${offset}px)` } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onMouseDown={(event) => {
        event.preventDefault();
        // The grip is inside the header cell now, so its own press must not
        // reach the grid's range-drag handler (grid.tsx also guards by class).
        event.stopPropagation();
      }}
      onPointerDown={onPointerDown}
    >
      <IconGripHorizontal size={14} stroke={2} aria-hidden="true" />
    </button>
  );
}

export type AddRowAffordanceProps = {
  /** Append one empty body row below the table's last row. */
  readonly onAddRow: () => void;
};

/**
 * The row `+` (`@user`-directed, 2026-10-23; not a parity claim).
 *
 * A full-width strip immediately below the table, inside the grid's frame, so
 * its width is exactly the table's inline size — not the grid's, which also
 * carries the column gutter. The C.2 tail strip stays *below* this one, so
 * clicking under the table still places the caret after the table.
 */
export function AddRowAffordance({ onAddRow }: AddRowAffordanceProps) {
  return (
    <AffordanceStrip
      label={ADD_ROW_LABEL}
      testClass="cm-live-table-add-row"
      placement="h-6 w-full"
      onActivate={onAddRow}
    />
  );
}

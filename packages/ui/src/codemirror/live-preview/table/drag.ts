/**
 * Column drag-and-drop's pure core (F-15 Task 3.3 Rev 2, plan Task D.2).
 *
 * The grip (S1) is a pointer affordance, but *where a drag lands* is arithmetic
 * over column indices, not a view question. Keeping it here means:
 *
 * - every boundary case — dragging left, dragging right, clamping at the first
 *   and last column, dropping on the column you lifted — is a plain unit test
 *   with no DOM; and
 * - the grid (`grid.tsx`) only has to answer "which column is under the
 *   pointer?" and hand the answer to {@link dropIndex}.
 *
 * ## `from` and `to` are final indices
 *
 * The drop target is the **final** column index, not a gap index: dragging
 * column `0` across columns `1` and `2` lands it at `2`, which is exactly the
 * `moveColumn(model, from, to)` contract (`model.ts`). The alignment travels
 * with the column because it is a property of the column, not of its position —
 * the drag never has to say anything about it.
 *
 * ## The grip follows the pointer; the columns do not move
 *
 * `@user`-directed, 2026-10-25: "make it animated when I'm dragging a column, it
 * should really move with my pointer". The reference is Obsidian 1.14.4's
 * `createDragHandle(cell, "col")` (extracted bundle): its `requestAnimationFrame`
 * loop moves the **handle itself** along the inline axis, the **source** column
 * is selected (highlighted, not translated), and a separate target line marks
 * the edge the drop would land on. So a live drag carries three facts:
 *
 * - {@link ColumnDragState.from} — the lifted **source** column, which is the
 *   one painted as lifted;
 * - {@link ColumnDragState.to} — the final index the drop would use; and
 * - {@link ColumnDragState.offset} — how far the grip has travelled, which is
 *   presentation only (it never reaches the model).
 *
 * {@link dropIndicator} is the pure part of the target line: where, in inline
 * coordinates, it sits for a given `from`/`to`.
 *
 * ## Not a parity claim
 *
 * S1/S2 are `@user`-directed captures (plan §1/§2). The behaviour below is what
 * the plan asks for; the look is a visual-pass item (§11-7).
 */

/**
 * The shape of a live column drag, mirrored in the grid's state.
 *
 * `pointerId` is only used to tell drags apart in a future multi-pointer case;
 * this implementation tracks one drag at a time (the S1 capture shows one grip
 * and one lift). `from` is the column that was lifted and stays fixed for the
 * whole drag; `to` is where it would land if the pointer were released now.
 *
 * `offset` is the grip's travel from the grab point in **physical** px
 * (positive = right): the grip follows the pointer 1:1, so this is measured from
 * `clientX`, not from the inline-start edge. It is view state — `dropIndex` and
 * `dragTo` never read it.
 */
export type ColumnDragState = {
  readonly pointerId: number;
  readonly from: number;
  readonly to: number;
  readonly offset: number;
};

/** One column's horizontal extent, in the pointer's own coordinate space. */
export type ColumnSpan = {
  readonly start: number;
  readonly end: number;
};

/**
 * Where a drag from `from` lands, or `null` when nothing would move.
 *
 * A drop on the column that was lifted is a **no-op**, not a commit of an
 * unchanged model: the widget would otherwise rebuild the table for a drag that
 * changed nothing (and burn the caret's position doing it). Out-of-range targets
 * clamp to the nearest real column so dragging past either edge still lands on
 * the first/last column, the way a table's own inline bounds do.
 *
 * Returns `null` for an invalid source (no such column) or a non-integer index:
 * the caller has a stale model and must not reorder anything.
 */
export function dropIndex(
  from: number,
  over: number,
  count: number,
): number | null {
  if (!Number.isInteger(from) || !Number.isInteger(over)) return null;
  if (count <= 0 || from < 0 || from >= count) return null;
  const target = Math.min(Math.max(over, 0), count - 1);
  return target === from ? null : target;
}

/**
 * Advance a live drag to `over`, clamping to the table and keeping `state`
 * referentially stable when the target did not change.
 *
 * Returning the same object for an unchanged move is what lets the grid call
 * this on every `pointermove` without re-rendering on pointer jitter.
 */
export function dragTo(
  state: ColumnDragState,
  over: number,
  count: number,
): ColumnDragState {
  if (count <= 0 || !Number.isFinite(over)) return state;
  const to = Math.min(Math.max(Math.trunc(over), 0), count - 1);
  return to === state.to ? state : { ...state, to };
}

/**
 * Move the grip by `offset` px, with the same identity contract as
 * {@link dragTo}.
 *
 * The grip is dragged 1:1, so a `pointermove` that did not move the pointer
 * (or one carrying a broken `clientX`) must not re-render the grid. A
 * non-finite offset is rejected rather than written: `translateX(NaN)` would
 * drop the grip's `transform` entirely and it would snap back to its column
 * while the drag is still live.
 */
export function dragOffset(
  state: ColumnDragState,
  offset: number,
): ColumnDragState {
  if (!Number.isFinite(offset)) return state;
  return offset === state.offset ? state : { ...state, offset };
}

/**
 * The target line's position for a drag from `from` to `to`, or `null` when
 * there is nothing to mark.
 *
 * Obsidian draws the line on the edge the column would **cross** into — the
 * target's inline-end edge when moving towards the end, its inline-start edge
 * when moving towards the start — and draws nothing over the source column.
 * `spans` are in **inline coordinates in ascending order, indexed by column**:
 * an RTL caller measures from its inline-start (physical right) edge and reverses
 * its list, exactly as `grid.tsx` does, so this function stays direction-
 * agnostic like {@link columnAtOffset}.
 *
 * `null` for an empty table, a non-integer or out-of-range index (a stale
 * model), and for `to === from` (the no-op drag).
 */
export function dropIndicator(
  spans: readonly ColumnSpan[],
  from: number,
  to: number,
): { edge: "start" | "end"; inlineStart: number } | null {
  if (spans.length === 0) return null;
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  if (from < 0 || from >= spans.length) return null;
  if (to < 0 || to >= spans.length) return null;
  if (to === from) return null;
  return to < from
    ? { edge: "start", inlineStart: spans[to].start }
    : { edge: "end", inlineStart: spans[to].end };
}

/**
 * The column whose horizontal span contains `offset`.
 *
 * The spans are passed in **visual order** (ascending inline offset), which is
 * the order `getBoundingClientRect` returns them in for an LTR table; an RTL
 * caller reverses its list (and maps the answer back) rather than teaching this
 * function about writing direction. A pointer outside the table clamps to the
 * nearest column, so dragging past the last column still means "move it to the
 * end". `null` only when there is nothing to measure.
 */
export function columnAtOffset(
  spans: readonly ColumnSpan[],
  offset: number,
): number | null {
  if (spans.length === 0 || !Number.isFinite(offset)) return null;
  if (offset < spans[0].start) return 0;
  for (let index = 0; index < spans.length; index += 1) {
    if (offset <= spans[index].end) return index;
  }
  return spans.length - 1;
}

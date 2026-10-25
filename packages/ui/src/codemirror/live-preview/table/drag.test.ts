// Column drag-and-drop's pure core — F-15 Task 3.3 Rev 2, plan Task D.2.
//
// The DOM flow (grip, lift, drop, abort) lives in `drag.test.tsx`; this file
// pins the arithmetic those handlers delegate to. Every case is a plain number:
// dragging across column boundaries, clamping at the table's edges, the
// same-column no-op that keeps a drag from committing an unchanged model, the
// grip's travel offset (`@user` 2026-10-25: the grip follows the pointer), and
// the drop line's edge.

import { describe, expect, it } from "vitest";
import {
  columnAtOffset,
  dragOffset,
  dragTo,
  dropIndex,
  dropIndicator,
  type ColumnDragState,
} from "./drag";

function drag(from: number, to: number, offset = 0): ColumnDragState {
  return { pointerId: 0, from, to, offset };
}

describe("D.2: dropIndex", () => {
  it("D.2: dragging right lands on the column under the pointer", () => {
    expect(dropIndex(0, 2, 3)).toBe(2);
    expect(dropIndex(0, 1, 3)).toBe(1);
    expect(dropIndex(1, 2, 3)).toBe(2);
  });

  it("D.2: dragging left lands on the column under the pointer", () => {
    expect(dropIndex(2, 0, 3)).toBe(0);
    expect(dropIndex(2, 1, 3)).toBe(1);
  });

  it("D.2: dropping on the lifted column is a no-op", () => {
    expect(dropIndex(1, 1, 3)).toBeNull();
  });

  it("D.2: a drop past either edge clamps to the first/last column", () => {
    expect(dropIndex(1, 9, 3)).toBe(2);
    expect(dropIndex(1, -4, 3)).toBe(0);
  });

  it("D.2: a stale source column or empty table yields no target", () => {
    expect(dropIndex(3, 0, 3)).toBeNull();
    expect(dropIndex(-1, 0, 3)).toBeNull();
    expect(dropIndex(0, 0, 0)).toBeNull();
    expect(dropIndex(0.5, 1, 3)).toBeNull();
    expect(dropIndex(0, 1.5, 3)).toBeNull();
  });
});

describe("D.2: dragTo", () => {
  it("D.2: an unchanged target keeps the state object (no re-render)", () => {
    const state = drag(1, 1);
    expect(dragTo(state, 1, 3)).toBe(state);
    // Clamping to the same column is also unchanged.
    const clamped = drag(1, 2);
    expect(dragTo(clamped, 9, 3)).toBe(clamped);
  });

  it("D.2: a new target advances the drag and clamps", () => {
    const state = drag(0, 0);
    expect(dragTo(state, 2, 3)).toEqual({
      pointerId: 0,
      from: 0,
      to: 2,
      offset: 0,
    });
    expect(dragTo(state, 9, 3).to).toBe(2);
    expect(dragTo(state, -9, 3).to).toBe(0);
    // A stale table (no columns) leaves the drag where it was.
    expect(dragTo(state, 2, 0)).toBe(state);
    // Non-finite pointer arithmetic never moves the drag.
    expect(dragTo(state, Number.NaN, 3)).toBe(state);
  });
});

describe("D.2: dragOffset", () => {
  it("D.2: moves the grip's offset by the pointer's travel", () => {
    const state = drag(0, 0);
    expect(dragOffset(state, 120)).toEqual({
      pointerId: 0,
      from: 0,
      to: 0,
      offset: 120,
    });
    // Negative is travel towards the inline start; the sign is the pointer's.
    expect(dragOffset(state, -40).offset).toBe(-40);
    // A second move is measured from the same grab point, not accumulated.
    expect(dragOffset(drag(0, 2, 120), 200).offset).toBe(200);
  });

  it("D.2: an unchanged offset keeps the state object (no re-render)", () => {
    const state = drag(1, 2, 64);
    expect(dragOffset(state, 64)).toBe(state);
  });

  it("D.2: a non-finite offset never touches the state", () => {
    const state = drag(1, 2, 64);
    expect(dragOffset(state, Number.NaN)).toBe(state);
    expect(dragOffset(state, Number.POSITIVE_INFINITY)).toBe(state);
    expect(dragOffset(state, Number.NEGATIVE_INFINITY)).toBe(state);
  });
});

describe("D.2: dropIndicator", () => {
  // Deliberately uneven: a computed "one third of the table" would pass on
  // equal widths and be wrong on every real table.
  const spans = [
    { start: 0, end: 40 },
    { start: 40, end: 100 },
    { start: 100, end: 180 },
  ];

  it("D.2: dragging right marks the target's inline-end edge", () => {
    expect(dropIndicator(spans, 0, 2)).toEqual({
      edge: "end",
      inlineStart: 180,
    });
    expect(dropIndicator(spans, 0, 1)).toEqual({
      edge: "end",
      inlineStart: 100,
    });
  });

  it("D.2: dragging left marks the target's inline-start edge", () => {
    expect(dropIndicator(spans, 2, 0)).toEqual({
      edge: "start",
      inlineStart: 0,
    });
    expect(dropIndicator(spans, 2, 1)).toEqual({
      edge: "start",
      inlineStart: 40,
    });
  });

  it("D.2: a drop on the source column has no line", () => {
    expect(dropIndicator(spans, 1, 1)).toBeNull();
  });

  it("D.2: a stale index or an empty table has no line", () => {
    expect(dropIndicator([], 0, 1)).toBeNull();
    expect(dropIndicator(spans, 0, 3)).toBeNull();
    expect(dropIndicator(spans, -1, 1)).toBeNull();
    expect(dropIndicator(spans, 3, 0)).toBeNull();
    expect(dropIndicator(spans, 0.5, 1)).toBeNull();
  });
});

describe("D.2: columnAtOffset", () => {
  const spans = [
    { start: 0, end: 50 },
    { start: 50, end: 100 },
    { start: 100, end: 150 },
  ];

  it("D.2: maps an offset inside a column to that column", () => {
    expect(columnAtOffset(spans, 10)).toBe(0);
    expect(columnAtOffset(spans, 60)).toBe(1);
    expect(columnAtOffset(spans, 150)).toBe(2);
  });

  it("D.2: clamps outside the table to the nearest edge column", () => {
    expect(columnAtOffset(spans, -20)).toBe(0);
    expect(columnAtOffset(spans, 400)).toBe(2);
    expect(columnAtOffset(spans, 75)).toBe(1);
  });

  it("D.2: no spans or a non-finite offset has no answer", () => {
    expect(columnAtOffset([], 10)).toBeNull();
    expect(columnAtOffset(spans, Number.NaN)).toBeNull();
    expect(columnAtOffset(spans, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

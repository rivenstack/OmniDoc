// The table store's range state — F-15 Task 3.3 Rev 2, plan Task C.4.
//
// The store is the grid's single snapshot (`useSyncExternalStore`), so its
// identity rules are not style: a fresh object on every read makes React loop,
// and a needless change re-renders every cell editor on a pointer move.
//
// The `@user`-directed behaviour here (B-7/S5, 2026-10-16) is recorded as
// directed, never as a parity claim: a drag selects a rectangle, and a commit
// (which rebuilds the widget) ends it.

import { describe, expect, it } from "vitest";
import type { TableModel } from "./model";
import type { TableCellRange } from "./selection";
import { TableStore } from "./store";

const MODEL: TableModel = {
  headers: ["a", "b"],
  alignments: ["left", "left"],
  rows: [["c", "d"]],
};

function range(
  anchor: { row: number; col: number },
  focus: { row: number; col: number },
): TableCellRange {
  return { anchor, focus };
}

describe("the store's cell range (B-7, S5; @user 2026-10-16)", () => {
  it("B-7: starts with no range and no active cell", () => {
    const store = new TableStore(MODEL);

    expect(store.get().range).toBeNull();
    expect(store.get().active).toBeNull();
  });

  it("B-7: setRange stores the value and notifies once per real change", () => {
    const store = new TableStore(MODEL);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    const next = range({ row: 0, col: 0 }, { row: 1, col: 1 });
    store.setRange(next);
    expect(store.get().range).toBe(next);
    expect(calls).toBe(1);

    // The same **value** is a no-op even when the object is fresh: a pointer
    // move that stayed inside a cell would otherwise churn every cell.
    store.setRange(range({ row: 0, col: 0 }, { row: 1, col: 1 }));
    expect(calls).toBe(1);
    expect(store.get().range).toBe(next);

    // The same object is trivially a no-op.
    store.setRange(next);
    expect(calls).toBe(1);
  });

  it("B-7: setRange(null) clears, and a second null is a no-op", () => {
    const store = new TableStore(MODEL);
    store.setRange(range({ row: 0, col: 0 }, { row: 1, col: 1 }));

    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    store.setRange(null);
    expect(store.get().range).toBeNull();
    expect(calls).toBe(1);

    store.setRange(null);
    expect(calls).toBe(1);
  });

  it("B-7: setting a range keeps the active cell (S5's anchor caret)", () => {
    const store = new TableStore(MODEL);
    store.setActive({ row: 0, col: 1 });

    store.setRange(range({ row: 0, col: 1 }, { row: 1, col: 0 }));
    expect(store.get().active).toEqual({ row: 0, col: 1 });
  });

  it("B-7: a model change drops the range, including one that no longer fits", () => {
    const store = new TableStore(MODEL);
    store.setRange(range({ row: 0, col: 0 }, { row: 1, col: 1 }));

    store.setModel({
      headers: ["a", "b"],
      alignments: ["left", "left"],
      rows: [["c", "d"], ["e", "f"]],
    });

    expect(store.get().range).toBeNull();
  });

  it("B-7: replacing the model with the same object keeps the range", () => {
    const store = new TableStore(MODEL);
    store.setRange(range({ row: 0, col: 0 }, { row: 1, col: 1 }));

    store.setModel(MODEL);

    // No model change means no commit — a flush that collected nothing must
    // not clear a selection the user is still making.
    expect(store.get().range).not.toBeNull();
  });
});

/**
 * The live preview's table support (F-15 Task 3.3 Rev 2 — table rebuild).
 *
 * The table is a block widget over a per-cell model, and this module is its
 * public surface:
 *
 * - `scan.ts` — find the table blocks, complete a typed delimiter row, install the
 *   block decorations.
 * - `model.ts` — the decoded-cell codec and every pure structural operation.
 * - `editor.ts` — one nested CodeMirror editor per cell.
 * - `store.ts` / `grid.tsx` — the widget's state and the React grid.
 * - `widget.ts` — the block widget, the event isolation and the one document write.
 *
 * `interaction.ts` and `tools.ts` — the `contenteditable`-cell model and its
 * toolbar — were **replaced** by the per-cell editors and the grid (plan §1
 * decision B-8: rewrite, not patch). The names below are the ones callers
 * (`live-preview/index.ts`, `codemirror/index.ts`, `callout/commands.ts`) import,
 * so the rebuild is invisible to them.
 */

export {
  TABLE_COMPLETE_MS,
  fenceChar,
  findTableBlocks,
  tableLivePreview,
} from "./scan";
export { TABLE_IDLE_FLUSH_MS } from "./editor";
export type { TableCellRef } from "./model";
export { TablePreviewWidget } from "./widget";
export {
  parseMarkdownTable,
  serializeMarkdownTable,
} from "../../../markdown/table";

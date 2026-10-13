/**
 * The live preview's table support (F-15 Rev 2, Task 1.4).
 *
 * The table half of the old 1,722-line `markdown-live-preview.ts` module, split
 * into its parts with no logic change:
 *
 * - `scan.ts` — find the table blocks, complete a typed delimiter row, install
 *   the block decorations.
 * - `widget.ts` — the block widget CodeMirror renders in place of the source.
 * - `interaction.ts` — the editable model behind that widget.
 * - `tools.ts` — cell rendering and the helper toolbar.
 *
 * The public names are unchanged so the split is invisible to callers.
 */

export { TABLE_COMPLETE_MS, fenceChar, findTableBlocks, tableLivePreview } from "./scan";
export { TABLE_IDLE_FLUSH_MS, TableInteraction } from "./interaction";
export type { TableCellRef } from "./interaction";
export { TablePreviewWidget } from "./widget";
export { TABLE_TOOL_ICONS, renderCellMarkdown, tableToolButton } from "./tools";
export { parseMarkdownTable, serializeMarkdownTable } from "../../../markdown/table";

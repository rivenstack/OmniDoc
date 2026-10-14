/**
 * Fenced code blocks in Live Preview (F-15 Rev 2, plan Task 3.1).
 *
 * Two catalogue entries meet here:
 *
 * - `OBS-1.14.4-REVEAL-009` — the opener pattern ({@link FENCE_PATTERN},
 *   re-exported from `fence.ts`).
 * - `OBS-1.14.4-FOLD-004` — the phrase table maps "folded code" to the **empty
 *   string**, so a collapsed code block renders no placeholder text.
 *
 * ## How "whole-block" is realised — a recorded deviation
 *
 * The artifact renders a fenced block as a single **block widget** and swaps in
 * the raw source when the caret touches it. OmniDoc deliberately does **not**
 * replace the block: a replacement widget hides the source from the editable
 * document, so the code would no longer be editable in place and the F-13/F-14
 * regression net (`cm-editor.test.tsx` pins three `.cm-live-code-block` lines
 * and asserts no ```` ``` ```` text) would break.
 *
 * Instead the block keeps its editable, line-decorated rendering and the
 * *reveal granularity* is made whole-block: the fence tokens unfold over the
 * `FencedCode` node's own range (opener start → closer end) rather than over
 * their own lines. That is exactly `OBS-1.14.4-REVEAL-011`'s accumulated span —
 * a construct whose tokens are separate reveals as one unit — so a caret
 * anywhere inside the block shows the whole raw source, and a caret outside it
 * folds the fences away. The deviation (widget vs. reveal span) is recorded in
 * the lane handoff.
 *
 * `FOLD-004`'s fold *service* is Task 5.4; the phrase it consumes is pinned here
 * so the preview can never grow a placeholder of its own in the meantime.
 */

import type { Span } from "../taxonomy";

export { FENCE_PATTERN, parseFence } from "./fence";
export type { Fence, FenceChar } from "./fence";

/**
 * The artifact's folded-code phrase (`OBS-1.14.4-FOLD-004`).
 *
 * Deliberately the empty string: a collapsed code block shows the block chrome
 * and **no** running text, which is why the rendered block in `index.test.ts`
 * has to contain no placeholder at all.
 */
export const CODE_BLOCK_FOLD_PHRASE = "";

/**
 * The span a fenced block reveals as a unit (`OBS-1.14.4-REVEAL-011`).
 *
 * The `FencedCode` node already spans opening fence → closing fence, so its own
 * range *is* the accumulated span. `null` in, `null` out, so the decoration walk
 * can chain it: `codeBlockRevealSpan(ancestorOf(["FencedCode"]))`.
 */
export function codeBlockRevealSpan(block: Span | null): Span | null {
  return block ? { from: block.from, to: block.to } : null;
}

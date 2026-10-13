/**
 * The editor's keymap (F-15 Rev 2, Task 1.5).
 *
 * One place builds the editor's bindings, so Task 6.2 can replace the set with
 * the artifact-parity binding list without touching the extension factory. The
 * extension factory puts the result in the `keymap` compartment, which is what
 * makes a swap a reconfiguration rather than a rebuild.
 */

import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import type { Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

/**
 * The curated binding set.
 *
 * `Escape` blurring the editor is the surface's own behaviour (leaving the
 * field on Escape), kept as the last binding so a future `Escape` binding can
 * take precedence.
 *
 * Task 6.2 replaces the contents with the artifact-parity set: exactly one
 * curated keymap, with the seven filtered bindings removed and the stock
 * `standardKeymap` / `indentWithTab` / `closeBracketsKeymap` /
 * `completionKeymap` deliberately **not** installed (`CMD-005`).
 */
export function keymapExtensions(): Extension {
  return keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    {
      key: "Escape",
      run: (view: EditorView) => {
        view.dom.blur();
        return true;
      },
    },
  ]);
}

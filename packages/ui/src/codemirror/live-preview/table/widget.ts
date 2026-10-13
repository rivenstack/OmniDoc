/**
 * The table block widget (F-15 Rev 2, Task 1.4).
 *
 * Moved verbatim out of `markdown-live-preview.ts` — a pure move, no logic
 * change.
 */

import { EditorView, WidgetType } from "@codemirror/view";
import { parseMarkdownTable } from "../../../markdown/table";
import { TableInteraction } from "./interaction";

export class TablePreviewWidget extends WidgetType {
  private interaction: TableInteraction | null = null;

  constructor(
    private readonly markdown: string,
    private readonly from: number,
    private readonly to: number,
    /**
     * Part of the widget's *identity*, not just its rendering.
     *
     * Locking a note replaces the editor's editable facet, and the cells set
     * `contentEditable` on themselves — explicitly, which outranks a
     * non-editable ancestor. So if CM considered a locked table's widget equal
     * to the unlocked one it would keep the old DOM, and its cells stayed
     * typable after the lock until some unrelated change rebuilt the table.
     */
    private readonly editable: boolean,
  ) {
    super();
  }

  eq(other: TablePreviewWidget) {
    return (
      other.markdown === this.markdown &&
      other.from === this.from &&
      other.to === this.to &&
      other.editable === this.editable
    );
  }

  ignoreEvent() {
    return true;
  }

  destroy() {
    this.interaction?.destroy();
    this.interaction = null;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-live-table-wrapper tableWrapper";
    // A wide table must stay scrollable by keyboard, which needs the scroll
    // container itself to be focusable (`ui-qa-checklist.md` §6.4).
    wrapper.tabIndex = 0;
    wrapper.dataset.tableFrom = String(this.from);
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", "Table");

    const parsed = parseMarkdownTable(this.markdown);
    if (!parsed) {
      wrapper.textContent = this.markdown;
      return wrapper;
    }

    const interaction = new TableInteraction(
      view,
      wrapper,
      this.markdown,
      parsed,
      this.from,
      this.to,
      this.editable,
    );
    this.interaction = interaction;
    interaction.mount();
    return wrapper;
  }
}

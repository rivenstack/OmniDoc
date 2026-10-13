/**
 * Table rendering and toolbar helpers (F-15 Rev 2, Task 1.4).
 *
 * Moved verbatim out of `markdown-live-preview.ts` — a pure move, no logic
 * change. `renderCellMarkdown` draws a cell's inline markdown; the rest builds
 * the table's helper toolbar.
 */

import { unescapeTableCell } from "../../../markdown/table";

/**
 * Render a cell's inline markdown into `container`.
 *
 * This is a **renderer only**. A cell's *source text* is the source of truth —
 * that is what the user edits and what gets serialized — so nothing here is
 * ever read back out of the DOM. That is what makes a cell holding `a \| b` or
 * `` `a|b` `` round-trip without loss: the previous implementation rebuilt the
 * source from the rendered nodes, and a rendered `<strong>` cannot represent
 * the escapes or the nesting its source had.
 *
 * Best-effort and deliberately narrow: `**bold**`, `*italic*`, `~~strike~~`,
 * `` `code` `` and `[label](target)`. Anything else stays literal text, which is
 * what a reader would expect from a typo anyway.
 */
export function renderCellMarkdown(
  source: string,
  container: HTMLElement,
): void {
  const text = unescapeTableCell(source);
  const pattern =
    /(`+[^`]*`+|\[[^\]]*\]\([^)\s]*\)|\*\*[\s\S]+?\*\*|~~[\s\S]+?~~|\*[^*\n]+?\*)/g;

  const append = (node: Node) => container.appendChild(node);

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      append(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const token = match[0];
    let node: HTMLElement | null = null;

    if (token.startsWith("`") && token.endsWith("`")) {
      node = document.createElement("code");
      node.className = "cm-live-code";
      node.textContent = token.replace(/^`+|`+$/g, "");
    } else if (token.startsWith("**") && token.endsWith("**")) {
      node = document.createElement("strong");
      node.className = "cm-live-strong";
      node.textContent = token.slice(2, -2);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      node = document.createElement("del");
      node.className = "cm-live-strike";
      node.textContent = token.slice(2, -2);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      node = document.createElement("em");
      node.className = "cm-live-em";
      node.textContent = token.slice(1, -1);
    } else if (token.startsWith("[") && token.includes("](")) {
      const split = token.indexOf("](");
      const target = token.slice(split + 2, -1);
      // Only targets a browser can act on. The note body is user content, and
      // a `javascript:` target is the one scheme that would run on a click.
      if (/^(https?:|mailto:|\/|#|\.)/i.test(target)) {
        const link = document.createElement("a");
        link.className = "cm-live-link";
        link.setAttribute("href", target);
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
        link.textContent = token.slice(1, split);
        node = link;
      }
    }

    append(node ?? document.createTextNode(token));
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    append(document.createTextNode(text.slice(lastIndex)));
  }
}

/** Stroke-only 16×16 icons for the table's helper toolbar. */
export const TABLE_TOOL_ICONS = {
  rowBefore: "M3 3h10M8 13.5v-7M5 9.5 8 6.5l3 3",
  rowAfter: "M3 13h10M8 2.5v7M5 6.5 8 9.5l3-3",
  rowRemove: "M3 3.5h10M3 8h10M3 12.5h10",
  colBefore: "M3.5 3v10M13.5 8h-7M9.5 5 6.5 8l3 3",
  colAfter: "M12.5 3v10M2.5 8h7M6.5 5 9.5 8l-3 3",
  colRemove: "M4 4l8 8M12 4l-8 8M8 2.5v11",
  tableRemove: "M3 5h10M6.5 5V3h3v2M4.5 5l.7 8h5.6l.7-8",
} as const;

/**
 * One toolbar control.
 *
 * Pressing it must not blur the cell being edited: the button lives inside the
 * widget, and the commit a blur triggers would rebuild that widget under the
 * pointer, so the button's `click` would never arrive. `mousedown` with
 * `preventDefault` is therefore the trigger, with a `keydown` twin for keyboard
 * users.
 */
export function tableToolButton(
  label: string,
  path: string,
  onRun: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-live-table-tool";
  button.setAttribute("aria-label", label);
  button.title = label;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "path");
  icon.setAttribute("d", path);
  icon.setAttribute("fill", "none");
  svg.appendChild(icon);
  button.appendChild(svg);

  const run = (event: Event) => {
    event.preventDefault();
    onRun();
  };
  button.addEventListener("mousedown", run);
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      run(event);
    }
  });

  return button;
}

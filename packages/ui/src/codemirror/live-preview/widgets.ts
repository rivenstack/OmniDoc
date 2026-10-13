/**
 * The live preview's marker and line decorations (F-15 Rev 2, Task 1.5).
 *
 * Moved verbatim out of `markdown-live-preview.ts` — a pure move, no logic
 * change. These are the decorations that *draw* something: the bullet, number
 * and checkbox glyphs that stand in for a folded marker, and the line
 * decorations for list items, quotes and fenced code.
 *
 * Task 2.8 added the one construct here that is **interactive**: the task
 * checkbox, which toggles the document on click. It is found by the artifact's
 * own predicate over the line's text rather than by a syntax node, because the
 * grammar models only two of the four characters the artifact accepts.
 */

import type { Text } from "@codemirror/state";
// `EditorView` is a value here, not only a type: the checkbox asks the running
// view whether the note is editable before it writes.
import { Decoration, EditorView, WidgetType } from "@codemirror/view";

/** A syntax-tree node's name and range. */
export type NodeRange = { name: string; from: number; to: number };

/**
 * A folded token: nothing is rendered in its place.
 *
 * One of the three empty replace singletons `OBS-1.14.4-REVEAL-004` describes.
 * Replace decorations are compared by identity when the range set is diffed, so
 * three distinct singletons let the builder tell three kinds of hidden range
 * apart while keeping that diff cheap. This is the *marker* kind — a line
 * marker folded away with no glyph in its place (a task item's bullet, a folded
 * comment delimiter).
 */
export const HIDDEN_MARKER = Decoration.replace({});

/**
 * A folded token that is drawn as a glyph. The doc text stays authoritative —
 * the widget is decoration, so it is hidden from assistive technology and
 * ignores pointer events (the line's own rules still handle clicks).
 */
class MarkerWidget extends WidgetType {
  constructor(
    private readonly className: string,
    private readonly text: string,
  ) {
    super();
  }

  eq(other: MarkerWidget) {
    return other.className === this.className && other.text === this.text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = this.className;
    span.textContent = this.text;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

const BULLET = Decoration.replace({
  widget: new MarkerWidget("cm-live-bullet", "•"),
});

/**
 * The task checkbox (`OBS-1.14.4-TASK-001`).
 *
 * ## The toggle is the parity surface
 *
 * Two things about the artifact's toggle are load-bearing and easy to "fix"
 * wrongly, so they are stated here rather than in a test title alone:
 *
 * 1. **It writes exactly one of two characters.** A space becomes a lower-case
 *    `x`; **anything else** becomes a space. So a task marked complete with a
 *    question mark or a dash loses that character on the first click — the
 *    original is never preserved (plan decision 4).
 * 2. **It moves nothing.** The click does not move the caret or the selection,
 *    and the transaction carries no user-event annotation.
 *
 * ## The look is OmniDoc's
 *
 * The artifact's widget is not copied: this is the project's own `Checkbox`
 * (`components/checkbox.tsx`) rebuilt in the preview's DOM — a bordered square
 * that fills with `--primary` and draws the Tabler check, at the same size,
 * radius and ring as the React primitive. Behaviour parity, OmniDoc skin
 * (plan §1 principle 3). The classes and their rules live in `theme.ts`.
 *
 * The element is a real `checkbox` to assistive technology — `role`,
 * `aria-checked` — because when the marker is folded the `[ ]` text it replaced
 * is not in the DOM any more, so the widget is the only thing left to describe
 * the state. It is deliberately **not** a tab stop (`tabindex="-1"`, the same
 * choice `OBS-1.14.4-REVEAL-005` makes for rendered link text): the editor's own
 * tab order is the document, and a keyboard user reaches this action through
 * the line-reveal (a caret anywhere on the line shows `[ ]` raw) and the Task 6
 * command surface.
 */
export class TaskCheckboxWidget extends WidgetType {
  constructor(
    /** The `[ ]` marker's range — the character between the brackets. */
    private readonly from: number,
    private readonly to: number,
    private readonly checked: boolean,
  ) {
    super();
  }

  eq(other: TaskCheckboxWidget) {
    return (
      other.from === this.from &&
      other.to === this.to &&
      other.checked === this.checked
    );
  }

  toDOM(view: EditorView) {
    const box = document.createElement("span");
    box.className = "cm-live-task";
    box.dataset.checked = String(this.checked);
    box.setAttribute("role", "checkbox");
    box.setAttribute("aria-checked", String(this.checked));
    box.setAttribute("aria-label", "Task");
    box.tabIndex = -1;

    const tick = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tick.setAttribute("class", "cm-live-task-tick");
    tick.setAttribute("viewBox", "0 0 24 24");
    tick.setAttribute("width", "14");
    tick.setAttribute("height", "14");
    tick.setAttribute("fill", "none");
    tick.setAttribute("stroke", "currentColor");
    tick.setAttribute("stroke-width", "3");
    tick.setAttribute("stroke-linecap", "round");
    tick.setAttribute("stroke-linejoin", "round");
    tick.setAttribute("aria-hidden", "true");
    // Tabler `IconCheck` — the icon library the design language uses (ADR-0003).
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M5 12l5 5l10 -10");
    tick.appendChild(path);
    box.appendChild(tick);

    // CodeMirror's own `mousedown` handler runs on the content DOM in the
    // bubble phase and would start a selection (and take focus), so the events
    // that make up a click stop here. The listeners are on the target itself,
    // so they run first.
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    box.addEventListener("mousedown", swallow);
    box.addEventListener("click", (event) => {
      swallow(event);
      this.toggle(view);
    });
    // `tabindex="-1"` means this is not a tab stop, but assistive technology and
    // script can still land on it, so the key gesture a checkbox owes its user
    // is honoured when that happens.
    box.addEventListener("keydown", (event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      swallow(event);
      this.toggle(view);
    });

    return box;
  }

  /** Handled above — CodeMirror must not treat the checkbox as text. */
  ignoreEvent() {
    return true;
  }

  /** Write exactly `x` or a space; leave the selection alone. */
  private toggle(view: EditorView) {
    // A locked note renders its tasks but must not accept a toggle.
    if (!view.state.facet(EditorView.editable)) return;
    const current = view.state.sliceDoc(this.from + 1, this.from + 2);
    const next = current === " " ? "x" : " ";
    view.dispatch({
      changes: { from: this.from + 1, to: this.from + 2, insert: next },
    });
  }
}

/**
 * The artifact's Live Preview task predicate (`OBS-1.14.4-TASK-001`).
 *
 * "A bracketed **single character** followed by whitespace", applied to a list
 * item's content. Case does not matter — and neither does the character:
 * `[x]`, `[X]`, `[-]` and `[?]` are all task items, which is why the artifact's
 * own documentation says "you can use any character inside the brackets to mark
 * it as complete". The GFM grammar only models `[ ]` / `[x]` / `[X]`, so this
 * predicate — not a syntax node — is what decides whether a checkbox is drawn.
 *
 * Capture groups: 1 = everything before the marker (indent, any quote markers,
 * the bullet and its spaces), 2 = the whole `[?]` marker, 3 = the character
 * inside it.
 */
export const TASK_MARKER_PATTERN = /^(\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+)(\[(.)\](?=\s))/;

/** One task marker found in the text. */
export type TaskMarkerSpan = {
  /** The `[` … `]` range. */
  readonly from: number;
  readonly to: number;
  /**
   * True unless the bracketed character is a space — the box is filled.
   *
   * The predicate is a *shape* test ("a bracketed single character"), so any
   * character counts as complete, which is why the artifact's documentation can
   * say "you can use any character inside the brackets".
   */
  readonly checked: boolean;
  /**
   * True only for `x` / `X`: the **strike-through** is narrower than the box.
   *
   * The artifact's two halves disagree here and both are reproduced: `[?]`
   * renders a filled box like `[x]` but is *not* struck through.
   */
  readonly done: boolean;
  /** The start of the line the item is on — the key the walk collects. */
  readonly lineFrom: number;
};

/**
 * Every task marker in `[from, to)` (`OBS-1.14.4-TASK-001`).
 *
 * Line-based, because the predicate is defined against a list item's content.
 *
 * This layer exists because the grammar reads `[?]` and `[-]` as **shortcut
 * reference links**, not as task markers (plan §7 risk D-5). The walk therefore
 * asks this scan first and suppresses the link interpretation inside a marker —
 * otherwise `[?]` would be underlined and its brackets folded as link syntax,
 * and the two replacements would overlap.
 */
export function scanTaskMarkers(
  doc: Text,
  from: number,
  to: number,
): TaskMarkerSpan[] {
  const markers: TaskMarkerSpan[] = [];
  const first = doc.lineAt(from).number;
  const last = doc.lineAt(to).number;

  for (let number = first; number <= last; number += 1) {
    const line = doc.line(number);
    const match = TASK_MARKER_PATTERN.exec(line.text);
    if (!match) continue;

    const prefix = match[1] ?? "";
    const marker = match[2] ?? "";
    const character = match[3] ?? " ";
    const markerFrom = line.from + prefix.length;
    const markerTo = markerFrom + marker.length;
    if (markerFrom < from || markerTo > to) continue;

    markers.push({
      from: markerFrom,
      to: markerTo,
      // A space is the only "not done" character; every other character —
      // including `-` and `?` — fills the box.
      checked: character !== " ",
      // …but only `x` strikes the text through.
      done: /[xX]/.test(character),
      lineFrom: line.from,
    });
  }

  return markers;
}

/** The checkbox for one scanned task marker, at the marker's own range. */
export function taskCheckbox(marker: TaskMarkerSpan): Decoration {
  return Decoration.replace({
    widget: new TaskCheckboxWidget(marker.from, marker.to, marker.checked),
  });
}
const RULE = Decoration.replace({ widget: new MarkerWidget("cm-live-hr", "") });
export { RULE };

/**
 * The blockquote border glyph (`OBS-1.14.4-REVEAL-007`).
 *
 * The artifact's border is a **widget** whose content is the literal `>` — a
 * real character produced by a decoration, not the document's own marker text.
 * It carries a transparency class because the glyph is not meant to be read:
 * what you see is the border the class draws in its place, so the rendered
 * result is visually identical to a styled `>` while the source range stays
 * owned by a decoration.
 */
const QUOTE_BORDER = Decoration.replace({
  widget: new MarkerWidget("cm-live-quote-border cm-live-transparent", ">"),
});
export { QUOTE_BORDER };

/** The literal glyph the quote-border widget draws (`REVEAL-007`). */
export const QUOTE_BORDER_GLYPH = ">";

/** Ordered markers repeat per item, so they are cached by their source text. */
const orderedMarkers = new Map<string, Decoration>();
function orderedMarker(text: string): Decoration {
  let marker = orderedMarkers.get(text);
  if (!marker) {
    marker = Decoration.replace({
      widget: new MarkerWidget("cm-live-ordered-mark", text),
    });
    orderedMarkers.set(text, marker);
  }
  return marker;
}

export const listItemLine = Decoration.line({ class: "cm-live-list-item" });
export const quoteLine = Decoration.line({ class: "cm-live-quote" });
export const codeBlockLine = Decoration.line({ class: "cm-live-code-block" });
export const codeBlockFirstLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-first",
});
export const codeBlockLastLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-last",
});
export const codeBlockOnlyLine = Decoration.line({
  class: "cm-live-code-block cm-live-code-block-first cm-live-code-block-last",
});

/** Whitespace that belongs to a marker rather than to the content. */
export function markerEnd(doc: Text, from: number): number {
  let end = from;
  while (end < doc.length) {
    const char = doc.sliceString(end, end + 1);
    if (char !== " " && char !== "\t") break;
    end += 1;
  }
  return end;
}


/** What a folded marker is drawn as (bullet, number, checkbox, nothing). */
export function markerDecoration(
  node: NodeRange,
  text: string,
  {
    doc,
    ancestorOf,
    tasks,
  }: {
    doc: Text;
    ancestorOf: (names: readonly string[]) => NodeRange | null;
    tasks: Set<number>;
  },
  /**
   * The decoration for a token that is folded with nothing in its place. The
   * caller picks the *kind* (`REVEAL-004`): a delimiter token passes
   * `HIDDEN_DELIMITER`, a marker token the marker singleton.
   */
  hidden: Decoration,
): Decoration {
  // A quote marker is drawn as the artifact's border glyph, never hidden: the
  // `>` is what the border is made of (`REVEAL-007`).
  if (node.name === "QuoteMark") return QUOTE_BORDER;

  if (node.name === "ListMark") {
    const item = ancestorOf(["ListItem"]);
    // The checkbox replaces the bullet, so a task item gets no bullet — and
    // that hidden bullet is a *marker*, not a delimiter. The task marker is
    // read from the line's text (`TASK-001`), so the key is the line start.
    if (item && tasks.has(doc.lineAt(item.from).from)) return HIDDEN_MARKER;
    const list = ancestorOf(["BulletList", "OrderedList"]);
    return list?.name === "OrderedList" ? orderedMarker(text) : BULLET;
  }

  return hidden;
}

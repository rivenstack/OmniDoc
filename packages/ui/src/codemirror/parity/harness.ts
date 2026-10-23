// EditorView test harness — F-15 Rev 2, plan Task 0.3.
//
// A jsdom-friendly way to drive a real CodeMirror `EditorView` in unit tests:
// build a view from an extension list, type into it, press keys, and read back
// the decorations and atomic ranges the extensions produced.
//
// jsdom has no layout and no native input pipeline, so the harness drives the
// editor through CodeMirror's own public entry points:
//
//   * typing  → a transaction carrying the `input.type` user event (this is the
//               path input handlers and input rules are consulted through, so
//               an input-rule test exercises the real rule).
//   * pressing → `runScopeHandlers(view, event, "editor")`, the same function
//               the DOM keydown handler calls, with a synthetic KeyboardEvent.
//               No DOM dispatch is involved, so a test cannot pass by luck of
//               event-bubbling order.
//
// Everything the harness reads is public API: the `EditorView.decorations` and
// `EditorView.atomicRanges` facets, and `RangeSet.between`.

import { EditorState, type Extension, type TransactionSpec } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  runScopeHandlers,
  type DecorationSet,
} from "@codemirror/view";

/** The four decoration kinds CodeMirror 6 can attach to a range. */
export type DecorationKind = "mark" | "widget" | "replace" | "line";

/** One flattened decoration the current state carries. */
export type DecorationRange = {
  readonly from: number;
  readonly to: number;
  readonly kind: DecorationKind;
  /** The spec the extension passed to `Decoration.*()`. */
  readonly spec: Record<string, unknown>;
  /** The widget instance for `kind: "widget"`. */
  readonly widget?: { readonly constructor?: { readonly name?: string } };
  /** `spec.widget ?? null` for point decorations. */
  readonly widgetClass?: string;
  /** True for block widgets and block replaces (`Decoration.replace({ block: true })`). */
  readonly block: boolean;
};

/** A zero-width or ranged span an extension declared atomic. */
export type AtomicRange = { readonly from: number; readonly to: number };

export type EditorHarnessOptions = {
  /** Initial document text. Defaults to `""`. */
  readonly doc?: string;
  /** Extensions under test (theme, keymap, live preview, …). */
  readonly extensions?: readonly Extension[];
  /** Initial selection; defaults to the document start. */
  readonly selection?: { readonly anchor: number; readonly head?: number };
  /**
   * Skip appending the editor to `document.body`. Mounted by default, because
   * `view.focus()` and `document.activeElement` assertions need a live node.
   */
  readonly detached?: boolean;
};

export type EditorHarness = {
  readonly view: EditorView;
  /** Current document text. */
  doc(): string;
  /** Current state. */
  state(): EditorState;
  /** Focus the content DOM. */
  focus(): void;
  /** Set a caret/selection explicitly. */
  select(anchor: number, head?: number): void;
  /** Collapse the selection to `pos`. */
  placeCaret(pos: number, userEvent?: string): void;
  /** Place the caret on a 1-based line, at a 0-based column. */
  placeCaretAt(lineNumber: number, column?: number): void;
  /** Replace the whole document programmatically (no user event). */
  setDoc(text: string): void;
  /**
   * Insert text at the selection as *user input* — the `input.type` user event,
   * so input handlers (auto-pair, em dash, list continuation) run.
   */
  type(text: string): void;
  /** Insert text at the selection without a user event (setup helper). */
  insert(text: string): void;
  /**
   * Run the editor keymap for a key. Syntax is CodeMirror's own binding syntax
   * (`"Mod-k"`, `"Shift-Alt-ArrowUp"`, `"Escape"`); `Mod` is Ctrl on this
   * platform, matching CodeMirror's `Mod` resolution under jsdom.
   */
  press(key: string): boolean;
  /** Every decoration the current state carries, flattened and tagged. */
  decorations(): readonly DecorationRange[];
  /** Only the `kind: "widget"` rows. */
  widgets(): readonly DecorationRange[];
  /** The constructor names of the current widgets, in range order. */
  widgetNames(): readonly string[];
  /** Mark/replace class names that cover `pos` (matches `spec.class`). */
  classesAt(pos: number): readonly string[];
  /** The ranges extensions declared atomic. */
  atomicRanges(): readonly AtomicRange[];
  /** Tear the view down and remove its container. */
  destroy(): void;
};

/** Builds a KeyboardEvent from CodeMirror's binding syntax. */
export function keyEvent(key: string): KeyboardEvent {
  const parts = key.split("-");
  const name = parts.pop() ?? key;
  const code =
    /^[a-zA-Z]$/.test(name)
      ? `Key${name.toUpperCase()}`
      : /^[0-9]$/.test(name)
        ? `Digit${name}`
        : name;
  return new KeyboardEvent("keydown", {
    key: name,
    code,
    // Under jsdom `navigator.platform` is empty, so CodeMirror's `mac` is
    // false and `Mod` resolves to Ctrl.
    ctrlKey: parts.includes("Ctrl") || parts.includes("Mod"),
    metaKey: parts.includes("Meta") || parts.includes("Cmd"),
    altKey: parts.includes("Alt"),
    shiftKey: parts.includes("Shift"),
    bubbles: true,
    cancelable: true,
  });
}

/**
 * Classifies a decoration. The concrete subclasses are not exported, so the
 * discrimination is by own property: `isReplace` only exists on point
 * decorations (widget/replace), `tagName` only on marks; the remainder is a
 * line decoration.
 */
function describeDecoration(
  from: number,
  to: number,
  value: Decoration,
): DecorationRange {
  const own = value as unknown as Record<string, unknown>;
  const isPoint = Object.hasOwn(own, "isReplace");
  const kind: DecorationKind = isPoint
    ? own.isReplace === true
      ? "replace"
      : "widget"
    : Object.hasOwn(own, "tagName")
      ? "mark"
      : "line";
  const widget = isPoint ? own.widget : null;
  return {
    from,
    to,
    kind,
    spec: (value.spec ?? {}) as Record<string, unknown>,
    widget: (widget ?? undefined) as DecorationRange["widget"],
    widgetClass:
      widget && typeof widget === "object"
        ? ((widget as { constructor?: { name?: string } }).constructor?.name ??
          "WidgetType")
        : undefined,
    block: isPoint && own.block === true,
  };
}

function collectRanges(set: DecorationSet, docLength: number): DecorationRange[] {
  const out: DecorationRange[] = [];
  set.between(0, docLength, (from, to, value) => {
    out.push(describeDecoration(from, to, value));
  });
  return out;
}

/**
 * Creates a mounted `EditorView` plus read/type/press helpers.
 *
 * The caller owns teardown: call `harness.destroy()` (usually in `afterEach`).
 */
export function createHarness(options: EditorHarnessOptions = {}): EditorHarness {
  const parent = document.createElement("div");
  if (!options.detached) document.body.appendChild(parent);

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.doc ?? "",
      selection: options.selection
        ? {
            anchor: options.selection.anchor,
            head: options.selection.head ?? options.selection.anchor,
          }
        : undefined,
      extensions: options.extensions ?? [],
    }),
  });

  const dispatch = (spec: TransactionSpec) => view.dispatch(spec);

  const harness: EditorHarness = {
    view,
    doc: () => view.state.doc.toString(),
    state: () => view.state,
    focus: () => view.focus(),
    select: (anchor, head = anchor) =>
      dispatch({ selection: { anchor, head } }),
    placeCaret: (pos, userEvent) =>
      dispatch({ selection: { anchor: pos }, ...(userEvent ? { userEvent } : {}) }),
    placeCaretAt: (lineNumber, column = 0) => {
      const line = view.state.doc.line(lineNumber);
      dispatch({ selection: { anchor: Math.min(line.from + column, line.to) } });
    },
    setDoc: (text) =>
      dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor: Math.min(text.length, view.state.doc.length) },
      }),
    type: (text) =>
      dispatch({
        ...view.state.replaceSelection(text),
        userEvent: "input.type",
        scrollIntoView: true,
      }),
    insert: (text) => dispatch(view.state.replaceSelection(text)),
    press: (key) => runScopeHandlers(view, keyEvent(key), "editor"),
    decorations: () => {
      const docLength = view.state.doc.length;
      const out: DecorationRange[] = [];
      for (const source of view.state.facet(EditorView.decorations)) {
        const set = typeof source === "function" ? source(view) : source;
        out.push(...collectRanges(set, docLength));
      }
      return out.sort((a, b) => a.from - b.from || a.kind.localeCompare(b.kind));
    },
    widgets: () => harness.decorations().filter((d) => d.kind === "widget"),
    widgetNames: () =>
      harness
        .widgets()
        .map((d) => d.widgetClass)
        .filter((name): name is string => Boolean(name)),
    classesAt: (pos) =>
      harness
        .decorations()
        .filter(
          (d) =>
            (d.kind === "mark" || d.kind === "replace" || d.kind === "line") &&
            d.from <= pos &&
            pos <= d.to,
        )
        .flatMap((d) => ("class" in d.spec ? String(d.spec.class ?? "").split(" ") : []))
        .filter((name) => name.length > 0),
    atomicRanges: () => {
      const docLength = view.state.doc.length;
      const out: AtomicRange[] = [];
      for (const provider of view.state.facet(EditorView.atomicRanges)) {
        provider(view).between(0, docLength, (from, to) => {
          out.push({ from, to });
        });
      }
      return out.sort((a, b) => a.from - b.from);
    },
    destroy: () => {
      view.destroy();
      parent.remove();
    },
  };

  return harness;
}

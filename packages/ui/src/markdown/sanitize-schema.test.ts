import { describe, expect, it } from "vitest";
import { markdownSanitizeSchema } from "./sanitize-schema";

/**
 * Schema-level tests.
 *
 * Rendering tests (`markdown.test.tsx`) prove a payload cannot survive. These
 * prove the *control itself* is still narrow — a future edit that widens the
 * schema would otherwise only show up as a security regression in production,
 * because most widening is invisible to a markdown-only fixture.
 */

function attributeNames(
  list: ReadonlyArray<string | [string, ...unknown[]]> | undefined,
): string[] {
  return (list ?? []).map((entry) =>
    Array.isArray(entry) ? entry[0] : entry,
  ) as string[];
}

describe("markdownSanitizeSchema", () => {
  it("allowlists URL schemes per attribute instead of blocklisting them", () => {
    expect(markdownSanitizeSchema.protocols?.src).toEqual(["http", "https"]);
    expect(markdownSanitizeSchema.protocols?.href).toEqual([
      "http",
      "https",
      "mailto",
    ]);

    // Unknown schemes are refused because they are absent from the allowlist,
    // not because a blocklist happened to name them.
    for (const schemes of Object.values(
      markdownSanitizeSchema.protocols ?? {},
    )) {
      for (const dangerous of ["javascript", "data", "vbscript", "file"]) {
        expect(schemes).not.toContain(dangerous);
      }
    }
  });

  it("refuses the style and event-handler channels on every element", () => {
    for (const list of Object.values(markdownSanitizeSchema.attributes ?? {})) {
      const names = attributeNames(list);
      expect(names).not.toContain("style");
      expect(names.some((name) => /^on/i.test(name))).toBe(false);
    }
  });

  it("refuses legacy presentational attributes and the `name` clobbering channel", () => {
    const wildcard = attributeNames(markdownSanitizeSchema.attributes?.["*"]);
    for (const refused of [
      "align",
      "color",
      "border",
      "cellPadding",
      "cellSpacing",
      "width",
      "height",
      "hSpace",
      "vSpace",
      "style",
      "name",
    ]) {
      expect(wildcard).not.toContain(refused);
    }
    // The one class channel is pattern-matched, not open.
    expect(markdownSanitizeSchema.attributes?.code).toEqual([
      ["className", /^language-./],
    ]);
  });

  it("allows only the wildcard attributes that carry no script or layout meaning", () => {
    expect(attributeNames(markdownSanitizeSchema.attributes?.["*"])).toEqual([
      "title",
      "lang",
      "dir",
      "id",
    ]);
  });

  it("keeps every element the GFM contracts promise", () => {
    for (const tag of [
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "del",
      "input",
      "section",
      "h2",
      "pre",
      "code",
      "a",
      "img",
    ]) {
      expect(markdownSanitizeSchema.tagNames).toContain(tag);
    }
  });

  it("keeps table cells anchored to a table", () => {
    for (const cell of ["td", "th", "tr", "thead", "tbody", "tfoot"]) {
      expect(markdownSanitizeSchema.ancestors?.[cell]).toEqual(["table"]);
    }
  });

  it("strips script and prefixes ids, which is what makes footnote anchors safe", () => {
    expect(markdownSanitizeSchema.strip).toContain("script");
    expect(markdownSanitizeSchema.clobberPrefix).toBe("user-content-");
    expect(markdownSanitizeSchema.clobber).toEqual(["id"]);
  });
});

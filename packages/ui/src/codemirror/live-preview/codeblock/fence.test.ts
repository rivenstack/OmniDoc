// Fence opener pattern — F-15 Rev 2, plan Task 3.1.
//
// Acceptance (plan §5 Task 3.1): "Fence regex accepts tilde/backtick ≥3 and
// forbids a backtick in the info string."
//
// The entry (`OBS-1.14.4-REVEAL-009`) records the pattern *literally* and flags
// it `partially-documented`, so these cases pin the regex's own properties — the
// two-character minimum, the language group, and the backtick exclusion — rather
// than restating a help page.

import { describe, expect, it } from "vitest";
import { FENCE_PATTERN, parseFence } from "./fence";

describe("FENCE_PATTERN (OBS-1.14.4-REVEAL-009)", () => {
  it("accepts three or more tildes or backticks", () => {
    for (const fence of ["```", "````", "`````", "~~~", "~~~~", "~~~~~~"]) {
      expect(FENCE_PATTERN.test(fence), fence).toBe(true);
    }
  });

  it("rejects a two-character fence", () => {
    for (const fence of ["``", "~~"]) {
      expect(FENCE_PATTERN.test(fence), fence).toBe(false);
    }
  });

  it("accepts an optional indent, optional spaces or tabs, and a language code", () => {
    expect(FENCE_PATTERN.test("```js")).toBe(true);
    expect(FENCE_PATTERN.test("\t~~~python")).toBe(true);
    expect(FENCE_PATTERN.test("   ```  js")).toBe(true);
    // The language group is word characters plus `/ + # -`.
    expect(FENCE_PATTERN.test("```C++/C#-x")).toBe(true);
    // The info string's remainder may hold anything but a newline or backtick.
    expect(FENCE_PATTERN.test('```ts title="a fence"')).toBe(true);
  });

  it("forbids a backtick anywhere in the info string (tilde fences too)", () => {
    // A backtick cannot appear after the fence marker — that exclusion is what
    // lets a longer backtick fence wrap a shorter one.
    expect(FENCE_PATTERN.test("```a`b")).toBe(false);
    expect(FENCE_PATTERN.test("```js `inline`")).toBe(false);
    // The pattern is shared, so the exclusion is not backtick-fence-specific.
    expect(FENCE_PATTERN.test("~~~js `inline`")).toBe(false);
  });

  it("requires the fence to be alone on its line", () => {
    // Anchored: prose that merely contains a fence is not an opener.
    expect(
      FENCE_PATTERN.test("A backtick in the info string is not a fence: ` ```js `"),
    ).toBe(false);
    expect(FENCE_PATTERN.test("```js\nconst a = 1;")).toBe(false);
  });
});

describe("parseFence", () => {
  it("reports the fence character, length and language code", () => {
    expect(parseFence("```js")).toEqual({ char: "`", length: 3, info: "js" });
    expect(parseFence("~~~~")).toEqual({ char: "~", length: 4, info: "" });
    expect(parseFence('```ts title="x"')).toEqual({ char: "`", length: 3, info: "ts" });
    expect(parseFence("  ```  python")).toEqual({ char: "`", length: 3, info: "python" });
  });

  it("returns null for anything that is not a fence", () => {
    expect(parseFence("``")).toBeNull();
    expect(parseFence("plain text")).toBeNull();
    expect(parseFence("```js `x`")).toBeNull();
  });
});

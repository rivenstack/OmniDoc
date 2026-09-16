import { describe, expect, it } from "vitest";
import { locale } from "./locale";

describe("app locale source (S-01a stub)", () => {
  it("pins the primary locale to en/LTR from a single source", () => {
    expect(locale.lang).toBe("en");
    expect(locale.dir).toBe("ltr");
  });
});

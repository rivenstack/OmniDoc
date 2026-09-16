import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional class lists", () => {
    const hidden = false;
    expect(cn("a", hidden && "b", ["c"], { d: true, e: false })).toBe("a c d");
  });

  it("lets a consumer override a component default (tailwind-merge)", () => {
    // This is why copied-in components can accept `className` without the
    // caller fighting specificity: the last conflicting utility wins.
    expect(cn("px-2 text-od-body-sm", "text-od-h1")).toBe("px-2 text-od-h1");
  });

  it("keeps non-conflicting utilities", () => {
    expect(cn("rounded-md", "border")).toBe("rounded-md border");
  });
});

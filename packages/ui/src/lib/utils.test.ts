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

  it("treats the custom text scale as font-size, not colour", () => {
    // Regression: tailwind-merge only knows the default Tailwind scales, so
    // `text-od-body-sm` used to be classed as a colour and collapsed against
    // `text-od-text-secondary`, dropping the size. The merge config in
    // `utils.ts` names the D-01 roles as a font-size group.
    expect(cn("text-od-body-sm", "text-od-text-secondary")).toBe(
      "text-od-body-sm text-od-text-secondary",
    );
    expect(cn("text-od-micro", "text-od-text-secondary")).toBe(
      "text-od-micro text-od-text-secondary",
    );
    // A default Tailwind colour and a custom size are independent too.
    expect(cn("text-red-500", "text-od-body-sm")).toBe(
      "text-red-500 text-od-body-sm",
    );
  });

  it("still resolves two custom font sizes to the last one", () => {
    expect(cn("text-od-body-sm", "text-od-body")).toBe("text-od-body");
  });
});

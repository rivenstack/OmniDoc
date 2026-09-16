import { describe, expect, it } from "vitest";
import * as ui from "./index";

/**
 * Public-surface guard for `@omnidoc/ui`.
 *
 * `apps/web` and later `packages/contracts`-adjacent consumers import from the
 * package root; the F-01 barrel must therefore stay complete. If this fails,
 * a component was added without being exported (or a barrel was renamed).
 */
describe("@omnidoc/ui public surface (F-01)", () => {
  it("exports the foundation primitives", () => {
    for (const name of [
      "Badge",
      "Button",
      "Card",
      "CardContent",
      "CardDescription",
      "CardFooter",
      "CardHeader",
      "CardTitle",
      "IconButton",
      "Input",
      "Label",
      "Separator",
      "Skeleton",
      "Spinner",
      "Textarea",
    ] as const) {
      expect(typeof (ui as Record<string, unknown>)[name]).toBe("function");
    }
  });

  it("exports the providers and the class helper", () => {
    expect(typeof ui.DirectionProvider).toBe("function");
    expect(typeof ui.ThemeProvider).toBe("function");
    expect(typeof ui.cn).toBe("function");
  });

  it("no longer exposes the S-01a placeholder stub", () => {
    expect("placeholderToken" in ui).toBe(false);
  });
});

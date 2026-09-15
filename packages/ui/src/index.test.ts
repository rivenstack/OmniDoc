import { describe, expect, it } from "vitest";
import { placeholderToken } from "./index";

describe("@omnidoc/ui stub", () => {
  it("exposes the placeholder token", () => {
    expect(placeholderToken).toBe("s-01a-ui-stub");
  });
});

import { describe, expect, it } from "vitest";
import { appName } from "./index";

describe("@omnidoc/contracts stub", () => {
  it("exposes the app name", () => {
    expect(appName).toBe("OmniDoc");
  });
});

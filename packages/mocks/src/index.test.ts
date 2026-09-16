import { describe, expect, it } from "vitest";
import { mockCorpusVersion } from "./index";

describe("@omnidoc/mocks stub", () => {
  it("exposes the stub corpus version", () => {
    expect(mockCorpusVersion).toBe("s-01a-stub");
  });
});

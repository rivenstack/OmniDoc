import { describe, expect, it } from "vitest";

import { pendingSearch } from "./search-navigation";

describe("pendingSearch", () => {
  it("commits a changed draft, encoding it into the URL", () => {
    expect(
      pendingSearch({
        committedQuery: "",
        draftQuery: '  pgvector "BYOK"  ',
        corpus: null,
      }),
    ).toEqual({
      query: 'pgvector "BYOK"',
      href: '/search?q=pgvector+%22BYOK%22',
    });
  });

  it("does nothing while the draft still means the committed query", () => {
    // Trailing whitespace is the same query, so it must not trigger a request.
    expect(
      pendingSearch({ committedQuery: "pgvector", draftQuery: "pgvector  ", corpus: null }),
    ).toBeNull();
    expect(
      pendingSearch({ committedQuery: "", draftQuery: "   ", corpus: null }),
    ).toBeNull();
  });

  it("carries the active corpus filter into the committed URL", () => {
    expect(
      pendingSearch({ committedQuery: "a", draftQuery: "b", corpus: "sample" })
        ?.href,
    ).toBe("/search?q=b&corpus=sample");
  });

  it("commits a cleared field, so the screen can return to idle", () => {
    expect(
      pendingSearch({ committedQuery: "pgvector", draftQuery: "", corpus: "mine" }),
    ).toEqual({ query: "", href: "/search?corpus=mine" });
  });
});

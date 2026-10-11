import { describe, expect, it } from "vitest";

import {
  readSearchParams,
  searchHref,
  SEARCH_BASE_PATH,
} from "./search-query";

describe("readSearchParams", () => {
  it("reads a trimmed query and a valid corpus filter", () => {
    expect(readSearchParams({ q: "  pgvector BYOK  ", corpus: "sample" })).toEqual({
      query: "pgvector BYOK",
      corpus: "sample",
    });
  });

  it("treats an absent or blank query as the idle state", () => {
    expect(readSearchParams()).toEqual({ query: "", corpus: null });
    expect(readSearchParams({ q: "   " })).toEqual({ query: "", corpus: null });
  });

  it("drops a corpus value the contract does not define", () => {
    // Forwarding it would earn a 400 the reader did not cause.
    expect(readSearchParams({ q: "q", corpus: "someone-else" }).corpus).toBeNull();
    expect(readSearchParams({ q: "q", corpus: "" }).corpus).toBeNull();
    expect(readSearchParams({ q: "q", corpus: ["mine", "sample"] })).toEqual({
      query: "q",
      corpus: "mine",
    });
  });

  it("takes the first repeated query value", () => {
    expect(readSearchParams({ q: ["first", "second"] }).query).toBe("first");
  });
});

describe("searchHref", () => {
  it("builds the URL from the same two contract fields", () => {
    expect(searchHref({ query: "pgvector" })).toBe(
      `${SEARCH_BASE_PATH}?q=pgvector`,
    );
    expect(searchHref({ query: "pgvector", corpus: "sample" })).toBe(
      `${SEARCH_BASE_PATH}?q=pgvector&corpus=sample`,
    );
  });

  it("omits the query when there is none and the filter when it is 'all'", () => {
    expect(searchHref({ query: "" })).toBe(SEARCH_BASE_PATH);
    expect(searchHref({ query: "   ", corpus: null })).toBe(SEARCH_BASE_PATH);
    expect(searchHref({ query: "", corpus: "mine" })).toBe(
      `${SEARCH_BASE_PATH}?corpus=mine`,
    );
  });

  it("encodes the query and its punctuation", () => {
    const href = searchHref({ query: 'pgvector "BYOK" & config/path' });
    expect(href).toBe(
      `${SEARCH_BASE_PATH}?q=pgvector+%22BYOK%22+%26+config%2Fpath`,
    );
    // Round-trips through the reader, so a shared link means the same search.
    const params = new URLSearchParams(href.split("?")[1]);
    expect(readSearchParams({ q: params.get("q") ?? undefined }).query).toBe(
      'pgvector "BYOK" & config/path',
    );
  });
});

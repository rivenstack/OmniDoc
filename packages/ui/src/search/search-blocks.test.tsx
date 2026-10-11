import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchField } from "./search-field";
import {
  SearchFilterChips,
  type SearchFilterOption,
} from "./search-filters";
import {
  NO_SNIPPET_LABEL,
  SearchResults,
  type SearchResult,
} from "./search-results";
import type { SearchLinkProps } from "./search-link";

/**
 * Rendered search blocks — the field, the corpus chips, and the result list.
 *
 * One file for the three interactive blocks (the state blocks live beside them
 * in `search-states.test.tsx`, mirroring `organize/`). Consolidating them keeps
 * the suite's environment count down: vitest creates a jsdom environment per
 * test file, and the shared suite has a pre-existing load-sensitive assertion
 * in `src/shell/login.test.tsx` (see `docs/memory/implementer.md`).
 */

afterEach(cleanup);

describe("SearchField", () => {
  it("renders a labelled search field inside a real GET form", () => {
    render(
      <SearchField
        value=""
        onValueChange={() => undefined}
        action="/search"
      />,
    );

    const form = screen.getByRole("search");
    // A real form: Enter and the button work before hydration and with JS off.
    expect(form.tagName).toBe("FORM");
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/search");

    const input = screen.getByRole("searchbox", { name: "Search your notes" });
    expect(input.getAttribute("name")).toBe("q");
    expect(input.getAttribute("type")).toBe("search");

    const submit = screen.getByRole("button", { name: "Search" });
    expect(submit.getAttribute("type")).toBe("submit");
  });

  it("reports every keystroke to the caller", () => {
    const onValueChange = vi.fn();
    render(<SearchField value="" onValueChange={onValueChange} />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "pgvector" },
    });

    expect(onValueChange).toHaveBeenCalledWith("pgvector");
  });

  it("carries the active corpus filter through a no-JS submit", () => {
    const { container, unmount } = render(
      <SearchField
        value="pgvector"
        onValueChange={() => undefined}
        action="/search"
        hiddenFields={{ corpus: "sample" }}
      />,
    );

    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="corpus"]',
    );
    expect(hidden?.value).toBe("sample");

    unmount();
    const plain = render(
      <SearchField value="pgvector" onValueChange={() => undefined} />,
    );
    // No filter active: nothing extra is submitted, so the request cannot carry
    // a corpus the reader did not choose.
    expect(plain.container.querySelector('input[type="hidden"]')).toBeNull();
  });

  it("marks the form busy while a search is in flight", () => {
    const { unmount } = render(
      <SearchField value="a" onValueChange={() => undefined} busy />,
    );
    expect(screen.getByRole("search").getAttribute("aria-busy")).toBe("true");

    unmount();
    render(<SearchField value="a" onValueChange={() => undefined} />);
    expect(screen.getByRole("search").getAttribute("aria-busy")).toBe("false");
    expect(screen.getByRole("searchbox").getAttribute("tabindex")).toBeNull();
  });

  it("delegates submit to the caller when JavaScript is available", () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    render(
      <SearchField
        value="pgvector"
        onValueChange={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.submit(screen.getByRole("search"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

const filterOptions: SearchFilterOption[] = [
  { id: "all", label: "All", href: "/search?q=pgvector", active: true },
  {
    id: "mine",
    label: "Mine",
    href: "/search?q=pgvector&corpus=mine",
    active: false,
  },
  {
    id: "sample",
    label: "Sample",
    href: "/search?q=pgvector&corpus=sample",
    active: false,
  },
];

describe("SearchFilterChips", () => {
  it("renders the corpus filter as a named group of links", () => {
    render(<SearchFilterChips options={filterOptions} />);

    const group = screen.getByRole("group", { name: "Filter by corpus" });
    expect(group.textContent).toContain("All");

    // Links, not buttons: keyboard-operable and usable before hydration.
    const sample = screen.getByRole("link", { name: "Sample" });
    expect(sample.tagName).toBe("A");
    expect(sample.getAttribute("href")).toBe("/search?q=pgvector&corpus=sample");
    expect(sample.getAttribute("tabindex")).toBeNull();
  });

  it("announces the active filter instead of relying on colour", () => {
    render(<SearchFilterChips options={filterOptions} />);

    expect(
      screen.getByRole("link", { name: "All" }).getAttribute("aria-current"),
    ).toBe("true");
    expect(
      screen.getByRole("link", { name: "Mine" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("uses the injected link component and forwards href and aria-current", () => {
    const seen: SearchLinkProps[] = [];
    function TestLink({ href, className, children, ...rest }: SearchLinkProps) {
      seen.push({ href, className, children, ...rest });
      return (
        <a href={href} className={className} data-testid="injected-link">
          {children}
        </a>
      );
    }

    render(
      <SearchFilterChips options={filterOptions} linkComponent={TestLink} />,
    );

    expect(screen.getAllByTestId("injected-link")).toHaveLength(3);
    expect(seen[0].href).toBe("/search?q=pgvector");
    expect(seen[0]["aria-current"]).toBe("true");
    expect(seen[0].className).toContain("focus-visible:ring-ring");
  });

  it("keeps the chip layout directional-neutral (logical CSS only)", () => {
    render(<SearchFilterChips options={filterOptions} />);
    const group = screen.getByRole("group", { name: "Filter by corpus" });

    // No physical left/right utilities: a future RTL locale must flip the row
    // without touching this block (`quality/ui-qa-checklist.md` §7.2).
    expect(group.className).not.toMatch(/\b(pl|pr|ml|mr|left|right)-/);
  });
});

const hits: SearchResult[] = [
  {
    chunkId: "c1",
    noteId: "n1",
    versionId: "v1",
    score: 0.91,
    snippet: "... the pgvector index lives in the migrations folder ...",
  },
  {
    chunkId: "c2",
    noteId: "n2",
    versionId: "v2",
    score: 0.42,
    snippet: "... BYOK config path and the OpenAI compatible base url ...",
    corpusOwnership: "sample",
  },
];

function renderResults(
  props: Partial<React.ComponentProps<typeof SearchResults>> = {},
) {
  return render(
    <SearchResults
      hits={hits}
      hrefForHit={(hit) => `/notes/${hit.noteId}`}
      {...props}
    />,
  );
}

describe("SearchResults", () => {
  it("renders one row per server hit, routed through the injected link", () => {
    renderResults();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen
        .getByRole("link", { name: /pgvector index lives/ })
        .getAttribute("href"),
    ).toBe("/notes/n1");
    expect(
      screen
        .getByRole("link", { name: /BYOK config path/ })
        .getAttribute("href"),
    ).toBe("/notes/n2");
  });

  it("prints the server snippet verbatim and never re-highlights it", () => {
    const { container } = renderResults({
      hits: [
        {
          chunkId: "c1",
          noteId: "n1",
          versionId: "v1",
          score: 0.5,
          snippet: "... matched <b>pgvector</b> & config path ...",
        },
      ],
    });

    const snippet = container.querySelector("bdi");
    // Verbatim text: the `<b>` is characters the server sent, not markup the
    // client chose to add.
    expect(snippet?.textContent).toBe(
      "... matched <b>pgvector</b> & config path ...",
    );
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("mark")).toBeNull();
  });

  it("isolates the excerpt as UGC and contains unbroken strings", () => {
    const { container } = renderResults({
      hits: [
        {
          chunkId: "c1",
          noteId: "n1",
          versionId: "v1",
          score: 0.5,
          snippet: "averyveryverylongunbrokenfragment".repeat(6),
        },
      ],
    });

    const row = screen.getByRole("link");
    const snippet = container.querySelector("bdi");
    expect(snippet).toBeTruthy();
    // The excerpt is UGC, so it is direction-isolated (ui-qa-checklist §6.5).
    expect(snippet?.closest("bdi")).toBe(snippet);
    // `min-w-0` all the way down plus `wrap-anywhere` keeps a pasted token from
    // widening the page at ~390px (ui-qa-checklist §5.9).
    expect(row.className).toContain("min-w-0");
    expect(snippet?.parentElement?.className).toContain("min-w-0");
    expect(snippet?.parentElement?.className).toContain("wrap-anywhere");
    // Logical CSS only: no physical left/right utilities in the row.
    expect(row.className).not.toMatch(/\b(pl|pr|ml|mr|left|right)-/);
  });

  it("announces the result count once through a single status region", () => {
    renderResults();

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent).toContain("2 matches");
  });

  it("says the results may be incomplete when the server reports degraded", () => {
    const { unmount } = renderResults({ degraded: true });

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("2 matches");
    expect(status.textContent).toContain("Results may be incomplete");

    unmount();
    renderResults();
    expect(screen.getByRole("status").textContent).not.toContain(
      "Results may be incomplete",
    );
  });

  it("labels sample rows from the contract field only", () => {
    renderResults();

    expect(screen.getAllByText("Sample")).toHaveLength(1);
  });

  it("says when the list may be capped and when an excerpt was empty", () => {
    const { unmount } = renderResults({ topK: 2 });
    expect(screen.getByText(/Showing the top 2/)).toBeTruthy();

    unmount();
    const plain = renderResults({
      hits: [{ ...hits[0], snippet: "   " }],
    });
    expect(screen.getByText(NO_SNIPPET_LABEL)).toBeTruthy();
    // Undercut the cap: no capped notice is claimed.
    expect(plain.queryByText(/Showing the top/)).toBeNull();
  });

  it("keeps rows keyboard-operable with a visible focus ring", () => {
    renderResults();

    const row = screen.getByRole("link", { name: /pgvector index lives/ });
    expect(row.tagName).toBe("A");
    expect(row.getAttribute("tabindex")).toBeNull();
    expect(row.getAttribute("onclick")).toBeNull();
    expect(row.className).toContain("focus-visible:ring-2");
    expect(row.className).toContain("focus-visible:ring-ring");
  });
});

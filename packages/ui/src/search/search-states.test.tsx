import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  SearchAskPivot,
  SearchDenied,
  SearchEmpty,
  SearchIdle,
  SearchResultsSkeleton,
  SearchUnavailable,
  SearchValidation,
  SearchingNotice,
} from "./search-states";
import type { SearchLinkProps } from "./search-link";

afterEach(cleanup);

describe("SearchIdle", () => {
  it("explains the screen without pretending a search ran", () => {
    render(<SearchIdle />);

    expect(screen.getByText("Search your notes")).toBeTruthy();
    expect(screen.getByText(/Type a query to search this workspace/)).toBeTruthy();
  });
});

describe("SearchEmpty", () => {
  it("restates the query as isolated UGC and offers the caller's next step", () => {
    render(
      <SearchEmpty query={'  "launch checklist" <b>  '}>
        <a href="/ask">Ask your notes</a>
      </SearchEmpty>,
    );

    const isolated = document.querySelector("bdi");
    // Trimmed, quoted, and isolated: a mixed-direction query cannot re-order the
    // sentence around it (ui-qa-checklist §6.5).
    expect(isolated?.textContent).toBe('\u201c"launch checklist" <b>\u201d');
    expect(screen.getByRole("link", { name: "Ask your notes" })).toBeTruthy();
  });
});

describe("failure states stay distinguishable", () => {
  it("keeps denied, unavailable, and validation in separate sentences", () => {
    const { unmount: u1 } = render(<SearchDenied />);
    const denied = document.body.textContent ?? "";
    u1();

    const { unmount: u2 } = render(<SearchUnavailable />);
    const unavailable = document.body.textContent ?? "";
    u2();

    const { unmount: u3 } = render(<SearchValidation />);
    const validation = document.body.textContent ?? "";
    u3();

    const { unmount: u4 } = render(<SearchEmpty query="pgvector" />);
    const empty = document.body.textContent ?? "";
    u4();

    const texts = [denied, unavailable, validation, empty];
    expect(new Set(texts).size).toBe(texts.length);
    expect(denied).toContain("You don't have access to that workspace.");
    expect(denied).toContain("It may not exist, or it may not be shared with you.");
    expect(unavailable).toContain("Search is unavailable right now");
    expect(validation).toContain("That search could not be run");
    expect(empty).toContain("No matches for");
  });

  it("never says 'no results' when the service was unreachable or the request was rejected", () => {
    const { unmount } = render(<SearchUnavailable />);
    expect(document.body.textContent).not.toContain("No matches for");
    unmount();

    render(<SearchValidation />);
    expect(document.body.textContent).not.toContain("No matches for");
  });
});

describe("SearchResultsSkeleton", () => {
  it("announces loading once and hides the placeholders from assistive tech", () => {
    const { container } = render(<SearchResultsSkeleton rows={3} />);

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent).toBe("Searching your notes");
    expect(
      container.querySelector('[role="list"]')?.getAttribute("aria-hidden"),
    ).toBe("true");
    // The placeholders are decorative and stay out of the accessibility tree,
    // which is also why they are counted as DOM nodes rather than list roles.
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });
});

describe("SearchingNotice", () => {
  it("announces the in-flight search once", () => {
    render(<SearchingNotice />);
    expect(screen.getByRole("status").textContent).toBe("Searching\u2026");
  });
});

describe("SearchAskPivot", () => {
  it("offers Ask as a link through the injected link component", () => {
    const links: SearchLinkProps[] = [];
    function TestLink({ href, className, children }: SearchLinkProps) {
      links.push({ href, className, children });
      return (
        <a href={href} className={className}>
          {children}
        </a>
      );
    }

    render(<SearchAskPivot href="/ask" linkComponent={TestLink} />);

    expect(screen.getByRole("link", { name: "Ask your notes" }).getAttribute("href")).toBe(
      "/ask",
    );
    expect(links).toHaveLength(1);
    // Quiet by design: a text link, not a second primary action.
    expect(links[0].className).toContain("underline");
    expect(links[0].className).not.toContain("bg-primary");
  });
});
